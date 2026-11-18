import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  clearStaffSessionCookie,
  getStaffSessionUser,
  recordStaffAuditLog,
} from '@/lib/admin/auth';

export async function POST() {
  const staff = await getStaffSessionUser();
  if (staff) {
    await db.staffSession.update({
      where: { id: staff.sessionId },
      data: { revokedAt: new Date() },
    }).catch(() => undefined);

    await recordStaffAuditLog({
      staffUserId: staff.id,
      action: 'STAFF_LOGOUT',
      targetType: 'STAFF_USER',
      targetId: staff.id,
    }).catch(() => undefined);
  }

  const res = NextResponse.json({ success: true });
  return clearStaffSessionCookie(res);
}
