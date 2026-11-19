import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { getStreakMultiplier } from '@/lib/scoring';

import { getInitialsAvatarSvg } from '@/lib/avatar';

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
    const userAvatar = (user as { avatarUrl?: string | null }).avatarUrl ?? null;
    const avatar = userAvatar || getInitialsAvatarSvg(user.displayName, handleClean);

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
      avatarUrl: userAvatar,
      dob: user.dateOfBirth ? user.dateOfBirth.toISOString().split('T')[0] : null,
      dobFormatted: user.dateOfBirth
        ? user.dateOfBirth.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : user.ageConfirmedAt
        ? '18+ Confirmed (Set DOB)'
        : 'Unverified',
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

    // Email changes require OTP verification via /api/auth/link-email; never allow unverified email overwrite here.
    const nextDisplayName =
      typeof updates.displayName === 'string' && updates.displayName.trim().length >= 2
        ? updates.displayName.trim().slice(0, 50)
        : sessionUser.displayName;

    const nextHandle =
      typeof updates.handle === 'string' && updates.handle.trim().length > 0
        ? updates.handle.replace(/^@/, '').toLowerCase().trim()
        : sessionUser.handle;

    if (nextHandle && !/^[a-z0-9_]{3,20}$/.test(nextHandle)) {
      return NextResponse.json(
        { error: 'Username must be 3-20 characters and contain only letters, numbers, or underscores.' },
        { status: 400 }
      );
    }

    let nextDateOfBirth: Date | undefined;
    if (typeof updates.dob === 'string' && updates.dob.trim().length > 0) {
      const parsedDob = new Date(`${updates.dob.trim()}T00:00:00.000Z`);
      if (Number.isNaN(parsedDob.getTime())) {
        return NextResponse.json({ error: 'Invalid date of birth format.' }, { status: 400 });
      }
      const today = new Date();
      const age =
        today.getUTCFullYear() -
        parsedDob.getUTCFullYear() -
        (today.getUTCMonth() < parsedDob.getUTCMonth() ||
        (today.getUTCMonth() === parsedDob.getUTCMonth() && today.getUTCDate() < parsedDob.getUTCDate())
          ? 1
          : 0);
      if (age < 18) {
        return NextResponse.json({ error: 'You must be at least 18 years old.' }, { status: 400 });
      }
      nextDateOfBirth = parsedDob;
    }

    const updated = await db.user.update({
      where: { id: sessionUser.id },
      data: {
        displayName: nextDisplayName,
        handle: nextHandle,
        ...(nextDateOfBirth ? { dateOfBirth: nextDateOfBirth } : {}),
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

export async function DELETE() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized', authenticated: false }, { status: 401 });
    }

    // 1. Revoke all active sessions
    const { revokeAllUserSessions, clearSessionCookies } = await import('@/lib/auth/sessions');
    await revokeAllUserSessions(sessionUser.id);

    // 2. Complete NDPA anonymization & erasure in a transaction (preserving pseudonymised financial/order audit rows)
    const now = new Date();
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: sessionUser.id },
        data: {
          status: 'DELETED',
          email: null,
          handle: null,
          displayName: 'Deleted Contender',
          pinHash: null,
          avatarUrl: null,
          ageConfirmedAt: null,
          consentAt: null,
        },
      });

      await tx.consentRecord.updateMany({
        where: { userId: sessionUser.id, withdrawnAt: null },
        data: { withdrawnAt: now },
      });

      await tx.shareCard.deleteMany({ where: { userId: sessionUser.id } });
      await tx.cardSnapshot.deleteMany({ where: { userId: sessionUser.id } });
      await tx.friendship.deleteMany({
        where: { OR: [{ requesterId: sessionUser.id }, { addresseeId: sessionUser.id }] },
      });
      await tx.skinProfile.deleteMany({ where: { userId: sessionUser.id } });
      await tx.skincareRoutine.deleteMany({ where: { userId: sessionUser.id } });
      await tx.skinConsent.deleteMany({ where: { userId: sessionUser.id } });
      await tx.address.deleteMany({ where: { userId: sessionUser.id } });
      await tx.shoppingBag.deleteMany({ where: { userId: sessionUser.id } });
      await tx.wishlistItem.deleteMany({ where: { userId: sessionUser.id } });
    });

    const res = NextResponse.json({
      success: true,
      message: 'Account deleted and personal data anonymized under NDPA standards.',
    });
    return clearSessionCookies(res);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete account', message: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    );
  }
}

