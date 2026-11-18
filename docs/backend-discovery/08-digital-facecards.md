# 08 — Digital Face Cards Subsystem

## 1. Card Identity, Ownership & Multiplicity

- **Database Model (`Card`, `prisma/schema.prisma:231-247`):**
  - `id` (UUID), `userId` (UUID FK), `cardNumber` (`@unique`, e.g. `FC-8492-2026` or `FC-${3-hex-bytes}-2026`), `equippedSkinId`, `equippedTitleId`, `equippedFrameId`, `slot` (`Int @default(1)`), `createdAt`.
- **Multiplicity:** Although `User.cards` is a one-to-many relation (`Card[]`) and `Card.slot` exists, **every API route (`card/route.ts:44`, `me/route.ts:44`, `shop/route.ts:32`, `shop/equip/route.ts:36`, `pin-login/route.ts:92`) only ever reads or updates `user.cards[0]`**. There is no UI or API to create or switch additional card slots.
- **Card Tier vs. Card Model:** `tier` (`CLASSIC`, `GOLD`, `PLATINUM`, `BLACK`) is stored on `User.tier`, **not** on `Card`. When `User.lifetimePoints` crosses a threshold in `postLedger()`, `User.tier` upgrades automatically (and never downgrades).

## 2. Materials, Skins, Frames & Procedural Engraving

- **Materials (`src/components/card/materials.ts`):**
  - ID-1 aspect ratio (`856 / 540`), export resolution `1712 × 1080`.
  - 4 base tier materials (`TIER_MATERIALS`): `CLASSIC` (Lilac Satin), `GOLD` (Brushed Champagne), `PLATINUM` (Pearlescent Silver), `BLACK` (Velvet Matte).
  - `resolveCardMaterial(tier, skinId, frameId)` (`materials.ts:181-214`) applies cosmetic overrides by substring matching (`skinId.includes('lavender' | 'mauve' | 'black')`, `frameId.includes('solar' | 'flare' | 'gold')`).
- **Procedural Engraving (`src/components/card/engraving.ts`):**
  - Pure frontend deterministic SVG/Canvas generator (`ENGRAVING_ALGORITHM_VERSION = 'contour-v2'`).
  - Seeded from `card.id || card.cardNumber || card.handle || card.cardholderName` via FNV-1a 32-bit hash + Mulberry32 PRNG.
  - Renders 28–37 primary S-ribbon Bézier curves + 7–11 secondary arcs. **No persistence needed** — deterministically recomputed on client and in `ShareCardModal` Canvas export.
- **Interactive Rendering (`src/components/card/FaceCard.tsx`):**
  - 3D pointer tilt (`±6°` rotateX/Y), layered parallax, CSS custom property specular reflection (`--pointer-x`, `--pointer-y`, `--light-angle`). Disabled on `compact`, `export`, `arena` variants or `prefers-reduced-motion`.

## 3. Sharing & Public Verification

- **Share Flow (`ShareCardModal.tsx`, `POST /api/share-cards`, `/s/[id]`, `/api/og`):**
  - Opening `ShareCardModal` calls `POST /api/share-cards` to create a `ShareCard` record (`publicId: sc_<ts>_<rand>`, 30-day `expiresAt`, `blobKey: publicId`).
  - Renders a `1080×1920` story PNG client-side on `<canvas>` for download/Web Share. **Note:** Nothing is uploaded to R2/S3 (`blobKey` is unused; `/s/[id]` and `/api/og` render dynamically from DB `User` + latest `Scan`).
  - **Contradiction:** `ShareCard` has `expiresAt`, but `GET /api/share-cards/[id]` and `/s/[id]` **never check `expiresAt <= now` or `deletedAt != null`**!
  - **Tier Threshold Contradiction:** `EconomyConfig.TIERS.BLACK.minPoints` is `20,000` (`src/lib/economy.ts:33`), while `GET /api/card/route.ts:80,169,184` displays `10,000 PTS` for Black Card.
  - **Historical Card Versions:** `GET /api/card/route.ts:87-191` constructs synthetic "Surpassed" / "Locked" preview cards for the 4-tier carousel using current user handle + capped/mock scores (`Math.min(score, 72)` for Classic, `88` for Platinum, `95` for Black). Actual historical card snapshots are not stored.
