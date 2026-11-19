import { apiRequest } from './apiClient';

export interface ShopItemData {
  id: string;
  sku?: string | null;
  slug?: string;
  name: string;
  kind: 'SKIN' | 'TITLE' | 'FRAME' | 'BADGE' | 'CONSUMABLE' | 'FEATURE';
  category?: string;
  categoryLabel: string;
  rarity?: string;
  slot?: string | null;
  effectKind?: string | null;
  effectConfig?: Record<string, unknown> | null;
  assetRef?: string | null;
  isGiftable?: boolean;
  isWishlisted?: boolean;
  ownedQuantity?: number;
  maxOwned?: number;
  currentVersionId?: string | null;
  price: number;
  minTier: 'CLASSIC' | 'GOLD' | 'PLATINUM' | 'BLACK';
  description: string;
  gradient: string;
  isOwned?: boolean;
  isEquipped?: boolean;
  isLocked?: boolean;
  canAfford?: boolean;
}

export interface ShopCatalogResponse {
  success: boolean;
  spendableBalance: number;
  tier: string;
  items: ShopItemData[];
  equipped: {
    skin: string | null;
    title: string | null;
    frame: string | null;
  };
}

export const shopService = {
  async getCatalog(): Promise<ShopCatalogResponse> {
    return apiRequest<ShopCatalogResponse>('/api/shop');
  },

  async purchaseItem(itemId: string): Promise<{ success: boolean; newSpendableBalance: number }> {
    return apiRequest('/api/shop/purchase', {
      method: 'POST',
      body: JSON.stringify({ itemId }),
    });
  },

  async equipItem(itemId: string, kind?: string): Promise<{ success: boolean; message: string }> {
    return apiRequest('/api/shop/equip', {
      method: 'POST',
      body: JSON.stringify({ itemId, kind }),
    });
  },
};
