import { db } from '@/lib/db';

/**
 * Authoritatively expires any ACTIVE effects whose expiresAt <= now.
 * Ensures effects stop immediately at authoritative expiration time.
 */
export async function expireStaleActiveEffects(userId?: string): Promise<number> {
  const now = new Date();
  const res = await db.activeEffect.updateMany({
    where: {
      ...(userId ? { userId } : {}),
      status: 'ACTIVE',
      expiresAt: { lte: now },
    },
    data: {
      status: 'EXPIRED',
      terminalReason: 'DURATION_EXHAUSTED',
      endedAt: now,
    },
  });
  return res.count;
}

/**
 * Checks whether the user has an active, unexpired FEATURE_ENTITLEMENT or EXPORT_ENTITLEMENT
 * for a given featureKey.
 */
export async function getActiveFeatureEntitlement(userId: string, featureKey: string) {
  await expireStaleActiveEffects(userId);
  const now = new Date();
  const effects = await db.activeEffect.findMany({
    where: {
      userId,
      status: 'ACTIVE',
      effectKind: { in: ['FEATURE_ENTITLEMENT', 'EXPORT_ENTITLEMENT'] },
      AND: [
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        { OR: [{ remainingUses: null }, { remainingUses: { gt: 0 } }] },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });

  return (
    effects.find((e) => {
      const cfg = (e.config ?? {}) as { featureKey?: string };
      return cfg.featureKey === featureKey;
    }) ?? null
  );
}

/**
 * Consumes 1 use of an EXPORT_ENTITLEMENT (e.g., Share Studio Pass or Victory Portrait)
 * strictly after a confirmed export.
 */
export async function consumeExportEntitlement(params: {
  userId: string;
  featureKey: string;
  eventId: string;
  targetModule: string;
}): Promise<{ consumed: boolean; activeEffectId?: string; remainingUses?: number | null }> {
  const effect = await getActiveFeatureEntitlement(params.userId, params.featureKey);
  if (!effect) return { consumed: false };

  const now = new Date();
  return db.$transaction(async (tx) => {
    const fresh = await tx.activeEffect.findUnique({ where: { id: effect.id } });
    if (!fresh || fresh.status !== 'ACTIVE') return { consumed: false };
    if (fresh.expiresAt && fresh.expiresAt <= now) {
      await tx.activeEffect.update({
        where: { id: fresh.id },
        data: { status: 'EXPIRED', terminalReason: 'DURATION_EXHAUSTED', endedAt: now },
      });
      return { consumed: false };
    }

    const nextUses = fresh.remainingUses !== null ? Math.max(0, fresh.remainingUses - 1) : null;
    const exhausted = nextUses !== null && nextUses <= 0;

    await tx.activeEffect.update({
      where: { id: fresh.id },
      data: {
        remainingUses: nextUses,
        status: exhausted ? 'EXHAUSTED' : 'ACTIVE',
        terminalReason: exhausted ? 'USAGE_EXHAUSTED' : null,
        endedAt: exhausted ? now : null,
      },
    });

    await tx.effectExecution.create({
      data: {
        activeEffectId: fresh.id,
        eventId: params.eventId,
        targetModule: params.targetModule,
        result: 'APPLIED',
        consumedUses: 1,
        bonusPointsAwarded: 0,
      },
    });

    return { consumed: true, activeEffectId: fresh.id, remainingUses: nextUses };
  });
}

/**
 * Computes Africa/Lagos day difference between two YYYY-MM-DD day keys.
 */
export function diffLagosDayKeys(laterKey: string, earlierKey: string): number {
  const [y1, m1, d1] = laterKey.split('-').map(Number);
  const [y2, m2, d2] = earlierKey.split('-').map(Number);
  if (!y1 || !m1 || !d1 || !y2 || !m2 || !d2) return 0;
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((t1 - t2) / 86400000);
}
