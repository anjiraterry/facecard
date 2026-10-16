import { apiRequest } from './apiClient';
import { CategoryBreakdown, Tier, ToneMode } from '@/types';

export interface ScanResultResponse {
  success: boolean;
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
}

export interface LivenessPayload {
  passed: boolean;
  actionsCompleted: string[];
  clientEngine?: string;
}

export const scanService = {
  async submitScan(
    imageBase64: string,
    toneMode: ToneMode = 'HYPE',
    liveness?: LivenessPayload,
    faceOffId?: string
  ): Promise<ScanResultResponse> {
    return apiRequest<ScanResultResponse>('/api/scan', {
      method: 'POST',
      body: JSON.stringify({
        imageBase64,
        toneMode,
        liveness,
        faceOffId,
      }),
    });
  },

  async getRecentScans(): Promise<{ success: boolean; scans: ScanResultResponse[]; total: number }> {
    return apiRequest('/api/scans');
  },

  async getScanById(id: string): Promise<{ success: boolean; scan: ScanResultResponse | null }> {
    return apiRequest(`/api/scans/${id}`);
  },
};
