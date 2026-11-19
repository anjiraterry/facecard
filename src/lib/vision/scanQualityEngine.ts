export type MeasurementAvailability = 'AVAILABLE' | 'UNAVAILABLE';

export interface ScanQualityAssessment {
  usable: boolean;
  faceDetected: boolean;
  faceCount: number;
  framingScore: number | null;
  exposureScore: number | null;
  sharpnessScore: number | null;
  headRotationAcceptable: boolean;
  availability: MeasurementAvailability;
  guidance: string[];
}

export function evaluateScanQuality(input: {
  faceDetected: boolean;
  faceCount: number;
  sharpness?: number | null;
  exposure?: number | null;
  framing?: number | null;
  yaw?: number;
  pitch?: number;
}): ScanQualityAssessment {
  const guidance: string[] = [];

  if (!input.faceDetected || input.faceCount === 0) {
    guidance.push('No face detected. Position your face clearly inside the oval.');
    return {
      usable: false,
      faceDetected: false,
      faceCount: 0,
      framingScore: null,
      exposureScore: input.exposure ?? null,
      sharpnessScore: input.sharpness ?? null,
      headRotationAcceptable: false,
      availability: 'UNAVAILABLE',
      guidance,
    };
  }

  if (input.faceCount > 1) {
    guidance.push('Multiple faces detected. Ensure only one person is in frame.');
  }

  const headRotationAcceptable =
    Math.abs(input.yaw ?? 0) < 0.25 && Math.abs(input.pitch ?? 0) < 0.3;
  if (!headRotationAcceptable) {
    guidance.push('Face the camera directly with minimal head tilt.');
  }

  if (typeof input.exposure === 'number' && input.exposure < 40) {
    guidance.push('Lighting is too dim or uneven. Face soft front lighting.');
  }
  if (typeof input.sharpness === 'number' && input.sharpness < 45) {
    guidance.push('Image is blurry. Hold steady and wipe the lens.');
  }
  if (typeof input.framing === 'number' && input.framing < 50) {
    guidance.push('Move slightly closer so your face fills the framing oval.');
  }

  const usable =
    input.faceCount === 1 &&
    headRotationAcceptable &&
    (input.exposure ?? 80) >= 40 &&
    (input.sharpness ?? 80) >= 45 &&
    (input.framing ?? 80) >= 50;

  return {
    usable,
    faceDetected: true,
    faceCount: input.faceCount,
    framingScore: input.framing ?? null,
    exposureScore: input.exposure ?? null,
    sharpnessScore: input.sharpness ?? null,
    headRotationAcceptable,
    availability: usable ? 'AVAILABLE' : 'UNAVAILABLE',
    guidance,
  };
}
