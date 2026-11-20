import { describe, it, expect } from 'vitest';
import {
  deriveItemLifecycleDetails,
  resolveCustomerPrimaryAction,
} from '@/lib/boutique/itemDetails';
import { diffLagosDayKeys } from '@/lib/boutique/effects';
import { LAUNCH_BOUTIQUE_CATALOGUE } from '@/lib/boutique/catalogue';
import {
  calculateRedemptionQuote,
  DEFAULT_TIER_RULES,
  getLagosPeriodKey,
  type RedemptionPolicySnapshot,
} from '@/lib/atelier/redemption';
import {
  INITIAL_CARD_THEMES,
  isTierEligibleForTheme,
  validateThemeContrast,
} from '@/lib/card/themes';
import { resolveCardMaterial } from '@/components/card/materials';

const TEST_POLICY: RedemptionPolicySnapshot = {
  id: 'policy-1',
  version: 1,
  minimumTier: 'GOLD',
  pointsPerUnit: 100,
  valuePerUnitMinor: BigInt(5000), // ₦50 per 100 PTS
  minimumSubtotalMinor: BigInt(1000000), // ₦10,000
  marginFloorBps: 1500, // 15%
  processingFeeBps: 150, // 1.5%
  processingFeeFlatMinor: BigInt(10000), // ₦100
  allowPromoStacking: false,
  programmeBudgetMinor: null,
  programmeSpentMinor: BigInt(0),
  emergencyPaused: false,
  tierRules: DEFAULT_TIER_RULES,
};

describe('Workstream 1: Boutique Item Details & Effect Integrity', () => {
  it('derives valid lifecycle metadata for all 24 launch catalogue items', () => {
    for (const entry of LAUNCH_BOUTIQUE_CATALOGUE) {
      const details = deriveItemLifecycleDetails({
        id: entry.sku,
        sku: entry.sku,
        slug: entry.slug,
        name: entry.name,
        description: entry.description,
        kind: entry.kind,
        category: entry.category,
        rarity: entry.rarity,
        price: entry.price,
        minTier: entry.minTier,
        maxOwned: entry.maxOwned,
        isGiftable: entry.isGiftable,
        active: entry.status === 'PUBLISHED',
        status: entry.status,
        slot: entry.slot ?? null,
        effectKind: entry.effectKind,
        effectConfig: entry.effectConfig,
      });
      expect(details.isSupported).toBe(true);
      expect(details.usageInstructions.length).toBeGreaterThan(0);
      expect(details.supportedModules.length).toBeGreaterThan(0);
    }
  });

  it('marks legacy unsupported items like boost-aura-2x without valid config as NOT_PURCHASABLE', () => {
    const legacyItem = {
      id: 'legacy-boost',
      sku: 'FC-LEGACY',
      slug: 'boost-aura-2x',
      name: 'Aura Charge 2x (Legacy)',
      description: 'Legacy boost',
      kind: 'CONSUMABLE' as const,
      category: 'PERKS',
      rarity: 'ESSENTIAL' as const,
      price: 200,
      minTier: 'CLASSIC' as const,
      maxOwned: 1,
      isGiftable: false,
      active: true,
      status: 'PUBLISHED',
      effectKind: null,
      effectConfig: null,
    };
    const details = deriveItemLifecycleDetails(legacyItem);
    expect(details.isSupported).toBe(false);

    const action = resolveCustomerPrimaryAction({
      item: legacyItem,
      isSupported: details.isSupported,
      userTierRank: 1,
      requiredTierRank: 1,
      spendableBalance: 1000,
      ownedQuantity: 0,
      isEquipped: false,
      hasActiveEffect: false,
    });
    expect(action.action).toBe('NOT_PURCHASABLE');
  });

  it('resolves state-aware customer actions across ownership and eligibility states', () => {
    const streakFreeze = LAUNCH_BOUTIQUE_CATALOGUE.find((i) => i.slug === 'streak-freeze')!;
    const item = { ...streakFreeze, id: 'sf-1', active: true, status: 'PUBLISHED' };

    expect(
      resolveCustomerPrimaryAction({
        item,
        isSupported: true,
        userTierRank: 1,
        requiredTierRank: 1,
        spendableBalance: 50,
        ownedQuantity: 0,
        isEquipped: false,
        hasActiveEffect: false,
      }).action
    ).toBe('EARN_POINTS');

    expect(
      resolveCustomerPrimaryAction({
        item,
        isSupported: true,
        userTierRank: 1,
        requiredTierRank: 1,
        spendableBalance: 500,
        ownedQuantity: 0,
        isEquipped: false,
        hasActiveEffect: false,
      }).action
    ).toBe('PURCHASE');

    expect(
      resolveCustomerPrimaryAction({
        item,
        isSupported: true,
        userTierRank: 1,
        requiredTierRank: 1,
        spendableBalance: 500,
        ownedQuantity: 2,
        isEquipped: false,
        hasActiveEffect: false,
      }).action
    ).toBe('VIEW_ACTIVE_EFFECT');
  });

  it('computes Africa/Lagos day differences accurately for Streak Freeze', () => {
    expect(diffLagosDayKeys('2026-11-20', '2026-11-19')).toBe(1);
    expect(diffLagosDayKeys('2026-11-20', '2026-11-18')).toBe(2); // 1 missed day
    expect(diffLagosDayKeys('2026-11-20', '2026-11-15')).toBe(5); // 4 missed days
  });
});

describe('Workstream 2: Atelier Points Redemption & Margin Protection', () => {
  it('blocks Classic tier members from redeeming points', () => {
    const quote = calculateRedemptionQuote({
      policy: TEST_POLICY,
      tier: 'CLASSIC',
      availableSpendablePoints: 10000,
      alreadyCommittedMinor: BigInt(0),
      alreadyReservedMinor: BigInt(0),
      alreadyCommittedCount: 0,
      alreadyReservedCount: 0,
      items: [{ variantId: 'v1', quantity: 1, unitPriceMinor: BigInt(2500000), costPriceMinor: BigInt(1500000) }],
      periodKey: getLagosPeriodKey(),
    });
    expect(quote.eligible).toBe(false);
    expect(quote.appliedDiscountMinor).toBe(BigInt(0));
  });

  it('caps Platinum discount at ₦2,000 per order and allocates across items', () => {
    const quote = calculateRedemptionQuote({
      policy: TEST_POLICY,
      tier: 'PLATINUM',
      availableSpendablePoints: 6000,
      alreadyCommittedMinor: BigInt(0),
      alreadyReservedMinor: BigInt(0),
      alreadyCommittedCount: 0,
      alreadyReservedCount: 0,
      items: [
        { variantId: 'v1', quantity: 1, unitPriceMinor: BigInt(1500000), costPriceMinor: BigInt(800000) },
        { variantId: 'v2', quantity: 1, unitPriceMinor: BigInt(1000000), costPriceMinor: BigInt(500000) },
      ],
      periodKey: '2026-11',
    });
    expect(quote.eligible).toBe(true);
    expect(quote.appliedDiscountMinor).toBe(BigInt(200000)); // ₦2,000
    expect(quote.appliedPoints).toBe(4000);
    const allocSum = quote.allocations.reduce((s, a) => s + a.allocatedDiscountMinor, BigInt(0));
    expect(allocSum).toBe(quote.appliedDiscountMinor);
  });

  it('enforces 15% contribution margin floor on low-margin baskets', () => {
    // ₦20,000 item costing ₦17,000 -> max headroom after 15% floor (₦3,000) & fees (~₦400) is 0
    const quote = calculateRedemptionQuote({
      policy: TEST_POLICY,
      tier: 'BLACK',
      availableSpendablePoints: 10000,
      alreadyCommittedMinor: BigInt(0),
      alreadyReservedMinor: BigInt(0),
      alreadyCommittedCount: 0,
      alreadyReservedCount: 0,
      items: [{ variantId: 'v1', quantity: 1, unitPriceMinor: BigInt(2000000), costPriceMinor: BigInt(1700000) }],
      periodKey: '2026-11',
    });
    expect(quote.eligible).toBe(false);
    expect(quote.appliedDiscountMinor).toBe(BigInt(0));
  });

  it('excludes products with missing costPriceMinor', () => {
    const quote = calculateRedemptionQuote({
      policy: TEST_POLICY,
      tier: 'GOLD',
      availableSpendablePoints: 5000,
      alreadyCommittedMinor: BigInt(0),
      alreadyReservedMinor: BigInt(0),
      alreadyCommittedCount: 0,
      alreadyReservedCount: 0,
      items: [{ variantId: 'v1', quantity: 1, unitPriceMinor: BigInt(2000000), costPriceMinor: null }],
      periodKey: '2026-11',
    });
    expect(quote.eligible).toBe(false);
    expect(quote.ineligibleSubtotalMinor).toBe(BigInt(2000000));
  });

  it('enforces monthly frequency limit (2 redemptions/month)', () => {
    const quote = calculateRedemptionQuote({
      policy: TEST_POLICY,
      tier: 'GOLD',
      availableSpendablePoints: 5000,
      alreadyCommittedMinor: BigInt(100000),
      alreadyReservedMinor: BigInt(0),
      alreadyCommittedCount: 2,
      alreadyReservedCount: 0,
      items: [{ variantId: 'v1', quantity: 1, unitPriceMinor: BigInt(2000000), costPriceMinor: BigInt(1000000) }],
      periodKey: '2026-11',
    });
    expect(quote.eligible).toBe(false);
  });
});

describe('Workstream 3: Tier-Based Card Themes', () => {
  it('defines 16 initial themes (4 per tier) with WCAG AA text contrast >= 4.5:1', () => {
    expect(INITIAL_CARD_THEMES.length).toBe(16);
    const ids = new Set(INITIAL_CARD_THEMES.map((t) => t.themeId));
    expect(ids.size).toBe(16);

    for (const t of INITIAL_CARD_THEMES) {
      const contrast = validateThemeContrast(t.textColor, t.paletteFrom, t.paletteTo);
      expect(contrast.valid, `Theme ${t.themeId} failed contrast (${contrast.minRatio})`).toBe(true);
    }
  });

  it('enforces tier eligibility hierarchy for equipping themes', () => {
    expect(isTierEligibleForTheme('CLASSIC', 'CLASSIC')).toBe(true);
    expect(isTierEligibleForTheme('CLASSIC', 'GOLD')).toBe(false);
    expect(isTierEligibleForTheme('GOLD', 'CLASSIC')).toBe(true);
    expect(isTierEligibleForTheme('GOLD', 'PLATINUM')).toBe(false);
    expect(isTierEligibleForTheme('BLACK', 'BLACK')).toBe(true);
  });

  it('resolves card material from theme config cleanly', () => {
    const onyx = INITIAL_CARD_THEMES.find((t) => t.themeId === 'onyx-reserve')!;
    const mat = resolveCardMaterial('BLACK', undefined, undefined, {
      themeId: onyx.themeId,
      name: onyx.name,
      material: onyx.finish.material,
      textColor: onyx.textColor,
      mutedTextColor: onyx.mutedTextColor,
      accentColor: onyx.accentColor,
      paletteFrom: onyx.paletteFrom,
      paletteTo: onyx.paletteTo,
      reflectionIntensity: onyx.finish.reflectionIntensity,
      engravingOpacity: onyx.finish.engravingOpacity,
    });
    expect(mat.finishName).toBe('Onyx Reserve');
    expect(mat.typography).toBe(onyx.textColor);
  });
});
