import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { CATEGORY_LABELS, ITEM_GRADIENTS } from '@/lib/shop/constants';

export async function GET() {
  try {
    const items = await db.shopItem.findMany({
      where: { active: true },
      orderBy: { price: 'asc' },
    });

    const formatted = items.map((item) => ({
      ...item,
      categoryLabel: CATEGORY_LABELS[item.kind] || item.kind,
      gradient: ITEM_GRADIENTS[item.slug] || ITEM_GRADIENTS[item.id] || 'linear-gradient(135deg, #6366F1 0%, #A855F7 100%)',
    }));

    return NextResponse.json({
      success: true,
      items: formatted,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch items from database', message: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    );
  }
}
