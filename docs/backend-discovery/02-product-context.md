# 02 — Complete Product Understanding

## 1. Product Identity: What Face Card Currently Is

Based on repository evidence (`src/app/**`, `src/lib/**`, `prisma/schema.prisma`, `docs/PRD.md`, `docs/PRODUCT.md`), Face Card is a **culturally native Nigerian/diaspora social beauty-gaming web app** built around the meme *"face card never declines"*:

1. **Core Loop (Implemented):**
   - Users (18+) claim a collectible **Face Card** (`FC-XXXX-2026`) with a `@handle` and 4–6 digit PIN, or sign in via Email OTP.
   - Users take a daily portrait selfie (up to **3 point-earning scans/day**, resetting 00:00 `Africa/Lagos` WAT). The image is scored in ephemeral memory on **Photo Craft (30%)**, **Face (45%)**, **Expression (15%)**, and **Aura (10%)** to produce a **0–100 Harmony Index / Lethality Score** and a **Verdict Band** (`HARMLESS`, `SUSPICIOUS`, `DANGEROUS`, `LETHAL`).
   - Scans earn **Points** (`SPENDABLE` + `LIFETIME`), amplified by a **Daily Streak Multiplier** (`×1.0` to `×2.0`). `LIFETIME` points advance the user's card through 4 material tiers: **Classic** (`0`), **Gold** (`1,000`), **Platinum** (`5,000`), and **Black Card** (`20,000`).
   - `SPENDABLE` points are used in the **Points Boutique (`/shop`)** to unlock card skins, titles, foil frames, and consumables (`streak-freeze`, `boost-aura-2x`), or staked in **1v1 Arena Face-Offs (`/faceoff`)** against friends or same-tier contenders.
   - Users can generate public verification links (`/s/[id]`) and 1080×1920 story graphics (`ShareCardModal`) without exposing raw selfies.

2. **Secondary Product Identity (Preview / Intended Expansion): Skincare Commerce ("Atelier")**
   - The landing page (`src/app/page.tsx:179-198`), `BottomNav` (`src/components/navigation/BottomNav.tsx:44,59`), `/shop` banner (`src/app/shop/page.tsx:154-171`), and `/skincare` (`src/app/skincare/page.tsx`) introduce **Atelier** (`"The Skin Edit"` / `"Upcoming Commerce Foundation"`): a **Soft Luxury skincare storefront & personalized routine builder** (`CLEANSERS`, `SERUMS`, `MOISTURIZERS`, `SUN_CARE`, `RITUAL_SETS`, AM/PM routines, skin goals questionnaire, shopping bag, checkout, and order history).
   - **Important:** None of the skincare commerce or personalization features are documented in `docs/PRD.md` or `docs/PRODUCT.md` (which state *"No revenue model decided yet"* in `docs/AUDIT.md:45`). The Atelier was added to the frontend as a design foundation (`src/components/commerce/*`) without any backend, database, or payment integration.

---

## 2. Explicit Product Decisions vs. Inferred Intentions

### Explicit (Verified in Code & Docs)
- **Zero raw selfie storage:** Enforced in `/api/scan/route.ts:161,298` (`imageBase64 = ''`) and `src/lib/logger.ts` (`scrubImageData`).
- **18+ Age Gate & NDPA Consent:** Required on `User.ageConfirmedAt` and `User.consentAt` (`src/app/api/scan/route.ts:90-109`, `src/app/api/consent/route.ts`).
- **Strict In-App Points Economy:** Points cannot be bought with fiat (`src/lib/paystack.ts:34-36`), cannot go negative (`PointsLedger` + DB `CHECK` constraint), and `LIFETIME` points never decrease (`src/lib/ledger.ts:57-59`).
- **Same-Tier Arena Matchmaking:** Staked and open Arena duels require `challenger.tier === opponent.tier` (`src/lib/faceoff.ts:87,170`).
- **Two Separate Shops in UI:** `/shop` ("Boutique" for digital card cosmetics & perks using `PTS`) vs `/skincare` ("Atelier" preview for physical skincare formulations).

### Inferred Product Intentions (From Unwired UI / Partial Code)
- **Physical Skincare Monetization:** `src/app/skincare/page.tsx` and `src/components/commerce/*` imply Face Card intends to monetize via **curated skincare retail** connected to scan telemetry (`Skin Clarity & Glow` -> product recommendations & AM/PM routines).
- **Fiat Cosmetics / Subscriptions:** `src/lib/paystack.ts:10` defines `itemType: 'COSMETIC' | 'PRACTICE_SCANS' | 'MEMBERSHIP'` in Naira/kobo (`amountInKobo`), implying planned Paystack NGN monetization for cosmetics, practice scans, or memberships.
- **Referral & Social Gifting Loops:** `/friends/add` (`src/app/friends/add/page.tsx:110-120`) displays a personal invite code and promises `+100 PTS` per friend signup; `/friends/[id]` (`src/app/friends/[id]/page.tsx:183-194`) has a mocked `Send 50 PTS Boost` button.

---

## 3. Contradictions Between Documentation and Implementation

| Topic | Documentation (`docs/PRD.md`, `docs/AUDIT.md`) | Actual Codebase |
|---|---|---|
| **Visual Design System** | `PRD.md` & `STYLE.md` specify Orla AI palette (`#E8D744`, `#B3BFF0`, `#D9628E`, `#F2A6A2`, Switzer font). | `src/lib/tokens.ts` & `globals.css` use **Soft Luxury** palette (`#FAF7F4` Porcelain, `#EBDCD5` Skin Nude, `#D2B8C9` Dusty Mauve, `#251E24` Black Plum, `Plus Jakarta Sans` / `Manrope`). |
| **Signup Grant** | `PRD.md` §6.1: *"New accounts: points are unspendable for 24h or until 3 scans."* | `EconomyConfig.SIGNUP_GRANT_POINTS = 100` (`src/lib/economy.ts:9`) immediately credits 100 spendable + 100 lifetime PTS on claim/OTP signup with no 24h lock. |
| **Black Card Threshold** | `EconomyConfig.TIERS.BLACK.minPoints = 20000` (`src/lib/economy.ts:33`) & `PRD.md` §6.3 (`20,000`). | `/api/card/route.ts:80,169,184` hardcodes `nextTierTarget = 10000` (`10,000 PTS` for Black Card). |
| **Verdict Bands & Tiers in `spikes.ts`** | `scoring.ts`: `85+ LETHAL`, `65-84 DANGEROUS`, `40-64 SUSPICIOUS`, `<40 HARMLESS`. | `src/lib/spikes/spikes.ts:69-78` uses `90+ LETHAL`, `80+ DANGEROUS`, `60+ SUSPICIOUS` and derives `Tier` from scan score instead of lifetime points. |
| **Arena Attempts** | `EconomyConfig.ARENA.ATTEMPTS_PER_DUEL = 3` (`src/lib/economy.ts:43`). | `src/app/scan/page.tsx:594` displays `Attempt X/2` ("Take 2nd Attempt"). |
| **Avatar Storage** | `PRD.md`: fixed stylized avatar set; no photo storage. | `POST /api/profile/avatar` (`src/app/api/profile/avatar/route.ts`) & `/profile` allow uploading arbitrary custom photos up to 4MB as base64 data URLs stored in `User.avatarUrl`. |
