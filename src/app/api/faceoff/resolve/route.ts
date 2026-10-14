import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { EconomyConfig } from '@/lib/economy';
import { FaceOffStatus, LedgerType, BalanceKind } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { duelId } = body;

    if (!duelId) {
      return NextResponse.json({ error: 'duelId is required' }, { status: 400 });
    }

    const duel = await db.faceOff.findUnique({
      where: { id: duelId },
      include: {
        challenger: {
          include: { scans: { orderBy: { createdAt: 'desc' }, take: 1 } },
        },
        opponent: {
          include: { scans: { orderBy: { createdAt: 'desc' }, take: 1 } },
        },
        challengerBestScan: true,
        opponentBestScan: true,
      },
    });

    if (!duel) {
      return NextResponse.json({ error: 'Duel not found in database' }, { status: 404 });
    }

    const challengerScore = body.challengerScore ?? duel.challengerBestScan?.score ?? duel.challenger.scans[0]?.score;
    const opponentScore = body.opponentScore ?? duel.opponentBestScan?.score ?? duel.opponent?.scans[0]?.score;

    if (challengerScore === undefined || opponentScore === undefined) {
      return NextResponse.json(
        { error: 'Both contenders must have valid scan scores in the database to resolve the duel' },
        { status: 400 }
      );
    }

    const challengerId = duel.challengerId;
    const opponentId = duel.opponentId || challengerId;
    const stakeAmount = duel.stake;

    const isTie = challengerScore === opponentScore;
    const challengerWon = challengerScore > opponentScore;
    const winnerId = challengerWon ? challengerId : opponentId;

    if (isTie) {
      await db.faceOff.update({
        where: { id: duel.id },
        data: { status: FaceOffStatus.TIE_REMATCH, rematchCount: { increment: 1 } },
      });

      return NextResponse.json({
        success: true,
        duelId: duel.id,
        status: 'TIE_REMATCH',
        challengerScore,
        opponentScore,
        outcome: 'TIE',
      });
    }

    const totalPot = stakeAmount * 2;
    const systemFee = Math.round(totalPot * EconomyConfig.ARENA.SYSTEM_FEE_PERCENT); // 5% fee
    const payout = totalPot - systemFee;
    const winBonus = EconomyConfig.ARENA.WIN_BONUS_POINTS; // +25 PTS bonus

    // Award winner in database transaction
    await db.$transaction([
      db.faceOff.update({
        where: { id: duel.id },
        data: {
          status: FaceOffStatus.COMPLETED,
          winnerId,
          feeAmount: systemFee,
          resolvedAt: new Date(),
        },
      }),
      db.user.update({
        where: { id: winnerId },
        data: {
          spendableBalance: { increment: payout + winBonus },
          lifetimePoints: { increment: winBonus },
        },
      }),
      db.pointsLedger.create({
        data: {
          userId: winnerId,
          type: LedgerType.FACEOFF_PAYOUT,
          amount: payout,
          balanceKind: BalanceKind.SPENDABLE,
          refType: 'FACEOFF',
          refId: duel.id,
          idempotencyKey: `payout-${duel.id}-${winnerId}-${Date.now()}`,
        },
      }),
      db.pointsLedger.create({
        data: {
          userId: winnerId,
          type: LedgerType.FACEOFF_WIN_BONUS,
          amount: winBonus,
          balanceKind: BalanceKind.SPENDABLE,
          refType: 'FACEOFF',
          refId: duel.id,
          idempotencyKey: `win-bonus-${duel.id}-${winnerId}-${Date.now()}`,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      duelId: duel.id,
      status: 'COMPLETED',
      winnerId,
      challengerScore,
      opponentScore,
      totalPot,
      systemFee,
      payout,
      winBonus,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to resolve arena duel', message: error instanceof Error ? error.message : 'Error' },
      { status: 400 }
    );
  }
}
