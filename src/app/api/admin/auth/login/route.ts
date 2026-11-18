import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getClientIp, isRateLimited, recordAttempt } from '@/lib/auth/rateLimit';
import {
  applyStaffSessionCookie,
  createStaffSession,
  recordStaffAuditLog,
  verifyStaffPassword,
} from '@/lib/admin/auth';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (await isRateLimited('staff_login_ip', ip, 15, 15 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many login attempts. Try again later.' }, { status: 429 });
    }

    const { email, password } = (await req.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
    };

    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    await recordAttempt('staff_login_ip', ip);

    const staff = await db.staffUser.findUnique({
      where: { email: normalizedEmail },
      include: { role: true },
    });

    if (!staff || staff.status !== 'ACTIVE' || !verifyStaffPassword(password, staff.passwordHash)) {
      return NextResponse.json({ error: 'Invalid staff credentials' }, { status: 401 });
    }

    const { token, expiresAt } = await createStaffSession(staff.id, {
      ip,
      userAgent: req.headers.get('user-agent'),
    });

    await recordStaffAuditLog({
      staffUserId: staff.id,
      action: 'STAFF_LOGIN',
      targetType: 'STAFF_USER',
      targetId: staff.id,
      ip,
    });

    const res = NextResponse.json({
      success: true,
      staff: {
        id: staff.id,
        email: staff.email,
        fullName: staff.fullName,
        role: {
          slug: staff.role.slug,
          name: staff.role.name,
          permissions: staff.role.permissions,
        },
      },
    });
    return applyStaffSessionCookie(res, token, expiresAt);
  } catch (error) {
    return NextResponse.json(
      { error: 'Staff login failed', message: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    );
  }
}
