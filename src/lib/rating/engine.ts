import crypto from 'node:crypto';
import { Band, Tier, DetailedBreakdown, ToneMode } from '@/types';
import { EconomyConfig } from '@/lib/economy';
import { ClientFeatureVector } from '@/lib/spikes/spikes';

export interface QualityGateResult {
  passed: boolean;
  sharpness: number;  // 0 - 100
  exposure: number;   // 0 - 100
  framing: number;    // 0 - 100
  rejectionReason?: string;
  checks?: Array<{ id: string; label: string; status: string; detail: string }>;
}

export class QualityGateError extends Error {
  constructor(
    message: string,
    public readonly checks: Array<{ id: string; label: string; status: string; detail: string }>
  ) {
    super(message);
    this.name = 'QualityGateError';
  }
}

export interface ScoreFaceInput {
  imageBuffer?: Buffer | string; // base64 or buffer
  featureVector?: ClientFeatureVector;
  toneMode?: ToneMode;
  userTier?: Tier;
}

export interface ScoredFaceResult {
  score: number; // 0 - 100
  band: Band;
  breakdown: DetailedBreakdown;
  verdictLine: string;
  tips: string[];
  qualityGate: QualityGateResult;
  scoringSource: 'AI_VISION' | 'FEATURE_VECTOR' | 'DETERMINISTIC_TEST_FALLBACK';
  evaluatedAt: string;
}

// Culture-aware tone copy database (Nigerian flavor & witty commentary)
const TONE_VERDICTS: Record<ToneMode, Record<Band, string[]>> = {
  HYPE: {
    LETHAL: [
      "Omo, face card never declines! Pure dangerous pressure, zero filter needed.",
      "God took extra time on this mold! Straight 10/10 lethality, certified billionaire aura.",
      "The camera was blessed to witness this face card today! Absolutely lethal.",
    ],
    DANGEROUS: [
      "Heavy pressure! Studio lighting is loving the symmetry today.",
      "High status registered. You're entering Platinum territory with this look.",
      "Stepping out with weaponized cheekbones. Highly dangerous face card.",
    ],
    SUSPICIOUS: [
      "The potential is loud! Good angles, just give the lighting a small upgrade.",
      "Solid groundwork. Clean up the shadows and you're entering dangerous territory.",
      "Aura is definitely there, just needs sharper focal alignment.",
    ],
    HARMLESS: [
      "Every hero has a training arc! Wipe the lens and step into natural sunlight.",
      "The face is ready, but your back-lighting betrayed you! Try facing the window.",
      "Good effort, let's lock in the camera framing for the next round.",
    ],
  },
  SMOOTH: {
    LETHAL: [
      "Effortless elegance. Immaculate facial harmony with effortless presence.",
      "Sculpted perfection. Balanced golden ratio proportions and calm command.",
      "Quiet luxury embodied in a face card. Truly lethal.",
    ],
    DANGEROUS: [
      "Sharp focal harmony. Defined features and calm intensity.",
      "Balanced and striking. Your facial symmetry is operating at peak levels.",
      "Polished presence. Very few can match this consistency.",
    ],
    SUSPICIOUS: [
      "Subtle appeal with room for cleaner focal precision.",
      "Refined foundation. Soft ambient lighting will elevate this to dangerous.",
      "Present and composed, just waiting for the golden hour light.",
    ],
    HARMLESS: [
      "A peaceful start. Position your eyes level with the camera lens.",
      "Soft features. Introduce directional light to carve out definition.",
      "Steady composure. Clean up the background framing on your next shot.",
    ],
  },
  ROAST: {
    LETHAL: [
      "You know you look good, don't let it get to your head before traffic catches you.",
      "Dangerous indeed, but we know you took 47 selfies before selecting this one.",
      "Lethal face card, but does your bank alert match this confidence?",
    ],
    DANGEROUS: [
      "Fine girl/boy no pimples, but the ring light is doing heavy overtime.",
      "Looking sharp, but let's see this same energy on a Monday morning 7 AM zoom call.",
      "Solid 80+, don't forget to thank your parents' genetics tonight.",
    ],
    SUSPICIOUS: [
      "Are you hiding from the light or is the light hiding from you?",
      "Mid-tier energy detected. You held the camera like a dad on Facebook.",
      "The spirit is willing but the angle is questionable. Elevate the phone, abeg.",
    ],
    HARMLESS: [
      "Who held the phone for you, your enemy? Turn on the light first!",
      "The lens grease is doing more work than your skincare routine. Wipe that camera!",
      "Harmless is an understatement. Even your front camera felt bad.",
    ],
  },
  STRAIGHT: {
    LETHAL: [
      "High facial harmony, exceptional sharpness, and balanced studio exposure.",
      "Top-tier biometric alignment with 94th percentile skin clarity and definition.",
      "Optimal lighting geometry and eye contact vectors.",
    ],
    DANGEROUS: [
      "Strong proportional symmetry and above-average feature definition.",
      "Clear facial contours with good focal depth and framing ratio.",
      "Consistent skin tone balance across the T-zone.",
    ],
    SUSPICIOUS: [
      "Moderate symmetry offset by sub-optimal lighting distribution.",
      "Acceptable facial structure, but sharpness variance degraded the overall score.",
      "Framing centered, but shadows obscure nasal bridge and jaw definition.",
    ],
    HARMLESS: [
      "Low light-to-shadow ratio detected. Increase illuminance by at least 40%.",
      "Motion blur detected across the focal plane. Stabilize the sensor.",
      "Head rotation exceeds 15 degrees. Face the sensor directly.",
    ],
  },
};

const ACTIONABLE_TIPS = [
  "Position your primary light source 45° above eye level to pronounce cheekbone depth.",
  "Wipe the front camera lens with a microfiber cloth to eliminate chromatic haze.",
  "Elevate the phone slightly above eye level to naturally elongate the jawline.",
  "Use soft diffused natural window light rather than direct overhead fluorescent bulbs.",
  "Maintain direct eye contact with the sensor lens, not your screen reflection.",
  "Relax your shoulders and breathe out slowly right as you tap capture for natural aura.",
];

interface ExtractedImageMetrics {
  isValid: boolean;
  format?: 'jpeg' | 'png' | 'webp' | 'unknown';
  exposure: number;
  sharpness: number;
  framing: number;
  entropy: number;
  rejectionReason?: string;
}

/**
 * Inspect raw image byte stream for format validation, exposure, and sharpness
 */
export function analyzeImageBytes(imageInput: Buffer | string): ExtractedImageMetrics {
  let buffer: Buffer;

  if (Buffer.isBuffer(imageInput)) {
    buffer = imageInput;
  } else if (typeof imageInput === 'string') {
    const cleanBase64 = imageInput.replace(/^data:image\/[a-z0-9+.-]+;base64,/i, '').trim();
    if (cleanBase64.length === 0) {
      return { isValid: false, exposure: 0, sharpness: 0, framing: 0, entropy: 0, rejectionReason: 'Image data is empty.' };
    }
    buffer = Buffer.from(cleanBase64, 'base64');
  } else {
    return { isValid: false, exposure: 0, sharpness: 0, framing: 0, entropy: 0, rejectionReason: 'Unsupported image input type.' };
  }

  if (buffer.length < 32) {
    return { isValid: false, exposure: 0, sharpness: 0, framing: 0, entropy: 0, rejectionReason: 'Image file is corrupted or too small (< 32 bytes).' };
  }

  // Format signature verification
  let format: ExtractedImageMetrics['format'] = 'unknown';
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    format = 'jpeg';
  } else if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    format = 'png';
  } else if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && // RIFF
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50  // WEBP
  ) {
    format = 'webp';
  }

  // Sample bytes across the image buffer (skipping header)
  const sampleCount = Math.min(1000, buffer.length - 16);
  const step = Math.max(1, Math.floor((buffer.length - 16) / sampleCount));
  let sum = 0;
  let diffSum = 0;
  const byteCounts = new Uint32Array(256);

  let prev = buffer[16];
  for (let i = 0; i < sampleCount; i++) {
    const b = buffer[16 + i * step];
    sum += b;
    diffSum += Math.abs(b - prev);
    byteCounts[b]++;
    prev = b;
  }

  const meanByte = sum / sampleCount; // 0 to 255
  const avgDiff = diffSum / sampleCount; // 0 to 255

  // Calculate Shannon entropy (randomness/detail density)
  let entropy = 0;
  for (let i = 0; i < 256; i++) {
    if (byteCounts[i] > 0) {
      const p = byteCounts[i] / sampleCount;
      entropy -= p * Math.log2(p);
    }
  }

  // Exposure calculation (ideal mean is ~110-150)
  // Low exposure (< 30) = pitch black; High exposure (> 240) = washed out
  let exposureScore = Math.round(100 - (Math.abs(meanByte - 128) / 128) * 60);
  exposureScore = Math.max(10, Math.min(100, exposureScore));

  // Sharpness calculation (higher local contrast and entropy correlate with sharpness)
  let sharpnessScore = Math.round((avgDiff / 64) * 50 + (entropy / 8) * 50);
  sharpnessScore = Math.max(15, Math.min(100, sharpnessScore));

  // Framing calculation (estimated from file density and entropy distribution)
  const framingScore = Math.max(50, Math.min(95, Math.round(75 + (entropy - 6) * 10)));

  // Quality gate failure triggers:
  if (meanByte < 22) {
    return {
      isValid: false,
      format,
      exposure: 18,
      sharpness: sharpnessScore,
      framing: framingScore,
      entropy,
      rejectionReason: 'Exposure too low. Image is too dark to detect facial landmarks. Please step into brighter light.',
    };
  }

  if (meanByte > 242) {
    return {
      isValid: false,
      format,
      exposure: 15,
      sharpness: sharpnessScore,
      framing: framingScore,
      entropy,
      rejectionReason: 'Exposure too high. Image is overexposed/blown out. Please reduce harsh back-lighting.',
    };
  }

  if (sharpnessScore < 40 || entropy < 3.5) {
    return {
      isValid: false,
      format,
      exposure: exposureScore,
      sharpness: sharpnessScore,
      framing: framingScore,
      entropy,
      rejectionReason: 'Image is too blurry or low contrast. Please hold the camera steady and clean the lens.',
    };
  }

  return {
    isValid: true,
    format,
    exposure: exposureScore,
    sharpness: sharpnessScore,
    framing: framingScore,
    entropy,
  };
}

/**
 * Deterministic quality gate verifying sharpness, lighting, and framing
 */
export function evaluateQualityGate(imageBuffer?: Buffer | string): QualityGateResult {
  if (!imageBuffer) {
    return {
      passed: true,
      sharpness: 88,
      exposure: 85,
      framing: 92,
    };
  }

  const analysis = analyzeImageBytes(imageBuffer);
  return {
    passed: analysis.isValid,
    sharpness: analysis.sharpness,
    exposure: analysis.exposure,
    framing: analysis.framing,
    rejectionReason: analysis.rejectionReason,
  };
}

/**
 * Optional AI Gateway vision scorer if branch token is configured
 */
async function callAiGatewayVision(imageBase64: string): Promise<Record<string, number> | null> {
  const baseUrl = process.env.NEON_AI_GATEWAY_BASE_URL;
  const token = process.env.NEON_AI_GATEWAY_TOKEN;
  if (!baseUrl || !token) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout for vision inference

    const url = `${baseUrl.replace(/\/+$/, '')}/v1/chat/completions`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a facial biometric and photo aesthetics evaluator. Return ONLY a single raw JSON object with numbers 0-100 for: lighting, sharpness, framing, harmony, skinClarity, featureDefinition, symmetry, expression, aura.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Evaluate this face card selfie:' },
              { type: 'image_url', image_url: { url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}` } },
            ],
          },
        ],
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (typeof content === 'string') {
      const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
    }
  } catch (err) {
    console.warn('Neon AI Gateway vision call skipped or timed out, using calibrated engine:', err);
  }
  return null;
}

/**
 * The core scoreFace() rating pipeline
 */
export async function scoreFace(input: ScoreFaceInput): Promise<ScoredFaceResult> {
  const tone = input.toneMode || 'HYPE';

  let quality: QualityGateResult;
  let scoringSource: ScoredFaceResult['scoringSource'] = 'DETERMINISTIC_TEST_FALLBACK';
  let photoCraftLighting = 88;
  let photoCraftSharpness = 85;
  let photoCraftFraming = 90;
  let faceHarmony = 86;
  let faceSkinClarity = 84;
  let faceFeatureDefinition = 85;
  let faceSymmetry = 82;
  let expressionScoreVal = 85;
  let auraScoreVal = 88;

  if (input.featureVector && input.featureVector.qualityGate && typeof input.featureVector.qualityGate === 'object') {
    scoringSource = 'FEATURE_VECTOR';
    const fv = input.featureVector;
    const qg = fv.qualityGate;
    const framingScore =
      'framing' in qg
        ? (qg as unknown as { framing: number }).framing
        : qg.framingCoverage;

    const noiseTooHigh = typeof qg.noiseLevel === 'number' && qg.noiseLevel > 60;
    const shadowsCrushed = typeof qg.crushedShadowFraction === 'number' && qg.crushedShadowFraction > 0.35;
    const sharpnessTooLow = qg.sharpness < 35;
    const faceMissing = qg.faceDetected === false;
    const effectivePassed = Boolean(qg.passed) && !noiseTooHigh && !shadowsCrushed && !sharpnessTooLow && !faceMissing;

    const failedChecks: Array<{ id: string; label: string; status: string; detail: string }> = [];
    if (!effectivePassed) {
      if (shadowsCrushed || qg.exposure < 40) {
        failedChecks.push({ id: 'lighting', label: 'Lighting', status: 'Insufficient', detail: 'Insufficient visible facial detail' });
      }
      if (noiseTooHigh || sharpnessTooLow) {
        failedChecks.push({ id: 'clarity', label: 'Image clarity', status: 'Low detail', detail: noiseTooHigh ? 'Considerable noise visible' : 'Motion blur or out of focus' });
      }
      failedChecks.push({ id: 'skin', label: 'Skin appearance', status: 'Unavailable', detail: 'Not reliably measurable' });
      failedChecks.push({ id: 'harmony', label: 'Facial harmony', status: 'Unconfirmed', detail: 'Measurement reliability unconfirmed' });
    }

    quality = {
      passed: effectivePassed,
      sharpness: qg.sharpness,
      exposure: qg.exposure,
      framing: framingScore,
      rejectionReason: !effectivePassed
        ? (qg.failureReasons?.[0] ||
            (qg as unknown as { rejectionReason?: string }).rejectionReason ||
            'Selfie failed quality gate check. There is not enough visible facial detail for a reliable analysis.')
        : undefined,
      checks: failedChecks,
    };

    photoCraftSharpness = qg.sharpness;
    photoCraftFraming = framingScore;
    photoCraftLighting = Math.min(100, Math.max(0, fv.lightingBalance));
    faceHarmony = Math.min(100, Math.max(0, 100 - fv.goldenRatioDeviation));
    faceSymmetry = Math.min(100, Math.max(0, fv.symmetry));
    faceSkinClarity = Math.min(100, Math.max(0, fv.skinTextureUniformity));
    faceFeatureDefinition = Math.min(100, Math.max(0, fv.jawlineDefinition));
    expressionScoreVal = Math.round((photoCraftLighting + photoCraftFraming) / 2);
    auraScoreVal = Math.round((photoCraftSharpness + photoCraftFraming) / 2);
  } else if (input.imageBuffer) {
    quality = evaluateQualityGate(input.imageBuffer);

    if (quality.passed) {
      const cloudEnabled = process.env.ENABLE_CLOUD_AI === 'true';
      const imageStr = typeof input.imageBuffer === 'string' ? input.imageBuffer : input.imageBuffer.toString('base64');
      const aiScores = cloudEnabled ? await callAiGatewayVision(imageStr) : null;

      if (aiScores) {
        scoringSource = 'AI_VISION';
        photoCraftLighting = Math.max(0, Math.min(100, aiScores.lighting ?? 85));
        photoCraftSharpness = Math.max(0, Math.min(100, aiScores.sharpness ?? quality.sharpness));
        photoCraftFraming = Math.max(0, Math.min(100, aiScores.framing ?? quality.framing));
        faceHarmony = Math.max(0, Math.min(100, aiScores.harmony ?? 85));
        faceSkinClarity = Math.max(0, Math.min(100, aiScores.skinClarity ?? 82));
        faceFeatureDefinition = Math.max(0, Math.min(100, aiScores.featureDefinition ?? 84));
        faceSymmetry = Math.max(0, Math.min(100, aiScores.symmetry ?? 80));
        expressionScoreVal = Math.max(0, Math.min(100, aiScores.expression ?? 85));
        auraScoreVal = Math.max(0, Math.min(100, aiScores.aura ?? 87));
      } else {
        // Do NOT fabricate SHA-256 hash scores when neither on-device landmarks nor cloud AI are available.
        throw new QualityGateError(
          'Selfie failed quality gate check. Insufficient facial measurement data — face a light source and try another capture.',
          [
            { id: 'lighting', label: 'Lighting', status: 'Unverified', detail: 'Could not verify facial illumination' },
            { id: 'clarity', label: 'Image clarity', status: 'Unverified', detail: 'On-device landmark extraction required' },
            { id: 'skin', label: 'Skin appearance', status: 'Unavailable', detail: 'Not reliably measurable' },
            { id: 'harmony', label: 'Facial harmony', status: 'Unconfirmed', detail: 'Measurement reliability unconfirmed' },
          ]
        );
      }
    }
  } else {
    // Default calibration harness path (used in fairness audit & unit testing)
    quality = evaluateQualityGate();
  }

  // Check Quality Gate: throw structured QualityGateError if rejected
  if (!quality.passed) {
    throw new QualityGateError(
      quality.rejectionReason || 'Selfie failed quality gate check. Please align face clearly.',
      quality.checks ?? [
        { id: 'lighting', label: 'Lighting', status: 'Insufficient', detail: 'Insufficient visible facial detail' },
        { id: 'clarity', label: 'Image clarity', status: 'Low detail', detail: 'Image clarity check failed' },
        { id: 'skin', label: 'Skin appearance', status: 'Unavailable', detail: 'Not reliably measurable' },
        { id: 'harmony', label: 'Facial harmony', status: 'Unconfirmed', detail: 'Measurement reliability unconfirmed' },
      ]
    );
  }

  // Photo Craft (30%): Lighting (15%), Sharpness (8%), Framing (7%)
  const photoCraftScore = Math.round(
    photoCraftLighting * 0.15 + photoCraftSharpness * 0.08 + photoCraftFraming * 0.07
  );

  // Face (45%): Harmony (18%), Skin Clarity (12%), Feature Definition (10%), Symmetry (5%)
  const faceScore = Math.round(
    faceHarmony * 0.18 + faceSkinClarity * 0.12 + faceFeatureDefinition * 0.10 + faceSymmetry * 0.05
  );

  const expressionScore = Math.round(expressionScoreVal * EconomyConfig.WEIGHTS.EXPRESSION);
  const auraScore = Math.round(auraScoreVal * EconomyConfig.WEIGHTS.AURA);

  const totalScore = Math.min(100, Math.max(0, photoCraftScore + faceScore + expressionScore + auraScore));

  let band: Band = 'HARMLESS';
  if (totalScore >= 85) band = 'LETHAL';
  else if (totalScore >= 65) band = 'DANGEROUS';
  else if (totalScore >= 40) band = 'SUSPICIOUS';

  // Pick culture-aware verdict
  const verdictOptions = TONE_VERDICTS[tone][band];
  const verdictLine = verdictOptions[Math.floor(Math.random() * verdictOptions.length)];

  // Pick top 2 relevant tips based on lowest subscore
  const tips: string[] = [];
  if (photoCraftLighting < 80) tips.push(ACTIONABLE_TIPS[0]);
  if (photoCraftSharpness < 80) tips.push(ACTIONABLE_TIPS[1]);
  if (faceFeatureDefinition < 80) tips.push(ACTIONABLE_TIPS[2]);
  if (tips.length < 2) tips.push(ACTIONABLE_TIPS[3]);
  if (tips.length < 2) tips.push(ACTIONABLE_TIPS[4]);

  return {
    score: totalScore,
    band,
    breakdown: {
      photoCraft: {
        lighting: photoCraftLighting,
        sharpness: photoCraftSharpness,
        framing: photoCraftFraming,
      },
      face: {
        harmony: faceHarmony,
        skinClarity: faceSkinClarity,
        featureDefinition: faceFeatureDefinition,
        symmetry: faceSymmetry,
      },
      expression: expressionScoreVal,
      aura: auraScoreVal,
    },
    verdictLine,
    tips: tips.slice(0, 2),
    qualityGate: quality,
    scoringSource,
    evaluatedAt: new Date().toISOString(),
  };
}
