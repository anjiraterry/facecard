import { apiRequest } from './apiClient';
import { CategoryBreakdown, Tier, ToneMode } from '@/types';
import type { SkinAppearanceObservation } from '@/lib/vision/skinAppearanceEngine';
import type { HarmonyV21Evaluation } from '@/lib/rating/lethalityEngine';

export interface ScanResultResponse {
  success: boolean;
  scanId?: string;
  score: number;
  band: 'HARMLESS' | 'SUSPICIOUS' | 'DANGEROUS' | 'LETHAL';
  verdictLine: string;
  categoryBreakdown: CategoryBreakdown;
  tips: string[];
  pointsEarned: number;
  multiplier: number;
  newStreak: number;
  freezeConsumed?: boolean;
  freezesRemaining?: number;
  tier: Tier;
  unlockedNewTier: boolean;
  qualityGate: {
    passed: boolean;
    sharpness: number;
    exposure: number;
    framingCoverage: number;
  };
  liveness?: {
    verified: boolean;
    actions: string[];
  };
  duel?: {
    duelId: string;
    attemptNumber: number;
    attemptsRemaining: number;
    status: string;
    outcome?: 'WIN' | 'LOSS' | 'TIE' | 'PENDING';
    payout?: number;
    winnerId?: string | null;
    isWinner?: boolean;
    challengerScore?: number;
    opponentScore?: number;
  };
  evaluatedAt: string;
  scoringVersion?: string;
  harmonyV21?: HarmonyV21Evaluation;
  skinAppearance?: SkinAppearanceObservation;
  lifetimePoints?: number;
  spendableBalance?: number;
  improvementPlan?: Array<{
    id: string;
    category: string;
    title: string;
    explanation: string;
    actionableSteps: string[];
    evidenceLevel: string;
    limitations: string[];
  }>;
}

export interface LivenessPayload {
  passed: boolean;
  actionsCompleted: string[];
  clientEngine?: string;
}

export interface SavedScanItem {
  id: string;
  scanId?: string | null;
  score: number;
  band: 'HARMLESS' | 'SUSPICIOUS' | 'DANGEROUS' | 'LETHAL';
  tier: Tier;
  verdictLine?: string | null;
  categoryScores?: Record<string, number> | null;
  imageDataUrl?: string | null;
  caption?: string | null;
  isFavorite: boolean;
  createdAt: string;
}

export const scanService = {
  async submitScan(
    imageBase64: string,
    toneMode: ToneMode = 'HYPE',
    liveness?: LivenessPayload,
    faceOffId?: string,
    featureVector?: unknown,
    extraSnap?: boolean
  ): Promise<ScanResultResponse> {
    return apiRequest<ScanResultResponse>('/api/scan', {
      method: 'POST',
      body: JSON.stringify({
        imageBase64,
        toneMode,
        liveness,
        faceOffId,
        featureVector,
        extraSnap,
      }),
    });
  },

  async getRecentScans(): Promise<{ success: boolean; scans: ScanResultResponse[]; total: number }> {
    return apiRequest('/api/scans');
  },

  async getScanById(id: string): Promise<{ success: boolean; scan: ScanResultResponse | null }> {
    return apiRequest(`/api/scans/${id}`);
  },

  async getSavedScans(): Promise<{ success: boolean; items: SavedScanItem[] }> {
    return apiRequest('/api/scans/saved');
  },

  async saveScanToGallery(payload: {
    scanId?: string | null;
    score: number;
    band: 'HARMLESS' | 'SUSPICIOUS' | 'DANGEROUS' | 'LETHAL';
    tier: Tier;
    verdictLine?: string | null;
    categoryScores?: Record<string, number> | null;
    imageDataUrl: string;
    caption?: string | null;
  }): Promise<{ success: boolean; alreadySaved?: boolean; item: SavedScanItem }> {
    return apiRequest('/api/scans/saved', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateSavedScan(
    id: string,
    payload: { isFavorite?: boolean; caption?: string | null }
  ): Promise<{ success: boolean; item: SavedScanItem }> {
    return apiRequest(`/api/scans/saved/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async deleteSavedScan(id: string): Promise<{ success: boolean }> {
    return apiRequest(`/api/scans/saved/${id}`, {
      method: 'DELETE',
    });
  },
};
