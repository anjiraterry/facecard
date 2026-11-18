import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireStaffPermission, StaffAuthError } from '@/lib/admin/auth';

export async function GET() {
  try {
    await requireStaffPermission('audit.read');
    const logs = await db.staffAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        staffUser: { select: { id: true, fullName: true, email: true } },
      },
    });
    return NextResponse.json({ success: true, logs });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to load staff audit logs' }, { status: 500 });
  }
}
