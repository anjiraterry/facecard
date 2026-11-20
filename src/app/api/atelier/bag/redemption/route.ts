import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { jsonResponse, toJsonSafe } from '@/lib/atelier/serialize';
import { getOrCreateActiveBag } from '@/lib/atelier/orders';
import {
  calculateRedemptionQuote,
  getActiveRedemptionPolicy,
  getAvailablePointsForRedemption,
  getLagosPeriodKey,
  releaseExpiredPointsReservations,
} from '@/lib/atelier/redemption';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return jsonResponse({ error: 'Unauthorized' }, 401);

    await releaseExpiredPointsReservations(sessionUser.id);
    const body = await req.json().catch(() => ({}));
    const requestedPoints =
      typeof body.points === 'number' && Number.isInteger(body.points) && body.points > 0
        ? body.points
        : undefined;

    const periodKey = getLagosPeriodKey();
    const [user, bag, policy, allowance, pointsAvail] = await Promise.all([
      db.user.findUnique({ where: { id: sessionUser.id }, select: { tier: true } }),
      getOrCreateActiveBag(sessionUser.id),
      getActiveRedemptionPolicy(),
      db.redemptionAllowance.findUnique({
        where: { userId_periodKey: { userId: sessionUser.id, periodKey } },
      }),
      getAvailablePointsForRedemption(db, sessionUser.id),
    ]);

    if (!user) return jsonResponse({ error: 'User not found' }, 404);
    if (bag.items.length === 0) return jsonResponse({ error: 'Your Atelier bag is empty' }, 400);

    const productRules = await db.productRedemptionRule.findMany({
      where: { variantId: { in: bag.items.map((i) => i.variantId) } },
    });
    const ruleByVariant = new Map(productRules.map((r) => [r.variantId, r]));

    const quote = calculateRedemptionQuote({
      policy,
      tier: user.tier,
      availableSpendablePoints: pointsAvail.availablePoints,
      alreadyCommittedMinor: allowance?.committedAmountMinor ?? BigInt(0),
      alreadyReservedMinor: allowance?.reservedAmountMinor ?? BigInt(0),
      alreadyCommittedCount: allowance?.committedCount ?? 0,
      alreadyReservedCount: allowance?.reservedCount ?? 0,
      items: bag.items.map((i) => ({
        variantId: i.variantId,
        quantity: i.quantity,
        unitPriceMinor: i.variant.priceMinor,
        costPriceMinor: i.variant.costPriceMinor,
        hasActivePromotion:
          i.variant.compareAtPriceMinor != null && i.variant.compareAtPriceMinor > i.variant.priceMinor,
        rule: ruleByVariant.get(i.variantId) ?? null,
      })),
      requestedPoints,
      periodKey,
    });

    if (!quote.eligible || quote.appliedPoints <= 0) {
      return jsonResponse(toJsonSafe({ error: quote.reason || 'Redemption not eligible', quote }), 400);
    }

    await db.shoppingBag.update({
      where: { id: bag.id },
      data: { pendingPointsToRedeem: quote.appliedPoints, version: { increment: 1 } },
    });

    return jsonResponse(
      toJsonSafe({
        success: true,
        appliedPoints: quote.appliedPoints,
        appliedDiscountMinor: quote.appliedDiscountMinor,
        quote,
      })
    );
  } catch (error) {
    console.error('Apply bag redemption error:', error);
    return jsonResponse({ error: 'Failed to apply points redemption to bag' }, 500);
  }
}

export async function DELETE() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return jsonResponse({ error: 'Unauthorized' }, 401);

    const bag = await getOrCreateActiveBag(sessionUser.id);
    await db.shoppingBag.update({
      where: { id: bag.id },
      data: { pendingPointsToRedeem: 0, version: { increment: 1 } },
    });

    return jsonResponse({ success: true, appliedPoints: 0 });
  } catch (error) {
    console.error('Remove bag redemption error:', error);
    return jsonResponse({ error: 'Failed to remove points redemption from bag' }, 500);
  }
}
