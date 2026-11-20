import { NextRequest, NextResponse } from 'next/server';
import { reconcileAllLedgers } from '@/lib/ledger';
import { reconcileArenaMatches } from '@/lib/faceoff';
import { releaseExpiredReservations } from '@/lib/atelier/orders';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get('authorization');
    const xCronSecret = req.headers.get('x-cron-secret');
    const providedSecret = authHeader?.replace(/^Bearer\s+/i, '') || xCronSecret;

    if (cronSecret && providedSecret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized cron request.' }, { status: 401 });
    }

    if (!cronSecret && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'CRON_SECRET not configured on server.' }, { status: 500 });
    }

    const { usersChecked, drifted } = await reconcileAllLedgers();
    const arenaReconciliation = await reconcileArenaMatches();
    const releasedReservationsCount = await releaseExpiredReservations();

    return NextResponse.json({
      status: drifted.length === 0 ? 'healthy' : 'drift_detected',
      timestamp: new Date().toISOString(),
      usersChecked,
      driftedCount: drifted.length,
      expiredWaitingCount: arenaReconciliation.expiredWaitingCount,
      arenaReconciliation,
      releasedReservationsCount,
      driftedUsers: drifted.slice(0, 50), // Cap payload if many drifted
      actionTaken: drifted.length === 0 ? 'none_needed' : 'alert_triggered',
    });
  } catch (error) {
    console.error('Ledger reconciliation error:', error);
    return NextResponse.json(
      { error: 'Reconciliation failed', message: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    );
  }
}
