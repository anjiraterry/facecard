import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser, getRequiredUser } from '@/lib/auth/session';
import { createFaceOff, expireStaleDuels, FaceOffError } from '@/lib/faceoff';
import { EconomyConfig } from '@/lib/economy';
import { FaceOffMode, FaceOffStatus } from '@prisma/client';
import { getInitialsAvatarSvg, getCardCoverArtSvg } from '@/lib/avatar';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // 1. Automatically expire stale waiting duels so they are never returned as open
    await expireStaleDuels().catch(() => {});

    const sessionUser = await getSessionUser();
    const now = new Date();

    // Show duels relevant to current user: their own duels + open waiting unexpired duels
    const whereClause = sessionUser
      ? {
          OR: [
            { challengerId: sessionUser.id },
            { opponentId: sessionUser.id },
            { status: FaceOffStatus.WAITING, opponentId: null, expiresAt: { gt: now } },
          ],
        }
      : {
          status: FaceOffStatus.WAITING,
          opponentId: null,
          expiresAt: { gt: now },
        };

    const faceoffs = await db.faceOff.findMany({
      where: whereClause,
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
      take: 50,
    });

    const formatted = faceoffs.map((f) => {
      const isChallenger = sessionUser ? f.challengerId === sessionUser.id : false;
      const targetUser = isChallenger && f.opponent ? f.opponent : f.challenger;

      const handleClean = targetUser.handle ? targetUser.handle.replace(/^@/, '') : 'contender';
      const targetAvatar = (targetUser as { avatarUrl?: string | null }).avatarUrl ?? null;
      const image = targetAvatar || getCardCoverArtSvg({
        name: targetUser.displayName,
        handle: targetUser.handle,
        tier: targetUser.tier,
      });
      const iconAvatar = targetAvatar || getInitialsAvatarSvg(targetUser.displayName, handleClean);

      const score = targetUser.scans[0]?.score ?? 0;
      const tier = targetUser.tier;
      const isMine = sessionUser ? (f.challengerId === sessionUser.id || f.opponentId === sessionUser.id) : false;
      const isExpired = f.expiresAt.getTime() <= Date.now();
      const sameTier = sessionUser ? sessionUser.tier === f.challenger.tier : true;
      const canJoin = Boolean(
        sessionUser &&
        !isMine &&
        f.status === FaceOffStatus.WAITING &&
        !isExpired &&
        sameTier &&
        (!f.opponentId || f.opponentId === sessionUser.id)
      );

      return {
        id: f.id,
        opponentName: targetUser.displayName,
        handle: `@${handleClean}`,
        image,
        iconAvatar,
        tier: tier.charAt(0) + tier.slice(1).toLowerCase(),
        rawTier: tier,
        score,
        stake: f.mode === FaceOffMode.STAKED ? `${f.stake} PTS` : 'Friendly Duel',
        stakeAmount: f.stake,
        mode: f.mode,
        status: f.status,
        expiresAt: f.expiresAt,
        isMine,
        canJoin,
        sameTier,
        requiredTier: f.challenger.tier,
        opponentId: targetUser.id,
        challengerId: f.challengerId,
        targetUserId: targetUser.id,
        inviteCode: f.inviteCode,
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
    const body = await req.json().catch(() => ({}));
    const { stakeAmount = 100, mode = 'STAKED', opponentHandle } = body;

    const duelMode = mode === 'FRIENDLY' ? FaceOffMode.FRIENDLY : FaceOffMode.STAKED;
    const stakeNum = duelMode === FaceOffMode.STAKED ? Number(stakeAmount) : 0;

    const duel = await createFaceOff({
      challengerId: user.id,
      mode: duelMode,
      stakeAmount: stakeNum,
      opponentHandle: typeof opponentHandle === 'string' ? opponentHandle : undefined,
    });

    return NextResponse.json({
      success: true,
      duelId: duel.id,
      inviteCode: duel.inviteCode,
      inviteUrl: `/arena/invite/${duel.inviteCode}`,
      mode: duel.mode,
      stakeAmount: duel.stake,
      totalStaked: duel.stake * 2,
      status: duel.status,
      expiresInMinutes: EconomyConfig.ARENA.EXPIRY_MINUTES,
    });
  } catch (error) {
    if (error instanceof FaceOffError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: 'Failed to create face-off in database', message: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    );
  }
}
