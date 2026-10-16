/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', async () => {
  const { createFakeDb } = await import('./helpers/fakeDb');
  const db = createFakeDb();
  return { db, default: db };
});

import { db as rawDb } from '@/lib/db';
import {
  isDisposableEmail,
  generateOtpCode,
  hashOtp,
  createAndSendOtp,
  verifyOtpCode,
} from '@/lib/auth/otp';

const db = rawDb as any;

function reset() {
  for (const table of [db.otpChallenge, db.authAttempt]) table.rows.length = 0;
}

/** Makes the most recent challenge look old enough to clear the resend cooldown. */
function ageLatestChallenge(email: string, ms = 61_000) {
  const rows = db.otpChallenge.rows.filter((r: any) => r.email === email);
  rows[rows.length - 1].createdAt = new Date(Date.now() - ms);
}

describe('Auth: OTP pipeline', () => {
  const email = 'chidinma.audit@example.com';

  beforeEach(reset);

  it('blocks disposable and temporary email domains', () => {
    expect(isDisposableEmail('scammer@mailinator.com')).toBe(true);
    expect(isDisposableEmail('bot@tempmail.com')).toBe(true);
    expect(isDisposableEmail('realuser@gmail.com')).toBe(false);
  });

  it('generates valid 6-digit numeric codes', () => {
    for (let i = 0; i < 20; i++) expect(generateOtpCode()).toMatch(/^\d{6}$/);
  });

  it('hashes codes with a keyed HMAC bound to the email', () => {
    const hash = hashOtp('654321', 'a@example.com');
    expect(hash).toHaveLength(64);
    expect(hash).toBe(hashOtp('654321', 'A@example.com ')); // normalised
    expect(hash).not.toBe(hashOtp('654322', 'a@example.com'));
    expect(hash).not.toBe(hashOtp('654321', 'b@example.com'));
  });

  it('rejects disposable emails during dispatch', async () => {
    await expect(createAndSendOtp('fake@mailinator.com')).rejects.toThrow(/disposable or temporary/i);
  });

  it('persists only a hash of the code, never the code itself', async () => {
    const res = await createAndSendOtp(email, '1.1.1.1');
    expect(res.success).toBe(true);
    const row = db.otpChallenge.rows[0];
    expect(row.codeHash).not.toContain(res.devCode);
    expect(row.codeHash).toBe(hashOtp(res.devCode!, email));
  });

  it('enforces the 60-second resend cooldown', async () => {
    expect((await createAndSendOtp(email)).success).toBe(true);
    const second = await createAndSendOtp(email);
    expect(second.success).toBe(false);
    expect(second.message).toContain('Please wait');
  });

  it('caps sends per email per hour', async () => {
    for (let i = 0; i < 5; i++) {
      expect((await createAndSendOtp(email, `9.9.9.${i}`)).success).toBe(true);
      ageLatestChallenge(email);
    }
    const sixth = await createAndSendOtp(email, '9.9.9.9');
    expect(sixth.success).toBe(false);
    expect(sixth.message).toMatch(/too many codes/i);
  });

  it('caps sends per IP per hour', async () => {
    for (let i = 0; i < 20; i++) {
      expect((await createAndSendOtp(`user${i}@example.com`, '5.5.5.5')).success).toBe(true);
    }
    const over = await createAndSendOtp('another@example.com', '5.5.5.5');
    expect(over.success).toBe(false);
    expect(over.message).toMatch(/too many requests/i);
  });

  it('accepts the correct code once and rejects replay', async () => {
    const { devCode } = await createAndSendOtp(email);
    expect((await verifyOtpCode(email, devCode!)).valid).toBe(true);

    const replay = await verifyOtpCode(email, devCode!);
    expect(replay.valid).toBe(false);
    expect(replay.reason).toContain('expired or not found');
  });

  it('locks a challenge after 5 wrong guesses, even if the right code follows', async () => {
    const { devCode } = await createAndSendOtp(email);
    const wrong = devCode === '000000' ? '000001' : '000000';

    for (let i = 1; i <= 4; i++) {
      const res = await verifyOtpCode(email, wrong, `10.0.0.${i}`);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('Incorrect passcode');
    }
    expect((await verifyOtpCode(email, wrong, '10.0.1.1')).reason).toContain('Too many incorrect attempts');

    const late = await verifyOtpCode(email, devCode!, '10.0.1.2');
    expect(late.valid).toBe(false);
    expect(late.reason).toContain('Too many incorrect attempts');
  });

  it('has no static/bypass code: 123456 is rejected with no challenge', async () => {
    const res = await verifyOtpCode('nobody@example.com', '123456');
    expect(res.valid).toBe(false);
  });

  it('has no static/bypass code: 123456 is rejected against a real challenge', async () => {
    const { devCode } = await createAndSendOtp(email);
    if (devCode === '123456') return; // astronomically unlikely collision
    expect((await verifyOtpCode(email, '123456')).valid).toBe(false);
  });

  it("does not accept one email's code for another email", async () => {
    const { devCode } = await createAndSendOtp('victim@example.com');
    await createAndSendOtp('attacker@example.com');
    expect((await verifyOtpCode('attacker@example.com', devCode!)).valid).toBe(false);
  });

  it('rejects expired codes', async () => {
    const { devCode } = await createAndSendOtp(email);
    db.otpChallenge.rows[0].expiresAt = new Date(Date.now() - 1000);
    const res = await verifyOtpCode(email, devCode!);
    expect(res.valid).toBe(false);
    expect(res.reason).toContain('expired or not found');
  });

  it('invalidates an older code when a new one is issued', async () => {
    const first = await createAndSendOtp(email);
    ageLatestChallenge(email);
    const second = await createAndSendOtp(email);
    expect((await verifyOtpCode(email, first.devCode!)).valid).toBe(false);
    expect((await verifyOtpCode(email, second.devCode!)).valid).toBe(true);
  });

  it('throttles verification guesses per IP across emails', async () => {
    for (let i = 0; i < 20; i++) {
      await verifyOtpCode(`probe${i}@example.com`, '000000', '7.7.7.7');
    }
    const blocked = await verifyOtpCode(email, '000000', '7.7.7.7');
    expect(blocked.valid).toBe(false);
    expect(blocked.reason).toMatch(/too many attempts/i);
  });
});
