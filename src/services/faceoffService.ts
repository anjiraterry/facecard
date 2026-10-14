import { apiRequest } from './apiClient';

export interface DuelItem {
  id: string;
  opponentName: string;
  handle: string;
  image: string;
  tier: string;
  score: number;
  stake: string;
  stakeAmount: number;
  mode: 'STAKED' | 'FRIENDLY';
  status: 'WAITING' | 'ACTIVE' | 'COMPLETED';
}

export interface CreateDuelParams {
  mode: 'STAKED' | 'FRIENDLY';
  stakeAmount: number;
  opponentHandle?: string;
}

export interface CreateDuelResponse {
  success: boolean;
  duelId: string;
  inviteCode: string;
  inviteUrl: string;
  mode: string;
  stakeAmount: number;
  totalStaked: number;
  status: string;
  expiresInMinutes: number;
}

export const faceoffService = {
  async getFaceoffs(): Promise<{ success: boolean; faceoffs: DuelItem[]; total: number }> {
    return apiRequest('/api/faceoffs');
  },

  async createFaceoff(params: CreateDuelParams): Promise<CreateDuelResponse> {
    return apiRequest<CreateDuelResponse>('/api/faceoffs', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async getInvite(code: string): Promise<any> {
    return apiRequest(`/api/faceoffs/invite/${code}`);
  },

  async joinFaceoff(id: string): Promise<{ success: boolean; message: string }> {
    return apiRequest(`/api/faceoffs/${id}/join`, {
      method: 'POST',
    });
  },

  async getDuelById(id: string): Promise<{ success: boolean; duel: any }> {
    return apiRequest(`/api/faceoffs/${id}`);
  },

  async cancelDuel(id: string): Promise<{ success: boolean; message: string }> {
    return apiRequest(`/api/faceoffs/${id}`, {
      method: 'DELETE',
    });
  },
};
