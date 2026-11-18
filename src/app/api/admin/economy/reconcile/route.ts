import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  recordStaffAuditLog,
  requireStaffPermission,
  StaffAuthError,
} from '@/lib/admin/auth';
import { reconcileAllLedgers } from '@/lib/ledger';

export async function GET() {
  try {
    const staff = await requireStaffPermission('economy.reconcile');
    const report = await reconcileAllLedgers();

    const recentEntries = await db.pointsLedger.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        userId: true,
        type: true,
        amount: true,
        balanceKind: true,
        refType: true,
        refId: true,
        createdAt: true,
      },
    });

    await recordStaffAuditLog({
      staffUserId: staff.id,
      action: 'ECONOMY_RECONCILE_RUN',
      targetType: 'POINTS_LEDGER',
      detail: { usersChecked: report.usersChecked, driftedCount: report.drifted.length },
    });

    return NextResponse.json({
      success: true,
      report,
      recentEntries,
    });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to run reconciliation' }, { status: 500 });
  }
}
