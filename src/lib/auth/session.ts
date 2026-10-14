import { auth } from '@/lib/auth/server';
import { db } from '@/lib/db';
import { User } from '@prisma/client';
import { cookies, headers } from 'next/headers';
import { randomUUID } from 'crypto';


/**
 * Retrieves the currently authenticated session user from Postgres.
 * Checks fc_user_id cookies, x-user-id headers, and Managed Neon Auth sessions.
 */
export async function getSessionUser(): Promise<User | null> {
  // 1. Check direct session cookie
  try {
    const cookieStore = await cookies();
    const cookieUserId = cookieStore.get('fc_user_id')?.value;
    if (cookieUserId) {
      const user = await db.user.findUnique({
        where: { id: cookieUserId },
      });
      if (user) return user;
    }
  } catch {
    // cookies() unavailable in non-request contexts
  }

  // 1b. Check x-user-id or Authorization bearer header
  try {
    const headerList = await headers();
    const headerUserId =
      headerList.get('x-user-id') ||
      headerList.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (
      headerUserId &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(headerUserId)
    ) {
      const user = await db.user.findUnique({
        where: { id: headerUserId },
      });
      if (user) return user;
    }
  } catch {
    // headers() unavailable
  }

  // 2. Check Neon Auth session
  try {
    const { data: session } = await auth.getSession();
    if (session?.user) {
      // Try finding public.User by Neon Auth UUID
      let user = await db.user.findUnique({
        where: { id: session.user.id },
      });

      if (!user && session.user.email) {
        user = await db.user.findUnique({
          where: { email: session.user.email },
        });
      }

      // If user exists in neon_auth but not yet provisioned in public.User, provision profile
      if (!user && session.user.email) {
        const rawHandle = session.user.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || 'user';
        let handle = rawHandle;
        let counter = 1;
        while (await db.user.findUnique({ where: { handle } })) {
          handle = `${rawHandle}${counter++}`;
        }

        user = await db.user.create({
          data: {
            id: session.user.id, // Exact match with neon_auth.user.id UUID
            email: session.user.email,
            displayName: session.user.name || handle,
            handle,
            tier: 'CLASSIC',
            lifetimePoints: 100,
            spendableBalance: 100,
            streak: {
              create: {
                id: randomUUID(),
                currentCount: 1,
                longestCount: 1,
                lastScanDayKey: new Date().toISOString().split('T')[0],
                freezesHeld: 0,
              },
            },
            cards: {
              create: {
                id: randomUUID(),
                cardNumber: `FC-${Math.floor(1000 + Math.random() * 9000)}-2026`,
              },
            },
          },
        });
      }

      return user;
    }
  } catch (err) {
    console.warn('Neon Auth session lookup error:', err);
  }

  return null;
}

export async function getRequiredUser(): Promise<User> {
  const sessionUser = await getSessionUser();
  if (sessionUser) return sessionUser;

  throw new Error('UNAUTHORIZED');
}
