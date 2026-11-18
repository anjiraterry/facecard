import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  recordStaffAuditLog,
  requireStaffPermission,
  StaffAuthError,
} from '@/lib/admin/auth';
import { getClientIp } from '@/lib/auth/rateLimit';

export async function GET() {
  try {
    await requireStaffPermission('moderation.read');
    const flags = await db.abuseFlag.findMany({
      orderBy: [{ reviewedAt: 'asc' }, { createdAt: 'desc' }],
      take: 100,
      include: {
        user: { select: { id: true, displayName: true, handle: true, status: true } },
      },
    });
    return NextResponse.json({ success: true, flags });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to load abuse flags' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const staff = await requireStaffPermission('moderation.resolve');
    const { flagId, outcome, reason } = (await req.json().catch(() => ({}))) as {
      flagId?: string;
      outcome?: string;
      reason?: string;
    };

    if (!flagId || !outcome || !reason || reason.trim().length < 5) {
      return NextResponse.json(
        { error: 'flagId, outcome, and a reason (min 5 chars) are required' },
        { status: 400 }
      );
    }

    const updated = await db.abuseFlag.update({
      where: { id: flagId },
      data: {
        reviewedAt: new Date(),
        outcome,
      },
    });

    await recordStaffAuditLog({
      staffUserId: staff.id,
      action: 'ABUSE_FLAG_RESOLVED',
      targetType: 'ABUSE_FLAG',
      targetId: flagId,
      reason,
      detail: { outcome, userId: updated.userId },
      ip: getClientIp(req),
    });

    return NextResponse.json({ success: true, flag: updated });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to resolve abuse flag' }, { status: 500 });
  }
}
