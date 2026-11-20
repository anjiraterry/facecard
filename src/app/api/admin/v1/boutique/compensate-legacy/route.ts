import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireStaffPermission } from '@/lib/admin/auth';
import { postLedger } from '@/lib/ledger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/v1/boutique/compensate-legacy
 * Retires a non-functional legacy item (e.g. boost-aura-2x) and issues an idempotent
 * BOUTIQUE_REFUND points compensation to affected purchasers.
 */
export async function POST(req: NextRequest) {
  try {
    const staff = await requireStaffPermission('boutique.items.retire');
    const body = await req.json().catch(() => ({}));
    const slug = typeof body.slug === 'string' && body.slug.trim() ? body.slug.trim() : 'boost-aura-2x';

    const item = await db.shopItem.findUnique({ where: { slug } });
    if (!item) {
      return NextResponse.json({ error: `Item ${slug} not found` }, { status: 404 });
    }

    const userItems = await db.userItem.findMany({
      where: { itemId: item.id, quantity: { gt: 0 } },
    });

    let compensatedUsers = 0;
    let totalPointsRefunded = 0;

    await db.$transaction(async (tx) => {
      await tx.shopItem.update({
        where: { id: item.id },
        data: { status: 'RETIRED', active: false },
      });

      for (const ui of userItems) {
        const refundAmount = ui.quantity * item.price;
        if (refundAmount <= 0) continue;

        await postLedger(tx, {
          userId: ui.userId,
          type: 'BOUTIQUE_REFUND',
          amount: refundAmount,
          balanceKind: 'SPENDABLE',
          refType: 'LEGACY_ITEM_COMPENSATION',
          refId: `${item.id}:${ui.userId}`,
          idempotencyKey: `legacy-comp:${item.id}:${ui.userId}`,
        });

        await tx.userItem.update({
          where: { id: ui.id },
          data: { quantity: 0 },
        });

        await tx.userItemMovement.create({
          data: {
            userId: ui.userId,
            userItemId: ui.id,
            itemId: item.id,
            quantityDelta: -ui.quantity,
            reason: 'LEGACY_COMPENSATION_REFUND',
            referenceId: staff.id,
          },
        });

        compensatedUsers += 1;
        totalPointsRefunded += refundAmount;
      }
    });

    return NextResponse.json({
      success: true,
      slug,
      retired: true,
      compensatedUsers,
      totalPointsRefunded,
    });
  } catch (error) {
    console.error('Compensate legacy item error:', error);
    return NextResponse.json({ error: 'Failed to compensate legacy item' }, { status: 500 });
  }
}
