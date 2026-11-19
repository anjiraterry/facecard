import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/**
 * GET /api/inventory
 * Returns user's Vanity: owned items, equipped slots, active/expired effects, and history.
 */
export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    // Auto-reconcile any timed effects whose server-clock expiresAt has passed
    await db.activeEffect.updateMany({
      where: {
        userId: sessionUser.id,
        status: 'ACTIVE',
        expiresAt: { lte: now },
      },
      data: {
        status: 'EXPIRED',
        terminalReason: 'DURATION_EXHAUSTED',
        endedAt: now,
      },
    });

    const [items, equipment, activeEffects, movements, collections] = await Promise.all([
      db.userItem.findMany({
        where: { userId: sessionUser.id, quantity: { gt: 0 } },
        include: { item: true },
        orderBy: { acquiredAt: 'desc' },
      }),
      db.userEquipment.findMany({
        where: { userId: sessionUser.id },
        include: { item: true },
      }),
      db.activeEffect.findMany({
        where: { userId: sessionUser.id },
        include: {
          item: true,
          executions: { orderBy: { executedAt: 'desc' }, take: 5 },
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      db.userItemMovement.findMany({
        where: { userId: sessionUser.id },
        include: { item: { select: { name: true, slug: true } } },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      db.shopCollection.findMany({
        where: { status: 'PUBLISHED' },
        include: {
          items: { include: { item: { select: { id: true, name: true, slug: true, price: true } } } },
        },
      }),
    ]);

    const ownedItemIds = new Set(items.map((ui) => ui.itemId));
    const equippedItemIds = new Set(equipment.map((eq) => eq.itemId));

    const collectionProgress = collections.map((col) => {
      const total = col.items.length;
      const ownedCount = col.items.filter((ci) => ownedItemIds.has(ci.itemId)).length;
      return {
        id: col.id,
        slug: col.slug,
        name: col.name,
        description: col.description,
        total,
        ownedCount,
        completed: total > 0 && ownedCount >= total,
        items: col.items.map((ci) => ({
          ...ci.item,
          owned: ownedItemIds.has(ci.itemId),
        })),
      };
    });

    return NextResponse.json({
      success: true,
      ownedItems: items.map((ui) => ({
        id: ui.id,
        itemId: ui.itemId,
        quantity: ui.quantity,
        acquiredAt: ui.acquiredAt,
        isEquipped: equippedItemIds.has(ui.itemId),
        item: ui.item,
      })),
      equipment,
      activeEffects,
      movements,
      collectionProgress,
    });
  } catch (error) {
    console.error('Inventory GET error:', error);
    return NextResponse.json({ error: 'Failed to load Vanity inventory' }, { status: 500 });
  }
}
