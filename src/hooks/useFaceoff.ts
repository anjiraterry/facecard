'use client';

import { useState, useEffect, useCallback } from 'react';
import { faceoffService, DuelItem, CreateDuelParams } from '@/services/faceoffService';

export function useFaceoff() {
  const [faceoffs, setFaceoffs] = useState<DuelItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFaceoffs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await faceoffService.getFaceoffs();
      if (res.success) {
        setFaceoffs(res.faceoffs);
      }
    } catch (err: unknown) {
      console.warn('Failed to fetch faceoffs:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFaceoffs();
  }, [fetchFaceoffs]);

  const createChallenge = async (params: CreateDuelParams) => {
    return faceoffService.createFaceoff(params);
  };

  const joinDuel = async (duelId: string) => {
    return faceoffService.joinFaceoff(duelId);
  };

  return {
    faceoffs,
    isLoading,
    error,
    createChallenge,
    joinDuel,
    refreshFaceoffs: fetchFaceoffs,
  };
}
