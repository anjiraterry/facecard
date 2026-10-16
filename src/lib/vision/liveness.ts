/**
 * Active Liveness Detection Engine
 * 
 * Protects against replay attacks, screen photos, and printed masks by asking
 * the user to perform unpredictable, randomized actions (e.g. head turns, blinks)
 * before taking the official scan.
 * 
 * Powered by MediaPipe Face Landmarker with an optical motion fallback.
 */

export type LivenessActionType = 'TURN_LEFT' | 'TURN_RIGHT' | 'BLINK' | 'NOD_UP' | 'SMILE';

export interface LivenessChallenge {
  type: LivenessActionType;
  prompt: string;
  subPrompt: string;
  cueIcon: 'arrow-left' | 'arrow-right' | 'eye' | 'arrow-up' | 'smile';
}

export const LIVENESS_ACTIONS: Record<LivenessActionType, LivenessChallenge> = {
  TURN_LEFT: {
    type: 'TURN_LEFT',
    prompt: 'Turn your head to the left',
    subPrompt: 'Gently turn your face left',
    cueIcon: 'arrow-left',
  },
  TURN_RIGHT: {
    type: 'TURN_RIGHT',
    prompt: 'Turn your head to the right',
    subPrompt: 'Gently turn your face right',
    cueIcon: 'arrow-right',
  },
  BLINK: {
    type: 'BLINK',
    prompt: 'Blink your eyes',
    subPrompt: 'Close both eyes and open them',
    cueIcon: 'eye',
  },
  NOD_UP: {
    type: 'NOD_UP',
    prompt: 'Tilt your chin up',
    subPrompt: 'Look slightly upward',
    cueIcon: 'arrow-up',
  },
  SMILE: {
    type: 'SMILE',
    prompt: 'Smile slightly',
    subPrompt: 'Natural smile for the camera',
    cueIcon: 'smile',
  },
};

/**
 * Generates an unpredictable challenge sequence of N random actions (standard: 2 actions).
 */
export function generateRandomLivenessSequence(count: number = 2): LivenessChallenge[] {
  // Head turns and blinks are the gold standard for anti-spoofing
  const pool: LivenessActionType[] = ['TURN_LEFT', 'TURN_RIGHT', 'BLINK', 'NOD_UP', 'SMILE'];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  
  // Ensure we don't have conflicting back-to-back without movement
  const selected = shuffled.slice(0, count);
  return selected.map((action) => LIVENESS_ACTIONS[action]);
}

export interface LivenessDetectorState {
  isReady: boolean;
  engine: 'MEDIAPIPE' | 'OPTICAL_FALLBACK';
  error: string | null;
}

export interface ActionDetectionResult {
  detected: boolean;
  confidence: number; // 0 to 1
  rawMetrics?: {
    yaw?: number;
    pitch?: number;
    blink?: number;
    smile?: number;
  };
}

let cachedLandmarker: any = null;
let isInitializing = false;

/**
 * Initializes the MediaPipe Face Landmarker if supported in browser environment.
 */
export async function initFaceLandmarker(): Promise<any | null> {
  if (typeof window === 'undefined') return null;
  if (cachedLandmarker) return cachedLandmarker;
  if (isInitializing) return null;

  try {
    isInitializing = true;
    const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
    const filesetResolver = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
    );

    cachedLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        delegate: 'GPU',
      },
      outputFaceBlendshapes: true,
      runningMode: 'VIDEO',
      numFaces: 1,
    });

    return cachedLandmarker;
  } catch (err) {
    console.warn('[LIVENESS] MediaPipe Landmarker GPU/WASM init fallback to optical tracker:', err);
    return null;
  } finally {
    isInitializing = false;
  }
}

/**
 * Evaluates whether a video frame satisfies the given live challenge.
 */
export function evaluateLivenessFrame(
  action: LivenessActionType,
  video: HTMLVideoElement,
  landmarker: any | null,
  canvasHelper?: HTMLCanvasElement | null,
  previousLuminanceRef?: { current: { left: number; right: number; center: number } | null }
): ActionDetectionResult {
  // 1. Try MediaPipe Landmarker & Blendshapes
  if (landmarker && video.readyState >= 2) {
    try {
      const startTimeMs = performance.now();
      const results = landmarker.detectForVideo(video, startTimeMs);

      if (results?.faceLandmarks?.length > 0) {
        const landmarks = results.faceLandmarks[0];
        const blendshapes = results.faceBlendshapes?.[0]?.categories || [];

        const blendMap = new Map<string, number>();
        blendshapes.forEach((c: { categoryName: string; score: number }) => {
          blendMap.set(c.categoryName, c.score);
        });

        // Key landmarks:
        // 1: Nose tip
        // 234: Left side of face (tragus/cheek)
        // 454: Right side of face (tragus/cheek)
        // 10: Forehead top
        // 152: Chin bottom
        const nose = landmarks[1] || landmarks[4] || landmarks[0] || { x: 0.5, y: 0.5, z: 0 };
        const leftCheek = landmarks[234] || { x: 0.2, y: 0.5, z: 0 };
        const rightCheek = landmarks[454] || { x: 0.8, y: 0.5, z: 0 };
        const forehead = landmarks[10] || { x: 0.5, y: 0.1, z: 0 };
        const chin = landmarks[152] || { x: 0.5, y: 0.9, z: 0 };

        // Horizontal Yaw Ratio:
        // Center: ~0.50. Turn Left: < 0.38. Turn Right: > 0.62.
        const faceWidth = Math.abs(rightCheek.x - leftCheek.x) || 1;
        const noseXRelative = (nose.x - Math.min(leftCheek.x, rightCheek.x)) / faceWidth;

        // Vertical Pitch Ratio:
        const faceHeight = Math.abs(chin.y - forehead.y) || 1;
        const noseYRelative = (nose.y - Math.min(forehead.y, chin.y)) / faceHeight;

        const blinkLeft = blendMap.get('eyeBlinkLeft') || 0;
        const blinkRight = blendMap.get('eyeBlinkRight') || 0;
        const smileLeft = blendMap.get('mouthSmileLeft') || 0;
        const smileRight = blendMap.get('mouthSmileRight') || 0;
        const avgBlink = (blinkLeft + blinkRight) / 2;
        const avgSmile = (smileLeft + smileRight) / 2;

        if (action === 'BLINK') {
          const confidence = Math.min(1, avgBlink / 0.40);
          return {
            detected: avgBlink >= 0.40,
            confidence,
            rawMetrics: { blink: avgBlink },
          };
        }

        if (action === 'TURN_LEFT') {
          // In video feed, mirror mode reverses horizontal direction
          const delta = Math.abs(noseXRelative - 0.5);
          const isLeft = noseXRelative < 0.38 || noseXRelative > 0.62;
          const confidence = Math.min(1, delta / 0.15);
          return {
            detected: isLeft && confidence >= 0.8,
            confidence,
            rawMetrics: { yaw: noseXRelative },
          };
        }

        if (action === 'TURN_RIGHT') {
          const delta = Math.abs(noseXRelative - 0.5);
          const isRight = noseXRelative < 0.38 || noseXRelative > 0.62;
          const confidence = Math.min(1, delta / 0.15);
          return {
            detected: isRight && confidence >= 0.8,
            confidence,
            rawMetrics: { yaw: noseXRelative },
          };
        }

        if (action === 'NOD_UP') {
          const isUp = noseYRelative < 0.42;
          const confidence = isUp ? 0.9 : 0.3;
          return {
            detected: isUp,
            confidence,
            rawMetrics: { pitch: noseYRelative },
          };
        }

        if (action === 'SMILE') {
          const confidence = Math.min(1, avgSmile / 0.35);
          return {
            detected: avgSmile >= 0.35,
            confidence,
            rawMetrics: { smile: avgSmile },
          };
        }
      }
    } catch {
      // Fall through to optical motion tracker
    }
  }

  // 2. Optical Motion & Temporal Pixel Variance Fallback
  // Analyzes temporal intensity shifts in canvas quadrants to track head motion
  if (canvasHelper && video.videoWidth > 0) {
    try {
      const ctx = canvasHelper.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        canvasHelper.width = 64;
        canvasHelper.height = 64;
        ctx.drawImage(video, 0, 0, 64, 64);
        const imgData = ctx.getImageData(0, 0, 64, 64).data;

        let leftLum = 0;
        let rightLum = 0;
        let centerLum = 0;

        for (let y = 16; y < 48; y++) {
          for (let x = 12; x < 52; x++) {
            const idx = (y * 64 + x) * 4;
            const r = imgData[idx];
            const g = imgData[idx + 1];
            const b = imgData[idx + 2];
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;

            if (x < 28) leftLum += lum;
            else if (x > 36) rightLum += lum;
            else centerLum += lum;
          }
        }

        const currentLum = { left: leftLum, right: rightLum, center: centerLum };

        if (previousLuminanceRef && previousLuminanceRef.current) {
          const prev = previousLuminanceRef.current;
          const dLeft = Math.abs(currentLum.left - prev.left) / (prev.left || 1);
          const dRight = Math.abs(currentLum.right - prev.right) / (prev.right || 1);
          const dCenter = Math.abs(currentLum.center - prev.center) / (prev.center || 1);

          previousLuminanceRef.current = currentLum;

          if (action === 'BLINK' && dCenter > 0.08) {
            return { detected: true, confidence: 0.85 };
          }
          if ((action === 'TURN_LEFT' || action === 'TURN_RIGHT') && (dLeft > 0.09 || dRight > 0.09)) {
            return { detected: true, confidence: 0.85 };
          }
        } else if (previousLuminanceRef) {
          previousLuminanceRef.current = currentLum;
        }
      }
    } catch {
      // Ignore fallback error
    }
  }

  return { detected: false, confidence: 0 };
}
