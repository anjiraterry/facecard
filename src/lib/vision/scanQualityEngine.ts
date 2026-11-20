export type MeasurementAvailability = 'AVAILABLE' | 'UNAVAILABLE';

export type QualityCheckId =
  | 'focus'
  | 'motion_blur'
  | 'exposure_clipping'
  | 'illumination'
  | 'head_pose'
  | 'occlusion'
  | 'camera_perspective'
  | 'image_compression'
  | 'capture_resolution'
  | 'multiple_faces'
  | 'smoothing_suspected';

export interface QualityCheckResult {
  id: QualityCheckId;
  label: string;
  passed: boolean;
  value: number | boolean | null;
  guidance?: string;
}

export interface ScanQualityAssessment {
  usable: boolean;
  reliableForSkinObservation: boolean;
  faceDetected: boolean;
  faceCount: number;
  framingScore: number | null;
  exposureScore: number | null;
  sharpnessScore: number | null;
  headRotationAcceptable: boolean;
  smoothingSuspected: boolean;
  availability: MeasurementAvailability;
  checks: QualityCheckResult[];
  guidance: string[];
}

export interface ScanQualityInput {
  faceDetected: boolean;
  faceCount: number;
  sharpness?: number | null;
  motionBlurScore?: number | null;
  exposure?: number | null;
  overExposedFraction?: number | null;
  crushedShadowFraction?: number | null;
  lightingBalance?: number | null;
  framing?: number | null;
  faceWidthRatio?: number | null;
  yaw?: number;
  pitch?: number;
  roll?: number;
  occlusionDetected?: boolean;
  compressionScore?: number | null;
  captureWidth?: number | null;
  captureHeight?: number | null;
  smoothingSuspected?: boolean;
}

/**
 * Evaluates whether a submitted portrait permits reliable observation without
 * penalising dark skin tones (uses clipping & illumination balance rather than mean brightness).
 */
export function evaluateScanQuality(input: ScanQualityInput): ScanQualityAssessment {
  const guidance: string[] = [];
  const checks: QualityCheckResult[] = [];

  if (!input.faceDetected || input.faceCount === 0) {
    guidance.push('No face detected. Position your face clearly inside the oval.');
    return {
      usable: false,
      reliableForSkinObservation: false,
      faceDetected: false,
      faceCount: 0,
      framingScore: null,
      exposureScore: input.exposure ?? null,
      sharpnessScore: input.sharpness ?? null,
      headRotationAcceptable: false,
      smoothingSuspected: Boolean(input.smoothingSuspected),
      availability: 'UNAVAILABLE',
      checks: [
        {
          id: 'multiple_faces',
          label: 'Single Face Detected',
          passed: false,
          value: 0,
          guidance: 'Position one face clearly inside the frame.',
        },
      ],
      guidance,
    };
  }

  const singleFace = input.faceCount === 1;
  if (!singleFace) {
    guidance.push('Multiple faces detected. Ensure only one person is in frame.');
  }
  checks.push({
    id: 'multiple_faces',
    label: 'Single Face',
    passed: singleFace,
    value: input.faceCount,
    guidance: singleFace ? undefined : 'Ensure only one face is visible.',
  });

  const focusPassed = (input.sharpness ?? 80) >= 45;
  if (!focusPassed) guidance.push('Image is out of focus. Hold steady and wipe the lens.');
  checks.push({ id: 'focus', label: 'Focus', passed: focusPassed, value: input.sharpness ?? null });

  const motionPassed = (input.motionBlurScore ?? input.sharpness ?? 80) >= 45;
  if (!motionPassed && focusPassed) guidance.push('Motion blur detected. Hold the camera steady for a moment.');
  checks.push({
    id: 'motion_blur',
    label: 'Motion Stability',
    passed: motionPassed,
    value: input.motionBlurScore ?? input.sharpness ?? null,
  });

  // Tone-fair clipping check: never penalise dark skin for low mean luminance
  const overClip = input.overExposedFraction ?? 0;
  const darkClip = input.crushedShadowFraction ?? 0;
  const clippingPassed = overClip <= 0.12 && darkClip <= 0.22;
  if (!clippingPassed) {
    guidance.push('Highlights or deep shadows are clipped. Step into soft, even daylight.');
  }
  checks.push({
    id: 'exposure_clipping',
    label: 'Exposure Clipping',
    passed: clippingPassed,
    value: Number(Math.max(overClip, darkClip).toFixed(3)),
  });

  const illuminationVal = input.lightingBalance ?? input.exposure ?? 80;
  const illuminationPassed = illuminationVal >= 40;
  if (!illuminationPassed) {
    guidance.push('Lighting is uneven across the face. Face a soft front light source.');
  }
  checks.push({
    id: 'illumination',
    label: 'Illumination Balance',
    passed: illuminationPassed,
    value: illuminationVal,
  });

  const headRotationAcceptable =
    Math.abs(input.yaw ?? 0) < 0.25 &&
    Math.abs(input.pitch ?? 0) < 0.3 &&
    Math.abs(input.roll ?? 0) < 0.3;
  if (!headRotationAcceptable) {
    guidance.push('Face the camera directly with minimal head tilt.');
  }
  checks.push({
    id: 'head_pose',
    label: 'Head Pose',
    passed: headRotationAcceptable,
    value: Number(Math.max(Math.abs(input.yaw ?? 0), Math.abs(input.pitch ?? 0)).toFixed(3)),
  });

  const occlusionPassed = !input.occlusionDetected;
  if (!occlusionPassed) {
    guidance.push('Part of the face appears occluded; some observations may be marked unavailable.');
  }
  checks.push({
    id: 'occlusion',
    label: 'Minimal Occlusion',
    passed: occlusionPassed,
    value: !occlusionPassed,
  });

  const faceWidthRatio = input.faceWidthRatio ?? 0.45;
  const perspectivePassed = faceWidthRatio >= 0.22 && faceWidthRatio <= 0.78 && (input.framing ?? 80) >= 50;
  if (!perspectivePassed) {
    guidance.push('Hold the phone at arm’s length (~40–50 cm) so your face fits cleanly in the oval.');
  }
  checks.push({
    id: 'camera_perspective',
    label: 'Camera Perspective & Framing',
    passed: perspectivePassed,
    value: input.framing ?? faceWidthRatio,
  });

  const compressionPassed = (input.compressionScore ?? 80) >= 40;
  if (!compressionPassed) {
    guidance.push('Heavy image compression detected; skin texture observations may be limited.');
  }
  checks.push({
    id: 'image_compression',
    label: 'Image Compression',
    passed: compressionPassed,
    value: input.compressionScore ?? null,
  });

  const resW = input.captureWidth ?? 640;
  const resH = input.captureHeight ?? 480;
  const resolutionPassed = resW >= 320 && resH >= 320;
  if (!resolutionPassed) {
    guidance.push('Capture resolution is too low for fine surface observations.');
  }
  checks.push({
    id: 'capture_resolution',
    label: 'Capture Resolution',
    passed: resolutionPassed,
    value: Math.min(resW, resH),
  });

  const smoothingSuspected = Boolean(input.smoothingSuspected);
  if (smoothingSuspected) {
    guidance.push('Possible camera beautification or smoothing detected; fine texture observations marked low confidence.');
  }
  checks.push({
    id: 'smoothing_suspected',
    label: 'Natural Unsmoothed Detail',
    passed: !smoothingSuspected,
    value: smoothingSuspected,
  });

  const usable =
    singleFace &&
    headRotationAcceptable &&
    focusPassed &&
    motionPassed &&
    clippingPassed &&
    illuminationPassed &&
    perspectivePassed;

  const reliableForSkinObservation =
    usable && compressionPassed && resolutionPassed && !smoothingSuspected;

  return {
    usable,
    reliableForSkinObservation,
    faceDetected: true,
    faceCount: input.faceCount,
    framingScore: input.framing ?? null,
    exposureScore: input.exposure ?? null,
    sharpnessScore: input.sharpness ?? null,
    headRotationAcceptable,
    smoothingSuspected,
    availability: usable ? 'AVAILABLE' : 'UNAVAILABLE',
    checks,
    guidance,
  };
}
