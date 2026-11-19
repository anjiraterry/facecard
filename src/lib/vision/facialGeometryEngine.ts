export const FACIAL_GEOMETRY_VERSION = 'v1.0-descriptive';

export interface FacialGeometryObservation {
  version: string;
  availability: 'AVAILABLE' | 'UNAVAILABLE';
  widthToHeightRatio: number | null;
  upperThirdRatio: number | null;
  middleThirdRatio: number | null;
  lowerThirdRatio: number | null;
  interocularToFaceWidth: number | null;
  jawContourRatio: number | null;
  limitations: string[];
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Computes descriptive facial proportions from normalized 2D landmarks.
 * Does NOT assume a universal ideal template or golden ratio beauty standard.
 */
export function measureFacialGeometry(
  landmarks?: Array<{ x: number; y: number }> | null
): FacialGeometryObservation {
  const limitations = [
    'Monocular 2D selfie estimates are affected by lens perspective and camera distance.',
    'Descriptive geometric proportions only; not a measure of intrinsic beauty or health.',
  ];

  if (!landmarks || landmarks.length < 468) {
    return {
      version: FACIAL_GEOMETRY_VERSION,
      availability: 'UNAVAILABLE',
      widthToHeightRatio: null,
      upperThirdRatio: null,
      middleThirdRatio: null,
      lowerThirdRatio: null,
      interocularToFaceWidth: null,
      jawContourRatio: null,
      limitations,
    };
  }

  const forehead = landmarks[10];
  const browMid = landmarks[9];
  const noseBase = landmarks[2];
  const chin = landmarks[152];
  const leftCheek = landmarks[234];
  const rightCheek = landmarks[454];
  const leftEyeInner = landmarks[133];
  const rightEyeInner = landmarks[362];
  const leftJaw = landmarks[172];
  const rightJaw = landmarks[397];

  const faceWidth = Math.max(0.01, dist(leftCheek, rightCheek));
  const faceHeight = Math.max(0.01, dist(forehead, chin));

  const upper = dist(forehead, browMid) / faceHeight;
  const middle = dist(browMid, noseBase) / faceHeight;
  const lower = dist(noseBase, chin) / faceHeight;

  return {
    version: FACIAL_GEOMETRY_VERSION,
    availability: 'AVAILABLE',
    widthToHeightRatio: Number((faceWidth / faceHeight).toFixed(2)),
    upperThirdRatio: Number(upper.toFixed(2)),
    middleThirdRatio: Number(middle.toFixed(2)),
    lowerThirdRatio: Number(lower.toFixed(2)),
    interocularToFaceWidth: Number((dist(leftEyeInner, rightEyeInner) / faceWidth).toFixed(2)),
    jawContourRatio: Number((dist(leftJaw, rightJaw) / faceWidth).toFixed(2)),
    limitations,
  };
}
