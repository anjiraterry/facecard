import { Tier } from '@/types';

/**
 * EconomyConfig: The centralized single source of truth for all points,
 * streak multipliers, tier gates, and arena parameters per PRD and PLAN.md.
 */
export const EconomyConfig = {
  // Scans
  DAILY_SCAN_CAP: 3,
  SCAN_RATE_FIRST: 1.0,    // 100% points on 1st scan of the day
  SCAN_RATE_SUBSEQUENT: 0.5, // 50% points on scans 2 & 3

  // Streak Multipliers
  STREAK_LADDER: [
    { minDays: 30, multiplier: 2.0 },
    { minDays: 14, multiplier: 1.5 },
    { minDays: 7,  multiplier: 1.25 },
    { minDays: 3,  multiplier: 1.1 },
    { minDays: 1,  multiplier: 1.0 },
  ],

  // Max Streak Freezes a user can hold
  MAX_STREAK_FREEZES: 2,

  // Tier Thresholds (in lifetime points)
  TIERS: {
    CLASSIC: { minPoints: 0, rank: 1, name: 'Classic' },
    GOLD: { minPoints: 1000, rank: 2, name: 'Gold' },
    PLATINUM: { minPoints: 5000, rank: 3, name: 'Platinum' },
    BLACK: { minPoints: 20000, rank: 4, name: 'Black Card' },
  } as Record<Tier, { minPoints: number; rank: number; name: string }>,

  // Face-Off Arena Parameters
  ARENA: {
    STAKE_OPTIONS: [50, 100, 250, 500],
    SYSTEM_FEE_PERCENT: 0.05, // 5% fee on staked pots
    WIN_BONUS_POINTS: 25,     // bonus awarded on victory
    MAX_DUELS_PER_DAY: 5,
    EXPIRY_MINUTES: 60 * 24,  // 24 hours
  },

  // Scoring Weights
  WEIGHTS: {
    PHOTO_CRAFT: 0.30,
    FACE: 0.45,
    EXPRESSION: 0.15,
    AURA: 0.10,
  },
};

export function getTierFromLifetime(points: number): Tier {
  if (points >= EconomyConfig.TIERS.BLACK.minPoints) return 'BLACK';
  if (points >= EconomyConfig.TIERS.PLATINUM.minPoints) return 'PLATINUM';
  if (points >= EconomyConfig.TIERS.GOLD.minPoints) return 'GOLD';
  return 'CLASSIC';
}

export function getMultiplierForStreak(days: number): number {
  for (const step of EconomyConfig.STREAK_LADDER) {
    if (days >= step.minDays) return step.multiplier;
  }
  return 1.0;
}
