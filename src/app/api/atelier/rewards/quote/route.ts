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
      typeof body.requestedPoints === 'number' && Number.isInteger(body.requestedPoints) && body.requestedPoints >= 0
        ? body.requestedPoints
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
      requestedPoints: requestedPoints ?? (bag.pendingPointsToRedeem > 0 ? bag.pendingPointsToRedeem : undefined),
      periodKey,
    });

    return jsonResponse(toJsonSafe({ success: true, quote, pendingPointsToRedeem: bag.pendingPointsToRedeem }));
  } catch (error) {
    console.error('Atelier rewards quote error:', error);
    return jsonResponse({ error: 'Failed to compute Atelier redemption quote' }, 500);
  }
}
