import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { EconomyConfig } from '@/lib/economy';
import { ITEM_GRADIENTS, CATEGORY_LABELS } from '../route';
import { deriveItemLifecycleDetails, resolveCustomerPrimaryAction } from '@/lib/boutique/itemDetails';
import { expireStaleActiveEffects } from '@/lib/boutique/effects';
import { Tier } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    await expireStaleActiveEffects(sessionUser.id);

    const item = await db.shopItem.findFirst({
      where: {
        OR: [{ slug }, { id: slug }],
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Boutique item not found' }, { status: 404 });
    }

    const user = await db.user.findUnique({
      where: { id: sessionUser.id },
      include: {
        streak: true,
        cards: { take: 1 },
        items: { where: { itemId: item.id } },
        equipment: { where: { itemId: item.id } },
        activeEffects: {
          where: { itemId: item.id, status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        shopWishlist: { where: { itemId: item.id } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const ownedItem = user.items[0];
    const ownedQuantity =
      item.slug === 'streak-freeze'
        ? Math.max(ownedItem?.quantity ?? 0, user.streak?.freezesHeld ?? 0)
        : ownedItem?.quantity ?? 0;

    const card = user.cards[0];
    const isEquipped =
      user.equipment.length > 0 ||
      card?.equippedSkinId === item.id ||
      card?.equippedFrameId === item.id ||
      card?.equippedTitleId === item.id;

    const activeEffect = user.activeEffects[0] ?? null;
    const lifecycle = deriveItemLifecycleDetails(item);

    const userTierRank = EconomyConfig.TIERS[user.tier as Tier]?.rank ?? 1;
    const requiredTierRank = EconomyConfig.TIERS[item.minTier as Tier]?.rank ?? 1;

    const primaryAction = resolveCustomerPrimaryAction({
      item,
      isSupported: lifecycle.isSupported,
      userTierRank,
      requiredTierRank,
      spendableBalance: user.spendableBalance,
      ownedQuantity,
      isEquipped,
      hasActiveEffect: Boolean(activeEffect),
    });

    const ownershipStatus = !lifecycle.isSupported
      ? 'UNSUPPORTED'
      : activeEffect
        ? 'ACTIVE'
        : isEquipped
          ? 'EQUIPPED'
          : ownedQuantity > 0
            ? 'OWNED'
            : 'NOT_OWNED';

    return NextResponse.json({
      success: true,
      user: {
        tier: user.tier,
        spendableBalance: user.spendableBalance,
        displayName: user.displayName,
        handle: user.handle,
      },
      item: {
        id: item.id,
        sku: item.sku,
        slug: item.slug,
        name: item.name,
        description: item.description || '',
        kind: item.kind,
        category: item.category,
        categoryLabel: CATEGORY_LABELS[item.kind] || item.category,
        rarity: item.rarity,
        price: item.price,
        minTier: item.minTier,
        maxOwned: item.maxOwned,
        isGiftable: item.isGiftable,
        active: item.active,
        status: item.status,
        startsAt: item.startsAt?.toISOString() ?? null,
        endsAt: item.endsAt?.toISOString() ?? null,
        slot: item.slot,
        effectKind: item.effectKind,
        effectConfig: item.effectConfig,
        currentVersionId: item.currentVersionId,
        assetRef: item.assetRef,
        gradient:
          ITEM_GRADIENTS[item.slug] ||
          ITEM_GRADIENTS[item.id] ||
          'linear-gradient(135deg, #96788D 0%, #65475D 100%)',
      },
      lifecycle,
      customerState: {
        ownershipStatus,
        ownedQuantity,
        userItemId: ownedItem?.id ?? null,
        isEquipped,
        isWishlisted: user.shopWishlist.length > 0,
        tierLocked: userTierRank < requiredTierRank,
        canAfford: user.spendableBalance >= item.price,
        activeEffect: activeEffect
          ? {
              id: activeEffect.id,
              status: activeEffect.status,
              startsAt: activeEffect.startsAt.toISOString(),
              expiresAt: activeEffect.expiresAt?.toISOString() ?? null,
              remainingUses: activeEffect.remainingUses,
              remainingBonusPoints: activeEffect.remainingBonusPoints,
            }
          : null,
        primaryAction,
      },
    });
  } catch (error) {
    console.error('Shop item detail error:', error);
    return NextResponse.json({ error: 'Failed to load Boutique item details' }, { status: 500 });
  }
}
