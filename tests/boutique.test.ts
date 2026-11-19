import { describe, it, expect } from 'vitest';
import {
  EFFECT_REGISTRY,
  validateEffectDefinition,
  createEffectLabState,
  stepEffectLab,
} from '@/lib/boutique/effectRegistry';
import { LAUNCH_BOUTIQUE_CATALOGUE, LAUNCH_COLLECTIONS } from '@/lib/boutique/catalogue';
import { runEconomySimulation } from '@/lib/boutique/economySimulation';
import { resolveCardMaterial } from '@/components/card/materials';
import {
  BOUTIQUE_CATEGORY_PALETTES,
  getContrastRatio,
  resolveItemAppearance,
  validateAppearanceConfig,
} from '@/lib/boutique/palette';

describe('Boutique Effect Registry & Validation', () => {
  it('registers all 9 spec-defined effect kinds', () => {
    expect(Object.keys(EFFECT_REGISTRY)).toEqual([
      'EQUIP_COSMETIC',
      'STREAK_PROTECTION',
      'REWARD_MULTIPLIER',
      'FEATURE_ENTITLEMENT',
      'EXPORT_ENTITLEMENT',
      'SOCIAL_GIFT',
      'CAPACITY_INCREASE',
      'PROFILE_SHOWCASE',
      'COLLECTION_COMPLETION',
    ]);
  });

  it('rejects EQUIP_COSMETIC with placeholder REQUIRED assetVersionId', () => {
    const res = validateEffectDefinition('EQUIP_COSMETIC', {
      slot: 'CARD_SKIN',
      assetVersionId: 'REQUIRED',
    });
    expect(res.valid).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
  });

  it('rejects REWARD_MULTIPLIER outside allowed bounds', () => {
    const res = validateEffectDefinition('REWARD_MULTIPLIER', {
      multiplierBps: 50000, // 5x — invalid
      durationSeconds: 86400,
      maximumUses: 3,
      maximumBonusPoints: 180,
    });
    expect(res.valid).toBe(false);
  });

  it('validates all 24 launch catalogue items against their registered handlers', () => {
    expect(LAUNCH_BOUTIQUE_CATALOGUE.length).toBe(24);
    const skus = new Set(LAUNCH_BOUTIQUE_CATALOGUE.map((i) => i.sku));
    const slugs = new Set(LAUNCH_BOUTIQUE_CATALOGUE.map((i) => i.slug));
    expect(skus.size).toBe(24);
    expect(slugs.size).toBe(24);

    for (const item of LAUNCH_BOUTIQUE_CATALOGUE) {
      const res = validateEffectDefinition(item.effectKind, item.effectConfig);
      expect(res.valid).toBe(true);
    }

    expect(LAUNCH_COLLECTIONS.length).toBe(3);
  });
});

describe('Control Centre Effect Lab Simulation', () => {
  it('exhausts Aura Charge after 3 uses or 24h', () => {
    let state = createEffectLabState('AURA_CHARGE');
    expect(state.status).toBe('AVAILABLE');

    // Event before activation does not consume
    state = stepEffectLab(state, 'SIMULATE_EVENT');
    expect(state.remainingUses).toBe(3);

    state = stepEffectLab(state, 'ACTIVATE');
    expect(state.status).toBe('ACTIVE');

    state = stepEffectLab(state, 'SIMULATE_EVENT');
    state = stepEffectLab(state, 'SIMULATE_EVENT');
    state = stepEffectLab(state, 'SIMULATE_EVENT');
    expect(state.remainingUses).toBe(0);
    expect(state.status).toBe('FINISHED');
    expect(state.finishReason).toBe('USAGE_EXHAUSTED');
  });

  it('expires Studio Pass after 24 elapsed hours', () => {
    let state = createEffectLabState('STUDIO_PASS');
    state = stepEffectLab(state, 'ACTIVATE');
    state = stepEffectLab(state, 'ADVANCE_6H');
    state = stepEffectLab(state, 'ADVANCE_6H');
    state = stepEffectLab(state, 'ADVANCE_6H');
    expect(state.status).toBe('ACTIVE');
    state = stepEffectLab(state, 'ADVANCE_6H');
    expect(state.status).toBe('FINISHED');
    expect(state.finishReason).toBe('DURATION_EXHAUSTED');
  });
});

describe('90-Day Economy Simulation', () => {
  it('simulates all 10 archetypes deterministically with valid source-to-sink metrics', () => {
    const report = runEconomySimulation(90);
    expect(report.daysSimulated).toBe(90);
    expect(report.archetypes.length).toBe(10);
    expect(report.totalIssued).toBeGreaterThan(0);
    expect(report.totalRemoved).toBeGreaterThan(0);
    for (const a of report.archetypes) {
      expect(a.endingBalance).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('Card Presentation Material Resolver', () => {
  it('applies Champagne Silk & Velvet Rose skin visuals without altering server-controlled Tier', () => {
    const champagneOnClassic = resolveCardMaterial('CLASSIC', 'skin-champagne-silk');
    expect(champagneOnClassic.tier).toBe('CLASSIC');
    expect(champagneOnClassic.finishName).toBe('Champagne Silk');

    const velvetOnGold = resolveCardMaterial('GOLD', 'skin-velvet-rose');
    expect(velvetOnGold.tier).toBe('GOLD');
    expect(velvetOnGold.finishName).toBe('Velvet Rose');
  });
});

describe('Categorised 4-Token Pastel Palette System', () => {
  it('all 10 category palettes satisfy >= 4.5:1 surface/text contrast', () => {
    expect(Object.keys(BOUTIQUE_CATEGORY_PALETTES).length).toBe(10);
    for (const preset of Object.values(BOUTIQUE_CATEGORY_PALETTES)) {
      const ratio = getContrastRatio(preset.palette.surface, preset.palette.text);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('rejects low-contrast custom appearance overrides', () => {
    const res = validateAppearanceConfig({
      presetKey: 'CARDS',
      customPalette: {
        surface: '#FAF7F4',
        border: '#E5DCE1',
        accent: '#96788D',
        text: '#FFFFFF',
      },
    });
    expect(res.valid).toBe(false);
    expect(res.contrastRatio).toBeLessThan(4.5);
  });

  it('resolves category presets and custom overrides cleanly', () => {
    const freeze = resolveItemAppearance({ slug: 'streak-freeze', category: 'PERKS', effectKind: 'STREAK_PROTECTION' });
    expect(freeze.presetKey).toBe('STREAK');
    expect(freeze.palette.surface).toBe('#EFF8FC');

    const custom = resolveItemAppearance({
      slug: 'custom-card',
      category: 'CARDS',
      effectConfig: {
        appearance: {
          presetKey: 'LIMITED',
          texture: 'CERAMIC',
        },
      },
    });
    expect(custom.presetKey).toBe('LIMITED');
    expect(custom.texture).toBe('CERAMIC');
  });
});
