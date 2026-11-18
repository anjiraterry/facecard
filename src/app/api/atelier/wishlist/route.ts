import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { jsonResponse } from '@/lib/atelier/serialize';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const items = await db.wishlistItem.findMany({
      where: { userId: user.id },
      include: {
        product: {
          include: {
            brand: { select: { name: true, slug: true } },
            images: { where: { isPrimary: true }, take: 1 },
            variants: {
              where: { isActive: true },
              orderBy: { priceMinor: 'asc' },
              take: 1,
              select: { id: true, priceMinor: true, currency: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return jsonResponse({ success: true, items });
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to fetch wishlist', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const productId = typeof body.productId === 'string' ? body.productId.trim() : '';
    if (!productId) return jsonResponse({ error: 'productId is required' }, 400);

    const product = await db.atelierProduct.findFirst({
      where: { id: productId, status: 'PUBLISHED' },
      select: { id: true },
    });
    if (!product) return jsonResponse({ error: 'Product not found' }, 404);

    const saved = await db.wishlistItem.upsert({
      where: { userId_productId: { userId: user.id, productId } },
      update: {},
      create: { userId: user.id, productId },
    });

    return jsonResponse({ success: true, item: saved }, 201);
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to save to wishlist', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}
