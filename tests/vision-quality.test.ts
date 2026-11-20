import { describe, it, expect } from 'vitest';
import { analyzeDecodedPixels, type LandmarkPoint } from '@/lib/vision/pixelQuality';
import { evaluateScanQuality } from '@/lib/vision/scanQualityEngine';
import { QualityGateError, scoreFace } from '@/lib/rating/engine';

function makeMockLandmarks(): LandmarkPoint[] {
  // Create 468 landmarks centered around (0.5, 0.5)
  const pts: LandmarkPoint[] = Array.from({ length: 468 }, () => ({ x: 0.5, y: 0.5 }));
  const oval = [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377,
    152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
  ];
  for (let i = 0; i < oval.length; i++) {
    const angle = (i / oval.length) * Math.PI * 2 - Math.PI / 2;
    pts[oval[i]] = {
      x: 0.5 + Math.cos(angle) * 0.22,
      y: 0.52 + Math.sin(angle) * 0.28,
    };
  }
  pts[1] = { x: 0.5, y: 0.54 }; // nose
  pts[10] = { x: 0.5, y: 0.24 }; // forehead
  pts[152] = { x: 0.5, y: 0.80 }; // chin
  pts[234] = { x: 0.28, y: 0.52 }; // left cheek
  pts[454] = { x: 0.72, y: 0.52 }; // right cheek
  pts[33] = { x: 0.39, y: 0.43 }; // left eye outer
  pts[263] = { x: 0.61, y: 0.43 }; // right eye outer
  return pts;
}

function renderPortraitFrame(opts: {
  width: number;
  height: number;
  bgRgb: [number, number, number];
  faceBaseRgb: [number, number, number];
  faceTextureAmp?: number;
  clippedCheekFraction?: number;
  noseSpecular?: boolean;
}): Uint8ClampedArray {
  const {
    width,
    height,
    bgRgb,
    faceBaseRgb,
    faceTextureAmp = 24,
    clippedCheekFraction = 0,
    noseSpecular = false,
  } = opts;
  const rgba = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const dx = (x - width * 0.5) / (width * 0.22);
      const dy = (y - height * 0.52) / (height * 0.28);
      const inFace = dx * dx + dy * dy <= 1;

      if (!inFace) {
        rgba[idx] = bgRgb[0];
        rgba[idx + 1] = bgRgb[1];
        rgba[idx + 2] = bgRgb[2];
        rgba[idx + 3] = 255;
        continue;
      }

      // Deterministic natural facial contours/features (smooth gradients + feature edges, low pixel noise)
      const contour =
        Math.sin((x / width) * Math.PI * 10) * (faceTextureAmp * 0.65) +
        Math.cos((y / height) * Math.PI * 10) * (faceTextureAmp * 0.65);
      // Add distinct brow/eye/lip horizontal feature bands for realistic Laplacian edge energy
      const featureEdge =
        Math.abs(dy + 0.25) < 0.05 || Math.abs(dy - 0.35) < 0.05 ? -faceTextureAmp * 0.8 : 0;
      let r = Math.max(0, Math.min(255, Math.round(faceBaseRgb[0] + contour + featureEdge)));
      let g = Math.max(0, Math.min(255, Math.round(faceBaseRgb[1] + contour + featureEdge)));
      let b = Math.max(0, Math.min(255, Math.round(faceBaseRgb[2] + contour + featureEdge)));

      if (clippedCheekFraction > 0 && dy > -0.6 && dy < -0.6 + clippedCheekFraction * 1.4) {
        r = 255;
        g = 255;
        b = 255;
      }

      if (noseSpecular && Math.abs(dx) < 0.16 && dy > -0.15 && dy < 0.2) {
        r = 254;
        g = 254;
        b = 254;
      }

      rgba[idx] = r;
      rgba[idx + 1] = g;
      rgba[idx + 2] = b;
      rgba[idx + 3] = 255;
    }
  }
  return rgba;
}

describe('Face-First Quality Gate Regression Suite', () => {
  const landmarks = makeMockLandmarks();

  it('Case B: bright ceiling / white wall background does NOT trigger facial glare rejection', () => {
    const rgba = renderPortraitFrame({
      width: 120,
      height: 160,
      bgRgb: [255, 255, 255], // >70% bright ceiling/background
      faceBaseRgb: [145, 110, 95], // well-lit face, 0% near-white
      faceTextureAmp: 26,
    });

    const metrics = analyzeDecodedPixels(rgba, 120, 160, landmarks);
    expect(metrics.maskMode).toBe('MEDIAPIPE_POLYGON');
    expect(metrics.globalOverExposedFraction).toBeGreaterThan(0.5);
    expect(metrics.facialOverExposedFraction).toBe(0);
    expect(metrics.qualityDecision).toBe('PASS');
    expect(metrics.usable).toBe(true);
    expect(metrics.failureReasons).toHaveLength(0);
  });

  it('changing only background brightness leaves facial exposure metrics unchanged', () => {
    const darkBg = analyzeDecodedPixels(
      renderPortraitFrame({
        width: 120,
        height: 160,
        bgRgb: [25, 25, 30],
        faceBaseRgb: [140, 108, 92],
      }),
      120,
      160,
      landmarks
    );
    const brightBg = analyzeDecodedPixels(
      renderPortraitFrame({
        width: 120,
        height: 160,
        bgRgb: [255, 255, 255],
        faceBaseRgb: [140, 108, 92],
      }),
      120,
      160,
      landmarks
    );

    expect(darkBg.facialOverExposedFraction).toBe(brightBg.facialOverExposedFraction);
    expect(darkBg.lumaMean).toBe(brightBg.lumaMean);
    expect(darkBg.qualityDecision).toBe('PASS');
    expect(brightBg.qualityDecision).toBe('PASS');
  });

  it('Case A: severely underilluminated portrait triggers RETAKE_REQUIRED and never receives fabricated scores', async () => {
    const rgba = renderPortraitFrame({
      width: 120,
      height: 160,
      bgRgb: [10, 10, 12],
      faceBaseRgb: [4, 4, 5],
      faceTextureAmp: 2,
    });

    const metrics = analyzeDecodedPixels(rgba, 120, 160, landmarks);
    expect(metrics.qualityDecision).toBe('RETAKE_REQUIRED');
    expect(metrics.usable).toBe(false);
    expect(metrics.rejectionReasonCodes).toContain('FACIAL_SHADOW_DETAIL_LOSS');

    await expect(
      scoreFace({
        featureVector: {
          symmetry: 90,
          goldenRatioDeviation: 5,
          skinTextureUniformity: 88,
          lightingBalance: metrics.lightingBalance,
          eyeCanthalTiltAngle: 2,
          jawlineDefinition: 89,
          clientEngine: 'MEDIAPIPE_WASM',
          qualityGate: {
            passed: metrics.usable,
            qualityDecision: metrics.qualityDecision,
            sharpness: metrics.sharpnessScore,
            exposure: metrics.exposureScore,
            framingCoverage: 85,
            noiseLevel: metrics.noiseLevel,
            overExposedFraction: metrics.overExposedFraction,
            facialOverExposedFraction: metrics.facialOverExposedFraction,
            globalOverExposedFraction: metrics.globalOverExposedFraction,
            crushedShadowFraction: metrics.crushedShadowFraction,
            lumaContrast: metrics.lumaContrast,
            faceDetected: true,
            rejectionReasonCodes: metrics.rejectionReasonCodes,
            failureReasons: metrics.failureReasons,
          },
        },
      })
    ).rejects.toThrow(QualityGateError);
  });

  it('tolerates small localized nose specular reflections without blocking', () => {
    const rgba = renderPortraitFrame({
      width: 120,
      height: 160,
      bgRgb: [240, 240, 245],
      faceBaseRgb: [135, 102, 88],
      noseSpecular: true,
    });

    const metrics = analyzeDecodedPixels(rgba, 120, 160, landmarks);
    expect(metrics.subregions.nose.overExposedFraction).toBeGreaterThan(0);
    expect(metrics.qualityDecision).toBe('PASS');
    expect(metrics.usable).toBe(true);
  });

  it('uses PASS_WITH_LIMITATIONS for moderate facial glare and RETAKE_REQUIRED for extensive facial clipping', () => {
    const moderate = analyzeDecodedPixels(
      renderPortraitFrame({
        width: 120,
        height: 160,
        bgRgb: [220, 220, 220],
        faceBaseRgb: [145, 112, 96],
        clippedCheekFraction: 0.22,
      }),
      120,
      160,
      landmarks
    );
    expect(moderate.qualityDecision).toBe('PASS_WITH_LIMITATIONS');
    expect(moderate.usable).toBe(true);
    expect(moderate.warnings.length).toBeGreaterThan(0);

    const severe = analyzeDecodedPixels(
      renderPortraitFrame({
        width: 120,
        height: 160,
        bgRgb: [220, 220, 220],
        faceBaseRgb: [145, 112, 96],
        clippedCheekFraction: 0.55,
      }),
      120,
      160,
      landmarks
    );
    expect(severe.qualityDecision).toBe('RETAKE_REQUIRED');
    expect(severe.usable).toBe(false);
    expect(severe.rejectionReasonCodes).toContain('FACIAL_HIGHLIGHT_CLIPPING');
  });

  it('does NOT penalize naturally darker skin tones with healthy contrast', () => {
    const darkSkin = analyzeDecodedPixels(
      renderPortraitFrame({
        width: 120,
        height: 160,
        bgRgb: [250, 250, 250],
        faceBaseRgb: [65, 45, 36],
        faceTextureAmp: 22,
      }),
      120,
      160,
      landmarks
    );

    expect(darkSkin.qualityDecision).toBe('PASS');
    expect(darkSkin.usable).toBe(true);
    expect(darkSkin.crushedShadowFraction).toBeLessThan(0.1);
  });

  it('scanQualityEngine ignores global background clipping when facial clipping is 0', () => {
    const assessment = evaluateScanQuality({
      faceDetected: true,
      faceCount: 1,
      sharpness: 80,
      motionBlurScore: 82,
      exposure: 88,
      facialOverExposedFraction: 0.0,
      globalOverExposedFraction: 0.76,
      crushedShadowFraction: 0.02,
      lightingBalance: 85,
      framing: 85,
      faceWidthRatio: 0.45,
      yaw: 0.02,
      pitch: 0.01,
    });

    expect(assessment.qualityDecision).toBe('PASS');
    expect(assessment.usable).toBe(true);
    expect(assessment.globalOverExposedFraction).toBe(0.76);
    expect(assessment.facialOverExposedFraction).toBe(0);
  });
});
