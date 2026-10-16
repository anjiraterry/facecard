import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRequiredUser } from '@/lib/auth/session';
import { cancelFaceOff, FaceOffError } from '@/lib/faceoff';
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
        challengerBestScan: true,
        opponentBestScan: true,
      },
    });

    if (!duel) {
      return NextResponse.json({ error: 'Duel not found in database' }, { status: 404 });
    }

    const challengerScore = duel.challengerBestScan?.score ?? duel.challenger.scans[0]?.score ?? 0;
    const opponentScore = duel.opponentBestScan?.score ?? duel.opponent?.scans[0]?.score ?? 0;

    return NextResponse.json({
      success: true,
      duel: {
        id: duel.id,
        inviteCode: duel.inviteCode,
        challenger: {
          id: duel.challenger.id,
          displayName: duel.challenger.displayName,
          handle: duel.challenger.handle ? `@${duel.challenger.handle.replace(/^@/, '')}` : `@${duel.challenger.displayName.toLowerCase()}`,
          score: challengerScore,
          tier: duel.challenger.tier,
          avatar: (duel.challenger as { avatarUrl?: string | null }).avatarUrl || getInitialsAvatarSvg(duel.challenger.displayName, duel.challenger.handle || duel.challenger.id),
        },
        opponent: duel.opponent
          ? {
              id: duel.opponent.id,
              displayName: duel.opponent.displayName,
              handle: duel.opponent.handle ? `@${duel.opponent.handle.replace(/^@/, '')}` : `@${duel.opponent.displayName.toLowerCase()}`,
              score: opponentScore,
              tier: duel.opponent.tier,
              avatar: (duel.opponent as { avatarUrl?: string | null }).avatarUrl || getInitialsAvatarSvg(duel.opponent.displayName, duel.opponent.handle || duel.opponent.id),
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
