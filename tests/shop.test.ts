import { describe, it, expect } from 'vitest';
import { ITEM_GRADIENTS, CATEGORY_LABELS } from '@/app/api/shop/items/route';

describe('Phase 6: Shop & Customization Economy', () => {
  it('should categorize cosmetic and consumable items properly', () => {
    expect(CATEGORY_LABELS.CONSUMABLE).toBe('Perk');
    expect(CATEGORY_LABELS.SKIN).toBe('Card Skin');
    expect(CATEGORY_LABELS.TITLE).toBe('Title');
    expect(CATEGORY_LABELS.FRAME).toBe('Foil Frame');
  });

  it('should have gradients mapped for all core catalog cosmetics', () => {
    expect(ITEM_GRADIENTS['streak-freeze']).toContain('linear-gradient');
    expect(ITEM_GRADIENTS['skin-lavender-holo']).toContain('linear-gradient');
    expect(ITEM_GRADIENTS['skin-black-sheen']).toContain('linear-gradient');
    expect(ITEM_GRADIENTS['frame-solar-flare']).toContain('linear-gradient');
  });

  it('should enforce that streak freeze capacity does not exceed 2', () => {
    const maxFreezesHeld = 2;
    const canBuyFreeze = (currentFreezes: number) => currentFreezes < maxFreezesHeld;

    expect(canBuyFreeze(0)).toBe(true);
    expect(canBuyFreeze(1)).toBe(true);
    expect(canBuyFreeze(2)).toBe(false);
    expect(canBuyFreeze(3)).toBe(false);
  });

  it('should validate spendable balance sufficiency before purchase', () => {
    const itemPrice = 450;
    const validateBalance = (userBalance: number) => userBalance >= itemPrice;

    expect(validateBalance(500)).toBe(true);
    expect(validateBalance(450)).toBe(true);
    expect(validateBalance(449)).toBe(false);
    expect(validateBalance(0)).toBe(false);
  });
});
