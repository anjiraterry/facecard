import { describe, it, expect } from 'vitest';
import {
  calculateRedemptionQuote,
  DEFAULT_TIER_RULES,
  type RedemptionPolicySnapshot,
} from '@/lib/atelier/redemption';
import { analyzeDecodedPixels } from '@/lib/vision/pixelQuality';
import { evaluateScanQuality } from '@/lib/vision/scanQualityEngine';
import { QualityGateError, scoreFace } from '@/lib/rating/engine';
import {
  computeLethalityScore,
  formatRubricFormula,
  lethalityInputsFromPresentation,
} from '@/lib/rating/lethalityEngine';

const POLICY: RedemptionPolicySnapshot = {
  id: 'pol-1',
  version: 1,
  minimumTier: 'GOLD',
  pointsPerUnit: 100,
  valuePerUnitMinor: BigInt(5000),
  minimumSubtotalMinor: BigInt(1_000_000),
  marginFloorBps: 1500,
  processingFeeBps: 150,
  processingFeeFlatMinor: BigInt(10000),
  allowPromoStacking: false,
  programmeBudgetMinor: null,
  programmeSpentMinor: BigInt(0),
  emergencyPaused: false,
  tierRules: DEFAULT_TIER_RULES,
};

describe('P0: Atelier Tier-Specific Minimum Purchase Thresholds', () => {
  it('enforces Gold ₦15,000 threshold at -1 kobo, exact, and +1 kobo', () => {
    const run = (unitPriceMinor: bigint) =>
      calculateRedemptionQuote({
        policy: POLICY,
        tier: 'GOLD',
        availableSpendablePoints: 5000,
        alreadyCommittedMinor: BigInt(0),
        alreadyReservedMinor: BigInt(0),
        alreadyCommittedCount: 0,
        alreadyReservedCount: 0,
        items: [{ variantId: 'v1', quantity: 1, unitPriceMinor, costPriceMinor: BigInt(700_000) }],
        periodKey: '2026-11',
      });

    expect(run(BigInt(1_499_999)).eligible).toBe(false);
    expect(run(BigInt(1_500_000)).eligible).toBe(true);
    expect(run(BigInt(1_500_001)).eligible).toBe(true);
  });

  it('enforces Platinum ₦20,000 and Black ₦25,000 thresholds', () => {
    const platBelow = calculateRedemptionQuote({
      policy: POLICY,
      tier: 'PLATINUM',
      availableSpendablePoints: 5000,
      alreadyCommittedMinor: BigInt(0),
      alreadyReservedMinor: BigInt(0),
      alreadyCommittedCount: 0,
      alreadyReservedCount: 0,
      items: [{ variantId: 'v1', quantity: 1, unitPriceMinor: BigInt(1_999_999), costPriceMinor: BigInt(900_000) }],
      periodKey: '2026-11',
    });
    expect(platBelow.eligible).toBe(false);

    const blackBelow = calculateRedemptionQuote({
      policy: POLICY,
      tier: 'BLACK',
      availableSpendablePoints: 5000,
      alreadyCommittedMinor: BigInt(0),
      alreadyReservedMinor: BigInt(0),
      alreadyCommittedCount: 0,
      alreadyReservedCount: 0,
      items: [{ variantId: 'v1', quantity: 1, unitPriceMinor: BigInt(2_499_999), costPriceMinor: BigInt(1_000_000) }],
      periodKey: '2026-11',
    });
    expect(blackBelow.eligible).toBe(false);
  });

  it('does not allow redemption when total basket exceeds threshold but eligible subtotal does not', () => {
    const quote = calculateRedemptionQuote({
      policy: POLICY,
      tier: 'GOLD',
      availableSpendablePoints: 5000,
      alreadyCommittedMinor: BigInt(0),
      alreadyReservedMinor: BigInt(0),
      alreadyCommittedCount: 0,
      alreadyReservedCount: 0,
      items: [
        { variantId: 'eligible', quantity: 1, unitPriceMinor: BigInt(1_000_000), costPriceMinor: BigInt(400_000) },
        {
          variantId: 'excluded',
          quantity: 1,
          unitPriceMinor: BigInt(1_000_000),
          costPriceMinor: BigInt(400_000),
          rule: { enabled: false, maxDiscountBps: null, marginFloorBps: null, allowPromoStacking: false, excludedReason: 'Excluded' },
        },
      ],
      periodKey: '2026-11',
    });
    expect(quote.eligible).toBe(false);
    expect(quote.eligibleSubtotalMinor).toBe(BigInt(1_000_000));
  });
});

describe('P0: Scoring Integrity, Pixel Quality & Rubric Reconciliation', () => {
  it('rejects poorly illuminated / crushed-shadow RGBA pixel buffers', () => {
    const w = 64;
    const h = 64;
    const darkNoisy = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      const v = i % 2 === 0 ? 4 : 8; // crushed dark pixels
      darkNoisy[i * 4] = v;
      darkNoisy[i * 4 + 1] = v;
      darkNoisy[i * 4 + 2] = v;
      darkNoisy[i * 4 + 3] = 255;
    }
    const metrics = analyzeDecodedPixels(darkNoisy, w, h);
    expect(metrics.usable).toBe(false);
    expect(metrics.crushedShadowFraction).toBeGreaterThan(0.35);
  });

  it('does not default missing sharpness or exposure to 80 in scanQualityEngine', () => {
    const res = evaluateScanQuality({
      faceDetected: true,
      faceCount: 1,
      sharpness: null,
      exposure: null,
      lightingBalance: null,
    });
    expect(res.usable).toBe(false);
    expect(res.availability).toBe('UNAVAILABLE');
  });

  it('throws QualityGateError instead of fabricating SHA-256 scores when featureVector is missing', async () => {
    const fakeJpeg = Buffer.alloc(4096, 128);
    fakeJpeg[0] = 0xff;
    fakeJpeg[1] = 0xd8;
    fakeJpeg[4094] = 0xff;
    fakeJpeg[4095] = 0xd9;

    await expect(scoreFace({ imageBuffer: fakeJpeg })).rejects.toBeInstanceOf(QualityGateError);
  });

  it('reconciles overall score with the 5 canonical factors and excludes Golden Ratio copy', () => {
    const evalRes = computeLethalityScore(
      lethalityInputsFromPresentation({
        lighting: 84,
        sharpness: 88,
        framing: 90,
        expression: 82,
        aura: 86,
      })
    );
    const recomputed = Math.round(
      evalRes.components.reduce((acc, c) => acc + c.score * c.weight, 0)
    );
    expect(evalRes.lethalityScore).toBe(recomputed);

    const formula = formatRubricFormula(undefined, { components: evalRes.components });
    expect(formula).toHaveLength(5);
    const serialized = JSON.stringify(formula).toLowerCase();
    expect(serialized).not.toContain('golden ratio');
    expect(serialized).not.toContain('high-status');
  });
});
