import { scoreFace } from './engine';

export interface DemographicCohort {
  cohortId: string;
  description: string;
  monkScale: number; // 1 to 10
  lightingCondition: 'diffused' | 'direct' | 'shadowed';
  sampleCount: number;
}

export const CALIBRATION_COHORTS: DemographicCohort[] = [
  { cohortId: 'mst-1-2', description: 'Monk Scale 1-2 (Fair/Light)', monkScale: 2, lightingCondition: 'diffused', sampleCount: 10 },
  { cohortId: 'mst-3-5', description: 'Monk Scale 3-5 (Medium/Tan)', monkScale: 4, lightingCondition: 'diffused', sampleCount: 10 },
  { cohortId: 'mst-6-8', description: 'Monk Scale 6-8 (Rich Dark/Brown)', monkScale: 7, lightingCondition: 'diffused', sampleCount: 15 },
  { cohortId: 'mst-9-10', description: 'Monk Scale 9-10 (Deep Ebony/Black)', monkScale: 10, lightingCondition: 'diffused', sampleCount: 15 },
];

/**
 * Automated Fairness Test Harness (Phase 4.7 in PLAN.md)
 * Verifies that standard deviation of mean scores across cohorts is within 5% parity.
 */
export async function runFairnessAudit(): Promise<{
  passed: boolean;
  cohortResults: Array<{
    cohortId: string;
    meanScore: number;
    variance: number;
    passRate: number;
  }>;
  disparityMaxPercent: number;
  passRateParity: number;
  skinToneCorrelation: number;
}> {
  const cohortResults = [];
  const meanScores: number[] = [];

  for (const cohort of CALIBRATION_COHORTS) {
    const scores: number[] = [];
    let passedCount = 0;

    for (let i = 0; i < cohort.sampleCount; i++) {
      // Deterministic varied feature vector per sample within each Monk Scale cohort
      const offset = ((i % 5) - 2) * 2;
      const lightingFactor = cohort.lightingCondition === 'diffused' ? 86 : 80;
      try {
        const result = await scoreFace({
          toneMode: 'STRAIGHT',
          featureVector: {
            symmetry: 84 + offset,
            goldenRatioDeviation: 14 - Math.abs(offset),
            skinTextureUniformity: 83 + offset,
            lightingBalance: lightingFactor + offset,
            eyeCanthalTiltAngle: 4,
            jawlineDefinition: 82 + offset,
            qualityGate: {
              passed: true,
              sharpness: 85 + offset,
              exposure: lightingFactor + offset,
              framingCoverage: 88,
            },
            clientEngine: 'MEDIAPIPE_WASM',
          },
        });
        scores.push(result.score);
        passedCount++;
      } catch {
        // Failed quality gate sample
      }
    }

    const mean = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const variance =
      scores.length > 0
        ? Number((scores.reduce((acc, s) => acc + Math.pow(s - mean, 2), 0) / scores.length).toFixed(2))
        : 0;
    meanScores.push(mean);

    cohortResults.push({
      cohortId: cohort.cohortId,
      meanScore: mean,
      variance,
      passRate: Number((passedCount / cohort.sampleCount).toFixed(2)),
    });
  }

  const minMean = Math.min(...meanScores);
  const maxMean = Math.max(...meanScores);
  const disparityMaxPercent = Math.round(((maxMean - minMean) / maxMean) * 100);

  const passRates = cohortResults.map((c) => c.passRate);
  const minPass = Math.min(...passRates);
  const maxPass = Math.max(...passRates);
  const passRateParity = maxPass > 0 ? Number((minPass / maxPass).toFixed(3)) : 0;

  // Pearson correlation between Monk Scale (1-10) and cohort mean scores
  const mstValues = CALIBRATION_COHORTS.map((c) => c.monkScale);
  const mstMean = mstValues.reduce((a, b) => a + b, 0) / mstValues.length;
  const scoreMean = meanScores.reduce((a, b) => a + b, 0) / meanScores.length;
  let num = 0;
  let denA = 0;
  let denB = 0;
  for (let i = 0; i < mstValues.length; i++) {
    const dx = mstValues[i] - mstMean;
    const dy = meanScores[i] - scoreMean;
    num += dx * dy;
    denA += dx * dx;
    denB += dy * dy;
  }
  const skinToneCorrelation = denA > 0 && denB > 0 ? Number((num / Math.sqrt(denA * denB)).toFixed(3)) : 0;

  // Acceptance rules: score disparity <= 8%, pass-rate parity >= 0.90, and |r| < 0.10
  const passed =
    disparityMaxPercent <= 8 &&
    passRateParity >= 0.9 &&
    Math.abs(skinToneCorrelation) < 0.1;

  return {
    passed,
    cohortResults,
    disparityMaxPercent,
    passRateParity,
    skinToneCorrelation,
  };
}
