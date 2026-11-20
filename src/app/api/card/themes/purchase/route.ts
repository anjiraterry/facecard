import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { bootstrapCardThemes, isTierEligibleForTheme, serializeCardTheme } from '@/lib/card/themes';
import { postLedger, InsufficientBalanceError } from '@/lib/ledger';
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
        include: { items: { where: { quantity: { gt: 0 } } } },
      }),
      db.cardTheme.findUnique({ where: { themeId } }),
    ]);

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (!theme || theme.status !== 'PUBLISHED') {
      return NextResponse.json({ error: 'Card theme is not available for purchase.' }, { status: 404 });
    }
    if (theme.acquisition !== 'POINTS_PURCHASE' || !theme.shopItemId) {
      return NextResponse.json({ error: 'This theme cannot be purchased with points.' }, { status: 400 });
    }

    const actualTier = user.tier as Tier;
    if (!isTierEligibleForTheme(actualTier, theme.minimumTier)) {
      return NextResponse.json(
        { error: `Requires ${theme.minimumTier} tier or higher to purchase ${theme.name}.` },
        { status: 403 }
      );
    }

    if (user.items.some((i) => i.itemId === theme.shopItemId)) {
      return NextResponse.json({ error: 'You already own this card theme.' }, { status: 409 });
    }

    const purchaseId = randomUUID();
    const shopItemId = theme.shopItemId;

    const result = await db.$transaction(async (tx) => {
      await postLedger(tx, {
        userId: user.id,
        type: 'SHOP_PURCHASE',
        amount: -theme.pricePoints,
        balanceKind: 'SPENDABLE',
        refType: 'CARD_THEME_PURCHASE',
        refId: purchaseId,
        idempotencyKey: `theme-purchase:${purchaseId}`,
      });

      const userItem = await tx.userItem.upsert({
        where: { userId_itemId: { userId: user.id, itemId: shopItemId } },
        update: { quantity: { increment: 1 } },
        create: { userId: user.id, itemId: shopItemId, quantity: 1 },
      });

      await tx.purchase.create({
        data: {
          id: purchaseId,
          userId: user.id,
          itemId: shopItemId,
          quantity: 1,
          price: theme.pricePoints,
          idempotencyKey: `theme-purchase:${purchaseId}`,
        },
      });

      await tx.userItemMovement.create({
        data: {
          userId: user.id,
          userItemId: userItem.id,
          itemId: shopItemId,
          quantityDelta: 1,
          reason: 'CARD_THEME_PURCHASE',
          referenceId: purchaseId,
        },
      });

      const fresh = await tx.user.findUnique({
        where: { id: user.id },
        select: { spendableBalance: true },
      });

      return { newSpendableBalance: fresh?.spendableBalance ?? user.spendableBalance - theme.pricePoints };
    });

    return NextResponse.json({
      success: true,
      theme: serializeCardTheme(theme),
      newSpendableBalance: result.newSpendableBalance,
    });
  } catch (error) {
    if (error instanceof InsufficientBalanceError) {
      return NextResponse.json({ error: 'Insufficient spendable points balance.' }, { status: 400 });
    }
    console.error('Purchase card theme error:', error);
    return NextResponse.json({ error: 'Failed to purchase card theme' }, { status: 500 });
  }
}
