import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const ITEM_GRADIENTS: Record<string, string> = {
  'streak-freeze': 'linear-gradient(135deg, #38BDF8 0%, #60A5FA 50%, #818CF8 100%)',
  'title-lethal-weapon': 'linear-gradient(135deg, #F8E7BE 0%, #EED192 50%, #E4BE6B 100%)',
  'skin-lavender-holo': 'linear-gradient(135deg, #A78BFA 0%, #C084FC 50%, #F472B6 100%)',
  'skin-black-sheen': 'linear-gradient(135deg, #18181B 0%, #27272A 50%, #09090B 100%)',
  'frame-solar-flare': 'linear-gradient(135deg, #FB923C 0%, #F472B6 50%, #E879F9 100%)',
  'boost-aura-2x': 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)',
};

export const CATEGORY_LABELS: Record<string, string> = {
  CONSUMABLE: 'Perk',
  TITLE: 'Title',
  SKIN: 'Card Skin',
  FRAME: 'Foil Frame',
  BADGE: 'Badge',
  FEATURE: 'Feature',
};

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
