export const PIXEL_QUALITY_VERSION = 'face-first-v2.0';

export type QualityDecision = 'PASS' | 'PASS_WITH_LIMITATIONS' | 'RETAKE_REQUIRED';

export const QUALITY_THRESHOLDS = {
  highlightLumaThreshold: 250,
  highlightChannelMin: 250,
  shadowLumaThreshold: 12,
  facialClipPassMax: 0.12,
  facialClipRetakeMin: 0.30,
  facialShadowCrushMax: 0.38,
  facialContrastMin: 14,
  sharpnessRetakeMin: 25,
  sharpnessPassMin: 35,
  noiseRetakeMax: 75,
  noisePassMax: 60,
  lightingBalancePassMin: 45,
  minSkinCoverage: 0.70,
} as const;

export interface LandmarkPoint {
  x: number;
  y: number;
  z?: number;
}

export interface SubregionMetrics {
  pixelCount: number;
  overExposedFraction: number;
  crushedShadowFraction: number;
  lumaMean: number;
}

export interface PixelQualityMetrics {
  width: number;
  height: number;
  algorithmVersion: string;
  maskMode: 'MEDIAPIPE_POLYGON' | 'CENTRAL_PORTRAIT_ELLIPSE';
  qualityDecision: QualityDecision;
  lumaMean: number; // Facial mean luminance 0-255
  lumaContrast: number; // Facial std dev 0-128
  overExposedFraction: number; // Facial highlight clipping 0-1 (weighted; nose speculars tolerated)
  facialOverExposedFraction: number; // Raw facial highlight clipping 0-1 (excluding background/ceiling)
  globalOverExposedFraction: number; // Full-frame near-white fraction 0-1 (contextual only, never rejects)
  crushedShadowFraction: number; // Facial shadow clipping 0-1 (Y <= 12)
  globalCrushedShadowFraction: number; // Full-frame crushed shadow fraction 0-1
  sharpnessScore: number; // 0-100 (Laplacian variance inside face mask)
  noiseLevel: number; // 0-100 (high-frequency residual MAD inside face mask)
  exposureScore: number; // 0-100 (tone-fair: penalizes facial clipping & crushed contrast, not dark skin)
  lightingBalance: number; // 0-100 (left-vs-right facial illumination symmetry)
  skinRegionCoverage: number; // 0-1 (usable forehead + cheek pixels)
  reliableForSkinObservation: boolean;
  subregions: {
    forehead: SubregionMetrics;
    leftCheek: SubregionMetrics;
    rightCheek: SubregionMetrics;
    nose: SubregionMetrics;
  };
  usable: boolean;
  rejectionReasonCodes: string[];
  warnings: string[];
  failureReasons: string[];
}

// Standard MediaPipe 468 Face Oval contour indices
const FACE_OVAL_INDICES = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377,
  152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
];

function isPointInPolygon(x: number, y: number, poly: Array<{ x: number; y: number }>): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function emptySubregion(): SubregionMetrics {
  return { pixelCount: 0, overExposedFraction: 0, crushedShadowFraction: 0, lumaMean: 0 };
}

function finalizeSubregion(count: number, over: number, crushed: number, sum: number): SubregionMetrics {
  if (count <= 0) return emptySubregion();
  return {
    pixelCount: count,
    overExposedFraction: Number((over / count).toFixed(4)),
    crushedShadowFraction: Number((crushed / count).toFixed(4)),
    lumaMean: Number((sum / count).toFixed(1)),
  };
}

/**
 * Measures real decoded RGBA pixel quality metrics using face-first masking.
 * - Excludes background, ceiling, walls, and clothing from facial exposure rejection.
 * - Tolerates natural specular highlights on the nose.
 * - Tone-fair: distinguishes crushed-shadow detail loss & noise from naturally dark skin.
 */
export function analyzeDecodedPixels(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  landmarks?: LandmarkPoint[] | null
): PixelQualityMetrics {
  const totalPixels = Math.max(1, width * height);
  const luma = new Float32Array(totalPixels);
  const faceMask = new Uint8Array(totalPixels);

  const hasValidLandmarks = Array.isArray(landmarks) && landmarks.length >= 455;
  const maskMode: PixelQualityMetrics['maskMode'] = hasValidLandmarks
    ? 'MEDIAPIPE_POLYGON'
    : 'CENTRAL_PORTRAIT_ELLIPSE';

  let facePoly: Array<{ x: number; y: number }> | null = null;
  let polyMinX = 0;
  let polyMaxX = width - 1;
  let polyMinY = 0;
  let polyMaxY = height - 1;

  // Subregion bounds in pixel coordinates
  let foreheadBox = { minX: width * 0.34, maxX: width * 0.66, minY: height * 0.20, maxY: height * 0.34 };
  let leftCheekBox = { minX: width * 0.28, maxX: width * 0.44, minY: height * 0.46, maxY: height * 0.64 };
  let rightCheekBox = { minX: width * 0.56, maxX: width * 0.72, minY: height * 0.46, maxY: height * 0.64 };
  let noseBox = { minX: width * 0.44, maxX: width * 0.56, minY: height * 0.40, maxY: height * 0.60 };
  let midlineX = width * 0.5;

  if (hasValidLandmarks && landmarks) {
    facePoly = FACE_OVAL_INDICES.map((idx) => ({
      x: (landmarks[idx]?.x ?? 0.5) * width,
      y: (landmarks[idx]?.y ?? 0.5) * height,
    }));

    polyMinX = width;
    polyMaxX = 0;
    polyMinY = height;
    polyMaxY = 0;
    for (const pt of facePoly) {
      if (pt.x < polyMinX) polyMinX = pt.x;
      if (pt.x > polyMaxX) polyMaxX = pt.x;
      if (pt.y < polyMinY) polyMinY = pt.y;
      if (pt.y > polyMaxY) polyMaxY = pt.y;
    }

    const nosePt = landmarks[1] ?? { x: 0.5, y: 0.52 };
    const foreheadPt = landmarks[10] ?? { x: 0.5, y: 0.2 };
    const leftCheekPt = landmarks[234] ?? { x: 0.26, y: 0.52 };
    const rightCheekPt = landmarks[454] ?? { x: 0.74, y: 0.52 };
    const leftEyeOuter = landmarks[33] ?? { x: 0.36, y: 0.42 };
    const rightEyeOuter = landmarks[263] ?? { x: 0.64, y: 0.42 };
    const chinPt = landmarks[152] ?? { x: 0.5, y: 0.82 };

    const faceW = Math.max(10, Math.abs(rightCheekPt.x - leftCheekPt.x) * width);
    const faceH = Math.max(10, Math.abs(chinPt.y - foreheadPt.y) * height);
    const midEyeY = ((leftEyeOuter.y + rightEyeOuter.y) / 2) * height;
    midlineX = nosePt.x * width;

    foreheadBox = {
      minX: Math.min(leftEyeOuter.x, rightEyeOuter.x) * width,
      maxX: Math.max(leftEyeOuter.x, rightEyeOuter.x) * width,
      minY: foreheadPt.y * height + faceH * 0.04,
      maxY: Math.max(foreheadPt.y * height + faceH * 0.08, midEyeY - faceH * 0.06),
    };

    const cheekTop = midEyeY + faceH * 0.06;
    const cheekBottom = Math.min(chinPt.y * height - faceH * 0.14, nosePt.y * height + faceH * 0.14);
    leftCheekBox = {
      minX: Math.min(leftCheekPt.x, nosePt.x) * width + faceW * 0.08,
      maxX: midlineX - faceW * 0.10,
      minY: cheekTop,
      maxY: Math.max(cheekTop + 2, cheekBottom),
    };
    rightCheekBox = {
      minX: midlineX + faceW * 0.10,
      maxX: Math.max(rightCheekPt.x, nosePt.x) * width - faceW * 0.08,
      minY: cheekTop,
      maxY: Math.max(cheekTop + 2, cheekBottom),
    };
    noseBox = {
      minX: midlineX - faceW * 0.08,
      maxX: midlineX + faceW * 0.08,
      minY: midEyeY,
      maxY: nosePt.y * height + faceH * 0.05,
    };
  }

  let globalOver = 0;
  let globalCrushed = 0;

  let faceCount = 0;
  let faceSum = 0;
  let faceOverNonNose = 0;
  let faceNonNoseCount = 0;
  let faceCrushed = 0;

  let leftSum = 0;
  let leftCount = 0;
  let rightSum = 0;
  let rightCount = 0;

  let fhCount = 0, fhOver = 0, fhCrushed = 0, fhSum = 0;
  let lcCount = 0, lcOver = 0, lcCrushed = 0, lcSum = 0;
  let rcCount = 0, rcOver = 0, rcCrushed = 0, rcSum = 0;
  let nCount = 0, nOver = 0, nCrushed = 0, nSum = 0;

  const cx = width * 0.5;
  const cy = height * 0.48;
  const rx = Math.max(1, width * 0.28);
  const ry = Math.max(1, height * 0.34);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const p = idx * 4;
      const r = rgba[p] ?? 0;
      const g = rgba[p + 1] ?? 0;
      const b = rgba[p + 2] ?? 0;
      const yVal = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      luma[idx] = yVal;

      const isNearWhite =
        (r >= QUALITY_THRESHOLDS.highlightChannelMin &&
          g >= QUALITY_THRESHOLDS.highlightChannelMin &&
          b >= QUALITY_THRESHOLDS.highlightChannelMin) ||
        yVal >= QUALITY_THRESHOLDS.highlightLumaThreshold;
      const isCrushed = yVal <= QUALITY_THRESHOLDS.shadowLumaThreshold;

      if (isNearWhite) globalOver++;
      if (isCrushed) globalCrushed++;

      let inFace = false;
      if (facePoly) {
        if (x >= polyMinX && x <= polyMaxX && y >= polyMinY && y <= polyMaxY) {
          inFace = isPointInPolygon(x, y, facePoly);
        }
      } else {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        inFace = dx * dx + dy * dy <= 1;
      }

      if (!inFace) continue;

      faceMask[idx] = 1;
      faceCount++;
      faceSum += yVal;
      if (isCrushed) faceCrushed++;

      if (x < midlineX) {
        leftSum += yVal;
        leftCount++;
      } else {
        rightSum += yVal;
        rightCount++;
      }

      const inNose =
        x >= noseBox.minX && x <= noseBox.maxX && y >= noseBox.minY && y <= noseBox.maxY;
      if (inNose) {
        nCount++;
        nSum += yVal;
        if (isNearWhite) nOver++;
        if (isCrushed) nCrushed++;
      } else {
        faceNonNoseCount++;
        if (isNearWhite) faceOverNonNose++;
      }

      if (x >= foreheadBox.minX && x <= foreheadBox.maxX && y >= foreheadBox.minY && y <= foreheadBox.maxY) {
        fhCount++;
        fhSum += yVal;
        if (isNearWhite) fhOver++;
        if (isCrushed) fhCrushed++;
      } else if (x >= leftCheekBox.minX && x <= leftCheekBox.maxX && y >= leftCheekBox.minY && y <= leftCheekBox.maxY) {
        lcCount++;
        lcSum += yVal;
        if (isNearWhite) lcOver++;
        if (isCrushed) lcCrushed++;
      } else if (x >= rightCheekBox.minX && x <= rightCheekBox.maxX && y >= rightCheekBox.minY && y <= rightCheekBox.maxY) {
        rcCount++;
        rcSum += yVal;
        if (isNearWhite) rcOver++;
        if (isCrushed) rcCrushed++;
      }
    }
  }

  const effectiveFaceCount = Math.max(1, faceCount);
  const lumaMean = faceSum / effectiveFaceCount;

  let varSum = 0;
  for (let i = 0; i < totalPixels; i++) {
    if (faceMask[i]) {
      const d = luma[i] - lumaMean;
      varSum += d * d;
    }
  }
  const lumaContrast = Math.sqrt(varSum / effectiveFaceCount);

  // Laplacian variance for facial sharpness + local residual for facial sensor noise
  let lapSum = 0;
  let lapSqSum = 0;
  let lapCount = 0;
  let noiseDiffSum = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      if (!faceMask[i]) continue;
      const center = luma[i];
      const lap =
        luma[i - 1] +
        luma[i + 1] +
        luma[i - width] +
        luma[i + width] -
        4 * center;
      lapSum += lap;
      lapSqSum += lap * lap;
      lapCount++;

      const neighborAvg =
        (luma[i - 1] + luma[i + 1] + luma[i - width] + luma[i + width]) * 0.25;
      noiseDiffSum += Math.abs(center - neighborAvg);
    }
  }

  const lapMean = lapCount > 0 ? lapSum / lapCount : 0;
  const lapVariance = lapCount > 0 ? Math.max(0, lapSqSum / lapCount - lapMean * lapMean) : 0;
  const sharpnessScore = Math.max(0, Math.min(100, Math.round((Math.sqrt(lapVariance) / 28) * 100)));

  const meanResidual = lapCount > 0 ? noiseDiffSum / lapCount : 0;
  const noiseRatio = lumaContrast > 1 ? meanResidual / Math.max(8, lumaContrast) : 1;
  const noiseLevel = Math.max(0, Math.min(100, Math.round(noiseRatio * 140)));

  const globalOverExposedFraction = globalOver / totalPixels;
  const globalCrushedShadowFraction = globalCrushed / totalPixels;

  const facialOverExposedFraction = faceOverNonNose / Math.max(1, faceNonNoseCount);
  const noseOverFraction = nCount > 0 ? nOver / nCount : 0;
  // Natural nose specular reflections are weighted gently (0.15x) so normal nose shine does not reject
  const overExposedFraction = Math.min(
    1,
    facialOverExposedFraction + noseOverFraction * 0.15
  );
  const crushedShadowFraction = faceCrushed / effectiveFaceCount;

  const leftMean = leftCount > 0 ? leftSum / leftCount : lumaMean;
  const rightMean = rightCount > 0 ? rightSum / rightCount : lumaMean;
  const lrDiff = Math.abs(leftMean - rightMean);
  const lightingBalance = Math.max(0, Math.min(100, Math.round(100 - lrDiff * 1.4)));

  // Tone-fair exposure score: penalizes facial clipping, crushed contrast, not dark skin pigmentation
  const contrastPenalty = lumaContrast < QUALITY_THRESHOLDS.facialContrastMin
    ? (QUALITY_THRESHOLDS.facialContrastMin - lumaContrast) * 3
    : 0;
  const clipPenalty = (overExposedFraction * 120) + (crushedShadowFraction * 90);
  const exposureScore = Math.max(0, Math.min(100, Math.round(100 - contrastPenalty - clipPenalty)));

  // Skin-region coverage across forehead + cheeks
  const skinTotal = fhCount + lcCount + rcCount;
  const skinClipped = fhOver + lcOver + rcOver;
  const skinCrushed = fhCrushed + lcCrushed + rcCrushed;
  const skinRegionCoverage =
    skinTotal > 0
      ? Math.max(0, Math.min(1, (skinTotal - skinClipped - skinCrushed) / skinTotal))
      : Math.max(0, Math.min(1, 1 - overExposedFraction - crushedShadowFraction));

  const rejectionReasonCodes: string[] = [];
  const failureReasons: string[] = [];
  const warnings: string[] = [];

  if (
    crushedShadowFraction > QUALITY_THRESHOLDS.facialShadowCrushMax &&
    lumaContrast < QUALITY_THRESHOLDS.facialContrastMin
  ) {
    rejectionReasonCodes.push('FACIAL_SHADOW_DETAIL_LOSS');
    failureReasons.push('Important facial details are lost in shadows; face a brighter light source.');
  } else if (lumaContrast < 10 && crushedShadowFraction > 0.25) {
    rejectionReasonCodes.push('FACIAL_SHADOW_DETAIL_LOSS');
    failureReasons.push('Important facial details are lost in shadows; face a brighter light source.');
  }

  if (overExposedFraction > QUALITY_THRESHOLDS.facialClipRetakeMin) {
    rejectionReasonCodes.push('FACIAL_HIGHLIGHT_CLIPPING');
    failureReasons.push('Facial highlights are clipped; move out of harsh direct glare.');
  } else if (overExposedFraction > QUALITY_THRESHOLDS.facialClipPassMax) {
    warnings.push('Moderate facial glare detected; skin surface observations may have reduced confidence.');
  }

  if (sharpnessScore < QUALITY_THRESHOLDS.sharpnessRetakeMin) {
    rejectionReasonCodes.push('FACIAL_BLUR');
    failureReasons.push('Face is insufficiently sharp; hold steady and wipe the lens.');
  } else if (sharpnessScore < QUALITY_THRESHOLDS.sharpnessPassMin) {
    warnings.push('Slight motion or focus softness detected; fine texture confidence reduced.');
  }

  if (noiseLevel > QUALITY_THRESHOLDS.noiseRetakeMax) {
    rejectionReasonCodes.push('EXCESSIVE_FACIAL_NOISE');
    failureReasons.push('Considerable sensor noise visible across the face; face a brighter light source.');
  } else if (noiseLevel > QUALITY_THRESHOLDS.noisePassMax) {
    warnings.push('Moderate sensor noise detected; skin detail confidence reduced.');
  }

  if (lightingBalance < QUALITY_THRESHOLDS.lightingBalancePassMin) {
    warnings.push('Lighting is uneven across the face; symmetry and tone readings may be less reliable.');
  }

  if (skinRegionCoverage < QUALITY_THRESHOLDS.minSkinCoverage && failureReasons.length === 0) {
    warnings.push('Skin detail cannot be reliably measured across all facial zones.');
  }

  const qualityDecision: QualityDecision =
    failureReasons.length > 0
      ? 'RETAKE_REQUIRED'
      : warnings.length > 0
        ? 'PASS_WITH_LIMITATIONS'
        : 'PASS';

  return {
    width,
    height,
    algorithmVersion: PIXEL_QUALITY_VERSION,
    maskMode,
    qualityDecision,
    lumaMean: Number(lumaMean.toFixed(1)),
    lumaContrast: Number(lumaContrast.toFixed(1)),
    overExposedFraction: Number(overExposedFraction.toFixed(3)),
    facialOverExposedFraction: Number(facialOverExposedFraction.toFixed(3)),
    globalOverExposedFraction: Number(globalOverExposedFraction.toFixed(3)),
    crushedShadowFraction: Number(crushedShadowFraction.toFixed(3)),
    globalCrushedShadowFraction: Number(globalCrushedShadowFraction.toFixed(3)),
    sharpnessScore,
    noiseLevel,
    exposureScore,
    lightingBalance,
    skinRegionCoverage: Number(skinRegionCoverage.toFixed(3)),
    reliableForSkinObservation:
      qualityDecision === 'PASS' && skinRegionCoverage >= QUALITY_THRESHOLDS.minSkinCoverage,
    subregions: {
      forehead: finalizeSubregion(fhCount, fhOver, fhCrushed, fhSum),
      leftCheek: finalizeSubregion(lcCount, lcOver, lcCrushed, lcSum),
      rightCheek: finalizeSubregion(rcCount, rcOver, rcCrushed, rcSum),
      nose: finalizeSubregion(nCount, nOver, nCrushed, nSum),
    },
    usable: qualityDecision !== 'RETAKE_REQUIRED',
    rejectionReasonCodes,
    warnings,
    failureReasons,
  };
}
