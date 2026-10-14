import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRequiredUser } from '@/lib/auth/session';
import { LedgerType, BalanceKind } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const user = await getRequiredUser();
    const { itemId } = await req.json();

    if (!itemId) {
      return NextResponse.json({ error: 'itemId is required' }, { status: 400 });
    }

    const item = await db.shopItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found in database catalog' }, { status: 404 });
    }

    if (user.spendableBalance < item.price) {
      return NextResponse.json(
        { error: `Insufficient spendable balance. Needed: ${item.price}, Available: ${user.spendableBalance}` },
        { status: 400 }
      );
    }

    const userStreak = await db.streak.findUnique({
      where: { userId: user.id },
    });

    if (item.slug === 'streak-freeze' && userStreak && userStreak.freezesHeld >= 2) {
      return NextResponse.json(
        { error: 'You are already holding the maximum limit of 2 Streak Freezes.' },
        { status: 400 }
      );
    }

    // Process transactional purchase
    const result = await db.$transaction(async (tx) => {
      // 1. Deduct balance
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          spendableBalance: { decrement: item.price },
        },
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
            lastScanDayKey: new Date().toISOString().split('T')[0],
            freezesHeld: 1,
          },
        });
      }

      // 3. Record purchase in ledger
      const idempotencyKey = `shop-buy-${user.id}-${item.id}-${Date.now()}`;
      await tx.pointsLedger.create({
        data: {
          userId: user.id,
          type: LedgerType.SHOP_PURCHASE,
          amount: -item.price,
          balanceKind: BalanceKind.SPENDABLE,
          refType: 'SHOP_PURCHASE',
          refId: item.id,
          idempotencyKey,
        },
      });

      // 4. Record purchase row
      await tx.purchase.create({
        data: {
          userId: user.id,
          itemId: item.id,
          price: item.price,
          idempotencyKey,
        },
      });

      return {
        updatedUser,
        userItem,
      };
    });

    return NextResponse.json({
      success: true,
      item,
      newSpendableBalance: result.updatedUser.spendableBalance,
      transactionId: `tx-${Date.now()}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process purchase in database', message: error instanceof Error ? error.message : 'Error' },
      { status: 400 }
    );
  }
}
