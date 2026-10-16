import { Prisma, LedgerType, BalanceKind } from '@prisma/client';
import { db } from '@/lib/db';
import { EconomyConfig } from '@/lib/economy';
import { getTierFromLifetimePoints } from '@/lib/scoring';

/**
 * Single choke point for every points movement.
 *
 * Invariants enforced here (and backed by DB constraints in migration 2_points_integrity):
 *  - Every movement is one append-only PointsLedger row, written BEFORE the balance cache changes,
 *    keyed by a caller-supplied deterministic idempotency key (unique per key + balance kind).
 *  - Debits are a single conditional UPDATE (`spendableBalance >= amount`), so concurrent spends
 *    can never overdraw, regardless of what the caller read earlier.
 *  - LIFETIME only ever increases; tier is recomputed from it and never lowered.
 *
 * Always call inside a `db.$transaction` so the ledger row, balance and the caller's own
 * writes commit or roll back together.
 */
export type LedgerTx = Prisma.TransactionClient;

export class InsufficientBalanceError extends Error {
  readonly code = 'INSUFFICIENT_BALANCE';
  constructor(public readonly required: number) {
    super(`Insufficient spendable points: ${required} required.`);
  }
}

export class DuplicateLedgerEntryError extends Error {
  readonly code = 'DUPLICATE_LEDGER_ENTRY';
  constructor(public readonly idempotencyKey: string) {
    super(`Ledger entry already recorded for key ${idempotencyKey}`);
  }
}

export interface LedgerPost {
  userId: string;
  type: LedgerType;
  /** Signed integer. Positive credits, negative debits. Never zero. */
  amount: number;
  balanceKind: BalanceKind;
  refType?: string;
  refId?: string;
  /** Deterministic key derived from the business event (e.g. `scan:<scanId>`), never from the clock. */
  idempotencyKey: string;
}

export function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002';
}

export async function postLedger(tx: LedgerTx, entry: LedgerPost): Promise<void> {
  const { userId, type, amount, balanceKind, refType, refId, idempotencyKey } = entry;

  if (!Number.isSafeInteger(amount) || amount === 0) {
    throw new Error(`Invalid ledger amount: ${amount}`);
  }
  if (balanceKind === 'LIFETIME' && amount < 0) {
    throw new Error('Lifetime points can never decrease.');
  }
  if (!idempotencyKey) {
    throw new Error('A deterministic idempotencyKey is required.');
  }

  // 1. Ledger row first: a duplicate key fails here and rolls the whole transaction back.
  try {
    await tx.pointsLedger.create({
      data: { userId, type, amount, balanceKind, refType, refId, idempotencyKey },
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new DuplicateLedgerEntryError(idempotencyKey);
    throw error;
  }

  // 2. Balance cache.
  if (balanceKind === 'SPENDABLE') {
    if (amount < 0) {
      const debited = await tx.user.updateMany({
        where: { id: userId, spendableBalance: { gte: -amount } },
        data: { spendableBalance: { decrement: -amount } },
      });
      if (debited.count === 0) throw new InsufficientBalanceError(-amount);
    } else {
      await tx.user.update({ where: { id: userId }, data: { spendableBalance: { increment: amount } } });
    }
    return;
  }

  const updated = await tx.user.update({
    where: { id: userId },
    data: { lifetimePoints: { increment: amount } },
    select: { lifetimePoints: true, tier: true },
  });
  const tier = getTierFromLifetimePoints(updated.lifetimePoints);
  if (tier !== updated.tier) {
    await tx.user.update({ where: { id: userId }, data: { tier } });
  }
}

/** Credits the welcome grant to both balances, fully ledgered. Idempotent per user. */
export async function grantSignupBonus(tx: LedgerTx, userId: string): Promise<void> {
  const amount = EconomyConfig.SIGNUP_GRANT_POINTS;
  if (amount <= 0) return;
  for (const balanceKind of ['SPENDABLE', 'LIFETIME'] as const) {
    await postLedger(tx, {
      userId,
      type: 'ADJUSTMENT',
      amount,
      balanceKind,
      refType: 'SIGNUP_GRANT',
      refId: userId,
      idempotencyKey: `signup-grant:${userId}`,
    });
  }
}

export interface LedgerReconciliation {
  reconciled: boolean;
  cachedLifetime: number;
  calculatedLifetime: number;
  cachedSpendable: number;
  calculatedSpendable: number;
  driftLifetime: number;
  driftSpendable: number;
  /** Total absolute drift across both balances. */
  drift: number;
}

function summarize(
  cached: { lifetimePoints: number; spendableBalance: number },
  calc: { lifetime: number; spendable: number }
): LedgerReconciliation {
  const driftLifetime = cached.lifetimePoints - calc.lifetime;
  const driftSpendable = cached.spendableBalance - calc.spendable;
  return {
    reconciled: driftLifetime === 0 && driftSpendable === 0,
    cachedLifetime: cached.lifetimePoints,
    calculatedLifetime: calc.lifetime,
    cachedSpendable: cached.spendableBalance,
    calculatedSpendable: calc.spendable,
    driftLifetime,
    driftSpendable,
    drift: Math.abs(driftLifetime) + Math.abs(driftSpendable),
  };
}

/** Compares one user's cached balances with the sum of their ledger rows (both balance kinds). */
export async function reconcileLedger(userId: string): Promise<LedgerReconciliation> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { lifetimePoints: true, spendableBalance: true },
  });
  if (!user) throw new Error(`User not found: ${userId}`);

  const [lifetime, spendable] = await Promise.all([
    db.pointsLedger.aggregate({ where: { userId, balanceKind: 'LIFETIME' }, _sum: { amount: true } }),
    db.pointsLedger.aggregate({ where: { userId, balanceKind: 'SPENDABLE' }, _sum: { amount: true } }),
  ]);

  return summarize(user, {
    lifetime: lifetime._sum.amount ?? 0,
    spendable: spendable._sum.amount ?? 0,
  });
}

/** Reconciles every user in two grouped queries. Returns only users whose balances drift. */
export async function reconcileAllLedgers(): Promise<{
  usersChecked: number;
  drifted: Array<{ userId: string } & LedgerReconciliation>;
}> {
  const [users, sums] = await Promise.all([
    db.user.findMany({ select: { id: true, lifetimePoints: true, spendableBalance: true } }),
    db.pointsLedger.groupBy({ by: ['userId', 'balanceKind'], _sum: { amount: true } }),
  ]);

  const calc = new Map<string, { lifetime: number; spendable: number }>();
  for (const row of sums) {
    const entry = calc.get(row.userId) ?? { lifetime: 0, spendable: 0 };
    if (row.balanceKind === 'LIFETIME') entry.lifetime = row._sum.amount ?? 0;
    else entry.spendable = row._sum.amount ?? 0;
    calc.set(row.userId, entry);
  }

  const drifted = [];
  for (const user of users) {
    const result = summarize(user, calc.get(user.id) ?? { lifetime: 0, spendable: 0 });
    if (!result.reconciled) drifted.push({ userId: user.id, ...result });
  }
  return { usersChecked: users.length, drifted };
}
