import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import {
  initializePaystackTransaction,
  verifyPaystackWebhookSignature,
} from '@/lib/paystack';

describe('Phase 11: Monetization & Paystack Payment Gateway', () => {
  const secretKey = 'sk_test_mock_secret_key_12345';

  it('should strictly prohibit direct point purchases with fiat currency', async () => {
    await expect(
      initializePaystackTransaction({
        email: 'user@example.com',
        amountInKobo: 500000,
        reference: 'fc-points-illegal',
        metadata: {
          userId: 'usr-1',
          itemType: 'POINTS' as unknown as 'COSMETIC',
          itemSlug: '500-points',
        },
      })
    ).rejects.toThrow(/Points cannot be purchased directly with fiat/i);
  });

  it('should initialize cosmetic purchases and return authorization reference', async () => {
    const res = await initializePaystackTransaction(
      {
        email: 'chidinma@example.com',
        amountInKobo: 250000, // ₦2,500 in kobo
        reference: `ref-${Date.now()}`,
        metadata: {
          userId: 'usr-chidinma',
          itemType: 'COSMETIC',
          itemSlug: 'frame-solar-flare',
        },
      },
      '' // mock mode without API key
    );

    expect(res.success).toBe(true);
    expect(res.authorizationUrl).toContain('checkout.paystack.com');
    expect(res.reference).toBeTruthy();
  });

  it('should verify valid Paystack webhook HMAC-SHA512 signatures', () => {
    const payload = JSON.stringify({ event: 'charge.success', data: { reference: 'ref-123' } });
    const signature = crypto.createHmac('sha512', secretKey).update(payload).digest('hex');

    const isValid = verifyPaystackWebhookSignature(payload, signature, secretKey);
    expect(isValid).toBe(true);

    const isTampered = verifyPaystackWebhookSignature(payload, 'invalid-signature', secretKey);
    expect(isTampered).toBe(false);
  });
});
