import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getStaffSessionUser } from '@/lib/admin/auth';

export async function GET() {
  const staff = await getStaffSessionUser();
  if (!staff) {
    return NextResponse.json({ error: 'Staff authentication required' }, { status: 401 });
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeUsers30d,
    totalScans,
    paidOrdersAgg,
    openTickets,
    tierCounts,
    lowStockCount,
    ordersAwaitingFulfilment,
    openAbuseFlags,
    pendingApprovals,
  ] = await Promise.all([
    db.user.count({ where: { status: { not: 'DELETED' } } }),
    db.scan.groupBy({ by: ['userId'], where: { createdAt: { gte: thirtyDaysAgo } } }).then((r) => r.length),
    db.scan.count(),
    db.order.aggregate({
      where: { paymentStatus: 'PAID' },
      _count: { id: true },
      _sum: { totalMinor: true },
    }),
    db.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    db.user.groupBy({
      by: ['tier'],
      where: { status: { not: 'DELETED' } },
      _count: { id: true },
    }),
    db.inventoryLevel.count({ where: { onHand: { lte: 5 } } }),
    db.order.count({ where: { paymentStatus: 'PAID', fulfilmentStatus: 'UNFULFILLED' } }),
    db.abuseFlag.count({ where: { reviewedAt: null } }),
    db.approvalRequest.count({ where: { status: 'PENDING' } }),
  ]);

  return NextResponse.json({
    success: true,
    metrics: {
      totalUsers,
      activeUsers30d,
      totalScans,
      paidOrdersCount: paidOrdersAgg._count.id,
      atelierRevenueMinor: Number(paidOrdersAgg._sum.totalMinor ?? 0),
      openTickets,
      tierDistribution: tierCounts.map((t) => ({ tier: t.tier, count: t._count.id })),
    },
    requiresAttention: {
      lowStockProducts: lowStockCount,
      ordersAwaitingFulfilment,
      suspiciousScanFlags: openAbuseFlags,
      pendingApprovals,
      openSupportTickets: openTickets,
    },
  });
}
