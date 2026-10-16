import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { scoreFace } from '@/lib/rating/engine';
import {
  calculateScanPoints,
  getStreakMultiplier,
  getLagosDayKey,
  getYesterdayLagosDayKey,
} from '@/lib/scoring';
import { EconomyConfig } from '@/lib/economy';
import { ToneMode } from '@/types';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { postLedger, isUniqueViolation } from '@/lib/ledger';
import { hashRequest, parseIdempotencyKey, runIdempotent } from '@/lib/idempotency';
import { Band, ScanSource, ScanSlotState, Tier, User, FaceOffStatus } from '@prisma/client';
import { resolveFaceOff } from '@/lib/faceoff';

const TONES: ToneMode[] = ['HYPE', 'SMOOTH', 'ROAST', 'STRAIGHT'];
const MAX_IMAGE_BASE64_CHARS = 11_000_000; // ~8 MB decoded

type Outcome = { status: number; body: Record<string, unknown> };

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate BEFORE any scoring work so anonymous callers cannot spend compute/AI budget.
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const idempotencyKey = parseIdempotencyKey(req);
    if (!idempotencyKey) {
      return NextResponse.json({ error: 'A valid Idempotency-Key header is required.' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const imageBase64: unknown = body.imageBase64;
    const toneMode: ToneMode = TONES.includes(body.toneMode) ? body.toneMode : 'HYPE';
    const faceOffId: string | undefined =
      typeof body.faceOffId === 'string' && body.faceOffId.trim().length > 0
        ? body.faceOffId.trim()
        : undefined;

    if (typeof imageBase64 !== 'string' || imageBase64.length === 0) {
      return NextResponse.json({ error: 'imageBase64 is required.' }, { status: 400 });
    }
    if (imageBase64.length > MAX_IMAGE_BASE64_CHARS) {
      return NextResponse.json({ error: 'Image is too large.' }, { status: 413 });
    }

    const consentAccepted = body.consentAccepted === true || body.ageConfirmed === true;
    const liveness = body.liveness && typeof body.liveness === 'object'
      ? {
          verified: Boolean(body.liveness.passed),
          actions: Array.isArray(body.liveness.actionsCompleted) ? (body.liveness.actionsCompleted as string[]) : [],
        }
      : undefined;

    const result = await runIdempotent(
      sessionUser.id,
      'scan',
      idempotencyKey,
      hashRequest({ toneMode, faceOffId }),
      () => performScan(sessionUser, imageBase64, toneMode, faceOffId, consentAccepted, liveness)
    );

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Scan pipeline error:', error);
    return NextResponse.json({ error: 'Failed to evaluate selfie' }, { status: 500 });
  }
}

async function performScan(
  sessionUser: User,
  imageBase64: string,
  toneMode: ToneMode,
  faceOffId?: string,
  consentAccepted: boolean = false,
  liveness?: { verified: boolean; actions: string[] }
): Promise<Outcome> {
  const user = await db.user.findUnique({
    where: { id: sessionUser.id },
    include: { streak: true },
  });
  if (!user) return { status: 404, body: { error: 'User not found in database' } };

  // Biometric consent & 18+ age verification gate
  if (!user.ageConfirmedAt || !user.consentAt) {
    if (consentAccepted) {
      await db.user.update({
        where: { id: user.id },
        data: {
          ageConfirmedAt: new Date(),
          consentAt: new Date(),
          consentVersion: '1.0-NDPA',
        },
      });
    } else {
      return {
        status: 403,
        body: {
          error: 'Biometric consent and 18+ age verification are required before scanning. Face Card is strictly for adults aged 18 and older.',
          requiresConsent: true,
        },
      };
    }
  }

  const todayKey = getLagosDayKey();
  const yesterdayKey = getYesterdayLagosDayKey();

  // If this scan is for a Face-Off duel, validate the duel and participant attempts
  if (faceOffId) {
    const duel = await db.faceOff.findUnique({
      where: { id: faceOffId },
      include: { challengerBestScan: true, opponentBestScan: true },
    });
    if (!duel) return { status: 404, body: { error: 'Face-off duel not found' } };

    if (duel.status !== FaceOffStatus.ACTIVE && duel.status !== FaceOffStatus.TIE_REMATCH) {
      return { status: 400, body: { error: `Duel is not active for scanning (status: ${duel.status})` } };
    }

    if (duel.expiresAt.getTime() <= Date.now()) {
      return { status: 400, body: { error: 'Duel has expired' } };
    }

    const isChallenger = duel.challengerId === user.id;
    const isOpponent = duel.opponentId === user.id;
    if (!isChallenger && !isOpponent) {
      return { status: 403, body: { error: 'You are not a contender in this face-off duel' } };
    }

    const existingAttempts = await db.faceOffAttempt.count({
      where: { faceOffId: duel.id, userId: user.id },
    });

    const allowedAttempts = EconomyConfig.ARENA.ATTEMPTS_PER_DUEL * ((duel.rematchCount ?? 0) + 1);
    if (existingAttempts >= allowedAttempts) {
      return {
        status: 400,
        body: {
          error: `Duel attempt limit reached for this round (${allowedAttempts}/${allowedAttempts}). Your score has already been locked in.`,
          attemptsRemaining: 0,
        },
      };
    }

    // Quality gate + vision scoring
    let scoredResult;
    try {
      scoredResult = await scoreFace({ imageBuffer: imageBase64, toneMode });
    } catch (error) {
      return {
        status: 422,
        body: { error: error instanceof Error ? error.message : 'Selfie failed the quality check.', qualityGateFailed: true },
      };
    }
    imageBase64 = ''; // Zero data retention

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

    const scanId = randomUUID();
    const attemptNumber = existingAttempts + 1;

    await db.$transaction(async (tx) => {
      await tx.scan.create({
        data: {
          id: scanId,
          userId: user.id,
          score: scoredResult.score,
          band: scoredResult.band as Band,
          categoryScores: flatBreakdown,
          modelVersion: 'v1.2-neon',
          promptVersion: 'p2.0',
          scanIndexOfDay: 1,
          dayKey: todayKey,
          source: ScanSource.FACEOFF,
          faceOffId: duel.id,
        },
      });

      await tx.faceOffAttempt.create({
        data: {
          faceOffId: duel.id,
          userId: user.id,
          scanId,
          attemptNumber,
        },
      });

      const currentBestScore = isChallenger
        ? duel.challengerBestScan?.score ?? -1
        : duel.opponentBestScan?.score ?? -1;

      const isRematch = duel.status === FaceOffStatus.TIE_REMATCH;
      if (isRematch || scoredResult.score > currentBestScore) {
        await tx.faceOff.update({
          where: { id: duel.id },
          data: isChallenger ? { challengerBestScanId: scanId } : { opponentBestScanId: scanId },
        });
      }
    });

    // Check if both contenders have submitted at least one score
    let duelResolution: any = null;
    const refreshedDuel = await db.faceOff.findUnique({
      where: { id: duel.id },
      include: { challengerBestScan: true, opponentBestScan: true },
    });

    if (refreshedDuel?.challengerBestScanId && refreshedDuel?.opponentBestScanId && refreshedDuel.status !== FaceOffStatus.COMPLETED) {
      try {
        duelResolution = await resolveFaceOff(duel.id);
      } catch (err) {
        console.warn('Auto duel resolution deferred or already completed:', err);
      }
    }

    const attemptsRemaining = Math.max(0, EconomyConfig.ARENA.ATTEMPTS_PER_DUEL - attemptNumber);
    const isWinner = duelResolution ? duelResolution.winnerId === user.id : false;
    const isTie = duelResolution?.status === 'TIE_REMATCH';
    const isLoss = Boolean(duelResolution && !isWinner && !isTie);

    return {
      status: 200,
      body: {
        success: true,
        scanId,
        score: scoredResult.score,
        band: scoredResult.band,
        verdictLine: scoredResult.verdictLine,
        categoryBreakdown: flatBreakdown,
        duelId: duel.id,
        duel: {
          duelId: duel.id,
          attemptNumber,
          attemptsRemaining,
          status: duelResolution?.status ?? (refreshedDuel?.status || 'ACTIVE'),
          outcome: isWinner ? 'WIN' : isLoss ? 'LOSS' : isTie ? 'TIE' : 'PENDING',
          payout: isWinner ? (duelResolution.payout || 0) : 0,
          winnerId: duelResolution?.winnerId ?? null,
          isWinner,
          challengerScore: refreshedDuel?.challengerBestScan?.score,
          opponentScore: refreshedDuel?.opponentBestScan?.score,
        },
        attemptNumber,
        attemptsRemaining,
        qualityGate: scoredResult.qualityGate,
        liveness: liveness ?? { verified: false, actions: [] },
        evaluatedAt: scoredResult.evaluatedAt,
      },
    };
  }

  // --- SOLO SCAN PIPELINE ---
  const capReached = (count: number): Outcome => ({
    status: 429,
    body: {
      error: `Daily scan limit reached (${EconomyConfig.DAILY_SCAN_CAP}/${EconomyConfig.DAILY_SCAN_CAP}). Resets at midnight 00:00 WAT (Africa/Lagos).`,
      dailyLimitReached: true,
      scansCompletedToday: count,
      resetTimeWat: '00:00 WAT',
    },
  });

  // Cheap pre-check so a user who is already capped never triggers scoring.
  const scansTodayCount = await db.scan.count({
    where: { userId: user.id, dayKey: todayKey, source: ScanSource.SOLO },
  });
  if (scansTodayCount >= EconomyConfig.DAILY_SCAN_CAP) return capReached(scansTodayCount);

  // 2. Quality gate + vision scoring. Throws if the photo fails the gate (does not consume a slot).
  let scoredResult;
  try {
    scoredResult = await scoreFace({ imageBuffer: imageBase64, toneMode });
  } catch (error) {
    return {
      status: 422,
      body: { error: error instanceof Error ? error.message : 'Selfie failed the quality check.', qualityGateFailed: true },
    };
  }
  // Zero-data-retention: drop our only reference to the raw image as soon as scoring is done.
  imageBase64 = '';

  const scanIndexOfDay = (scansTodayCount + 1) as 1 | 2 | 3;

  // 3. Streak & freeze protection
  let streakDays = user.streak?.currentCount ?? 1;
  let freezesHeld = user.streak?.freezesHeld ?? 0;
  const lastScanDate = user.streak?.lastScanDayKey;
  let freezeConsumed = false;

  if (!lastScanDate || lastScanDate === yesterdayKey) {
    streakDays = lastScanDate ? streakDays + 1 : 1;
  } else if (lastScanDate === todayKey) {
    // Already scanned today, keep current streak
  } else if (freezesHeld > 0) {
    freezesHeld -= 1; // Streak freeze consumed
    freezeConsumed = true;
  } else {
    streakDays = 1; // Streak reset
  }

  const multiplier = getStreakMultiplier(streakDays);
  const pointsEarned = calculateScanPoints(scoredResult.score, scanIndexOfDay, streakDays);

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

  // 4. One ACID transaction. The ScanSlot unique (user, day, slot) is the real concurrency guard for
  // the daily cap; two parallel requests cannot both claim the same slot.
  const scanId = randomUUID();
  try {
    await db.$transaction(async (tx) => {
      await tx.scan.create({
        data: {
          id: scanId,
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
      });

      await tx.scanSlot.create({
        data: {
          userId: user.id,
          dayKey: todayKey,
          slotIndex: scanIndexOfDay,
          state: ScanSlotState.COMMITTED,
          scanId,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      if (pointsEarned > 0) {
        for (const balanceKind of ['SPENDABLE', 'LIFETIME'] as const) {
          await postLedger(tx, {
            userId: user.id,
            type: 'SCAN',
            amount: pointsEarned,
            balanceKind,
            refType: 'SCAN',
            refId: scanId,
            idempotencyKey: `scan:${scanId}`,
          });
        }
      }

      await tx.streak.upsert({
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
      });
    });
  } catch (error) {
    if (isUniqueViolation(error)) return capReached(scansTodayCount + 1);
    throw error;
  }

  const fresh = await db.user.findUnique({ where: { id: user.id }, select: { tier: true } });
  const newTier: Tier = fresh?.tier ?? user.tier;


  return {
    status: 200,
    body: {
      success: true,
      scanId,
      score: scoredResult.score,
      band: scoredResult.band,
      verdictLine: scoredResult.verdictLine,
      categoryBreakdown: flatBreakdown,
      tips: scoredResult.tips,
      pointsEarned,
      multiplier,
      newStreak: streakDays,
      freezeConsumed,
      freezesRemaining: freezesHeld,
      tier: newTier,
      unlockedNewTier: newTier !== user.tier,
      qualityGate: scoredResult.qualityGate,
      liveness: liveness ?? { verified: false, actions: [] },
      evaluatedAt: scoredResult.evaluatedAt,
    },
  };
}
