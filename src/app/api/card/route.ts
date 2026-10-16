import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { getStreakMultiplier } from '@/lib/scoring';
import { getInitialsAvatarSvg, getCardCoverArtSvg } from '@/lib/avatar';
import { Tier, Band } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized', authenticated: false }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: sessionUser.id },
      include: {
        streak: true,
        cards: {
          include: {
            equippedSkin: true,
            equippedTitle: true,
            equippedFrame: true,
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
    const score = latestScan?.score ?? 0;
    const band = (latestScan?.band as Band) ?? 'HARMLESS';
    const cardRecord = user.cards[0];

    const categoryScores = (latestScan?.categoryScores as Record<string, unknown> | null) || null;

    const equippedTitleName = cardRecord?.equippedTitle?.name;
    const defaultTitle =
      user.tier === 'BLACK'
        ? 'Apex Obsidian'
        : user.tier === 'PLATINUM'
        ? 'Platinum Elite'
        : user.tier === 'GOLD'
        ? 'Gold Standard'
        : 'Certified Classic';

    const cardTitle = equippedTitleName
      ? equippedTitleName.replace(/^Title:\s*"/, '').replace(/"$/, '')
      : defaultTitle;

    const handleClean = user.handle ? user.handle.replace(/^@/, '') : `user_${user.id.slice(0, 6)}`;
    const userAvatar = (user as { avatarUrl?: string | null }).avatarUrl ?? undefined;

    const activeCard = {
      id: user.id,
      tier: user.tier as Tier,
      cardholderName: `@${handleClean}`,
      handle: `@${handleClean}`,
      title: cardTitle,
      score,
      band,
      streakDays,
      multiplier: streakMultiplier,
      avatarUrl: userAvatar,
      skinId: cardRecord?.equippedSkin?.slug ?? cardRecord?.equippedSkinId ?? undefined,
      frameId: cardRecord?.equippedFrame?.slug ?? cardRecord?.equippedFrameId ?? undefined,
    };

    const nextTierTarget = user.tier === 'CLASSIC' ? 1000 : user.tier === 'GOLD' ? 5000 : 10000;
    const progressPercent = Math.min(100, Math.round((user.lifetimePoints / nextTierTarget) * 100));

    const isClassicSurpassed = user.tier !== 'CLASSIC';
    const isGoldActive = user.tier === 'GOLD';
    const isPlatinumActive = user.tier === 'PLATINUM';

    const tiers = [
      {
        id: 'tier-classic',
        tier: 'CLASSIC' as Tier,
        name: 'Classic Lilac',
        status: isClassicSurpassed ? 'SURPASSED' : 'ACTIVE',
        statusBadge: isClassicSurpassed ? 'Surpassed Tier' : '★ Your Current Card',
        badgeStyle: isClassicSurpassed
          ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-200 border-purple-300/40'
          : 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border-amber-300/40 ring-2 ring-amber-400/30',
        card: {
          id: 'card-classic',
          tier: 'CLASSIC' as Tier,
          cardholderName: `@${handleClean}`,
          handle: `@${handleClean}`,
          avatarUrl: userAvatar,
          title: 'Certified Classic',
          score: Math.min(score, 72),
          band: 'DANGEROUS' as Band,
          streakDays: Math.min(streakDays, 3),
          multiplier: 1.0,
        },
        prerequisites: {
          pointsTarget: 0,
          pointsCurrent: user.lifetimePoints,
          scoreTarget: 60,
          streakTarget: 1,
          summary: 'Base tier unlocked upon sign-up. Permanently archived.',
        },
      },
      {
        id: 'tier-gold',
        tier: 'GOLD' as Tier,
        name: 'Gold Standard',
        status: isGoldActive ? 'ACTIVE' : isClassicSurpassed ? 'SURPASSED' : 'IN_PROGRESS',
        statusBadge: isGoldActive ? '★ Your Current Card' : isClassicSurpassed ? 'Surpassed Tier' : 'In Progress',
        badgeStyle: isGoldActive
          ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border-amber-300/40 shadow-xs ring-2 ring-amber-400/30'
          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300/40',
        card: activeCard,
        prerequisites: {
          pointsTarget: 1000,
          pointsCurrent: user.lifetimePoints,
          scoreTarget: 75,
          streakTarget: 5,
          summary: `Current active tier. Multiplier ×${streakMultiplier} active in duels.`,
        },
      },
      {
        id: 'tier-platinum',
        tier: 'PLATINUM' as Tier,
        name: 'Platinum Elite',
        status: isPlatinumActive ? 'ACTIVE' : 'IN_PROGRESS',
        statusBadge: isPlatinumActive ? '★ Your Current Card' : 'In Progress (Target: 5,000 PTS)',
        badgeStyle: isPlatinumActive
          ? 'bg-cyan-100 dark:bg-cyan-900/60 text-cyan-800 dark:text-cyan-200 border-cyan-300/40 ring-2 ring-cyan-400/30'
          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-300/40',
        card: {
          id: 'card-platinum',
          tier: 'PLATINUM' as Tier,
          cardholderName: `@${handleClean}`,
          handle: `@${handleClean}`,
          avatarUrl: userAvatar,
          title: 'Platinum Prestige',
          score: 88,
          band: 'LETHAL' as Band,
          streakDays: 14,
          multiplier: 1.5,
        },
        prerequisites: {
          pointsTarget: 5000,
          pointsCurrent: user.lifetimePoints,
          scoreTarget: 85,
          streakTarget: 14,
          summary: 'Prerequisites: 5,000 Lifetime PTS + 85+ Lethality + 14-day streak.',
        },
      },
      {
        id: 'tier-black',
        tier: 'BLACK' as Tier,
        name: 'Obsidian Black',
        status: user.tier === 'BLACK' ? 'ACTIVE' : 'LOCKED',
        statusBadge: user.tier === 'BLACK' ? '★ Your Current Card' : 'Locked (Target: 10,000 PTS)',
        badgeStyle: 'bg-zinc-900 dark:bg-zinc-950 text-zinc-300 dark:text-zinc-400 border-zinc-700/60',
        card: {
          id: 'card-black',
          tier: 'BLACK' as Tier,
          cardholderName: `@${handleClean}`,
          handle: `@${handleClean}`,
          avatarUrl: userAvatar,
          title: 'Apex Obsidian',
          score: 95,
          band: 'LETHAL' as Band,
          streakDays: 30,
          multiplier: 2.0,
        },
        prerequisites: {
          pointsTarget: 10000,
          pointsCurrent: user.lifetimePoints,
          scoreTarget: 92,
          streakTarget: 30,
          summary: 'Prerequisites: 10,000 Lifetime PTS + 92+ Lethality + 30-day streak.',
        },
      },
    ];

    const formula = [
      {
        name: 'Photo Craft',
        weight: '30%',
        score: categoryScores?.photoCraft ?? 0,
        tip: 'Balanced studio lighting & sharp focal alignment',
      },
      {
        name: 'Harmony & Proportion',
        weight: '25%',
        score: categoryScores?.harmony ?? 0,
        tip: 'Golden ratio feature balance & eye-to-jawline spacing',
      },
      {
        name: 'Skin Clarity',
        weight: '20%',
        score: categoryScores?.skinClarity ?? 0,
        tip: 'Smooth texture, subtle natural glow without heavy filtering',
      },
      {
        name: 'Expression & Aura',
        weight: '25%',
        score: categoryScores?.aura ?? 0,
        tip: 'High-status confidence, poised chin & commanding focal gaze',
      },
    ];

    return NextResponse.json({
      success: true,
      activeCard,
      tiers,
      formula,
      spendableBalance: user.spendableBalance,
      lifetimePoints: user.lifetimePoints,
      nextTierPoints: nextTierTarget,
      progressPercent,
      equippedSkinId: cardRecord?.equippedSkinId ?? null,
      equippedTitleId: cardRecord?.equippedTitleId ?? null,
      equippedFrameId: cardRecord?.equippedFrameId ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch card details', message: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    );
  }
}
