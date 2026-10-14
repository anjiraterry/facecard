import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRequiredUser } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getRequiredUser();
    const { itemId, kind } = await req.json();

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID is required to equip' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: sessionUser.id },
      include: {
        items: true,
        cards: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }

    const ownsItem = user.items.some((ui) => ui.itemId === itemId);
    if (!ownsItem) {
      return NextResponse.json({ error: 'You must own this item before equipping it' }, { status: 403 });
    }

    const item = await db.shopItem.findUnique({
      where: { id: itemId },
    });

    const itemKind = kind || item?.kind;
    const card = user.cards[0];

    if (!card) {
      return NextResponse.json({ error: 'No active card found to equip item to' }, { status: 404 });
    }

    const updateData: {
      equippedTitleId?: string | null;
      equippedSkinId?: string | null;
      equippedFrameId?: string | null;
    } = {};

    if (itemKind === 'TITLE') {
      updateData.equippedTitleId = card.equippedTitleId === itemId ? null : itemId;
    } else if (itemKind === 'SKIN') {
      updateData.equippedSkinId = card.equippedSkinId === itemId ? null : itemId;
    } else if (itemKind === 'FRAME') {
      updateData.equippedFrameId = card.equippedFrameId === itemId ? null : itemId;
    } else {
      updateData.equippedTitleId = itemId;
    }

    const updatedCard = await db.card.update({
      where: { id: card.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: `Equipped item ${itemId} successfully`,
      equipped: {
        skin: updatedCard.equippedSkinId,
        title: updatedCard.equippedTitleId,
        frame: updatedCard.equippedFrameId,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to equip item in database', message: error instanceof Error ? error.message : 'Error' },
      { status: 400 }
    );
  }
}
