/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', async () => {
  const { createFakeDb } = await import('./helpers/fakeDb');
  const db = createFakeDb();
  return { db, default: db };
});

import { db as rawDb } from '@/lib/db';
import {
  createFaceOff,
  joinFaceOff,
  recordFaceOffAttempt,
  lockInFaceOffScore,
  resolveFaceOff,
  reconcileArenaMatches,
  FaceOffError,
} from '@/lib/faceoff';
import { LETHALITY_SCORING_VERSION } from '@/lib/rating/lethalityEngine';
import { FaceOffMode, FaceOffParticipantStatus, FaceOffStatus, Tier } from '@prisma/client';

const db = rawDb as any;

function reset() {
  for (const table of [
    db.user,
    db.pointsLedger,
    db.faceOff,
    db.scan,
    db.faceOffAttempt,
    db.faceOffRound,
    db.faceOffEvent,
  ]) {
    table.rows.length = 0;
  }
}

async function seedPlayers(challengerBalance = 500, opponentBalance = 500) {
  const challenger = await db.user.create({
    data: { displayName: 'Tester', handle: 'tester', spendableBalance: challengerBalance, tier: Tier.CLASSIC },
  });
  const opponent = await db.user.create({
    data: { displayName: 'Rael', handle: 'rael', spendableBalance: opponentBalance, tier: Tier.CLASSIC },
  });
  return { challenger, opponent };
}

async function createScan(userId: string, faceOffId: string, score: number) {
  return db.scan.create({
    data: {
      userId,
      score,
      band: score >= 85 ? 'LETHAL' : 'DANGEROUS',
      categoryScores: {},
      modelVersion: LETHALITY_SCORING_VERSION,
      promptVersion: 'default',
      scanIndexOfDay: 1,
      dayKey: '2026-11-20',
      source: 'FACEOFF',
      faceOffId,
    },
  });
}

describe('Arena Face-Off Full Lifecycle, Attempt Enforcement & Settlement', () => {
  beforeEach(reset);

  it('settles automatically when both participants complete 2 valid attempts (reproduces @rael scenario)', async () => {
    const { challenger, opponent } = await seedPlayers();
    const duel = await createFaceOff({
      challengerId: challenger.id,
      mode: FaceOffMode.FRIENDLY,
      stakeAmount: 0,
      opponentHandle: 'rael',
    });
    await joinFaceOff(duel.id, opponent.id);

    // Challenger completes 2 attempts (78, 84) -> auto-locks at 84
    const cScan1 = await createScan(challenger.id, duel.id, 78);
    const c1 = await recordFaceOffAttempt({
      duelId: duel.id,
      userId: challenger.id,
      scanId: cScan1.id,
      score: 78,
      scoringVersion: LETHALITY_SCORING_VERSION,
      submissionKey: 'c-1',
    });
    expect(c1.attemptNumber).toBe(1);
    expect(c1.attemptsRemaining).toBe(1);
    expect(c1.isLockedIn).toBe(false);
    expect(c1.bothLockedIn).toBe(false);

    const cScan2 = await createScan(challenger.id, duel.id, 84);
    const c2 = await recordFaceOffAttempt({
      duelId: duel.id,
      userId: challenger.id,
      scanId: cScan2.id,
      score: 84,
      scoringVersion: LETHALITY_SCORING_VERSION,
      submissionKey: 'c-2',
    });
    expect(c2.attemptNumber).toBe(2);
    expect(c2.attemptsRemaining).toBe(0);
    expect(c2.bestScore).toBe(84);
    expect(c2.isLockedIn).toBe(true);
    expect(c2.bothLockedIn).toBe(false);

    // Opponent completes 2 attempts (75, 80) -> auto-locks & auto-settles
    const oScan1 = await createScan(opponent.id, duel.id, 75);
    await recordFaceOffAttempt({
      duelId: duel.id,
      userId: opponent.id,
      scanId: oScan1.id,
      score: 75,
      scoringVersion: LETHALITY_SCORING_VERSION,
      submissionKey: 'o-1',
    });

    const oScan2 = await createScan(opponent.id, duel.id, 80);
    const o2 = await recordFaceOffAttempt({
      duelId: duel.id,
      userId: opponent.id,
      scanId: oScan2.id,
      score: 80,
      scoringVersion: LETHALITY_SCORING_VERSION,
      submissionKey: 'o-2',
    });

    expect(o2.isLockedIn).toBe(true);
    expect(o2.bothLockedIn).toBe(true);
    expect(o2.duelStatus).toBe(FaceOffStatus.COMPLETED);
    expect(o2.settlementResult?.winnerId).toBe(challenger.id);

    const finalDuel = await db.faceOff.findUnique({ where: { id: duel.id } });
    expect(finalDuel.status).toBe(FaceOffStatus.COMPLETED);
    expect(finalDuel.winnerId).toBe(challenger.id);
    expect(finalDuel.challengerFinalScore).toBe(84);
    expect(finalDuel.opponentFinalScore).toBe(80);
  });

  it('rejects a 3rd attempt in the same round', async () => {
    const { challenger, opponent } = await seedPlayers();
    const duel = await createFaceOff({
      challengerId: challenger.id,
      mode: FaceOffMode.FRIENDLY,
      stakeAmount: 0,
    });
    await joinFaceOff(duel.id, opponent.id);

    const s1 = await createScan(challenger.id, duel.id, 70);
    const s2 = await createScan(challenger.id, duel.id, 75);
    const s3 = await createScan(challenger.id, duel.id, 90);

    await recordFaceOffAttempt({
      duelId: duel.id,
      userId: challenger.id,
      scanId: s1.id,
      score: 70,
      scoringVersion: LETHALITY_SCORING_VERSION,
      submissionKey: 's1',
    });
    await recordFaceOffAttempt({
      duelId: duel.id,
      userId: challenger.id,
      scanId: s2.id,
      score: 75,
      scoringVersion: LETHALITY_SCORING_VERSION,
      submissionKey: 's2',
    });

    await expect(
      recordFaceOffAttempt({
        duelId: duel.id,
        userId: challenger.id,
        scanId: s3.id,
        score: 90,
        scoringVersion: LETHALITY_SCORING_VERSION,
        submissionKey: 's3',
      })
    ).rejects.toThrow(FaceOffError);
  });

  it('deduplicates repeated submissions with the same submissionKey without incrementing attempts', async () => {
    const { challenger, opponent } = await seedPlayers();
    const duel = await createFaceOff({
      challengerId: challenger.id,
      mode: FaceOffMode.FRIENDLY,
      stakeAmount: 0,
    });
    await joinFaceOff(duel.id, opponent.id);

    const s1 = await createScan(challenger.id, duel.id, 82);
    const first = await recordFaceOffAttempt({
      duelId: duel.id,
      userId: challenger.id,
      scanId: s1.id,
      score: 82,
      scoringVersion: LETHALITY_SCORING_VERSION,
      submissionKey: 'idem-key-1',
    });
    const dup = await recordFaceOffAttempt({
      duelId: duel.id,
      userId: challenger.id,
      scanId: s1.id,
      score: 82,
      scoringVersion: LETHALITY_SCORING_VERSION,
      submissionKey: 'idem-key-1',
    });

    expect(first.attemptNumber).toBe(1);
    expect(dup.attemptNumber).toBe(1);
    const count = await db.faceOffAttempt.count({ where: { faceOffId: duel.id, userId: challenger.id } });
    expect(count).toBe(1);
  });

  it('supports early lock-in and settles immediately when both participants lock in', async () => {
    const { challenger, opponent } = await seedPlayers();
    const duel = await createFaceOff({
      challengerId: challenger.id,
      mode: FaceOffMode.STAKED,
      stakeAmount: 100,
    });
    await joinFaceOff(duel.id, opponent.id);

    // Reject lock-in before any attempt
    await expect(lockInFaceOffScore(duel.id, challenger.id)).rejects.toThrow(FaceOffError);

    const c1 = await createScan(challenger.id, duel.id, 88);
    await recordFaceOffAttempt({
      duelId: duel.id,
      userId: challenger.id,
      scanId: c1.id,
      score: 88,
      scoringVersion: LETHALITY_SCORING_VERSION,
      submissionKey: 'c-early',
    });
    const lockC = await lockInFaceOffScore(duel.id, challenger.id);
    expect(lockC.bothLockedIn).toBe(false);
    expect(lockC.finalScore).toBe(88);

    // Locked-in participant cannot submit a 2nd attempt
    const c2 = await createScan(challenger.id, duel.id, 95);
    await expect(
      recordFaceOffAttempt({
        duelId: duel.id,
        userId: challenger.id,
        scanId: c2.id,
        score: 95,
        scoringVersion: LETHALITY_SCORING_VERSION,
        submissionKey: 'c-after-lock',
      })
    ).rejects.toThrow(FaceOffError);

    const o1 = await createScan(opponent.id, duel.id, 79);
    await recordFaceOffAttempt({
      duelId: duel.id,
      userId: opponent.id,
      scanId: o1.id,
      score: 79,
      scoringVersion: LETHALITY_SCORING_VERSION,
      submissionKey: 'o-early',
    });
    const lockO = await lockInFaceOffScore(duel.id, opponent.id);
    expect(lockO.bothLockedIn).toBe(true);
    expect(lockO.status).toBe(FaceOffStatus.COMPLETED);
    expect(lockO.settlement?.winnerId).toBe(challenger.id);

    // Idempotent check: calling lockInFaceOffScore again does NOT double-award
    const again = await lockInFaceOffScore(duel.id, opponent.id);
    expect(again.status).toBe(FaceOffStatus.COMPLETED);
    await expect(resolveFaceOff(duel.id)).rejects.toThrow(/Cannot resolve duel with status COMPLETED/);

    const updatedChallenger = await db.user.findUnique({ where: { id: challenger.id } });
    // Started 500 -> -100 stake + 190 payout + 25 winBonus = 615
    expect(updatedChallenger.spendableBalance).toBe(615);
  });

  it('rejects non-participants and scoring rubric mismatches', async () => {
    const { challenger, opponent } = await seedPlayers();
    const outsider = await db.user.create({
      data: { displayName: 'Outsider', handle: 'outsider', spendableBalance: 500, tier: Tier.CLASSIC },
    });
    const duel = await createFaceOff({
      challengerId: challenger.id,
      mode: FaceOffMode.FRIENDLY,
      stakeAmount: 0,
    });
    await joinFaceOff(duel.id, opponent.id);

    const badScan = await createScan(outsider.id, duel.id, 90);
    await expect(
      recordFaceOffAttempt({
        duelId: duel.id,
        userId: outsider.id,
        scanId: badScan.id,
        score: 90,
        scoringVersion: LETHALITY_SCORING_VERSION,
      })
    ).rejects.toThrow('not a contender');

    const mismatchScan = await createScan(challenger.id, duel.id, 85);
    await expect(
      recordFaceOffAttempt({
        duelId: duel.id,
        userId: challenger.id,
        scanId: mismatchScan.id,
        score: 85,
        scoringVersion: 'v99-incompatible',
      })
    ).rejects.toThrow('rubric mismatch');
  });

  it('handles tie -> 1 rematch round -> preserves best score in rematch -> draw refund on 2nd tie', async () => {
    const { challenger, opponent } = await seedPlayers();
    const duel = await createFaceOff({
      challengerId: challenger.id,
      mode: FaceOffMode.STAKED,
      stakeAmount: 100,
    });
    await joinFaceOff(duel.id, opponent.id);

    // Round 1 tie at 80 vs 80 via early lock-in
    const c1 = await createScan(challenger.id, duel.id, 80);
    await recordFaceOffAttempt({
      duelId: duel.id,
      userId: challenger.id,
      scanId: c1.id,
      score: 80,
      scoringVersion: LETHALITY_SCORING_VERSION,
    });
    await lockInFaceOffScore(duel.id, challenger.id);

    const o1 = await createScan(opponent.id, duel.id, 80);
    await recordFaceOffAttempt({
      duelId: duel.id,
      userId: opponent.id,
      scanId: o1.id,
      score: 80,
      scoringVersion: LETHALITY_SCORING_VERSION,
    });
    const r1 = await lockInFaceOffScore(duel.id, opponent.id);
    expect(r1.status).toBe(FaceOffStatus.TIE_REMATCH);

    const afterR1 = await db.faceOff.findUnique({ where: { id: duel.id } });
    expect(afterR1.currentRound).toBe(2);
    expect(afterR1.rematchCount).toBe(1);
    expect(afterR1.challengerStatus).toBe(FaceOffParticipantStatus.ATTEMPTS_AVAILABLE);

    // Round 2: Challenger scores 85 then 70 -> best score MUST stay 85 (not downgraded to 70!)
    const c2a = await createScan(challenger.id, duel.id, 85);
    await recordFaceOffAttempt({
      duelId: duel.id,
      userId: challenger.id,
      scanId: c2a.id,
      score: 85,
      scoringVersion: LETHALITY_SCORING_VERSION,
    });
    const c2b = await createScan(challenger.id, duel.id, 70);
    const c2bRes = await recordFaceOffAttempt({
      duelId: duel.id,
      userId: challenger.id,
      scanId: c2b.id,
      score: 70,
      scoringVersion: LETHALITY_SCORING_VERSION,
    });
    expect(c2bRes.bestScore).toBe(85);
    expect(c2bRes.isLockedIn).toBe(true);

    // Opponent also scores 85 in Round 2 -> 2nd tie -> DRAW_REFUNDED
    const o2a = await createScan(opponent.id, duel.id, 85);
    await recordFaceOffAttempt({
      duelId: duel.id,
      userId: opponent.id,
      scanId: o2a.id,
      score: 85,
      scoringVersion: LETHALITY_SCORING_VERSION,
    });
    const r2 = await lockInFaceOffScore(duel.id, opponent.id);
    expect(r2.status).toBe(FaceOffStatus.COMPLETED);

    const finalC = await db.user.findUnique({ where: { id: challenger.id } });
    const finalO = await db.user.findUnique({ where: { id: opponent.id } });
    expect(finalC.spendableBalance).toBe(500);
    expect(finalO.spendableBalance).toBe(500);

    // Match timeline events recorded
    const events = await db.faceOffEvent.findMany({ where: { faceOffId: duel.id } });
    const eventTypes = events.map((e: any) => e.eventType);
    expect(eventTypes).toContain('MATCH_CREATED');
    expect(eventTypes).toContain('MATCH_ACCEPTED');
    expect(eventTypes).toContain('ATTEMPT_RECORDED');
    expect(eventTypes).toContain('PARTICIPANT_LOCKED');
    expect(eventTypes).toContain('REMATCH_TRIGGERED');
    expect(eventTypes).toContain('MATCH_COMPLETED');
  });

  it('reconciles stranded READY_TO_SETTLE matches via reconcileArenaMatches', async () => {
    const { challenger, opponent } = await seedPlayers();
    const duel = await createFaceOff({
      challengerId: challenger.id,
      mode: FaceOffMode.FRIENDLY,
      stakeAmount: 0,
    });
    await joinFaceOff(duel.id, opponent.id);

    const cScan = await createScan(challenger.id, duel.id, 91);
    const oScan = await createScan(opponent.id, duel.id, 77);

    await db.faceOff.update({
      where: { id: duel.id },
      data: {
        status: FaceOffStatus.READY_TO_SETTLE,
        challengerBestScanId: cScan.id,
        opponentBestScanId: oScan.id,
        challengerFinalScore: 91,
        opponentFinalScore: 77,
        challengerLockedAt: new Date(),
        opponentLockedAt: new Date(),
      },
    });

    const summary = await reconcileArenaMatches();
    expect(summary.settledCount).toBe(1);

    const settled = await db.faceOff.findUnique({ where: { id: duel.id } });
    expect(settled.status).toBe(FaceOffStatus.COMPLETED);
    expect(settled.winnerId).toBe(challenger.id);
  });
});
