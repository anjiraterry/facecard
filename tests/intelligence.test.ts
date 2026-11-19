import { describe, it, expect, afterEach } from 'vitest';
import { computeFeatureVectorFromLandmarks } from '@/lib/vision/localIntelligence';
import { scoreFace } from '@/lib/rating/engine';
import { generateLocalInsights } from '@/lib/insights/localInsightEngine';
import { IntelligenceGateway } from '@/lib/intelligence/gateway';
import {
  buildProductBreakdownPrompt,
  buildProductContext,
  EXTERNAL_ASSISTANT_ADAPTERS,
} from '@/lib/intelligence/externalAssistant';
import {
  buildIceServers,
  evaluateFaceOffIntegrity,
  getWebRtcMediaProfile,
} from '@/lib/faceoff/webrtcCoordinator';
import { evaluateScanQuality } from '@/lib/vision/scanQualityEngine';
import { measureFacialGeometry } from '@/lib/vision/facialGeometryEngine';
import { evaluateSymmetry } from '@/lib/vision/symmetryEngine';
import { evaluateSkinAppearance } from '@/lib/vision/skinAppearanceEngine';
import { computeLethalityScore } from '@/lib/rating/lethalityEngine';
import { generateImprovementPlan } from '@/lib/insights/improvementEngine';
import { EconomyConfig } from '@/lib/economy';

describe('Local Intelligence & Zero-Cost Scoring', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalCloud = process.env.ENABLE_CLOUD_AI;

  afterEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
    process.env.ENABLE_CLOUD_AI = originalCloud;
  });

  it('computes normalized ClientFeatureVector from 468 MediaPipe landmarks', () => {
    const landmarks = Array.from({ length: 468 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
    landmarks[1] = { x: 0.5, y: 0.5, z: 0 };
    landmarks[234] = { x: 0.35, y: 0.5, z: 0 };
    landmarks[454] = { x: 0.65, y: 0.5, z: 0 };
    landmarks[10] = { x: 0.5, y: 0.25, z: 0 };
    landmarks[152] = { x: 0.5, y: 0.72, z: 0 };
    landmarks[33] = { x: 0.42, y: 0.42, z: 0 };
    landmarks[263] = { x: 0.58, y: 0.42, z: 0 };
    landmarks[172] = { x: 0.39, y: 0.62, z: 0 };
    landmarks[397] = { x: 0.61, y: 0.62, z: 0 };

    const { featureVector, headPose } = computeFeatureVectorFromLandmarks(landmarks, 85, 86);
    expect(featureVector.symmetry).toBeGreaterThanOrEqual(80);
    expect(featureVector.qualityGate.passed).toBe(true);
    expect(Math.abs(headPose.yaw)).toBeLessThan(0.1);
  });

  it('scores portraits in production without any cloud LLM API key', async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    process.env.ENABLE_CLOUD_AI = 'false';

    const result = await scoreFace({
      featureVector: {
        symmetry: 88,
        jawlineDefinition: 86,
        skinTextureUniformity: 84,
        lightingBalance: 85,
        goldenRatioDeviation: 6,
        eyeCanthalTiltAngle: 2.1,
        clientEngine: 'MEDIAPIPE_WASM',
        qualityGate: { passed: true, sharpness: 87, exposure: 84, framingCoverage: 82 },
      },
      toneMode: 'HYPE',
    });

    expect(result.score).toBeGreaterThan(70);
    expect(result.scoringSource).toBe('FEATURE_VECTOR');
  });
});

describe('Local Insight Engine & Intelligence Gateway', () => {
  it('generates rules-based portrait and skincare insights with zero LLM calls', () => {
    const insights = generateLocalInsights({
      lighting: 72,
      sharpness: 88,
      framing: 75,
      skinType: 'COMBINATION',
      isSensitive: true,
    });
    expect(insights.map((i) => i.id)).toContain('portrait-low-lighting');
    expect(insights.map((i) => i.id)).toContain('portrait-framing');
    expect(insights.map((i) => i.id)).toContain('skincare-barrier-sensitivity');
  });

  it('prefers zero-cost local providers and blocks cloud providers when disabled', async () => {
    process.env.ENABLE_CLOUD_AI = 'false';
    const gw = new IntelligenceGateway();
    gw.register({
      providerId: 'mock-cloud',
      executionMode: 'CLOUD_LLM',
      modelVersion: 'cloud-1',
      getCapabilities: () => ['BASIC_FACE_INSIGHTS'],
      isAvailable: () => true,
      estimateCost: () => 0.01,
      getHealth: () => ({ healthy: true }),
      execute: async () => ({ ok: true }) as never,
    });

    await expect(
      gw.execute({
        capability: 'BASIC_FACE_INSIGHTS',
        payload: {},
        requestId: 'req-1',
        allowCloud: true,
        userConsent: true,
      })
    ).rejects.toThrow(/No enabled provider/);
  });
});

describe('External AI Product Breakdown ("Ask ChatGPT")', () => {
  it('builds sanitized public product context and valid ChatGPT launch URL', () => {
    const ctx = buildProductContext({
      brandName: 'Face Card Atelier',
      productName: 'Radiance Serum\u0007',
      variantLabel: '30ml',
      ingredients: 'Niacinamide, Centella Asiatica',
    });
    expect(ctx.productName).toBe('Radiance Serum');
    const prompt = buildProductBreakdownPrompt(ctx);
    expect(prompt).toContain('--- PRODUCT DATA (UNTRUSTED CATALOGUE FIELDS) ---');
    expect(prompt).toContain('Niacinamide, Centella Asiatica');

    const url = EXTERNAL_ASSISTANT_ADAPTERS.chatgpt.buildLaunchUrl(prompt);
    expect(url).toMatch(/^https:\/\/chatgpt\.com\/\?q=/);
  });
});

describe('Live Face-Off WebRTC & Integrity Governance', () => {
  it('respects data-saving mode and TURN quota exhaustion', () => {
    const profile = getWebRtcMediaProfile(true);
    expect(profile.maxBitrateKbps).toBeLessThanOrEqual(300);
    expect(profile.inferenceFps).toBe(2);

    const servers = buildIceServers({
      turnUrl: 'turn:relay.example.com',
      turnUsername: 'u',
      turnCredential: 'p',
      turnQuotaExhausted: true,
    });
    expect(servers.every((s) => String(s.urls).startsWith('stun:'))).toBe(true);
  });

  it('flags impossible score spikes as SUSPICIOUS', () => {
    const res = evaluateFaceOffIntegrity([
      { timestampMs: 1000, score: 52 },
      { timestampMs: 1500, score: 94 },
    ]);
    expect(res.classification).toBe('SUSPICIOUS');
  });
});

describe('Lethality, Geometry, Symmetry, Skin Appearance & Extra Snap Economy', () => {
  it('marks unavailable measurements honestly instead of fabricating values', () => {
    const q = evaluateScanQuality({ faceDetected: false, faceCount: 0 });
    expect(q.usable).toBe(false);
    expect(q.availability).toBe('UNAVAILABLE');

    const geom = measureFacialGeometry(null);
    expect(geom.availability).toBe('UNAVAILABLE');

    const sym = evaluateSymmetry(null, 0.4);
    expect(sym.availability).toBe('UNAVAILABLE');

    const skin = evaluateSkinAppearance({ exposure: 25, sharpness: 30 });
    expect(skin.availability).toBe('UNAVAILABLE');
  });

  it('computes deterministic versioned Lethality Score & evidence-based improvement plan', () => {
    const res1 = computeLethalityScore({
      presentation: 78,
      poseComposition: 84,
      expressionEngagement: 72,
      lightingBalance: 65,
      imageDetail: 79,
    });
    const res2 = computeLethalityScore({
      presentation: 78,
      poseComposition: 84,
      expressionEngagement: 72,
      lightingBalance: 65,
      imageDetail: 79,
    });
    expect(res1.lethalityScore).toBe(res2.lethalityScore);
    expect(res1.lethalityScore).toBeGreaterThanOrEqual(1);
    expect(res1.lethalityScore).toBeLessThanOrEqual(100);

    const plan = generateImprovementPlan({ lightingScore: 65, sharpnessScore: 79 });
    expect(plan.length).toBeGreaterThan(0);
    expect(plan.every((p) => p.evidenceLevel && p.limitations.length > 0)).toBe(true);
  });

  it('locks 3 free scans/day and ensures Extra Snap cost exceeds max/avg points gained', () => {
    expect(EconomyConfig.DAILY_SCAN_CAP).toBe(3);
    expect(EconomyConfig.EXTRA_SCAN_COST_PTS).toBeGreaterThan(EconomyConfig.EXTRA_SCAN_MAX_REWARD);
  });
});
