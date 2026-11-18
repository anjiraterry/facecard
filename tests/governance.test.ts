/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', async () => {
  const { createFakeDb } = await import('./helpers/fakeDb');
  const db = createFakeDb();
  return { db, default: db };
});

import { db as rawDb } from '@/lib/db';
import { createFaceOff, joinFaceOff, resolveFaceOff } from '@/lib/faceoff';
import { reconcileLedger, reconcileAllLedgers } from '@/lib/ledger';
import { hashStaffPassword, verifyStaffPassword } from '@/lib/admin/auth';
import { DEFAULT_ROLE_DEFINITIONS, hasPermission } from '@/lib/admin/permissions';
import { FaceOffMode, FaceOffStatus, Tier } from '@prisma/client';

const db = rawDb as any;

function reset() {
  for (const table of [db.user, db.pointsLedger, db.faceOff, db.scan, db.faceOffAttempt]) {
    table.rows.length = 0;
  }
}

describe('Governance, Ledger Reconciliation, Arena Tie Cap & Staff RBAC', () => {
  beforeEach(reset);

  it('reconcileLedger reports zero drift for staked Face-Off winner (Finding 02)', async () => {
    const challenger = await db.user.create({
      data: { spendableBalance: 200, lifetimePoints: 200, tier: Tier.CLASSIC },
    });
    const opponent = await db.user.create({
      data: { spendableBalance: 200, lifetimePoints: 200, tier: Tier.CLASSIC },
    });

    // Seed initial ledger rows so initial balances match ledger
    await db.pointsLedger.create({
      data: {
        userId: challenger.id,
        type: 'SIGNUP',
        amount: 200,
        balanceKind: 'SPENDABLE',
        idempotencyKey: 'init:c:s',
      },
    });
    await db.pointsLedger.create({
      data: {
        userId: challenger.id,
        type: 'SIGNUP',
        amount: 200,
        balanceKind: 'LIFETIME',
        idempotencyKey: 'init:c:l',
      },
    });
    await db.pointsLedger.create({
      data: {
        userId: opponent.id,
        type: 'SIGNUP',
        amount: 200,
        balanceKind: 'SPENDABLE',
        idempotencyKey: 'init:o:s',
      },
    });
    await db.pointsLedger.create({
      data: {
        userId: opponent.id,
        type: 'SIGNUP',
        amount: 200,
        balanceKind: 'LIFETIME',
        idempotencyKey: 'init:o:l',
      },
    });

    const duel = await createFaceOff({
      challengerId: challenger.id,
      mode: FaceOffMode.STAKED,
      stakeAmount: 100,
    });
    await joinFaceOff(duel.id, opponent.id);

    const cScan = await db.scan.create({ data: { userId: challenger.id, score: 91 } });
    const oScan = await db.scan.create({ data: { userId: opponent.id, score: 80 } });
    await db.faceOff.update({
      where: { id: duel.id },
      data: { challengerBestScanId: cScan.id, opponentBestScanId: oScan.id },
    });

    const outcome = await resolveFaceOff(duel.id);
    expect(outcome.winnerId).toBe(challenger.id);
    expect(outcome.systemFee).toBe(10);

    const winnerRecon = await reconcileLedger(challenger.id);
    expect(winnerRecon.reconciled).toBe(true);
    expect(winnerRecon.drift).toBe(0);

    const loserRecon = await reconcileLedger(opponent.id);
    expect(loserRecon.reconciled).toBe(true);
    expect(loserRecon.drift).toBe(0);

    const globalRecon = await reconcileAllLedgers();
    expect(globalRecon.drifted).toHaveLength(0);
  });

  it('caps tie rematches at 1 and refunds both players on 2nd tie (Finding 05)', async () => {
    const challenger = await db.user.create({ data: { spendableBalance: 200, tier: Tier.CLASSIC } });
    const opponent = await db.user.create({ data: { spendableBalance: 200, tier: Tier.CLASSIC } });

    const duel = await createFaceOff({
      challengerId: challenger.id,
      mode: FaceOffMode.STAKED,
      stakeAmount: 100,
    });
    await joinFaceOff(duel.id, opponent.id);

    const cScan1 = await db.scan.create({ data: { userId: challenger.id, score: 85 } });
    const oScan1 = await db.scan.create({ data: { userId: opponent.id, score: 85 } });
    await db.faceOff.update({
      where: { id: duel.id },
      data: { challengerBestScanId: cScan1.id, opponentBestScanId: oScan1.id },
    });

    // 1st tie -> TIE_REMATCH
    const first = await resolveFaceOff(duel.id);
    expect(first.status).toBe('TIE_REMATCH');

    // 2nd tie -> COMPLETED (DRAW_REFUNDED) and both get 100 PTS back
    const second = await resolveFaceOff(duel.id);
    expect(second.status).toBe('COMPLETED');
    expect(second.outcome).toBe('DRAW_REFUNDED');

    const freshC = await db.user.findUnique({ where: { id: challenger.id } });
    const freshO = await db.user.findUnique({ where: { id: opponent.id } });
    expect(freshC.spendableBalance).toBe(200);
    expect(freshO.spendableBalance).toBe(200);

    const finalDuel = await db.faceOff.findUnique({ where: { id: duel.id } });
    expect(finalDuel.status).toBe(FaceOffStatus.COMPLETED);
  });

  it('hashes & verifies independent staff passwords and enforces granular RBAC permissions', () => {
    const hash = hashStaffPassword('StrongStaffPass!2026');
    expect(hash.startsWith('scrypt:')).toBe(true);
    expect(verifyStaffPassword('StrongStaffPass!2026', hash)).toBe(true);
    expect(verifyStaffPassword('WrongPassword', hash)).toBe(false);

    const support = DEFAULT_ROLE_DEFINITIONS.find((r) => r.slug === 'support_agent')!;
    const moderator = DEFAULT_ROLE_DEFINITIONS.find((r) => r.slug === 'moderator')!;

    expect(hasPermission(support.permissions, 'users.read')).toBe(true);
    expect(hasPermission(support.permissions, 'users.request_suspension')).toBe(true);
    expect(hasPermission(support.permissions, 'users.approve_suspension')).toBe(false);
    expect(hasPermission(support.permissions, 'users.read_contact_information')).toBe(false);

    expect(hasPermission(moderator.permissions, 'users.approve_suspension')).toBe(true);
    expect(hasPermission(moderator.permissions, 'economy.adjust')).toBe(false);
  });
});
