import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const ITEM_GRADIENTS: Record<string, string> = {
  'streak-freeze': 'linear-gradient(135deg, #EAE3E8 0%, #D2B8C9 55%, #96788D 100%)',
  'title-lethal-weapon': 'linear-gradient(135deg, #F8E7BE 0%, #EED192 50%, #E4BE6B 100%)',
  'skin-lavender-holo': 'linear-gradient(135deg, #A78BFA 0%, #C084FC 50%, #F472B6 100%)',
  'skin-black-sheen': 'linear-gradient(135deg, #18181B 0%, #27272A 50%, #09090B 100%)',
  'frame-solar-flare': 'linear-gradient(135deg, #FB923C 0%, #F472B6 50%, #E879F9 100%)',
  'boost-aura-2x': 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)',
  'skin-velvet-rose': 'linear-gradient(135deg, #96788D 0%, #65475D 100%)',
  'skin-porcelain': 'linear-gradient(135deg, #FAF7F4 0%, #EBDCD5 100%)',
  'skin-champagne-silk': 'linear-gradient(135deg, #EBD9B2 0%, #BB9864 100%)',
  'skin-moonstone': 'linear-gradient(135deg, #E5E0EB 0%, #A3A7BD 100%)',
  'skin-obsidian-bloom': 'linear-gradient(135deg, #49313F 0%, #161116 100%)',
  'avatar-pearl-halo': 'linear-gradient(135deg, #D2B8C9 0%, #EBDCD5 100%)',
  'avatar-golden-hour': 'linear-gradient(135deg, #C0A36F 0%, #EBD9B2 100%)',
  'title-the-muse': 'linear-gradient(135deg, #F1E6ED 0%, #D2B8C9 100%)',
  'title-the-icon': 'linear-gradient(135deg, #EBD9B2 0%, #C0A36F 100%)',
  'nameplate-signature': 'linear-gradient(135deg, #EBDCD5 0%, #96788D 100%)',
  'bg-editorial-backdrop': 'linear-gradient(135deg, #251E24 0%, #70546C 100%)',
  'gift-a-rose': 'linear-gradient(135deg, #F7E9F0 0%, #96788D 100%)',
  'gift-admiration': 'linear-gradient(135deg, #EBDCD5 0%, #D2B8C9 100%)',
  'gift-standing-ovation': 'linear-gradient(135deg, #EBD9B2 0%, #96788D 100%)',
  'gift-golden-crown': 'linear-gradient(135deg, #F8E7BE 0%, #C0A36F 100%)',
  'gift-bouquet': 'linear-gradient(135deg, #F1E6ED 0%, #70546C 100%)',
  'share-studio-pass': 'linear-gradient(135deg, #EBDCD5 0%, #C0A36F 100%)',
  'studio-pass': 'linear-gradient(135deg, #251E24 0%, #96788D 100%)',
  'arena-grand-entrance': 'linear-gradient(135deg, #EBD9B2 0%, #65475D 100%)',
  'arena-victory-bloom': 'linear-gradient(135deg, #F7E9F0 0%, #96788D 100%)',
  'arena-midnight-entrance': 'linear-gradient(135deg, #161116 0%, #49313F 100%)',
  'arena-victory-portrait': 'linear-gradient(135deg, #EBDCD5 0%, #70546C 100%)',
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
