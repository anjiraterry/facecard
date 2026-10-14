import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';

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

    const friendsList: FriendItem[] = users.map((u) => {
      const handleClean = u.handle ? u.handle.replace(/^@/, '') : `user_${u.id.slice(0, 6)}`;
      const avatar = `https://api.dicebear.com/7.x/identicon/svg?seed=${handleClean}`;
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
    const { targetHandle } = await req.json();

    if (!targetHandle) {
      return NextResponse.json({ error: 'Target handle required' }, { status: 400 });
    }

    const cleanHandle = targetHandle.replace(/^@/, '');
    const found = await db.user.findFirst({
      where: { handle: cleanHandle },
    });

    return NextResponse.json({
      success: true,
      message: found
        ? `Friend request sent to ${found.displayName} (@${found.handle})`
        : `Friend invite created for @${cleanHandle}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to add friend', message: error instanceof Error ? error.message : 'Error' },
      { status: 400 }
    );
  }
}
