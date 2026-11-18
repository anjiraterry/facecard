import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  recordStaffAuditLog,
  requireStaffPermission,
  StaffAuthError,
} from '@/lib/admin/auth';
import { STAFF_PERMISSIONS } from '@/lib/admin/permissions';
import { getClientIp } from '@/lib/auth/rateLimit';

export async function GET() {
  try {
    await requireStaffPermission('staff.read');
    const roles = await db.staffRole.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { users: true } } },
    });
    return NextResponse.json({
      success: true,
      roles,
      allPermissions: STAFF_PERMISSIONS,
    });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to load staff roles' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const staff = await requireStaffPermission('staff.manage');
    const { slug, name, description, permissions } = (await req.json().catch(() => ({}))) as {
      slug?: string;
      name?: string;
      description?: string;
      permissions?: string[];
    };

    const cleanSlug = slug?.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!cleanSlug || !name?.trim()) {
      return NextResponse.json({ error: 'Role slug and name are required' }, { status: 400 });
    }

    const validPerms = (permissions || []).filter((p) =>
      (STAFF_PERMISSIONS as readonly string[]).includes(p)
    );

    const role = await db.staffRole.create({
      data: {
        slug: cleanSlug,
        name: name.trim(),
        description: description?.trim() || null,
        permissions: validPerms,
        isSystem: false,
      },
    });

    await recordStaffAuditLog({
      staffUserId: staff.id,
      action: 'STAFF_ROLE_CREATED',
      targetType: 'STAFF_ROLE',
      targetId: role.id,
      detail: { slug: role.slug, permissionsCount: validPerms.length },
      ip: getClientIp(req),
    });

    return NextResponse.json({ success: true, role }, { status: 201 });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to create role' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const staff = await requireStaffPermission('staff.manage');
    const { roleId, permissions } = (await req.json().catch(() => ({}))) as {
      roleId?: string;
      permissions?: string[];
    };

    if (!roleId || !Array.isArray(permissions)) {
      return NextResponse.json({ error: 'roleId and permissions array are required' }, { status: 400 });
    }

    const validPerms = permissions.filter((p) =>
      (STAFF_PERMISSIONS as readonly string[]).includes(p)
    );

    const role = await db.staffRole.update({
      where: { id: roleId },
      data: { permissions: validPerms },
    });

    await recordStaffAuditLog({
      staffUserId: staff.id,
      action: 'STAFF_ROLE_PERMISSIONS_UPDATED',
      targetType: 'STAFF_ROLE',
      targetId: role.id,
      detail: { slug: role.slug, permissionsCount: validPerms.length },
      ip: getClientIp(req),
    });

    return NextResponse.json({ success: true, role });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to update role permissions' }, { status: 500 });
  }
}
