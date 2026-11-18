import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { StaffPermission, hasPermission } from './permissions';

export const STAFF_SESSION_COOKIE = 'fc_staff_session';
const STAFF_SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export interface AuthenticatedStaff {
  id: string;
  email: string;
  fullName: string;
  status: string;
  role: {
    id: string;
    slug: string;
    name: string;
    permissions: string[];
  };
  sessionId: string;
}

export class StaffAuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export function hashStaffPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

export function verifyStaffPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, expectedHex] = parts;
  const actualBuf = crypto.scryptSync(password, salt, 64);
  const expectedBuf = Buffer.from(expectedHex, 'hex');
  if (actualBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

export function hashStaffToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createStaffSession(
  staffUserId: string,
  meta?: { ip?: string | null; userAgent?: string | null }
): Promise<{ token: string; expiresAt: Date }> {
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashStaffToken(token);
  const expiresAt = new Date(Date.now() + STAFF_SESSION_TTL_MS);

  await db.staffSession.create({
    data: {
      staffUserId,
      tokenHash,
      expiresAt,
      ip: meta?.ip ?? null,
      userAgent: meta?.userAgent ?? null,
    },
  });

  await db.staffUser.update({
    where: { id: staffUserId },
    data: { lastLoginAt: new Date() },
  });

  return { token, expiresAt };
}

export function applyStaffSessionCookie(res: NextResponse, token: string, expiresAt: Date): NextResponse {
  res.cookies.set(STAFF_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
  return res;
}

export function clearStaffSessionCookie(res: NextResponse): NextResponse {
  res.cookies.set(STAFF_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return res;
}

export async function getStaffSessionUser(): Promise<AuthenticatedStaff | null> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(STAFF_SESSION_COOKIE)?.value;
  if (!rawToken) return null;

  const tokenHash = hashStaffToken(rawToken);
  const session = await db.staffSession.findUnique({
    where: { tokenHash },
    include: {
      staffUser: {
        include: { role: true },
      },
    },
  });

  if (!session || session.revokedAt || session.expiresAt <= new Date()) {
    return null;
  }

  if (session.staffUser.status !== 'ACTIVE') {
    return null;
  }

  await db.staffSession.update({
    where: { id: session.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => undefined);

  return {
    id: session.staffUser.id,
    email: session.staffUser.email,
    fullName: session.staffUser.fullName,
    status: session.staffUser.status,
    role: {
      id: session.staffUser.role.id,
      slug: session.staffUser.role.slug,
      name: session.staffUser.role.name,
      permissions: session.staffUser.role.permissions,
    },
    sessionId: session.id,
  };
}

export async function requireStaffPermission(permission: StaffPermission): Promise<AuthenticatedStaff> {
  const staff = await getStaffSessionUser();
  if (!staff) {
    throw new StaffAuthError('Staff authentication required', 401);
  }
  if (!hasPermission(staff.role.permissions, permission)) {
    throw new StaffAuthError(`Forbidden: missing permission '${permission}'`, 403);
  }
  return staff;
}

export async function recordStaffAuditLog(input: {
  staffUserId: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  reason?: string | null;
  detail?: Record<string, unknown>;
  ip?: string | null;
}) {
  return db.staffAuditLog.create({
    data: {
      staffUserId: input.staffUserId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      reason: input.reason ?? null,
      detail: (input.detail ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      ip: input.ip ?? null,
    },
  });
}
