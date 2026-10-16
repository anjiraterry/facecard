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
      eyeCanthalTiltAngle: 4,
      jawlineDefinition: 95,
      qualityGate: {
        passed: true,
        sharpness: 90,
        exposure: 88,
        framingCoverage: 92,
      },
      clientEngine: 'MEDIAPIPE_WASM',
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
      eyeCanthalTiltAngle: 0,
      jawlineDefinition: 40,
      qualityGate: {
        passed: false,
        sharpness: 35,
        exposure: 20,
        framingCoverage: 40,
      },
      clientEngine: 'MEDIAPIPE_WASM',
    };

    await expect(scoreFace({ featureVector: failingVector })).rejects.toThrow(
      /failed quality gate check/i
    );
  });

  it('should pass automated fairness audit across Monk Skin Tone cohorts within 8% parity', async () => {
    const audit = await runFairnessAudit();
    expect(audit.passed).toBe(true);
    expect(audit.disparityMaxPercent).toBeLessThanOrEqual(8);
    expect(audit.cohortResults).toHaveLength(4);
  });

  describe('Image Buffer Quality Gate & Analysis', () => {
    it('should reject pitch black / underexposed image buffers', async () => {
      // JPEG magic bytes + 200 black pixels
      const darkBuffer = Buffer.alloc(300, 5);
      darkBuffer[0] = 0xFF;
      darkBuffer[1] = 0xD8;
      darkBuffer[2] = 0xFF;

      await expect(scoreFace({ imageBuffer: darkBuffer })).rejects.toThrow(
        /Exposure too low/i
      );
    });

    it('should reject blown-out / overexposed image buffers', async () => {
      const whiteBuffer = Buffer.alloc(300, 250);
      whiteBuffer[0] = 0xFF;
      whiteBuffer[1] = 0xD8;
      whiteBuffer[2] = 0xFF;

      await expect(scoreFace({ imageBuffer: whiteBuffer })).rejects.toThrow(
        /Exposure too high/i
      );
    });

    it('should reject corrupted or too-small image buffers', async () => {
      const tinyBuffer = Buffer.from([0x01, 0x02]);
      await expect(scoreFace({ imageBuffer: tinyBuffer })).rejects.toThrow(
        /too small/i
      );
    });

    it('should evaluate and score realistic image buffers with genuine variation', async () => {
      // Realistic image buffer with pseudo-random byte variation (like a real selfie)
      const buffer1 = Buffer.alloc(1000);
      buffer1[0] = 0xFF;
      buffer1[1] = 0xD8;
      buffer1[2] = 0xFF;
      for (let i = 16; i < 1000; i++) buffer1[i] = (i * 37 + 100) % 220 + 25;

      const buffer2 = Buffer.alloc(1000);
      buffer2[0] = 0xFF;
      buffer2[1] = 0xD8;
      buffer2[2] = 0xFF;
      for (let i = 16; i < 1000; i++) buffer2[i] = (i * 73 + 45) % 210 + 30;

      const res1 = await scoreFace({ imageBuffer: buffer1, toneMode: 'HYPE' });
      const res2 = await scoreFace({ imageBuffer: buffer2, toneMode: 'HYPE' });

      expect(res1.qualityGate.passed).toBe(true);
      expect(res2.qualityGate.passed).toBe(true);
      expect(res1.score).toBeGreaterThanOrEqual(40);
      expect(res1.score).toBeLessThanOrEqual(100);
      expect(res2.score).toBeGreaterThanOrEqual(40);
      expect(res2.score).toBeLessThanOrEqual(100);

      // Verify that two different photos don't just return identical numbers
      expect(res1.breakdown.face.harmony).not.toBe(res2.breakdown.face.harmony);
    });
  });
});
