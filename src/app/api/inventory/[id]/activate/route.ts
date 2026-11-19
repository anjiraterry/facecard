import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { validateEffectDefinition } from '@/lib/boutique/effectRegistry';

export const dynamic = 'force-dynamic';

/**
 * POST /api/inventory/:id/activate
 * Activates a manual consumable/entitlement (e.g., Studio Pass, Share Studio Pass, Aura Charge).
 */
export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const userItem = await db.userItem.findFirst({
      where: {
        userId: sessionUser.id,
        quantity: { gt: 0 },
        OR: [{ id }, { itemId: id }],
      },
      include: { item: true },
    });

    if (!userItem) {
      return NextResponse.json({ error: 'Owned item not found' }, { status: 404 });
    }

    const effectKind = userItem.item.effectKind;
    if (
      !effectKind ||
      !['REWARD_MULTIPLIER', 'FEATURE_ENTITLEMENT', 'EXPORT_ENTITLEMENT', 'PROFILE_SHOWCASE'].includes(
        effectKind
      )
    ) {
      return NextResponse.json(
        { error: 'This item cannot be manually activated (it is either equipable or automatic).' },
        { status: 400 }
      );
    }

    const validation = validateEffectDefinition(effectKind, userItem.item.effectConfig);
    if (!validation.valid || !validation.normalizedConfig) {
      return NextResponse.json(
        { error: `Invalid item effect configuration: ${validation.errors.join(', ')}` },
        { status: 400 }
      );
    }

    const cfg = validation.normalizedConfig;
    const now = new Date();

    // Enforce exclusive stack group if active effect already exists
    if (effectKind === 'REWARD_MULTIPLIER' || effectKind === 'FEATURE_ENTITLEMENT') {
      const existingActive = await db.activeEffect.findFirst({
        where: {
          userId: sessionUser.id,
          effectKind,
          status: 'ACTIVE',
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      });
      if (existingActive) {
        return NextResponse.json(
          { error: 'An effect of this type is already active. Wait until it finishes or expires.' },
          { status: 409 }
        );
      }
    }

    const durationSeconds = 'durationSeconds' in cfg ? cfg.durationSeconds : 86400;
    const maximumUses = 'maximumUses' in cfg ? cfg.maximumUses : null;
    const maximumBonusPoints = 'maximumBonusPoints' in cfg ? cfg.maximumBonusPoints : null;
    const expiresAt = new Date(now.getTime() + durationSeconds * 1000);

    const activeEffect = await db.$transaction(async (tx) => {
      // Decrement 1 unit from UserItem on activation
      const dec = await tx.userItem.updateMany({
        where: { id: userItem.id, quantity: { gt: 0 } },
        data: { quantity: { decrement: 1 } },
      });
      if (dec.count !== 1) {
        throw new Error('INSUFFICIENT_QUANTITY');
      }

      const created = await tx.activeEffect.create({
        data: {
          userId: sessionUser.id,
          userItemId: userItem.id,
          itemId: userItem.itemId,
          effectKind,
          config: cfg as object,
          status: 'ACTIVE',
          startsAt: now,
          expiresAt,
          remainingUses: maximumUses,
          remainingBonusPoints: maximumBonusPoints,
        },
      });

      await tx.userItemMovement.create({
        data: {
          userId: sessionUser.id,
          userItemId: userItem.id,
          itemId: userItem.itemId,
          quantityDelta: -1,
          reason: 'EFFECT_ACTIVATED',
          referenceId: created.id,
        },
      });

      return created;
    });

    return NextResponse.json({ success: true, activeEffect });
  } catch (error) {
    console.error('Inventory activate error:', error);
    return NextResponse.json({ error: 'Failed to activate item' }, { status: 500 });
  }
}
