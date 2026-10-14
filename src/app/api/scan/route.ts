import { NextRequest, NextResponse } from 'next/server';
import { scoreFace } from '@/lib/rating/engine';
import { calculateScanPoints, getStreakMultiplier, getTierFromLifetimePoints } from '@/lib/scoring';
import { ToneMode } from '@/types';
import { recordScanResult } from '@/lib/store';
import { db } from '@/lib/db';
import { getRequiredUser } from '@/lib/auth/session';
import { LedgerType, BalanceKind, ScanSource, Band, Tier, ScanSlotState } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { imageBase64, toneMode = 'HYPE' } = body;

    // 1. Execute deterministic quality gate & vision scoring
    const scoredResult = await scoreFace({
      imageBuffer: imageBase64,
      toneMode: toneMode as ToneMode,
    });

    // 2. CRITICAL ZERO-DATA-RETENTION RULE:
    // Delete any reference to the raw image data immediately from memory
    delete body.imageBase64;

    const sessionUser = await getRequiredUser();
    const user = await db.user.findUnique({
      where: { id: sessionUser.id },
      include: { streak: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }

    // 2. Daily Scan Cap & Index Calculation (Lagos WAT Midnight)
    const { getLagosDayKey, getYesterdayLagosDayKey } = await import('@/lib/scoring');
    const todayKey = getLagosDayKey();
    const yesterdayKey = getYesterdayLagosDayKey();

    const scansTodayCount = await db.scan.count({
      where: { userId: user.id, dayKey: todayKey, source: ScanSource.SOLO },
    });

    if (scansTodayCount >= 3) {
      return NextResponse.json(
        {
          error: 'Daily scan limit reached (3/3). Resets at midnight 00:00 WAT (Africa/Lagos).',
          dailyLimitReached: true,
          scansCompletedToday: scansTodayCount,
          resetTimeWat: '00:00 WAT',
        },
        { status: 429 }
      );
    }

    const scanIndexOfDay = (scansTodayCount + 1) as 1 | 2 | 3;

    // 3. Streak & Freeze Protection
    let streakDays = user.streak?.currentCount ?? 1;
    let freezesHeld = user.streak?.freezesHeld ?? 0;
    const lastScanDate = user.streak?.lastScanDayKey;

    if (!lastScanDate || lastScanDate === yesterdayKey) {
      // Consecutively scanned yesterday or brand new
      streakDays = lastScanDate ? streakDays + 1 : 1;
    } else if (lastScanDate === todayKey) {
      // Already scanned today, keep current streak
    } else {
      // Missed at least 1 calendar day
      if (freezesHeld > 0) {
        freezesHeld -= 1; // Streak freeze shield consumed!
      } else {
        streakDays = 1; // Streak reset
      }
    }

    const multiplier = getStreakMultiplier(streakDays);
    const pointsEarned = calculateScanPoints(scoredResult.score, scanIndexOfDay, streakDays);
    const newLifetime = user.lifetimePoints + pointsEarned;
    const newTier = getTierFromLifetimePoints(newLifetime);

    const flatBreakdown = {
      photoCraft: Math.round(
        (scoredResult.breakdown.photoCraft.lighting +
          scoredResult.breakdown.photoCraft.sharpness +
          scoredResult.breakdown.photoCraft.framing) / 3
      ),
      harmony: scoredResult.breakdown.face.harmony,
      skinClarity: scoredResult.breakdown.face.skinClarity,
      featureDefinition: scoredResult.breakdown.face.featureDefinition,
      symmetry: scoredResult.breakdown.face.symmetry,
      expression: scoredResult.breakdown.expression,
      aura: scoredResult.breakdown.aura,
    };

    // 4. Persist scan into Neon Lakebase Postgres in a single ACID transaction
    await db.$transaction([
      db.scan.create({
        data: {
          userId: user.id,
          score: scoredResult.score,
          band: scoredResult.band as Band,
          categoryScores: flatBreakdown,
          modelVersion: 'v1.2-neon',
          promptVersion: 'p2.0',
          scanIndexOfDay,
          dayKey: todayKey,
          source: ScanSource.SOLO,
        },
      }),
      db.user.update({
        where: { id: user.id },
        data: {
          lifetimePoints: newLifetime,
          spendableBalance: { increment: pointsEarned },
          tier: newTier as Tier,
        },
      }),
      db.streak.upsert({
        where: { userId: user.id },
        update: {
          currentCount: streakDays,
          longestCount: Math.max(streakDays, user.streak?.longestCount ?? streakDays),
          lastScanDayKey: todayKey,
          freezesHeld,
        },
        create: {
          userId: user.id,
          currentCount: streakDays,
          longestCount: streakDays,
          lastScanDayKey: todayKey,
          freezesHeld,
        },
      }),
      db.pointsLedger.create({
        data: {
          userId: user.id,
          type: LedgerType.SCAN,
          amount: pointsEarned,
          balanceKind: BalanceKind.SPENDABLE,
          refType: 'SCAN',
          idempotencyKey: `scan-earn-spendable-${user.id}-${Date.now()}`,
        },
      }),
      db.pointsLedger.create({
        data: {
          userId: user.id,
          type: LedgerType.SCAN,
          amount: pointsEarned,
          balanceKind: BalanceKind.LIFETIME,
          refType: 'SCAN',
          idempotencyKey: `scan-earn-lifetime-${user.id}-${Date.now()}`,
        },
      }),
      db.scanSlot.create({
        data: {
          userId: user.id,
          dayKey: todayKey,
          slotIndex: scanIndexOfDay,
          state: ScanSlotState.COMMITTED,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    // Also update in-memory cache
    recordScanResult({
      score: scoredResult.score,
      band: scoredResult.band,
      breakdown: flatBreakdown,
      pointsEarned,
      multiplier,
      newStreak: streakDays,
      tier: newTier,
      verdictLine: scoredResult.verdictLine,
      tips: scoredResult.tips,
    });

    return NextResponse.json({
      success: true,
      score: scoredResult.score,
      band: scoredResult.band,
      verdictLine: scoredResult.verdictLine,
      categoryBreakdown: flatBreakdown,
      tips: scoredResult.tips,
      pointsEarned,
      multiplier,
      newStreak: streakDays,
      tier: newTier,
      unlockedNewTier: newTier !== user.tier,
      qualityGate: scoredResult.qualityGate,
      evaluatedAt: scoredResult.evaluatedAt,
    });
  } catch (error) {
    console.error('Scan pipeline error:', error);
    return NextResponse.json(
      {
        error: 'Failed to evaluate selfie',
        message: error instanceof Error ? error.message : 'Internal error',
      },
      { status: 500 }
    );
  }
}
