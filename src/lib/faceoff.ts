import crypto from 'node:crypto';
import { db } from '@/lib/db';
import { EconomyConfig } from '@/lib/economy';
import { postLedger, InsufficientBalanceError } from '@/lib/ledger';
import { getLagosDayKey } from '@/lib/scoring';
import { FaceOffMode, FaceOffStatus } from '@prisma/client';

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

  const inviteCode = generateInviteCode();
  const expiresAt = new Date(Date.now() + EconomyConfig.ARENA.EXPIRY_MINUTES * 60 * 1000);

  // 4. Create duel and escrow stake atomically
  return db.$transaction(async (tx) => {
    const duel = await tx.faceOff.create({
      data: {
        challengerId,
        opponentId: targetOpponentId,
        inviteCode,
        mode,
        stake,
        status: FaceOffStatus.WAITING,
        expiresAt,
      },
    });

    if (isStaked && stake > 0) {
      try {
        await postLedger(tx, {
          userId: challengerId,
          type: 'FACEOFF_STAKE_HOLD',
          amount: -stake,
          balanceKind: 'SPENDABLE',
          refType: 'FACEOFF',
          refId: duel.id,
          idempotencyKey: `faceoff-create-stake:${duel.id}:${challengerId}`,
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

    return duel;
  });
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

  // Same-tier matchmaking rule
  if (opponent.tier !== duel.challenger.tier) {
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

    return tx.faceOff.findUnique({ where: { id: duel.id } });
  });
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

  if (duel.status !== FaceOffStatus.ACTIVE && duel.status !== FaceOffStatus.TIE_REMATCH) {
    throw new FaceOffError(`Cannot resolve duel with status ${duel.status}`, 400);
  }

  if (!duel.opponentId) {
    throw new FaceOffError('Cannot resolve duel without an opponent', 400);
  }

  // Scores MUST come from real scans recorded in the database
  const challengerScore = duel.challengerBestScan?.score;
  const opponentScore = duel.opponentBestScan?.score;

  if (challengerScore === undefined || opponentScore === undefined) {
    throw new FaceOffError('Both contenders must complete a scan before duel can be resolved.', 400);
  }

  const isTie = challengerScore === opponentScore;
  const challengerWon = challengerScore > opponentScore;
  const winnerId = challengerWon ? duel.challengerId : duel.opponentId;
  const isStaked = duel.mode === FaceOffMode.STAKED && duel.stake > 0;

  return db.$transaction(async (tx) => {
    // 1. Atomic state guard to prevent double resolution
    const claimed = await tx.faceOff.updateMany({
      where: {
        id: duel.id,
        status: { in: [FaceOffStatus.ACTIVE, FaceOffStatus.TIE_REMATCH] },
      },
      data: {
        status: isTie ? FaceOffStatus.TIE_REMATCH : FaceOffStatus.COMPLETED,
        rematchCount: isTie ? { increment: 1 } : undefined,
        winnerId: isTie ? null : winnerId,
        resolvedAt: isTie ? null : new Date(),
      },
    });

    if (claimed.count === 0) {
      throw new FaceOffError('Duel has already been resolved.', 409);
    }

    if (isTie) {
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

      // Record system fee (inflation sink record)
      await tx.pointsLedger.create({
        data: {
          userId: winnerId,
          type: 'FACEOFF_FEE',
          amount: systemFee,
          balanceKind: 'SPENDABLE',
          refType: 'FACEOFF',
          refId: duel.id,
          idempotencyKey: `faceoff-fee:${duel.id}`,
        },
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
      data: { status: FaceOffStatus.CANCELLED },
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
        data: { status: FaceOffStatus.EXPIRED },
      });
      if (updated.count > 0 && duel.mode === FaceOffMode.STAKED && duel.stake > 0) {
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
    });
  }

  // 2. Expire active duels where one or both contenders failed to scan within 24h
  const expiredActive = await db.faceOff.findMany({
    where: {
      status: { in: [FaceOffStatus.ACTIVE, FaceOffStatus.TIE_REMATCH] },
      expiresAt: { lte: now },
    },
    include: {
      challengerBestScan: true,
      opponentBestScan: true,
    },
  });

  let forfeitedCount = 0;
  let refundedActiveCount = 0;

  for (const duel of expiredActive) {
    const hasChallengerScan = Boolean(duel.challengerBestScanId || duel.challengerBestScan);
    const hasOpponentScan = Boolean(duel.opponentBestScanId || duel.opponentBestScan);
    const isStaked = duel.mode === FaceOffMode.STAKED && duel.stake > 0;

    if (hasChallengerScan && !hasOpponentScan) {
      // Challenger wins by opponent forfeit
      await db.$transaction(async (tx) => {
        const updated = await tx.faceOff.updateMany({
          where: { id: duel.id, status: { in: [FaceOffStatus.ACTIVE, FaceOffStatus.TIE_REMATCH] } },
          data: {
            status: FaceOffStatus.COMPLETED,
            winnerId: duel.challengerId,
            resolvedAt: now,
          },
        });
        if (updated.count > 0 && isStaked) {
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
      });
      forfeitedCount++;
    } else if (!hasChallengerScan && hasOpponentScan && duel.opponentId) {
      // Opponent wins by challenger forfeit
      await db.$transaction(async (tx) => {
        const updated = await tx.faceOff.updateMany({
          where: { id: duel.id, status: { in: [FaceOffStatus.ACTIVE, FaceOffStatus.TIE_REMATCH] } },
          data: {
            status: FaceOffStatus.COMPLETED,
            winnerId: duel.opponentId,
            resolvedAt: now,
          },
        });
        if (updated.count > 0 && isStaked && duel.opponentId) {
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
      });
      forfeitedCount++;
    } else if (hasChallengerScan && hasOpponentScan) {
      // Both scanned right before expiry, resolve normally
      try {
        await resolveFaceOff(duel.id);
      } catch (err) {
        console.warn('Auto resolve during expiry failed:', err);
      }
    } else {
      // Neither scanned (both ghosted) -> refund both players
      await db.$transaction(async (tx) => {
        const updated = await tx.faceOff.updateMany({
          where: { id: duel.id, status: { in: [FaceOffStatus.ACTIVE, FaceOffStatus.TIE_REMATCH] } },
          data: { status: FaceOffStatus.EXPIRED },
        });

        if (updated.count > 0 && isStaked) {
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
      });
      refundedActiveCount++;
    }
  }

  return {
    expiredWaitingCount: expiredWaiting.length,
    forfeitedCount,
    refundedActiveCount,
  };
}
