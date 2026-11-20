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
    if (itemKind === 'CONSUMABLE') {
      return NextResponse.json(
        { error: 'Consumable perks are activated rather than equipped.' },
        { status: 400 }
      );
    }

    const slot =
      item?.slot ??
      (itemKind === 'SKIN'
        ? 'CARD_SKIN'
        : itemKind === 'FRAME'
        ? 'CARD_FRAME'
        : itemKind === 'TITLE'
        ? 'PROFILE_TITLE'
        : itemKind === 'BADGE'
        ? 'NAMEPLATE'
        : itemKind === 'FEATURE'
        ? 'PROFILE_BACKGROUND'
        : null);

    if (!slot) {
      return NextResponse.json({ error: 'This item cannot be equipped.' }, { status: 400 });
    }

    const card = user.cards[0];
    if (!card) {
      return NextResponse.json(
        { error: 'Please claim your Face Card first before equipping cosmetics.', requiresClaim: true },
        { status: 404 }
      );
    }

    const existingEq = await db.userEquipment.findUnique({
      where: { userId_slot: { userId: sessionUser.id, slot } },
    });
    const isUnequipping =
      existingEq?.itemId === itemId ||
      (slot === 'PROFILE_TITLE' && card.equippedTitleId === itemId) ||
      (slot === 'CARD_SKIN' && card.equippedSkinId === itemId) ||
      ((slot === 'CARD_FRAME' || slot === 'AVATAR_FRAME') && card.equippedFrameId === itemId);

    const updateData: {
      equippedTitleId?: string | null;
      equippedSkinId?: string | null;
      equippedFrameId?: string | null;
    } = {};

    if (slot === 'PROFILE_TITLE') {
      updateData.equippedTitleId = isUnequipping ? null : itemId;
    } else if (slot === 'CARD_SKIN') {
      updateData.equippedSkinId = isUnequipping ? null : itemId;
    } else if (slot === 'CARD_FRAME' || slot === 'AVATAR_FRAME') {
      updateData.equippedFrameId = isUnequipping ? null : itemId;
    }

    const updatedCard =
      Object.keys(updateData).length > 0
        ? await db.card.update({ where: { id: card.id }, data: updateData })
        : card;

    const ownedEntry = user.items.find((ui) => ui.itemId === itemId);
    if (!isUnequipping && ownedEntry) {
      await db.userEquipment.upsert({
        where: { userId_slot: { userId: sessionUser.id, slot } },
        update: { userItemId: ownedEntry.id, itemId, equippedAt: new Date() },
        create: {
          userId: sessionUser.id,
          slot,
          userItemId: ownedEntry.id,
          itemId,
        },
      });
    } else {
      await db.userEquipment.deleteMany({
        where: { userId: sessionUser.id, slot },
      });
    }

    return NextResponse.json({
      success: true,
      equippedNow: !isUnequipping,
      slot,
      message: isUnequipping ? 'Unequipped item' : `Equipped item ${itemId} successfully`,
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
