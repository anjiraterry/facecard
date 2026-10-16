import { db } from '@/lib/db';

/**
 * Best-effort client IP. On Cloudflare `cf-connecting-ip` is set by the edge and
 * cannot be spoofed by the client; `x-forwarded-for` is only a fallback for local/dev.
 */
export function getClientIp(req: Request): string {
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf.trim();
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return 'unknown';
}

// In-memory sliding window fallback for environments where db.authAttempt delegate
// is not yet loaded in a persistent process or offline
const memoryAttempts = new Map<string, number[]>();

/** Returns true when `max` or more attempts of `kind` for `key` happened within the window. */
export async function isRateLimited(
  kind: string,
  key: string,
  max: number,
  windowMs: number
): Promise<boolean> {
  const delegate = (db as unknown as { authAttempt?: { count: (args: unknown) => Promise<number> } })?.authAttempt;

  if (typeof delegate?.count === 'function') {
    try {
      const count = await delegate.count({
        where: { kind, key, createdAt: { gt: new Date(Date.now() - windowMs) } },
      });
      return count >= max;
    } catch {
      // If table doesn't exist yet or connection blips, safely fall back to in-memory limiter
    }
  }

  // Memory fallback
  const now = Date.now();
  const mapKey = `${kind}:${key}`;
  const history = (memoryAttempts.get(mapKey) || []).filter((timestamp) => now - timestamp < windowMs);
  memoryAttempts.set(mapKey, history);
  return history.length >= max;
}

export async function recordAttempt(kind: string, key: string): Promise<void> {
  const delegate = (db as unknown as { authAttempt?: { create: (args: unknown) => Promise<unknown> } })?.authAttempt;

  if (typeof delegate?.create === 'function') {
    try {
      await delegate.create({ data: { kind, key } });
      return;
    } catch {
      // Fall through to memory
    }
  }

  const mapKey = `${kind}:${key}`;
  const history = memoryAttempts.get(mapKey) || [];
  history.push(Date.now());
  memoryAttempts.set(mapKey, history);
}
