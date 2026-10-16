import crypto from 'node:crypto';
import { sendBrevoOtpEmail } from '@/lib/spikes/spikes';
import { db } from '@/lib/db';
import { isRateLimited, recordAttempt } from '@/lib/auth/rateLimit';

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

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_MAX_SENDS_PER_EMAIL_PER_HOUR = 5;
const OTP_MAX_SENDS_PER_IP_PER_HOUR = 20;
const OTP_MAX_FAILURES_PER_IP_PER_15_MIN = 20;
const HOUR_MS = 60 * 60 * 1000;
const FIFTEEN_MIN_MS = 15 * 60 * 1000;

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase().trim();
  if (!domain) return false;
  return DISPOSABLE_DOMAINS.has(domain);
}

function getPepper(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET must be configured in production.');
  }
  return 'dev-only-otp-pepper';
}

/** HMAC-SHA256 of the code bound to the email, so a leaked table cannot be brute-forced offline without the secret. */
export function hashOtp(code: string, email = ''): string {
  return crypto
    .createHmac('sha256', getPepper())
    .update(`${email.trim().toLowerCase()}:${code.trim()}`)
    .digest('hex');
}

export function generateOtpCode(): string {
  // 6 digit numeric code (100000 - 999999)
  return crypto.randomInt(100000, 1000000).toString();
}

function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

/**
 * Creates, persists and dispatches a 6-digit OTP.
 * Enforces a 60s cooldown, per-email and per-IP hourly send caps, 10-minute expiry,
 * and blocks disposable domains. Issuing a new code invalidates earlier unused codes.
 */
export async function createAndSendOtp(
  email: string,
  ip = 'unknown'
): Promise<{
  success: boolean;
  message: string;
  cooldownSeconds?: number;
  devCode?: string;
}> {
  const normalized = email.trim().toLowerCase();

  if (isDisposableEmail(normalized)) {
    throw new Error('Disposable or temporary email domains are not permitted.');
  }

  const now = Date.now();

  const latest = await db.otpChallenge.findFirst({
    where: { email: normalized },
    orderBy: { createdAt: 'desc' },
  });
  if (latest) {
    const elapsedSeconds = Math.floor((now - latest.createdAt.getTime()) / 1000);
    if (elapsedSeconds < OTP_RESEND_COOLDOWN_SECONDS) {
      const cooldownRemaining = OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds;
      return {
        success: false,
        message: `Please wait ${cooldownRemaining}s before requesting a new code.`,
        cooldownSeconds: cooldownRemaining,
      };
    }
  }

  const sentLastHour = await db.otpChallenge.count({
    where: { email: normalized, createdAt: { gt: new Date(now - HOUR_MS) } },
  });
  if (sentLastHour >= OTP_MAX_SENDS_PER_EMAIL_PER_HOUR) {
    return { success: false, message: 'Too many codes requested. Please try again later.' };
  }

  if (await isRateLimited('otp_send_ip', ip, OTP_MAX_SENDS_PER_IP_PER_HOUR, HOUR_MS)) {
    return { success: false, message: 'Too many requests. Please try again later.' };
  }

  const apiKey = process.env.BREVO_API_KEY || '';
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd && !apiKey) {
    throw new Error('Email delivery is not configured.');
  }

  const otpCode = generateOtpCode();

  await db.otpChallenge.updateMany({
    where: { email: normalized, consumedAt: null },
    data: { consumedAt: new Date(now) },
  });
  const challenge = await db.otpChallenge.create({
    data: {
      email: normalized,
      codeHash: hashOtp(otpCode, normalized),
      expiresAt: new Date(now + OTP_TTL_MS),
    },
  });
  await recordAttempt('otp_send_ip', ip);

  const brevoResult = await sendBrevoOtpEmail({ apiKey, toEmail: normalized, otpCode });

  if (!brevoResult.success && apiKey) {
    // Don't leave a usable code (or an active cooldown) behind for an email that was never delivered.
    await db.otpChallenge.delete({ where: { id: challenge.id } }).catch(() => undefined);
    throw new Error(`Email delivery failed: ${brevoResult.error}`);
  }

  return {
    success: true,
    message: 'One-time passcode sent to your email.',
    // Returned only outside production when no mail provider is configured.
    devCode: !isProd && !apiKey ? otpCode : undefined,
  };
}

/**
 * Verifies a code against the persisted challenge.
 * - Max 5 guesses per challenge (atomic increment), 10-minute expiry.
 * - Single use (atomic consume), so concurrent/replayed requests cannot both succeed.
 * - Per-IP failure throttle.
 * There is no static/test code: a code is only valid if it was issued for this email.
 */
export async function verifyOtpCode(
  email: string,
  code: string,
  ip = 'unknown'
): Promise<{ valid: boolean; reason?: string }> {
  const normalized = email.trim().toLowerCase();

  if (await isRateLimited('otp_verify_fail_ip', ip, OTP_MAX_FAILURES_PER_IP_PER_15_MIN, FIFTEEN_MIN_MS)) {
    return { valid: false, reason: 'Too many attempts. Please try again later.' };
  }

  const fail = async (reason: string) => {
    await recordAttempt('otp_verify_fail_ip', ip);
    return { valid: false, reason };
  };

  const now = new Date();
  const challenge = await db.otpChallenge.findFirst({
    where: { email: normalized, consumedAt: null, expiresAt: { gt: now } },
    orderBy: { createdAt: 'desc' },
  });

  if (!challenge) {
    return fail('Passcode expired or not found. Please request a new code.');
  }

  // Claim one guess atomically; zero rows means the guess budget is spent (or it was just consumed).
  const claimed = await db.otpChallenge.updateMany({
    where: { id: challenge.id, consumedAt: null, attempts: { lt: OTP_MAX_ATTEMPTS } },
    data: { attempts: { increment: 1 } },
  });
  if (claimed.count === 0) {
    return fail('Too many incorrect attempts. Please request a new code.');
  }

  const attemptsUsed = challenge.attempts + 1;

  if (!safeEqualHex(hashOtp(code, normalized), challenge.codeHash)) {
    if (attemptsUsed >= OTP_MAX_ATTEMPTS) {
      return fail('Too many incorrect attempts. Please request a new code.');
    }
    const remaining = OTP_MAX_ATTEMPTS - attemptsUsed;
    return fail(`Incorrect passcode. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`);
  }

  const consumed = await db.otpChallenge.updateMany({
    where: { id: challenge.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  if (consumed.count === 0) {
    return fail('Passcode expired or not found. Please request a new code.');
  }

  return { valid: true };
}
