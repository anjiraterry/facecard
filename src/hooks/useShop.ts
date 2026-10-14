'use client';

import { useState, useEffect, useCallback } from 'react';
import { shopService, ShopItemData } from '@/services/shopService';

export function useShop() {
  const [items, setItems] = useState<ShopItemData[]>([]);
  const [spendableBalance, setSpendableBalance] = useState(850);
  const [tier, setTier] = useState('GOLD');
  const [equipped, setEquipped] = useState<{ skin: string | null; title: string | null; frame: string | null }>({
    skin: null,
    title: 'title-lethal-weapon',
    frame: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCatalog = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await shopService.getCatalog();
      if (res.success) {
        setItems(res.items);
        setSpendableBalance(res.spendableBalance);
        setTier(res.tier);
        setEquipped(res.equipped);
      }
    } catch (err: unknown) {
      console.warn('Failed to fetch shop catalog:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const purchaseItem = async (itemId: string) => {
    const res = await shopService.purchaseItem(itemId);
    if (res.success) {
      setSpendableBalance(res.newSpendableBalance);
      // Mark as owned in local state
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? { ...item, isOwned: true, canAfford: res.newSpendableBalance >= item.price }
            : { ...item, canAfford: res.newSpendableBalance >= item.price }
        )
      );
    }
    return res;
  };

  const equipItem = async (itemId: string, kind?: string) => {
    const res = await shopService.equipItem(itemId, kind);
    if (res.success) {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === itemId) return { ...item, isEquipped: true };
          if (kind && item.kind === kind) return { ...item, isEquipped: false };
          return item;
        })
      );
    }
    return res;
  };

  return {
    items,
    spendableBalance,
    tier,
    equipped,
    isLoading,
    error,
    purchaseItem,
    equipItem,
    refreshShop: fetchCatalog,
  };
}
