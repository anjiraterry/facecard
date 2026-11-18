import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { getOrCreateActiveBag } from '@/lib/atelier/orders';
import { jsonResponse } from '@/lib/atelier/serialize';

const MAX_ITEM_QTY = 10;

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const variantId = typeof body.variantId === 'string' ? body.variantId.trim() : '';
    const quantity = Number(body.quantity ?? 1);

    if (!variantId || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_ITEM_QTY) {
      return jsonResponse({ error: `Valid variantId and integer quantity (1-${MAX_ITEM_QTY}) required` }, 400);
    }

    const variant = await db.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: { select: { status: true, name: true } },
        inventoryLevels: { select: { onHand: true, reserved: true } },
      },
    });

    if (!variant || !variant.isActive || variant.product.status !== 'PUBLISHED') {
      return jsonResponse({ error: 'Product variant not available' }, 404);
    }

    const available = variant.inventoryLevels.reduce(
      (acc, lvl) => acc + Math.max(0, lvl.onHand - lvl.reserved),
      0
    );

    const bag = await getOrCreateActiveBag(user.id);
    const existingItem = await db.bagItem.findUnique({
      where: { bagId_variantId: { bagId: bag.id, variantId } },
    });

    const nextQty = (existingItem?.quantity ?? 0) + quantity;
    if (nextQty > MAX_ITEM_QTY) {
      return jsonResponse({ error: `Maximum ${MAX_ITEM_QTY} units per item allowed` }, 400);
    }
    if (nextQty > available) {
      return jsonResponse({ error: `Only ${available} unit(s) currently available in stock` }, 409);
    }

    const item = await db.bagItem.upsert({
      where: { bagId_variantId: { bagId: bag.id, variantId } },
      update: { quantity: nextQty },
      create: { bagId: bag.id, variantId, quantity: nextQty },
    });

    return jsonResponse({ success: true, item }, 201);
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to add item to bag', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}
