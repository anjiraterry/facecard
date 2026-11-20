import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { bootstrapCardThemes, isTierEligibleForTheme, serializeCardTheme } from '@/lib/card/themes';
import { Tier } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await bootstrapCardThemes();
    const body = await req.json().catch(() => ({}));
    const themeId = typeof body.themeId === 'string' ? body.themeId.trim() : '';
    if (!themeId) return NextResponse.json({ error: 'themeId is required' }, { status: 400 });

    const [user, theme] = await Promise.all([
      db.user.findUnique({
        where: { id: sessionUser.id },
        include: {
          cards: { take: 1 },
          items: { where: { quantity: { gt: 0 } } },
        },
      }),
      db.cardTheme.findUnique({ where: { themeId } }),
    ]);

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (!theme || theme.status === 'DRAFT') {
      return NextResponse.json({ error: 'Card theme not found' }, { status: 404 });
    }

    const actualTier = user.tier as Tier;
    if (!isTierEligibleForTheme(actualTier, theme.minimumTier)) {
      return NextResponse.json(
        { error: `Requires ${theme.minimumTier} tier or higher to equip ${theme.name}.` },
        { status: 403 }
      );
    }

    const ownedItem = theme.shopItemId ? user.items.find((i) => i.itemId === theme.shopItemId) : null;
    const isOwned = theme.acquisition === 'TIER_UNLOCK' || Boolean(ownedItem);
    if (!isOwned) {
      return NextResponse.json({ error: 'You do not own this card theme yet.' }, { status: 403 });
    }

    const card = user.cards[0];
    if (!card) {
      return NextResponse.json({ error: 'Claim your Face Card before equipping a theme.' }, { status: 400 });
    }

    await db.$transaction(async (tx) => {
      await tx.card.update({
        where: { id: card.id },
        data: {
          equippedThemeId: theme.themeId,
          equippedSkinId: theme.shopItemId ?? null,
        },
      });

      if (ownedItem && theme.shopItemId) {
        await tx.userEquipment.upsert({
          where: { userId_slot: { userId: user.id, slot: 'CARD_SKIN' } },
          update: { userItemId: ownedItem.id, itemId: theme.shopItemId, equippedAt: new Date() },
          create: { userId: user.id, slot: 'CARD_SKIN', userItemId: ownedItem.id, itemId: theme.shopItemId },
        });
      }
    });

    return NextResponse.json({ success: true, equippedThemeId: theme.themeId, theme: serializeCardTheme(theme) });
  } catch (error) {
    console.error('Equip card theme error:', error);
    return NextResponse.json({ error: 'Failed to equip card theme' }, { status: 500 });
  }
}
