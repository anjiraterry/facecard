import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/**
 * POST /api/inventory/:id/unequip
 * :id can be UserItem.id, ShopItem.id, or EquipmentSlot.
 * Unequips without deleting ownership.
 */
export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const eq = await db.userEquipment.findFirst({
      where: {
        userId: sessionUser.id,
        OR: [{ userItemId: id }, { itemId: id }],
      },
    });

    if (!eq) {
      return NextResponse.json({ error: 'Equipped item not found' }, { status: 404 });
    }

    await db.$transaction(async (tx) => {
      await tx.userEquipment.delete({ where: { id: eq.id } });

      const card = await tx.card.findFirst({ where: { userId: sessionUser.id } });
      if (card) {
        if (eq.slot === 'CARD_SKIN' && card.equippedSkinId === eq.itemId) {
          await tx.card.update({ where: { id: card.id }, data: { equippedSkinId: null } });
        } else if (eq.slot === 'CARD_FRAME' && card.equippedFrameId === eq.itemId) {
          await tx.card.update({ where: { id: card.id }, data: { equippedFrameId: null } });
        } else if (eq.slot === 'PROFILE_TITLE' && card.equippedTitleId === eq.itemId) {
          await tx.card.update({ where: { id: card.id }, data: { equippedTitleId: null } });
        }
      }
    });

    return NextResponse.json({ success: true, unequippedSlot: eq.slot });
  } catch (error) {
    console.error('Inventory unequip error:', error);
    return NextResponse.json({ error: 'Failed to unequip item' }, { status: 500 });
  }
}
