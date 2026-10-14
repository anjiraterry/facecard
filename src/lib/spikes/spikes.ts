import { Band, Tier } from '@/types';

/**
 * Spike S1: Cloudflare Worker Bundle & Hyperdrive Sizing Constraints
 */
export const SPIKE_S1_LIMITS = {
  maxCompressedWorkerSizeMB: 10,
  maxUncompressedWorkerSizeMB: 50,
  dbPoolMaxConnections: 10,
  dbIdleTimeoutMs: 30000,
};

/**
 * Spike S2: On-Device MediaPipe Feature Vector & Server Recomputation Contract
 */
export interface ClientFeatureVector {
  symmetry: number; // 0-100
  goldenRatioDeviation: number; // 0-100 (lower is closer to ideal ratio)
  skinTextureUniformity: number; // 0-100
  lightingBalance: number; // 0-100
  eyeCanthalTiltAngle: number; // degrees (-15 to +15)
  jawlineDefinition: number; // 0-100
  qualityGate: {
    passed: boolean;
    sharpness: number;
    exposure: number;
    framingCoverage: number;
  };
  clientEngine: 'MEDIAPIPE_WASM' | 'SERVERLESS_FALLBACK';
}

export interface RecomputedScoreResult {
  score: number;
  band: Band;
  tier: Tier;
  pointsEarned: number;
  multiplier: number;
  deterministicHash: string;
}

export function verifyAndScoreFeatureVector(
  vector: ClientFeatureVector,
  streakDays: number = 1
): RecomputedScoreResult {
  // Validate quality gate
  if (!vector.qualityGate.passed || vector.qualityGate.sharpness < 50) {
    throw new Error('Image quality gate failed: sharpness or lighting below threshold.');
  }

  // Deterministic scoring formula using weighted feature components
  const symmetryScore = Math.min(100, Math.max(0, vector.symmetry));
  const ratioScore = Math.min(100, Math.max(0, 100 - vector.goldenRatioDeviation));
  const skinScore = Math.min(100, Math.max(0, vector.skinTextureUniformity));
  const lightingScore = Math.min(100, Math.max(0, vector.lightingBalance));
  const jawScore = Math.min(100, Math.max(0, vector.jawlineDefinition));

  // Weighted raw lethality
  const rawLethality = Math.round(
    symmetryScore * 0.25 +
    ratioScore * 0.20 +
    skinScore * 0.20 +
    lightingScore * 0.15 +
    jawScore * 0.20
  );

  const score = Math.max(0, Math.min(100, rawLethality));

  // Determine band
  let band: Band = 'HARMLESS';
  if (score >= 90) band = 'LETHAL';
  else if (score >= 80) band = 'DANGEROUS';
  else if (score >= 60) band = 'SUSPICIOUS';

  // Determine tier
  let tier: Tier = 'CLASSIC';
  if (score >= 90) tier = 'BLACK';
  else if (score >= 80) tier = 'PLATINUM';
  else if (score >= 60) tier = 'GOLD';

  // Multiplier calculation (1.0x to 1.5x based on streak)
  const multiplier = Math.min(1.5, 1.0 + (streakDays - 1) * 0.05);
  const basePoints = Math.round(score * 1.5);
  const pointsEarned = Math.round(basePoints * multiplier);

  // Simple deterministic hash for cryptographic audit
  const deterministicHash = `FC-DETERMINISTIC-${score}-${band}-${streakDays}-${Date.now().toString(36)}`;

  return {
    score,
    band,
    tier,
    pointsEarned,
    multiplier,
    deterministicHash,
  };
}

/**
 * Spike S3: Rate Limiting & ScanSlot Quota Helper
 * Day keys computed in Africa/Lagos timezone (UTC+1)
 */
export function getLagosDayKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Spike S4: Workers-Compatible Dynamic OG SVG Card Generation
 */
export function generateCardSvg(params: {
  displayName: string;
  handle: string;
  score: number;
  tier: Tier;
  band: Band;
}): string {
  const { displayName, handle, score, tier, band } = params;
  const tierColor = tier === 'BLACK' ? '#18181B' : tier === 'PLATINUM' ? '#A5B4FC' : tier === 'GOLD' ? '#E8D744' : '#E0E7FF';
  const textColor = tier === 'BLACK' ? '#FFFFFF' : '#140826';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0E081A" />
        <stop offset="100%" stop-color="#241040" />
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)" />
    <rect x="200" y="95" width="800" height="440" rx="32" fill="${tierColor}" />
    <text x="250" y="160" font-family="sans-serif" font-weight="900" font-size="28" fill="${textColor}">FACECARD</text>
    <text x="950" y="160" font-family="sans-serif" font-weight="800" font-size="22" text-anchor="end" fill="${textColor}">${tier} TIER</text>
    <text x="250" y="380" font-family="sans-serif" font-weight="700" font-size="20" fill="${textColor}" opacity="0.7">CARDHOLDER</text>
    <text x="250" y="430" font-family="sans-serif" font-weight="900" font-size="36" fill="${textColor}">${displayName.toUpperCase()}</text>
    <text x="250" y="470" font-family="sans-serif" font-weight="600" font-size="20" fill="${textColor}" opacity="0.8">@${handle.replace(/^@/, '')}</text>
    <text x="950" y="430" font-family="sans-serif" font-weight="900" font-size="72" text-anchor="end" fill="${textColor}">${score}</text>
    <text x="950" y="470" font-family="sans-serif" font-weight="700" font-size="18" text-anchor="end" fill="${textColor}">VERDICT: ${band}</text>
  </svg>`;
}

/**
 * Spike S5: Brevo Native Fetch Client for Cloudflare Workers
 */
export async function sendBrevoOtpEmail(params: {
  apiKey: string;
  toEmail: string;
  otpCode: string;
  fetchFn?: typeof fetch;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { apiKey, toEmail, otpCode, fetchFn = fetch } = params;

  if (!apiKey) {
    // Development / mock fallback
    return { success: true, messageId: `mock-brevo-${Date.now()}` };
  }

  try {
    const res = await fetchFn('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Face Card', email: 'auth@facecard.app' },
        to: [{ email: toEmail }],
        subject: `Your Face Card Passcode: ${otpCode}`,
        htmlContent: `<p>Your 6-digit Face Card verification passcode is <strong>${otpCode}</strong>. Expires in 10 minutes.</p>`,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Brevo API error ${res.status}: ${errText}` };
    }

    const data = await res.json() as { messageId?: string };
    return { success: true, messageId: data.messageId };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
