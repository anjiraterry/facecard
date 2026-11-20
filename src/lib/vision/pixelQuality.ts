export interface PixelQualityMetrics {
  width: number;
  height: number;
  lumaMean: number; // 0-255
  lumaContrast: number; // std dev 0-128
  overExposedFraction: number; // 0-1 (Y >= 248)
  crushedShadowFraction: number; // 0-1 (Y <= 12)
  sharpnessScore: number; // 0-100 (Laplacian variance)
  noiseLevel: number; // 0-100 (high-frequency residual MAD)
  exposureScore: number; // 0-100 (tone-fair: penalizes clipping & crushed contrast, not dark skin)
  lightingBalance: number; // 0-100 (left-vs-right illumination symmetry)
  usable: boolean;
  failureReasons: string[];
}

/**
 * Measures real decoded RGBA pixel quality metrics.
 * Tone-fair: distinguishes crushed-shadow information loss & noise from naturally dark skin.
 */
export function analyzeDecodedPixels(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number
): PixelQualityMetrics {
  const totalPixels = Math.max(1, width * height);
  const luma = new Float32Array(totalPixels);

  let sum = 0;
  let overExposed = 0;
  let crushed = 0;
  let leftSum = 0;
  let leftCount = 0;
  let rightSum = 0;
  let rightCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const p = idx * 4;
      const r = rgba[p] ?? 0;
      const g = rgba[p + 1] ?? 0;
      const b = rgba[p + 2] ?? 0;
      const yVal = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      luma[idx] = yVal;
      sum += yVal;

      if (yVal >= 248) overExposed++;
      if (yVal <= 12) crushed++;

      // Focus illumination balance on central portrait region (20%..80%)
      if (x >= width * 0.2 && x <= width * 0.8 && y >= height * 0.15 && y <= height * 0.85) {
        if (x < width * 0.5) {
          leftSum += yVal;
          leftCount++;
        } else {
          rightSum += yVal;
          rightCount++;
        }
      }
    }
  }

  const lumaMean = sum / totalPixels;
  let varSum = 0;
  for (let i = 0; i < totalPixels; i++) {
    const d = luma[i] - lumaMean;
    varSum += d * d;
  }
  const lumaContrast = Math.sqrt(varSum / totalPixels);

  // Laplacian variance for sharpness + local median-like residual for sensor noise
  let lapSum = 0;
  let lapSqSum = 0;
  let lapCount = 0;
  let noiseDiffSum = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
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

      // 4-neighbor average residual estimates high-frequency sensor noise
      const neighborAvg =
        (luma[i - 1] + luma[i + 1] + luma[i - width] + luma[i + width]) * 0.25;
      noiseDiffSum += Math.abs(center - neighborAvg);
    }
  }

  const lapMean = lapCount > 0 ? lapSum / lapCount : 0;
  const lapVariance = lapCount > 0 ? Math.max(0, lapSqSum / lapCount - lapMean * lapMean) : 0;
  const sharpnessScore = Math.max(0, Math.min(100, Math.round((Math.sqrt(lapVariance) / 28) * 100)));

  const meanResidual = lapCount > 0 ? noiseDiffSum / lapCount : 0;
  // High residual relative to contrast indicates grain/noise rather than clean edges
  const noiseRatio = lumaContrast > 1 ? meanResidual / Math.max(8, lumaContrast) : 1;
  const noiseLevel = Math.max(0, Math.min(100, Math.round(noiseRatio * 140)));

  const overExposedFraction = overExposed / totalPixels;
  const crushedShadowFraction = crushed / totalPixels;

  const leftMean = leftCount > 0 ? leftSum / leftCount : lumaMean;
  const rightMean = rightCount > 0 ? rightSum / rightCount : lumaMean;
  const lrDiff = Math.abs(leftMean - rightMean);
  const lightingBalance = Math.max(0, Math.min(100, Math.round(100 - lrDiff * 1.4)));

  // Tone-fair exposure score: penalizes clipping, crushed contrast, and heavy noise
  const contrastPenalty = lumaContrast < 16 ? (16 - lumaContrast) * 3 : 0;
  const clipPenalty = (overExposedFraction * 120) + (crushedShadowFraction * 90);
  const exposureScore = Math.max(0, Math.min(100, Math.round(100 - contrastPenalty - clipPenalty)));

  const failureReasons: string[] = [];
  if (crushedShadowFraction > 0.35 || lumaContrast < 14) {
    failureReasons.push('Insufficient visible facial detail due to low illumination or crushed shadows.');
  }
  if (overExposedFraction > 0.15) {
    failureReasons.push('Highlights are clipped; move out of harsh direct glare.');
  }
  if (sharpnessScore < 35) {
    failureReasons.push('Image is out of focus or has motion blur.');
  }
  if (noiseLevel > 60) {
    failureReasons.push('Considerable sensor noise visible; face a brighter light source.');
  }
  if (lightingBalance < 45) {
    failureReasons.push('Lighting is strongly uneven across the face.');
  }

  return {
    width,
    height,
    lumaMean: Number(lumaMean.toFixed(1)),
    lumaContrast: Number(lumaContrast.toFixed(1)),
    overExposedFraction: Number(overExposedFraction.toFixed(3)),
    crushedShadowFraction: Number(crushedShadowFraction.toFixed(3)),
    sharpnessScore,
    noiseLevel,
    exposureScore,
    lightingBalance,
    usable: failureReasons.length === 0,
    failureReasons,
  };
}
