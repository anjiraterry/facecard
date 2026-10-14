import { apiRequest } from './apiClient';
import { FaceCardData, Tier } from '@/types';
import { FundingLedgerItem, SpendLedgerItem } from '@/app/api/points/route';

export interface CardTierItem {
  id: string;
  tier: Tier;
  name: string;
  status: 'SURPASSED' | 'ACTIVE' | 'IN_PROGRESS' | 'LOCKED';
  statusBadge: string;
  badgeStyle: string;
  card: FaceCardData;
  prerequisites: {
    pointsTarget: number;
    pointsCurrent: number;
    scoreTarget: number;
    streakTarget: number;
    summary: string;
  };
}

export interface FormulaItem {
  name: string;
  weight: string;
  score: number;
  tip: string;
}

export interface CardDetailsResponse {
  success: boolean;
  activeCard: FaceCardData;
  tiers: CardTierItem[];
  formula?: FormulaItem[];
  spendableBalance: number;
  lifetimePoints: number;
  nextTierPoints: number;
  progressPercent: number;
  equippedSkinId: string | null;
  equippedTitleId: string | null;
  equippedFrameId: string | null;
}

export interface PointsLedgerResponse {
  success: boolean;
  spendableBalance: number;
  lifetimePoints: number;
  scansLeftToday: number;
  maxScansPerDay: number;
  resetTimeWat: string;
  streakMultiplier: number;
  fundingHistory: FundingLedgerItem[];
  spendsHistory: SpendLedgerItem[];
}

export const cardService = {
  async getCardDetails(): Promise<CardDetailsResponse> {
    return apiRequest<CardDetailsResponse>('/api/card');
  },

  async getPointsLedger(kind?: 'all' | 'funding' | 'spends'): Promise<PointsLedgerResponse> {
    const url = kind ? `/api/points?kind=${kind}` : '/api/points';
    return apiRequest<PointsLedgerResponse>(url);
  },
};
