/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const cookieJar: Record<string, string> = {};
const headerJar: Record<string, string> = {};

vi.mock('@/lib/db', async () => {
  const { createFakeDb } = await import('./helpers/fakeDb');
  const db = createFakeDb();
  return { db, default: db };
});

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (cookieJar[name] ? { name, value: cookieJar[name] } : undefined),
  }),
  headers: async () => ({ get: (name: string) => headerJar[name.toLowerCase()] ?? null }),
}));

import { db as rawDb } from '@/lib/db';
import {
  createSession,
  validateSessionToken,
  revokeSessionToken,
  extendSession,
  hashSessionToken,
  SESSION_COOKIE,
} from '@/lib/auth/sessions';
import { getSessionUser, getRequiredUser } from '@/lib/auth/session';

const db = rawDb as any;

async function makeUser(overrides: Record<string, unknown> = {}) {
  return db.user.create({ data: { displayName: 'Test', ...overrides } });
}

describe('Auth: server-side sessions', () => {
  beforeEach(() => {
    for (const t of [db.user, db.authSession]) t.rows.length = 0;
    for (const k of Object.keys(cookieJar)) delete cookieJar[k];
    for (const k of Object.keys(headerJar)) delete headerJar[k];
  });

  it('stores only a hash of the session token', async () => {
    const user = await makeUser();
    const token = await createSession(user.id);
    const row = db.authSession.rows[0];
    expect(row.tokenHash).toBe(hashSessionToken(token));
    expect(JSON.stringify(row)).not.toContain(token);
    expect(token.length).toBeGreaterThanOrEqual(40);
  });

  it('issues unique, unguessable tokens', async () => {
    const user = await makeUser();
    const a = await createSession(user.id);
    const b = await createSession(user.id);
    expect(a).not.toBe(b);
  });

  it('validates a live session and returns its user', async () => {
    const user = await makeUser();
    const token = await createSession(user.id);
    expect((await validateSessionToken(token))?.id).toBe(user.id);
  });

  it('rejects unknown, malformed, and raw-UUID tokens', async () => {
    const user = await makeUser();
    expect(await validateSessionToken(undefined)).toBeNull();
    expect(await validateSessionToken('short')).toBeNull();
    expect(await validateSessionToken(user.id)).toBeNull();
    expect(await validateSessionToken('x'.repeat(43))).toBeNull();
  });

  it('rejects expired sessions', async () => {
    const user = await makeUser();
    const token = await createSession(user.id);
    db.authSession.rows[0].expiresAt = new Date(Date.now() - 1000);
    expect(await validateSessionToken(token)).toBeNull();
  });

  it('rejects revoked sessions (sign-out)', async () => {
    const user = await makeUser();
    const token = await createSession(user.id);
    await revokeSessionToken(token);
    expect(await validateSessionToken(token)).toBeNull();
  });

  it('rejects sessions of banned or deleted users', async () => {
    const banned = await makeUser({ status: 'BANNED' });
    const deleted = await makeUser({ status: 'DELETED' });
    expect(await validateSessionToken(await createSession(banned.id))).toBeNull();
    expect(await validateSessionToken(await createSession(deleted.id))).toBeNull();
  });

  it('slides expiry only for valid sessions', async () => {
    const user = await makeUser();
    const token = await createSession(user.id);
    db.authSession.rows[0].expiresAt = new Date(Date.now() + 1000);
    expect(await extendSession(token)).toBe(true);
    expect(db.authSession.rows[0].expiresAt.getTime()).toBeGreaterThan(Date.now() + 24 * 3600 * 1000);
    expect(await extendSession('x'.repeat(43))).toBe(false);
  });

  describe('getSessionUser', () => {
    it('resolves the user from a valid session cookie', async () => {
      const user = await makeUser();
      cookieJar[SESSION_COOKIE] = await createSession(user.id);
      expect((await getSessionUser())?.id).toBe(user.id);
    });

    it('ignores a forged fc_user_id cookie holding a real user UUID', async () => {
      const victim = await makeUser();
      cookieJar['fc_user_id'] = victim.id;
      expect(await getSessionUser()).toBeNull();
      await expect(getRequiredUser()).rejects.toThrow('UNAUTHORIZED');
    });

    it('ignores x-user-id and Authorization headers holding a real user UUID', async () => {
      const victim = await makeUser();
      headerJar['x-user-id'] = victim.id;
      headerJar['authorization'] = `Bearer ${victim.id}`;
      expect(await getSessionUser()).toBeNull();
    });

    it('ignores the old Math.random-style fc_sess_ token', async () => {
      const user = await makeUser();
      cookieJar[SESSION_COOKIE] = 'fc_sess_abc123_def456';
      cookieJar['fc_user_id'] = user.id;
      expect(await getSessionUser()).toBeNull();
    });
  });
});
