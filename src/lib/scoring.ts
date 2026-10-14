import { Band, Tier, CategoryBreakdown, DetailedBreakdown } from '@/types';
import { TIER_CONFIG } from './tokens';

export function calculateRawScore(breakdown: CategoryBreakdown | DetailedBreakdown): number {
  if ('face' in breakdown && typeof breakdown.photoCraft === 'object') {
    const detailed = breakdown as DetailedBreakdown;
    const photoCraft =
      detailed.photoCraft.lighting * 0.15 +
      detailed.photoCraft.sharpness * 0.08 +
      detailed.photoCraft.framing * 0.07;

    const face =
      detailed.face.harmony * 0.18 +
      detailed.face.skinClarity * 0.12 +
      detailed.face.featureDefinition * 0.10 +
      detailed.face.symmetry * 0.05;

    const expression = detailed.expression * 0.15;
    const aura = detailed.aura * 0.10;

    const raw = photoCraft + face + expression + aura;
    return Math.max(0, Math.min(100, Math.round(raw)));
  }

  const flat = breakdown as CategoryBreakdown;
  const raw =
    flat.photoCraft * 0.30 +
    flat.harmony * 0.25 +
    flat.skinClarity * 0.20 +
    flat.expression * 0.15 +
    flat.aura * 0.10;

  return Math.max(0, Math.min(100, Math.round(raw)));
}

export const calculateLethality = calculateRawScore;

export function getVerdictBand(score: number): Band {
  if (score >= 85) return 'LETHAL';
  if (score >= 65) return 'DANGEROUS';
  if (score >= 40) return 'SUSPICIOUS';
  return 'HARMLESS';
}

export const resolveVerdictBand = getVerdictBand;

export function getTierFromLifetimePoints(points: number): Tier {
  if (points >= TIER_CONFIG.BLACK.minPoints) return 'BLACK';
  if (points >= TIER_CONFIG.PLATINUM.minPoints) return 'PLATINUM';
  if (points >= TIER_CONFIG.GOLD.minPoints) return 'GOLD';
  return 'CLASSIC';
}

export function getStreakMultiplier(consecutiveDays: number): number {
  if (consecutiveDays >= 30) return 2.0;
  if (consecutiveDays >= 14) return 1.5;
  if (consecutiveDays >= 7) return 1.25;
  if (consecutiveDays >= 3) return 1.1;
  return 1.0;
}

export function calculateScanPoints(
  score: number,
  scanIndexOfDay: 1 | 2 | 3,
  consecutiveDays: number
): number {
  const baseRate = scanIndexOfDay === 1 ? 1.0 : 0.5;
  const multiplier = getStreakMultiplier(consecutiveDays);
  return Math.round(score * baseRate * multiplier);
}

/**
 * Returns the current date key in Africa/Lagos timezone (YYYY-MM-DD).
 */
export function getLagosDayKey(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(date);
}

/**
 * Returns yesterday's date key in Africa/Lagos timezone (YYYY-MM-DD).
 */
export function getYesterdayLagosDayKey(): string {
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return getLagosDayKey(d);
}
