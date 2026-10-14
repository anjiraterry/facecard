import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { getStreakMultiplier } from '@/lib/scoring';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.', authenticated: false },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: sessionUser.id },
      include: {
        streak: true,
        cards: {
          include: {
            equippedTitle: true,
          },
        },
        scans: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }

    const latestScan = user.scans[0];
    const streakDays = user.streak?.currentCount ?? 0;
    const streakMultiplier = getStreakMultiplier(streakDays);

    const equippedTitle = user.cards[0]?.equippedTitle?.name;
    const defaultTitle =
      user.tier === 'BLACK'
        ? 'Apex Obsidian'
        : user.tier === 'PLATINUM'
        ? 'Platinum Elite'
        : user.tier === 'GOLD'
        ? 'Gold Standard'
        : 'Certified Classic';

    const cardTitle = equippedTitle
      ? equippedTitle.replace(/^Title:\s*"/, '').replace(/"$/, '')
      : defaultTitle;

    const handleClean = user.handle ? user.handle.replace(/^@/, '') : `user_${user.id.slice(0, 6)}`;
    const avatar = `https://api.dicebear.com/7.x/identicon/svg?seed=${handleClean}`;

    const memberSinceStr = user.createdAt.toLocaleDateString('en-GB', {
      month: 'short',
      year: 'numeric',
    });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      handle: `@${handleClean}`,
      avatar,
      dob: user.ageConfirmedAt ? user.ageConfirmedAt.toISOString().split('T')[0] : null,
      dobFormatted: user.ageConfirmedAt ? 'Age 18+ (Verified)' : 'Unverified',
      location: 'WAT (West Africa)',
      bio: null,
      memberSince: memberSinceStr,
      tier: user.tier,
      lifetimePoints: user.lifetimePoints,
      spendableBalance: user.spendableBalance,
      streakDays,
      streakMultiplier,
      streakFreezesHeld: user.streak?.freezesHeld ?? 0,
      biometricVerified: !!user.consentAt,
      score: latestScan ? latestScan.score : null,
      band: latestScan ? latestScan.band : null,
      title: cardTitle,
      breakdown: latestScan ? latestScan.categoryScores : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch user profile', message: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized', authenticated: false }, { status: 401 });
    }

    const updates = await req.json();

    const updated = await db.user.update({
      where: { id: sessionUser.id },
      data: {
        displayName: updates.displayName ?? sessionUser.displayName,
        handle: updates.handle ? updates.handle.replace(/^@/, '').toLowerCase().trim() : sessionUser.handle,
        email: updates.email ?? sessionUser.email,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully in database',
      user: updated,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update profile', message: error instanceof Error ? error.message : 'Error' },
      { status: 400 }
    );
  }
}

export async function POST(req: NextRequest) {
  return PATCH(req);
}
