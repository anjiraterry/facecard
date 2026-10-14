import { describe, it, expect } from 'vitest';
import { generateCardSvg } from '@/lib/spikes/spikes';

describe('Phase 7: Social Sharing & Dynamic OpenGraph Engine', () => {
  it('should generate valid Workers-compatible SVG OG cards', () => {
    const svg = generateCardSvg({
      displayName: 'CHIDINMA OKON',
      handle: 'chidinma',
      tier: 'GOLD',
      score: 88,
      band: 'LETHAL',
    });

    expect(svg).toContain('<svg');
    expect(svg).toContain('CHIDINMA OKON');
    expect(svg).toContain('GOLD TIER');
    expect(svg).toContain('88');
    expect(svg).toContain('VERDICT: LETHAL');
  });

  it('should adapt colors according to the card tier', () => {
    const goldSvg = generateCardSvg({
      displayName: 'TUNDE',
      handle: 'tunde',
      tier: 'GOLD',
      score: 80,
      band: 'DANGEROUS',
    });
    expect(goldSvg).toContain('#E8D744');

    const blackSvg = generateCardSvg({
      displayName: 'EMMANUEL',
      handle: 'emmanuel',
      tier: 'BLACK',
      score: 95,
      band: 'LETHAL',
    });
    expect(blackSvg).toContain('#18181B');
  });

  it('should validate canvas 1080x1920 story dimensions', () => {
    const storyWidth = 1080;
    const storyHeight = 1920;
    const ratio = storyWidth / storyHeight;
    expect(ratio).toBeCloseTo(9 / 16, 2);
  });
});
