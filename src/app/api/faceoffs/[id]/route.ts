import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRequiredUser, getSessionUser } from '@/lib/auth/session';
import { cancelFaceOff, expireStaleDuels, FaceOffError, resolveFaceOff } from '@/lib/faceoff';
import { getInitialsAvatarSvg } from '@/lib/avatar';
import { EconomyConfig } from '@/lib/economy';
import { FaceOffMode, FaceOffStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: duelId } = await params;
    const sessionUser = await getSessionUser();

    let duel = await db.faceOff.findUnique({
      where: { id: duelId },
      include: {
        challenger: { select: { id: true, displayName: true, handle: true, tier: true, avatarUrl: true } },
        opponent: { select: { id: true, displayName: true, handle: true, tier: true, avatarUrl: true } },
        challengerBestScan: true,
        opponentBestScan: true,
        rounds: { orderBy: { roundNumber: 'asc' } },
        events: { orderBy: { createdAt: 'asc' }, take: 50 },
      },
    });

    if (!duel) {
      return NextResponse.json({ error: 'Duel not found in database' }, { status: 404 });
    }

    // Safe on-read reconciliation if expired or ready to settle
    const now = Date.now();
    const isExpiredActive =
      duel.expiresAt.getTime() <= now &&
      (duel.status === FaceOffStatus.WAITING ||
        duel.status === FaceOffStatus.ACTIVE ||
        duel.status === FaceOffStatus.TIE_REMATCH ||
        duel.status === FaceOffStatus.READY_TO_SETTLE);

    const bothLocked = Boolean(duel.challengerLockedAt && duel.opponentLockedAt);
    const needsSettlement =
      duel.status === FaceOffStatus.READY_TO_SETTLE ||
      (bothLocked && (duel.status === FaceOffStatus.ACTIVE || duel.status === FaceOffStatus.TIE_REMATCH));

    if (isExpiredActive) {
      await expireStaleDuels().catch(() => {});
    } else if (needsSettlement) {
      await resolveFaceOff(duel.id).catch(() => {});
    }

    if (isExpiredActive || needsSettlement) {
      duel = (await db.faceOff.findUnique({
        where: { id: duelId },
        include: {
          challenger: { select: { id: true, displayName: true, handle: true, tier: true, avatarUrl: true } },
          opponent: { select: { id: true, displayName: true, handle: true, tier: true, avatarUrl: true } },
          challengerBestScan: true,
          opponentBestScan: true,
          rounds: { orderBy: { roundNumber: 'asc' } },
          events: { orderBy: { createdAt: 'asc' }, take: 50 },
        },
      }))!;
    }

    const roundNumber = duel.currentRound ?? 1;
    const maxAttempts = duel.maxAttemptsPerRound ?? EconomyConfig.ARENA.ATTEMPTS_PER_DUEL;

    const [challengerAttempts, opponentAttempts] = await Promise.all([
      db.faceOffAttempt.findMany({
        where: { faceOffId: duel.id, userId: duel.challengerId, roundNumber },
        orderBy: { attemptNumber: 'asc' },
      }),
      duel.opponentId
        ? db.faceOffAttempt.findMany({
            where: { faceOffId: duel.id, userId: duel.opponentId, roundNumber },
            orderBy: { attemptNumber: 'asc' },
          })
        : Promise.resolve([]),
    ]);

    const isChallenger = sessionUser?.id === duel.challengerId;
    const isOpponent = Boolean(sessionUser?.id && duel.opponentId === sessionUser.id);
    const isParticipant = isChallenger || isOpponent;

    const isSettled = duel.status === FaceOffStatus.COMPLETED || duel.status === FaceOffStatus.TIE_REMATCH;
    const bothParticipantsLocked = Boolean(duel.challengerLockedAt && duel.opponentLockedAt);
    const revealAllScores = isSettled || bothParticipantsLocked;

    const rawChallengerScore = duel.challengerFinalScore ?? duel.challengerBestScan?.score ?? null;
    const rawOpponentScore = duel.opponentFinalScore ?? duel.opponentBestScan?.score ?? null;

    const challengerScoreVisible = revealAllScores || isChallenger ? rawChallengerScore : null;
    const opponentScoreVisible = revealAllScores || isOpponent ? rawOpponentScore : null;

    const isStaked = duel.mode === FaceOffMode.STAKED && duel.stake > 0;
    const totalPot = duel.stake * 2;
    const payout = isStaked && duel.winnerId ? totalPot - (duel.feeAmount ?? 0) : 0;
    const winBonus = duel.winnerId ? EconomyConfig.ARENA.WIN_BONUS_POINTS : 0;

    return NextResponse.json({
      success: true,
      duel: {
        id: duel.id,
        inviteCode: duel.inviteCode,
        mode: duel.mode,
        stakeAmount: duel.stake,
        totalPot,
        feeAmount: duel.feeAmount ?? 0,
        payout,
        winBonus,
        status: duel.status,
        outcomeReason: duel.outcomeReason,
        currentRound: roundNumber,
        rematchCount: duel.rematchCount,
        maxAttemptsPerRound: maxAttempts,
        scoringVersion: duel.scoringVersion,
        weightsVersion: duel.weightsVersion,
        winnerId: duel.winnerId,
        scoresRevealed: revealAllScores,
        isParticipant,
        myRole: isChallenger ? 'CHALLENGER' : isOpponent ? 'OPPONENT' : null,
        expiresAt: duel.expiresAt.toISOString(),
        resolvedAt: duel.resolvedAt ? duel.resolvedAt.toISOString() : null,
        challenger: {
          id: duel.challenger.id,
          displayName: duel.challenger.displayName,
          handle: duel.challenger.handle
            ? `@${duel.challenger.handle.replace(/^@/, '')}`
            : `@${duel.challenger.displayName.toLowerCase()}`,
          score: challengerScoreVisible,
          scoreHidden: challengerScoreVisible === null && rawChallengerScore !== null,
          tier: duel.challenger.tier,
          avatar: duel.challenger.avatarUrl || getInitialsAvatarSvg(duel.challenger.displayName, duel.challenger.handle || duel.challenger.id),
          attemptsUsed: challengerAttempts.length,
          attemptsRemaining: Math.max(0, maxAttempts - challengerAttempts.length),
          lockedIn: Boolean(duel.challengerLockedAt),
          lockedAt: duel.challengerLockedAt ? duel.challengerLockedAt.toISOString() : null,
          participantStatus: duel.challengerStatus,
        },
        opponent: duel.opponent
          ? {
              id: duel.opponent.id,
              displayName: duel.opponent.displayName,
              handle: duel.opponent.handle
                ? `@${duel.opponent.handle.replace(/^@/, '')}`
                : `@${duel.opponent.displayName.toLowerCase()}`,
              score: opponentScoreVisible,
              scoreHidden: opponentScoreVisible === null && rawOpponentScore !== null,
              tier: duel.opponent.tier,
              avatar: duel.opponent.avatarUrl || getInitialsAvatarSvg(duel.opponent.displayName, duel.opponent.handle || duel.opponent.id),
              attemptsUsed: opponentAttempts.length,
              attemptsRemaining: Math.max(0, maxAttempts - opponentAttempts.length),
              lockedIn: Boolean(duel.opponentLockedAt),
              lockedAt: duel.opponentLockedAt ? duel.opponentLockedAt.toISOString() : null,
              participantStatus: duel.opponentStatus,
            }
          : null,
        rounds: duel.rounds.map((r) => ({
          roundNumber: r.roundNumber,
          maxAttempts: r.maxAttempts,
          challengerScore: revealAllScores ? r.challengerScore : isChallenger ? r.challengerScore : null,
          opponentScore: revealAllScores ? r.opponentScore : isOpponent ? r.opponentScore : null,
          winnerId: r.winnerId,
          isTie: r.isTie,
          endedAt: r.endedAt ? r.endedAt.toISOString() : null,
        })),
        events: isParticipant
          ? duel.events.map((e) => ({
              id: e.id,
              roundNumber: e.roundNumber,
              eventType: e.eventType,
              createdAt: e.createdAt.toISOString(),
            }))
          : [],
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to retrieve duel from database', message: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getRequiredUser();
    const { id: duelId } = await params;

    const result = await cancelFaceOff(duelId, sessionUser.id);

    return NextResponse.json({
      success: true,
      message: `Duel cancelled. Stake of ${result.refunded} PTS refunded to your balance.`,
    });
  } catch (error) {
    if (error instanceof FaceOffError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: 'Failed to cancel duel in database', message: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    );
  }
}
