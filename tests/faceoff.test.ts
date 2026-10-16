/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', async () => {
  const { createFakeDb } = await import('./helpers/fakeDb');
  const db = createFakeDb();
  return { db, default: db };
});

import { db as rawDb } from '@/lib/db';
import { EconomyConfig } from '@/lib/economy';
import {
  createFaceOff,
  joinFaceOff,
  resolveFaceOff,
  cancelFaceOff,
  expireStaleDuels,
  FaceOffError,
  generateInviteCode,
} from '@/lib/faceoff';
import { FaceOffMode, FaceOffStatus, Tier } from '@prisma/client';

const db = rawDb as any;

function reset() {
  for (const table of [db.user, db.pointsLedger, db.faceOff, db.scan, db.faceOffAttempt]) {
    table.rows.length = 0;
  }
}

describe('Phase 3 & Phase 8: Face-Off PvP Arena Engine & Integrity', () => {
  beforeEach(reset);

  describe('Pure Arena Economics & Rules', () => {
    it('should calculate 5% system fee and pot payout accurately for staked duels', () => {
      const stake = 200;
      const totalPot = stake * 2; // 400 pts
      const systemFee = Math.round(totalPot * EconomyConfig.ARENA.SYSTEM_FEE_PERCENT); // 5% = 20 pts
      const payout = totalPot - systemFee; // 380 pts
      const winBonus = EconomyConfig.ARENA.WIN_BONUS_POINTS; // 25 pts
      const totalWinnerGain = payout + winBonus; // 405 pts

      expect(totalPot).toBe(400);
      expect(systemFee).toBe(20);
      expect(payout).toBe(380);
      expect(winBonus).toBe(25);
      expect(totalWinnerGain).toBe(405);
    });

    it('should calculate 0 fee and 0 payout for friendly duels', () => {
      const stake = 0;
      const totalPot = stake * 2;
      const systemFee = Math.round(totalPot * EconomyConfig.ARENA.SYSTEM_FEE_PERCENT);
      const payout = totalPot - systemFee;

      expect(totalPot).toBe(0);
      expect(systemFee).toBe(0);
      expect(payout).toBe(0);
    });

    it('should generate a 6-character uppercase alphanumeric invite code', () => {
      const code1 = generateInviteCode();
      const code2 = generateInviteCode();
      expect(code1).toMatch(/^[A-Z0-9]{6}$/);
      expect(code2).toMatch(/^[A-Z0-9]{6}$/);
      expect(code1).not.toBe(code2);
    });

    it('should enforce 24-hour expiry limit and 3-attempt limit', () => {
      expect(EconomyConfig.ARENA.EXPIRY_MINUTES).toBe(1440);
      expect(EconomyConfig.ARENA.ATTEMPTS_PER_DUEL).toBe(3);
    });
  });

  describe('createFaceOff', () => {
    it('should reject invalid stake amounts outside allowed options', async () => {
      const user = await db.user.create({ data: { spendableBalance: 500, tier: Tier.CLASSIC } });
      await expect(
        createFaceOff({
          challengerId: user.id,
          mode: FaceOffMode.STAKED,
          stakeAmount: 75, // 75 is not in [50, 100, 250, 500]
        })
      ).rejects.toThrow(FaceOffError);
    });

    it('should reject if challenger has insufficient spendable points', async () => {
      const user = await db.user.create({ data: { spendableBalance: 40, tier: Tier.CLASSIC } });
      await expect(
        createFaceOff({
          challengerId: user.id,
          mode: FaceOffMode.STAKED,
          stakeAmount: 100,
        })
      ).rejects.toThrow(FaceOffError);
    });

    it('should escrow stake from challenger balance and create waiting duel', async () => {
      const user = await db.user.create({ data: { spendableBalance: 200, tier: Tier.CLASSIC } });
      const duel = await createFaceOff({
        challengerId: user.id,
        mode: FaceOffMode.STAKED,
        stakeAmount: 100,
      });

      expect(duel.status).toBe(FaceOffStatus.WAITING);
      expect(duel.stake).toBe(100);

      // Verify challenger balance debited atomically
      const updatedUser = await db.user.findUnique({ where: { id: user.id } });
      expect(updatedUser.spendableBalance).toBe(100);

      // Verify ledger hold entry
      const hold = await db.pointsLedger.findFirst({ where: { userId: user.id, type: 'FACEOFF_STAKE_HOLD' } });
      expect(hold).toBeTruthy();
      expect(hold.amount).toBe(-100);
    });

    it('should create friendly duels without deducting points', async () => {
      const user = await db.user.create({ data: { spendableBalance: 10, tier: Tier.CLASSIC } });
      const duel = await createFaceOff({
        challengerId: user.id,
        mode: FaceOffMode.FRIENDLY,
        stakeAmount: 0,
      });

      expect(duel.status).toBe(FaceOffStatus.WAITING);
      expect(duel.stake).toBe(0);

      const updatedUser = await db.user.findUnique({ where: { id: user.id } });
      expect(updatedUser.spendableBalance).toBe(10);
    });

    it('should reject challenge against oneself', async () => {
      const user = await db.user.create({ data: { handle: 'king', spendableBalance: 200, tier: Tier.CLASSIC } });
      await expect(
        createFaceOff({
          challengerId: user.id,
          mode: FaceOffMode.STAKED,
          stakeAmount: 50,
          opponentHandle: '@king',
        })
      ).rejects.toThrow(/You cannot challenge yourself/);
    });

    it('should enforce same-tier matchmaking on direct challenges', async () => {
      const challenger = await db.user.create({ data: { handle: 'challenger', spendableBalance: 200, tier: Tier.CLASSIC } });
      await db.user.create({ data: { handle: 'goldPlayer', spendableBalance: 200, tier: Tier.GOLD } });

      await expect(
        createFaceOff({
          challengerId: challenger.id,
          mode: FaceOffMode.STAKED,
          stakeAmount: 50,
          opponentHandle: 'goldPlayer',
        })
      ).rejects.toThrow(/Same-tier matchmaking/);
    });
  });

  describe('joinFaceOff', () => {
    it('should reject if creator attempts to join their own duel', async () => {
      const user = await db.user.create({ data: { spendableBalance: 200, tier: Tier.CLASSIC } });
      const duel = await createFaceOff({
        challengerId: user.id,
        mode: FaceOffMode.STAKED,
        stakeAmount: 50,
      });

      await expect(joinFaceOff(duel.id, user.id)).rejects.toThrow(/cannot join your own challenge/);
    });

    it('should reject if joining player is a different tier', async () => {
      const challenger = await db.user.create({ data: { spendableBalance: 200, tier: Tier.CLASSIC } });
      const opponent = await db.user.create({ data: { spendableBalance: 200, tier: Tier.PLATINUM } });

      const duel = await createFaceOff({
        challengerId: challenger.id,
        mode: FaceOffMode.STAKED,
        stakeAmount: 50,
      });

      await expect(joinFaceOff(duel.id, opponent.id)).rejects.toThrow(/Same-tier matchmaking/);
    });

    it('should reject if opponent has insufficient points to match stake', async () => {
      const challenger = await db.user.create({ data: { spendableBalance: 200, tier: Tier.CLASSIC } });
      const opponent = await db.user.create({ data: { spendableBalance: 20, tier: Tier.CLASSIC } });

      const duel = await createFaceOff({
        challengerId: challenger.id,
        mode: FaceOffMode.STAKED,
        stakeAmount: 50,
      });

      await expect(joinFaceOff(duel.id, opponent.id)).rejects.toThrow(/Insufficient points to match the stake/);
    });

    it('should atomically transition to ACTIVE and hold opponent stake', async () => {
      const challenger = await db.user.create({ data: { spendableBalance: 200, tier: Tier.CLASSIC } });
      const opponent = await db.user.create({ data: { spendableBalance: 200, tier: Tier.CLASSIC } });

      const duel = await createFaceOff({
        challengerId: challenger.id,
        mode: FaceOffMode.STAKED,
        stakeAmount: 100,
      });

      const joined = await joinFaceOff(duel.id, opponent.id);
      expect(joined?.status).toBe(FaceOffStatus.ACTIVE);
      expect(joined?.opponentId).toBe(opponent.id);

      // Verify opponent balance debited
      const updatedOpponent = await db.user.findUnique({ where: { id: opponent.id } });
      expect(updatedOpponent.spendableBalance).toBe(100);

      // Verify opponent stake hold
      const opponentHold = await db.pointsLedger.findFirst({
        where: { userId: opponent.id, type: 'FACEOFF_STAKE_HOLD' },
      });
      expect(opponentHold).toBeTruthy();
      expect(opponentHold.amount).toBe(-100);
    });
  });

  describe('resolveFaceOff', () => {
    it('should reject resolution if duel is not ACTIVE', async () => {
      const challenger = await db.user.create({ data: { spendableBalance: 200, tier: Tier.CLASSIC } });
      const duel = await createFaceOff({
        challengerId: challenger.id,
        mode: FaceOffMode.STAKED,
        stakeAmount: 50,
      });

      await expect(resolveFaceOff(duel.id)).rejects.toThrow(/Cannot resolve duel with status WAITING/);
    });

    it('should reject resolution if either contender has not completed a scan', async () => {
      const challenger = await db.user.create({ data: { spendableBalance: 200, tier: Tier.CLASSIC } });
      const opponent = await db.user.create({ data: { spendableBalance: 200, tier: Tier.CLASSIC } });

      const duel = await createFaceOff({
        challengerId: challenger.id,
        mode: FaceOffMode.STAKED,
        stakeAmount: 50,
      });
      await joinFaceOff(duel.id, opponent.id);

      await expect(resolveFaceOff(duel.id)).rejects.toThrow(/Both contenders must complete a scan/);
    });

    it('should award pot minus fee plus victory bonus to winner when challenger wins', async () => {
      const challenger = await db.user.create({ data: { spendableBalance: 200, tier: Tier.CLASSIC } });
      const opponent = await db.user.create({ data: { spendableBalance: 200, tier: Tier.CLASSIC } });

      const duel = await createFaceOff({
        challengerId: challenger.id,
        mode: FaceOffMode.STAKED,
        stakeAmount: 100, // Pot = 200 PTS, fee = 10 PTS (5%), payout = 190 PTS, winBonus = 25 PTS
      });
      await joinFaceOff(duel.id, opponent.id);

      // Create scans
      const cScan = await db.scan.create({ data: { userId: challenger.id, score: 92 } });
      const oScan = await db.scan.create({ data: { userId: opponent.id, score: 81 } });

      await db.faceOff.update({
        where: { id: duel.id },
        data: { challengerBestScanId: cScan.id, opponentBestScanId: oScan.id },
      });

      const outcome = await resolveFaceOff(duel.id);

      expect(outcome.winnerId).toBe(challenger.id);
      expect(outcome.totalPot).toBe(200);
      expect(outcome.systemFee).toBe(10);
      expect(outcome.payout).toBe(190);
      expect(outcome.winBonus).toBe(25);

      // Winner spendable balance should be initial (200) - stake (100) + payout (190) + winBonus (25) = 315 PTS
      const freshChallenger = await db.user.findUnique({ where: { id: challenger.id } });
      expect(freshChallenger.spendableBalance).toBe(315);

      // Loser spendable balance remains 200 - 100 = 100 PTS
      const freshOpponent = await db.user.findUnique({ where: { id: opponent.id } });
      expect(freshOpponent.spendableBalance).toBe(100);
    });

    it('should award pot to opponent when opponent wins', async () => {
      const challenger = await db.user.create({ data: { spendableBalance: 200, tier: Tier.CLASSIC } });
      const opponent = await db.user.create({ data: { spendableBalance: 200, tier: Tier.CLASSIC } });

      const duel = await createFaceOff({
        challengerId: challenger.id,
        mode: FaceOffMode.STAKED,
        stakeAmount: 100,
      });
      await joinFaceOff(duel.id, opponent.id);

      const cScan = await db.scan.create({ data: { userId: challenger.id, score: 75 } });
      const oScan = await db.scan.create({ data: { userId: opponent.id, score: 88 } });

      await db.faceOff.update({
        where: { id: duel.id },
        data: { challengerBestScanId: cScan.id, opponentBestScanId: oScan.id },
      });

      const outcome = await resolveFaceOff(duel.id);
      expect(outcome.winnerId).toBe(opponent.id);

      const freshOpponent = await db.user.findUnique({ where: { id: opponent.id } });
      expect(freshOpponent.spendableBalance).toBe(315);
    });

    it('should handle tie match by triggering TIE_REMATCH without distributing pot', async () => {
      const challenger = await db.user.create({ data: { spendableBalance: 200, tier: Tier.CLASSIC } });
      const opponent = await db.user.create({ data: { spendableBalance: 200, tier: Tier.CLASSIC } });

      const duel = await createFaceOff({
        challengerId: challenger.id,
        mode: FaceOffMode.STAKED,
        stakeAmount: 100,
      });
      await joinFaceOff(duel.id, opponent.id);

      const cScan = await db.scan.create({ data: { userId: challenger.id, score: 85 } });
      const oScan = await db.scan.create({ data: { userId: opponent.id, score: 85 } });

      await db.faceOff.update({
        where: { id: duel.id },
        data: { challengerBestScanId: cScan.id, opponentBestScanId: oScan.id },
      });

      const outcome = await resolveFaceOff(duel.id);
      expect(outcome.status).toBe('TIE_REMATCH');
      expect(outcome.outcome).toBe('TIE');

      const duelState = await db.faceOff.findUnique({ where: { id: duel.id } });
      expect(duelState.status).toBe(FaceOffStatus.TIE_REMATCH);
      expect(duelState.rematchCount).toBe(1);

      // Neither user received payout
      const freshC = await db.user.findUnique({ where: { id: challenger.id } });
      const freshO = await db.user.findUnique({ where: { id: opponent.id } });
      expect(freshC.spendableBalance).toBe(100);
      expect(freshO.spendableBalance).toBe(100);
    });

    it('should prevent double settlement with 409 conflict', async () => {
      const challenger = await db.user.create({ data: { spendableBalance: 200, tier: Tier.CLASSIC } });
      const opponent = await db.user.create({ data: { spendableBalance: 200, tier: Tier.CLASSIC } });

      const duel = await createFaceOff({
        challengerId: challenger.id,
        mode: FaceOffMode.STAKED,
        stakeAmount: 100,
      });
      await joinFaceOff(duel.id, opponent.id);

      const cScan = await db.scan.create({ data: { userId: challenger.id, score: 90 } });
      const oScan = await db.scan.create({ data: { userId: opponent.id, score: 80 } });

      await db.faceOff.update({
        where: { id: duel.id },
        data: { challengerBestScanId: cScan.id, opponentBestScanId: oScan.id },
      });

      await resolveFaceOff(duel.id);

      // Second attempt to resolve must fail
      await expect(resolveFaceOff(duel.id)).rejects.toThrow(/Cannot resolve duel with status COMPLETED/);
    });
  });

  describe('cancelFaceOff & expireStaleDuels', () => {
    it('should allow challenger to cancel WAITING duel and refund stake', async () => {
      const user = await db.user.create({ data: { spendableBalance: 200, tier: Tier.CLASSIC } });
      const duel = await createFaceOff({
        challengerId: user.id,
        mode: FaceOffMode.STAKED,
        stakeAmount: 100,
      });

      expect(user.spendableBalance).toBe(200);
      const afterCreate = await db.user.findUnique({ where: { id: user.id } });
      expect(afterCreate.spendableBalance).toBe(100);

      const result = await cancelFaceOff(duel.id, user.id);
      expect(result.success).toBe(true);
      expect(result.refunded).toBe(100);

      const afterCancel = await db.user.findUnique({ where: { id: user.id } });
      expect(afterCancel.spendableBalance).toBe(200);

      const duelState = await db.faceOff.findUnique({ where: { id: duel.id } });
      expect(duelState.status).toBe(FaceOffStatus.CANCELLED);
    });

    it('should reject cancellation by non-challenger', async () => {
      const user1 = await db.user.create({ data: { spendableBalance: 200, tier: Tier.CLASSIC } });
      const user2 = await db.user.create({ data: { spendableBalance: 200, tier: Tier.CLASSIC } });
      const duel = await createFaceOff({
        challengerId: user1.id,
        mode: FaceOffMode.STAKED,
        stakeAmount: 50,
      });

      await expect(cancelFaceOff(duel.id, user2.id)).rejects.toThrow(/Only the challenger can cancel/);
    });

    it('should reject cancellation once duel is ACTIVE', async () => {
      const user1 = await db.user.create({ data: { spendableBalance: 200, tier: Tier.CLASSIC } });
      const user2 = await db.user.create({ data: { spendableBalance: 200, tier: Tier.CLASSIC } });
      const duel = await createFaceOff({
        challengerId: user1.id,
        mode: FaceOffMode.STAKED,
        stakeAmount: 50,
      });
      await joinFaceOff(duel.id, user2.id);

      await expect(cancelFaceOff(duel.id, user1.id)).rejects.toThrow(/Cannot cancel a duel that is already active/);
    });

    it('should expire stale WAITING duels and refund challenger stakes', async () => {
      const user = await db.user.create({ data: { spendableBalance: 200, tier: Tier.CLASSIC } });
      const duel = await createFaceOff({
        challengerId: user.id,
        mode: FaceOffMode.STAKED,
        stakeAmount: 100,
      });

      // Fast-forward duel expiry into the past
      await db.faceOff.update({
        where: { id: duel.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      const { expiredWaitingCount } = await expireStaleDuels();
      expect(expiredWaitingCount).toBe(1);

      const duelState = await db.faceOff.findUnique({ where: { id: duel.id } });
      expect(duelState.status).toBe(FaceOffStatus.EXPIRED);

      const refundedUser = await db.user.findUnique({ where: { id: user.id } });
      expect(refundedUser.spendableBalance).toBe(200);
    });

    it('should award forfeit victory to challenger if opponent ghosts in active duel', async () => {
      const user1 = await db.user.create({ data: { spendableBalance: 200, tier: Tier.CLASSIC } });
      const user2 = await db.user.create({ data: { spendableBalance: 200, tier: Tier.CLASSIC } });
      const duel = await createFaceOff({
        challengerId: user1.id,
        mode: FaceOffMode.STAKED,
        stakeAmount: 100,
      });
      await joinFaceOff(duel.id, user2.id);

      // Challenger scans
      const scan1 = await db.scan.create({
        data: { userId: user1.id, score: 85, band: 'LETHAL' },
      });
      await db.faceOff.update({
        where: { id: duel.id },
        data: {
          challengerBestScanId: scan1.id,
          expiresAt: new Date(Date.now() - 1000), // Stale
        },
      });

      const { forfeitedCount } = await expireStaleDuels();
      expect(forfeitedCount).toBe(1);

      const resolved = await db.faceOff.findUnique({ where: { id: duel.id } });
      expect(resolved.status).toBe(FaceOffStatus.COMPLETED);
      expect(resolved.winnerId).toBe(user1.id);

      const winner = await db.user.findUnique({ where: { id: user1.id } });
      // 100 retained + 190 (pot 200 - 5% fee) = 290
      expect(winner.spendableBalance).toBe(290);
    });

    it('should refund both contenders if both ghost in an active duel', async () => {
      const user1 = await db.user.create({ data: { spendableBalance: 200, tier: Tier.CLASSIC } });
      const user2 = await db.user.create({ data: { spendableBalance: 200, tier: Tier.CLASSIC } });
      const duel = await createFaceOff({
        challengerId: user1.id,
        mode: FaceOffMode.STAKED,
        stakeAmount: 100,
      });
      await joinFaceOff(duel.id, user2.id);

      await db.faceOff.update({
        where: { id: duel.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      const { refundedActiveCount } = await expireStaleDuels();
      expect(refundedActiveCount).toBe(1);

      const resolved = await db.faceOff.findUnique({ where: { id: duel.id } });
      expect(resolved.status).toBe(FaceOffStatus.EXPIRED);

      const u1 = await db.user.findUnique({ where: { id: user1.id } });
      const u2 = await db.user.findUnique({ where: { id: user2.id } });
      expect(u1.spendableBalance).toBe(200);
      expect(u2.spendableBalance).toBe(200);
    });
  });
});

