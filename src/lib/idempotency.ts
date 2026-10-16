import crypto from 'node:crypto';
import { db } from '@/lib/db';
import { isUniqueViolation } from '@/lib/ledger';

const KEY_PATTERN = /^[A-Za-z0-9_\-:.]{8,128}$/;
const TTL_MS = 24 * 60 * 60 * 1000;

export function parseIdempotencyKey(req: Request): string | null {
  const key = req.headers.get('idempotency-key')?.trim();
  return key && KEY_PATTERN.test(key) ? key : null;
}

export function hashRequest(value: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(value ?? null)).digest('hex');
}

export interface IdempotentResult {
  status: number;
  body: unknown;
  replayed: boolean;
}

/**
 * Request-level idempotency for money-moving routes.
 *  - First call with a key runs the handler; a 2xx result is stored and replayed for repeats.
 *  - Same key + different request fingerprint -> 422.
 *  - Same key while the first call is still running -> 409.
 *  - Non-2xx results (and thrown errors) release the key so the client can retry.
 * Keys are scoped per user and route.
 */
export async function runIdempotent(
  userId: string,
  route: string,
  clientKey: string,
  requestHash: string,
  handler: () => Promise<{ status: number; body: unknown }>
): Promise<IdempotentResult> {
  const key = `${userId}:${route}:${clientKey}`;

  try {
    await db.idempotencyRecord.create({
      data: {
        key,
        userId,
        route,
        requestHash,
        status: 0,
        responseBody: {},
        expiresAt: new Date(Date.now() + TTL_MS),
      },
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;

    const existing = await db.idempotencyRecord.findUnique({ where: { key } });
    if (existing && existing.expiresAt.getTime() <= Date.now()) {
      // Expired record: clear it and run fresh.
      await db.idempotencyRecord.delete({ where: { key } }).catch(() => undefined);
      return runIdempotent(userId, route, clientKey, requestHash, handler);
    }
    if (!existing) return runIdempotent(userId, route, clientKey, requestHash, handler);
    if (existing.requestHash !== requestHash) {
      return {
        status: 422,
        body: { error: 'Idempotency-Key was already used with a different request.' },
        replayed: false,
      };
    }
    if (existing.status === 0) {
      return { status: 409, body: { error: 'This request is already being processed.' }, replayed: false };
    }
    return { status: existing.status, body: existing.responseBody, replayed: true };
  }

  try {
    const result = await handler();
    if (result.status >= 200 && result.status < 300) {
      await db.idempotencyRecord.update({
        where: { key },
        data: { status: result.status, responseBody: result.body as object },
      });
    } else {
      await db.idempotencyRecord.delete({ where: { key } }).catch(() => undefined);
    }
    return { ...result, replayed: false };
  } catch (error) {
    await db.idempotencyRecord.delete({ where: { key } }).catch(() => undefined);
    throw error;
  }
}
