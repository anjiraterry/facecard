import { describe, it, expect, vi } from 'vitest';
import {
  verifyAndScoreFeatureVector,
  ClientFeatureVector,
  getLagosDayKey,
  generateCardSvg,
  sendBrevoOtpEmail,
  SPIKE_S1_LIMITS,
} from '@/lib/spikes/spikes';

describe('Technical Spikes S1–S5 (Step 1.4)', () => {
  describe('Spike S1: Worker Bundle & Pool Bounds', () => {
    it('should define Worker bundle limits under Cloudflare thresholds', () => {
      expect(SPIKE_S1_LIMITS.maxCompressedWorkerSizeMB).toBe(10);
      expect(SPIKE_S1_LIMITS.dbPoolMaxConnections).toBe(10);
    });
  });

  describe('Spike S2: On-Device MediaPipe Feature Vector & Recomputation', () => {
    const validVector: ClientFeatureVector = {
      symmetry: 88,
      goldenRatioDeviation: 10,
      skinTextureUniformity: 85,
      lightingBalance: 82,
      eyeCanthalTiltAngle: 4,
      jawlineDefinition: 90,
      qualityGate: {
        passed: true,
        sharpness: 92,
        exposure: 86,
        framingCoverage: 89,
      },
      clientEngine: 'MEDIAPIPE_WASM',
    };

    it('should deterministically score a valid on-device feature vector', () => {
      const result = verifyAndScoreFeatureVector(validVector, 3);
      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.band).toBe('DANGEROUS');
      expect(result.tier).toBe('PLATINUM');
      expect(result.multiplier).toBe(1.10);
      expect(result.deterministicHash).toContain('FC-DETERMINISTIC');
    });

    it('should reject vectors that failed client-side quality gate', () => {
      const badVector: ClientFeatureVector = {
        ...validVector,
        qualityGate: {
          ...validVector.qualityGate,
          passed: false,
        },
      };
      expect(() => verifyAndScoreFeatureVector(badVector)).toThrow(
        /Image quality gate failed/
      );
    });
  });

  describe('Spike S3: Rate Limiting & Lagos Day Key', () => {
    it('should format date key correctly in Africa/Lagos (UTC+1)', () => {
      const fixedDate = new Date('2026-10-14T00:30:00Z'); // 01:30 AM in Lagos
      const dayKey = getLagosDayKey(fixedDate);
      expect(dayKey).toBe('2026-10-14');
    });
  });

  describe('Spike S4: Dynamic OG SVG Card Generation', () => {
    it('should generate valid Workers-compatible SVG card markup', () => {
      const svg = generateCardSvg({
        displayName: 'Amina Bello',
        handle: 'amina',
        score: 94,
        tier: 'BLACK',
        band: 'LETHAL',
      });

      expect(svg).toContain('<svg');
      expect(svg).toContain('AMINA BELLO');
      expect(svg).toContain('94');
      expect(svg).toContain('BLACK TIER');
      expect(svg).toContain('LETHAL');
      expect(svg).toContain('</svg>');
    });
  });

  describe('Spike S5: Brevo Native HTTP Fetch Client', () => {
    it('should send email using standard global fetch without external SDKs', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ messageId: 'brevo-msg-12345' }),
      });

      const res = await sendBrevoOtpEmail({
        apiKey: 'test-api-key',
        toEmail: 'tester@example.com',
        otpCode: '482910',
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      expect(res.success).toBe(true);
      expect(res.messageId).toBe('brevo-msg-12345');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.brevo.com/v3/smtp/email',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'api-key': 'test-api-key',
          }),
        })
      );
    });

    it('should handle Brevo API failure gracefully', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      const res = await sendBrevoOtpEmail({
        apiKey: 'bad-key',
        toEmail: 'tester@example.com',
        otpCode: '482910',
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('401');
    });
  });
});
