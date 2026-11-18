# Face Card — Soft Luxury Digital Collectible Card System

## Architecture Overview

The Face Card renderer is organized into three modules under `src/components/card/`:

1. **`materials.ts`** — Centralized tier material specifications (`TIER_MATERIALS`), core ID-1 card geometry (`856 × 540` reference, `1.586:1` aspect ratio, `1712 × 1080` 2× export dimensions), and `resolveCardMaterial(tier, skinId, frameId)` for Boutique customizations.
2. **`engraving.ts`** — Versioned (`contour-v1`), deterministic **Contour Engraving** procedural vector generator (`generateContourEngraving(seed)`) and 2D Canvas exporter (`drawEngravingOnCanvas`). Uses FNV-1a hashing + Mulberry32 PRNG (zero `Math.random()`) with memoized caching.
3. **`FaceCard.tsx`** — Layered material renderer (`CardPerspectiveWrapper` → `CardSurface` → `MaterialBase`, `AmbientMaterialLighting`, `ProceduralEngraving`, `MicroGrainTexture`, `MaterialFinish`, `CardContent`, `DynamicSpecularReflection`, `EdgeHighlight`).

## Tier Specifications

| Tier | Material | Highlight | Midtone | Shadow | Typography | Edge |
|---|---|---|---|---|---|---|
| `CLASSIC` | Lilac Satin | `#ECDDEB` | `#D5BDD9` | `#AD91BD` | `#43314E` | `#F8ECFA` |
| `GOLD` | Brushed Champagne | `#F5E9CD` | `#DCC69B` | `#AE8B49` | `#58411F` | `#FFF5D9` |
| `PLATINUM` | Pearlescent Silver | `#F6F3F5` | `#D7D1DE` | `#A3A1AF` | `#3C3744` | `#FFFFFF` |
| `BLACK` | Velvet Matte | `#463440` | `#30232F` | `#151116` | `#F0DFEA` | `#877080` |

All tiers retain their signature material colors in both light and dark application themes.

## Adding Future Materials or Variants

- **New Material / Skin**: Add a `TierMaterialSpec` entry in `src/components/card/materials.ts` (or extend `resolveCardMaterial`) specifying `baseGradient`, `ambientLighting`, `finishOverlay`, `engravingDarkOpacity`, `engravingLightOpacity`, and `reflectionRange`.
- **New Variant**: Add a variant key to `FaceCardVariant` in `src/components/card/FaceCard.tsx` and tune `isCompact`, `isExport`, and `isInteractive` flags to match the surface context.
- **Upgrading Engraving Algorithm**: Bump `ENGRAVING_ALGORITHM_VERSION` in `src/components/card/engraving.ts` rather than mutating `contour-v1` so existing issued cards remain visually consistent.
