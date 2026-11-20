import {
  PIXEL_QUALITY_VERSION,
  QUALITY_THRESHOLDS,
  type QualityDecision,
} from './pixelQuality';

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
  qualityDecision: QualityDecision;
  algorithmVersion: string;
  reliableForSkinObservation: boolean;
  faceDetected: boolean;
  faceCount: number;
  framingScore: number | null;
  exposureScore: number | null;
  sharpnessScore: number | null;
  facialOverExposedFraction: number | null;
  globalOverExposedFraction: number | null;
  skinRegionCoverage: number | null;
  headRotationAcceptable: boolean;
  smoothingSuspected: boolean;
  availability: MeasurementAvailability;
  checks: QualityCheckResult[];
  rejectionReasonCodes: string[];
  warnings: string[];
  guidance: string[];
  thresholds: typeof QUALITY_THRESHOLDS;
}

export interface ScanQualityInput {
  faceDetected: boolean;
  faceCount: number;
  sharpness?: number | null;
  motionBlurScore?: number | null;
  exposure?: number | null;
  overExposedFraction?: number | null;
  facialOverExposedFraction?: number | null;
  globalOverExposedFraction?: number | null;
  crushedShadowFraction?: number | null;
  lightingBalance?: number | null;
  skinRegionCoverage?: number | null;
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
  const warnings: string[] = [];
  const rejectionReasonCodes: string[] = [];
  const checks: QualityCheckResult[] = [];

  const facialClip = input.facialOverExposedFraction ?? input.overExposedFraction ?? null;
  const globalClip = input.globalOverExposedFraction ?? null;
  const skinCoverage = input.skinRegionCoverage ?? null;

  if (!input.faceDetected || input.faceCount === 0) {
    rejectionReasonCodes.push('NO_FACE_DETECTED');
    guidance.push('No face detected. Position your face clearly inside the oval.');
    return {
      usable: false,
      qualityDecision: 'RETAKE_REQUIRED',
      algorithmVersion: PIXEL_QUALITY_VERSION,
      reliableForSkinObservation: false,
      faceDetected: false,
      faceCount: 0,
      framingScore: null,
      exposureScore: input.exposure ?? null,
      sharpnessScore: input.sharpness ?? null,
      facialOverExposedFraction: facialClip,
      globalOverExposedFraction: globalClip,
      skinRegionCoverage: skinCoverage,
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
      rejectionReasonCodes,
      warnings,
      guidance,
      thresholds: QUALITY_THRESHOLDS,
    };
  }

  const singleFace = input.faceCount === 1;
  if (!singleFace) {
    rejectionReasonCodes.push('MULTIPLE_FACES');
    guidance.push('Multiple faces detected. Ensure only one person is in frame.');
  }
  checks.push({
    id: 'multiple_faces',
    label: 'Single Face',
    passed: singleFace,
    value: input.faceCount,
    guidance: singleFace ? undefined : 'Ensure only one face is visible.',
  });

  const focusCriticalPass = typeof input.sharpness === 'number' && input.sharpness >= QUALITY_THRESHOLDS.sharpnessRetakeMin;
  const focusPassed = typeof input.sharpness === 'number' && input.sharpness >= QUALITY_THRESHOLDS.sharpnessPassMin;
  if (!focusCriticalPass) {
    rejectionReasonCodes.push('FACIAL_BLUR');
    guidance.push('Face is insufficiently sharp; hold steady and wipe the lens.');
  } else if (!focusPassed) {
    warnings.push('Moderate focus softness detected; fine skin texture confidence reduced.');
    guidance.push('Slight softness detected; skin detail confidence reduced.');
  }
  checks.push({ id: 'focus', label: 'Focus', passed: focusPassed, value: input.sharpness ?? null });

  const motionVal = input.motionBlurScore ?? input.sharpness ?? null;
  const motionCriticalPass = typeof motionVal === 'number' && motionVal >= QUALITY_THRESHOLDS.sharpnessRetakeMin;
  const motionPassed = typeof motionVal === 'number' && motionVal >= QUALITY_THRESHOLDS.sharpnessPassMin;
  if (!motionCriticalPass && focusCriticalPass) {
    rejectionReasonCodes.push('MOTION_BLUR');
    guidance.push('Motion blur detected. Hold the camera steady for a moment.');
  } else if (!motionPassed && focusPassed) {
    warnings.push('Slight motion detected; measurement confidence reduced.');
  }
  checks.push({
    id: 'motion_blur',
    label: 'Motion Stability',
    passed: motionPassed,
    value: motionVal,
  });

  // Tone-fair, face-isolated clipping check: global background/ceiling brightness never rejects.
  const overClip = facialClip ?? 0;
  const darkClip = input.crushedShadowFraction ?? 0;
  const severeOverClip = overClip > QUALITY_THRESHOLDS.facialClipRetakeMin;
  const moderateOverClip = overClip > QUALITY_THRESHOLDS.facialClipPassMax && !severeOverClip;
  const severeDarkClip = darkClip > QUALITY_THRESHOLDS.facialShadowCrushMax;
  const clippingPassed = !severeOverClip && !severeDarkClip && !moderateOverClip;

  if (severeOverClip) {
    rejectionReasonCodes.push('FACIAL_HIGHLIGHT_CLIPPING');
    guidance.push('Facial highlights are clipped; move out of harsh direct glare.');
  } else if (severeDarkClip) {
    rejectionReasonCodes.push('FACIAL_SHADOW_DETAIL_LOSS');
    guidance.push('Important facial details are lost in shadows; face a brighter light source.');
  } else if (moderateOverClip) {
    warnings.push('Moderate facial glare detected; skin surface observations marked less reliable.');
    guidance.push('Moderate facial glare detected; skin observations may have reduced confidence.');
  }
  checks.push({
    id: 'exposure_clipping',
    label: 'Exposure Clipping',
    passed: clippingPassed,
    value: Number(Math.max(overClip, darkClip).toFixed(3)),
  });

  const illuminationVal = input.lightingBalance ?? input.exposure ?? null;
  const illuminationPassed = typeof illuminationVal === 'number' && illuminationVal >= QUALITY_THRESHOLDS.lightingBalancePassMin;
  if (!illuminationPassed) {
    warnings.push('Lighting is uneven across the face; symmetry readings marked lower confidence.');
    guidance.push('Lighting is uneven across the face. Face a soft front light source for best accuracy.');
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
    focusCriticalPass &&
    motionCriticalPass &&
    !severeOverClip &&
    !severeDarkClip &&
    perspectivePassed;

  if (!headRotationAcceptable) {
    rejectionReasonCodes.push('HEAD_POSE_OUT_OF_RANGE');
  }
  if (!perspectivePassed) {
    rejectionReasonCodes.push('FRAMING_OUT_OF_RANGE');
  }

  const hasLimitations =
    !focusPassed ||
    !motionPassed ||
    moderateOverClip ||
    !illuminationPassed ||
    !occlusionPassed ||
    !compressionPassed ||
    !resolutionPassed ||
    smoothingSuspected;

  const qualityDecision: QualityDecision = !usable
    ? 'RETAKE_REQUIRED'
    : hasLimitations
      ? 'PASS_WITH_LIMITATIONS'
      : 'PASS';

  const reliableForSkinObservation =
    usable &&
    !moderateOverClip &&
    focusPassed &&
    compressionPassed &&
    resolutionPassed &&
    !smoothingSuspected &&
    (skinCoverage === null || skinCoverage >= QUALITY_THRESHOLDS.minSkinCoverage);

  return {
    usable,
    qualityDecision,
    algorithmVersion: PIXEL_QUALITY_VERSION,
    reliableForSkinObservation,
    faceDetected: true,
    faceCount: input.faceCount,
    framingScore: input.framing ?? null,
    exposureScore: input.exposure ?? null,
    sharpnessScore: input.sharpness ?? null,
    facialOverExposedFraction: facialClip,
    globalOverExposedFraction: globalClip,
    skinRegionCoverage: skinCoverage,
    headRotationAcceptable,
    smoothingSuspected,
    availability: usable ? 'AVAILABLE' : 'UNAVAILABLE',
    checks,
    rejectionReasonCodes,
    warnings,
    guidance,
    thresholds: QUALITY_THRESHOLDS,
  };
}
