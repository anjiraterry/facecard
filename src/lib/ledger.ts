import { db } from '@/lib/db';
import { LedgerType, BalanceKind } from '@prisma/client';

export type LedgerEntryType = 
  | 'SCAN' 
  | 'FACEOFF_STAKE_HOLD' 
  | 'FACEOFF_PAYOUT' 
  | 'FACEOFF_REFUND' 
  | 'FACEOFF_FEE' 
  | 'FACEOFF_WIN_BONUS' 
  | 'SHOP_PURCHASE' 
  | 'ADJUSTMENT';

export type LedgerBalanceKind = 'LIFETIME' | 'SPENDABLE';

export interface RecordTransactionParams {
  userId: string;
  type: LedgerType | LedgerEntryType;
  amount: number; // positive for credit, negative for debit
  balanceKind: BalanceKind | LedgerBalanceKind;
  description?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface UserBalances {
  lifetimePoints: number;
  spendableBalance: number;
}

/**
 * Record a transaction into the append-only ledger and update cached balances atomically.
 */
export async function recordPointsTransaction(params: RecordTransactionParams): Promise<{
  success: boolean;
  newBalance: number;
  transactionId: string;
}> {
  const { userId, type, amount, balanceKind, description, idempotencyKey } = params;

  try {
    // Attempt database transaction
    return await db.$transaction(async (tx) => {
      // Find user
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, lifetimePoints: true, spendableBalance: true },
      });

      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      // Check balance limit on debits
      if (balanceKind === 'SPENDABLE' && amount < 0 && user.spendableBalance + amount < 0) {
        throw new Error(`Insufficient spendable points: balance=${user.spendableBalance}, required=${Math.abs(amount)}`);
      }

      const newLifetime = balanceKind === 'LIFETIME' 
        ? Math.max(0, user.lifetimePoints + amount) 
        : user.lifetimePoints;

      const newSpendable = balanceKind === 'SPENDABLE'
        ? Math.max(0, user.spendableBalance + amount)
        : user.spendableBalance;

      // Update user cached balance
      await tx.user.update({
        where: { id: userId },
        data: {
          lifetimePoints: newLifetime,
          spendableBalance: newSpendable,
        },
      });

      // Insert append-only ledger record
      const ledgerRecord = await tx.pointsLedger.create({
        data: {
          userId,
          type: type as LedgerType,
          amount,
          balanceKind: balanceKind as BalanceKind,
          refType: type,
          refId: description || `${type} transaction of ${amount} PTS`,
          idempotencyKey: idempotencyKey || `${userId}-${type}-${Date.now()}-${Math.random()}`,
        },
      });

      return {
        success: true,
        newBalance: balanceKind === 'SPENDABLE' ? newSpendable : newLifetime,
        transactionId: ledgerRecord.id,
      };
    });
  } catch (error) {
    console.error(`Ledger transaction error: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Audit and reconcile points ledger against cached user balances (Phase 9.2 in PLAN.md).
 */
export async function reconcileLedger(userId: string): Promise<{
  reconciled: boolean;
  cachedLifetime: number;
  calculatedLifetime: number;
  cachedSpendable: number;
  calculatedSpendable: number;
  drift: number;
}> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { lifetimePoints: true, spendableBalance: true },
  });

  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  const lifetimeEntries = await db.pointsLedger.aggregate({
    where: { userId, balanceKind: BalanceKind.LIFETIME },
    _sum: { amount: true },
  });

  const spendableEntries = await db.pointsLedger.aggregate({
    where: { userId, balanceKind: BalanceKind.SPENDABLE },
    _sum: { amount: true },
  });

  const calculatedLifetime = lifetimeEntries._sum.amount || 0;
  const calculatedSpendable = spendableEntries._sum.amount || 0;
  const drift = Math.abs(user.spendableBalance - calculatedSpendable);

  return {
    reconciled: drift === 0,
    cachedLifetime: user.lifetimePoints,
    calculatedLifetime,
    cachedSpendable: user.spendableBalance,
    calculatedSpendable,
    drift,
  };
}
