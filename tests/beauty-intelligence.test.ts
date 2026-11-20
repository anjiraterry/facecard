import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  staff: null as { id: string; permissions: string[] } | null,
  skinProfile: null as Record<string, unknown> | null,
  products: [] as Array<Record<string, unknown>>,
  observations: [] as Array<Record<string, unknown>>,
  progressEntries: [] as Array<Record<string, unknown>>,
  interactions: [] as Array<Record<string, unknown>>,
  ruleVersions: [] as Array<Record<string, unknown>>,
}));

vi.mock('@/lib/db', () => ({
  db: {
    skinProfile: {
      findUnique: async () => state.skinProfile,
    },
    atelierProduct: {
      findMany: async () => state.products,
    },
    skinObservation: {
      findMany: async () => state.observations,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `obs-${state.observations.length + 1}`, createdAt: new Date(), ...data };
        state.observations.push(row);
        return row;
      },
    },
    skinProgressEntry: {
      findMany: async () => state.progressEntries,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `prog-${state.progressEntries.length + 1}`, createdAt: new Date(), ...data };
        state.progressEntries.push(row);
        return row;
      },
      deleteMany: async ({ where }: { where: { id?: string; userId?: string } }) => {
        const before = state.progressEntries.length;
        state.progressEntries = state.progressEntries.filter((e) => {
          if (where.id && e.id === where.id && e.userId === where.userId) return false;
          if (!where.id && e.userId === where.userId) return false;
          return true;
        });
        return { count: before - state.progressEntries.length };
      },
    },
    recommendationInteraction: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `int-${state.interactions.length + 1}`, createdAt: new Date(), ...data };
        state.interactions.push(row);
        return row;
      },
      groupBy: async () => [],
    },
    recommendationRuleVersion: {
      findMany: async () => state.ruleVersions,
      findFirst: async () => state.ruleVersions[0] ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `rv-${state.ruleVersions.length + 1}`, createdAt: new Date(), ...data };
        state.ruleVersions.unshift(row);
        return row;
      },
    },
    scan: { count: async () => 12 },
    skincareRoutine: { count: async () => 4 },
  },
}));

vi.mock('@/lib/auth/session', () => ({
  getSessionUser: async () => state.user,
}));

vi.mock('@/lib/admin/auth', () => ({
  StaffAuthError: class extends Error {
    status: number;
    constructor(msg: string, status = 403) {
      super(msg);
      this.status = status;
    }
  },
  requireStaffPermission: async () => {
    if (!state.staff) throw new Error('Forbidden');
    return state.staff;
  },
  recordStaffAuditLog: async () => undefined,
}));

import {
  computeLethalityScore,
  evaluateHarmonyV21,
  EXPERIMENTAL_FACTORS_ENABLED_IN_PROD,
  HARMONY_V2_1_EXPERIMENTAL_WEIGHTS,
  validateHarmonyV21Weights,
} from '@/lib/rating/lethalityEngine';
import { evaluateScanQuality } from '@/lib/vision/scanQualityEngine';
import { evaluateSkinObservations } from '@/lib/vision/skinAppearanceEngine';
import { checkIngredientCompatibility } from '@/lib/beauty-intelligence/ingredients';
import { generateSkinRecommendations } from '@/lib/atelier/recommendations';
import { POST as postObservation } from '@/app/api/atelier/observations/route';
import { POST as postProgress, DELETE as deleteProgress } from '@/app/api/atelier/progress/route';
import { POST as postAnalytics } from '@/app/api/atelier/analytics/route';
import { POST as postAdminBeauty } from '@/app/api/admin/v1/beauty-intelligence/route';

describe('Scoring Engine V2.1 & Beauty Intelligence', () => {
  beforeEach(() => {
    state.user = { id: 'user-1' };
    state.staff = { id: 'staff-1', permissions: ['economy.read', 'economy.adjust'] };
    state.skinProfile = null;
    state.products = [];
    state.observations = [];
    state.progressEntries = [];
    state.interactions = [];
    state.ruleVersions = [];
  });

  it('keeps Harmony V2.1 experimental appearance/geometry factors disabled in prod', () => {
    expect(EXPERIMENTAL_FACTORS_ENABLED_IN_PROD).toBe(false);
    expect(validateHarmonyV21Weights(HARMONY_V2_1_EXPERIMENTAL_WEIGHTS).valid).toBe(true);

    const presentationEval = computeLethalityScore({
      presentation: 82,
      poseComposition: 85,
      expressionEngagement: 80,
      lightingBalance: 84,
      imageDetail: 79,
    });

    const v21 = evaluateHarmonyV21({
      presentationEval,
      skinAppearanceNote: 74,
      facialHarmonyNote: 81,
      facialDefinitionNote: 79,
      expressionPresentation: 85,
      photoCraft: 76,
    });

    expect(v21.experimentalEnabled).toBe(false);
    expect(v21.publishedScore).toBe(presentationEval.lethalityScore);
    const skinFactor = v21.factors.find((f) => f.id === 'skin_appearance')!;
    expect(skinFactor.status).toBe('FIREWALLED_OBSERVATION_ONLY');
    expect(skinFactor.activeWeightInProd).toBe(0);
    const defFactor = v21.factors.find((f) => f.id === 'facial_definition')!;
    expect(defFactor.status).toBe('DROPPED_DESCRIPTIVE_ONLY');
    expect(defFactor.activeWeightInProd).toBe(0);
  });

  it('evaluates 11 tone-fair quality checks without penalising dark skin brightness', () => {
    const darkSkinGoodCapture = evaluateScanQuality({
      faceDetected: true,
      faceCount: 1,
      sharpness: 78,
      motionBlurScore: 80,
      exposure: 35, // Low mean luminance on MST 9-10 should NOT fail clipping check
      overExposedFraction: 0.01,
      crushedShadowFraction: 0.05,
      lightingBalance: 76,
      framing: 82,
      faceWidthRatio: 0.45,
      yaw: 0.05,
      pitch: 0.04,
      compressionScore: 82,
      captureWidth: 720,
      captureHeight: 960,
      smoothingSuspected: false,
    });

    expect(darkSkinGoodCapture.usable).toBe(true);
    expect(darkSkinGoodCapture.reliableForSkinObservation).toBe(true);
    expect(darkSkinGoodCapture.checks).toHaveLength(11);

    const smoothedCapture = evaluateScanQuality({
      faceDetected: true,
      faceCount: 1,
      sharpness: 72,
      exposure: 80,
      lightingBalance: 75,
      smoothingSuspected: true,
    });
    expect(smoothedCapture.usable).toBe(true);
    expect(smoothedCapture.reliableForSkinObservation).toBe(false);
  });

  it('returns 11 structured skin observations and marks unmeasurable items UNAVAILABLE', () => {
    const avail = evaluateSkinObservations({
      exposure: 82,
      sharpness: 84,
      lightingBalance: 82,
      compressionScore: 80,
      resolutionMinEdge: 720,
      smoothingSuspected: false,
    });
    const launchObs = avail.observations.filter((o) => o.launchStatus === 'LAUNCH');
    const plannedObs = avail.observations.filter((o) => o.launchStatus === 'PLANNED');
    expect(launchObs.map((o) => o.id)).toEqual([
      'tone_unevenness',
      'visible_surface_texture',
      'visible_redness',
    ]);
    expect(plannedObs.every((o) => o.availability === 'UNAVAILABLE' && o.measuredValue === null)).toBe(true);

    const unavail = evaluateSkinObservations({
      exposure: 32,
      sharpness: 38,
      smoothingSuspected: true,
    });
    expect(unavail.availability).toBe('UNAVAILABLE');
    expect(unavail.observations).toHaveLength(11);
    for (const obs of unavail.observations) {
      expect(obs.userConfirmationRequired).toBe(true);
      expect(obs.availability).toBe('UNAVAILABLE');
      expect(obs.measuredValue).toBeNull();
    }
  });

  it('flags ingredient incompatibilities and enforces allergy/budget/no-purchase rules', async () => {
    const warnings = checkIngredientCompatibility(['retinol', 'salicylic-acid']);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].status).toBe('CAUTION');

    // Minimal routine already covered -> no purchase suggested
    state.skinProfile = {
      skinType: 'NORMAL',
      routinePreference: 'MINIMAL',
      existingProducts: ['Gentle Cleanser', 'Ceramide Moisturiser', 'Sunscreen SPF 50'],
      concerns: [],
      sensitivities: [],
      restrictions: [],
    };
    const noBuy = await generateSkinRecommendations('user-1');
    expect(noBuy.noPurchaseSuggested).toBe(true);
    expect(noBuy.recommendations).toHaveLength(0);

    // Allergy exclusion + incomplete metadata confidence penalty + budget enforcement
    state.skinProfile = {
      skinType: 'OILY',
      routinePreference: 'BALANCED',
      budgetMaxMinor: BigInt(2000000),
      concerns: [{ concernId: 'c1', concern: { id: 'c1', slug: 'uneven-tone', name: 'Uneven Tone' } }],
      sensitivities: [{ label: 'Salicylic Acid' }],
      restrictions: [],
    };
    state.products = [
      {
        id: 'p-excluded',
        slug: 'bha-serum',
        name: 'BHA 2% Serum',
        ritualStep: 'TREAT',
        brand: { name: 'Atelier Lab' },
        variants: [{ isActive: true, stockQty: 5, priceMinor: BigInt(900000), currency: 'NGN' }],
        concerns: [{ concernId: 'c1', strength: 2, concern: { id: 'c1', name: 'Uneven Tone' } }],
        skinTypes: [{ skinType: 'OILY' }],
        ingredients: [{ ingredient: { slug: 'salicylic-acid', name: 'Salicylic Acid', inciName: 'Salicylic Acid', isPotentialIrritant: true } }],
      },
      {
        id: 'p-safe',
        slug: 'niacinamide-drops',
        name: 'Niacinamide Drops',
        ritualStep: 'TREAT',
        brand: { name: 'GlowNovia' },
        variants: [{ isActive: true, stockQty: 8, priceMinor: BigInt(1200000), currency: 'NGN' }],
        concerns: [{ concernId: 'c1', strength: 2, concern: { id: 'c1', name: 'Uneven Tone' } }],
        skinTypes: [{ skinType: 'OILY' }],
        ingredients: [{ ingredient: { slug: 'niacinamide', name: 'Niacinamide', inciName: 'Niacinamide', isPotentialIrritant: false } }],
      },
      {
        id: 'p-over-budget',
        slug: 'luxury-serum',
        name: 'Luxury Serum',
        ritualStep: 'TREAT',
        brand: { name: 'Maison' },
        variants: [{ isActive: true, stockQty: 3, priceMinor: BigInt(5000000), currency: 'NGN' }],
        concerns: [{ concernId: 'c1', strength: 3, concern: { id: 'c1', name: 'Uneven Tone' } }],
        skinTypes: [{ skinType: 'OILY' }],
        ingredients: [],
      },
    ];

    const recs = await generateSkinRecommendations('user-1');
    expect(recs.noPurchaseSuggested).toBe(false);
    expect(recs.recommendations).toHaveLength(1);
    expect(recs.recommendations[0].productId).toBe('p-safe');
    expect(recs.recommendations[0].isPromoted).toBe(false);
  });

  it('persists observations, progress deletion, analytics, and blocks appearance-targeting admin rules', async () => {
    const obsRes = await postObservation(
      new NextRequest('http://localhost/api/atelier/observations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ observationKey: 'tone_unevenness', confirmed: true }),
      })
    );
    expect(obsRes.status).toBe(201);

    const progRes = await postProgress(
      new NextRequest('http://localhost/api/atelier/progress', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ adherencePercent: 90, userNotes: 'Calm skin' }),
      })
    );
    expect(progRes.status).toBe(201);
    expect(state.progressEntries).toHaveLength(1);

    const delRes = await deleteProgress(
      new NextRequest('http://localhost/api/atelier/progress', { method: 'DELETE' })
    );
    expect(delRes.status).toBe(200);
    expect(state.progressEntries).toHaveLength(0);

    const analyticsRes = await postAnalytics(
      new NextRequest('http://localhost/api/atelier/analytics', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ eventType: 'IMPRESSION', productId: 'p-safe' }),
      })
    );
    expect(analyticsRes.status).toBe(201);

    const badAdminRule = await postAdminBeauty(
      new NextRequest('http://localhost/api/admin/v1/beauty-intelligence', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_RULE_DRAFT',
          rules: { targetCondition: 'lethalityScore < 50' },
        }),
      })
    );
    expect(badAdminRule.status).toBe(400);
  });
});
