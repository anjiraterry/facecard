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
  tier: Tier;
  unlockedNewTier: boolean;
  qualityGate: {
    passed: boolean;
    sharpness: number;
    exposure: number;
    framingCoverage: number;
  };
  evaluatedAt: string;
}

export const scanService = {
  async submitScan(
    imageBase64: string,
    toneMode: ToneMode = 'HYPE'
  ): Promise<ScanResultResponse> {
    return apiRequest<ScanResultResponse>('/api/scan', {
      method: 'POST',
      body: JSON.stringify({
        imageBase64,
        toneMode,
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
