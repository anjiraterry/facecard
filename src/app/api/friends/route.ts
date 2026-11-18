import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { getInitialsAvatarSvg } from '@/lib/avatar';

export const dynamic = 'force-dynamic';

export interface FriendItem {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  score: number;
  tier: string;
  streak: number;
  status: 'ONLINE' | 'IN_ARENA' | 'OFFLINE';
  lastActive: string;
  duelRecord: {
    wins: number;
    losses: number;
  };
}

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.', authenticated: false }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q')?.toLowerCase();
    const isSuggested = searchParams.get('suggested') === 'true' || searchParams.get('all') === 'true';

    // Find users added as friends by this sessionUser via Friendship table
    const friendships = await db.friendship.findMany({
      where: {
        requesterId: sessionUser.id,
        status: 'ACCEPTED',
      },
      select: { addresseeId: true },
    });
    const friendIds = new Set(friendships.map((f) => f.addresseeId));

    const users = await db.user.findMany({
      where: {
        id: {
          not: sessionUser.id,
        },
      },
      include: {
        streak: true,
        scans: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        faceOffsWon: {
          where: { status: 'COMPLETED' },
          select: { id: true },
        },
        faceOffsChallenged: {
          where: { status: 'COMPLETED' },
          select: { id: true },
        },
        faceOffsOpposed: {
          where: { status: 'COMPLETED' },
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const activeDuels = await db.faceOff.findMany({
      where: {
        status: { in: ['WAITING', 'ACTIVE'] },
      },
      select: { challengerId: true, opponentId: true },
    });
    const usersInArena = new Set<string>();
    activeDuels.forEach((d) => {
      usersInArena.add(d.challengerId);
      if (d.opponentId) usersInArena.add(d.opponentId);
    });

    // If not in suggested mode, only include users that were added by sessionUser
    const targetUsers = isSuggested
      ? users
      : users.filter((u) => friendIds.has(u.id));

    const friendsList: FriendItem[] = targetUsers.map((u) => {
      const handleClean = u.handle ? u.handle.replace(/^@/, '') : `user_${u.id.slice(0, 6)}`;
      const avatar = getInitialsAvatarSvg(u.displayName, handleClean);
      const score = u.scans[0]?.score ?? 0;
      const wins = u.faceOffsWon.length;
      const totalDuels = u.faceOffsChallenged.length + u.faceOffsOpposed.length;
      const losses = Math.max(0, totalDuels - wins);

      const isInArena = usersInArena.has(u.id);
      const latestScan = u.scans[0];
      let status: 'ONLINE' | 'IN_ARENA' | 'OFFLINE' = 'OFFLINE';
      if (isInArena) {
        status = 'IN_ARENA';
      } else if (latestScan && Date.now() - latestScan.createdAt.getTime() < 24 * 3600 * 1000) {
        status = 'ONLINE';
      }

      const lastActive = isInArena
        ? 'In Arena Duel'
        : latestScan
        ? `Last scan ${latestScan.createdAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
        : `Joined ${u.createdAt.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`;

      return {
        id: u.id,
        name: u.displayName,
        handle: `@${handleClean}`,
        avatar,
        score,
        tier: u.tier,
        streak: u.streak?.currentCount ?? 0,
        status,
        lastActive,
        duelRecord: {
          wins,
          losses,
        },
      };
    });

    const filtered = query
      ? friendsList.filter(
          (f) =>
            f.name.toLowerCase().includes(query) ||
            f.handle.toLowerCase().includes(query)
        )
      : friendsList;

    return NextResponse.json({
      success: true,
      friends: filtered,
      total: filtered.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch friends from database', message: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.', authenticated: false }, { status: 401 });
    }

    const { targetHandle } = await req.json();

    if (!targetHandle) {
      return NextResponse.json({ error: 'Target handle required' }, { status: 400 });
    }

    const cleanHandle = targetHandle.replace(/^@/, '');
    const found = await db.user.findFirst({
      where: { handle: cleanHandle },
    });

    if (found) {
      if (found.id === sessionUser.id) {
        return NextResponse.json({ error: 'Cannot add yourself as a friend' }, { status: 400 });
      }
      // Record friendship link in dedicated Friendship table
      await db.friendship.upsert({
        where: {
          requesterId_addresseeId: {
            requesterId: sessionUser.id,
            addresseeId: found.id,
          },
        },
        update: { status: 'ACCEPTED' },
        create: {
          requesterId: sessionUser.id,
          addresseeId: found.id,
          status: 'ACCEPTED',
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: found
        ? `Friend request accepted: ${found.displayName} (@${found.handle})`
        : `Friend invite created for @${cleanHandle}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to add friend', message: error instanceof Error ? error.message : 'Error' },
      { status: 400 }
    );
  }
}
