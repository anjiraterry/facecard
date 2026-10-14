'use client';

import { useState, useEffect, useCallback } from 'react';
import { friendService } from '@/services/friendService';
import { FriendItem } from '@/app/api/friends/route';

export function useFriends(searchQuery?: string, suggested?: boolean) {
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFriends = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await friendService.getFriends(searchQuery, suggested);
      if (res.success) {
        setFriends(res.friends);
      }
    } catch (err: unknown) {
      console.warn('Failed to fetch friends:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, suggested]);

  useEffect(() => {
    let ignore = false;
    friendService.getFriends(searchQuery, suggested)
      .then((res) => {
        if (!ignore && res.success) {
          setFriends(res.friends);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          console.warn('Failed to fetch friends:', err);
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [searchQuery, suggested]);

  const addFriend = async (handle: string) => {
    const res = await friendService.addFriend(handle);
    fetchFriends();
    return res;
  };

  return {
    friends,
    isLoading,
    error,
    addFriend,
    refreshFriends: fetchFriends,
  };
}
