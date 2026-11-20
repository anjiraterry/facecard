import crypto from 'node:crypto';
import { db } from '@/lib/db';
import { EconomyConfig } from '@/lib/economy';
import { postLedger, InsufficientBalanceError } from '@/lib/ledger';
import { getLagosDayKey } from '@/lib/scoring';
import { LETHALITY_SCORING_VERSION } from '@/lib/rating/lethalityEngine';
import { getActiveLethalityWeights } from '@/lib/rewards/activeConfig';
import { FaceOffMode, FaceOffParticipantStatus, FaceOffStatus } from '@prisma/client';
import { createNotification } from '@/lib/notifications';

export class FaceOffError extends Error {
  constructor(message: string, public readonly status: number = 400) {
    super(message);
    this.name = 'FaceOffError';
  }
}

export function generateInviteCode(): string {
  // 6-character crypto-random alphanumeric uppercase string (e.g., 'K7M9P2')
  return crypto.randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
}

type TxLike = any;

export async function recordFaceOffEvent(
  tx: TxLike,
  params: {
    faceOffId: string;
    roundNumber?: number;
    actorUserId?: string | null;
    eventType: string;
    detail?: Record<string, unknown>;
  }
) {
  try {
    if (!tx?.faceOffEvent?.create) return;
    await tx.faceOffEvent.create({
      data: {
        faceOffId: params.faceOffId,
        roundNumber: params.roundNumber ?? 1,
        actorUserId: params.actorUserId ?? null,
        eventType: params.eventType,
        detail: params.detail ?? {},
      },
    });
  } catch (err) {
    console.warn('[FaceOffEvent] Failed to record event:', params.eventType, err);
  }
}

/** Check if user reached the daily cap of 5 duels created/joined */
export async function getDailyDuelCount(userId: string): Promise<number> {
  const todayKey = getLagosDayKey();
  const startOfDay = new Date(`${todayKey}T00:00:00.000+01:00`); // Midnight WAT

  const count = await db.faceOff.count({
    where: {
      createdAt: { gte: startOfDay },
      OR: [{ challengerId: userId }, { opponentId: userId }],
    },
  });
  return count;
}

export interface CreateDuelInput {
  challengerId: string;
  mode: FaceOffMode;
  stakeAmount: number;
  opponentHandle?: string;
}

export async function createFaceOff(input: CreateDuelInput) {
  const { challengerId, mode, stakeAmount, opponentHandle } = input;

  const challenger = await db.user.findUnique({
    where: { id: challengerId },
    select: { id: true, tier: true, spendableBalance: true },
  });
  if (!challenger) throw new FaceOffError('User not found', 404);

  // 1. Validate mode & stake
  const isStaked = mode === FaceOffMode.STAKED;
  const stake = isStaked ? Number(stakeAmount) : 0;

  if (isStaked) {
    if (!EconomyConfig.ARENA.STAKE_OPTIONS.includes(stake)) {
      throw new FaceOffError(
        `Invalid stake amount. Allowed stakes: ${EconomyConfig.ARENA.STAKE_OPTIONS.join(', ')} PTS`,
        400
      );
    }
  }

  // 2. Check daily face-off cap (5 per day)
  const duelsToday = await getDailyDuelCount(challengerId);
  if (duelsToday >= EconomyConfig.ARENA.MAX_DUELS_PER_DAY) {
    throw new FaceOffError(
      `Daily duel limit reached (${EconomyConfig.ARENA.MAX_DUELS_PER_DAY}/day). Resets at midnight WAT.`,
      429
    );
  }

  // 3. Optional direct opponent handle verification
  let targetOpponentId: string | undefined;
  if (opponentHandle) {
    const cleanHandle = opponentHandle.replace(/^@/, '').trim().toLowerCase();
    const opponent = await db.user.findFirst({
      where: { handle: { equals: cleanHandle, mode: 'insensitive' } },
      select: { id: true, tier: true },
    });
    if (!opponent) {
      throw new FaceOffError(`Opponent @${cleanHandle} not found.`, 404);
    }
    if (opponent.id === challengerId) {
      throw new FaceOffError('You cannot challenge yourself.', 400);
    }
    // Same-tier matchmaking rule for staked competitive matches
    if (isStaked && opponent.tier !== challenger.tier) {
      throw new FaceOffError(
        `Same-tier matchmaking: opponent is ${opponent.tier}, you are ${challenger.tier}. Switch to Friendly mode for cross-tier fun!`,
        400
      );
    }
    targetOpponentId = opponent.id;
  }

  const activeWeights = await getActiveLethalityWeights().catch(() => ({ version: 'default' }));
  const inviteCode = generateInviteCode();
  const expiresAt = new Date(Date.now() + EconomyConfig.ARENA.EXPIRY_MINUTES * 60 * 1000);
  const maxAttemptsPerRound = EconomyConfig.ARENA.ATTEMPTS_PER_DUEL;

  // 4. Create duel and escrow stake atomically
  const duel = await db.$transaction(async (tx) => {
    const created = await tx.faceOff.create({
      data: {
        challengerId,
        opponentId: targetOpponentId,
        inviteCode,
        mode,
        stake,
        status: FaceOffStatus.WAITING,
        maxAttemptsPerRound,
        currentRound: 1,
        scoringVersion: LETHALITY_SCORING_VERSION,
        weightsVersion: activeWeights.version,
        challengerStatus: FaceOffParticipantStatus.WAITING,
        opponentStatus: FaceOffParticipantStatus.WAITING,
        expiresAt,
      },
    });

    if ((tx as any).faceOffRound?.create) {
      await (tx as any).faceOffRound.create({
        data: {
          faceOffId: created.id,
          roundNumber: 1,
          maxAttempts: maxAttemptsPerRound,
        },
      });
    }

    if (isStaked && stake > 0) {
      try {
        await postLedger(tx, {
          userId: challengerId,
          type: 'FACEOFF_STAKE_HOLD',
          amount: -stake,
          balanceKind: 'SPENDABLE',
          refType: 'FACEOFF',
          refId: created.id,
          idempotencyKey: `faceoff-create-stake:${created.id}:${challengerId}`,
        });
      } catch (err) {
        if (err instanceof InsufficientBalanceError) {
          throw new FaceOffError(
            `Insufficient spendable points to stake ${stake} PTS. Balance: ${challenger.spendableBalance}`,
            400
          );
        }
        throw err;
      }
    }

    await recordFaceOffEvent(tx, {
      faceOffId: created.id,
      roundNumber: 1,
      actorUserId: challengerId,
      eventType: 'MATCH_CREATED',
      detail: {
        mode,
        stake,
        maxAttemptsPerRound,
        scoringVersion: LETHALITY_SCORING_VERSION,
        weightsVersion: activeWeights.version,
        targetOpponentId: targetOpponentId ?? null,
      },
    });

    return created;
  });

  if (targetOpponentId) {
    void createNotification({
      userId: targetOpponentId,
      type: 'FACEOFF_INVITE',
      title: 'New Arena Duel Challenge!',
      body: isStaked && stake > 0
        ? `You've been challenged to a ${stake} PTS staked Arena duel. Accept and take your match scan.`
        : `You've been challenged to a friendly Arena duel. Accept and take your match scan.`,
      href: `/faceoff?duel=${duel.inviteCode}`,
      metadata: { duelId: duel.id, inviteCode: duel.inviteCode, stake },
    });
  }

  return duel;
}

export async function joinFaceOff(duelId: string, opponentId: string) {
  const opponent = await db.user.findUnique({
    where: { id: opponentId },
    select: { id: true, tier: true, spendableBalance: true },
  });
  if (!opponent) throw new FaceOffError('User not found', 404);

  const duel = await db.faceOff.findUnique({
    where: { id: duelId },
    include: { challenger: { select: { id: true, tier: true } } },
  });
  if (!duel) throw new FaceOffError('Duel not found', 404);

  if (duel.challengerId === opponentId) {
    throw new FaceOffError('You cannot join your own challenge.', 400);
  }

  if (duel.status !== FaceOffStatus.WAITING) {
    throw new FaceOffError('Duel is no longer open for joining.', 400);
  }

  if (duel.expiresAt.getTime() <= Date.now()) {
    throw new FaceOffError('Duel has expired.', 400);
  }

  // Direct challenge check: if targeted to specific opponent, only that user can join
  if (duel.opponentId && duel.opponentId !== opponentId) {
    throw new FaceOffError('This private duel was issued to another user.', 403);
  }

  // Same-tier matchmaking rule (applies to staked competitive duels; friendly duels allow cross-tier)
  if (duel.mode === FaceOffMode.STAKED && opponent.tier !== duel.challenger.tier) {
    throw new FaceOffError(
      `Same-tier matchmaking: duel requires ${duel.challenger.tier} tier (you are ${opponent.tier}).`,
      400
    );
  }

  // Daily duel cap for joining player
  const duelsToday = await getDailyDuelCount(opponentId);
  if (duelsToday >= EconomyConfig.ARENA.MAX_DUELS_PER_DAY) {
    throw new FaceOffError(
      `Daily duel limit reached (${EconomyConfig.ARENA.MAX_DUELS_PER_DAY}/day). Resets at midnight WAT.`,
      429
    );
  }

  const isStaked = duel.mode === FaceOffMode.STAKED && duel.stake > 0;

  return db.$transaction(async (tx) => {
    // Atomic status transition guard: ensure status is STILL WAITING (prevents concurrent join race)
    const updated = await tx.faceOff.updateMany({
      where: {
        id: duel.id,
        status: FaceOffStatus.WAITING,
      },
      data: {
        opponentId,
        status: FaceOffStatus.ACTIVE,
        challengerStatus: FaceOffParticipantStatus.ATTEMPTS_AVAILABLE,
        opponentStatus: FaceOffParticipantStatus.ATTEMPTS_AVAILABLE,
      },
    });

    if (updated.count === 0) {
      throw new FaceOffError('Duel was already joined by another player or is no longer waiting.', 409);
    }

    if (isStaked) {
      try {
        await postLedger(tx, {
          userId: opponentId,
          type: 'FACEOFF_STAKE_HOLD',
          amount: -duel.stake,
          balanceKind: 'SPENDABLE',
          refType: 'FACEOFF',
          refId: duel.id,
          idempotencyKey: `faceoff-join-stake:${duel.id}:${opponentId}`,
        });
      } catch (err) {
        if (err instanceof InsufficientBalanceError) {
          throw new FaceOffError(
            `Insufficient points to match the stake of ${duel.stake} PTS. Balance: ${opponent.spendableBalance}`,
            400
          );
        }
        throw err;
      }
    }

    await recordFaceOffEvent(tx, {
      faceOffId: duel.id,
      roundNumber: duel.currentRound ?? 1,
      actorUserId: opponentId,
      eventType: 'MATCH_ACCEPTED',
      detail: {
        challengerId: duel.challengerId,
        opponentId,
      },
    });

    return tx.faceOff.findUnique({ where: { id: duel.id } });
  });
}

export interface RecordFaceOffAttemptInput {
  duelId: string;
  userId: string;
  scanId: string;
  score: number;
  scoringVersion: string;
  verificationStatus?: string;
  submissionKey?: string;
}

export interface RecordFaceOffAttemptResult {
  attemptNumber: number;
  maxAttempts: number;
  attemptsRemaining: number;
  roundNumber: number;
  bestScore: number;
  isLockedIn: boolean;
  bothLockedIn: boolean;
  settlementResult: Awaited<ReturnType<typeof resolveFaceOff>> | null;
  duelStatus: FaceOffStatus;
}

/**
 * Atomically records a verified Arena scan attempt for a participant, enforces the
 * round attempt cap, updates best score, auto-locks on final attempt, and triggers
 * settlement when both participants are locked in.
 */
export async function recordFaceOffAttempt(
  input: RecordFaceOffAttemptInput
): Promise<RecordFaceOffAttemptResult> {
  const {
    duelId,
    userId,
    scanId,
    score,
    scoringVersion,
    verificationStatus = 'VERIFIED',
    submissionKey,
  } = input;

  const txOutcome = await db.$transaction(async (tx) => {
    const duel = await tx.faceOff.findUnique({
      where: { id: duelId },
      include: { challengerBestScan: true, opponentBestScan: true },
    });

    if (!duel) {
      throw new FaceOffError('Face-off duel not found', 404);
    }

    if (duel.status !== FaceOffStatus.ACTIVE && duel.status !== FaceOffStatus.TIE_REMATCH) {
      throw new FaceOffError(`Duel is not active for scanning (status: ${duel.status})`, 400);
    }

    if (duel.expiresAt.getTime() <= Date.now()) {
      throw new FaceOffError('Duel has expired', 400);
    }

    const isChallenger = duel.challengerId === userId;
    const isOpponent = duel.opponentId === userId;
    if (!isChallenger && !isOpponent) {
      throw new FaceOffError('You are not a contender in this face-off duel', 403);
    }

    const roundNumber = duel.currentRound ?? 1;
    const maxAttempts = duel.maxAttemptsPerRound ?? EconomyConfig.ARENA.ATTEMPTS_PER_DUEL;

    // Rubric / scoring version compatibility check
    if (duel.scoringVersion && scoringVersion && duel.scoringVersion !== scoringVersion) {
      throw new FaceOffError(
        `Scoring rubric mismatch: match requires ${duel.scoringVersion}, received ${scoringVersion}.`,
        409
      );
    }

    // Idempotency check by submissionKey
    if (submissionKey) {
      const existingByKey = await tx.faceOffAttempt.findFirst({
        where: { faceOffId: duel.id, submissionKey },
      });
      if (existingByKey) {
        const currentLockedAt = isChallenger ? duel.challengerLockedAt : duel.opponentLockedAt;
        const bestScore = isChallenger
          ? duel.challengerFinalScore ?? duel.challengerBestScan?.score ?? existingByKey.score
          : duel.opponentFinalScore ?? duel.opponentBestScan?.score ?? existingByKey.score;
        return {
          attemptNumber: existingByKey.attemptNumber,
          maxAttempts,
          attemptsRemaining: Math.max(0, maxAttempts - existingByKey.attemptNumber),
          roundNumber,
          bestScore,
          isLockedIn: Boolean(currentLockedAt),
          bothLockedIn: Boolean(duel.challengerLockedAt && duel.opponentLockedAt),
          duelStatus: duel.status,
        };
      }
    }

    // Lock-in check
    const alreadyLockedAt = isChallenger ? duel.challengerLockedAt : duel.opponentLockedAt;
    const participantStatus = isChallenger ? duel.challengerStatus : duel.opponentStatus;
    if (alreadyLockedAt || participantStatus === FaceOffParticipantStatus.LOCKED_IN) {
      throw new FaceOffError('Your score for this round is already locked in.', 400);
    }

    // Count existing attempts in THIS round only
    const roundAttempts = await tx.faceOffAttempt.findMany({
      where: { faceOffId: duel.id, userId, roundNumber },
    });

    if (roundAttempts.length >= maxAttempts) {
      throw new FaceOffError(
        `Duel attempt limit reached for this round (${maxAttempts}/${maxAttempts}). Your score has already been locked in.`,
        400
      );
    }

    const attemptNumber = roundAttempts.length + 1;
    await tx.faceOffAttempt.create({
      data: {
        faceOffId: duel.id,
        userId,
        scanId,
        roundNumber,
        attemptNumber,
        score,
        scoringVersion,
        verificationStatus,
        submissionKey: submissionKey ?? null,
      },
    });

    const previousBestScoreInRound = roundAttempts.reduce((max, a) => Math.max(max, a.score ?? 0), -1);
    const currentPersistedBest = isChallenger
      ? duel.challengerBestScan?.score ?? -1
      : duel.opponentBestScan?.score ?? -1;
    const effectivePreviousBest = roundAttempts.length > 0
      ? Math.max(previousBestScoreInRound, currentPersistedBest)
      : -1;

    const isNewBest = score > effectivePreviousBest;
    const bestScore = isNewBest ? score : effectivePreviousBest;
    const shouldAutoLock = attemptNumber >= maxAttempts;
    const now = new Date();

    const updateData: Record<string, unknown> = {};
    if (isChallenger) {
      if (isNewBest) updateData.challengerBestScanId = scanId;
      if (shouldAutoLock) {
        updateData.challengerLockedAt = now;
        updateData.challengerStatus = FaceOffParticipantStatus.LOCKED_IN;
        updateData.challengerFinalScore = bestScore;
      }
    } else {
      if (isNewBest) updateData.opponentBestScanId = scanId;
      if (shouldAutoLock) {
        updateData.opponentLockedAt = now;
        updateData.opponentStatus = FaceOffParticipantStatus.LOCKED_IN;
        updateData.opponentFinalScore = bestScore;
      }
    }

    const otherLocked = isChallenger ? Boolean(duel.opponentLockedAt) : Boolean(duel.challengerLockedAt);
    const bothLockedIn = shouldAutoLock && otherLocked;
    if (bothLockedIn) {
      updateData.status = FaceOffStatus.READY_TO_SETTLE;
    }

    if (Object.keys(updateData).length > 0) {
      await tx.faceOff.update({
        where: { id: duel.id },
        data: updateData,
      });
    }

    if ((tx as any).faceOffRound?.updateMany) {
      await (tx as any).faceOffRound.updateMany({
        where: { faceOffId: duel.id, roundNumber },
        data: isChallenger
          ? { ...(isNewBest ? { challengerBestScanId: scanId } : {}), challengerScore: bestScore }
          : { ...(isNewBest ? { opponentBestScanId: scanId } : {}), opponentScore: bestScore },
      });
    }

    await recordFaceOffEvent(tx, {
      faceOffId: duel.id,
      roundNumber,
      actorUserId: userId,
      eventType: 'ATTEMPT_RECORDED',
      detail: {
        attemptNumber,
        maxAttempts,
        scanId,
        score,
        bestScore,
        scoringVersion,
        verificationStatus,
      },
    });

    if (shouldAutoLock) {
      await recordFaceOffEvent(tx, {
        faceOffId: duel.id,
        roundNumber,
        actorUserId: userId,
        eventType: 'PARTICIPANT_LOCKED',
        detail: { autoLocked: true, finalScore: bestScore, reason: 'MAX_ATTEMPTS_REACHED' },
      });
    }

    if (bothLockedIn) {
      await recordFaceOffEvent(tx, {
        faceOffId: duel.id,
        roundNumber,
        actorUserId: userId,
        eventType: 'SETTLEMENT_REQUESTED',
        detail: { trigger: 'AUTO_LOCK_FINAL_ATTEMPT' },
      });
    }

    return {
      attemptNumber,
      maxAttempts,
      attemptsRemaining: Math.max(0, maxAttempts - attemptNumber),
      roundNumber,
      bestScore,
      isLockedIn: shouldAutoLock,
      bothLockedIn,
      duelStatus: bothLockedIn ? FaceOffStatus.READY_TO_SETTLE : duel.status,
    };
  });

  let settlementResult: Awaited<ReturnType<typeof resolveFaceOff>> | null = null;
  if (txOutcome.bothLockedIn) {
    try {
      settlementResult = await resolveFaceOff(duelId);
    } catch (err) {
      console.warn('Auto duel resolution deferred:', err);
    }
  }

  return {
    ...txOutcome,
    settlementResult,
    duelStatus: (settlementResult?.status as FaceOffStatus | undefined) ?? txOutcome.duelStatus,
  };
}

/**
 * Explicit participant "Lock In Score" action.
 * Persists the participant's best eligible score for the current round and immediately
 * initiates settlement if the opponent is already locked in.
 */
export async function lockInFaceOffScore(duelId: string, userId: string) {
  const lockOutcome = await db.$transaction(async (tx) => {
    const duel = await tx.faceOff.findUnique({
      where: { id: duelId },
      include: { challengerBestScan: true, opponentBestScan: true },
    });

    if (!duel) throw new FaceOffError('Duel not found', 404);

    const isChallenger = duel.challengerId === userId;
    const isOpponent = duel.opponentId === userId;
    if (!isChallenger && !isOpponent) {
      throw new FaceOffError('You are not a participant in this duel.', 403);
    }

    if (duel.status === FaceOffStatus.COMPLETED || duel.status === FaceOffStatus.READY_TO_SETTLE || duel.status === FaceOffStatus.SETTLING) {
      return {
        alreadyLocked: true,
        bothLockedIn: true,
        finalScore: isChallenger ? duel.challengerFinalScore : duel.opponentFinalScore,
        roundNumber: duel.currentRound ?? 1,
        duelStatus: duel.status,
      };
    }

    if (duel.status !== FaceOffStatus.ACTIVE && duel.status !== FaceOffStatus.TIE_REMATCH) {
      throw new FaceOffError(`Cannot lock in score when duel status is ${duel.status}.`, 400);
    }

    if (duel.expiresAt.getTime() <= Date.now()) {
      throw new FaceOffError('Duel has expired.', 400);
    }

    const roundNumber = duel.currentRound ?? 1;
    const alreadyLockedAt = isChallenger ? duel.challengerLockedAt : duel.opponentLockedAt;
    if (alreadyLockedAt) {
      const bothLockedIn = Boolean(duel.challengerLockedAt && duel.opponentLockedAt);
      return {
        alreadyLocked: true,
        bothLockedIn,
        finalScore: isChallenger
          ? duel.challengerFinalScore ?? duel.challengerBestScan?.score ?? 0
          : duel.opponentFinalScore ?? duel.opponentBestScan?.score ?? 0,
        roundNumber,
        duelStatus: duel.status,
      };
    }

    const roundAttempts = await tx.faceOffAttempt.findMany({
      where: { faceOffId: duel.id, userId, roundNumber },
    });

    const bestScanScore = isChallenger ? duel.challengerBestScan?.score : duel.opponentBestScan?.score;
    if (roundAttempts.length === 0 && bestScanScore === undefined) {
      throw new FaceOffError('Complete at least one valid match scan before locking in.', 400);
    }

    const finalScore = roundAttempts.length > 0
      ? roundAttempts.reduce((max, a) => Math.max(max, a.score ?? 0), 0)
      : (bestScanScore ?? 0);

    const now = new Date();
    const otherLocked = isChallenger ? Boolean(duel.opponentLockedAt) : Boolean(duel.challengerLockedAt);
    const bothLockedIn = otherLocked;

    await tx.faceOff.update({
      where: { id: duel.id },
      data: isChallenger
        ? {
            challengerLockedAt: now,
            challengerStatus: FaceOffParticipantStatus.LOCKED_IN,
            challengerFinalScore: finalScore,
            ...(bothLockedIn ? { status: FaceOffStatus.READY_TO_SETTLE } : {}),
          }
        : {
            opponentLockedAt: now,
            opponentStatus: FaceOffParticipantStatus.LOCKED_IN,
            opponentFinalScore: finalScore,
            ...(bothLockedIn ? { status: FaceOffStatus.READY_TO_SETTLE } : {}),
          },
    });

    await recordFaceOffEvent(tx, {
      faceOffId: duel.id,
      roundNumber,
      actorUserId: userId,
      eventType: 'PARTICIPANT_LOCKED',
      detail: { autoLocked: false, finalScore, reason: 'EXPLICIT_LOCK_IN' },
    });

    if (bothLockedIn) {
      await recordFaceOffEvent(tx, {
        faceOffId: duel.id,
        roundNumber,
        actorUserId: userId,
        eventType: 'SETTLEMENT_REQUESTED',
        detail: { trigger: 'EXPLICIT_LOCK_IN' },
      });
    }

    return {
      alreadyLocked: false,
      bothLockedIn,
      finalScore,
      roundNumber,
      duelStatus: bothLockedIn ? FaceOffStatus.READY_TO_SETTLE : duel.status,
    };
  });

  let settlementResult: Awaited<ReturnType<typeof resolveFaceOff>> | null = null;
  if (lockOutcome.bothLockedIn && lockOutcome.duelStatus !== FaceOffStatus.COMPLETED) {
    try {
      settlementResult = await resolveFaceOff(duelId);
    } catch (err) {
      console.warn('Settlement after lock-in deferred:', err);
    }
  }

  return {
    success: true,
    duelId,
    finalScore: lockOutcome.finalScore,
    roundNumber: lockOutcome.roundNumber,
    bothLockedIn: lockOutcome.bothLockedIn,
    status: settlementResult?.status ?? lockOutcome.duelStatus,
    settlement: settlementResult,
  };
}

export async function resolveFaceOff(duelId: string) {
  const duel = await db.faceOff.findUnique({
    where: { id: duelId },
    include: {
      challengerBestScan: true,
      opponentBestScan: true,
    },
  });

  if (!duel) throw new FaceOffError('Duel not found', 404);

  if (
    duel.status !== FaceOffStatus.ACTIVE &&
    duel.status !== FaceOffStatus.TIE_REMATCH &&
    duel.status !== FaceOffStatus.READY_TO_SETTLE &&
    duel.status !== FaceOffStatus.SETTLING
  ) {
    throw new FaceOffError(`Cannot resolve duel with status ${duel.status}`, 400);
  }

  if (!duel.opponentId) {
    throw new FaceOffError('Cannot resolve duel without an opponent', 400);
  }

  // Scores MUST come from real scans recorded in the database
  const challengerScore = duel.challengerFinalScore ?? duel.challengerBestScan?.score;
  const opponentScore = duel.opponentFinalScore ?? duel.opponentBestScan?.score;

  if (challengerScore === undefined || challengerScore === null || opponentScore === undefined || opponentScore === null) {
    throw new FaceOffError('Both contenders must complete a scan before duel can be resolved.', 400);
  }

  const isTie = challengerScore === opponentScore;
  const challengerWon = challengerScore > opponentScore;
  const winnerId = challengerWon ? duel.challengerId : duel.opponentId;
  const isStaked = duel.mode === FaceOffMode.STAKED && duel.stake > 0;
  const roundNumber = duel.currentRound ?? 1;

  let result;
  try {
    result = await db.$transaction(async (tx) => {
      // 1. Atomic state guard to prevent double resolution
      const isSecondTie = isTie && (duel.rematchCount ?? 0) >= 1;
      const nextStatus = isTie
        ? isSecondTie
          ? FaceOffStatus.COMPLETED
          : FaceOffStatus.TIE_REMATCH
        : FaceOffStatus.COMPLETED;

      const claimed = await tx.faceOff.updateMany({
        where: {
          id: duel.id,
          status: { in: [FaceOffStatus.ACTIVE, FaceOffStatus.TIE_REMATCH, FaceOffStatus.READY_TO_SETTLE, FaceOffStatus.SETTLING] },
        },
        data: {
          status: nextStatus,
          rematchCount: isTie && !isSecondTie ? { increment: 1 } : undefined,
          currentRound: isTie && !isSecondTie ? { increment: 1 } : undefined,
          challengerLockedAt: isTie && !isSecondTie ? null : duel.challengerLockedAt ?? new Date(),
          opponentLockedAt: isTie && !isSecondTie ? null : duel.opponentLockedAt ?? new Date(),
          challengerStatus: isTie && !isSecondTie ? FaceOffParticipantStatus.ATTEMPTS_AVAILABLE : FaceOffParticipantStatus.LOCKED_IN,
          opponentStatus: isTie && !isSecondTie ? FaceOffParticipantStatus.ATTEMPTS_AVAILABLE : FaceOffParticipantStatus.LOCKED_IN,
          challengerFinalScore: isTie && !isSecondTie ? null : challengerScore,
          opponentFinalScore: isTie && !isSecondTie ? null : opponentScore,
          winnerId: isTie ? null : winnerId,
          outcomeReason: isTie
            ? isSecondTie
              ? 'DRAW_AFTER_REMATCH'
              : 'TIE_REMATCH_REQUIRED'
            : 'SCORE_VICTORY',
          resolvedAt: isTie && !isSecondTie ? null : new Date(),
          lastSettlementError: null,
        },
      });

      if (claimed.count === 0) {
        throw new FaceOffError('Duel has already been resolved.', 409);
      }

      if ((tx as any).faceOffRound?.updateMany) {
        await (tx as any).faceOffRound.updateMany({
          where: { faceOffId: duel.id, roundNumber },
          data: {
            challengerBestScanId: duel.challengerBestScanId,
            opponentBestScanId: duel.opponentBestScanId,
            challengerScore,
            opponentScore,
            winnerId: isTie ? null : winnerId,
            isTie,
            endedAt: new Date(),
          },
        });
      }

      if (isSecondTie) {
        if (isStaked && duel.stake > 0) {
          await postLedger(tx, {
            userId: duel.challengerId,
            type: 'FACEOFF_REFUND',
            amount: duel.stake,
            balanceKind: 'SPENDABLE',
            refType: 'FACEOFF',
            refId: duel.id,
            idempotencyKey: `faceoff-tie-refund:${duel.id}:challenger`,
          });
          await postLedger(tx, {
            userId: duel.opponentId!,
            type: 'FACEOFF_REFUND',
            amount: duel.stake,
            balanceKind: 'SPENDABLE',
            refType: 'FACEOFF',
            refId: duel.id,
            idempotencyKey: `faceoff-tie-refund:${duel.id}:opponent`,
          });
        }

        await recordFaceOffEvent(tx, {
          faceOffId: duel.id,
          roundNumber,
          eventType: 'MATCH_COMPLETED',
          detail: { outcome: 'DRAW_REFUNDED', challengerScore, opponentScore },
        });

        return {
          success: true,
          duelId: duel.id,
          status: 'COMPLETED',
          outcome: 'DRAW_REFUNDED',
          challengerScore,
          opponentScore,
        };
      }

      if (isTie) {
        if ((tx as any).faceOffRound?.create) {
          await (tx as any).faceOffRound.create({
            data: {
              faceOffId: duel.id,
              roundNumber: roundNumber + 1,
              maxAttempts: duel.maxAttemptsPerRound ?? EconomyConfig.ARENA.ATTEMPTS_PER_DUEL,
            },
          });
        }

        await recordFaceOffEvent(tx, {
          faceOffId: duel.id,
          roundNumber,
          eventType: 'REMATCH_TRIGGERED',
          detail: { nextRound: roundNumber + 1, challengerScore, opponentScore },
        });

        return {
          success: true,
          duelId: duel.id,
          status: 'TIE_REMATCH',
          outcome: 'TIE',
          challengerScore,
          opponentScore,
        };
      }

      let payout = 0;
      let systemFee = 0;
      const winBonus = EconomyConfig.ARENA.WIN_BONUS_POINTS;

      if (isStaked) {
        const totalPot = duel.stake * 2;
        systemFee = Math.round(totalPot * EconomyConfig.ARENA.SYSTEM_FEE_PERCENT); // 5% fee
        payout = totalPot - systemFee;

        // Update fee amount on record
        await tx.faceOff.update({
          where: { id: duel.id },
          data: { feeAmount: systemFee },
        });

        // Credit pot winnings to winner
        await postLedger(tx, {
          userId: winnerId,
          type: 'FACEOFF_PAYOUT',
          amount: payout,
          balanceKind: 'SPENDABLE',
          refType: 'FACEOFF',
          refId: duel.id,
          idempotencyKey: `faceoff-payout:${duel.id}:${winnerId}`,
        });
      }

      // Award victory bonus (fixed 25 PTS)
      if (winBonus > 0) {
        await postLedger(tx, {
          userId: winnerId,
          type: 'FACEOFF_WIN_BONUS',
          amount: winBonus,
          balanceKind: 'SPENDABLE',
          refType: 'FACEOFF',
          refId: duel.id,
          idempotencyKey: `faceoff-win-bonus:${duel.id}:${winnerId}`,
        });
      }

      await recordFaceOffEvent(tx, {
        faceOffId: duel.id,
        roundNumber,
        actorUserId: winnerId,
        eventType: 'MATCH_COMPLETED',
        detail: { winnerId, challengerScore, opponentScore, payout, systemFee, winBonus },
      });

      await recordFaceOffEvent(tx, {
        faceOffId: duel.id,
        roundNumber,
        actorUserId: winnerId,
        eventType: 'REWARDS_DISTRIBUTED',
        detail: { winnerId, payout, systemFee, winBonus },
      });

      return {
        success: true,
        duelId: duel.id,
        status: 'COMPLETED',
        winnerId,
        challengerScore,
        opponentScore,
        totalPot: duel.stake * 2,
        systemFee,
        payout,
        winBonus,
      };
    });
  } catch (err) {
    if (!(err instanceof FaceOffError && err.status === 409)) {
      const errMsg = err instanceof Error ? err.message : 'Settlement error';
      await db.faceOff.updateMany({
        where: { id: duel.id, status: { in: [FaceOffStatus.SETTLING, FaceOffStatus.READY_TO_SETTLE] } },
        data: {
          status: FaceOffStatus.READY_TO_SETTLE,
          settlementAttempts: { increment: 1 },
          lastSettlementError: errMsg,
        },
      }).catch(() => {});
      await recordFaceOffEvent(db, {
        faceOffId: duel.id,
        roundNumber,
        eventType: 'SETTLEMENT_FAILED',
        detail: { error: errMsg },
      });
    }
    throw err;
  }

  if (result.status === 'COMPLETED' && 'winnerId' in result && result.winnerId) {
    const loserId = result.winnerId === duel.challengerId ? duel.opponentId : duel.challengerId;
    const totalWon = (result.payout ?? 0) + (result.winBonus ?? 0);
    void createNotification({
      userId: result.winnerId,
      type: 'FACEOFF_RESULT',
      title: 'Congratulations! Arena Victory',
      body: totalWon > 0
        ? `You won the Arena duel (${challengerScore} vs ${opponentScore}) and earned +${totalWon} PTS!`
        : `You won the Arena duel (${challengerScore} vs ${opponentScore})!`,
      href: '/faceoff',
      metadata: { duelId: duel.id, outcome: 'WIN', totalWon },
    });
    if (loserId) {
      void createNotification({
        userId: loserId,
        type: 'FACEOFF_RESULT',
        title: 'Arena Duel Completed',
        body: `Your Arena duel finished (${challengerScore} vs ${opponentScore}). Enter another match to climb the rankings.`,
        href: '/faceoff',
        metadata: { duelId: duel.id, outcome: 'LOSS' },
      });
    }
  } else if (result.status === 'TIE_REMATCH') {
    for (const uid of [duel.challengerId, duel.opponentId]) {
      if (!uid) continue;
      void createNotification({
        userId: uid,
        type: 'FACEOFF_RESULT',
        title: 'Arena Tie — Rematch Required!',
        body: `Both contenders tied at ${challengerScore}/100. Complete your rematch round to decide the winner.`,
        href: '/faceoff',
        metadata: { duelId: duel.id, outcome: 'TIE_REMATCH' },
      });
    }
  }

  return result;
}

export async function cancelFaceOff(duelId: string, userId: string) {
  const duel = await db.faceOff.findUnique({
    where: { id: duelId },
  });

  if (!duel) throw new FaceOffError('Duel not found', 404);

  if (duel.challengerId !== userId) {
    throw new FaceOffError('Only the challenger can cancel this duel.', 403);
  }

  if (duel.status !== FaceOffStatus.WAITING) {
    throw new FaceOffError('Cannot cancel a duel that is already active or finished.', 400);
  }

  return db.$transaction(async (tx) => {
    const updated = await tx.faceOff.updateMany({
      where: { id: duel.id, status: FaceOffStatus.WAITING },
      data: {
        status: FaceOffStatus.CANCELLED,
        outcomeReason: 'CANCELLED_BY_CHALLENGER',
        challengerStatus: FaceOffParticipantStatus.WITHDRAWN,
      },
    });

    if (updated.count === 0) {
      throw new FaceOffError('Duel is no longer in waiting status.', 409);
    }

    if (duel.mode === FaceOffMode.STAKED && duel.stake > 0) {
      await postLedger(tx, {
        userId: duel.challengerId,
        type: 'FACEOFF_REFUND',
        amount: duel.stake,
        balanceKind: 'SPENDABLE',
        refType: 'FACEOFF',
        refId: duel.id,
        idempotencyKey: `faceoff-cancel-refund:${duel.id}:${duel.challengerId}`,
      });
    }

    await recordFaceOffEvent(tx, {
      faceOffId: duel.id,
      roundNumber: duel.currentRound ?? 1,
      actorUserId: userId,
      eventType: 'MATCH_CANCELLED',
      detail: { refunded: duel.stake },
    });

    return { success: true, duelId: duel.id, refunded: duel.stake };
  });
}

/** Automatically refunds and expires duels that passed the 24h deadline */
export async function expireStaleDuels() {
  const now = new Date();

  // 1. Expire unjoined duels and refund challenger
  const expiredWaiting = await db.faceOff.findMany({
    where: {
      status: FaceOffStatus.WAITING,
      expiresAt: { lte: now },
    },
  });

  for (const duel of expiredWaiting) {
    await db.$transaction(async (tx) => {
      const updated = await tx.faceOff.updateMany({
        where: { id: duel.id, status: FaceOffStatus.WAITING },
        data: {
          status: FaceOffStatus.EXPIRED,
          outcomeReason: 'EXPIRED_UNACCEPTED',
          challengerStatus: FaceOffParticipantStatus.TIMED_OUT,
        },
      });
      if (updated.count > 0) {
        if (duel.mode === FaceOffMode.STAKED && duel.stake > 0) {
          await postLedger(tx, {
            userId: duel.challengerId,
            type: 'FACEOFF_REFUND',
            amount: duel.stake,
            balanceKind: 'SPENDABLE',
            refType: 'FACEOFF',
            refId: duel.id,
            idempotencyKey: `faceoff-expiry-refund:${duel.id}:${duel.challengerId}`,
          });
        }
        await recordFaceOffEvent(tx, {
          faceOffId: duel.id,
          roundNumber: duel.currentRound ?? 1,
          eventType: 'MATCH_EXPIRED',
          detail: { reason: 'EXPIRED_UNACCEPTED' },
        });
      }
    });
  }

  // 2. Expire active duels where one or both contenders failed to complete within 24h
  const expiredActive = await db.faceOff.findMany({
    where: {
      status: { in: [FaceOffStatus.ACTIVE, FaceOffStatus.TIE_REMATCH, FaceOffStatus.READY_TO_SETTLE] },
      expiresAt: { lte: now },
    },
    include: {
      challengerBestScan: true,
      opponentBestScan: true,
    },
  });

  let forfeitedCount = 0;
  let refundedActiveCount = 0;
  let resolvedOnExpiryCount = 0;

  for (const duel of expiredActive) {
    const hasChallengerScan = Boolean(duel.challengerBestScanId || duel.challengerBestScan || duel.challengerFinalScore !== null && duel.challengerFinalScore !== undefined);
    const hasOpponentScan = Boolean(duel.opponentBestScanId || duel.opponentBestScan || duel.opponentFinalScore !== null && duel.opponentFinalScore !== undefined);
    const isStaked = duel.mode === FaceOffMode.STAKED && duel.stake > 0;

    if (hasChallengerScan && !hasOpponentScan) {
      // Challenger wins by opponent forfeit
      await db.$transaction(async (tx) => {
        const updated = await tx.faceOff.updateMany({
          where: { id: duel.id, status: { in: [FaceOffStatus.ACTIVE, FaceOffStatus.TIE_REMATCH, FaceOffStatus.READY_TO_SETTLE] } },
          data: {
            status: FaceOffStatus.COMPLETED,
            winnerId: duel.challengerId,
            outcomeReason: 'FORFEIT_OPPONENT_INACTIVE',
            opponentStatus: FaceOffParticipantStatus.TIMED_OUT,
            resolvedAt: now,
          },
        });
        if (updated.count > 0) {
          if (isStaked) {
            const totalPot = duel.stake * 2;
            const systemFee = Math.round(totalPot * EconomyConfig.ARENA.SYSTEM_FEE_PERCENT);
            const payout = totalPot - systemFee;

            await tx.faceOff.update({
              where: { id: duel.id },
              data: { feeAmount: systemFee },
            });

            await postLedger(tx, {
              userId: duel.challengerId,
              type: 'FACEOFF_PAYOUT',
              amount: payout,
              balanceKind: 'SPENDABLE',
              refType: 'FACEOFF',
              refId: duel.id,
              idempotencyKey: `faceoff-forfeit-payout:${duel.id}:${duel.challengerId}`,
            });
          }
          await recordFaceOffEvent(tx, {
            faceOffId: duel.id,
            roundNumber: duel.currentRound ?? 1,
            actorUserId: duel.challengerId,
            eventType: 'MATCH_COMPLETED',
            detail: { reason: 'FORFEIT_OPPONENT_INACTIVE', winnerId: duel.challengerId },
          });
        }
      });
      forfeitedCount++;
    } else if (!hasChallengerScan && hasOpponentScan && duel.opponentId) {
      // Opponent wins by challenger forfeit
      await db.$transaction(async (tx) => {
        const updated = await tx.faceOff.updateMany({
          where: { id: duel.id, status: { in: [FaceOffStatus.ACTIVE, FaceOffStatus.TIE_REMATCH, FaceOffStatus.READY_TO_SETTLE] } },
          data: {
            status: FaceOffStatus.COMPLETED,
            winnerId: duel.opponentId,
            outcomeReason: 'FORFEIT_CHALLENGER_INACTIVE',
            challengerStatus: FaceOffParticipantStatus.TIMED_OUT,
            resolvedAt: now,
          },
        });
        if (updated.count > 0) {
          if (isStaked && duel.opponentId) {
            const totalPot = duel.stake * 2;
            const systemFee = Math.round(totalPot * EconomyConfig.ARENA.SYSTEM_FEE_PERCENT);
            const payout = totalPot - systemFee;

            await tx.faceOff.update({
              where: { id: duel.id },
              data: { feeAmount: systemFee },
            });

            await postLedger(tx, {
              userId: duel.opponentId,
              type: 'FACEOFF_PAYOUT',
              amount: payout,
              balanceKind: 'SPENDABLE',
              refType: 'FACEOFF',
              refId: duel.id,
              idempotencyKey: `faceoff-forfeit-payout:${duel.id}:${duel.opponentId}`,
            });
          }
          await recordFaceOffEvent(tx, {
            faceOffId: duel.id,
            roundNumber: duel.currentRound ?? 1,
            actorUserId: duel.opponentId,
            eventType: 'MATCH_COMPLETED',
            detail: { reason: 'FORFEIT_CHALLENGER_INACTIVE', winnerId: duel.opponentId },
          });
        }
      });
      forfeitedCount++;
    } else if (hasChallengerScan && hasOpponentScan) {
      // Both scanned before expiry -> resolve with their best recorded scores
      try {
        await resolveFaceOff(duel.id);
        resolvedOnExpiryCount++;
      } catch (err) {
        console.warn('Auto resolve during expiry failed:', err);
      }
    } else {
      // Neither scanned (both ghosted) -> refund both players
      await db.$transaction(async (tx) => {
        const updated = await tx.faceOff.updateMany({
          where: { id: duel.id, status: { in: [FaceOffStatus.ACTIVE, FaceOffStatus.TIE_REMATCH, FaceOffStatus.READY_TO_SETTLE] } },
          data: {
            status: FaceOffStatus.EXPIRED,
            outcomeReason: 'EXPIRED_NO_SCANS',
            challengerStatus: FaceOffParticipantStatus.TIMED_OUT,
            opponentStatus: FaceOffParticipantStatus.TIMED_OUT,
          },
        });

        if (updated.count > 0) {
          if (isStaked) {
            await postLedger(tx, {
              userId: duel.challengerId,
              type: 'FACEOFF_REFUND',
              amount: duel.stake,
              balanceKind: 'SPENDABLE',
              refType: 'FACEOFF',
              refId: duel.id,
              idempotencyKey: `faceoff-ghost-refund:${duel.id}:${duel.challengerId}`,
            });

            if (duel.opponentId) {
              await postLedger(tx, {
                userId: duel.opponentId,
                type: 'FACEOFF_REFUND',
                amount: duel.stake,
                balanceKind: 'SPENDABLE',
                refType: 'FACEOFF',
                refId: duel.id,
                idempotencyKey: `faceoff-ghost-refund:${duel.id}:${duel.opponentId}`,
              });
            }
          }
          await recordFaceOffEvent(tx, {
            faceOffId: duel.id,
            roundNumber: duel.currentRound ?? 1,
            eventType: 'MATCH_EXPIRED',
            detail: { reason: 'EXPIRED_NO_SCANS' },
          });
        }
      });
      refundedActiveCount++;
    }
  }

  return {
    expiredWaitingCount: expiredWaiting.length,
    forfeitedCount,
    refundedActiveCount,
    resolvedOnExpiryCount,
  };
}

/**
 * Safe, idempotent reconciliation for stranded or ready-to-settle matches.
 * Can be called from cron, Control Centre, or on-read.
 */
export async function reconcileArenaMatches() {
  const expiryReport = await expireStaleDuels();

  const candidates = await db.faceOff.findMany({
    where: {
      status: { in: [FaceOffStatus.READY_TO_SETTLE, FaceOffStatus.SETTLING, FaceOffStatus.ACTIVE, FaceOffStatus.TIE_REMATCH] },
    },
    include: {
      challengerBestScan: true,
      opponentBestScan: true,
    },
  });

  let settledCount = 0;
  let failedCount = 0;

  for (const duel of candidates) {
    if (!duel.opponentId) continue;

    const roundNumber = duel.currentRound ?? 1;
    const maxAttempts = duel.maxAttemptsPerRound ?? EconomyConfig.ARENA.ATTEMPTS_PER_DUEL;
    const bothLocked = Boolean(duel.challengerLockedAt && duel.opponentLockedAt);

    let bothExhausted = false;
    if (!bothLocked) {
      const [cCount, oCount] = await Promise.all([
        db.faceOffAttempt.count({ where: { faceOffId: duel.id, userId: duel.challengerId, roundNumber } }),
        db.faceOffAttempt.count({ where: { faceOffId: duel.id, userId: duel.opponentId, roundNumber } }),
      ]);
      bothExhausted = cCount >= maxAttempts && oCount >= maxAttempts;
    }

    if (duel.status === FaceOffStatus.READY_TO_SETTLE || duel.status === FaceOffStatus.SETTLING || bothLocked || bothExhausted) {
      try {
        await resolveFaceOff(duel.id);
        settledCount++;
      } catch (err) {
        failedCount++;
        console.warn('Reconcile resolveFaceOff failed for duel:', duel.id, err);
      }
    }
  }

  return {
    ...expiryReport,
    settledCount,
    failedCount,
  };
}
