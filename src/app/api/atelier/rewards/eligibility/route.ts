import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { jsonResponse, toJsonSafe } from '@/lib/atelier/serialize';
import {
  getActiveRedemptionPolicy,
  getAvailablePointsForRedemption,
  getLagosPeriodKey,
  releaseExpiredPointsReservations,
} from '@/lib/atelier/redemption';
import { Tier } from '@prisma/client';

export const dynamic = 'force-dynamic';

const TIER_RANK: Record<Tier, number> = { CLASSIC: 0, GOLD: 1, PLATINUM: 2, BLACK: 3 };

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return jsonResponse({ error: 'Unauthorized' }, 401);

    await releaseExpiredPointsReservations(sessionUser.id);
    const periodKey = getLagosPeriodKey();

    const [user, policy, allowance, pointsAvail] = await Promise.all([
      db.user.findUnique({ where: { id: sessionUser.id }, select: { tier: true } }),
      getActiveRedemptionPolicy(),
      db.redemptionAllowance.findUnique({
        where: { userId_periodKey: { userId: sessionUser.id, periodKey } },
      }),
      getAvailablePointsForRedemption(db, sessionUser.id),
    ]);

    if (!user) return jsonResponse({ error: 'User not found' }, 404);

    const rule = policy.tierRules[user.tier];
    const eligible =
      !policy.emergencyPaused &&
      TIER_RANK[user.tier] >= TIER_RANK[policy.minimumTier] &&
      rule.enabled;

    const usedMinor = (allowance?.committedAmountMinor ?? BigInt(0)) + (allowance?.reservedAmountMinor ?? BigInt(0));
    const remainingMonthlyAllowanceMinor =
      rule.monthlyCapMinor > usedMinor ? rule.monthlyCapMinor - usedMinor : BigInt(0);
    const usedCount = (allowance?.committedCount ?? 0) + (allowance?.reservedCount ?? 0);
    const remainingMonthlyCount = Math.max(0, rule.frequencyLimit - usedCount);

    return jsonResponse(
      toJsonSafe({
        success: true,
        eligible,
        tier: user.tier,
        minimumTier: policy.minimumTier,
        emergencyPaused: policy.emergencyPaused,
        periodKey,
        spendableBalance: pointsAvail.spendableBalance,
        reservedPoints: pointsAvail.reservedPoints,
        availablePoints: pointsAvail.availablePoints,
        policy: {
          version: policy.version,
          pointsPerUnit: policy.pointsPerUnit,
          valuePerUnitMinor: policy.valuePerUnitMinor,
          minimumSubtotalMinor: policy.minimumSubtotalMinor,
          maxDiscountBps: rule.maxDiscountBps,
          perOrderCapMinor: rule.perOrderCapMinor,
          monthlyCapMinor: rule.monthlyCapMinor,
          frequencyLimit: rule.frequencyLimit,
        },
        allowance: {
          usedMinor,
          remainingMonthlyAllowanceMinor,
          usedCount,
          remainingMonthlyCount,
        },
      })
    );
  } catch (error) {
    console.error('Atelier rewards eligibility error:', error);
    return jsonResponse({ error: 'Failed to load Atelier rewards eligibility' }, 500);
  }
}
