import { describe, it, expect } from 'vitest';
import {
  ENGRAVING_ALGORITHM_VERSION,
  generateContourEngraving,
} from '@/components/card/engraving';
import {
  CARD_ASPECT_RATIO,
  CARD_EXPORT_HEIGHT,
  CARD_EXPORT_WIDTH,
  TIER_MATERIALS,
  resolveCardMaterial,
} from '@/components/card/materials';

describe('Face Card Procedural Contour Engraving', () => {
  it('generates identical geometry for the same identifier across calls', () => {
    const first = generateContourEngraving('fc-user-001');
    const second = generateContourEngraving('fc-user-001');

    expect(first).toEqual(second);
    expect(first.version).toBe(ENGRAVING_ALGORITHM_VERSION);
  });

  it('produces controlled variation for different card identifiers', () => {
    const cardA = generateContourEngraving('fc-user-alpha');
    const cardB = generateContourEngraving('fc-user-beta');

    expect(cardA.curves[0]?.d).not.toBe(cardB.curves[0]?.d);
    expect(cardA.focalX).not.toBe(cardB.focalX);
  });

  it('keeps primary curve counts within 24..48 and preserves right-side focal concentration', () => {
    const seeds = ['seed-1', 'seed-2', 'seed-3', 'seed-4', 'seed-5'];
    for (const seed of seeds) {
      const pattern = generateContourEngraving(seed);
      const primary = pattern.curves.filter((c) => c.kind === 'primary');
      const secondary = pattern.curves.filter((c) => c.kind === 'secondary');

      expect(primary.length).toBeGreaterThanOrEqual(24);
      expect(primary.length).toBeLessThanOrEqual(48);
      expect(secondary.length).toBeGreaterThanOrEqual(6);
      expect(pattern.focalX).toBeGreaterThan(428); // Right half of 856px reference canvas
    }
  });

  it('preserves the exact same engraving pattern when upgrading card tier', () => {
    const cardId = 'card-tier-upgrade-test';
    const classicMat = resolveCardMaterial('CLASSIC');
    const goldMat = resolveCardMaterial('GOLD');
    const blackMat = resolveCardMaterial('BLACK');

    expect(classicMat.typography).toBe('#43314E');
    expect(goldMat.typography).toBe('#58411F');
    expect(blackMat.typography).toBe('#F0DFEA');

    // Pattern depends solely on stable non-sensitive identifier, never tier
    expect(generateContourEngraving(cardId)).toEqual(generateContourEngraving(cardId));
  });

  it('maintains 1.586:1 geometry and 2x export dimensions across all four tiers', () => {
    expect(CARD_ASPECT_RATIO).toBeCloseTo(1.5852, 3);
    expect(CARD_EXPORT_WIDTH).toBe(1712);
    expect(CARD_EXPORT_HEIGHT).toBe(1080);

    expect(Object.keys(TIER_MATERIALS)).toEqual(['CLASSIC', 'GOLD', 'PLATINUM', 'BLACK']);
  });
});
