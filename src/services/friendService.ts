import { apiRequest } from './apiClient';
import { FriendItem } from '@/app/api/friends/route';

export const friendService = {
  async getFriends(query?: string): Promise<{ success: boolean; friends: FriendItem[]; total: number }> {
    const url = query ? `/api/friends?q=${encodeURIComponent(query)}` : '/api/friends';
    return apiRequest(url);
  },

  async addFriend(targetHandle: string): Promise<{ success: boolean; message: string }> {
    return apiRequest('/api/friends', {
      method: 'POST',
      body: JSON.stringify({ targetHandle }),
    });
  },

  async getFriendProfile(id: string): Promise<{ success: boolean; friend: FriendItem | null }> {
    return apiRequest(`/api/friends/${id}`);
  },
};
