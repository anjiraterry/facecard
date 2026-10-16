import crypto from 'node:crypto';
import type { NextResponse } from 'next/server';
import type { User } from '@prisma/client';
import { db } from '@/lib/db';

export const SESSION_COOKIE = 'fc_session';
/** Legacy identity cookie that used to carry a raw user UUID. Only ever cleared now, never trusted. */
export const LEGACY_USER_COOKIE = 'fc_user_id';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const SESSION_TTL_MS = SESSION_TTL_SECONDS * 1000;
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createSession(
  userId: string,
  meta: { ip?: string; userAgent?: string } = {}
): Promise<string> {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  const delegate = (db as unknown as { authSession?: { create: (args: unknown) => Promise<unknown> } })?.authSession;

  if (typeof delegate?.create === 'function') {
    try {
      await delegate.create({
        data: {
          userId,
          tokenHash,
          expiresAt,
          ip: meta.ip,
          userAgent: meta.userAgent?.slice(0, 255),
        },
      });
      console.log('[SESSIONS] Session created via Prisma delegate for user:', userId);
      return token;
    } catch (err) {
      console.warn('[SESSIONS] Prisma delegate.create failed, falling back to SQL:', err);
    }
  }

  // Resilient fallback for environments where the authSession delegate is missing from the active client
  console.log('[SESSIONS] Creating session via raw SQL fallback for user:', userId);
  const sessionId = crypto.randomUUID();
  await db.$executeRawUnsafe(
    `INSERT INTO "AuthSession" ("id", "userId", "tokenHash", "expiresAt", "createdAt", "lastUsedAt", "ip", "userAgent")
     VALUES ($1::uuid, $2::uuid, $3, $4, NOW(), NOW(), $5, $6)`,
    sessionId,
    userId,
    tokenHash,
    expiresAt,
    meta.ip || null,
    meta.userAgent?.slice(0, 255) || null
  );
  console.log('[SESSIONS] Session created via SQL fallback successfully for user:', userId);
  return token;
}

/** Returns the active user for a raw session token, or null if invalid/expired/revoked/banned. */
export async function validateSessionToken(token: string | undefined | null): Promise<User | null> {
  if (!token || token.length < 20 || token.length > 200) return null;
  const tokenHash = hashSessionToken(token);

  const delegate = (db as unknown as {
    authSession?: {
      findUnique: (args: unknown) => Promise<{
        id: string;
        revokedAt: Date | null;
        expiresAt: Date;
        lastUsedAt: Date;
        user: User;
      } | null>;
      update: (args: unknown) => Promise<unknown>;
    };
  })?.authSession;

  if (typeof delegate?.findUnique === 'function') {
    try {
      const session = await delegate.findUnique({
        where: { tokenHash },
        include: { user: true },
      });
      if (!session) return null;

      const now = Date.now();
      if (session.revokedAt || session.expiresAt.getTime() <= now) return null;
      if (session.user.status === 'BANNED' || session.user.status === 'DELETED') return null;

      if (now - session.lastUsedAt.getTime() > TOUCH_INTERVAL_MS) {
        await delegate
          .update({ where: { id: session.id }, data: { lastUsedAt: new Date(now) } })
          .catch(() => undefined);
      }

      return session.user;
    } catch (err) {
      console.warn('[SESSIONS] delegate.findUnique failed, trying SQL fallback:', err);
    }
  }

  // Resilient SQL fallback
  try {
    const rows = await db.$queryRawUnsafe<Array<User & {
      session_id: string;
      expiresAt: Date | string;
      revokedAt: Date | string | null;
      lastUsedAt: Date | string;
    }>>(
      `SELECT s.id as session_id, s."expiresAt", s."revokedAt", s."lastUsedAt",
              u.*
       FROM "AuthSession" s
       JOIN "User" u ON u.id = s."userId"
       WHERE s."tokenHash" = $1
       LIMIT 1`,
      tokenHash
    );

    if (!rows || rows.length === 0) return null;
    const row = rows[0];

    const now = Date.now();
    const expiresAt = new Date(row.expiresAt).getTime();
    if (row.revokedAt || expiresAt <= now) return null;
    if (row.status === 'BANNED' || row.status === 'DELETED') return null;

    if (now - new Date(row.lastUsedAt).getTime() > TOUCH_INTERVAL_MS) {
      db.$executeRawUnsafe(
        `UPDATE "AuthSession" SET "lastUsedAt" = NOW() WHERE id = $1::uuid`,
        row.session_id
      ).catch(() => undefined);
    }

    const mappedUser = {
      id: row.id,
      email: row.email ?? null,
      displayName: row.displayName,
      handle: row.handle,
      pinHash: (row as { pinHash?: string | null }).pinHash ?? null,
      tier: row.tier,
      lifetimePoints: Number(row.lifetimePoints),
      spendableBalance: Number(row.spendableBalance),
      status: row.status,
      unlockedAt: row.unlockedAt ? new Date(row.unlockedAt) : null,
      invitedByFaceOffId: row.invitedByFaceOffId ?? null,
      ageConfirmedAt: row.ageConfirmedAt ? new Date(row.ageConfirmedAt) : null,
      consentAt: row.consentAt ? new Date(row.consentAt) : null,
      consentVersion: row.consentVersion,
      createdAt: new Date(row.createdAt),
      avatarUrl: (row as { avatarUrl?: string | null }).avatarUrl ?? null,
    };

    return mappedUser as unknown as User;
  } catch (err) {
    console.error('[SESSIONS] validateSessionToken fallback failed:', err);
    return null;
  }
}

/** Slides the expiry of a valid session. Returns false if the session is not valid. */
export async function extendSession(token: string): Promise<boolean> {
  const user = await validateSessionToken(token);
  if (!user) return false;
  const tokenHash = hashSessionToken(token);
  const delegate = (db as unknown as { authSession?: { update: (args: unknown) => Promise<unknown> } })?.authSession;

  if (typeof delegate?.update === 'function') {
    try {
      await delegate.update({
        where: { tokenHash },
        data: { expiresAt: new Date(Date.now() + SESSION_TTL_MS), lastUsedAt: new Date() },
      });
      return true;
    } catch {
      // Fall through to SQL
    }
  }

  await db.$executeRawUnsafe(
    `UPDATE "AuthSession" SET "expiresAt" = $1, "lastUsedAt" = NOW() WHERE "tokenHash" = $2`,
    new Date(Date.now() + SESSION_TTL_MS),
    tokenHash
  ).catch(() => undefined);

  return true;
}

export async function revokeSessionToken(token: string | undefined | null): Promise<void> {
  if (!token) return;
  const tokenHash = hashSessionToken(token);
  const delegate = (db as unknown as { authSession?: { updateMany: (args: unknown) => Promise<unknown> } })?.authSession;

  if (typeof delegate?.updateMany === 'function') {
    try {
      await delegate.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return;
    } catch {
      // Fall through to SQL
    }
  }

  await db.$executeRawUnsafe(
    `UPDATE "AuthSession" SET "revokedAt" = NOW() WHERE "tokenHash" = $1 AND "revokedAt" IS NULL`,
    tokenHash
  ).catch(() => undefined);
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  const delegate = (db as unknown as { authSession?: { updateMany: (args: unknown) => Promise<unknown> } })?.authSession;

  if (typeof delegate?.updateMany === 'function') {
    try {
      await delegate.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return;
    } catch {
      // Fall through to SQL
    }
  }

  await db.$executeRawUnsafe(
    `UPDATE "AuthSession" SET "revokedAt" = NOW() WHERE "userId" = $1::uuid AND "revokedAt" IS NULL`,
    userId
  ).catch(() => undefined);
}

const baseCookie = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
});

export function applySessionCookie<T>(response: NextResponse<T>, token: string): NextResponse<T> {
  response.cookies.set(SESSION_COOKIE, token, { ...baseCookie(), maxAge: SESSION_TTL_SECONDS });
  // Drop the legacy identity cookie from older clients.
  response.cookies.set(LEGACY_USER_COOKIE, '', { ...baseCookie(), maxAge: 0, expires: new Date(0) });
  return response;
}

export function clearSessionCookies<T>(response: NextResponse<T>): NextResponse<T> {
  for (const name of [SESSION_COOKIE, LEGACY_USER_COOKIE]) {
    response.cookies.set(name, '', { ...baseCookie(), maxAge: 0, expires: new Date(0) });
  }
  return response;
}
