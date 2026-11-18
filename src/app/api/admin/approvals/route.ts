import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import {
  getStaffSessionUser,
  recordStaffAuditLog,
  requireStaffPermission,
  StaffAuthError,
} from '@/lib/admin/auth';
import { postLedger } from '@/lib/ledger';
import { getClientIp } from '@/lib/auth/rateLimit';

export async function GET() {
  const staff = await getStaffSessionUser();
  if (!staff) {
    return NextResponse.json({ error: 'Staff authentication required' }, { status: 401 });
  }

  const approvals = await db.approvalRequest.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 50,
    include: {
      proposer: { select: { id: true, fullName: true, email: true } },
      reviewer: { select: { id: true, fullName: true, email: true } },
    },
  });

  return NextResponse.json({ success: true, approvals });
}

export async function POST(req: NextRequest) {
  try {
    const staff = await getStaffSessionUser();
    if (!staff) throw new StaffAuthError('Staff authentication required', 401);

    const { actionType, targetType, targetId, payload, reason } = (await req.json().catch(() => ({}))) as {
      actionType?: 'POINTS_ADJUSTMENT' | 'USER_SUSPENSION' | 'STOCK_WRITE_OFF';
      targetType?: string;
      targetId?: string;
      payload?: Record<string, unknown>;
      reason?: string;
    };

    if (!actionType || !targetType || !targetId || !reason || reason.trim().length < 5) {
      return NextResponse.json(
        { error: 'actionType, targetType, targetId, and reason (min 5 chars) are required' },
        { status: 400 }
      );
    }

    const request = await db.approvalRequest.create({
      data: {
        proposerId: staff.id,
        actionType,
        targetType,
        targetId,
        payload: (payload ?? {}) as Prisma.InputJsonValue,
        reason: reason.trim(),
      },
    });

    await recordStaffAuditLog({
      staffUserId: staff.id,
      action: 'APPROVAL_REQUEST_CREATED',
      targetType,
      targetId,
      reason,
      detail: { approvalId: request.id, actionType },
      ip: getClientIp(req),
    });

    return NextResponse.json({ success: true, approval: request }, { status: 201 });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to create approval request' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { approvalId, decision, note } = (await req.json().catch(() => ({}))) as {
      approvalId?: string;
      decision?: 'APPROVED' | 'REJECTED';
      note?: string;
    };

    if (!approvalId || (decision !== 'APPROVED' && decision !== 'REJECTED')) {
      return NextResponse.json({ error: 'approvalId and decision (APPROVED|REJECTED) are required' }, { status: 400 });
    }

    const existing = await db.approvalRequest.findUnique({ where: { id: approvalId } });
    if (!existing || existing.status !== 'PENDING') {
      return NextResponse.json({ error: 'Pending approval request not found' }, { status: 404 });
    }

    let staff;
    if (existing.actionType === 'POINTS_ADJUSTMENT') {
      staff = await requireStaffPermission('economy.adjust');
    } else if (existing.actionType === 'USER_SUSPENSION') {
      staff = await requireStaffPermission('users.approve_suspension');
    } else {
      staff = await requireStaffPermission('atelier.inventory_write');
    }

    if (existing.proposerId === staff.id) {
      return NextResponse.json(
        { error: 'Maker-checker policy violation: you cannot approve or reject your own request' },
        { status: 403 }
      );
    }

    const updated = await db.$transaction(async (tx) => {
      const claim = await tx.approvalRequest.updateMany({
        where: { id: approvalId, status: 'PENDING' },
        data: {
          status: decision,
          reviewerId: staff.id,
          decisionNote: note?.trim() || null,
          reviewedAt: new Date(),
        },
      });
      if (claim.count === 0) {
        throw new StaffAuthError('Approval request already processed', 409);
      }

      if (decision === 'APPROVED') {
        const payload = existing.payload as Record<string, unknown>;
        if (existing.actionType === 'POINTS_ADJUSTMENT') {
          const amount = Number(payload.amount ?? 0);
          const balanceKind = payload.balanceKind === 'LIFETIME' ? 'LIFETIME' : 'SPENDABLE';
          if (!Number.isFinite(amount) || amount === 0) {
            throw new StaffAuthError('Invalid points adjustment amount', 400);
          }
          await postLedger(tx, {
            userId: existing.targetId,
            type: 'ADJUSTMENT',
            amount,
            balanceKind,
            refType: 'APPROVAL_REQUEST',
            refId: existing.id,
            idempotencyKey: `approval:${existing.id}`,
          });
        } else if (existing.actionType === 'USER_SUSPENSION') {
          await tx.user.update({
            where: { id: existing.targetId },
            data: { status: 'BANNED' },
          });
          await tx.authSession.updateMany({
            where: { userId: existing.targetId, revokedAt: null },
            data: { revokedAt: new Date() },
          });
        }
      }

      return tx.approvalRequest.findUnique({ where: { id: approvalId } });
    });

    await recordStaffAuditLog({
      staffUserId: staff.id,
      action: `APPROVAL_REQUEST_${decision}`,
      targetType: existing.targetType,
      targetId: existing.targetId,
      reason: note || existing.reason,
      detail: { approvalId, actionType: existing.actionType },
      ip: getClientIp(req),
    });

    return NextResponse.json({ success: true, approval: updated });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: 'Failed to process approval', message: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    );
  }
}
