import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { jsonResponse } from '@/lib/atelier/serialize';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const product = await db.atelierProduct.findFirst({
      where: { slug, status: 'PUBLISHED' },
      include: {
        brand: { select: { id: true, slug: true, name: true, country: true } },
        category: { select: { id: true, slug: true, name: true } },
        images: { orderBy: { sortOrder: 'asc' } },
        ingredients: { include: { ingredient: true } },
        concerns: { include: { concern: true } },
        skinTypes: true,
        variants: {
          where: { isActive: true },
          orderBy: { priceMinor: 'asc' },
          select: {
            id: true,
            sku: true,
            barcode: true,
            name: true,
            sizeLabel: true,
            volumeMl: true,
            weightGrams: true,
            priceMinor: true,
            compareAtPriceMinor: true,
            currency: true,
            inventoryLevels: { select: { onHand: true, reserved: true } },
          },
        },
      },
    });

    if (!product) {
      return jsonResponse({ error: 'Product not found' }, 404);
    }

    const variants = product.variants.map((v) => {
      const available = v.inventoryLevels.reduce((acc, lvl) => acc + Math.max(0, lvl.onHand - lvl.reserved), 0);
      const { inventoryLevels: _levels, ...rest } = v;
      return { ...rest, availableStock: available, inStock: available > 0 };
    });

    return jsonResponse({
      success: true,
      product: { ...product, variants },
    });
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to load product', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}
