import { apiRequest } from './apiClient';
import { FriendItem } from '@/app/api/friends/route';

export interface IncomingFriendRequest {
  id: string;
  userId: string;
  name: string;
  handle: string;
  avatar: string;
  tier: string;
  score: number;
  createdAt: string;
}

export const friendService = {
  async getFriends(
    query?: string,
    suggested?: boolean
  ): Promise<{ success: boolean; friends: FriendItem[]; incomingRequests?: IncomingFriendRequest[]; total: number }> {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (suggested) params.set('suggested', 'true');
    const qs = params.toString();
    const url = qs ? `/api/friends?${qs}` : '/api/friends';
    return apiRequest(url);
  },

  async addFriend(targetHandle: string): Promise<{ success: boolean; message: string }> {
    return apiRequest('/api/friends', {
      method: 'POST',
      body: JSON.stringify({ targetHandle }),
    });
  },

  async getFriendProfile(id: string): Promise<{ success: boolean; friend: any }> {
    return apiRequest(`/api/friends/${id}`);
  },

  async addFriendById(id: string): Promise<{ success: boolean; isFriend: boolean; message: string }> {
    return apiRequest(`/api/friends/${id}`, {
      method: 'POST',
    });
  },

  async removeFriendById(id: string): Promise<{ success: boolean; isFriend: boolean; message: string }> {
    return apiRequest(`/api/friends/${id}`, {
      method: 'DELETE',
    });
  },

  async respondToRequest(id: string, action: 'accept' | 'decline'): Promise<{ success: boolean; status: string }> {
    return apiRequest(`/api/friends/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action }),
    });
  },
};
