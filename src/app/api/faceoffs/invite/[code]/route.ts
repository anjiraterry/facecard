import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getInitialsAvatarSvg } from '@/lib/avatar';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    if (!code) {
      return NextResponse.json({ error: 'Invite code required' }, { status: 400 });
    }

    const duel = await db.faceOff.findUnique({
      where: { inviteCode: code.toUpperCase() },
      include: {
        challenger: {
          include: {
            scans: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
    });

    if (!duel) {
      return NextResponse.json({ error: 'Challenge not found or expired' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      inviteCode: duel.inviteCode,
      duelId: duel.id,
      challenger: {
        id: duel.challenger.id,
        displayName: duel.challenger.displayName,
        handle: duel.challenger.handle ? `@${duel.challenger.handle.replace(/^@/, '')}` : `@${duel.challenger.displayName.toLowerCase()}`,
        tier: duel.challenger.tier,
        score: duel.challenger.scans[0]?.score ?? 0,
        avatar: getInitialsAvatarSvg(duel.challenger.displayName, duel.challenger.handle || duel.challenger.id),
      },
      mode: duel.mode,
      stakeAmount: duel.stake,
      deadlineWat: duel.expiresAt.toISOString(),
      status: duel.status,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Challenge not found or expired', message: error instanceof Error ? error.message : 'Error' },
      { status: 404 }
    );
  }
}
