import { describe, it, expect } from 'vitest';
import { scoreFace } from '@/lib/rating/engine';
import { runFairnessAudit } from '@/lib/rating/fairness';
import { ClientFeatureVector } from '@/lib/spikes/spikes';

describe('Phase 4: AI Rating Engine & Fairness Gates', () => {
  it('should score face with culture-aware copy across all 4 tone modes', async () => {
    const tones = ['HYPE', 'SMOOTH', 'ROAST', 'STRAIGHT'] as const;
    for (const tone of tones) {
      const res = await scoreFace({ toneMode: tone });
      expect(res.score).toBeGreaterThanOrEqual(0);
      expect(res.score).toBeLessThanOrEqual(100);
      expect(res.verdictLine).toBeTruthy();
      expect(res.tips).toHaveLength(2);
      expect(['HARMLESS', 'SUSPICIOUS', 'DANGEROUS', 'LETHAL']).toContain(res.band);
    }
  });

  it('should compute score deterministically from client biometric feature vector', async () => {
    const mockVector: ClientFeatureVector = {
      symmetry: 94,
      goldenRatioDeviation: 5,
      skinTextureUniformity: 92,
      lightingBalance: 90,
      jawlineDefinition: 95,
      qualityGate: {
        passed: true,
        sharpness: 90,
        exposure: 88,
        framing: 92,
      },
    };

    const res = await scoreFace({
      featureVector: mockVector,
      toneMode: 'HYPE',
    });

    expect(res.score).toBeGreaterThanOrEqual(85);
    expect(res.band).toBe('LETHAL');
    expect(res.breakdown.face.symmetry).toBe(94);
    expect(res.breakdown.photoCraft.sharpness).toBe(90);
  });

  it('should reject inputs that fail the deterministic quality gate', async () => {
    const failingVector: ClientFeatureVector = {
      symmetry: 50,
      goldenRatioDeviation: 40,
      skinTextureUniformity: 40,
      lightingBalance: 30,
      jawlineDefinition: 40,
      qualityGate: {
        passed: false,
        sharpness: 35,
        exposure: 20,
        framing: 40,
        rejectionReason: 'Blurry frame detected. Please hold the phone steady.',
      },
    };

    await expect(scoreFace({ featureVector: failingVector })).rejects.toThrow(
      /Blurry frame detected/i
    );
  });

  it('should pass automated fairness audit across Monk Skin Tone cohorts within 8% parity', async () => {
    const audit = await runFairnessAudit();
    expect(audit.passed).toBe(true);
    expect(audit.disparityMaxPercent).toBeLessThanOrEqual(8);
    expect(audit.cohortResults).toHaveLength(4);
  });
});
