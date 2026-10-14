import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { getInitialsAvatarSvg } from '@/lib/avatar';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();

    // Query top users by lifetime points from Neon Lakebase Postgres
    const users = await db.user.findMany({
      orderBy: { lifetimePoints: 'desc' },
      take: 50,
      include: {
        streak: true,
        scans: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const leaderboard = users.map((u, index) => {
      const handleClean = u.handle ? u.handle.replace(/^@/, '') : `user_${u.id.slice(0, 6)}`;
      const avatar = getInitialsAvatarSvg(u.displayName, handleClean);
      const score = u.scans[0]?.score ?? 0;

      return {
        rank: index + 1,
        id: u.id,
        name: u.displayName,
        handle: `@${handleClean}`,
        avatar,
        score,
        tier: u.tier,
        streak: u.streak?.currentCount ?? 0,
        points: u.lifetimePoints,
        isCurrentUser: sessionUser ? sessionUser.id === u.id : false,
      };
    });

    return NextResponse.json({
      success: true,
      leaderboard,
      topThree: leaderboard.slice(0, 3),
      rest: leaderboard.slice(3),
      total: leaderboard.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch leaderboard from database',
        message: error instanceof Error ? error.message : 'Error',
      },
      { status: 500 }
    );
  }
}
