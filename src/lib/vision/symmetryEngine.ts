export const SYMMETRY_ENGINE_VERSION = 'v1.0-paired';

export interface SymmetryAssessment {
  version: string;
  availability: 'AVAILABLE' | 'UNAVAILABLE';
  overallAlignmentScore: number | null;
  eyeRegionDiff: number | null;
  jawRegionDiff: number | null;
  confidence: number;
  note: string;
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Paired-landmark bilateral comparison compensated for face scale.
 * Natural facial asymmetry is normal and is never framed as a medical defect.
 */
export function evaluateSymmetry(
  landmarks?: Array<{ x: number; y: number }> | null,
  headYaw = 0
): SymmetryAssessment {
  const note = 'Natural facial asymmetry is completely normal; camera angle and expression also influence readings.';

  if (!landmarks || landmarks.length < 468 || Math.abs(headYaw) >= 0.25) {
    return {
      version: SYMMETRY_ENGINE_VERSION,
      availability: 'UNAVAILABLE',
      overallAlignmentScore: null,
      eyeRegionDiff: null,
      jawRegionDiff: null,
      confidence: 0,
      note: Math.abs(headYaw) >= 0.25
        ? 'Head rotation too high for reliable bilateral comparison. Face camera directly.'
        : note,
    };
  }

  const nose = landmarks[1];
  const leftCheek = landmarks[234];
  const rightCheek = landmarks[454];
  const faceWidth = Math.max(0.01, dist(leftCheek, rightCheek));

  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const leftJaw = landmarks[172];
  const rightJaw = landmarks[397];

  const eyeRegionDiff = Number((Math.abs(dist(nose, leftEye) - dist(nose, rightEye)) / faceWidth).toFixed(3));
  const jawRegionDiff = Number((Math.abs(dist(nose, leftJaw) - dist(nose, rightJaw)) / faceWidth).toFixed(3));

  const overallAlignmentScore = Math.round(Math.max(60, Math.min(98, 96 - (eyeRegionDiff + jawRegionDiff) * 55)));
  const confidence = Number(Math.max(0.4, 1 - Math.abs(headYaw) * 2).toFixed(2));

  return {
    version: SYMMETRY_ENGINE_VERSION,
    availability: 'AVAILABLE',
    overallAlignmentScore,
    eyeRegionDiff,
    jawRegionDiff,
    confidence,
    note,
  };
}
