import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireStaffPermission } from '@/lib/admin/auth';
import { jsonResponse, toJsonSafe } from '@/lib/atelier/serialize';
import { calculateRedemptionQuote, DEFAULT_TIER_RULES, type RedemptionPolicySnapshot } from '@/lib/atelier/redemption';
import { Tier } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/v1/atelier/redemption-policies/:id/validate
 * Simulates the policy against representative product cost & price configurations.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireStaffPermission('economy.read');
    const { id } = await context.params;
    const policy = await db.redemptionPolicyVersion.findUnique({
      where: { id },
      include: { tierRules: true },
    });
    if (!policy) return jsonResponse({ error: 'Policy version not found' }, 404);

    const body = await req.json().catch(() => ({}));
    const basketSubtotalMinor = BigInt(typeof body.subtotalMinor === 'number' ? Math.round(body.subtotalMinor) : 2500000); // ₦25,000
    const costPriceMinor = BigInt(typeof body.costPriceMinor === 'number' ? Math.round(body.costPriceMinor) : 1700000); // ₦17,000
    const spendablePoints = typeof body.spendablePoints === 'number' ? Math.round(body.spendablePoints) : 6000;
    const tier = (['CLASSIC', 'GOLD', 'PLATINUM', 'BLACK'].includes(body.tier) ? body.tier : 'PLATINUM') as Tier;

    const tierRules = { ...DEFAULT_TIER_RULES };
    for (const r of policy.tierRules) {
      tierRules[r.tier] = {
        tier: r.tier,
        enabled: r.enabled,
        maxDiscountBps: r.maxDiscountBps,
        minimumSubtotalMinor: r.minimumSubtotalMinor ?? DEFAULT_TIER_RULES[r.tier].minimumSubtotalMinor,
        perOrderCapMinor: r.perOrderCapMinor,
        monthlyCapMinor: r.monthlyCapMinor,
        frequencyLimit: r.frequencyLimit,
      };
    }

    const snapshot: RedemptionPolicySnapshot = {
      id: policy.id,
      version: policy.version,
      minimumTier: policy.minimumTier,
      pointsPerUnit: policy.pointsPerUnit,
      valuePerUnitMinor: policy.valuePerUnitMinor,
      minimumSubtotalMinor: policy.minimumSubtotalMinor,
      marginFloorBps: policy.marginFloorBps,
      processingFeeBps: policy.processingFeeBps,
      processingFeeFlatMinor: policy.processingFeeFlatMinor,
      allowPromoStacking: policy.allowPromoStacking,
      programmeBudgetMinor: policy.programmeBudgetMinor,
      programmeSpentMinor: policy.programmeSpentMinor,
      emergencyPaused: policy.emergencyPaused,
      tierRules,
    };

    const quote = calculateRedemptionQuote({
      policy: snapshot,
      tier,
      availableSpendablePoints: spendablePoints,
      alreadyCommittedMinor: BigInt(0),
      alreadyReservedMinor: BigInt(0),
      alreadyCommittedCount: 0,
      alreadyReservedCount: 0,
      items: [
        {
          variantId: 'sim-variant',
          quantity: 1,
          unitPriceMinor: basketSubtotalMinor,
          costPriceMinor,
        },
      ],
      periodKey: 'SIMULATION',
    });

    const customerPaysMinor = basketSubtotalMinor - quote.appliedDiscountMinor;
    const processingFeeMinor =
      (basketSubtotalMinor * BigInt(policy.processingFeeBps)) / BigInt(10000) + policy.processingFeeFlatMinor;
    const remainingContributionMinor = customerPaysMinor - costPriceMinor - processingFeeMinor;
    const postDiscountMarginBps =
      basketSubtotalMinor > BigInt(0)
        ? Number((remainingContributionMinor * BigInt(10000)) / basketSubtotalMinor)
        : 0;

    return jsonResponse(
      toJsonSafe({
        success: true,
        valid: postDiscountMarginBps >= policy.marginFloorBps || quote.appliedDiscountMinor === BigInt(0),
        simulation: {
          tier,
          basketSubtotalMinor,
          costPriceMinor,
          processingFeeMinor,
          quote,
          customerPaysMinor,
          remainingContributionMinor,
          postDiscountMarginBps,
        },
      })
    );
  } catch (error) {
    console.error('Validate redemption policy error:', error);
    return jsonResponse({ error: 'Failed to simulate redemption policy' }, 500);
  }
}
