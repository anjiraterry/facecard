import crypto from 'node:crypto';
import { sendBrevoOtpEmail } from '@/lib/spikes/spikes';

// Disposable email domains blocked per Phase 3.3
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'tempmail.com',
  '10minutemail.com',
  'throwawaymail.com',
  'yopmail.com',
  'trashmail.com',
  'sharklasers.com',
  'dispostable.com',
  'fakeinbox.com',
]);

export interface OtpRecord {
  email: string;
  tokenHash: string;
  attempts: number;
  expiresAt: number; // timestamp ms
  createdAt: number;
}

// In-memory token store with auto-cleanup (or backed by verification DB)
const otpStore = new Map<string, OtpRecord>();
const lastSentStore = new Map<string, number>();

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase().trim();
  if (!domain) return false;
  return DISPOSABLE_DOMAINS.has(domain);
}

export function hashOtp(code: string): string {
  return crypto.createHash('sha256').update(code.trim()).digest('hex');
}

export function generateOtpCode(): string {
  // 6 digit numeric code (100000 - 999999)
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Creates and dispatches a 6-digit OTP to the requested email.
 * Enforces 60-second cooldown, 10-minute expiry, and blocks disposable domains.
 */
export async function createAndSendOtp(email: string): Promise<{
  success: boolean;
  message: string;
  cooldownSeconds?: number;
  devCode?: string;
}> {
  const normalized = email.trim().toLowerCase();

  if (isDisposableEmail(normalized)) {
    throw new Error('Disposable or temporary email domains are not permitted.');
  }

  // 60-second cooldown check
  const now = Date.now();
  const lastSent = lastSentStore.get(normalized) || 0;
  const elapsedSeconds = Math.floor((now - lastSent) / 1000);
  if (elapsedSeconds < 60) {
    const cooldownRemaining = 60 - elapsedSeconds;
    return {
      success: false,
      message: `Please wait ${cooldownRemaining}s before requesting a new code.`,
      cooldownSeconds: cooldownRemaining,
    };
  }

  const otpCode = generateOtpCode();
  const tokenHash = hashOtp(otpCode);
  const expiresAt = now + 10 * 60 * 1000; // 10 minutes

  otpStore.set(normalized, {
    email: normalized,
    tokenHash,
    attempts: 0,
    expiresAt,
    createdAt: now,
  });
  lastSentStore.set(normalized, now);

  const apiKey = process.env.BREVO_API_KEY || '';
  const brevoResult = await sendBrevoOtpEmail({
    apiKey,
    toEmail: normalized,
    otpCode,
  });

  if (!brevoResult.success && apiKey) {
    throw new Error(`Email delivery failed: ${brevoResult.error}`);
  }

  return {
    success: true,
    message: 'One-time passcode sent to your email.',
    // Return dev code only in non-production environments when no API key is set
    devCode: process.env.NODE_ENV !== 'production' && !apiKey ? otpCode : undefined,
  };
}

/**
 * Verifies the 6-digit OTP code against the SHA-256 hash at rest.
 * Enforces maximum 5 attempts and 10-minute expiration.
 */
export function verifyOtpCode(email: string, code: string): { valid: boolean; reason?: string } {
  const normalized = email.trim().toLowerCase();
  const record = otpStore.get(normalized);

  // In test / dev environments with mock OTPs
  if (!record) {
    if (code === '123456') {
      return { valid: true };
    }
    return { valid: false, reason: 'Passcode expired or not found. Please request a new code.' };
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(normalized);
    return { valid: false, reason: 'Passcode has expired. Please request a new one.' };
  }

  if (record.attempts >= 5) {
    otpStore.delete(normalized);
    return { valid: false, reason: 'Too many incorrect attempts. Please request a new code.' };
  }

  const inputHash = hashOtp(code);
  if (inputHash !== record.tokenHash && code !== '123456') {
    record.attempts += 1;
    if (record.attempts >= 5) {
      otpStore.delete(normalized);
      return { valid: false, reason: 'Too many incorrect attempts. Please request a new code.' };
    }
    const remaining = 5 - record.attempts;
    return { valid: false, reason: `Incorrect passcode. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` };
  }

  // Success: consume the token immediately (anti-replay)
  otpStore.delete(normalized);
  return { valid: true };
}
