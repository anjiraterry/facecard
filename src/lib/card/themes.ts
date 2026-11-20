import { db } from '@/lib/db';
import { getContrastRatio } from '@/lib/boutique/palette';
import {
  CardThemeStatus,
  Prisma,
  ThemeAcquisition,
  ThemeMaterial,
  Tier,
} from '@prisma/client';

export interface CardThemeConfig {
  themeId: string;
  slug: string;
  name: string;
  description: string;
  collectionName: string;
  minimumTier: Tier;
  acquisition: ThemeAcquisition;
  pricePoints: number;
  legacySkinSlug?: string;
  achievementKey?: string;
  achievementLabel?: string;
  backgroundAssetVersionId: string;
  previewAssetVersionId: string;
  backgroundImageUrl?: string | null;
  previewImageUrl?: string | null;
  textColor: string;
  mutedTextColor: string;
  accentColor: string;
  paletteFrom: string;
  paletteTo: string;
  finish: {
    material: ThemeMaterial;
    reflectionIntensity: number;
    maximumTiltDegrees: number;
    engravingOpacity: number;
    grainOpacity: number;
  };
  compatibleFrameIds: string[];
}

export const TIER_RANK: Record<Tier, number> = {
  CLASSIC: 0,
  GOLD: 1,
  PLATINUM: 2,
  BLACK: 3,
};

export const DEFAULT_THEME_BY_TIER: Record<Tier, string> = {
  CLASSIC: 'signature-mauve',
  GOLD: 'signature-gold',
  PLATINUM: 'signature-platinum',
  BLACK: 'signature-black',
};

/**
 * 16 initial tier-based card themes across Classic, Gold, Platinum, and Black.
 */
export const INITIAL_CARD_THEMES: CardThemeConfig[] = [
  // === Classic collection — The Essentials ===
  {
    themeId: 'signature-mauve',
    slug: 'signature-mauve',
    name: 'Signature Mauve',
    description: 'Muted plum satin aligned with Face Card’s signature #96788D aesthetic.',
    collectionName: 'The Essentials',
    minimumTier: 'CLASSIC',
    acquisition: 'TIER_UNLOCK',
    pricePoints: 0,
    backgroundAssetVersionId: 'theme-signature-mauve-v1',
    previewAssetVersionId: 'theme-signature-mauve-preview-v1',
    textColor: '#FAF7F4',
    mutedTextColor: 'rgba(250, 247, 244, 0.82)',
    accentColor: '#EBDCD5',
    paletteFrom: '#76576D',
    paletteTo: '#4E3547',
    finish: { material: 'SATIN', reflectionIntensity: 0.09, maximumTiltDegrees: 6, engravingOpacity: 0.2, grainOpacity: 0.03 },
    compatibleFrameIds: ['default'],
  },
  {
    themeId: 'porcelain',
    slug: 'porcelain',
    name: 'Porcelain',
    description: 'Warm ivory ceramic matte finish with restrained mauve contours.',
    collectionName: 'The Essentials',
    minimumTier: 'CLASSIC',
    acquisition: 'POINTS_PURCHASE',
    pricePoints: 450,
    legacySkinSlug: 'skin-porcelain',
    backgroundAssetVersionId: 'porcelain-v1',
    previewAssetVersionId: 'porcelain-preview-v1',
    textColor: '#251E24',
    mutedTextColor: 'rgba(37, 30, 36, 0.72)',
    accentColor: '#96788D',
    paletteFrom: '#FAF7F4',
    paletteTo: '#EBDCD5',
    finish: { material: 'CERAMIC', reflectionIntensity: 0.06, maximumTiltDegrees: 6, engravingOpacity: 0.16, grainOpacity: 0.025 },
    compatibleFrameIds: ['default'],
  },
  {
    themeId: 'velvet-rose',
    slug: 'velvet-rose',
    name: 'Velvet Rose',
    description: 'Dusty rose textile finish with fine velvet sheen.',
    collectionName: 'The Essentials',
    minimumTier: 'CLASSIC',
    acquisition: 'POINTS_PURCHASE',
    pricePoints: 650,
    legacySkinSlug: 'skin-velvet-rose',
    backgroundAssetVersionId: 'velvet-rose-v1',
    previewAssetVersionId: 'velvet-rose-preview-v1',
    textColor: '#FAF7F4',
    mutedTextColor: 'rgba(250, 247, 244, 0.82)',
    accentColor: '#D2B8C9',
    paletteFrom: '#78566E',
    paletteTo: '#52364A',
    finish: { material: 'SATIN', reflectionIntensity: 0.1, maximumTiltDegrees: 6, engravingOpacity: 0.22, grainOpacity: 0.04 },
    compatibleFrameIds: ['default'],
  },
  {
    themeId: 'botanical-silk',
    slug: 'botanical-silk',
    name: 'Botanical Silk',
    description: 'Mauve engraved botanical silk with restrained dimensional detail.',
    collectionName: 'The Essentials',
    minimumTier: 'CLASSIC',
    acquisition: 'POINTS_PURCHASE',
    pricePoints: 750,
    backgroundAssetVersionId: 'botanical-silk-v1',
    previewAssetVersionId: 'botanical-silk-preview-v1',
    textColor: '#FAF7F4',
    mutedTextColor: 'rgba(250, 247, 244, 0.82)',
    accentColor: '#EBDCD5',
    paletteFrom: '#73556A',
    paletteTo: '#4B3243',
    finish: { material: 'SATIN', reflectionIntensity: 0.11, maximumTiltDegrees: 6, engravingOpacity: 0.26, grainOpacity: 0.03 },
    compatibleFrameIds: ['default'],
  },

  // === Gold collection — The Gilded Edit ===
  {
    themeId: 'signature-gold',
    slug: 'signature-gold',
    name: 'Signature Gold',
    description: 'Brushed champagne metal unlocked automatically at Gold tier.',
    collectionName: 'The Gilded Edit',
    minimumTier: 'GOLD',
    acquisition: 'TIER_UNLOCK',
    pricePoints: 0,
    backgroundAssetVersionId: 'signature-gold-v1',
    previewAssetVersionId: 'signature-gold-preview-v1',
    textColor: '#2B1D0C',
    mutedTextColor: 'rgba(43, 29, 12, 0.78)',
    accentColor: '#FFF5D9',
    paletteFrom: '#F5E9CD',
    paletteTo: '#C7A667',
    finish: { material: 'BRUSHED_METAL', reflectionIntensity: 0.14, maximumTiltDegrees: 6, engravingOpacity: 0.22, grainOpacity: 0.03 },
    compatibleFrameIds: ['default'],
  },
  {
    themeId: 'champagne-silk',
    slug: 'champagne-silk',
    name: 'Champagne Silk',
    description: 'Pale champagne silk with soft anisotropic reflection.',
    collectionName: 'The Gilded Edit',
    minimumTier: 'GOLD',
    acquisition: 'POINTS_PURCHASE',
    pricePoints: 900,
    legacySkinSlug: 'skin-champagne-silk',
    backgroundAssetVersionId: 'champagne-silk-v1',
    previewAssetVersionId: 'champagne-silk-preview-v1',
    textColor: '#2D1E0F',
    mutedTextColor: 'rgba(45, 30, 15, 0.78)',
    accentColor: '#F8E7BE',
    paletteFrom: '#EBD9B2',
    paletteTo: '#C7A66E',
    finish: { material: 'SATIN', reflectionIntensity: 0.13, maximumTiltDegrees: 6, engravingOpacity: 0.2, grainOpacity: 0.025 },
    compatibleFrameIds: ['default'],
  },
  {
    themeId: 'amber-reserve',
    slug: 'amber-reserve',
    name: 'Amber Reserve',
    description: 'Honey-toned resin with warm translucent depth.',
    collectionName: 'The Gilded Edit',
    minimumTier: 'GOLD',
    acquisition: 'POINTS_PURCHASE',
    pricePoints: 1200,
    backgroundAssetVersionId: 'amber-reserve-v1',
    previewAssetVersionId: 'amber-reserve-preview-v1',
    textColor: '#FAF2E4',
    mutedTextColor: 'rgba(250, 242, 228, 0.82)',
    accentColor: '#F5E0B5',
    paletteFrom: '#8D5E23',
    paletteTo: '#573712',
    finish: { material: 'GLASS', reflectionIntensity: 0.15, maximumTiltDegrees: 6, engravingOpacity: 0.18, grainOpacity: 0.02 },
    compatibleFrameIds: ['default'],
  },
  {
    themeId: 'rose-gold',
    slug: 'rose-gold',
    name: 'Rose Gold',
    description: 'Rose champagne alloy with fine metallic grain.',
    collectionName: 'The Gilded Edit',
    minimumTier: 'GOLD',
    acquisition: 'POINTS_PURCHASE',
    pricePoints: 1000,
    backgroundAssetVersionId: 'rose-gold-v1',
    previewAssetVersionId: 'rose-gold-preview-v1',
    textColor: '#2E181A',
    mutedTextColor: 'rgba(46, 24, 26, 0.78)',
    accentColor: '#FCE6E6',
    paletteFrom: '#F0CFCB',
    paletteTo: '#C99695',
    finish: { material: 'BRUSHED_METAL', reflectionIntensity: 0.14, maximumTiltDegrees: 6, engravingOpacity: 0.21, grainOpacity: 0.03 },
    compatibleFrameIds: ['default'],
  },

  // === Platinum collection — The Atelier Edition ===
  {
    themeId: 'signature-platinum',
    slug: 'signature-platinum',
    name: 'Signature Platinum',
    description: 'Pearl silver satin unlocked automatically at Platinum tier.',
    collectionName: 'The Atelier Edition',
    minimumTier: 'PLATINUM',
    acquisition: 'TIER_UNLOCK',
    pricePoints: 0,
    backgroundAssetVersionId: 'signature-platinum-v1',
    previewAssetVersionId: 'signature-platinum-preview-v1',
    textColor: '#36323E',
    mutedTextColor: 'rgba(54, 50, 62, 0.72)',
    accentColor: '#FFFFFF',
    paletteFrom: '#F6F3F5',
    paletteTo: '#A3A1AF',
    finish: { material: 'PEARLESCENT', reflectionIntensity: 0.14, maximumTiltDegrees: 6, engravingOpacity: 0.19, grainOpacity: 0.025 },
    compatibleFrameIds: ['default'],
  },
  {
    themeId: 'moonstone',
    slug: 'moonstone',
    name: 'Moonstone',
    description: 'Opalescent pearl surface with restrained iridescence.',
    collectionName: 'The Atelier Edition',
    minimumTier: 'PLATINUM',
    acquisition: 'POINTS_PURCHASE',
    pricePoints: 1200,
    legacySkinSlug: 'skin-moonstone',
    backgroundAssetVersionId: 'moonstone-v1',
    previewAssetVersionId: 'moonstone-preview-v1',
    textColor: '#2F2C3D',
    mutedTextColor: 'rgba(47, 44, 61, 0.74)',
    accentColor: '#D2B8C9',
    paletteFrom: '#E5E0EB',
    paletteTo: '#A3A7BD',
    finish: { material: 'PEARLESCENT', reflectionIntensity: 0.15, maximumTiltDegrees: 6, engravingOpacity: 0.2, grainOpacity: 0.02 },
    compatibleFrameIds: ['default'],
  },
  {
    themeId: 'frosted-pearl',
    slug: 'frosted-pearl',
    name: 'Frosted Pearl',
    description: 'Frosted translucent glass with soft diffuse reflection.',
    collectionName: 'The Atelier Edition',
    minimumTier: 'PLATINUM',
    acquisition: 'POINTS_PURCHASE',
    pricePoints: 1600,
    backgroundAssetVersionId: 'frosted-pearl-v1',
    previewAssetVersionId: 'frosted-pearl-preview-v1',
    textColor: '#282B36',
    mutedTextColor: 'rgba(40, 43, 54, 0.72)',
    accentColor: '#FFFFFF',
    paletteFrom: '#EEF2F6',
    paletteTo: '#B8C2D1',
    finish: { material: 'GLASS', reflectionIntensity: 0.13, maximumTiltDegrees: 6, engravingOpacity: 0.17, grainOpacity: 0.03 },
    compatibleFrameIds: ['default'],
  },
  {
    themeId: 'titanium-veil',
    slug: 'titanium-veil',
    name: 'Titanium Veil',
    description: 'Dark silver titanium with directional metallic grain.',
    collectionName: 'The Atelier Edition',
    minimumTier: 'PLATINUM',
    acquisition: 'POINTS_PURCHASE',
    pricePoints: 2000,
    backgroundAssetVersionId: 'titanium-veil-v1',
    previewAssetVersionId: 'titanium-veil-preview-v1',
    textColor: '#F3F4F6',
    mutedTextColor: 'rgba(243, 244, 246, 0.8)',
    accentColor: '#D1D5DB',
    paletteFrom: '#585D69',
    paletteTo: '#2A2E37',
    finish: { material: 'BRUSHED_METAL', reflectionIntensity: 0.15, maximumTiltDegrees: 6, engravingOpacity: 0.22, grainOpacity: 0.035 },
    compatibleFrameIds: ['default'],
  },

  // === Black collection — The Private Reserve ===
  {
    themeId: 'signature-black',
    slug: 'signature-black',
    name: 'Signature Black',
    description: 'Obsidian plum matte ceramic unlocked automatically at Black tier.',
    collectionName: 'The Private Reserve',
    minimumTier: 'BLACK',
    acquisition: 'TIER_UNLOCK',
    pricePoints: 0,
    backgroundAssetVersionId: 'signature-black-v1',
    previewAssetVersionId: 'signature-black-preview-v1',
    textColor: '#F4EAEF',
    mutedTextColor: 'rgba(244, 234, 239, 0.76)',
    accentColor: '#C5A7B9',
    paletteFrom: '#2A1F26',
    paletteTo: '#120E11',
    finish: { material: 'CERAMIC', reflectionIntensity: 0.08, maximumTiltDegrees: 6, engravingOpacity: 0.24, grainOpacity: 0.03 },
    compatibleFrameIds: ['default'],
  },
  {
    themeId: 'obsidian-bloom',
    slug: 'obsidian-bloom',
    name: 'Obsidian Bloom',
    description: 'Dark engraved metal with selective polish and plum floral contours.',
    collectionName: 'The Private Reserve',
    minimumTier: 'BLACK',
    acquisition: 'POINTS_PURCHASE',
    pricePoints: 1800,
    legacySkinSlug: 'skin-obsidian-bloom',
    backgroundAssetVersionId: 'obsidian-bloom-v1',
    previewAssetVersionId: 'obsidian-bloom-preview-v1',
    textColor: '#F1DCE8',
    mutedTextColor: 'rgba(241, 220, 232, 0.76)',
    accentColor: '#96788D',
    paletteFrom: '#49313F',
    paletteTo: '#161116',
    finish: { material: 'BRUSHED_METAL', reflectionIntensity: 0.12, maximumTiltDegrees: 6, engravingOpacity: 0.26, grainOpacity: 0.03 },
    compatibleFrameIds: ['default'],
  },
  {
    themeId: 'midnight-silk',
    slug: 'midnight-silk',
    name: 'Midnight Silk',
    description: 'Deep burgundy silk with subtle flowing reflections.',
    collectionName: 'The Private Reserve',
    minimumTier: 'BLACK',
    acquisition: 'POINTS_PURCHASE',
    pricePoints: 2500,
    backgroundAssetVersionId: 'midnight-silk-v1',
    previewAssetVersionId: 'midnight-silk-preview-v1',
    textColor: '#F6E7EB',
    mutedTextColor: 'rgba(246, 231, 235, 0.76)',
    accentColor: '#D4A5B2',
    paletteFrom: '#4F1D2B',
    paletteTo: '#170B0F',
    finish: { material: 'SATIN', reflectionIntensity: 0.12, maximumTiltDegrees: 6, engravingOpacity: 0.22, grainOpacity: 0.03 },
    compatibleFrameIds: ['default'],
  },
  {
    themeId: 'onyx-reserve',
    slug: 'onyx-reserve',
    name: 'Onyx Reserve',
    description: 'Dark natural-stone aesthetic with restrained gold detailing.',
    collectionName: 'The Private Reserve',
    minimumTier: 'BLACK',
    acquisition: 'POINTS_PURCHASE',
    pricePoints: 3500,
    backgroundAssetVersionId: 'onyx-reserve-v1',
    previewAssetVersionId: 'onyx-reserve-preview-v1',
    textColor: '#F5E9CD',
    mutedTextColor: 'rgba(245, 233, 205, 0.76)',
    accentColor: '#C0A36F',
    paletteFrom: '#242322',
    paletteTo: '#0D0C0C',
    finish: { material: 'STONE', reflectionIntensity: 0.1, maximumTiltDegrees: 6, engravingOpacity: 0.22, grainOpacity: 0.04 },
    compatibleFrameIds: ['default'],
  },
];

export function isTierEligibleForTheme(userTier: Tier, minimumTier: Tier): boolean {
  return TIER_RANK[userTier] >= TIER_RANK[minimumTier];
}

export function validateThemeContrast(textColor: string, paletteFrom: string, paletteTo: string): {
  valid: boolean;
  minRatio: number;
} {
  const r1 = getContrastRatio(textColor, paletteFrom);
  const r2 = getContrastRatio(textColor, paletteTo);
  const minRatio = Math.min(r1, r2);
  return { valid: minRatio >= 4.5, minRatio };
}

/**
 * Idempotently ensures the 16 initial CardThemes exist in the database and links any existing
 * Boutique skin ShopItems without altering existing customer ownership.
 */
export async function bootstrapCardThemes(): Promise<void> {
  const existingCount = await db.cardTheme.count();
  if (existingCount >= INITIAL_CARD_THEMES.length) return;

  for (const t of INITIAL_CARD_THEMES) {
    let shopItemId: string | null = null;
    if (t.acquisition === 'POINTS_PURCHASE') {
      const slugToLookup = t.legacySkinSlug || `skin-${t.slug}`;
      const existingShop = await db.shopItem.findUnique({
        where: { slug: slugToLookup },
        select: { id: true },
      });
      if (existingShop) {
        shopItemId = existingShop.id;
      } else {
        const createdShop = await db.shopItem.create({
          data: {
            sku: `FC-THM-${t.themeId.toUpperCase().slice(0, 12)}`,
            slug: slugToLookup,
            name: t.name,
            description: t.description,
            kind: 'SKIN',
            category: 'CARDS',
            rarity:
              t.minimumTier === 'BLACK'
                ? 'EXCLUSIVE'
                : t.minimumTier === 'PLATINUM'
                  ? 'COLLECTOR'
                  : t.minimumTier === 'GOLD'
                    ? 'SIGNATURE'
                    : 'ESSENTIAL',
            status: 'PUBLISHED',
            active: true,
            price: t.pricePoints,
            minTier: t.minimumTier,
            maxOwned: 1,
            isGiftable: true,
            slot: 'CARD_SKIN',
            effectKind: 'EQUIP_COSMETIC',
            effectConfig: {
              kind: 'EQUIP_COSMETIC',
              slot: 'CARD_SKIN',
              assetVersionId: t.backgroundAssetVersionId,
              durationPolicy: 'PERMANENT',
              activation: 'EQUIP',
              stackPolicy: 'REPLACE_SLOT',
              targets: ['CARD', 'PROFILE', 'ARENA', 'SHARE'],
              palette: { from: t.paletteFrom, to: t.paletteTo, text: t.textColor, accent: t.accentColor },
            },
          },
          select: { id: true },
        });
        shopItemId = createdShop.id;
      }
    }

    await db.cardTheme.upsert({
      where: { themeId: t.themeId },
      update: {},
      create: {
        themeId: t.themeId,
        slug: t.slug,
        name: t.name,
        description: t.description,
        collectionName: t.collectionName,
        minimumTier: t.minimumTier,
        acquisition: t.acquisition,
        pricePoints: t.pricePoints,
        achievementKey: t.achievementKey ?? null,
        achievementLabel: t.achievementLabel ?? null,
        status: CardThemeStatus.PUBLISHED,
        shopItemId,
        backgroundAssetVersionId: t.backgroundAssetVersionId,
        previewAssetVersionId: t.previewAssetVersionId,
        backgroundImageUrl: t.backgroundImageUrl ?? null,
        previewImageUrl: t.previewImageUrl ?? null,
        textColor: t.textColor,
        mutedTextColor: t.mutedTextColor,
        accentColor: t.accentColor,
        material: t.finish.material,
        reflectionIntensity: t.finish.reflectionIntensity,
        maximumTiltDegrees: t.finish.maximumTiltDegrees,
        engravingOpacity: t.finish.engravingOpacity,
        grainOpacity: t.finish.grainOpacity,
        paletteFrom: t.paletteFrom,
        paletteTo: t.paletteTo,
        compatibleFrameIds: t.compatibleFrameIds,
        version: 1,
      },
    });
  }
}

/**
 * Resolves the active theme for a user's card, enforcing tier eligibility
 * and falling back to the user's tier default if ineligible.
 */
export async function resolveCardThemeForUser(params: {
  actualTier: Tier;
  equippedThemeId?: string | null;
  equippedSkinSlug?: string | null;
}) {
  const { actualTier, equippedThemeId, equippedSkinSlug } = params;
  const candidateId =
    equippedThemeId ||
    (equippedSkinSlug ? equippedSkinSlug.replace(/^skin-/, '') : null) ||
    DEFAULT_THEME_BY_TIER[actualTier];

  const cardThemeModel = (db as unknown as { cardTheme?: typeof db.cardTheme }).cardTheme;
  if (!cardThemeModel || typeof cardThemeModel.findFirst !== 'function') {
    const staticMatch =
      INITIAL_CARD_THEMES.find((t) => t.themeId === candidateId || t.slug === candidateId) ??
      INITIAL_CARD_THEMES.find((t) => t.themeId === DEFAULT_THEME_BY_TIER[actualTier])!;
    const resolved = isTierEligibleForTheme(actualTier, staticMatch.minimumTier)
      ? staticMatch
      : INITIAL_CARD_THEMES.find((t) => t.themeId === DEFAULT_THEME_BY_TIER[actualTier])!;
    return {
      ...resolved,
      backgroundImageUrl: resolved.backgroundImageUrl ?? null,
      previewImageUrl: resolved.previewImageUrl ?? null,
      material: resolved.finish.material,
      reflectionIntensity: resolved.finish.reflectionIntensity,
      maximumTiltDegrees: resolved.finish.maximumTiltDegrees,
      engravingOpacity: resolved.finish.engravingOpacity,
      grainOpacity: resolved.finish.grainOpacity,
      version: 1,
    };
  }

  await bootstrapCardThemes();

  const theme = await cardThemeModel.findFirst({
    where: {
      OR: [{ themeId: candidateId }, { slug: candidateId }],
      status: { not: CardThemeStatus.DRAFT },
    },
  });

  if (theme && isTierEligibleForTheme(actualTier, theme.minimumTier)) {
    return theme;
  }

  // Fallback to tier default if user became ineligible through tier correction
  const fallback = await cardThemeModel.findUnique({
    where: { themeId: DEFAULT_THEME_BY_TIER[actualTier] },
  });
  return fallback;
}

export function serializeCardTheme(theme: {
  themeId: string;
  slug: string;
  name: string;
  description: string;
  collectionName: string;
  minimumTier: Tier;
  acquisition: ThemeAcquisition;
  pricePoints: number;
  backgroundAssetVersionId: string;
  previewAssetVersionId: string;
  backgroundImageUrl: string | null;
  previewImageUrl: string | null;
  textColor: string;
  mutedTextColor: string | null;
  accentColor: string;
  material: ThemeMaterial;
  reflectionIntensity: number;
  maximumTiltDegrees: number;
  engravingOpacity: number;
  grainOpacity: number;
  paletteFrom: string;
  paletteTo: string;
  compatibleFrameIds: string[];
  version: number;
}) {
  return {
    themeId: theme.themeId,
    slug: theme.slug,
    name: theme.name,
    description: theme.description,
    collectionName: theme.collectionName,
    minimumTier: theme.minimumTier,
    acquisition: theme.acquisition,
    pricePoints: theme.pricePoints,
    backgroundAssetVersionId: theme.backgroundAssetVersionId,
    previewAssetVersionId: theme.previewAssetVersionId,
    backgroundImageUrl: theme.backgroundImageUrl,
    previewImageUrl: theme.previewImageUrl,
    textColor: theme.textColor,
    mutedTextColor: theme.mutedTextColor,
    accentColor: theme.accentColor,
    material: theme.material,
    reflectionIntensity: theme.reflectionIntensity,
    maximumTiltDegrees: theme.maximumTiltDegrees,
    engravingOpacity: theme.engravingOpacity,
    grainOpacity: theme.grainOpacity,
    paletteFrom: theme.paletteFrom,
    paletteTo: theme.paletteTo,
    compatibleFrameIds: theme.compatibleFrameIds,
    version: theme.version,
  };
}

export type SerializedCardTheme = ReturnType<typeof serializeCardTheme>;

/**
 * Helper for creating an immutable CardThemeVersion snapshot.
 */
export async function recordThemeVersionSnapshot(
  tx: Prisma.TransactionClient,
  themeDbId: string,
  version: number,
  config: SerializedCardTheme,
  staffId?: string
) {
  await tx.cardThemeVersion.upsert({
    where: { themeId_version: { themeId: themeDbId, version } },
    update: {},
    create: {
      themeId: themeDbId,
      version,
      config: config as unknown as Prisma.InputJsonValue,
      createdById: staffId ?? null,
    },
  });
}
