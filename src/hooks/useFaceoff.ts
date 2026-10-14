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
    let ignore = false;
    faceoffService.getFaceoffs()
      .then((res) => {
        if (!ignore && res.success) {
          setFaceoffs(res.faceoffs);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          console.warn('Failed to fetch faceoffs:', err);
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

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
