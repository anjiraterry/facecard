import { NextResponse } from 'next/server';
import { getStaffSessionUser } from '@/lib/admin/auth';

export async function GET() {
  const staff = await getStaffSessionUser();
  if (!staff) {
    return NextResponse.json({ authenticated: false, staff: null }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, staff });
}
