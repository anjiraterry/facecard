import { EconomyConfig } from '@/lib/economy';
import { getStreakMultiplier } from '@/lib/scoring';

export interface RewardPolicy {
  version: string;
  /** Locked at 3 free rewarded scans per Africa/Lagos day. */
  dailyFreeScans: number;
  firstScanRate: number;
  subsequentScanRate: number;
  /** Points per Lethality point before rate/streak multipliers (product configuration, not science). */
  pointsPerScorePoint: number;
  extraSnapCostPts: number;
  extraSnapMaxReward: number;
}

export const DEFAULT_REWARD_POLICY: RewardPolicy = {
  version: 'reward-policy-v1',
  dailyFreeScans: EconomyConfig.DAILY_SCAN_CAP,
  firstScanRate: EconomyConfig.SCAN_RATE_FIRST,
  subsequentScanRate: EconomyConfig.SCAN_RATE_SUBSEQUENT,
  pointsPerScorePoint: 1,
  extraSnapCostPts: EconomyConfig.EXTRA_SCAN_COST_PTS,
  extraSnapMaxReward: EconomyConfig.EXTRA_SCAN_MAX_REWARD,
};

export function validateRewardPolicy(raw: unknown): { valid: boolean; errors: string[]; policy?: RewardPolicy } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { valid: false, errors: ['Reward policy must be an object'] };
  }
  const o = raw as Record<string, unknown>;
  const errors: string[] = [];
  const num = (k: string) => (typeof o[k] === 'number' && Number.isFinite(o[k] as number) ? (o[k] as number) : null);

  const dailyFreeScans = num('dailyFreeScans');
  const firstScanRate = num('firstScanRate');
  const subsequentScanRate = num('subsequentScanRate');
  const pointsPerScorePoint = num('pointsPerScorePoint');
  const extraSnapCostPts = num('extraSnapCostPts');
  const extraSnapMaxReward = num('extraSnapMaxReward');

  if (dailyFreeScans !== EconomyConfig.DAILY_SCAN_CAP) {
    errors.push(`dailyFreeScans is locked at ${EconomyConfig.DAILY_SCAN_CAP} free scans per day`);
  }
  if (firstScanRate === null || firstScanRate <= 0 || firstScanRate > 2) errors.push('firstScanRate must be in (0, 2]');
  if (subsequentScanRate === null || subsequentScanRate < 0 || subsequentScanRate > (firstScanRate ?? 2)) {
    errors.push('subsequentScanRate must be between 0 and firstScanRate');
  }
  if (pointsPerScorePoint === null || pointsPerScorePoint <= 0 || pointsPerScorePoint > 3) {
    errors.push('pointsPerScorePoint must be in (0, 3]');
  }
  if (extraSnapMaxReward === null || !Number.isInteger(extraSnapMaxReward) || extraSnapMaxReward < 0) {
    errors.push('extraSnapMaxReward must be a non-negative integer');
  }
  if (extraSnapCostPts === null || !Number.isInteger(extraSnapCostPts) || extraSnapCostPts <= 0) {
    errors.push('extraSnapCostPts must be a positive integer');
  }
  if (
    extraSnapCostPts !== null &&
    extraSnapMaxReward !== null &&
    extraSnapCostPts <= extraSnapMaxReward
  ) {
    errors.push('extraSnapCostPts must be strictly greater than extraSnapMaxReward (prevents point farming)');
  }

  if (errors.length) return { valid: false, errors };

  return {
    valid: true,
    errors: [],
    policy: {
      version: typeof o.version === 'string' && o.version ? o.version : 'reward-policy-custom',
      dailyFreeScans: dailyFreeScans!,
      firstScanRate: firstScanRate!,
      subsequentScanRate: subsequentScanRate!,
      pointsPerScorePoint: pointsPerScorePoint!,
      extraSnapCostPts: extraSnapCostPts!,
      extraSnapMaxReward: extraSnapMaxReward!,
    },
  };
}

export interface ScanRewardResult {
  rewardSlot: 1 | 2 | 3;
  isExtraSnap: boolean;
  streakMultiplier: number;
  uncappedPoints: number;
  points: number;
  policyVersion: string;
}

/** Server-side reward calculation. The client never supplies or alters reward amounts. */
export function calculateScanReward(
  policy: RewardPolicy,
  input: { score: number; scanIndexOfDay: number; streakDays: number }
): ScanRewardResult {
  const isExtraSnap = input.scanIndexOfDay > policy.dailyFreeScans;
  const rewardSlot = Math.min(3, Math.max(1, input.scanIndexOfDay)) as 1 | 2 | 3;
  const rate = rewardSlot === 1 ? policy.firstScanRate : policy.subsequentScanRate;
  const streakMultiplier = getStreakMultiplier(input.streakDays);
  const uncappedPoints = Math.round(input.score * policy.pointsPerScorePoint * rate * streakMultiplier);
  const points = isExtraSnap ? Math.min(uncappedPoints, policy.extraSnapMaxReward) : uncappedPoints;
  return { rewardSlot, isExtraSnap, streakMultiplier, uncappedPoints, points, policyVersion: policy.version };
}

/** Expected points for a mid-range score, used to show that an Extra Snap never pays for itself. */
export function maxExtraSnapNetPoints(policy: RewardPolicy): number {
  return policy.extraSnapMaxReward - policy.extraSnapCostPts;
}
