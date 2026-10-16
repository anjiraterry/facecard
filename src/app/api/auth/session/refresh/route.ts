import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, SESSION_TTL_SECONDS, applySessionCookie, extendSession } from '@/lib/auth/sessions';

export const dynamic = 'force-dynamic';

/**
 * GET/POST /api/auth/session/refresh
 * Validates the session server-side and slides its expiry by 30 days.
 * For guests without a session cookie, returns 200 with { authenticated: false }
 * to avoid emitting 401 error noise on every tab focus.
 */
export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ authenticated: false, refreshed: false }, { status: 200 });
  }

  const isValid = await extendSession(token);
  if (!isValid) {
    return NextResponse.json({ authenticated: false, refreshed: false, error: 'Session expired' }, { status: 401 });
  }

  return applySessionCookie(
    NextResponse.json({ authenticated: true, refreshed: true, expiresIn: SESSION_TTL_SECONDS }),
    token
  );
}

export async function POST(req: NextRequest) {
  return GET(req);
}
