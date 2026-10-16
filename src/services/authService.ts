import { apiRequest } from './apiClient';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  handle: string;
  dob?: string;
  dobFormatted?: string;
  location?: string;
  bio?: string;
  tier: string;
  lifetimePoints: number;
  spendableBalance: number;
  streakDays: number;
  streakMultiplier: number;
  streakFreezesHeld: number;
  memberSince?: string;
  biometricVerified?: boolean;
  avatarUrl?: string | null;
}

export interface SendOtpResponse {
  success: boolean;
  message: string;
  email: string;
  expiresInMinutes: number;
  resendCooldownSeconds: number;
}

export interface VerifyOtpResponse {
  success: boolean;
  isNewUser?: boolean;
  user: UserProfile;
}

export const authService = {
  async sendOtp(email: string): Promise<SendOtpResponse> {
    return apiRequest<SendOtpResponse>('/api/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async verifyOtp(email: string, code: string): Promise<VerifyOtpResponse> {
    const res = await apiRequest<VerifyOtpResponse>('/api/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
    if (res.user?.id && typeof window !== 'undefined') {
      localStorage.setItem('facecard_user', JSON.stringify(res.user));
    }
    return res;
  },

  async getMe(): Promise<UserProfile> {
    return apiRequest<UserProfile>('/api/me');
  },

  async updateProfile(updates: Partial<UserProfile>): Promise<{ success: boolean; message: string }> {
    return apiRequest('/api/me', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async claimFacecard(data: { displayName: string; handle: string; pin: string }): Promise<{ success: boolean; user: UserProfile }> {
    const res = await apiRequest<{ success: boolean; user: UserProfile }>('/api/card/claim', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.user?.id && typeof window !== 'undefined') {
      localStorage.setItem('facecard_user', JSON.stringify(res.user));
    }
    return res;
  },


  async loginWithPin(identifier: string, pin: string): Promise<{ success: boolean; user: UserProfile }> {
    const res = await apiRequest<{ success: boolean; user: UserProfile }>('/api/auth/pin-login', {
      method: 'POST',
      body: JSON.stringify({ identifier, pin }),
    });
    if (res.user?.id && typeof window !== 'undefined') {
      localStorage.setItem('facecard_user', JSON.stringify(res.user));
    }
    return res;
  },

  async recordConsent(data: {
    ageConfirmed: boolean;
    consentVersion?: string;
    biometricConsent?: boolean;
  }): Promise<{ success: boolean }> {
    return apiRequest('/api/consent', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteAccount(): Promise<{ success: boolean; message: string }> {
    const res = await apiRequest<{ success: boolean; message: string }>('/api/me', {
      method: 'DELETE',
    });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('facecard_user');
    }
    return res;
  },
};

