export const LETHALITY_SCORING_VERSION = 'v2.0-presentation';

export interface LethalityComponentMetric {
  id: 'visual_presentation' | 'pose_composition' | 'expression_engagement' | 'lighting_balance' | 'image_detail';
  label: string;
  weight: number;
  score: number;
  available: boolean;
}

export interface LethalityEvaluation {
  scoringVersion: string;
  lethalityScore: number; // 1 - 100
  provenance: 'LOCAL_PRESENTATION' | 'FEATURE_VECTOR';
  components: LethalityComponentMetric[];
  disclaimer: string;
}

/**
 * Deterministic, versioned Lethality Score (1-100) based on controllable presentation criteria.
 * Does not penalize immutable facial characteristics or skin tone.
 */
export function computeLethalityScore(input: {
  presentation: number;
  poseComposition: number;
  expressionEngagement: number;
  lightingBalance: number;
  imageDetail: number;
  provenance?: 'LOCAL_PRESENTATION' | 'FEATURE_VECTOR';
}): LethalityEvaluation {
  const clamp = (v: number) => Math.max(1, Math.min(100, Math.round(v)));

  const components: LethalityComponentMetric[] = [
    { id: 'visual_presentation', label: 'Visual Presentation', weight: 0.30, score: clamp(input.presentation), available: true },
    { id: 'pose_composition', label: 'Pose & Composition', weight: 0.25, score: clamp(input.poseComposition), available: true },
    { id: 'expression_engagement', label: 'Expression & Engagement', weight: 0.20, score: clamp(input.expressionEngagement), available: true },
    { id: 'lighting_balance', label: 'Lighting Balance', weight: 0.15, score: clamp(input.lightingBalance), available: true },
    { id: 'image_detail', label: 'Image Detail', weight: 0.10, score: clamp(input.imageDetail), available: true },
  ];

  const weightedSum = components.reduce((acc, c) => acc + c.score * c.weight, 0);
  const lethalityScore = clamp(weightedSum);

  return {
    scoringVersion: LETHALITY_SCORING_VERSION,
    lethalityScore,
    provenance: input.provenance ?? 'LOCAL_PRESENTATION',
    components,
    disclaimer: 'Entertainment-oriented Face Card presentation score; not a measure of intrinsic beauty or skin health.',
  };
}
