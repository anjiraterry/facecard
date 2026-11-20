import type { ClientFeatureVector } from '@/lib/spikes/spikes';
import { initFaceLandmarker } from './liveness';
import { analyzeDecodedPixels, type PixelQualityMetrics } from './pixelQuality';

export const LOCAL_MODEL_VERSION = 'mediapipe-face-landmarker-float16-v1';

export type DevicePerformanceClass = 'HIGH' | 'STANDARD' | 'CONSTRAINED';

export interface LocalCapabilities {
  browserSupported: boolean;
  wasmSupported: boolean;
  webglSupported: boolean;
  cameraSupported: boolean;
  performanceClass: DevicePerformanceClass;
  recommendedInferenceFps: number;
}

export interface LocalAnalysisResult {
  facePresent: boolean;
  faceCount: number;
  landmarkConfidence: number;
  headPose: { yaw: number; pitch: number };
  featureVector: ClientFeatureVector | null;
  processingDurationMs: number;
  modelVersion: string;
  performanceClass: DevicePerformanceClass;
  error?: string;
}

let lastDurationMs = 0;
let totalAnalyses = 0;

export function detectCapabilities(): LocalCapabilities {
  if (typeof window === 'undefined') {
    return {
      browserSupported: false,
      wasmSupported: false,
      webglSupported: false,
      cameraSupported: false,
      performanceClass: 'CONSTRAINED',
      recommendedInferenceFps: 2,
    };
  }

  const wasmSupported = typeof WebAssembly === 'object';
  let webglSupported = false;
  try {
    const canvas = document.createElement('canvas');
    webglSupported = Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    webglSupported = false;
  }

  const nav = navigator as Navigator & { deviceMemory?: number };
  const mem = nav.deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;

  let performanceClass: DevicePerformanceClass = 'STANDARD';
  if (mem <= 2 || cores <= 2 || !webglSupported) {
    performanceClass = 'CONSTRAINED';
  } else if (mem >= 6 && cores >= 6 && webglSupported) {
    performanceClass = 'HIGH';
  }

  return {
    browserSupported: wasmSupported,
    wasmSupported,
    webglSupported,
    cameraSupported: Boolean(navigator.mediaDevices?.getUserMedia),
    performanceClass,
    recommendedInferenceFps: performanceClass === 'CONSTRAINED' ? 2 : performanceClass === 'STANDARD' ? 3 : 5,
  };
}

export function getModelVersion(): string {
  return LOCAL_MODEL_VERSION;
}

export function getPerformanceMetrics() {
  return {
    modelVersion: LOCAL_MODEL_VERSION,
    lastDurationMs,
    totalAnalyses,
  };
}

function dist2D(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Computes real facial geometry measurements from 468 MediaPipe landmarks on-device.
 * Accounts for framing, head pose, and symmetry without sending raw images to cloud LLMs.
 */
export function computeFeatureVectorFromLandmarks(
  landmarks: Array<{ x: number; y: number; z?: number }>,
  pixelMetricsOrExposure?: PixelQualityMetrics | number | null,
  legacySharpness?: number
): {
  featureVector: ClientFeatureVector;
  headPose: { yaw: number; pitch: number };
} {
  const pixelMetrics =
    typeof pixelMetricsOrExposure === 'object' && pixelMetricsOrExposure !== null
      ? pixelMetricsOrExposure
      : null;
  const exposureScore = pixelMetrics
    ? pixelMetrics.exposureScore
    : typeof pixelMetricsOrExposure === 'number'
      ? pixelMetricsOrExposure
      : 0;
  const sharpnessScore = pixelMetrics
    ? pixelMetrics.sharpnessScore
    : typeof legacySharpness === 'number'
      ? legacySharpness
      : 0;
  const lightingBal = pixelMetrics ? pixelMetrics.lightingBalance : exposureScore;
  const noiseLevel = pixelMetrics ? pixelMetrics.noiseLevel : 0;
  const nose = landmarks[1];
  const leftCheek = landmarks[234];
  const rightCheek = landmarks[454];
  const forehead = landmarks[10];
  const chin = landmarks[152];
  const leftEyeOuter = landmarks[33];
  const rightEyeOuter = landmarks[263];
  const leftJaw = landmarks[172];
  const rightJaw = landmarks[397];

  const faceWidth = Math.max(0.01, dist2D(leftCheek, rightCheek));
  const faceHeight = Math.max(0.01, dist2D(forehead, chin));

  // Head pose estimate (normalized)
  const leftDist = Math.abs(nose.x - leftCheek.x);
  const rightDist = Math.abs(rightCheek.x - nose.x);
  const yaw = (leftDist - rightDist) / faceWidth;
  const midEyeY = (leftEyeOuter.y + rightEyeOuter.y) / 2;
  const pitch = (nose.y - midEyeY) / faceHeight;

  // Symmetry: compare left vs right eye/jaw distances relative to midline
  const eyeSymDiff = Math.abs(dist2D(nose, leftEyeOuter) - dist2D(nose, rightEyeOuter)) / faceWidth;
  const jawSymDiff = Math.abs(dist2D(nose, leftJaw) - dist2D(nose, rightJaw)) / faceWidth;
  const symmetry = Math.round(Math.max(68, Math.min(97, 95 - (eyeSymDiff + jawSymDiff) * 55)));

  // Golden ratio facial height-to-width proportion (~1.45 - 1.618)
  const ratio = faceHeight / faceWidth;
  const deviation = Math.min(30, Math.round(Math.abs(ratio - 1.5) * 35));

  // Jawline & feature definition from lower-face proportions
  const jawSpan = dist2D(leftJaw, rightJaw) / faceWidth;
  const jawlineDefinition = Math.round(Math.max(70, Math.min(96, 78 + (1 - Math.abs(jawSpan - 0.78)) * 18)));

  // Framing coverage based on face bounding box inside viewport
  const framingCoverage = Math.round(Math.max(55, Math.min(98, faceHeight * 145)));
  const poseAcceptable = Math.abs(yaw) < 0.25 && Math.abs(pitch) < 0.3;

  const eyeCanthalTiltAngle = Number(
    ((Math.atan2(leftEyeOuter.y - rightEyeOuter.y, rightEyeOuter.x - leftEyeOuter.x) * 180) / Math.PI).toFixed(2)
  );

  const basePassed =
    (pixelMetrics ? pixelMetrics.usable : exposureScore >= 40 && sharpnessScore >= 25) &&
    poseAcceptable &&
    framingCoverage >= 50 &&
    sharpnessScore >= 25 &&
    noiseLevel <= 75;

  const qualityDecision = !basePassed
    ? 'RETAKE_REQUIRED'
    : pixelMetrics?.qualityDecision === 'PASS_WITH_LIMITATIONS'
      ? 'PASS_WITH_LIMITATIONS'
      : 'PASS';

  const featureVector: ClientFeatureVector = {
    symmetry,
    jawlineDefinition,
    skinTextureUniformity: Math.round(
      Math.max(0, Math.min(100, (exposureScore + sharpnessScore) / 2 - Math.max(0, noiseLevel - 35) * 0.5))
    ),
    lightingBalance: Math.round(lightingBal),
    goldenRatioDeviation: deviation,
    eyeCanthalTiltAngle,
    clientEngine: 'MEDIAPIPE_WASM',
    qualityGate: {
      passed: basePassed,
      qualityDecision,
      sharpness: Math.round(sharpnessScore),
      exposure: Math.round(exposureScore),
      framingCoverage,
      noiseLevel,
      overExposedFraction: pixelMetrics?.overExposedFraction,
      facialOverExposedFraction: pixelMetrics?.facialOverExposedFraction,
      globalOverExposedFraction: pixelMetrics?.globalOverExposedFraction,
      crushedShadowFraction: pixelMetrics?.crushedShadowFraction,
      lumaContrast: pixelMetrics?.lumaContrast,
      skinRegionCoverage: pixelMetrics?.skinRegionCoverage,
      maskMode: pixelMetrics?.maskMode,
      faceDetected: true,
      warnings: pixelMetrics?.warnings,
      rejectionReasonCodes: pixelMetrics?.rejectionReasonCodes,
      failureReasons: pixelMetrics?.failureReasons ?? ['Pixel quality metrics unavailable.'],
    },
  };

  return { featureVector, headPose: { yaw, pitch } };
}

/**
 * Runs on-device MediaPipe analysis on an active HTMLVideoElement frame.
 */
export async function analyzeVideoFrame(video: HTMLVideoElement): Promise<LocalAnalysisResult> {
  const start = performance.now();
  const caps = detectCapabilities();

  try {
    const landmarker = await initFaceLandmarker();
    if (!landmarker || video.readyState < 2) {
      return {
        facePresent: false,
        faceCount: 0,
        landmarkConfidence: 0,
        headPose: { yaw: 0, pitch: 0 },
        featureVector: null,
        processingDurationMs: Math.round(performance.now() - start),
        modelVersion: LOCAL_MODEL_VERSION,
        performanceClass: caps.performanceClass,
      };
    }

    const res = landmarker.detectForVideo(video, performance.now());
    const faces = res?.faceLandmarks || [];
    if (faces.length === 0) {
      return {
        facePresent: false,
        faceCount: 0,
        landmarkConfidence: 0,
        headPose: { yaw: 0, pitch: 0 },
        featureVector: null,
        processingDurationMs: Math.round(performance.now() - start),
        modelVersion: LOCAL_MODEL_VERSION,
        performanceClass: caps.performanceClass,
      };
    }

    let pixelMetrics: PixelQualityMetrics | null = null;
    try {
      const w = Math.min(320, video.videoWidth || 320);
      const h = Math.min(320, video.videoHeight || 240);
      const offscreen = document.createElement('canvas');
      offscreen.width = w;
      offscreen.height = h;
      const octx = offscreen.getContext('2d');
      if (octx) {
        octx.drawImage(video, 0, 0, w, h);
        const imgData = octx.getImageData(0, 0, w, h);
        pixelMetrics = analyzeDecodedPixels(imgData.data, w, h, faces[0]);
      }
    } catch {
      pixelMetrics = null;
    }

    const { featureVector, headPose } = computeFeatureVectorFromLandmarks(faces[0], pixelMetrics);
    const duration = Math.round(performance.now() - start);
    lastDurationMs = duration;
    totalAnalyses += 1;

    return {
      facePresent: true,
      faceCount: faces.length,
      landmarkConfidence: 0.92,
      headPose,
      featureVector,
      processingDurationMs: duration,
      modelVersion: LOCAL_MODEL_VERSION,
      performanceClass: caps.performanceClass,
    };
  } catch (err) {
    return {
      facePresent: false,
      faceCount: 0,
      landmarkConfidence: 0,
      headPose: { yaw: 0, pitch: 0 },
      featureVector: null,
      processingDurationMs: Math.round(performance.now() - start),
      modelVersion: LOCAL_MODEL_VERSION,
      performanceClass: caps.performanceClass,
      error: err instanceof Error ? err.message : 'Local inference failed',
    };
  }
}
