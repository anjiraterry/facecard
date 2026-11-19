export const INSIGHT_KB_VERSION = '1.0.0';

export interface KnowledgeInsightObject {
  id: string;
  domain: 'PORTRAIT' | 'SKINCARE';
  title: string;
  conditionLabel: string;
  explanation: string;
  suggestedAction: string;
  limitation: string;
  version: string;
}

export const INSIGHT_KNOWLEDGE_BASE: KnowledgeInsightObject[] = [
  {
    id: 'portrait-low-lighting',
    domain: 'PORTRAIT',
    title: 'Soften & Balance Lighting',
    conditionLabel: 'Lighting score below 80',
    explanation: 'Uneven or dim lighting creates shadows across facial contours, reducing clarity in the portrait.',
    suggestedAction: 'Face a soft natural window or diffused front light rather than overhead or back lighting.',
    limitation: 'Lighting quality affects photo clarity only, not your actual skin health.',
    version: INSIGHT_KB_VERSION,
  },
  {
    id: 'portrait-sharpness',
    domain: 'PORTRAIT',
    title: 'Crisper Focal Clarity',
    conditionLabel: 'Sharpness score below 80',
    explanation: 'Slight camera motion or lens smudges soften fine facial definition.',
    suggestedAction: 'Wipe the front camera lens gently and hold steady for one second before tapping Shutter.',
    limitation: 'Camera sensor resolution varies across devices.',
    version: INSIGHT_KB_VERSION,
  },
  {
    id: 'portrait-framing',
    domain: 'PORTRAIT',
    title: 'Balanced Oval Framing',
    conditionLabel: 'Framing score below 80',
    explanation: 'Keeping your face centered at eye level minimizes wide-angle perspective distortion.',
    suggestedAction: 'Hold the phone at eye level about an arm’s length away and center within the oval.',
    limitation: 'Wide-angle front lenses naturally exaggerate features when held too close.',
    version: INSIGHT_KB_VERSION,
  },
  {
    id: 'skincare-barrier-sensitivity',
    domain: 'SKINCARE',
    title: 'Gentle Barrier Support',
    conditionLabel: 'Sensitive or reactive skin profile',
    explanation: 'Based on your self-reported sensitivity, gentle non-stripping cleansers and fragrance-free moisturizers help maintain comfort.',
    suggestedAction: 'Introduce one new active at a time and patch test on the jawline or inner forearm for 24 hours.',
    limitation: 'General skincare education only; not a medical or dermatological diagnosis.',
    version: INSIGHT_KB_VERSION,
  },
  {
    id: 'skincare-daily-spf',
    domain: 'SKINCARE',
    title: 'Daily Sun Protection Habit',
    conditionLabel: 'Tone & protection goal',
    explanation: 'Consistent broad-spectrum SPF 30+ each morning supports even-looking tone and protects barrier gains.',
    suggestedAction: 'Apply two finger-lengths as the final morning step before sun exposure.',
    limitation: 'General skincare education only; consult a licensed dermatologist for persistent concerns.',
    version: INSIGHT_KB_VERSION,
  },
];

export function generateLocalInsights(input: {
  lighting?: number;
  sharpness?: number;
  framing?: number;
  skinType?: string | null;
  isSensitive?: boolean;
}): KnowledgeInsightObject[] {
  const results: KnowledgeInsightObject[] = [];

  if (typeof input.lighting === 'number' && input.lighting < 80) {
    results.push(INSIGHT_KNOWLEDGE_BASE[0]);
  }
  if (typeof input.sharpness === 'number' && input.sharpness < 80) {
    results.push(INSIGHT_KNOWLEDGE_BASE[1]);
  }
  if (typeof input.framing === 'number' && input.framing < 80) {
    results.push(INSIGHT_KNOWLEDGE_BASE[2]);
  }
  if (input.isSensitive) {
    results.push(INSIGHT_KNOWLEDGE_BASE[3]);
  }
  if (input.skinType) {
    results.push(INSIGHT_KNOWLEDGE_BASE[4]);
  }

  return results;
}
