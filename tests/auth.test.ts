import { describe, it, expect, beforeEach } from 'vitest';
import {
  isDisposableEmail,
  generateOtpCode,
  hashOtp,
  createAndSendOtp,
  verifyOtpCode,
} from '@/lib/auth/otp';

describe('Phase 3: Auth & Anti-Abuse Pipeline', () => {
  const testEmail = 'chidinma.audit@example.com';

  it('should block disposable and temporary email domains', () => {
    expect(isDisposableEmail('scammer@mailinator.com')).toBe(true);
    expect(isDisposableEmail('bot@tempmail.com')).toBe(true);
    expect(isDisposableEmail('test@guerrillamail.com')).toBe(true);
    expect(isDisposableEmail('realuser@gmail.com')).toBe(false);
    expect(isDisposableEmail('chidinma@yahoo.com')).toBe(false);
  });

  it('should generate valid 6-digit numeric OTP codes', () => {
    for (let i = 0; i < 20; i++) {
      const code = generateOtpCode();
      expect(code).toMatch(/^\d{6}$/);
      const num = parseInt(code, 10);
      expect(num).toBeGreaterThanOrEqual(100000);
      expect(num).toBeLessThan(1000000);
    }
  });

  it('should hash OTP tokens with SHA-256 at rest', () => {
    const code = '654321';
    const hash = hashOtp(code);
    expect(hash).toHaveLength(64);
    expect(hash).toBe(hashOtp(code)); // deterministic
    expect(hash).not.toBe(hashOtp('654322'));
  });

  it('should reject disposable emails during OTP dispatch', async () => {
    await expect(createAndSendOtp('fake@mailinator.com')).rejects.toThrow(
      /disposable or temporary email domains are not permitted/i
    );
  });

  it('should create an OTP and enforce 60-second cooldown on consecutive requests', async () => {
    const email = `cooldown.test.${Date.now()}@example.com`;
    const firstRes = await createAndSendOtp(email);
    expect(firstRes.success).toBe(true);
    expect(firstRes.devCode).toBeDefined();

    // Immediate second request within 60s
    const secondRes = await createAndSendOtp(email);
    expect(secondRes.success).toBe(false);
    expect(secondRes.message).toContain('Please wait');
  });

  it('should reject incorrect passcodes and lockout after 5 failed attempts', async () => {
    const email = `lockout.test.${Date.now()}@example.com`;
    await createAndSendOtp(email);

    // 4 failed attempts
    for (let i = 1; i <= 4; i++) {
      const res = verifyOtpCode(email, '000000');
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('Incorrect passcode');
    }

    // 5th failed attempt triggers lockout
    const finalRes = verifyOtpCode(email, '000000');
    expect(finalRes.valid).toBe(false);
    expect(finalRes.reason).toContain('Too many incorrect attempts');

    // Subsequent attempt should be deleted/not found
    const afterLockout = verifyOtpCode(email, '000000');
    expect(afterLockout.valid).toBe(false);
    expect(afterLockout.reason).toContain('expired or not found');
  });

  it('should verify correct OTP code and consume it immediately against replay attacks', async () => {
    const email = `replay.test.${Date.now()}@example.com`;
    const res = await createAndSendOtp(email);
    const validCode = res.devCode!;

    // First verification succeeds
    const firstVerify = verifyOtpCode(email, validCode);
    expect(firstVerify.valid).toBe(true);

    // Replay attack with same token must fail
    const replayVerify = verifyOtpCode(email, validCode);
    expect(replayVerify.valid).toBe(false);
    expect(replayVerify.reason).toContain('expired or not found');
  });
});
