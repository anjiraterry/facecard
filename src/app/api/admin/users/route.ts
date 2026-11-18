import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireStaffPermission, StaffAuthError } from '@/lib/admin/auth';
import { hasPermission } from '@/lib/admin/permissions';

export async function GET(req: NextRequest) {
  try {
    const staff = await requireStaffPermission('users.read');
    const canReadContact = hasPermission(staff.role.permissions, 'users.read_contact_information');
    const q = req.nextUrl.searchParams.get('q')?.trim() || '';
    const status = req.nextUrl.searchParams.get('status')?.trim() || '';

    const users = await db.user.findMany({
      where: {
        ...(status ? { status: status as 'ACTIVE' | 'FLAGGED' | 'BANNED' | 'DELETED' } : {}),
        ...(q
          ? {
              OR: [
                { displayName: { contains: q, mode: 'insensitive' } },
                { handle: { contains: q, mode: 'insensitive' } },
                ...(canReadContact ? [{ email: { contains: q, mode: 'insensitive' as const } }] : []),
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        displayName: true,
        handle: true,
        email: canReadContact,
        status: true,
        tier: true,
        lifetimePoints: true,
        spendableBalance: true,
        createdAt: true,
        ageConfirmedAt: true,
        consentAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      canReadContact,
      users,
    });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: 'Failed to load users', message: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    );
  }
}
