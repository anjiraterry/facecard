import { User } from '@prisma/client';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, validateSessionToken } from '@/lib/auth/sessions';

/**
 * Resolves the authenticated user from the opaque, server-validated session cookie.
 * No other credential (user-id cookies, x-user-id / Authorization headers) is ever trusted.
 */
export async function getSessionUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    return await validateSessionToken(token);
  } catch {
    // cookies() unavailable outside a request context
    return null;
  }
}

export async function getRequiredUser(): Promise<User> {
  const sessionUser = await getSessionUser();
  if (sessionUser) return sessionUser;

  throw new Error('UNAUTHORIZED');
}
