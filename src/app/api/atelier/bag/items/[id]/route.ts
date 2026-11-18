import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { jsonResponse } from '@/lib/atelier/serialize';

const MAX_ITEM_QTY = 10;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const quantity = Number(body.quantity);

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_ITEM_QTY) {
      return jsonResponse({ error: `Quantity must be an integer between 1 and ${MAX_ITEM_QTY}` }, 400);
    }

    const item = await db.bagItem.findUnique({
      where: { id },
      include: {
        bag: { select: { userId: true, status: true } },
        variant: { include: { inventoryLevels: { select: { onHand: true, reserved: true } } } },
      },
    });

    if (!item || item.bag.userId !== user.id || item.bag.status !== 'ACTIVE') {
      return jsonResponse({ error: 'Bag item not found' }, 404);
    }

    const available = item.variant.inventoryLevels.reduce(
      (acc, lvl) => acc + Math.max(0, lvl.onHand - lvl.reserved),
      0
    );
    if (quantity > available) {
      return jsonResponse({ error: `Only ${available} unit(s) available` }, 409);
    }

    const updated = await db.bagItem.update({
      where: { id: item.id },
      data: { quantity },
    });

    return jsonResponse({ success: true, item: updated });
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to update bag item', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const { id } = await params;
    const item = await db.bagItem.findUnique({
      where: { id },
      include: { bag: { select: { userId: true, status: true } } },
    });

    if (!item || item.bag.userId !== user.id || item.bag.status !== 'ACTIVE') {
      return jsonResponse({ error: 'Bag item not found' }, 404);
    }

    await db.bagItem.delete({ where: { id: item.id } });
    return jsonResponse({ success: true, message: 'Item removed from bag' });
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to remove bag item', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}
