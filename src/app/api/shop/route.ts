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
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }

    const shopItems = await db.shopItem.findMany({
      where: { active: true },
      orderBy: { price: 'asc' },
    });

    const ownedItemIds = user.items.map((ui) => ui.itemId);
    const card = user.cards[0];
    const equipped = {
      skin: card?.equippedSkinId ?? null,
      title: card?.equippedTitleId ?? null,
      frame: card?.equippedFrameId ?? null,
    };

    const tierRank: Record<string, number> = { CLASSIC: 0, GOLD: 1, PLATINUM: 2, BLACK: 3 };

    const items = shopItems.map((item) => {
      const isOwned = ownedItemIds.includes(item.id);
      const isEquipped =
        equipped.title === item.id || equipped.skin === item.id || equipped.frame === item.id;
      const isTierLocked = tierRank[item.minTier] > tierRank[user.tier];

      return {
        id: item.id,
        name: item.name,
        kind: item.kind,
        categoryLabel: CATEGORY_LABELS[item.kind] || item.kind,
        price: item.price,
        minTier: item.minTier,
        description: item.description || '',
        gradient: ITEM_GRADIENTS[item.slug] || ITEM_GRADIENTS[item.id] || 'linear-gradient(135deg, #6366F1 0%, #A855F7 100%)',
        isOwned,
        isEquipped,
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
