import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { getStreakMultiplier, getLagosDayKey } from '@/lib/scoring';

export const dynamic = 'force-dynamic';

export interface FundingLedgerItem {
  id: string;
  scanNumber: number;
  thumbnail?: string;
  date: string;
  score: number;
  band: string;
  pointsEarned: number;
  multiplier: number;
  breakdown: string;
}

export interface SpendLedgerItem {
  id: string;
  title: string;
  category: string;
  date: string;
  pointsSpent: number;
  iconType: string;
  iconBg: string;
  note: string;
  status: string;
}

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.', authenticated: false },
        { status: 401 }
      );
    }
    const user = await db.user.findUnique({
      where: { id: sessionUser.id },
      include: {
        streak: true,
        scans: {
          orderBy: { createdAt: 'desc' },
        },
        purchases: {
          include: { item: true },
          orderBy: { createdAt: 'desc' },
        },
        ledgerEntries: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }

    const streakDays = user.streak?.currentCount ?? 0;
    const streakMultiplier = getStreakMultiplier(streakDays);
    const todayKey = getLagosDayKey();

    const todayScansCount = user.scans.filter((s) => s.dayKey === todayKey).length;
    const scansLeftToday = Math.max(0, 3 - todayScansCount);

    const fundingHistory: FundingLedgerItem[] = [];
    const spendsHistory: SpendLedgerItem[] = [];

    // Map real scans to funding history
    if (user.scans.length > 0) {
      user.scans.forEach((scan, idx) => {
        const dateStr = scan.createdAt.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });

        // Find corresponding ledger entry by exact refId or idempotency key
        const ledger = user.ledgerEntries.find(
          (le) =>
            le.type === 'SCAN' &&
            (le.refId === scan.id ||
              le.idempotencyKey === `scan:${scan.id}` ||
              Math.abs(le.createdAt.getTime() - scan.createdAt.getTime()) < 60000)
        );

        fundingHistory.push({
          id: scan.id,
          scanNumber: user.scans.length - idx,
          date: dateStr,
          score: scan.score,
          band: scan.band,
          pointsEarned: ledger ? ledger.amount : Math.round(scan.score * 5 * streakMultiplier),
          multiplier: streakMultiplier,
          breakdown: 'Vision Engine • Quality Verified',
        });
      });
    } else {
      // Check ledger for any initial scan entries
      user.ledgerEntries
        .filter((entry) => entry.type === 'SCAN' && entry.amount > 0 && entry.balanceKind === 'SPENDABLE')
        .forEach((entry, idx) => {
          fundingHistory.push({
            id: entry.id,
            scanNumber: idx + 1,
            date: entry.createdAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
            score: 0,
            band: 'HARMLESS',
            pointsEarned: entry.amount,
            multiplier: streakMultiplier,
            breakdown: 'Points Reward',
          });
        });
    }

    // Map real purchases to spends history
    if (user.purchases.length > 0) {
      user.purchases.forEach((p) => {
        const dateStr = p.createdAt.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });
        const isFreeze = p.item.slug === 'streak-freeze';

        spendsHistory.push({
          id: p.id,
          title: p.item.name,
          category: `Shop ${p.item.kind}`,
          date: dateStr,
          pointsSpent: p.price,
          iconType: isFreeze ? 'Snowflake' : 'Sparkles',
          iconBg: isFreeze
            ? 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400'
            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400',
          note: p.item.description || 'Equipped to Face Card branding',
          status: 'Completed',
        });
      });
    }

    // Also include FaceOff stake holds in spends if any
    user.ledgerEntries
      .filter((le) => le.type === 'FACEOFF_STAKE_HOLD' && le.amount < 0)
      .forEach((le) => {
        const dateStr = le.createdAt.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });
        spendsHistory.push({
          id: le.id,
          title: 'Arena Duel Stake Escrow',
          category: 'Arena Duel',
          date: dateStr,
          pointsSpent: Math.abs(le.amount),
          iconType: 'Swords',
          iconBg: 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400',
          note: 'Escrowed in duel prize pot',
          status: 'In Escrow',
        });
      });

    return NextResponse.json({
      success: true,
      spendableBalance: user.spendableBalance,
      lifetimePoints: user.lifetimePoints,
      scansLeftToday,
      maxScansPerDay: 3,
      resetTimeWat: '00:00 Africa/Lagos',
      streakDays,
      streakMultiplier,
      fundingHistory,
      spendsHistory,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch points ledger from database',
        message: error instanceof Error ? error.message : 'Error',
      },
      { status: 500 }
    );
  }
}
