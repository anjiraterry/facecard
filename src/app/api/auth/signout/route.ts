import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/signout
 * Clears all session cookies and redirects to sign-in.
 */
export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Signed out' });

  // Clear httpOnly session cookies
  response.cookies.set('fc_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });

  response.cookies.set('fc_user_id', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}

export async function GET() {
  return POST();
}
