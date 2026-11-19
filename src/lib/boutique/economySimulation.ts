import { EconomyConfig } from '@/lib/economy';

export type EconomyArchetype =
  | 'NEWCOMER'
  | 'CASUAL'
  | 'REGULAR'
  | 'ENTHUSIAST'
  | 'COLLECTOR'
  | 'SOCIALITE'
  | 'COMPETITOR'
  | 'HOARDER'
  | 'RETURNING'
  | 'ABUSIVE';

export interface ArchetypeSimResult {
  archetype: EconomyArchetype;
  endingBalance: number;
  totalEarned: number;
  totalSpent: number;
  purchasesCount: number;
  giftsSent: number;
  freezesUsed: number;
  daysToAffordRose40: number;
  daysToAffordVelvetRose650: number;
}

export interface EconomySimulationReport {
  daysSimulated: number;
  assumptions: {
    signupBonus: number;
    maxDailyRewardedScans: number;
    repeatScanWeight: number;
    note: string;
  };
  archetypes: ArchetypeSimResult[];
  totalIssued: number;
  totalRemoved: number;
  sourceToSinkRatio: number;
}

interface ArchetypeProfile {
  archetype: EconomyArchetype;
  activeDaysPerWeek: number;
  scansPerActiveDay: number;
  avgScore: number;
  socialSpendRate: number; // fraction of days sending a 40 PTS gift
  buysCosmetics: boolean;
  buysFreezes: boolean;
}

const PROFILES: ArchetypeProfile[] = [
  { archetype: 'NEWCOMER', activeDaysPerWeek: 2, scansPerActiveDay: 1, avgScore: 72, socialSpendRate: 0.05, buysCosmetics: true, buysFreezes: false },
  { archetype: 'CASUAL', activeDaysPerWeek: 3, scansPerActiveDay: 1, avgScore: 78, socialSpendRate: 0.1, buysCosmetics: true, buysFreezes: false },
  { archetype: 'REGULAR', activeDaysPerWeek: 5, scansPerActiveDay: 1, avgScore: 82, socialSpendRate: 0.15, buysCosmetics: true, buysFreezes: true },
  { archetype: 'ENTHUSIAST', activeDaysPerWeek: 7, scansPerActiveDay: 3, avgScore: 88, socialSpendRate: 0.25, buysCosmetics: true, buysFreezes: true },
  { archetype: 'COLLECTOR', activeDaysPerWeek: 5, scansPerActiveDay: 2, avgScore: 84, socialSpendRate: 0.05, buysCosmetics: true, buysFreezes: true },
  { archetype: 'SOCIALITE', activeDaysPerWeek: 5, scansPerActiveDay: 2, avgScore: 80, socialSpendRate: 0.55, buysCosmetics: true, buysFreezes: false },
  { archetype: 'COMPETITOR', activeDaysPerWeek: 6, scansPerActiveDay: 2, avgScore: 86, socialSpendRate: 0.1, buysCosmetics: true, buysFreezes: true },
  { archetype: 'HOARDER', activeDaysPerWeek: 5, scansPerActiveDay: 2, avgScore: 85, socialSpendRate: 0, buysCosmetics: false, buysFreezes: false },
  { archetype: 'RETURNING', activeDaysPerWeek: 2, scansPerActiveDay: 2, avgScore: 79, socialSpendRate: 0.1, buysCosmetics: true, buysFreezes: true },
  { archetype: 'ABUSIVE', activeDaysPerWeek: 7, scansPerActiveDay: 3, avgScore: 95, socialSpendRate: 0, buysCosmetics: false, buysFreezes: false },
];

/**
 * Deterministic 90-day economy simulation using authoritative EconomyConfig constants.
 * Distinguishes simulation outputs from real human engagement data.
 */
export function runEconomySimulation(days = 90): EconomySimulationReport {
  const signupBonus = EconomyConfig.SIGNUP_GRANT_POINTS ?? 100;
  const maxDailyScans = EconomyConfig.DAILY_SCAN_CAP ?? 3;
  const repeatWeight = EconomyConfig.SCAN_RATE_SUBSEQUENT ?? 0.5;

  const archetypes: ArchetypeSimResult[] = PROFILES.map((p) => {
    let balance = signupBonus;
    let totalEarned = signupBonus;
    let totalSpent = 0;
    let purchasesCount = 0;
    let giftsSent = 0;
    let freezesUsed = 0;
    let streak = 1;
    let freezesHeld = 0;

    for (let day = 1; day <= days; day++) {
      const dayOfWeek = ((day - 1) % 7) + 1;
      const isActive = dayOfWeek <= p.activeDaysPerWeek;

      if (isActive) {
        const scans = Math.min(maxDailyScans, p.scansPerActiveDay);
        const streakMult = streak >= 14 ? 1.5 : streak >= 7 ? 1.25 : streak >= 3 ? 1.1 : 1;
        const firstScan = Math.round(p.avgScore * streakMult);
        const extraScans = (scans - 1) * Math.round(p.avgScore * repeatWeight * streakMult);
        const dailyEarn = firstScan + extraScans;

        balance += dailyEarn;
        totalEarned += dailyEarn;
        streak += 1;

        if (p.buysFreezes && freezesHeld < 2 && balance >= 180 && day % 14 === 0) {
          balance -= 180;
          totalSpent += 180;
          freezesHeld += 1;
          purchasesCount += 1;
        }

        if (p.socialSpendRate > 0 && ((day * 7) % 100) / 100 < p.socialSpendRate && balance >= 40) {
          balance -= 40;
          totalSpent += 40;
          giftsSent += 1;
          purchasesCount += 1;
        }

        if (p.buysCosmetics && balance >= 650 && day % 21 === 0) {
          balance -= 650;
          totalSpent += 650;
          purchasesCount += 1;
        } else if (p.buysCosmetics && balance >= 350 && day % 15 === 0) {
          balance -= 350;
          totalSpent += 350;
          purchasesCount += 1;
        }
      } else if (freezesHeld > 0) {
        freezesHeld -= 1;
        freezesUsed += 1;
      } else {
        streak = 1;
      }
    }

    const avgDailyEarn = totalEarned / days;
    return {
      archetype: p.archetype,
      endingBalance: balance,
      totalEarned,
      totalSpent,
      purchasesCount,
      giftsSent,
      freezesUsed,
      daysToAffordRose40: Math.max(1, Math.ceil(40 / Math.max(1, avgDailyEarn))),
      daysToAffordVelvetRose650: Math.max(1, Math.ceil(650 / Math.max(1, avgDailyEarn))),
    };
  });

  const totalIssued = archetypes.reduce((acc, a) => acc + a.totalEarned, 0);
  const totalRemoved = archetypes.reduce((acc, a) => acc + a.totalSpent, 0);

  return {
    daysSimulated: days,
    assumptions: {
      signupBonus,
      maxDailyRewardedScans: maxDailyScans,
      repeatScanWeight: repeatWeight,
      note: 'Deterministic mathematical simulation only; not human demand evidence.',
    },
    archetypes,
    totalIssued,
    totalRemoved,
    sourceToSinkRatio: totalRemoved > 0 ? Number((totalIssued / totalRemoved).toFixed(2)) : totalIssued,
  };
}
