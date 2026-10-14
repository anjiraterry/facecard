import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRequiredUser } from '@/lib/auth/session';
import { FaceOffStatus, LedgerType, BalanceKind } from '@prisma/client';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: duelId } = await params;
    const user = await getRequiredUser();

    const duel = await db.faceOff.findUnique({
      where: { id: duelId },
    });

    if (!duel) {
      return NextResponse.json({ error: 'Duel not found in database' }, { status: 404 });
    }

    if (duel.status !== FaceOffStatus.WAITING) {
      return NextResponse.json({ error: 'Duel is not open for joining' }, { status: 400 });
    }

    if (duel.mode === 'STAKED' && duel.stake > 0) {
      if (user.spendableBalance < duel.stake) {
        return NextResponse.json({ error: 'Insufficient points to match the duel stake' }, { status: 400 });
      }

      await db.$transaction([
        db.user.update({
          where: { id: user.id },
          data: { spendableBalance: { decrement: duel.stake } },
        }),
        db.pointsLedger.create({
          data: {
            userId: user.id,
            type: LedgerType.FACEOFF_STAKE_HOLD,
            amount: -duel.stake,
            balanceKind: BalanceKind.SPENDABLE,
            refType: 'FACEOFF',
            refId: duel.id,
            idempotencyKey: `faceoff-stake-${duel.id}-${user.id}-${Date.now()}`,
          },
        }),
        db.faceOff.update({
          where: { id: duel.id },
          data: {
            opponentId: user.id,
            status: FaceOffStatus.ACTIVE,
          },
        }),
      ]);
    } else {
      await db.faceOff.update({
        where: { id: duel.id },
        data: {
          opponentId: user.id,
          status: FaceOffStatus.ACTIVE,
        },
      });
    }

    return NextResponse.json({
      success: true,
      duelId,
      status: 'ACTIVE',
      message: 'You have entered the Arena duel! Complete your selfie scan to lock in your score.',
      attemptsRemaining: 3,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to join duel in database', message: error instanceof Error ? error.message : 'Error' },
      { status: 400 }
    );
  }
}
