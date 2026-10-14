import { NextResponse } from 'next/server';
import { reconcileLedger } from '@/lib/ledger';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const firstUser = await db.user.findFirst({ select: { id: true } });
    if (!firstUser) {
      return NextResponse.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        message: 'No users in database to reconcile',
      });
    }

    const result = await reconcileLedger(firstUser.id);

    return NextResponse.json({
      status: result.reconciled ? 'healthy' : 'drift_detected',
      timestamp: new Date().toISOString(),
      userId: firstUser.id,
      audit: {
        cachedLifetime: result.cachedLifetime,
        calculatedLifetime: result.calculatedLifetime,
        cachedSpendable: result.cachedSpendable,
        calculatedSpendable: result.calculatedSpendable,
        drift: result.drift,
      },
      actionTaken: result.reconciled ? 'none_needed' : 'alert_triggered',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Reconcile failed', message: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    );
  }
}
