import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRequiredUser } from '@/lib/auth/session';
import { FaceOffStatus, LedgerType, BalanceKind } from '@prisma/client';
import { getInitialsAvatarSvg } from '@/lib/avatar';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: duelId } = await params;

    const duel = await db.faceOff.findUnique({
      where: { id: duelId },
      include: {
        challenger: {
          include: {
            scans: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
        opponent: {
          include: {
            scans: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
    });

    if (!duel) {
      return NextResponse.json({ error: 'Duel not found in database' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      duel: {
        id: duel.id,
        inviteCode: duel.inviteCode,
        challenger: {
          id: duel.challenger.id,
          displayName: duel.challenger.displayName,
          handle: duel.challenger.handle ? `@${duel.challenger.handle.replace(/^@/, '')}` : `@${duel.challenger.displayName.toLowerCase()}`,
          score: duel.challenger.scans[0]?.score ?? 0,
          tier: duel.challenger.tier,
          avatar: getInitialsAvatarSvg(duel.challenger.displayName, duel.challenger.handle || duel.challenger.id),
        },
        opponent: duel.opponent
          ? {
              id: duel.opponent.id,
              displayName: duel.opponent.displayName,
              handle: duel.opponent.handle ? `@${duel.opponent.handle.replace(/^@/, '')}` : `@${duel.opponent.displayName.toLowerCase()}`,
              score: duel.opponent.scans[0]?.score ?? 0,
              tier: duel.opponent.tier,
              avatar: getInitialsAvatarSvg(duel.opponent.displayName, duel.opponent.handle || duel.opponent.id),
            }
          : null,
        mode: duel.mode,
        stakeAmount: duel.stake,
        status: duel.status,
        winnerId: duel.winnerId,
        expiresAt: duel.expiresAt.toISOString(),
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
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getRequiredUser();
    const { id: duelId } = await params;

    const duel = await db.faceOff.findUnique({
      where: { id: duelId },
    });

    if (!duel) {
      return NextResponse.json({ error: 'Duel not found' }, { status: 404 });
    }

    if (duel.challengerId !== sessionUser.id) {
      return NextResponse.json({ error: 'Only the challenger can cancel this duel' }, { status: 403 });
    }

    if (duel.status !== FaceOffStatus.WAITING) {
      return NextResponse.json({ error: 'Cannot cancel an active or completed duel' }, { status: 400 });
    }

    await db.$transaction(async (tx) => {
      await tx.faceOff.update({
        where: { id: duelId },
        data: { status: FaceOffStatus.CANCELLED },
      });

      if (duel.stake > 0) {
        await tx.user.update({
          where: { id: sessionUser.id },
          data: { spendableBalance: { increment: duel.stake } },
        });

        await tx.pointsLedger.create({
          data: {
            userId: sessionUser.id,
            type: LedgerType.FACEOFF_REFUND,
            amount: duel.stake,
            balanceKind: BalanceKind.SPENDABLE,
            refType: 'FACEOFF',
            refId: duelId,
            idempotencyKey: `faceoff-cancel-refund-${duelId}-${sessionUser.id}-${Date.now()}`,
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: `Duel #${duelId} cancelled. Stake of ${duel.stake} PTS refunded to your balance.`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to cancel duel in database', message: error instanceof Error ? error.message : 'Error' },
      { status: 400 }
    );
  }
}
