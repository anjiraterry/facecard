import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import {
  bootstrapCardThemes,
  DEFAULT_THEME_BY_TIER,
  isTierEligibleForTheme,
  serializeCardTheme,
} from '@/lib/card/themes';
import { CardThemeStatus, Tier } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await bootstrapCardThemes();

    const [user, themes] = await Promise.all([
      db.user.findUnique({
        where: { id: sessionUser.id },
        include: {
          cards: { take: 1, include: { equippedSkin: { select: { slug: true } } } },
          items: { where: { quantity: { gt: 0 } }, select: { itemId: true } },
        },
      }),
      db.cardTheme.findMany({
        where: { status: { not: CardThemeStatus.DRAFT } },
        orderBy: [{ minimumTier: 'asc' }, { pricePoints: 'asc' }],
      }),
    ]);

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const ownedItemIds = new Set(user.items.map((ui) => ui.itemId));
    const card = user.cards[0];
    const actualTier = user.tier as Tier;
    const equippedThemeId =
      card?.equippedThemeId ||
      card?.equippedSkin?.slug?.replace(/^skin-/, '') ||
      DEFAULT_THEME_BY_TIER[actualTier];

    const enriched = themes.map((t) => {
      const tierEligible = isTierEligibleForTheme(actualTier, t.minimumTier);
      const owned =
        (t.acquisition === 'TIER_UNLOCK' && tierEligible) ||
        (t.shopItemId ? ownedItemIds.has(t.shopItemId) : false);

      return {
        ...serializeCardTheme(t),
        status: t.status,
        tierEligible,
        owned,
        equipped: equippedThemeId === t.themeId,
        canPurchase:
          t.status === 'PUBLISHED' &&
          t.acquisition === 'POINTS_PURCHASE' &&
          tierEligible &&
          !owned &&
          user.spendableBalance >= t.pricePoints,
      };
    });

    return NextResponse.json({
      success: true,
      actualTier,
      spendableBalance: user.spendableBalance,
      equippedThemeId,
      themes: enriched,
    });
  } catch (error) {
    console.error('Get card themes error:', error);
    return NextResponse.json({ error: 'Failed to load card themes' }, { status: 500 });
  }
}
