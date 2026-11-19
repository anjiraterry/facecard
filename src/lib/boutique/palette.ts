export type BoutiquePaletteKey =
  | 'CARDS'
  | 'PROFILE'
  | 'GIFTS'
  | 'PERKS'
  | 'ARENA'
  | 'COLLECTIONS'
  | 'SHARING'
  | 'STREAK'
  | 'COMMUNITY'
  | 'LIMITED';

export type MaterialTexture = 'SATIN' | 'CERAMIC' | 'PEARLESCENT' | 'BRUSHED' | 'LINEN';

export interface FourTokenPalette {
  surface: string;
  border: string;
  accent: string;
  text: string;
}

export interface BoutiquePresetSpec {
  key: BoutiquePaletteKey;
  label: string;
  familyName: string;
  palette: FourTokenPalette;
}

export interface ItemAppearanceConfig {
  presetKey: BoutiquePaletteKey;
  customPalette?: Partial<FourTokenPalette>;
  texture?: MaterialTexture;
  gradientEnabled?: boolean;
  artworkUrl?: string;
  version?: number;
}

/**
 * Exact 4-token pastel colour architecture for all 10 Face Card Boutique categories.
 * Every surface + text pair maintains >= 4.5:1 WCAG AA contrast.
 */
export const BOUTIQUE_CATEGORY_PALETTES: Record<BoutiquePaletteKey, BoutiquePresetSpec> = {
  CARDS: {
    key: 'CARDS',
    label: 'Card Skins',
    familyName: 'Lavender & Mauve',
    palette: {
      surface: '#F1E8F6',
      border: '#D9C9EB',
      accent: '#96788D',
      text: '#60476D',
    },
  },
  PROFILE: {
    key: 'PROFILE',
    label: 'Profile Cosmetics',
    familyName: 'Powder Blue',
    palette: {
      surface: '#EAF3FA',
      border: '#C5DAEE',
      accent: '#8EAFD0',
      text: '#3E6081',
    },
  },
  GIFTS: {
    key: 'GIFTS',
    label: 'Social Gifts',
    familyName: 'Ballet Pink & Peach',
    palette: {
      surface: '#FCEEF2',
      border: '#F1CEDB',
      accent: '#E3A5B8',
      text: '#914C66',
    },
  },
  PERKS: {
    key: 'PERKS',
    label: 'Functional Perks',
    familyName: 'Pistachio Green',
    palette: {
      surface: '#F0F5E7',
      border: '#D3E4B8',
      accent: '#A3BE86',
      text: '#506B3C',
    },
  },
  ARENA: {
    key: 'ARENA',
    label: 'Arena Items',
    familyName: 'Pastel Coral',
    palette: {
      surface: '#FCF0E9',
      border: '#F4D2B8',
      accent: '#E4A18A',
      text: '#99533E',
    },
  },
  COLLECTIONS: {
    key: 'COLLECTIONS',
    label: 'Collections',
    familyName: 'Butter Yellow',
    palette: {
      surface: '#FBF6E4',
      border: '#F5E6AC',
      accent: '#D6BB70',
      text: '#806226',
    },
  },
  SHARING: {
    key: 'SHARING',
    label: 'Sharing Studio',
    familyName: 'Periwinkle',
    palette: {
      surface: '#EFEEF9',
      border: '#C5C8ED',
      accent: '#999FD6',
      text: '#4E528A',
    },
  },
  STREAK: {
    key: 'STREAK',
    label: 'Streak Protection',
    familyName: 'Glacier & Ice Blue',
    palette: {
      surface: '#EFF8FC',
      border: '#DCECF4',
      accent: '#A3CCDF',
      text: '#3C6D86',
    },
  },
  COMMUNITY: {
    key: 'COMMUNITY',
    label: 'Community Experiences',
    familyName: 'Seafoam & Mint',
    palette: {
      surface: '#E9F6F0',
      border: '#BFE2D7',
      accent: '#83BDAB',
      text: '#356C5A',
    },
  },
  LIMITED: {
    key: 'LIMITED',
    label: 'Limited Editions',
    familyName: 'Champagne & Cream',
    palette: {
      surface: '#F9F3E8',
      border: '#E9D9B9',
      accent: '#C4AA7D',
      text: '#745A30',
    },
  },
};

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

function hexToLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function getContrastRatio(hexA: string, hexB: string): number {
  if (!HEX_RE.test(hexA) || !HEX_RE.test(hexB)) return 0;
  const l1 = hexToLuminance(hexA);
  const l2 = hexToLuminance(hexB);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

export function validateAppearanceConfig(raw: unknown): {
  valid: boolean;
  errors: string[];
  contrastRatio: number;
  normalized?: ItemAppearanceConfig;
} {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { valid: false, errors: ['Appearance config must be an object'], contrastRatio: 0 };
  }
  const obj = raw as Record<string, unknown>;
  const presetKey = (typeof obj.presetKey === 'string' ? obj.presetKey.toUpperCase() : 'CARDS') as BoutiquePaletteKey;
  const base = BOUTIQUE_CATEGORY_PALETTES[presetKey] ?? BOUTIQUE_CATEGORY_PALETTES.CARDS;

  const custom = (obj.customPalette && typeof obj.customPalette === 'object' ? obj.customPalette : {}) as Partial<FourTokenPalette>;
  const errors: string[] = [];

  const merged: FourTokenPalette = {
    surface: typeof custom.surface === 'string' && custom.surface ? custom.surface : base.palette.surface,
    border: typeof custom.border === 'string' && custom.border ? custom.border : base.palette.border,
    accent: typeof custom.accent === 'string' && custom.accent ? custom.accent : base.palette.accent,
    text: typeof custom.text === 'string' && custom.text ? custom.text : base.palette.text,
  };

  for (const [k, v] of Object.entries(merged)) {
    if (!HEX_RE.test(v)) {
      errors.push(`Palette token '${k}' must be a valid 6-digit hex color (e.g. #F3ECF6)`);
    }
  }

  const contrastRatio = getContrastRatio(merged.surface, merged.text);
  if (contrastRatio < 4.5) {
    errors.push(`Surface/text contrast ratio (${contrastRatio}:1) is below accessible 4.5:1 minimum`);
  }

  const texture = (['SATIN', 'CERAMIC', 'PEARLESCENT', 'BRUSHED', 'LINEN'].includes(String(obj.texture))
    ? obj.texture
    : 'SATIN') as MaterialTexture;

  if (errors.length > 0) {
    return { valid: false, errors, contrastRatio };
  }

  return {
    valid: true,
    errors: [],
    contrastRatio,
    normalized: {
      presetKey: base.key,
      customPalette: obj.customPalette ? merged : undefined,
      texture,
      gradientEnabled: Boolean(obj.gradientEnabled),
      artworkUrl: typeof obj.artworkUrl === 'string' && obj.artworkUrl.trim() ? obj.artworkUrl.trim() : undefined,
      version: typeof obj.version === 'number' && obj.version > 0 ? obj.version : 1,
    },
  };
}

export function inferPaletteKeyForItem(item: {
  slug?: string | null;
  kind?: string | null;
  category?: string | null;
  effectKind?: string | null;
}): BoutiquePaletteKey {
  const slug = (item.slug || '').toLowerCase();
  const kind = (item.kind || '').toUpperCase();
  const cat = (item.category || '').toUpperCase();

  if (slug.includes('streak-freeze') || item.effectKind === 'STREAK_PROTECTION') return 'STREAK';
  if (slug.startsWith('arena-') || cat === 'ARENA') return 'ARENA';
  if (slug.includes('share') || item.effectKind === 'EXPORT_ENTITLEMENT') return 'SHARING';
  if (slug.includes('seasonal') || slug.includes('founder') || cat === 'LIMITED') return 'LIMITED';
  if (slug.includes('gift-') || item.effectKind === 'SOCIAL_GIFT' || cat === 'GIFTS') return 'GIFTS';
  if (cat === 'COLLECTIONS') return 'COLLECTIONS';
  if (cat === 'COMMUNITY') return 'COMMUNITY';
  if (cat === 'LIMITED') return 'LIMITED';
  if (cat === 'STREAK') return 'STREAK';
  if (cat === 'SHARING') return 'SHARING';
  if (
    kind === 'CONSUMABLE' ||
    slug.includes('boost') ||
    slug.includes('surge') ||
    slug.includes('studio-pass') ||
    item.effectKind === 'REWARD_MULTIPLIER' ||
    item.effectKind === 'FEATURE_ENTITLEMENT' ||
    cat === 'PERKS'
  ) {
    return 'PERKS';
  }
  if (
    kind === 'TITLE' ||
    kind === 'FRAME' ||
    kind === 'BADGE' ||
    slug.includes('title-') ||
    slug.includes('frame-') ||
    slug.includes('avatar-') ||
    slug.includes('nameplate-') ||
    slug.includes('bg-') ||
    cat === 'PROFILE'
  ) {
    return 'PROFILE';
  }
  if (cat in BOUTIQUE_CATEGORY_PALETTES) return cat as BoutiquePaletteKey;
  return 'CARDS';
}

export function resolveItemAppearance(item: {
  slug?: string | null;
  kind?: string | null;
  category?: string | null;
  effectKind?: string | null;
  effectConfig?: unknown;
  assetRef?: string | null;
}): {
  presetKey: BoutiquePaletteKey;
  familyName: string;
  palette: FourTokenPalette;
  texture: MaterialTexture;
  gradientEnabled: boolean;
  artworkUrl: string | null;
} {
  const cfg = (item.effectConfig && typeof item.effectConfig === 'object'
    ? (item.effectConfig as Record<string, unknown>)
    : {}) as { appearance?: ItemAppearanceConfig };

  const appearance = cfg.appearance;
  const presetKey =
    appearance?.presetKey && appearance.presetKey in BOUTIQUE_CATEGORY_PALETTES
      ? appearance.presetKey
      : inferPaletteKeyForItem(item);

  const preset = BOUTIQUE_CATEGORY_PALETTES[presetKey];
  const palette: FourTokenPalette = {
    surface: appearance?.customPalette?.surface || preset.palette.surface,
    border: appearance?.customPalette?.border || preset.palette.border,
    accent: appearance?.customPalette?.accent || preset.palette.accent,
    text: appearance?.customPalette?.text || preset.palette.text,
  };

  return {
    presetKey,
    familyName: preset.familyName,
    palette,
    texture: appearance?.texture || 'SATIN',
    gradientEnabled: Boolean(appearance?.gradientEnabled),
    artworkUrl: appearance?.artworkUrl || item.assetRef || null,
  };
}
