/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', async () => {
  const { createFakeDb } = await import('./helpers/fakeDb');
  const db = createFakeDb();
  return { db, default: db };
});

import { db as rawDb } from '@/lib/db';
import {
  calculateScanPoints,
  getStreakMultiplier,
  getTierFromLifetimePoints,
  getLagosDayKey,
  getYesterdayLagosDayKey,
} from '@/lib/scoring';
import {
  postLedger,
  grantSignupBonus,
  reconcileLedger,
  reconcileAllLedgers,
  InsufficientBalanceError,
  DuplicateLedgerEntryError,
} from '@/lib/ledger';

const db = rawDb as any;

function reset() {
  for (const table of [db.user, db.pointsLedger]) table.rows.length = 0;
}

describe('Phase 5 & Phase 2: Points Economy & Ledger Integrity', () => {
  beforeEach(reset);

  describe('Pure Economy Calculations', () => {
    it('should compute day keys correctly in Africa/Lagos (WAT, UTC+1)', () => {
      const today = getLagosDayKey();
      const yesterday = getYesterdayLagosDayKey();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(yesterday).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(today).not.toBe(yesterday);
    });

    it('should enforce the daily scan point economy (Scan 1 = 100%, Scans 2 & 3 = 50%)', () => {
      const score = 80;
      expect(calculateScanPoints(score, 1, 1)).toBe(80);
      expect(calculateScanPoints(score, 2, 1)).toBe(40);
      expect(calculateScanPoints(score, 3, 1)).toBe(40);
    });

    it('should apply the exact streak multiplier ladder', () => {
      expect(getStreakMultiplier(1)).toBe(1.0);
      expect(getStreakMultiplier(2)).toBe(1.0);
      expect(getStreakMultiplier(3)).toBe(1.1);
      expect(getStreakMultiplier(6)).toBe(1.1);
      expect(getStreakMultiplier(7)).toBe(1.25);
      expect(getStreakMultiplier(13)).toBe(1.25);
      expect(getStreakMultiplier(14)).toBe(1.5);
      expect(getStreakMultiplier(29)).toBe(1.5);
      expect(getStreakMultiplier(30)).toBe(2.0);
      expect(getStreakMultiplier(100)).toBe(2.0);
    });

    it('should promote user through tiers at exact threshold boundaries', () => {
      expect(getTierFromLifetimePoints(0)).toBe('CLASSIC');
      expect(getTierFromLifetimePoints(999)).toBe('CLASSIC');
      expect(getTierFromLifetimePoints(1000)).toBe('GOLD');
      expect(getTierFromLifetimePoints(4999)).toBe('GOLD');
      expect(getTierFromLifetimePoints(5000)).toBe('PLATINUM');
      expect(getTierFromLifetimePoints(19999)).toBe('PLATINUM');
      expect(getTierFromLifetimePoints(20000)).toBe('BLACK');
      expect(getTierFromLifetimePoints(100000)).toBe('BLACK');
    });

    it('should combine score, scan index, and streak multiplier in calculation', () => {
      const score = 90;
      const streakDays = 7;
      expect(calculateScanPoints(score, 1, streakDays)).toBe(Math.round(90 * 1.25));
    });
  });

  describe('Transactional Ledger Service (postLedger)', () => {
    it('credits spendable and lifetime points and creates ledger rows', async () => {
      const user = await db.user.create({ data: { displayName: 'Tester' } });

      await postLedger(db, {
        userId: user.id,
        type: 'SCAN',
        amount: 50,
        balanceKind: 'SPENDABLE',
        idempotencyKey: 'scan:1:spendable',
      });

      await postLedger(db, {
        userId: user.id,
        type: 'SCAN',
        amount: 50,
        balanceKind: 'LIFETIME',
        idempotencyKey: 'scan:1:lifetime',
      });

      const updated = await db.user.findUnique({ where: { id: user.id } });
      expect(updated.spendableBalance).toBe(50);
      expect(updated.lifetimePoints).toBe(50);
      expect(db.pointsLedger.rows).toHaveLength(2);
    });

    it('debits spendable balance atomically when balance is sufficient', async () => {
      const user = await db.user.create({
        data: { displayName: 'Spender', spendableBalance: 100 },
      });

      await postLedger(db, {
        userId: user.id,
        type: 'SHOP_PURCHASE',
        amount: -40,
        balanceKind: 'SPENDABLE',
        idempotencyKey: 'shop:item-1',
      });

      const updated = await db.user.findUnique({ where: { id: user.id } });
      expect(updated.spendableBalance).toBe(60);
      expect(db.pointsLedger.rows[0].amount).toBe(-40);
    });

    it('rejects debit and throws InsufficientBalanceError when balance is too low', async () => {
      const user = await db.user.create({
        data: { displayName: 'Low Balance', spendableBalance: 30 },
      });

      await expect(
        postLedger(db, {
          userId: user.id,
          type: 'SHOP_PURCHASE',
          amount: -50,
          balanceKind: 'SPENDABLE',
          idempotencyKey: 'shop:item-too-expensive',
        })
      ).rejects.toThrow(InsufficientBalanceError);

      const unchanged = await db.user.findUnique({ where: { id: user.id } });
      expect(unchanged.spendableBalance).toBe(30);
    });

    it('rejects negative lifetime adjustments', async () => {
      const user = await db.user.create({ data: { displayName: 'User' } });

      await expect(
        postLedger(db, {
          userId: user.id,
          type: 'ADJUSTMENT',
          amount: -10,
          balanceKind: 'LIFETIME',
          idempotencyKey: 'illegal-negative-lifetime',
        })
      ).rejects.toThrow(/Lifetime points can never decrease/i);
    });

    it('automatically promotes user tier when lifetime points cross boundary', async () => {
      const user = await db.user.create({
        data: { displayName: 'Rising Star', lifetimePoints: 950, tier: 'CLASSIC' },
      });

      await postLedger(db, {
        userId: user.id,
        type: 'SCAN',
        amount: 100,
        balanceKind: 'LIFETIME',
        idempotencyKey: 'scan:tier-up',
      });

      const updated = await db.user.findUnique({ where: { id: user.id } });
      expect(updated.lifetimePoints).toBe(1050);
      expect(updated.tier).toBe('GOLD');
    });

    it('rejects duplicate idempotency key and prevents duplicate point mutations', async () => {
      const user = await db.user.create({ data: { displayName: 'Replay User' } });

      await postLedger(db, {
        userId: user.id,
        type: 'SCAN',
        amount: 80,
        balanceKind: 'SPENDABLE',
        idempotencyKey: 'scan:unique-101',
      });

      await expect(
        postLedger(db, {
          userId: user.id,
          type: 'SCAN',
          amount: 80,
          balanceKind: 'SPENDABLE',
          idempotencyKey: 'scan:unique-101',
        })
      ).rejects.toThrow(DuplicateLedgerEntryError);

      const userCheck = await db.user.findUnique({ where: { id: user.id } });
      expect(userCheck.spendableBalance).toBe(80); // Credited only once
    });
  });

  describe('Signup Grant & Ledger Reconciliation', () => {
    it('grantSignupBonus credits both spendable and lifetime with ledger rows', async () => {
      const user = await db.user.create({ data: { displayName: 'Newbie' } });

      await grantSignupBonus(db, user.id);

      const fresh = await db.user.findUnique({ where: { id: user.id } });
      expect(fresh.spendableBalance).toBe(100);
      expect(fresh.lifetimePoints).toBe(100);
      expect(db.pointsLedger.rows).toHaveLength(2);

      // Re-calling grantSignupBonus is idempotent and doesn't duplicate
      await expect(grantSignupBonus(db, user.id)).rejects.toThrow(DuplicateLedgerEntryError);
    });

    it('reconcileLedger reports zero drift when balances match ledger records', async () => {
      const user = await db.user.create({ data: { displayName: 'Audited User' } });
      await grantSignupBonus(db, user.id);

      const result = await reconcileLedger(user.id);
      expect(result.reconciled).toBe(true);
      expect(result.drift).toBe(0);
      expect(result.cachedSpendable).toBe(100);
      expect(result.calculatedSpendable).toBe(100);
      expect(result.cachedLifetime).toBe(100);
      expect(result.calculatedLifetime).toBe(100);
    });

    it('reconcileLedger accurately flags drift when cache is out of sync with ledger', async () => {
      const user = await db.user.create({
        data: { displayName: 'Corrupted User', spendableBalance: 250, lifetimePoints: 200 },
      });
      // Suppose ledger only recorded 100 pts
      await db.pointsLedger.create({
        data: {
          userId: user.id,
          type: 'ADJUSTMENT',
          amount: 100,
          balanceKind: 'SPENDABLE',
          idempotencyKey: 'audit-test-1',
        },
      });

      const result = await reconcileLedger(user.id);
      expect(result.reconciled).toBe(false);
      expect(result.driftSpendable).toBe(150); // 250 - 100
      expect(result.driftLifetime).toBe(200);  // 200 - 0
      expect(result.drift).toBe(350);
    });

    it('reconcileAllLedgers checks all users and returns drifted accounts', async () => {
      const u1 = await db.user.create({ data: { displayName: 'User 1' } });
      await grantSignupBonus(db, u1.id);

      const u2 = await db.user.create({
        data: { displayName: 'Drifted User', spendableBalance: 50 },
      }); // No ledger entries

      const globalResult = await reconcileAllLedgers();
      expect(globalResult.usersChecked).toBe(2);
      expect(globalResult.drifted).toHaveLength(1);
      expect(globalResult.drifted[0].userId).toBe(u2.id);
      expect(globalResult.drifted[0].driftSpendable).toBe(50);
    });
  });
});
