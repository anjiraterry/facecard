import { NextRequest, NextResponse } from 'next/server';
import { StaffStatus } from '@prisma/client';
import { db } from '@/lib/db';
import {
  hashStaffPassword,
  recordStaffAuditLog,
  requireStaffPermission,
  StaffAuthError,
} from '@/lib/admin/auth';
import { getClientIp } from '@/lib/auth/rateLimit';

export async function GET() {
  try {
    await requireStaffPermission('staff.read');
    const staffUsers = await db.staffUser.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        fullName: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        role: { select: { id: true, slug: true, name: true } },
      },
    });
    return NextResponse.json({ success: true, staffUsers });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to load staff accounts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireStaffPermission('staff.manage');
    const { email, fullName, password, roleId } = (await req.json().catch(() => ({}))) as {
      email?: string;
      fullName?: string;
      password?: string;
      roleId?: string;
    };

    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail || !fullName?.trim() || !password || password.length < 10 || !roleId) {
      return NextResponse.json(
        { error: 'Valid email, fullName, password (min 10 chars), and roleId are required' },
        { status: 400 }
      );
    }

    const created = await db.staffUser.create({
      data: {
        email: normalizedEmail,
        fullName: fullName.trim(),
        passwordHash: hashStaffPassword(password),
        status: 'ACTIVE',
        roleId,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        status: true,
        role: { select: { id: true, slug: true, name: true } },
      },
    });

    await recordStaffAuditLog({
      staffUserId: actor.id,
      action: 'STAFF_ACCOUNT_CREATED',
      targetType: 'STAFF_USER',
      targetId: created.id,
      detail: { email: created.email, role: created.role.slug },
      ip: getClientIp(req),
    });

    return NextResponse.json({ success: true, staffUser: created }, { status: 201 });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to create staff account' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const actor = await requireStaffPermission('staff.manage');
    const { staffUserId, status, roleId } = (await req.json().catch(() => ({}))) as {
      staffUserId?: string;
      status?: StaffStatus;
      roleId?: string;
    };

    if (!staffUserId) {
      return NextResponse.json({ error: 'staffUserId is required' }, { status: 400 });
    }
    if (staffUserId === actor.id && status && status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Cannot suspend or revoke your own active account' }, { status: 400 });
    }

    const updated = await db.$transaction(async (tx) => {
      const user = await tx.staffUser.update({
        where: { id: staffUserId },
        data: {
          ...(status ? { status } : {}),
          ...(roleId ? { roleId } : {}),
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          status: true,
          role: { select: { id: true, slug: true, name: true } },
        },
      });
      if (status && status !== 'ACTIVE') {
        await tx.staffSession.updateMany({
          where: { staffUserId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      return user;
    });

    await recordStaffAuditLog({
      staffUserId: actor.id,
      action: 'STAFF_ACCOUNT_UPDATED',
      targetType: 'STAFF_USER',
      targetId: staffUserId,
      detail: { status: status ?? null, roleId: roleId ?? null },
      ip: getClientIp(req),
    });

    return NextResponse.json({ success: true, staffUser: updated });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to update staff account' }, { status: 500 });
  }
}
