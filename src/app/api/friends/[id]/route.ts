import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { getInitialsAvatarSvg } from '@/lib/avatar';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionUser = await getSessionUser();

    const cleanParam = id.replace(/^@/, '');
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanParam);

    const user = await db.user.findFirst({
      where: {
        OR: [
          ...(isUuid ? [{ id: cleanParam }] : []),
          { handle: cleanParam },
        ],
      },
      include: {
        streak: true,
        scans: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Friend not found in database' }, { status: 404 });
    }

    const handleClean = user.handle ? user.handle.replace(/^@/, '') : `user_${user.id.slice(0, 6)}`;
    const avatar = getInitialsAvatarSvg(user.displayName, handleClean);
    const score = user.scans[0]?.score ?? 0;
    const band = user.scans[0]?.band ?? null;

    // Real duel metrics from Neon Lakebase Postgres
    const [duelsWon, duelsPlayed] = await Promise.all([
      db.faceOff.count({
        where: { winnerId: user.id, status: 'COMPLETED' },
      }),
      db.faceOff.count({
        where: {
          status: 'COMPLETED',
          OR: [{ challengerId: user.id }, { opponentId: user.id }],
        },
      }),
    ]);

    let headToHeadWithYou = { wins: 0, losses: 0 };
    if (sessionUser && sessionUser.id !== user.id) {
      const h2hDuels = await db.faceOff.findMany({
        where: {
          status: 'COMPLETED',
          OR: [
            { challengerId: user.id, opponentId: sessionUser.id },
            { challengerId: sessionUser.id, opponentId: user.id },
          ],
        },
        select: { winnerId: true },
      });
      headToHeadWithYou = {
        wins: h2hDuels.filter((d) => d.winnerId === sessionUser.id).length,
        losses: h2hDuels.filter((d) => d.winnerId === user.id).length,
      };
    }

    const activeDuel = await db.faceOff.findFirst({
      where: {
        status: { in: ['WAITING', 'ACTIVE'] },
        OR: [{ challengerId: user.id }, { opponentId: user.id }],
      },
    });

    return NextResponse.json({
      success: true,
      friend: {
        id: user.id,
        name: user.displayName,
        handle: `@${handleClean}`,
        avatar,
        score,
        band,
        tier: user.tier,
        streak: user.streak?.currentCount ?? 0,
        status: activeDuel ? 'IN_ARENA' : 'ONLINE',
        bio: null,
        lifetimePoints: user.lifetimePoints,
        duelsPlayed,
        duelsWon,
        headToHeadWithYou,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Friend not found in database', message: error instanceof Error ? error.message : 'Error' },
      { status: 404 }
    );
  }
}
