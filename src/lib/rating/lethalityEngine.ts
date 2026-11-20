export const LETHALITY_SCORING_VERSION = 'v2.0-presentation';

export type LethalityMetricId =
  | 'visual_presentation'
  | 'pose_composition'
  | 'expression_engagement'
  | 'lighting_balance'
  | 'image_detail';

export interface LethalityComponentMetric {
  id: LethalityMetricId;
  label: string;
  weight: number;
  score: number;
  available: boolean;
}

export type LethalityWeights = Record<LethalityMetricId, number>;

export const DEFAULT_LETHALITY_WEIGHTS: LethalityWeights = {
  visual_presentation: 0.30,
  pose_composition: 0.25,
  expression_engagement: 0.20,
  lighting_balance: 0.15,
  image_detail: 0.10,
};

const METRIC_LABELS: Record<LethalityMetricId, string> = {
  visual_presentation: 'Visual Presentation',
  pose_composition: 'Pose & Composition',
  expression_engagement: 'Expression & Engagement',
  lighting_balance: 'Lighting Balance',
  image_detail: 'Image Detail',
};

export interface LethalityEvaluation {
  scoringVersion: string;
  lethalityScore: number; // 1 - 100
  provenance: 'LOCAL_PRESENTATION' | 'FEATURE_VECTOR';
  components: LethalityComponentMetric[];
  disclaimer: string;
}

export function validateLethalityWeights(raw: unknown): { valid: boolean; errors: string[]; weights?: LethalityWeights } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { valid: false, errors: ['Weights must be an object'] };
  }
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  const weights = {} as LethalityWeights;
  let sum = 0;

  for (const id of Object.keys(DEFAULT_LETHALITY_WEIGHTS) as LethalityMetricId[]) {
    const v = obj[id];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1) {
      errors.push(`Weight '${id}' must be a number between 0 and 1`);
      continue;
    }
    weights[id] = v;
    sum += v;
  }

  // Only the defined presentation metrics are allowed: no facial-feature or skin-colour weights.
  for (const key of Object.keys(obj)) {
    if (!(key in DEFAULT_LETHALITY_WEIGHTS)) {
      errors.push(`Unknown weight '${key}'. Only controllable presentation metrics are permitted.`);
    }
  }

  if (errors.length === 0 && Math.abs(sum - 1) > 0.001) {
    errors.push(`Weights must sum to 1.0 (currently ${sum.toFixed(3)})`);
  }

  return errors.length ? { valid: false, errors } : { valid: true, errors: [], weights };
}

/**
 * Deterministic, versioned Lethality Score (1-100) based on controllable presentation criteria.
 * Does not use immutable facial characteristics, skin tone or skin brightness.
 */
export function computeLethalityScore(input: {
  presentation: number;
  poseComposition: number;
  expressionEngagement: number;
  lightingBalance: number;
  imageDetail: number;
  provenance?: 'LOCAL_PRESENTATION' | 'FEATURE_VECTOR';
  weights?: LethalityWeights;
}): LethalityEvaluation {
  const clamp = (v: number) => Math.max(1, Math.min(100, Math.round(v)));
  const w = input.weights ?? DEFAULT_LETHALITY_WEIGHTS;

  const raw: Record<LethalityMetricId, number> = {
    visual_presentation: input.presentation,
    pose_composition: input.poseComposition,
    expression_engagement: input.expressionEngagement,
    lighting_balance: input.lightingBalance,
    image_detail: input.imageDetail,
  };

  const components: LethalityComponentMetric[] = (Object.keys(raw) as LethalityMetricId[]).map((id) => ({
    id,
    label: METRIC_LABELS[id],
    weight: w[id],
    score: clamp(raw[id]),
    available: true,
  }));

  const weightedSum = components.reduce((acc, c) => acc + c.score * c.weight, 0);

  return {
    scoringVersion: LETHALITY_SCORING_VERSION,
    lethalityScore: clamp(weightedSum),
    provenance: input.provenance ?? 'LOCAL_PRESENTATION',
    components,
    disclaimer: 'Entertainment-oriented Face Card presentation score; not a measure of intrinsic beauty or skin health.',
  };
}

/**
 * Maps presentation sub-metrics to the Lethality inputs. Face harmony, symmetry and skin
 * appearance are deliberately NOT inputs; they remain independent descriptive observations.
 */
export function lethalityInputsFromPresentation(p: {
  lighting: number;
  sharpness: number;
  framing: number;
  expression: number;
  aura: number;
}) {
  const photoCraftMean = (p.lighting + p.sharpness + p.framing) / 3;
  return {
    presentation: (photoCraftMean + p.aura) / 2,
    poseComposition: p.framing,
    expressionEngagement: p.expression,
    lightingBalance: p.lighting,
    imageDetail: p.sharpness,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// HARMONY INDEX V2.1 — EXPERIMENTAL SKINCARE-ORIENTED RUBRIC (DISABLED IN PROD)
// ═════════════════════════════════════════════════════════════════════════════

export const HARMONY_V2_1_RUBRIC_VERSION = 'v2.1-harmony-experimental';

/**
 * Product-hypothesis weights for Harmony Index V2.1.
 * Disabled in production until reliability, fairness across MST 1-10, and relevance
 * are independently validated with consenting adult participants.
 */
export const EXPERIMENTAL_FACTORS_ENABLED_IN_PROD = false;

export type HarmonyV21FactorId =
  | 'skin_appearance'
  | 'facial_harmony'
  | 'expression_presentation'
  | 'facial_definition'
  | 'photo_craft';

export type HarmonyV21Weights = Record<HarmonyV21FactorId, number>;

export const HARMONY_V2_1_EXPERIMENTAL_WEIGHTS: HarmonyV21Weights = {
  skin_appearance: 0.40,
  facial_harmony: 0.25,
  expression_presentation: 0.15,
  facial_definition: 0.10,
  photo_craft: 0.10,
};

export interface HarmonyV21FactorResult {
  id: HarmonyV21FactorId;
  label: string;
  targetWeight: number;
  activeWeightInProd: number;
  descriptiveValue: number | null;
  status: 'VALIDATED_ACTIVE' | 'FIREWALLED_OBSERVATION_ONLY' | 'DROPPED_DESCRIPTIVE_ONLY' | 'EXPERIMENTAL_DESCRIPTIVE_ONLY' | 'UNAVAILABLE';
  note: string;
}

export function computeConfidenceWeightedScore(
  items: Array<{ score: number | null; weight: number; confidence: number }>
): { score: number | null; effectiveCoverage: number } {
  const totalWeight = items.reduce((acc, it) => acc + it.weight, 0);
  if (totalWeight <= 0) return { score: null, effectiveCoverage: 0 };

  let weightedSum = 0;
  let activeWeight = 0;

  for (const it of items) {
    if (typeof it.score !== 'number' || !Number.isFinite(it.score) || it.confidence <= 0) continue;
    const eff = it.weight * Math.max(0, Math.min(1, it.confidence));
    weightedSum += eff * Math.max(1, Math.min(100, it.score));
    activeWeight += eff;
  }

  const effectiveCoverage = Number((activeWeight / totalWeight).toFixed(2));
  if (activeWeight <= 0 || effectiveCoverage < 0.5) {
    return { score: null, effectiveCoverage };
  }
  return { score: Math.round(weightedSum / activeWeight), effectiveCoverage };
}

export interface HarmonyV21Evaluation {
  rubricVersion: string;
  experimentalEnabled: boolean;
  publishedScoreVersion: string;
  publishedScore: number;
  scopeDisclosure: string;
  factors: HarmonyV21FactorResult[];
}

export function validateHarmonyV21Weights(raw: unknown): {
  valid: boolean;
  errors: string[];
  weights?: HarmonyV21Weights;
} {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { valid: false, errors: ['Harmony V2.1 weights must be an object'] };
  }
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  const weights = {} as HarmonyV21Weights;
  let sum = 0;

  for (const id of Object.keys(HARMONY_V2_1_EXPERIMENTAL_WEIGHTS) as HarmonyV21FactorId[]) {
    const v = obj[id];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1) {
      errors.push(`Weight '${id}' must be a number between 0 and 1`);
      continue;
    }
    weights[id] = v;
    sum += v;
  }

  if (errors.length === 0 && Math.abs(sum - 1) > 0.001) {
    errors.push(`Harmony V2.1 weights must sum to 1.0 (currently ${sum.toFixed(3)})`);
  }

  return errors.length ? { valid: false, errors } : { valid: true, errors: [], weights };
}

/**
 * Evaluates Harmony Index V2.1 metadata while keeping unvalidated appearance/geometry
 * factors disabled in production scoring. Uses the validated presentation score as
 * publishedScore until human-participant validation passes.
 */
export function evaluateHarmonyV21(input: {
  presentationEval: LethalityEvaluation;
  skinAppearanceNote?: number | null;
  facialHarmonyNote?: number | null;
  facialDefinitionNote?: number | null;
  expressionPresentation: number;
  photoCraft: number;
}): HarmonyV21Evaluation {
  const clampOpt = (v: number | null | undefined) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(1, Math.min(100, Math.round(v))) : null;

  const factors: HarmonyV21FactorResult[] = [
    {
      id: 'skin_appearance',
      label: 'Skin appearance',
      targetWeight: 0,
      activeWeightInProd: 0,
      descriptiveValue: null,
      status: 'FIREWALLED_OBSERVATION_ONLY',
      note: 'Firewalled out of Lethality Score & points economy to prevent commercial conflict of interest. Shown only as descriptive observations in The Skin Edit.',
    },
    {
      id: 'facial_harmony',
      label: 'Facial harmony',
      targetWeight: HARMONY_V2_1_EXPERIMENTAL_WEIGHTS.facial_harmony,
      activeWeightInProd: 0,
      descriptiveValue: clampOpt(input.facialHarmonyNote),
      status: 'EXPERIMENTAL_DESCRIPTIVE_ONLY',
      note: 'Relative geometric observation only; excluded from live scored beauty until validated.',
    },
    {
      id: 'expression_presentation',
      label: 'Expression & presentation',
      targetWeight: HARMONY_V2_1_EXPERIMENTAL_WEIGHTS.expression_presentation,
      activeWeightInProd: DEFAULT_LETHALITY_WEIGHTS.expression_engagement,
      descriptiveValue: clampOpt(input.expressionPresentation),
      status: 'VALIDATED_ACTIVE',
      note: 'Controllable expression and engagement signal.',
    },
    {
      id: 'facial_definition',
      label: 'Facial definition',
      targetWeight: 0,
      activeWeightInProd: 0,
      descriptiveValue: clampOpt(input.facialDefinitionNote),
      status: 'DROPPED_DESCRIPTIVE_ONLY',
      note: 'Dropped from scoring: unsupported as a bias-free beauty factor.',
    },
    {
      id: 'photo_craft',
      label: 'Photo craft',
      targetWeight: HARMONY_V2_1_EXPERIMENTAL_WEIGHTS.photo_craft,
      activeWeightInProd: 1 - DEFAULT_LETHALITY_WEIGHTS.expression_engagement,
      descriptiveValue: clampOpt(input.photoCraft),
      status: 'VALIDATED_ACTIVE',
      note: 'Image capture reliability, lighting balance, and framing.',
    },
  ];

  return {
    rubricVersion: HARMONY_V2_1_RUBRIC_VERSION,
    experimentalEnabled: EXPERIMENTAL_FACTORS_ENABLED_IN_PROD,
    publishedScoreVersion: input.presentationEval.scoringVersion,
    publishedScore: input.presentationEval.lethalityScore,
    scopeDisclosure:
      'Live score uses the validated narrower presentation rubric (v2.0-presentation). Experimental Harmony V2.1 weights remain descriptive-only pending fairness and reliability validation.',
    factors,
  };
}
