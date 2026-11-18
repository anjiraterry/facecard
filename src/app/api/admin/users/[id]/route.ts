import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  recordStaffAuditLog,
  requireStaffPermission,
  StaffAuthError,
} from '@/lib/admin/auth';
import { hasPermission } from '@/lib/admin/permissions';
import { getClientIp } from '@/lib/auth/rateLimit';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const staff = await requireStaffPermission('users.read');
    const { id } = await params;

    const canReadContact = hasPermission(staff.role.permissions, 'users.read_contact_information');
    const canReadScans = hasPermission(staff.role.permissions, 'users.read_scan_metadata');
    const canReadSkin = hasPermission(staff.role.permissions, 'users.read_skin_profile');

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        displayName: true,
        handle: true,
        email: canReadContact,
        status: true,
        tier: true,
        lifetimePoints: true,
        spendableBalance: true,
        ageConfirmedAt: true,
        consentAt: true,
        consentVersion: true,
        createdAt: true,
        cards: true,
        streak: true,
        consentRecords: { orderBy: { grantedAt: 'desc' }, take: 20 },
        abuseFlags: { orderBy: { createdAt: 'desc' }, take: 20 },
        ledgerEntries: { orderBy: { createdAt: 'desc' }, take: 20 },
        atelierOrders: {
          orderBy: { createdAt: 'desc' },
          take: 15,
          select: {
            id: true,
            orderNumber: true,
            orderStatus: true,
            paymentStatus: true,
            fulfilmentStatus: true,
            totalMinor: true,
            placedAt: true,
          },
        },
        supportTickets: {
          orderBy: { createdAt: 'desc' },
          take: 15,
          select: {
            id: true,
            subject: true,
            category: true,
            status: true,
            priority: true,
            createdAt: true,
          },
        },
        ...(canReadScans
          ? {
              scans: {
                orderBy: { createdAt: 'desc' },
                take: 15,
                select: {
                  id: true,
                  score: true,
                  band: true,
                  modelVersion: true,
                  scanIndexOfDay: true,
                  source: true,
                  createdAt: true,
                },
              },
            }
          : {}),
        ...(canReadSkin
          ? {
              skinProfile: {
                include: { concerns: true, sensitivities: true },
              },
            }
          : {}),
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      permissions: { canReadContact, canReadScans, canReadSkin },
      user: {
        ...user,
        pointsLedger: user.ledgerEntries,
        atelierOrders: user.atelierOrders.map((o) => ({
          ...o,
          totalMinor: Number(o.totalMinor),
        })),
      },
    });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: 'Failed to load user 360', message: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { action, reason } = (await req.json().catch(() => ({}))) as {
      action?: 'REVOKE_SESSIONS' | 'REQUEST_SUSPENSION' | 'APPROVE_SUSPENSION' | 'RESTORE_USER';
      reason?: string;
    };

    if (!reason || reason.trim().length < 5) {
      return NextResponse.json(
        { error: 'A staff audit reason (min 5 chars) is required for every governance action' },
        { status: 400 }
      );
    }

    const ip = getClientIp(req);

    if (action === 'REVOKE_SESSIONS') {
      const staff = await requireStaffPermission('users.revoke_sessions');
      const result = await db.authSession.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await recordStaffAuditLog({
        staffUserId: staff.id,
        action: 'USER_SESSIONS_REVOKED',
        targetType: 'USER',
        targetId: id,
        reason,
        detail: { revokedCount: result.count },
        ip,
      });
      return NextResponse.json({ success: true, action, revokedCount: result.count });
    }

    if (action === 'REQUEST_SUSPENSION') {
      const staff = await requireStaffPermission('users.request_suspension');
      const flag = await db.abuseFlag.create({
        data: {
          userId: id,
          reason: `SUSPENSION_REQUESTED: ${reason}`,
          severity: 'HIGH',
        },
      });
      await recordStaffAuditLog({
        staffUserId: staff.id,
        action: 'USER_SUSPENSION_REQUESTED',
        targetType: 'USER',
        targetId: id,
        reason,
        detail: { flagId: flag.id },
        ip,
      });
      return NextResponse.json({ success: true, action, flag });
    }

    if (action === 'APPROVE_SUSPENSION') {
      const staff = await requireStaffPermission('users.approve_suspension');
      await db.$transaction([
        db.user.update({ where: { id }, data: { status: 'BANNED' } }),
        db.authSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } }),
      ]);
      await recordStaffAuditLog({
        staffUserId: staff.id,
        action: 'USER_SUSPENDED',
        targetType: 'USER',
        targetId: id,
        reason,
        ip,
      });
      return NextResponse.json({ success: true, action, status: 'BANNED' });
    }

    if (action === 'RESTORE_USER') {
      const staff = await requireStaffPermission('users.approve_suspension');
      await db.user.update({ where: { id }, data: { status: 'ACTIVE' } });
      await recordStaffAuditLog({
        staffUserId: staff.id,
        action: 'USER_RESTORED',
        targetType: 'USER',
        targetId: id,
        reason,
        ip,
      });
      return NextResponse.json({ success: true, action, status: 'ACTIVE' });
    }

    return NextResponse.json({ error: 'Invalid governance action' }, { status: 400 });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: 'Governance action failed', message: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    );
  }
}
