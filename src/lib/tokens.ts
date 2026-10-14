import { Tier, Band } from '@/types';

export const BRAND_COLORS = {
  primary: '#18181B',
  accent: '#6366F1',
  indigo: '#4F46E5',
  violet: '#8B5CF6',
  sky: '#0EA5E9',
  rose: '#F43F5E',
  white: '#FFFFFF',
  cream: '#FAFAFA',
  gray: '#71717A',
  charcoal: '#18181B',
  black: '#09090B',
} as const;

export const TIER_CONFIG: Record<
  Tier,
  {
    name: string;
    minPoints: number;
    bgGradient: string;
    textColor: string;
    badgeBg: string;
    badgeText?: string;
    borderColor: string;
    glow?: string;
  }
> = {
  CLASSIC: {
    name: 'Classic',
    minPoints: 0,
    bgGradient: 'linear-gradient(135deg, rgba(255, 255, 255, 0.78) 0%, rgba(244, 244, 245, 0.55) 100%)',
    textColor: '#18181B',
    badgeBg: 'rgba(0, 0, 0, 0.05)',
    badgeText: '#18181B',
    borderColor: 'rgba(255, 255, 255, 0.9)',
    glow: '0px 10px 30px rgba(0, 0, 0, 0.04), inset 0px 1px 2px rgba(255, 255, 255, 1)',
  },
  GOLD: {
    name: 'Gold',
    minPoints: 1000,
    bgGradient: 'linear-gradient(135deg, rgba(253, 246, 227, 0.82) 0%, rgba(245, 230, 202, 0.6) 50%, rgba(248, 238, 216, 0.76) 100%)',
    textColor: '#18181B',
    badgeBg: 'rgba(180, 130, 60, 0.1)',
    badgeText: '#78501E',
    borderColor: 'rgba(255, 255, 255, 0.95)',
    glow: '0px 12px 36px rgba(212, 175, 55, 0.18), inset 0px 1.5px 2px rgba(255, 255, 255, 0.9)',
  },
  PLATINUM: {
    name: 'Platinum',
    minPoints: 5000,
    bgGradient: 'linear-gradient(135deg, rgba(240, 243, 255, 0.82) 0%, rgba(224, 231, 255, 0.6) 50%, rgba(243, 232, 255, 0.76) 100%)',
    textColor: '#18181B',
    badgeBg: 'rgba(99, 102, 241, 0.1)',
    badgeText: '#4338CA',
    borderColor: 'rgba(255, 255, 255, 0.95)',
    glow: '0px 12px 36px rgba(99, 102, 241, 0.2), inset 0px 1.5px 2px rgba(255, 255, 255, 0.9)',
  },
  BLACK: {
    name: 'Black Card',
    minPoints: 20000,
    bgGradient: 'linear-gradient(135deg, rgba(24, 24, 27, 0.9) 0%, rgba(9, 9, 11, 0.98) 100%)',
    textColor: '#FFFFFF',
    badgeBg: 'rgba(255, 255, 255, 0.12)',
    badgeText: '#FFFFFF',
    borderColor: 'rgba(255, 255, 255, 0.18)',
    glow: '0px 16px 48px rgba(0, 0, 0, 0.45), inset 0px 1px 1.5px rgba(255, 255, 255, 0.25)',
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
    label: 'Harmless',
    minScore: 0,
    maxScore: 39,
    chipBg: 'rgba(99, 102, 241, 0.12)',
    chipText: '#4F46E5',
  },
  SUSPICIOUS: {
    label: 'Suspicious',
    minScore: 40,
    maxScore: 64,
    chipBg: 'rgba(14, 165, 233, 0.12)',
    chipText: '#0284C7',
  },
  DANGEROUS: {
    label: 'Dangerous',
    minScore: 65,
    maxScore: 84,
    chipBg: 'rgba(244, 63, 94, 0.12)',
    chipText: '#E11D48',
  },
  LETHAL: {
    label: 'Lethal',
    minScore: 85,
    maxScore: 100,
    chipBg: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%)',
    chipText: '#FFFFFF',
    glow: '0px 6px 20px rgba(99, 102, 241, 0.35)',
  },
};
