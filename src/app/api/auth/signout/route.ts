import { NextRequest, NextResponse } from 'next/server';
import {
  SESSION_COOKIE,
  clearSessionCookies,
  revokeSessionToken,
} from '@/lib/auth/sessions';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/signout
 * Revokes the server-side session and clears cookies.
 * POST only: a GET here would let any third-party page log users out.
 */
export async function POST(req: NextRequest) {
  await revokeSessionToken(req.cookies.get(SESSION_COOKIE)?.value).catch(() => undefined);
  return clearSessionCookies(NextResponse.json({ success: true, message: 'Signed out' }));
}
