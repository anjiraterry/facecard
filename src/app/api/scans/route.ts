import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';

import { getStreakMultiplier } from '@/lib/scoring';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.', authenticated: false }, { status: 401 });
    }
    const user = await db.user.findUnique({
      where: { id: sessionUser.id },
      include: {
        scans: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        streak: true,
        ledgerEntries: {
          where: { type: 'SCAN', balanceKind: 'SPENDABLE' },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }

    const currentStreak = user.streak?.currentCount ?? 0;
    const multiplier = getStreakMultiplier(currentStreak);

    const scansFormatted = user.scans.map((s) => {
      const ledger = user.ledgerEntries.find(
        (le) => le.refId === s.id || Math.abs(le.createdAt.getTime() - s.createdAt.getTime()) < 15000
      );
      const pointsEarned = ledger ? ledger.amount : Math.round(s.score * 5);

      return {
        id: s.id,
        score: s.score,
        band: s.band,
        scanIndexOfDay: s.scanIndexOfDay,
        pointsEarned,
        multiplier,
        streakDays: currentStreak,
        evaluatedAt: s.createdAt.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }),
        tips: s.score >= 85
          ? ['Elite structural harmony and commanding gaze detected.']
          : ['Enhance direct softbox lighting and chin level for higher lethality score.'],
      };
    });

    return NextResponse.json({
      success: true,
      scans: scansFormatted,
      total: scansFormatted.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch scans from database', message: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    );
  }
}
