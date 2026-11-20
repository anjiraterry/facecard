import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recordStaffAuditLog, requireStaffPermission, StaffAuthError } from '@/lib/admin/auth';
import { FaceOffError, recordFaceOffEvent, resolveFaceOff } from '@/lib/faceoff';
import { postLedger } from '@/lib/ledger';
import { FaceOffMode, FaceOffParticipantStatus, FaceOffStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireStaffPermission('economy.reconcile');
    const { id: duelId } = await params;

    const duel = await db.faceOff.findUnique({
      where: { id: duelId },
      include: {
        challenger: { select: { id: true, displayName: true, handle: true, tier: true } },
        opponent: { select: { id: true, displayName: true, handle: true, tier: true } },
        attempts: {
          orderBy: [{ roundNumber: 'asc' }, { attemptNumber: 'asc' }],
          include: { scan: { select: { id: true, score: true, modelVersion: true, promptVersion: true, createdAt: true } } },
        },
        rounds: { orderBy: { roundNumber: 'asc' } },
        events: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!duel) {
      return NextResponse.json({ error: 'Face-Off match not found' }, { status: 404 });
    }

    const ledgerEntries = await db.pointsLedger.findMany({
      where: { refType: 'FACEOFF', refId: duel.id },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      success: true,
      match: duel,
      ledgerEntries,
    });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to load match inspector' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const staff = await requireStaffPermission('economy.reconcile');
    const { id: duelId } = await params;
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === 'RETRY_SETTLEMENT') {
      const result = await resolveFaceOff(duelId);
      await recordStaffAuditLog({
        staffUserId: staff.id,
        action: 'ARENA_RETRY_SETTLEMENT',
        targetType: 'FACEOFF',
        targetId: duelId,
        detail: result as Record<string, unknown>,
      });
      return NextResponse.json({ success: true, action, result });
    }

    if (action === 'CANCEL_AND_REFUND') {
      const duel = await db.faceOff.findUnique({ where: { id: duelId } });
      if (!duel) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
      if (duel.status === FaceOffStatus.COMPLETED || duel.status === FaceOffStatus.CANCELLED) {
        return NextResponse.json({ error: `Match is already ${duel.status}` }, { status: 400 });
      }

      await db.$transaction(async (tx) => {
        const updated = await tx.faceOff.updateMany({
          where: { id: duel.id, status: { notIn: [FaceOffStatus.COMPLETED, FaceOffStatus.CANCELLED] } },
          data: {
            status: FaceOffStatus.CANCELLED,
            outcomeReason: 'ADMIN_CONTROLLED_CANCELLATION',
            challengerStatus: FaceOffParticipantStatus.WITHDRAWN,
            opponentStatus: duel.opponentId ? FaceOffParticipantStatus.WITHDRAWN : FaceOffParticipantStatus.WAITING,
          },
        });
        if (updated.count === 0) throw new FaceOffError('Match state changed concurrently', 409);

        if (duel.mode === FaceOffMode.STAKED && duel.stake > 0) {
          await postLedger(tx, {
            userId: duel.challengerId,
            type: 'FACEOFF_REFUND',
            amount: duel.stake,
            balanceKind: 'SPENDABLE',
            refType: 'FACEOFF',
            refId: duel.id,
            idempotencyKey: `faceoff-admin-refund:${duel.id}:${duel.challengerId}`,
          });
          if (duel.opponentId) {
            await postLedger(tx, {
              userId: duel.opponentId,
              type: 'FACEOFF_REFUND',
              amount: duel.stake,
              balanceKind: 'SPENDABLE',
              refType: 'FACEOFF',
              refId: duel.id,
              idempotencyKey: `faceoff-admin-refund:${duel.id}:${duel.opponentId}`,
            });
          }
        }

        await recordFaceOffEvent(tx, {
          faceOffId: duel.id,
          roundNumber: duel.currentRound ?? 1,
          actorUserId: staff.id,
          eventType: 'MATCH_CANCELLED',
          detail: { adminAction: true, reason: body.reason ?? 'ADMIN_CONTROLLED_CANCELLATION' },
        });
      });

      await recordStaffAuditLog({
        staffUserId: staff.id,
        action: 'ARENA_CANCEL_AND_REFUND',
        targetType: 'FACEOFF',
        targetId: duelId,
        detail: { reason: body.reason ?? 'ADMIN_CONTROLLED_CANCELLATION' },
      });

      return NextResponse.json({ success: true, action });
    }

    return NextResponse.json({ error: 'Unsupported Arena admin action' }, { status: 400 });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof FaceOffError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Arena admin action failed' }, { status: 500 });
  }
}
