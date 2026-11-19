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
