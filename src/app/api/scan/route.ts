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
import { postLedger, isUniqueViolation, InsufficientBalanceError } from '@/lib/ledger';
import { hashRequest, parseIdempotencyKey, runIdempotent } from '@/lib/idempotency';
import { Band, ScanSource, ScanSlotState, Tier, User, FaceOffStatus } from '@prisma/client';
import { resolveFaceOff } from '@/lib/faceoff';
import { evaluateSkinAppearance } from '@/lib/vision/skinAppearanceEngine';
import { generateImprovementPlan } from '@/lib/insights/improvementEngine';
import { LETHALITY_SCORING_VERSION } from '@/lib/rating/lethalityEngine';

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
    const featureVector = body.featureVector && typeof body.featureVector === 'object' ? body.featureVector : undefined;
    const extraSnap = body.extraSnap === true;
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
      hashRequest({ toneMode, faceOffId, extraSnap }),
      () => performScan(sessionUser, imageBase64, toneMode, faceOffId, consentAccepted, liveness, featureVector, extraSnap)
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
  liveness?: { verified: boolean; actions: string[] },
  featureVector?: Parameters<typeof scoreFace>[0]['featureVector'],
  extraSnap: boolean = false
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
      const roundAttemptsCap = EconomyConfig.ARENA.ATTEMPTS_PER_DUEL * ((refreshedDuel.rematchCount ?? 0) + 1);
      const [cAttempts, oAttempts] = await Promise.all([
        db.faceOffAttempt.count({ where: { faceOffId: duel.id, userId: refreshedDuel.challengerId } }),
        refreshedDuel.opponentId
          ? db.faceOffAttempt.count({ where: { faceOffId: duel.id, userId: refreshedDuel.opponentId } })
          : Promise.resolve(0),
      ]);
      const bothExhausted = cAttempts >= roundAttemptsCap && oAttempts >= roundAttemptsCap;
      const bothLocked = Boolean(refreshedDuel.challengerLockedAt && refreshedDuel.opponentLockedAt);

      if (bothExhausted || bothLocked) {
        try {
          duelResolution = await resolveFaceOff(duel.id);
        } catch (err) {
          console.warn('Auto duel resolution deferred or already completed:', err);
        }
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
      error: `3 free daily scans used (${EconomyConfig.DAILY_SCAN_CAP}/${EconomyConfig.DAILY_SCAN_CAP}). Resets at 00:00 WAT, or unlock 1 Extra Snap for ${EconomyConfig.EXTRA_SCAN_COST_PTS} PTS.`,
      dailyLimitReached: true,
      scansCompletedToday: count,
      resetTimeWat: '00:00 WAT',
      extraSnapCostPts: EconomyConfig.EXTRA_SCAN_COST_PTS,
      extraSnapMaxReward: EconomyConfig.EXTRA_SCAN_MAX_REWARD,
    },
  });

  // Cheap pre-check so a user who is already capped never triggers scoring unless paying for an Extra Snap.
  const scansTodayCount = await db.scan.count({
    where: { userId: user.id, dayKey: todayKey, source: ScanSource.SOLO },
  });
  const isPaidExtraSnap = scansTodayCount >= EconomyConfig.DAILY_SCAN_CAP;
  if (isPaidExtraSnap && !extraSnap) return capReached(scansTodayCount);
  if (isPaidExtraSnap && user.spendableBalance < EconomyConfig.EXTRA_SCAN_COST_PTS) {
    return {
      status: 400,
      body: {
        error: `Insufficient spendable balance. Extra Snap costs ${EconomyConfig.EXTRA_SCAN_COST_PTS} PTS.`,
        dailyLimitReached: true,
        extraSnapCostPts: EconomyConfig.EXTRA_SCAN_COST_PTS,
      },
    };
  }

  // 2. Quality gate + vision scoring. Throws if the photo fails the gate (does not consume a slot).
  let scoredResult;
  try {
    scoredResult = await scoreFace({ imageBuffer: imageBase64, featureVector, toneMode });
  } catch (error) {
    return {
      status: 422,
      body: { error: error instanceof Error ? error.message : 'Selfie failed the quality check.', qualityGateFailed: true },
    };
  }
  // Zero-data-retention: drop our only reference to the raw image as soon as scoring is done.
  imageBase64 = '';

  const scanIndexOfDay = scansTodayCount + 1;
  const rewardSlot = Math.min(3, scanIndexOfDay) as 1 | 2 | 3;

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
  const rawPoints = calculateScanPoints(scoredResult.score, rewardSlot, streakDays);
  const basePointsEarned = isPaidExtraSnap
    ? Math.min(rawPoints, EconomyConfig.EXTRA_SCAN_MAX_REWARD)
    : rawPoints;

  const now = new Date();
  // 1. Check active REWARD_MULTIPLIER effect (new Effect Engine)
  const activeBoostEffect = await db.activeEffect.findFirst({
    where: {
      userId: user.id,
      effectKind: 'REWARD_MULTIPLIER',
      status: 'ACTIVE',
      AND: [
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        { OR: [{ remainingUses: null }, { remainingUses: { gt: 0 } }] },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });

  let bonusPoints = 0;
  if (activeBoostEffect) {
    const cfg = (activeBoostEffect.config ?? {}) as { multiplierBps?: number };
    const bps = typeof cfg.multiplierBps === 'number' ? cfg.multiplierBps : 15000;
    const rawBonus = Math.max(0, Math.round((basePointsEarned * (bps - 10000)) / 10000));
    const cap = activeBoostEffect.remainingBonusPoints ?? rawBonus;
    bonusPoints = Math.min(rawBonus, cap);
  }

  // 2. Legacy fallback for unactivated `boost-aura-2x` UserItem
  const boostItem = !activeBoostEffect
    ? await db.userItem.findFirst({
        where: {
          userId: user.id,
          quantity: { gt: 0 },
          item: { slug: 'boost-aura-2x' },
        },
        select: { id: true, quantity: true },
      })
    : null;
  if (boostItem) {
    bonusPoints = basePointsEarned;
  }

  const boostApplied = bonusPoints > 0;
  const pointsEarned = basePointsEarned + bonusPoints;

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

      if (isPaidExtraSnap) {
        await postLedger(tx, {
          userId: user.id,
          type: 'SHOP_PURCHASE',
          amount: -EconomyConfig.EXTRA_SCAN_COST_PTS,
          balanceKind: 'SPENDABLE',
          refType: 'EXTRA_SCAN_SNAP',
          refId: scanId,
          idempotencyKey: `extra-snap:${scanId}`,
        });
      }

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

      if (activeBoostEffect && bonusPoints > 0) {
        const nextUses = activeBoostEffect.remainingUses !== null ? Math.max(0, activeBoostEffect.remainingUses - 1) : null;
        const nextBonus = activeBoostEffect.remainingBonusPoints !== null ? Math.max(0, activeBoostEffect.remainingBonusPoints - bonusPoints) : null;
        const exhausted = (nextUses !== null && nextUses <= 0) || (nextBonus !== null && nextBonus <= 0);
        await tx.activeEffect.update({
          where: { id: activeBoostEffect.id },
          data: {
            remainingUses: nextUses,
            remainingBonusPoints: nextBonus,
            status: exhausted ? 'EXHAUSTED' : 'ACTIVE',
            terminalReason: exhausted ? (nextUses === 0 ? 'USAGE_EXHAUSTED' : 'BONUS_CAP_REACHED') : null,
            endedAt: exhausted ? now : null,
          },
        });
        await tx.effectExecution.create({
          data: {
            activeEffectId: activeBoostEffect.id,
            eventId: `scan:${scanId}`,
            targetModule: 'ECONOMY',
            result: 'APPLIED',
            consumedUses: 1,
            bonusPointsAwarded: bonusPoints,
          },
        });
      } else if (boostItem) {
        await tx.userItem.updateMany({
          where: { id: boostItem.id, quantity: { gt: 0 } },
          data: { quantity: { decrement: 1 } },
        });
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
    if (error instanceof InsufficientBalanceError) {
      return {
        status: 400,
        body: { error: `Insufficient spendable balance for Extra Snap (${EconomyConfig.EXTRA_SCAN_COST_PTS} PTS).` },
      };
    }
    if (isUniqueViolation(error)) return capReached(scansTodayCount + 1);
    throw error;
  }

  const fresh = await db.user.findUnique({
    where: { id: user.id },
    select: { tier: true, lifetimePoints: true, spendableBalance: true },
  });
  const newTier: Tier = fresh?.tier ?? user.tier;

  const skinAppearance = evaluateSkinAppearance({
    exposure: scoredResult.qualityGate.exposure,
    sharpness: scoredResult.qualityGate.sharpness,
  });
  const improvementPlan = generateImprovementPlan({
    lightingScore: scoredResult.breakdown.photoCraft.lighting,
    sharpnessScore: scoredResult.breakdown.photoCraft.sharpness,
  });

  return {
    status: 200,
    body: {
      success: true,
      scanId,
      score: scoredResult.score,
      scoringVersion: LETHALITY_SCORING_VERSION,
      band: scoredResult.band,
      verdictLine: scoredResult.verdictLine,
      categoryBreakdown: flatBreakdown,
      tips: scoredResult.tips,
      pointsEarned,
      extraSnapCostPts: isPaidExtraSnap ? EconomyConfig.EXTRA_SCAN_COST_PTS : 0,
      multiplier,
      newStreak: streakDays,
      freezeConsumed,
      freezesRemaining: freezesHeld,
      tier: newTier,
      lifetimePoints: fresh?.lifetimePoints ?? user.lifetimePoints + pointsEarned,
      spendableBalance: fresh?.spendableBalance ?? user.spendableBalance + pointsEarned,
      unlockedNewTier: newTier !== user.tier,
      qualityGate: scoredResult.qualityGate,
      skinAppearance,
      improvementPlan,
      liveness: liveness ?? { verified: false, actions: [] },
      evaluatedAt: scoredResult.evaluatedAt,
    },
  };
}
