import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireStaffPermission, StaffAuthError } from '@/lib/admin/auth';
import { runEconomySimulation } from '@/lib/boutique/economySimulation';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireStaffPermission('boutique.analytics.read');

    const [publishedCount, purchaseAgg, activeEffectsCount, giftsCount, topItems] = await Promise.all([
      db.shopItem.count({ where: { status: 'PUBLISHED', active: true } }),
      db.purchase.aggregate({ _sum: { price: true }, _count: { id: true } }),
      db.activeEffect.count({ where: { status: 'ACTIVE' } }),
      db.socialGift.count(),
      db.purchase.groupBy({
        by: ['itemId'],
        _sum: { price: true },
        _count: { id: true },
        orderBy: { _sum: { price: 'desc' } },
        take: 10,
      }),
    ]);

    const itemIds = topItems.map((t) => t.itemId);
    const items = itemIds.length
      ? await db.shopItem.findMany({ where: { id: { in: itemIds } }, select: { id: true, name: true, sku: true } })
      : [];
    const itemMap = new Map(items.map((i) => [i.id, i]));

    const simulation = runEconomySimulation(90);

    return NextResponse.json({
      success: true,
      metrics: {
        publishedItems: publishedCount,
        totalPurchases: purchaseAgg._count.id,
        pointsSpent: purchaseAgg._sum.price ?? 0,
        activeEffects: activeEffectsCount,
        giftsSent: giftsCount,
        topItems: topItems.map((t) => ({
          itemId: t.itemId,
          name: itemMap.get(t.itemId)?.name || t.itemId,
          sku: itemMap.get(t.itemId)?.sku || null,
          salesCount: t._count.id,
          pointsSpent: t._sum.price ?? 0,
        })),
      },
      simulation,
    });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to load Boutique analytics' }, { status: 500 });
  }
}
