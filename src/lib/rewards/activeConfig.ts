import { db } from '@/lib/db';
import { DEFAULT_REWARD_POLICY, RewardPolicy, validateRewardPolicy } from '@/lib/rewards/rewardPolicy';
import {
  DEFAULT_LETHALITY_WEIGHTS,
  LethalityWeights,
  validateLethalityWeights,
} from '@/lib/rating/lethalityEngine';

type ConfigRow = { version: number; config: unknown } | null;

async function latestPublished(kind: 'REWARD_POLICY' | 'SCORING_WEIGHTS'): Promise<ConfigRow> {
  try {
    const row = await db.scoringConfigVersion.findFirst({
      where: { kind, status: 'PUBLISHED' },
      orderBy: { version: 'desc' },
      select: { version: true, config: true },
    });
    return row as ConfigRow;
  } catch {
    return null;
  }
}

/** Published reward policy if valid, otherwise the built-in default (fails safe, never throws). */
export async function getActiveRewardPolicy(): Promise<RewardPolicy> {
  const row = await latestPublished('REWARD_POLICY');
  if (row && row.config && typeof row.config === 'object') {
    const res = validateRewardPolicy({ ...(row.config as object), version: `reward-policy-v${row.version}` });
    if (res.valid && res.policy) return res.policy;
  }
  return DEFAULT_REWARD_POLICY;
}

export async function getActiveLethalityWeights(): Promise<{ weights: LethalityWeights; version: string }> {
  const row = await latestPublished('SCORING_WEIGHTS');
  if (row && row.config && typeof row.config === 'object') {
    const res = validateLethalityWeights(row.config);
    if (res.valid && res.weights) return { weights: res.weights, version: `weights-v${row.version}` };
  }
  return { weights: DEFAULT_LETHALITY_WEIGHTS, version: 'weights-default' };
}
