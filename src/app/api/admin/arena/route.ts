import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireStaffPermission, StaffAuthError } from '@/lib/admin/auth';
import { FaceOffStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireStaffPermission('economy.reconcile');

    const filter = req.nextUrl.searchParams.get('filter') || 'all';
    const now = new Date();

    const whereClause =
      filter === 'stale'
        ? {
            OR: [
              { status: { in: [FaceOffStatus.READY_TO_SETTLE, FaceOffStatus.SETTLING] } },
              {
                status: { in: [FaceOffStatus.WAITING, FaceOffStatus.ACTIVE, FaceOffStatus.TIE_REMATCH] },
                expiresAt: { lte: now },
              },
              { lastSettlementError: { not: null } },
            ],
          }
        : filter === 'active'
        ? { status: { in: [FaceOffStatus.ACTIVE, FaceOffStatus.TIE_REMATCH, FaceOffStatus.READY_TO_SETTLE, FaceOffStatus.SETTLING] } }
        : filter === 'waiting'
        ? { status: FaceOffStatus.WAITING }
        : {};

    const matches = await db.faceOff.findMany({
      where: whereClause,
      include: {
        challenger: { select: { id: true, displayName: true, handle: true, tier: true } },
        opponent: { select: { id: true, displayName: true, handle: true, tier: true } },
        _count: { select: { attempts: true, events: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 60,
    });

    return NextResponse.json({
      success: true,
      matches: matches.map((m) => ({
        id: m.id,
        inviteCode: m.inviteCode,
        mode: m.mode,
        stake: m.stake,
        status: m.status,
        outcomeReason: m.outcomeReason,
        currentRound: m.currentRound,
        rematchCount: m.rematchCount,
        maxAttemptsPerRound: m.maxAttemptsPerRound,
        scoringVersion: m.scoringVersion,
        challenger: m.challenger,
        opponent: m.opponent,
        challengerStatus: m.challengerStatus,
        opponentStatus: m.opponentStatus,
        challengerLockedAt: m.challengerLockedAt,
        opponentLockedAt: m.opponentLockedAt,
        challengerFinalScore: m.challengerFinalScore,
        opponentFinalScore: m.opponentFinalScore,
        winnerId: m.winnerId,
        feeAmount: m.feeAmount,
        settlementAttempts: m.settlementAttempts,
        lastSettlementError: m.lastSettlementError,
        attemptCount: m._count.attempts,
        eventCount: m._count.events,
        isExpired: m.expiresAt.getTime() <= now.getTime(),
        expiresAt: m.expiresAt,
        resolvedAt: m.resolvedAt,
        createdAt: m.createdAt,
      })),
    });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to load Arena diagnostics' }, { status: 500 });
  }
}
