import { apiRequest } from './apiClient';

export interface DuelItem {
  id: string;
  opponentName: string;
  handle: string;
  image: string;
  iconAvatar?: string;
  tier: string;
  rawTier?: string;
  score: number;
  stake: string;
  stakeAmount: number;
  mode: 'STAKED' | 'FRIENDLY';
  status: 'WAITING' | 'ACTIVE' | 'READY_TO_SETTLE' | 'SETTLING' | 'TIE_REMATCH' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';
  currentRound?: number;
  maxAttemptsPerRound?: number;
  rematchCount?: number;
  winnerId?: string | null;
  outcomeReason?: string | null;
  challengerLockedIn?: boolean;
  opponentLockedIn?: boolean;
  myLockedIn?: boolean;
  expiresAt?: string | Date;
  isMine?: boolean;
  canJoin?: boolean;
  sameTier?: boolean;
  requiredTier?: string;
  opponentId?: string;
  challengerId?: string;
  targetUserId?: string;
  inviteCode?: string;
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

export interface DuelParticipantDetail {
  id: string;
  displayName: string;
  handle: string;
  score: number | null;
  scoreHidden?: boolean;
  tier: string;
  avatar: string;
  attemptsUsed: number;
  attemptsRemaining: number;
  lockedIn: boolean;
  lockedAt: string | null;
  participantStatus: string;
}

export interface DuelDetail {
  id: string;
  inviteCode: string;
  mode: 'STAKED' | 'FRIENDLY';
  stakeAmount: number;
  totalPot: number;
  feeAmount: number;
  payout: number;
  winBonus: number;
  status: string;
  outcomeReason?: string | null;
  currentRound: number;
  rematchCount: number;
  maxAttemptsPerRound: number;
  scoringVersion: string;
  weightsVersion: string;
  winnerId: string | null;
  scoresRevealed: boolean;
  isParticipant: boolean;
  myRole: 'CHALLENGER' | 'OPPONENT' | null;
  expiresAt: string;
  resolvedAt: string | null;
  challenger: DuelParticipantDetail;
  opponent: DuelParticipantDetail | null;
  rounds: Array<{
    roundNumber: number;
    maxAttempts: number;
    challengerScore: number | null;
    opponentScore: number | null;
    winnerId: string | null;
    isTie: boolean;
    endedAt: string | null;
  }>;
  events: Array<{
    id: string;
    roundNumber: number;
    eventType: string;
    createdAt: string;
  }>;
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

  async getInvite(code: string): Promise<{ success: boolean; invite?: Record<string, unknown>; error?: string }> {
    return apiRequest(`/api/faceoffs/invite/${code}`);
  },

  async joinFaceoff(id: string): Promise<{ success: boolean; message: string }> {
    return apiRequest(`/api/faceoffs/${id}/join`, {
      method: 'POST',
    });
  },

  async getDuelById(id: string): Promise<{ success: boolean; duel: DuelDetail | null }> {
    return apiRequest(`/api/faceoffs/${id}`);
  },

  async lockInScore(id: string): Promise<{
    success: boolean;
    duelId: string;
    finalScore: number;
    roundNumber: number;
    bothLockedIn: boolean;
    status: string;
    settlement?: {
      status: string;
      winnerId?: string | null;
      payout?: number;
      winBonus?: number;
      challengerScore?: number;
      opponentScore?: number;
    } | null;
  }> {
    return apiRequest(`/api/faceoffs/${id}/lock-in`, {
      method: 'POST',
    });
  },

  async cancelDuel(id: string): Promise<{ success: boolean; message: string }> {
    return apiRequest(`/api/faceoffs/${id}`, {
      method: 'DELETE',
    });
  },
};
