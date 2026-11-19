import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { ITEM_GRADIENTS, CATEGORY_LABELS } from './items/route';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.', authenticated: false }, { status: 401 });
    }
    const user = await db.user.findUnique({
      where: { id: sessionUser.id },
      include: {
        items: true,
        cards: true,
        equipment: true,
        shopWishlist: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }

    const shopItems = await db.shopItem.findMany({
      where: { active: true, status: 'PUBLISHED' },
      orderBy: [{ category: 'asc' }, { price: 'asc' }],
    });

    const ownedByItemId = new Map(user.items.map((ui) => [ui.itemId, ui.quantity]));
    const equippedItemIds = new Set(user.equipment.map((eq) => eq.itemId));
    const wishlistItemIds = new Set(user.shopWishlist.map((w) => w.itemId));
    const card = user.cards[0];
    const equipped = {
      skin: card?.equippedSkinId ?? null,
      title: card?.equippedTitleId ?? null,
      frame: card?.equippedFrameId ?? null,
    };

    const tierRank: Record<string, number> = { CLASSIC: 0, GOLD: 1, PLATINUM: 2, BLACK: 3 };

    const items = shopItems.map((item) => {
      const ownedQuantity = ownedByItemId.get(item.id) ?? 0;
      const isOwned = ownedQuantity > 0;
      const isEquipped =
        equippedItemIds.has(item.id) ||
        equipped.title === item.id ||
        equipped.skin === item.id ||
        equipped.frame === item.id;
      const isTierLocked = tierRank[item.minTier] > tierRank[user.tier];
      const normalizedCategory =
        item.category === 'CARDS' && item.kind !== 'SKIN'
          ? item.kind === 'CONSUMABLE'
            ? 'PERKS'
            : ['TITLE', 'FRAME', 'BADGE'].includes(item.kind)
              ? 'PROFILE'
              : item.category
          : item.category;

      const categoryLabel =
        normalizedCategory === 'GIFTS'
          ? 'Social Gift'
          : normalizedCategory === 'ARENA'
            ? 'Arena'
            : normalizedCategory === 'PERKS'
              ? item.slug === 'streak-freeze'
                ? 'Streak'
                : item.slug.includes('share')
                  ? 'Sharing'
                  : 'Perk'
              : CATEGORY_LABELS[item.kind] || item.kind;

      return {
        id: item.id,
        sku: item.sku,
        slug: item.slug,
        name: item.name,
        kind: item.kind,
        category: normalizedCategory,
        categoryLabel,
        rarity: item.rarity,
        slot: item.slot,
        effectKind: item.effectKind,
        effectConfig: item.effectConfig,
        isGiftable: item.isGiftable,
        maxOwned: item.maxOwned,
        currentVersionId: item.currentVersionId,
        price: item.price,
        minTier: item.minTier,
        description: item.description || '',
        gradient: ITEM_GRADIENTS[item.slug] || ITEM_GRADIENTS[item.id] || 'linear-gradient(135deg, #96788D 0%, #65475D 100%)',
        isOwned,
        ownedQuantity,
        isEquipped,
        isWishlisted: wishlistItemIds.has(item.id),
        isLocked: isTierLocked,
        canAfford: user.spendableBalance >= item.price,
      };
    });

    return NextResponse.json({
      success: true,
      spendableBalance: user.spendableBalance,
      tier: user.tier,
      items,
      equipped,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch shop catalog from database', message: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    );
  }
}
