import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser, getRequiredUser } from '@/lib/auth/session';
import { FaceOffMode, FaceOffStatus, LedgerType, BalanceKind } from '@prisma/client';
import { getInitialsAvatarSvg } from '@/lib/avatar';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();

    const faceoffs = await db.faceOff.findMany({
      include: {
        challenger: {
          include: {
            streak: true,
            scans: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
        opponent: {
          include: {
            streak: true,
            scans: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = faceoffs.map((f) => {
      // Determine other party relative to session user
      const isChallenger = sessionUser ? f.challengerId === sessionUser.id : false;
      const targetUser = isChallenger && f.opponent ? f.opponent : f.challenger;

      const handleClean = targetUser.handle ? targetUser.handle.replace(/^@/, '') : 'contender';
      const image = getInitialsAvatarSvg(targetUser.displayName, handleClean);

      const score = targetUser.scans[0]?.score ?? 0;
      const tier = targetUser.tier;
      const isMine = sessionUser ? (f.challengerId === sessionUser.id || f.opponentId === sessionUser.id) : false;

      return {
        id: f.id,
        opponentName: targetUser.displayName,
        handle: `@${handleClean}`,
        image,
        tier: tier.charAt(0) + tier.slice(1).toLowerCase(),
        score,
        stake: f.mode === 'STAKED' ? `${f.stake} PTS` : 'Friendly Duel',
        stakeAmount: f.stake,
        mode: f.mode,
        status: f.status,
        isMine,
      };
    });

    return NextResponse.json({
      success: true,
      faceoffs: formatted,
      total: formatted.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch face-offs from database', message: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getRequiredUser();
    const body = await req.json();
    const { stakeAmount = 100, mode = 'STAKED' } = body;

    const isStaked = mode === 'STAKED';
    const stakeNum = isStaked ? Math.max(0, Number(stakeAmount)) : 0;

    if (isStaked && stakeNum > 0 && user.spendableBalance < stakeNum) {
      return NextResponse.json(
        { error: `Insufficient spendable balance to stake ${stakeNum} PTS. You currently have ${user.spendableBalance} PTS.` },
        { status: 400 }
      );
    }

    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const faceOff = await db.$transaction(async (tx) => {
      const created = await tx.faceOff.create({
        data: {
          challengerId: user.id,
          inviteCode,
          mode: isStaked ? FaceOffMode.STAKED : FaceOffMode.FRIENDLY,
          stake: stakeNum,
          status: FaceOffStatus.WAITING,
          expiresAt,
        },
      });

      if (isStaked && stakeNum > 0) {
        await tx.user.update({
          where: { id: user.id },
          data: { spendableBalance: { decrement: stakeNum } },
        });

        await tx.pointsLedger.create({
          data: {
            userId: user.id,
            type: LedgerType.FACEOFF_STAKE_HOLD,
            amount: -stakeNum,
            balanceKind: BalanceKind.SPENDABLE,
            refType: 'FACEOFF',
            refId: created.id,
            idempotencyKey: `faceoff-create-stake-${created.id}-${user.id}-${Date.now()}`,
          },
        });
      }

      return created;
    });

    return NextResponse.json({
      success: true,
      duelId: faceOff.id,
      inviteCode,
      inviteUrl: `/arena/invite/${inviteCode}`,
      mode: faceOff.mode,
      stakeAmount: faceOff.stake,
      totalStaked: faceOff.stake * 2,
      status: faceOff.status,
      expiresInMinutes: 1440,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create face-off in database', message: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    );
  }
}
