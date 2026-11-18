import { Tier, Band } from '@/types';

export const BRAND_COLORS = {
  porcelain: '#FAF7F4',
  skinNude: '#EBDCD5',
  dustyMauve: '#D2B8C9',
  mutedPlum: '#96788D',
  blackPlum: '#251E24',
  white: '#FFFFFF',
  success: '#3E6B52',
  warning: '#9A6B32',
  danger: '#9E3E4E',
} as const;

export const TIER_CONFIG: Record<
  Tier,
  {
    name: string;
    finishLabel: string;
    minPoints: number;
    bgGradient: string;
    textColor: string;
    badgeBg: string;
    badgeText: string;
    borderColor: string;
    glow?: string;
  }
> = {
  CLASSIC: {
    name: 'Classic Card',
    finishLabel: 'Dusty Lilac',
    minPoints: 0,
    bgGradient: 'linear-gradient(135deg, #EADDE5 0%, #D2B8C9 52%, #B595AA 100%)',
    textColor: '#251E24',
    badgeBg: 'rgba(37, 30, 36, 0.09)',
    badgeText: '#251E24',
    borderColor: 'rgba(150, 120, 141, 0.35)',
    glow: '0 10px 28px rgba(150, 120, 141, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.55)',
  },
  GOLD: {
    name: 'Gold Card',
    finishLabel: 'Brushed Gold',
    minPoints: 1000,
    bgGradient: 'linear-gradient(135deg, #F6ECD6 0%, #E7CFA0 50%, #D5B375 100%)',
    textColor: '#2B2118',
    badgeBg: 'rgba(43, 33, 24, 0.10)',
    badgeText: '#2B2118',
    borderColor: 'rgba(154, 107, 50, 0.28)',
    glow: '0 12px 32px rgba(154, 107, 50, 0.14), inset 0 1px 0 rgba(255, 250, 240, 0.85)',
  },
  PLATINUM: {
    name: 'Platinum Card',
    finishLabel: 'Pearlescent Mauve',
    minPoints: 5000,
    bgGradient: 'linear-gradient(135deg, #F5F0F4 0%, #E2D3DD 48%, #D2B8C9 100%)',
    textColor: '#251E24',
    badgeBg: 'rgba(150, 120, 141, 0.18)',
    badgeText: '#251E24',
    borderColor: 'rgba(150, 120, 141, 0.35)',
    glow: '0 12px 34px rgba(150, 120, 141, 0.18), inset 0 1px 1px rgba(255, 255, 255, 0.9)',
  },
  BLACK: {
    name: 'Black Card',
    finishLabel: 'Velvet Matte',
    minPoints: 20000,
    bgGradient: 'linear-gradient(145deg, #2C232B 0%, #251E24 55%, #181317 100%)',
    textColor: '#FAF7F4',
    badgeBg: 'rgba(235, 220, 213, 0.14)',
    badgeText: '#FAF7F4',
    borderColor: 'rgba(210, 184, 201, 0.24)',
    glow: '0 16px 40px rgba(24, 19, 23, 0.32), inset 0 1px 0 rgba(235, 220, 213, 0.18)',
  },
};

export const VERDICT_BANDS: Record<
  Band,
  {
    label: string;
    minScore: number;
    maxScore: number;
    chipBg: string;
    chipText: string;
    glow?: string;
  }
> = {
  HARMLESS: {
    label: 'Soft Glow',
    minScore: 0,
    maxScore: 39,
    chipBg: 'rgba(235, 220, 213, 0.72)',
    chipText: '#251E24',
  },
  SUSPICIOUS: {
    label: 'Elevated',
    minScore: 40,
    maxScore: 64,
    chipBg: 'rgba(210, 184, 201, 0.55)',
    chipText: '#251E24',
  },
  DANGEROUS: {
    label: 'Magnetic',
    minScore: 65,
    maxScore: 84,
    chipBg: 'rgba(150, 120, 141, 0.22)',
    chipText: '#251E24',
  },
  LETHAL: {
    label: 'Lethal',
    minScore: 85,
    maxScore: 100,
    chipBg: '#251E24',
    chipText: '#FAF7F4',
    glow: '0 4px 12px rgba(37, 30, 36, 0.22)',
  },
};
