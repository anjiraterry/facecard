import { Tier } from '@/types';

export const CARD_ASPECT_RATIO = 856 / 540; // ~1.5852:1 (ID-1 luxury card proportion)
export const CARD_REFERENCE_WIDTH = 856;
export const CARD_REFERENCE_HEIGHT = 540;
export const CARD_EXPORT_WIDTH = 1712;
export const CARD_EXPORT_HEIGHT = 1080;

export interface TierMaterialSpec {
  tier: Tier;
  name: string;
  finishName: string;
  materialKind: 'satin' | 'brushed' | 'pearlescent' | 'ceramic';
  highlight: string;
  midtone: string;
  shadow: string;
  typography: string;
  mutedTypography: string;
  edgeHighlight: string;
  /** Multi-layered resting base gradient */
  baseGradient: string;
  /** Broad soft ambient studio lighting */
  ambientLighting: string;
  /** Tier-specific micro-finish overlay (e.g. brushed grain, pearlescent sheen) */
  finishOverlay: string;
  borderColor: string;
  insetBevel: string;
  restingShadow: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  engravingDarkColor: string;
  engravingDarkOpacity: number;
  engravingLightColor: string;
  engravingLightOpacity: number;
  /** Reflection opacity range [min, max] when interacting */
  reflectionRange: [number, number];
  reflectionTint: string;
}

export const TIER_MATERIALS: Record<Tier, TierMaterialSpec> = {
  CLASSIC: {
    tier: 'CLASSIC',
    name: 'Classic Card',
    finishName: 'Lilac Satin',
    materialKind: 'satin',
    highlight: '#ECDDEB',
    midtone: '#D5BDD9',
    shadow: '#AD91BD',
    typography: '#43314E',
    mutedTypography: 'rgba(67, 49, 78, 0.72)',
    edgeHighlight: '#F8ECFA',
    baseGradient: [
      'radial-gradient(115% 95% at 18% 12%, rgba(248, 236, 250, 0.72) 0%, rgba(236, 221, 235, 0) 58%)',
      'radial-gradient(90% 85% at 88% 86%, rgba(173, 145, 189, 0.55) 0%, rgba(173, 145, 189, 0) 64%)',
      'linear-gradient(135deg, #ECDDEB 0%, #D5BDD9 50%, #AD91BD 100%)',
    ].join(', '),
    ambientLighting:
      'linear-gradient(125deg, rgba(248, 236, 250, 0.42) 0%, rgba(248, 236, 250, 0.08) 38%, rgba(67, 49, 78, 0.06) 100%)',
    finishOverlay:
      'linear-gradient(110deg, rgba(255, 255, 255, 0.14) 0%, transparent 45%, rgba(173, 145, 189, 0.12) 100%)',
    borderColor: 'rgba(248, 236, 250, 0.55)',
    insetBevel:
      'inset 0 1px 0 rgba(248, 236, 250, 0.75), inset 0 -1px 0 rgba(67, 49, 78, 0.16)',
    restingShadow: '0 14px 34px rgba(67, 49, 78, 0.16), 0 4px 12px rgba(67, 49, 78, 0.08)',
    badgeBg: 'transparent',
    badgeBorder: 'rgba(67, 49, 78, 0.28)',
    badgeText: '#43314E',
    engravingDarkColor: '#43314E',
    engravingDarkOpacity: 0.20,
    engravingLightColor: '#F8ECFA',
    engravingLightOpacity: 0.34,
    reflectionRange: [0.05, 0.09],
    reflectionTint: 'rgba(248, 236, 250, 1)',
  },
  GOLD: {
    tier: 'GOLD',
    name: 'Gold Card',
    finishName: 'Brushed Champagne',
    materialKind: 'brushed',
    highlight: '#F5E9CD',
    midtone: '#DCC69B',
    shadow: '#AE8B49',
    typography: '#58411F',
    mutedTypography: 'rgba(88, 65, 31, 0.74)',
    edgeHighlight: '#FFF5D9',
    baseGradient: [
      'radial-gradient(110% 90% at 15% 15%, rgba(255, 245, 217, 0.78) 0%, rgba(245, 233, 205, 0) 56%)',
      'radial-gradient(95% 85% at 86% 88%, rgba(174, 139, 73, 0.52) 0%, rgba(174, 139, 73, 0) 62%)',
      'linear-gradient(132deg, #F5E9CD 0%, #DCC69B 52%, #AE8B49 100%)',
    ].join(', '),
    ambientLighting:
      'linear-gradient(118deg, rgba(255, 245, 217, 0.52) 0%, rgba(255, 245, 217, 0.10) 36%, rgba(88, 65, 31, 0.08) 100%)',
    finishOverlay:
      'repeating-linear-gradient(90deg, rgba(255, 245, 217, 0.055) 0px, rgba(255, 245, 217, 0.055) 1px, transparent 1px, transparent 2.5px)',
    borderColor: 'rgba(255, 245, 217, 0.65)',
    insetBevel:
      'inset 0 1px 0 rgba(255, 245, 217, 0.85), inset 0 -1px 0 rgba(88, 65, 31, 0.22)',
    restingShadow: '0 16px 38px rgba(88, 65, 31, 0.18), 0 4px 12px rgba(88, 65, 31, 0.09)',
    badgeBg: 'transparent',
    badgeBorder: 'rgba(88, 65, 31, 0.28)',
    badgeText: '#58411F',
    engravingDarkColor: '#58411F',
    engravingDarkOpacity: 0.22,
    engravingLightColor: '#FFF5D9',
    engravingLightOpacity: 0.38,
    reflectionRange: [0.08, 0.14],
    reflectionTint: 'rgba(255, 245, 217, 1)',
  },
  PLATINUM: {
    tier: 'PLATINUM',
    name: 'Platinum Card',
    finishName: 'Pearlescent Silver',
    materialKind: 'pearlescent',
    highlight: '#F6F3F5',
    midtone: '#D7D1DE',
    shadow: '#A3A1AF',
    typography: '#3C3744',
    mutedTypography: 'rgba(60, 55, 68, 0.72)',
    edgeHighlight: '#FFFFFF',
    baseGradient: [
      'radial-gradient(100% 90% at 20% 14%, rgba(255, 255, 255, 0.85) 0%, rgba(246, 243, 245, 0) 58%)',
      'radial-gradient(85% 80% at 78% 24%, rgba(235, 220, 213, 0.42) 0%, transparent 55%)',
      'radial-gradient(95% 85% at 84% 85%, rgba(163, 161, 175, 0.50) 0%, transparent 62%)',
      'linear-gradient(136deg, #F6F3F5 0%, #D7D1DE 50%, #A3A1AF 100%)',
    ].join(', '),
    ambientLighting:
      'radial-gradient(circle at 24% 20%, rgba(255, 255, 255, 0.65) 0%, rgba(235, 220, 213, 0.18) 40%, rgba(163, 161, 175, 0.08) 78%)',
    finishOverlay:
      'linear-gradient(122deg, transparent 18%, rgba(255, 255, 255, 0.36) 36%, rgba(236, 221, 235, 0.22) 48%, rgba(245, 233, 205, 0.16) 58%, transparent 76%)',
    borderColor: 'rgba(255, 255, 255, 0.78)',
    insetBevel:
      'inset 0 1px 1px rgba(255, 255, 255, 0.92), inset 0 -1px 0 rgba(60, 55, 68, 0.16)',
    restingShadow: '0 16px 38px rgba(60, 55, 68, 0.16), 0 4px 12px rgba(60, 55, 68, 0.08)',
    badgeBg: 'transparent',
    badgeBorder: 'rgba(60, 55, 68, 0.26)',
    badgeText: '#3C3744',
    engravingDarkColor: '#3C3744',
    engravingDarkOpacity: 0.18,
    engravingLightColor: '#FFFFFF',
    engravingLightOpacity: 0.42,
    reflectionRange: [0.07, 0.12],
    reflectionTint: 'rgba(246, 243, 245, 1)',
  },
  BLACK: {
    tier: 'BLACK',
    name: 'Black Card',
    finishName: 'Velvet Matte',
    materialKind: 'ceramic',
    highlight: '#463440',
    midtone: '#30232F',
    shadow: '#151116',
    typography: '#F0DFEA',
    mutedTypography: 'rgba(240, 223, 234, 0.68)',
    edgeHighlight: '#877080',
    baseGradient: [
      'radial-gradient(105% 85% at 18% 14%, rgba(70, 52, 64, 0.85) 0%, rgba(70, 52, 64, 0) 58%)',
      'radial-gradient(95% 85% at 88% 88%, rgba(21, 17, 22, 0.92) 0%, rgba(21, 17, 22, 0) 68%)',
      'linear-gradient(142deg, #463440 0%, #30232F 48%, #151116 100%)',
    ].join(', '),
    ambientLighting:
      'linear-gradient(132deg, rgba(135, 112, 128, 0.18) 0%, rgba(70, 52, 64, 0.05) 42%, rgba(21, 17, 22, 0.25) 100%)',
    finishOverlay:
      'radial-gradient(circle at 75% 30%, rgba(135, 112, 128, 0.09) 0%, transparent 62%)',
    borderColor: 'rgba(135, 112, 128, 0.42)',
    insetBevel:
      'inset 0 1px 0 rgba(240, 223, 234, 0.16), inset 0 -1px 0 rgba(0, 0, 0, 0.45)',
    restingShadow: '0 20px 44px rgba(15, 11, 16, 0.38), 0 6px 16px rgba(15, 11, 16, 0.22)',
    badgeBg: 'transparent',
    badgeBorder: 'rgba(240, 223, 234, 0.24)',
    badgeText: '#F0DFEA',
    engravingDarkColor: '#151116',
    engravingDarkOpacity: 0.42,
    engravingLightColor: '#877080',
    engravingLightOpacity: 0.28,
    reflectionRange: [0.03, 0.07],
    reflectionTint: 'rgba(240, 223, 234, 1)',
  },
};

export function resolveCardMaterial(
  tier: Tier,
  skinId?: string,
  frameId?: string
): TierMaterialSpec {
  const base = TIER_MATERIALS[tier] || TIER_MATERIALS.CLASSIC;
  let result: TierMaterialSpec = base;

  if (skinId) {
    if (skinId.includes('velvet-rose') || skinId.includes('velvet_rose')) {
      result = {
        ...result,
        finishName: 'Velvet Rose',
        typography: '#F7E9F0',
        mutedTypography: 'rgba(247, 233, 240, 0.78)',
        badgeBorder: 'rgba(247, 233, 240, 0.35)',
        badgeText: '#F7E9F0',
        engravingDarkColor: '#3A2334',
        engravingLightColor: '#F7E9F0',
        baseGradient: [
          'radial-gradient(110% 90% at 18% 12%, rgba(247, 233, 240, 0.28) 0%, transparent 58%)',
          'linear-gradient(135deg, #96788D 0%, #7B5B72 52%, #65475D 100%)',
        ].join(', '),
      };
    } else if (skinId.includes('porcelain')) {
      result = {
        ...result,
        finishName: 'Porcelain',
        typography: '#251E24',
        mutedTypography: 'rgba(37, 30, 36, 0.72)',
        badgeBorder: 'rgba(37, 30, 36, 0.25)',
        badgeText: '#251E24',
        baseGradient: [
          'radial-gradient(110% 90% at 18% 12%, rgba(255, 255, 255, 0.85) 0%, transparent 58%)',
          'linear-gradient(135deg, #FAF7F4 0%, #F2E9E2 52%, #EBDCD5 100%)',
        ].join(', '),
      };
    } else if (skinId.includes('champagne-silk')) {
      result = {
        ...result,
        finishName: 'Champagne Silk',
        typography: '#513A23',
        mutedTypography: 'rgba(81, 58, 35, 0.74)',
        badgeBorder: 'rgba(81, 58, 35, 0.28)',
        badgeText: '#513A23',
        baseGradient: [
          'radial-gradient(110% 90% at 15% 15%, rgba(255, 245, 217, 0.7) 0%, transparent 56%)',
          'linear-gradient(132deg, #EBD9B2 0%, #D3B888 52%, #BB9864 100%)',
        ].join(', '),
      };
    } else if (skinId.includes('moonstone')) {
      result = {
        ...result,
        finishName: 'Moonstone',
        typography: '#363347',
        mutedTypography: 'rgba(54, 51, 71, 0.74)',
        badgeBorder: 'rgba(54, 51, 71, 0.28)',
        badgeText: '#363347',
        baseGradient: [
          'radial-gradient(110% 90% at 18% 12%, rgba(255, 255, 255, 0.72) 0%, transparent 58%)',
          'linear-gradient(135deg, #E5E0EB 0%, #C4C4D4 52%, #A3A7BD 100%)',
        ].join(', '),
      };
    } else if (skinId.includes('obsidian-bloom')) {
      result = {
        ...result,
        finishName: 'Obsidian Bloom',
        typography: '#F1DCE8',
        mutedTypography: 'rgba(241, 220, 232, 0.74)',
        badgeBorder: 'rgba(241, 220, 232, 0.3)',
        badgeText: '#F1DCE8',
        engravingDarkColor: '#161116',
        engravingLightColor: '#D2B8C9',
        baseGradient: [
          'radial-gradient(110% 90% at 18% 12%, rgba(210, 184, 201, 0.2) 0%, transparent 58%)',
          'linear-gradient(135deg, #49313F 0%, #2C1D26 52%, #161116 100%)',
        ].join(', '),
      };
    } else if (skinId.includes('lavender') || skinId.includes('mauve')) {
      result = {
        ...result,
        baseGradient: [
          'radial-gradient(110% 90% at 18% 12%, rgba(248, 236, 250, 0.78) 0%, transparent 58%)',
          'linear-gradient(135deg, #F2E8EE 0%, #DFC8D7 50%, #CBB0C1 100%)',
        ].join(', '),
      };
    } else if (skinId.includes('black')) {
      result = {
        ...TIER_MATERIALS.BLACK,
        tier: base.tier,
        name: base.name,
      };
    }
  }

  if (frameId && (frameId.includes('solar') || frameId.includes('flare') || frameId.includes('gold'))) {
    result = {
      ...result,
      borderColor: 'rgba(220, 198, 155, 0.82)',
    };
  }

  return result;
}
