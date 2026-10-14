'use client';

import { useState, useEffect, useCallback } from 'react';
import { cardService, CardTierItem, FormulaItem } from '@/services/cardService';
import { FaceCardData } from '@/types';
import { FundingLedgerItem, SpendLedgerItem } from '@/app/api/points/route';

export function useCard() {
  const [activeCard, setActiveCard] = useState<FaceCardData | null>(null);
  const [tiers, setTiers] = useState<CardTierItem[]>([]);
  const [formula, setFormula] = useState<FormulaItem[]>([]);
  const [spendableBalance, setSpendableBalance] = useState(0);
  const [lifetimePoints, setLifetimePoints] = useState(0);
  const [nextTierPoints, setNextTierPoints] = useState(5000);
  const [progressPercent, setProgressPercent] = useState(0);
  const [fundingHistory, setFundingHistory] = useState<FundingLedgerItem[]>([]);
  const [spendsHistory, setSpendsHistory] = useState<SpendLedgerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [cardRes, pointsRes] = await Promise.all([
        cardService.getCardDetails(),
        cardService.getPointsLedger(),
      ]);

      if (cardRes.success) {
        setActiveCard(cardRes.activeCard);
        setTiers(cardRes.tiers);
        if (cardRes.formula) setFormula(cardRes.formula);
        setSpendableBalance(cardRes.spendableBalance);
        setLifetimePoints(cardRes.lifetimePoints);
        setNextTierPoints(cardRes.nextTierPoints);
        setProgressPercent(cardRes.progressPercent);
      }

      if (pointsRes.success) {
        setFundingHistory(pointsRes.fundingHistory);
        setSpendsHistory(pointsRes.spendsHistory);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unauthorized');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCardData();
  }, [fetchCardData]);

  return {
    activeCard,
    tiers,
    formula,
    spendableBalance,
    lifetimePoints,
    nextTierPoints,
    progressPercent,
    fundingHistory,
    spendsHistory,
    isLoading,
    error,
    refreshCard: fetchCardData,
  };
}
