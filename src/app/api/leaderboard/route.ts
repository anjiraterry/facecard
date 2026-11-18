import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { getInitialsAvatarSvg } from '@/lib/avatar';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    const scope = (req.nextUrl.searchParams.get('scope') || 'GLOBAL').toUpperCase();

    let friendIds: string[] | null = null;
    if (scope === 'FRIENDS') {
      if (!sessionUser) {
        return NextResponse.json({
          success: true,
          scope,
          leaderboard: [],
          topThree: [],
          rest: [],
          total: 0,
        });
      }
      const friendships = await db.friendship.findMany({
        where: { requesterId: sessionUser.id, status: 'ACCEPTED' },
        select: { addresseeId: true },
      });
      friendIds = [sessionUser.id, ...friendships.map((f) => f.addresseeId)];
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Query top active users by lifetime points from Neon Lakebase Postgres
    const users = await db.user.findMany({
      where: {
        status: 'ACTIVE',
        ...(friendIds ? { id: { in: friendIds } } : {}),
        ...(scope === 'WEEKLY' ? { scans: { some: { createdAt: { gte: sevenDaysAgo } } } } : {}),
      },
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
      const avatar = u.avatarUrl || getInitialsAvatarSvg(u.displayName, handleClean);
      const latestScore = u.scans[0]?.score ?? null;

      return {
        rank: index + 1,
        id: u.id,
        name: u.displayName,
        handle: `@${handleClean}`,
        avatar,
        score: latestScore,
        tier: u.tier,
        streak: u.streak?.currentCount ?? 0,
        points: u.lifetimePoints,
        isCurrentUser: sessionUser ? sessionUser.id === u.id : false,
      };
    });

    return NextResponse.json({
      success: true,
      scope,
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
