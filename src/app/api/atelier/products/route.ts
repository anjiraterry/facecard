import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { jsonResponse } from '@/lib/atelier/serialize';
import { Prisma, SkinType } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim();
    const category = searchParams.get('category')?.trim();
    const brand = searchParams.get('brand')?.trim();
    const concern = searchParams.get('concern')?.trim();
    const skinType = searchParams.get('skinType')?.trim()?.toUpperCase();
    const featured = searchParams.get('featured') === 'true';
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || 20)));

    const where: Prisma.AtelierProductWhereInput = {
      status: 'PUBLISHED',
      ...(featured ? { featured: true } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { subtitle: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(category ? { category: { slug: category } } : {}),
      ...(brand ? { brand: { slug: brand } } : {}),
      ...(concern ? { concerns: { some: { concern: { slug: concern } } } } : {}),
      ...(skinType && Object.values(SkinType).includes(skinType as SkinType)
        ? { skinTypes: { some: { skinType: skinType as SkinType } } }
        : {}),
    };

    const [total, products] = await Promise.all([
      db.atelierProduct.count({ where }),
      db.atelierProduct.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
        include: {
          brand: { select: { id: true, slug: true, name: true } },
          category: { select: { id: true, slug: true, name: true } },
          images: { orderBy: { sortOrder: 'asc' }, take: 2 },
          variants: {
            where: { isActive: true },
            orderBy: { priceMinor: 'asc' },
            select: {
              id: true,
              sku: true,
              name: true,
              sizeLabel: true,
              volumeMl: true,
              priceMinor: true,
              compareAtPriceMinor: true,
              currency: true,
              inventoryLevels: { select: { onHand: true, reserved: true } },
            },
          },
        },
      }),
    ]);

    const items = products.map((p) => ({
      ...p,
      variants: p.variants.map((v) => {
        const available = v.inventoryLevels.reduce((acc, lvl) => acc + Math.max(0, lvl.onHand - lvl.reserved), 0);
        const { inventoryLevels: _levels, ...rest } = v;
        return { ...rest, availableStock: available, inStock: available > 0 };
      }),
    }));

    return jsonResponse({
      success: true,
      products: items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to load Atelier catalogue', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}
