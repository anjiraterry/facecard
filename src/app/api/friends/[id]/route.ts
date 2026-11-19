import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { getInitialsAvatarSvg } from '@/lib/avatar';
import { createNotification } from '@/lib/notifications';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionUser = await getSessionUser();

    const cleanParam = decodeURIComponent(id).replace(/^@/, '').trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanParam);

    const user = await db.user.findFirst({
      where: {
        OR: [
          ...(isUuid ? [{ id: cleanParam }] : []),
          { handle: { equals: cleanParam, mode: 'insensitive' } },
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
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const handleClean = user.handle ? user.handle.replace(/^@/, '') : `user_${user.id.slice(0, 6)}`;
    const userAvatar = (user as { avatarUrl?: string | null }).avatarUrl || null;
    const avatar = userAvatar || getInitialsAvatarSvg(user.displayName, handleClean);
    const score = user.scans[0]?.score ?? 0;
    const band = user.scans[0]?.band ?? null;

    // Real duel metrics from Lakebase Postgres
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

    // Head-to-Head metrics if viewer is authenticated
    let headToHeadWithYou = { played: 0, wins: 0, losses: 0, netPoints: 0 };
    let isFriend = false;
    let activeDuelWithYou: { id: string; status: string; stake: number; inviteCode?: string } | null = null;
    const isSelf = sessionUser ? sessionUser.id === user.id : false;

    if (sessionUser && !isSelf) {
      // Check mutual friendship via dedicated Friendship table
      const friendship = await db.friendship.findFirst({
        where: {
          status: 'ACCEPTED',
          OR: [
            { requesterId: sessionUser.id, addresseeId: user.id },
            { requesterId: user.id, addresseeId: sessionUser.id },
          ],
        },
      });
      isFriend = Boolean(friendship);

      // Check active or pending clash between viewer and target
      const ongoing = await db.faceOff.findFirst({
        where: {
          status: { in: ['WAITING', 'ACTIVE'] },
          OR: [
            { challengerId: sessionUser.id, opponentId: user.id },
            { challengerId: user.id, opponentId: sessionUser.id },
          ],
        },
        select: { id: true, status: true, stake: true, inviteCode: true },
      });
      if (ongoing) {
        activeDuelWithYou = ongoing;
      }

      // Check past head-to-head completed duels
      const h2hDuels = await db.faceOff.findMany({
        where: {
          status: 'COMPLETED',
          OR: [
            { challengerId: user.id, opponentId: sessionUser.id },
            { challengerId: sessionUser.id, opponentId: user.id },
          ],
        },
        select: { winnerId: true, stake: true },
      });

      const wins = h2hDuels.filter((d) => d.winnerId === sessionUser.id).length;
      const losses = h2hDuels.filter((d) => d.winnerId === user.id).length;
      const netPoints = h2hDuels.reduce((acc, d) => {
        if (d.winnerId === sessionUser.id) return acc + d.stake;
        if (d.winnerId === user.id) return acc - d.stake;
        return acc;
      }, 0);

      headToHeadWithYou = {
        played: h2hDuels.length,
        wins,
        losses,
        netPoints,
      };
    }

    // Check if target user is currently in arena
    const anyActiveDuel = await db.faceOff.findFirst({
      where: {
        status: { in: ['WAITING', 'ACTIVE'] },
        OR: [{ challengerId: user.id }, { opponentId: user.id }],
      },
    });

    // Breakdown subscores
    const catScores = (user.scans[0]?.categoryScores as Record<string, number> | null) || {};
    const breakdown = {
      photoCraft: typeof catScores.photoCraft === 'number' ? catScores.photoCraft : (score > 0 ? Math.min(100, score + 4) : 0),
      harmony: typeof catScores.harmony === 'number' ? catScores.harmony : (score > 0 ? score : 0),
      skinClarity: typeof catScores.skinClarity === 'number' ? catScores.skinClarity : (score > 0 ? Math.max(0, score - 3) : 0),
      expression: typeof catScores.expression === 'number' ? catScores.expression : (score > 0 ? score : 0),
      aura: typeof catScores.aura === 'number' ? catScores.aura : (score > 0 ? Math.min(100, score + 7) : 0),
    };

    const memberSince = user.createdAt.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });

    return NextResponse.json({
      success: true,
      friend: {
        id: user.id,
        name: user.displayName,
        handle: `@${handleClean}`,
        avatar,
        avatarUrl: userAvatar,
        score,
        band,
        tier: user.tier,
        streak: user.streak?.currentCount ?? 0,
        status: anyActiveDuel ? 'IN_ARENA' : 'ONLINE',
        bio: null,
        memberSince,
        lifetimePoints: user.lifetimePoints,
        duelsPlayed,
        duelsWon,
        isSelf,
        isFriend,
        activeDuelWithYou,
        headToHeadWithYou,
        breakdown,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to retrieve profile', message: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.', authenticated: false }, { status: 401 });
    }

    const { id } = await params;
    const cleanParam = decodeURIComponent(id).replace(/^@/, '').trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanParam);

    const target = await db.user.findFirst({
      where: {
        OR: [
          ...(isUuid ? [{ id: cleanParam }] : []),
          { handle: { equals: cleanParam, mode: 'insensitive' } },
        ],
      },
    });

    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (target.id === sessionUser.id) {
      return NextResponse.json({ error: 'Cannot add yourself as a friend' }, { status: 400 });
    }

    const existing = await db.friendship.findFirst({
      where: {
        OR: [
          { requesterId: sessionUser.id, addresseeId: target.id },
          { requesterId: target.id, addresseeId: sessionUser.id },
        ],
      },
    });

    if (existing?.status === 'BLOCKED') {
      return NextResponse.json({ error: 'Unable to send friend request to this user' }, { status: 403 });
    }

    if (existing?.status === 'ACCEPTED') {
      return NextResponse.json({
        success: true,
        isFriend: true,
        status: 'ACCEPTED',
        message: `You and @${target.handle || target.displayName} are already friends.`,
      });
    }

    if (existing && existing.requesterId === target.id && existing.status === 'PENDING') {
      await db.friendship.update({
        where: { id: existing.id },
        data: { status: 'ACCEPTED' },
      });
      void createNotification({
        userId: target.id,
        type: 'FRIEND_ACCEPTED',
        title: 'Circle Request Accepted',
        body: `@${sessionUser.handle || sessionUser.displayName} accepted your Circle request.`,
        href: '/friends',
      });
      return NextResponse.json({
        success: true,
        isFriend: true,
        status: 'ACCEPTED',
        message: `Accepted @${target.handle || target.displayName} into your Circle!`,
      });
    }

    await db.friendship.upsert({
      where: {
        requesterId_addresseeId: {
          requesterId: sessionUser.id,
          addresseeId: target.id,
        },
      },
      update: { status: 'PENDING' },
      create: {
        requesterId: sessionUser.id,
        addresseeId: target.id,
        status: 'PENDING',
      },
    });

    void createNotification({
      userId: target.id,
      type: 'FRIEND_REQUEST',
      title: 'New Circle Request',
      body: `@${sessionUser.handle || sessionUser.displayName} wants to join your Circle.`,
      href: '/friends',
    });

    return NextResponse.json({
      success: true,
      isFriend: false,
      status: 'PENDING',
      message: `Friend request sent to @${target.handle || target.displayName}!`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to add friend', message: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.', authenticated: false }, { status: 401 });
    }

    const { id } = await params;
    const cleanParam = decodeURIComponent(id).replace(/^@/, '').trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanParam);

    const target = await db.user.findFirst({
      where: {
        OR: [
          ...(isUuid ? [{ id: cleanParam }] : []),
          { handle: { equals: cleanParam, mode: 'insensitive' } },
        ],
      },
    });

    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await db.friendship.deleteMany({
      where: {
        OR: [
          { requesterId: sessionUser.id, addresseeId: target.id },
          { requesterId: target.id, addresseeId: sessionUser.id },
        ],
      },
    });

    return NextResponse.json({
      success: true,
      isFriend: false,
      message: `Removed @${target.handle || target.displayName} from friends.`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to remove friend', message: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const action = body?.action === 'accept' ? 'accept' : body?.action === 'decline' ? 'decline' : null;
    if (!action) {
      return NextResponse.json({ error: 'action must be accept or decline' }, { status: 400 });
    }

    // id can be Friendship.id or requester User.id
    const pending = await db.friendship.findFirst({
      where: {
        addresseeId: sessionUser.id,
        status: 'PENDING',
        OR: [{ id }, { requesterId: id }],
      },
    });

    if (!pending) {
      return NextResponse.json({ error: 'Pending friend request not found' }, { status: 404 });
    }

    if (action === 'decline') {
      await db.friendship.delete({ where: { id: pending.id } });
      return NextResponse.json({ success: true, status: 'DECLINED' });
    }

    await db.friendship.update({
      where: { id: pending.id },
      data: { status: 'ACCEPTED' },
    });

    void createNotification({
      userId: pending.requesterId,
      type: 'FRIEND_ACCEPTED',
      title: 'Circle Request Accepted!',
      body: `@${sessionUser.handle || sessionUser.displayName} accepted your friend request.`,
      href: '/friends',
    });

    return NextResponse.json({ success: true, status: 'ACCEPTED' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to respond to friend request', message: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    );
  }
}
