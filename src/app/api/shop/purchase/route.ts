import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { EconomyConfig } from '@/lib/economy';
import { postLedger, InsufficientBalanceError } from '@/lib/ledger';
import { hashRequest, parseIdempotencyKey, runIdempotent } from '@/lib/idempotency';
import { getLagosDayKey } from '@/lib/scoring';
import { validateEffectDefinition } from '@/lib/boutique/effectRegistry';
import { Tier } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { itemId, expectedUnitPricePoints, expectedItemVersionId, quantity: rawQty } = body as {
      itemId?: string;
      expectedUnitPricePoints?: number;
      expectedItemVersionId?: string;
      quantity?: number;
    };

    if (!itemId || typeof itemId !== 'string') {
      return NextResponse.json({ error: 'itemId is required' }, { status: 400 });
    }

    const quantity = typeof rawQty === 'number' && Number.isInteger(rawQty) && rawQty > 0 ? rawQty : 1;

    const idempotencyKey = parseIdempotencyKey(req) || `shop-purchase-${sessionUser.id}-${itemId}-${randomUUID()}`;

    const result = await runIdempotent(
      sessionUser.id,
      'shop-purchase',
      idempotencyKey,
      hashRequest({ itemId, quantity, expectedUnitPricePoints, expectedItemVersionId }),
      () => performPurchase(sessionUser.id, itemId, quantity, expectedUnitPricePoints, expectedItemVersionId)
    );

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Purchase route error:', error);
    return NextResponse.json(
      { error: 'Failed to process purchase' },
      { status: 500 }
    );
  }
}

async function performPurchase(
  userId: string,
  itemId: string,
  quantity = 1,
  expectedUnitPricePoints?: number,
  expectedItemVersionId?: string
) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      streak: true,
      items: { where: { itemId } },
    },
  });

  if (!user) {
    return { status: 404, body: { error: 'User not found in database' } };
  }

  const item = await db.shopItem.findUnique({
    where: { id: itemId },
  });

  if (!item || !item.active || item.status !== 'PUBLISHED') {
    return { status: 404, body: { error: 'Item not found in database catalog or inactive' } };
  }

  // Enforce registered effect handler integrity before purchase
  const effectCheck = item.effectKind
    ? validateEffectDefinition(item.effectKind, item.effectConfig)
    : { valid: false, errors: ['No effect handler registered'] };
  if (!effectCheck.valid) {
    return {
      status: 400,
      body: {
        error: 'This item is not purchasable until its effect integration is verified.',
        details: effectCheck.errors,
      },
    };
  }

  const now = new Date();
  if ((item.startsAt && item.startsAt > now) || (item.endsAt && item.endsAt < now)) {
    return { status: 400, body: { error: 'This item is outside its active sale window.' } };
  }

  if (
    (typeof expectedUnitPricePoints === 'number' && expectedUnitPricePoints !== item.price) ||
    (expectedItemVersionId && item.currentVersionId && expectedItemVersionId !== item.currentVersionId)
  ) {
    return {
      status: 409,
      body: {
        error: 'Item price or version changed before purchase.',
        conflict: true,
        currentItem: {
          id: item.id,
          price: item.price,
          currentVersionId: item.currentVersionId,
        },
      },
    };
  }

  // Tier requirement check
  const userTierRank = EconomyConfig.TIERS[user.tier as Tier]?.rank ?? 1;
  const itemTierRank = EconomyConfig.TIERS[item.minTier as Tier]?.rank ?? 1;
  if (userTierRank < itemTierRank) {
    return {
      status: 403,
      body: {
        error: `Tier locked. Requires ${EconomyConfig.TIERS[item.minTier as Tier]?.name || item.minTier} tier or higher.`,
      },
    };
  }

  // Max owned check
  const currentOwnedQuantity = user.items[0]?.quantity ?? 0;
  if (currentOwnedQuantity + quantity > item.maxOwned) {
    return {
      status: 400,
      body: { error: `You already own the maximum allowed quantity (${item.maxOwned}) for this item.` },
    };
  }

  // Streak freeze holding cap check
  if (item.slug === 'streak-freeze') {
    const freezesHeld = user.streak?.freezesHeld ?? 0;
    if (freezesHeld + quantity > EconomyConfig.MAX_STREAK_FREEZES) {
      return {
        status: 400,
        body: { error: `You are already holding the maximum limit of ${EconomyConfig.MAX_STREAK_FREEZES} Streak Freezes.` },
      };
    }
  }

  const totalPrice = item.price * quantity;
  const purchaseId = randomUUID();
  const purchaseIdempotencyKey = `shop:${purchaseId}`;

  try {
    const txResult = await db.$transaction(async (tx) => {
      // 1. Post ledger debit (enforces spendableBalance >= totalPrice atomically)
      await postLedger(tx, {
        userId: user.id,
        type: 'SHOP_PURCHASE',
        amount: -totalPrice,
        balanceKind: 'SPENDABLE',
        refType: 'SHOP_PURCHASE',
        refId: purchaseId,
        idempotencyKey: purchaseIdempotencyKey,
      });

      // 2. Add or increment UserItem
      const userItem = await tx.userItem.upsert({
        where: {
          userId_itemId: {
            userId: user.id,
            itemId: item.id,
          },
        },
        update: {
          quantity: { increment: quantity },
        },
        create: {
          userId: user.id,
          itemId: item.id,
          quantity,
        },
      });

      // 2b. If streak freeze, increment freezesHeld on Streak
      if (item.slug === 'streak-freeze') {
        await tx.streak.upsert({
          where: { userId: user.id },
          update: { freezesHeld: { increment: quantity } },
          create: {
            userId: user.id,
            currentCount: 1,
            longestCount: 1,
            lastScanDayKey: getLagosDayKey(),
            freezesHeld: quantity,
          },
        });
      }

      // 3. Record purchase row with deterministic idempotency key
      const purchaseRecord = await tx.purchase.create({
        data: {
          id: purchaseId,
          userId: user.id,
          itemId: item.id,
          itemVersionId: item.currentVersionId,
          quantity,
          price: totalPrice,
          idempotencyKey: purchaseIdempotencyKey,
        },
      });

      // 4. Record inventory movement
      await tx.userItemMovement.create({
        data: {
          userId: user.id,
          userItemId: userItem.id,
          itemId: item.id,
          quantityDelta: quantity,
          reason: 'BOUTIQUE_PURCHASE',
          referenceId: purchaseRecord.id,
        },
      });

      // Fetch fresh balance
      const freshUser = await tx.user.findUnique({
        where: { id: user.id },
        select: { spendableBalance: true },
      });

      return {
        purchaseRecord,
        userItem,
        newSpendableBalance: freshUser?.spendableBalance ?? (user.spendableBalance - totalPrice),
      };
    });

    return {
      status: 200,
      body: {
        success: true,
        item,
        newSpendableBalance: txResult.newSpendableBalance,
        transactionId: txResult.purchaseRecord.id,
      },
    };
  } catch (error) {
    if (error instanceof InsufficientBalanceError) {
      return {
        status: 400,
        body: { error: `Insufficient spendable balance. Needed: ${item.price}, Available: ${user.spendableBalance}` },
      };
    }
    throw error;
  }
}
