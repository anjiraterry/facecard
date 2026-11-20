import { db } from '@/lib/db';
import { requireStaffPermission } from '@/lib/admin/auth';
import { jsonResponse, toJsonSafe } from '@/lib/atelier/serialize';
import { getActiveRedemptionPolicy, getLagosPeriodKey } from '@/lib/atelier/redemption';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireStaffPermission('atelier.read');
    const periodKey = getLagosPeriodKey();
    const policy = await getActiveRedemptionPolicy();

    const [totals, periodTotals, refunds, activeReservations] = await Promise.all([
      db.pointsRedemption.aggregate({
        _count: { id: true },
        _sum: { points: true, discountMinor: true },
      }),
      db.pointsRedemption.aggregate({
        where: { periodKey },
        _count: { id: true },
        _sum: { points: true, discountMinor: true },
      }),
      db.redemptionRefund.aggregate({
        _count: { id: true },
        _sum: { restoredPoints: true, restoredDiscountMinor: true, restoredCashMinor: true },
      }),
      db.pointsReservation.aggregate({
        where: { status: 'ACTIVE', expiresAt: { gt: new Date() } },
        _count: { id: true },
        _sum: { points: true, discountMinor: true },
      }),
    ]);

    return jsonResponse(
      toJsonSafe({
        success: true,
        periodKey,
        policy,
        analytics: {
          totalRedemptions: totals._count.id,
          totalPointsRedeemed: totals._sum.points ?? 0,
          totalDiscountCostMinor: totals._sum.discountMinor ?? BigInt(0),
          periodRedemptions: periodTotals._count.id,
          periodPointsRedeemed: periodTotals._sum.points ?? 0,
          periodDiscountCostMinor: periodTotals._sum.discountMinor ?? BigInt(0),
          totalRefunds: refunds._count.id,
          totalRestoredPoints: refunds._sum.restoredPoints ?? 0,
          totalRestoredDiscountMinor: refunds._sum.restoredDiscountMinor ?? BigInt(0),
          activeReservationsCount: activeReservations._count.id,
          activeReservedPoints: activeReservations._sum.points ?? 0,
          activeReservedDiscountMinor: activeReservations._sum.discountMinor ?? BigInt(0),
        },
      })
    );
  } catch (error) {
    console.error('Admin redemption analytics error:', error);
    return jsonResponse({ error: 'Failed to load redemption analytics' }, 500);
  }
}
