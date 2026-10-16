import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { EconomyConfig } from '@/lib/economy';
import { postLedger, InsufficientBalanceError } from '@/lib/ledger';
import { hashRequest, parseIdempotencyKey, runIdempotent } from '@/lib/idempotency';
import { getLagosDayKey } from '@/lib/scoring';
import { Tier } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { itemId } = body;

    if (!itemId || typeof itemId !== 'string') {
      return NextResponse.json({ error: 'itemId is required' }, { status: 400 });
    }

    const idempotencyKey = parseIdempotencyKey(req) || `shop-purchase-${sessionUser.id}-${itemId}`;

    const result = await runIdempotent(
      sessionUser.id,
      'shop-purchase',
      idempotencyKey,
      hashRequest({ itemId }),
      () => performPurchase(sessionUser.id, itemId)
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

async function performPurchase(userId: string, itemId: string) {
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

  if (!item || !item.active) {
    return { status: 404, body: { error: 'Item not found in database catalog or inactive' } };
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
  if (currentOwnedQuantity >= item.maxOwned) {
    return {
      status: 400,
      body: { error: `You already own the maximum allowed quantity (${item.maxOwned}) for this item.` },
    };
  }

  // Streak freeze holding cap check
  if (item.slug === 'streak-freeze') {
    const freezesHeld = user.streak?.freezesHeld ?? 0;
    if (freezesHeld >= EconomyConfig.MAX_STREAK_FREEZES) {
      return {
        status: 400,
        body: { error: `You are already holding the maximum limit of ${EconomyConfig.MAX_STREAK_FREEZES} Streak Freezes.` },
      };
    }
  }

  const purchaseId = randomUUID();
  const purchaseIdempotencyKey = `shop:${purchaseId}`;

  try {
    const txResult = await db.$transaction(async (tx) => {
      // 1. Post ledger debit (enforces spendableBalance >= item.price atomically)
      await postLedger(tx, {
        userId: user.id,
        type: 'SHOP_PURCHASE',
        amount: -item.price,
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
          quantity: { increment: 1 },
        },
        create: {
          userId: user.id,
          itemId: item.id,
          quantity: 1,
        },
      });

      // 2b. If streak freeze, increment freezesHeld on Streak
      if (item.slug === 'streak-freeze') {
        await tx.streak.upsert({
          where: { userId: user.id },
          update: { freezesHeld: { increment: 1 } },
          create: {
            userId: user.id,
            currentCount: 1,
            longestCount: 1,
            lastScanDayKey: getLagosDayKey(),
            freezesHeld: 1,
          },
        });
      }

      // 3. Record purchase row with deterministic idempotency key
      const purchaseRecord = await tx.purchase.create({
        data: {
          id: purchaseId,
          userId: user.id,
          itemId: item.id,
          price: item.price,
          idempotencyKey: purchaseIdempotencyKey,
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
        newSpendableBalance: freshUser?.spendableBalance ?? (user.spendableBalance - item.price),
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
