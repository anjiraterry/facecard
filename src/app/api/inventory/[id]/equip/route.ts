import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import type { EquipmentSlot } from '@prisma/client';

export const dynamic = 'force-dynamic';

function inferSlot(kind: string, explicitSlot?: EquipmentSlot | null): EquipmentSlot | null {
  if (explicitSlot) return explicitSlot;
  if (kind === 'SKIN') return 'CARD_SKIN';
  if (kind === 'FRAME') return 'CARD_FRAME';
  if (kind === 'TITLE') return 'PROFILE_TITLE';
  return null;
}

/**
 * POST /api/inventory/:id/equip
 * :id can be either UserItem.id or ShopItem.id.
 * Atomically replaces previous occupant of the slot without deleting or consuming it.
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
    const userItem = await db.userItem.findFirst({
      where: {
        userId: sessionUser.id,
        quantity: { gt: 0 },
        OR: [{ id }, { itemId: id }],
      },
      include: { item: true },
    });

    if (!userItem) {
      return NextResponse.json({ error: 'Owned item not found' }, { status: 404 });
    }

    const slot = inferSlot(userItem.item.kind, userItem.item.slot);
    if (!slot) {
      return NextResponse.json(
        { error: 'This item is not equipable in a slot.' },
        { status: 400 }
      );
    }

    const equipment = await db.$transaction(async (tx) => {
      const eq = await tx.userEquipment.upsert({
        where: { userId_slot: { userId: sessionUser.id, slot } },
        update: { userItemId: userItem.id, itemId: userItem.itemId, equippedAt: new Date() },
        create: {
          userId: sessionUser.id,
          slot,
          userItemId: userItem.id,
          itemId: userItem.itemId,
        },
      });

      // Keep Card columns synchronized for CARD_SKIN / CARD_FRAME / PROFILE_TITLE
      const card = await tx.card.findFirst({ where: { userId: sessionUser.id } });
      if (card) {
        if (slot === 'CARD_SKIN') {
          await tx.card.update({ where: { id: card.id }, data: { equippedSkinId: userItem.itemId } });
        } else if (slot === 'CARD_FRAME') {
          await tx.card.update({ where: { id: card.id }, data: { equippedFrameId: userItem.itemId } });
        } else if (slot === 'PROFILE_TITLE') {
          await tx.card.update({ where: { id: card.id }, data: { equippedTitleId: userItem.itemId } });
        }
      }

      return eq;
    });

    return NextResponse.json({ success: true, equipment, slot });
  } catch (error) {
    console.error('Inventory equip error:', error);
    return NextResponse.json({ error: 'Failed to equip item' }, { status: 500 });
  }
}
