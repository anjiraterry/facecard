import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

import { getStreakMultiplier } from '@/lib/scoring';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const scan = await db.scan.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            streak: true,
            ledgerEntries: {
              where: { type: 'SCAN', balanceKind: 'SPENDABLE' },
            },
          },
        },
      },
    });

    if (!scan) {
      return NextResponse.json({ error: 'Scan not found in database' }, { status: 404 });
    }

    const categoryScores = scan.categoryScores ?? null;
    const streakDays = scan.user?.streak?.currentCount ?? 0;
    const multiplier = getStreakMultiplier(streakDays);

    const ledger = scan.user?.ledgerEntries.find(
      (le) => le.refId === scan.id || Math.abs(le.createdAt.getTime() - scan.createdAt.getTime()) < 15000
    );
    const pointsEarned = ledger ? ledger.amount : Math.round(scan.score * 5 * multiplier);

    const verdictLine = scan.score >= 90
      ? 'Golden standard. Your face card is certified lethal.'
      : scan.score >= 80
      ? 'High-impact aura. Verified dangerous.'
      : scan.score >= 65
      ? 'Solid presence with authentic facial symmetry.'
      : 'Harmless profile. Keep building your aesthetic discipline.';

    return NextResponse.json({
      success: true,
      scan: {
        id: scan.id,
        score: scan.score,
        band: scan.band,
        verdictLine,
        categoryScores,
        pointsEarned,
        multiplier,
        scanIndexOfDay: scan.scanIndexOfDay,
        evaluatedAt: scan.createdAt.toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Scan not found in database', message: error instanceof Error ? error.message : 'Error' },
      { status: 404 }
    );
  }
}
