import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/session/refresh
 * Slides the session window: resets cookie maxAge to 30 days.
 * Called automatically by the proxy on protected pages, but can also be
 * called manually from the client to keep the session alive.
 */
export async function GET(req: NextRequest) {
  const sessionToken = req.cookies.get('fc_session')?.value;
  const userId = req.cookies.get('fc_user_id')?.value;

  if (!sessionToken && !userId) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const THIRTY_DAYS = 60 * 60 * 24 * 30;

  const response = NextResponse.json({
    authenticated: true,
    refreshed: true,
    expiresIn: THIRTY_DAYS,
  });

  if (sessionToken) {
    response.cookies.set('fc_session', sessionToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: THIRTY_DAYS,
    });
  }

  if (userId) {
    response.cookies.set('fc_user_id', userId, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: THIRTY_DAYS,
    });
  }

  return response;
}

/**
 * POST /api/auth/session/refresh — same as GET, for convenience
 */
export async function POST(req: NextRequest) {
  return GET(req);
}
