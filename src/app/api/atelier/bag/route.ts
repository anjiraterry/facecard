import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { getOrCreateActiveBag } from '@/lib/atelier/orders';
import { jsonResponse } from '@/lib/atelier/serialize';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const bag = await getOrCreateActiveBag(user.id);
    let subtotalMinor = BigInt(0);

    const items = bag.items.map((item) => {
      const availableStock = item.variant.inventoryLevels.reduce(
        (acc, lvl) => acc + Math.max(0, lvl.onHand - lvl.reserved),
        0
      );
      const lineTotalMinor = item.variant.priceMinor * BigInt(item.quantity);
      subtotalMinor += lineTotalMinor;
      return {
        id: item.id,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPriceMinor: item.variant.priceMinor,
        lineTotalMinor,
        currency: item.variant.currency,
        availableStock,
        inStock: availableStock >= item.quantity,
        variant: {
          id: item.variant.id,
          sku: item.variant.sku,
          name: item.variant.name,
          sizeLabel: item.variant.sizeLabel,
          product: {
            id: item.variant.product.id,
            slug: item.variant.product.slug,
            name: item.variant.product.name,
            brandName: item.variant.product.brand.name,
            imageKey: item.variant.product.images[0]?.objectKey ?? null,
          },
        },
      };
    });

    return jsonResponse({
      success: true,
      bag: {
        id: bag.id,
        currency: bag.currency,
        subtotalMinor,
        itemCount: items.reduce((acc, i) => acc + i.quantity, 0),
        items,
      },
    });
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to load shopping bag', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}

export async function DELETE() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const bag = await db.shoppingBag.findFirst({
      where: { userId: user.id, status: 'ACTIVE' },
      select: { id: true },
    });

    if (bag) {
      await db.bagItem.deleteMany({ where: { bagId: bag.id } });
    }

    return jsonResponse({ success: true, message: 'Shopping bag cleared' });
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to clear shopping bag', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}
