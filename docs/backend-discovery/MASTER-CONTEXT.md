# Face Card — Master Backend & Architecture Context Package

> **Purpose:** Self-contained technical and product handoff for an external software/database architect with no direct repository access. Every claim is grounded in inspected source files (`facecard` repo, `package.json` v0.1.0, audited 2026-11-18).

---

## 1. Comprehensive Product Summary

Face Card is a **Next.js 16.4.0** social beauty-gaming and planned skincare commerce web application targeting Nigerians (18+) and the diaspora:
- **Implemented Core Loop:** Users claim a collectible **Face Card** (`FC-XXXX-2026`) with a `@handle` and 4–6 digit PIN (or Email OTP), take daily portrait selfies (max 3/day resetting 00:00 `Africa/Lagos` WAT) scored 0–100 on Photo Craft (30%), Face (45%), Expression (15%), and Aura (10%), earn `SPENDABLE` and `LIFETIME` points with streak multipliers (`×1.0` to `×2.0`), level up through 4 card tiers (`CLASSIC`, `GOLD`, `PLATINUM`, `BLACK`), buy digital cosmetics/perks in the **Points Boutique (`/shop`)**, duel 1v1 in the **Arena (`/faceoff`)** (Staked with 5% fee or Friendly), and share public verification cards (`/s/[id]`).
- **Planned / Preview-Only Expansion — The Atelier (`/skincare`):** A Soft Luxury **physical skincare storefront and personalized routine builder** (`src/app/skincare/page.tsx`, `src/components/commerce/*`) with 7 preview views (`CATALOGUE`, `PDP`, `QUESTIONNAIRE`, `ROUTINES`, `BAG`, `CHECKOUT`, `ORDERS`). It has **zero backend APIs, zero DB models, zero inventory, and zero payment integration**.

---

## 2. Verified System Architecture

- **Topology:** Single-package Next.js 16 App Router monolith (`src/app/`), configured for **Cloudflare Workers** via `@opennextjs/cloudflare` (`wrangler.jsonc`, `open-next.config.ts`) and **Neon Lakebase Postgres** via Prisma 7.10.0 (`@prisma/adapter-pg` + `pg` + `HYPERDRIVE` fallback in `src/lib/db.ts`).
- **External Integrations:**
  - **Neon AI Gateway** (`NEON_AI_GATEWAY_BASE_URL` + `NEON_AI_GATEWAY_TOKEN`): Called in `src/lib/rating/engine.ts:291-339` (`gpt-4o-mini`, 6s timeout). Falls back silently to SHA-256 hash scoring if unset or timed out.
  - **Brevo SMTP API** (`BREVO_API_KEY`): Called in `src/lib/spikes/spikes.ts:147-186` for 6-digit OTP emails (returns `devCode` in non-prod if unset).
  - **MediaPipe Tasks Vision** (`@mediapipe/tasks-vision` `1.1.1`): Client-side WASM `FaceLandmarker` loaded from CDN in `src/lib/vision/liveness.ts`.
  - **Unused Stubs:** `@neondatabase/auth` (mounted at `/api/auth/[...path]`, unused), `src/lib/paystack.ts` (unused), `src/lib/storage.ts` (S3/R2 presigner, unused), `src/lib/aiGateway.ts` (unused), `hello.ts` (Neon Functions starter, unused).

---

## 3. Technology Stack

- **Frontend:** Next.js `16.4.0`, React `19.3.0`, TypeScript `^5` (`strict: true`), Tailwind CSS `^4`, Framer Motion `^14.1.0`, Lucide React `^1.55.0`, `@tanstack/react-query` `^5.104.2` (mounted, hooks use raw `fetch`), `@mediapipe/tasks-vision` `^1.1.1`.
- **Backend & Data:** Next.js Route Handlers, Prisma `^7.10.0`, `@prisma/adapter-pg`, `pg`, `pg-cloudflare`, `zod` `^3.25.76` (installed, mostly manual validation used).
- **Testing & CI:** Vitest `^2.1.9`, ESLint `^9`, GitHub Actions (`.github/workflows/ci.yml`: `tsc`, `eslint`, `vitest`, `opennextjs-cloudflare build`).

---

## 4. Complete Feature Coverage Summary

| Domain | Status | Notes |
|---|---|---|
| Auth (PIN + Handle/Card, Email OTP, Sessions) | **Implemented** | `PATCH /api/me` email bypass (P0); unused Neon Auth |
| Portrait Scan & Scoring | **Partially Implemented** | SHA-256 fallback; client liveness skippable; `boost-aura-2x` unused |
| Digital Face Cards & Sharing | **Partially Implemented** | 10k vs 20k Black threshold; `DELETE /api/share-cards/[id]` unauth (P0); expiry ignored |
| Points Ledger & Streaks | **Implemented** | Append-only DB trigger + `CHECK` constraints |
| Points Boutique (`/shop`) | **Partially Implemented** | Fallback idempotency key blocks 2nd `streak-freeze` |
| **Atelier (`/skincare`)** | **Frontend-only Preview** | Zero backend, zero DB, zero payments |
| Arena Duels (`/faceoff`) | **Implemented** | 2nd player locked after 1st scan; infinite tie rematches |
| Social & Leaderboards | **Partially Implemented** | `AuditLog` friendships; gifting/referrals mocked; leaderboard tabs dead |
| Admin, Moderation & Paystack | **Missing** | `AbuseFlag`, `EconomyConfig`, `paystack.ts` exist but unused |

---

## 5. All Existing Routes (21 Page Files)

- **Public/Auth:** `/` (`page.tsx`), `/landing` (→ `/`), `/start` (→ `/onboarding`), `/auth` (→ `/sign-in`), `/onboarding`, `/sign-in`, `/verify`, `/s/[id]` (public share card), `/arena/invite/[code]` (public duel invite).
- **Core App:** `/home`, `/card`, `/scan`, `/shop`, `/skincare` (Atelier preview), `/faceoff`, `/faceoff/[id]`, `/friends`, `/friends/add`, `/friends/[id]`, `/u/[id]` (alias), `/leaderboard`, `/profile`.
- **Missing:** `/skincare/*` subroutes, `/admin/*`, `/privacy`, `/terms`, `not-found.tsx`, `error.tsx`.

---

## 6. Important Frontend Data Contracts

- `src/types/index.ts`: `Tier` (`CLASSIC|GOLD|PLATINUM|BLACK`), `Band` (`HARMLESS|SUSPICIOUS|DANGEROUS|LETHAL`), `ToneMode` (`HYPE|SMOOTH|ROAST|STRAIGHT`), `FaceOffMode`, `FaceOffStatus`, `CategoryBreakdown`, `LethalityResult`, `FaceCardData`.
- `src/components/commerce/types.ts`: `CommerceCategory`, `SkincareProductSpec`, `BagLineItem`, `OrderRecordPlaceholder`, `RoutineStepSlot`.
- `src/services/apiClient.ts`: Auto-attaches `credentials: 'include'` and `Idempotency-Key` on mutating requests.

---

## 7. Atelier Requirements & Interactions

- **UI Views (`src/app/skincare/page.tsx`):** `CATALOGUE`, `PDP`, `QUESTIONNAIRE` (step `02 / 04`, 6 skin goals), `ROUTINES` (6 AM/PM slots), `BAG`, `CHECKOUT`, `ORDERS`.
- **Required Backend Capabilities:**
  1. Product Catalog API (categories, search, variants/volumes, ingredients/keyNotes, suitability, stock, NGN/minor-unit pricing).
  2. Voluntary Skin Profile & Consent persistence (`selectedGoals`, skin type, allergies).
  3. Skincare Recommendation Engine linking `Scan.categoryScores.skinClarity` + `SkinProfile` to AM/PM `RoutineStep`s (strictly separated from entertainment `Lethality` scoring).
  4. Persistent Shopping Bag, Atomic Stock Reservation, Shipping Address, Checkout, Paystack Initialization + Webhook Verification, Order History & Fulfilment.

---

## 8. Existing Database Schema (`prisma/schema.prisma`)

16 models: `User`, `AuthSession`, `OtpChallenge`, `AuthAttempt`, `ScanSlot`, `Scan`, `PointsLedger`, `Streak`, `Card`, `ShopItem`, `UserItem`, `Purchase`, `FaceOff`, `FaceOffAttempt`, `ShareCard`, `IdempotencyRecord`, `EconomyConfig` (unused), `AbuseFlag` (unused), `AuditLog` (overloaded for `ADD_FRIEND`).
- **Drift:** `User.avatarUrl` is in `schema.prisma:97` but missing from `0_init/migration.sql`.
- **Triggers/Constraints (`migration 2_points_integrity`):** `User_spendableBalance_nonneg`, `User_lifetimePoints_nonneg`, `PointsLedger_append_only` (`BEFORE UPDATE OR DELETE` trigger).

---

## 9. Existing API Architecture (27 Route Files)

- **Auth:** `/api/auth/[...path]` (Neon Auth, unused), `/api/card/claim`, `/api/auth/pin-login`, `/api/auth/otp/send`, `/api/auth/otp/verify`, `/api/auth/link-email`, `/api/auth/session/refresh`, `/api/auth/signout`.
- **User/Profile:** `/api/me` (`GET, PATCH, POST, DELETE`), `/api/consent`, `/api/profile/avatar`.
- **Cards/Points/Scans:** `/api/card`, `/api/points`, `/api/scan`, `/api/scans`, `/api/scans/[id]`, `/api/rating/fairness`.
- **Boutique:** `/api/shop`, `/api/shop/items`, `/api/shop/purchase`, `/api/shop/equip`.
- **Arena/Social/Share/Ops:** `/api/faceoffs`, `/api/faceoffs/[id]`, `/api/faceoffs/[id]/join`, `/api/faceoffs/invite/[code]`, `/api/friends`, `/api/friends/[id]`, `/api/leaderboard`, `/api/share-cards`, `/api/share-cards/[id]`, `/api/og`, `/api/health`, `/api/cron/reconcile`.

---

## 10. Critical Business Rules & Invariants

- **Implemented:** `LIFETIME` points never decrease; `SPENDABLE` balance never `< 0`; `PointsLedger` is append-only; 3 `SOLO` scans/day (`Africa/Lagos`); 5 duels/day; same-tier matchmaking in Arena; 5% system fee on staked Arena pots; no fiat purchase of `PTS` (`paystack.ts:34`).
- **Contradictions:** Black Card threshold (`20,000` in `EconomyConfig` vs `10,000` in `/api/card`); `spikes.ts` band/tier formulas vs `scoring.ts`; Arena `ATTEMPTS_PER_DUEL = 3` vs `/scan` UI `X/2`.

---

## 11. Authentication & Authorisation

- Active auth uses opaque 32-byte tokens in `fc_session` `HttpOnly` cookie, hashed with SHA-256 in `AuthSession`.
- **Critical AuthZ Bugs:** `DELETE /api/share-cards/[id]` (no auth), `GET /api/scans/[id]` (no auth), `PATCH /api/me` (unverified email overwrite).

---

## 12. Cross-Domain Dependencies

- `Scan` → `PointsLedger` → `User.tier` (`Card`) → `Shop` & `Arena` eligibility.
- `Shop` (`streak-freeze`) → `Scan` streak protection.
- `Arena` → `Scan` (`ScanSource.FACEOFF`, `FaceOffAttempt`).
- **Proposed:** `Scan` (`skinClarity`) + `SkinProfile` → `Atelier` recommendations → `Paystack` → `Orders`.

---

## 13. Commerce Requirements (Atelier)

- Full product catalog (`AtelierProduct`, `ProductVariant`, `Ingredient`), inventory locking, bag, checkout, shipping, Paystack NGN/kobo webhooks, order state machine, refunds, and NDPA PII anonymization.

---

## 14. Rewards & Progression

- Signup grant: `100` PTS. Scan points: `round(score * (1.0 | 0.5) * streakMultiplier)`. Streak ladder: `1d: 1.0x`, `3d: 1.1x`, `7d: 1.25x`, `14d: 1.5x`, `30d: 2.0x`. Arena win bonus: `25` PTS.
- Missing: `boost-aura-2x` scan multiplier logic, referral rewards, achievement system.

---

## 15. Security & Privacy Constraints

- **P0s:** `DELETE /api/share-cards/[id]`, `GET /api/scans/[id]`, `PATCH /api/me` email bypass.
- **P1s:** Liveness bypass/client trust, `paystack.ts` empty-secret webhook bypass, unvalidated `User.avatarUrl` base64 storage & omission from `DELETE /api/me`, hardcoded `NEON_AUTH_COOKIE_SECRET` fallback.
- **NDPA:** Zero raw selfie storage in `/scan`; must extend deletion/consent governance to `User.avatarUrl` and future Atelier `SkinProfile` / `Order` PII.

---

## 16. Existing Technical Limitations

- `GET /api/friends` full-table user scan without pagination.
- `expireStaleDuels()` runs on every `GET /api/faceoffs` instead of solely on Cloudflare Cron.
- 4MB base64 avatars stored in Postgres `User.avatarUrl` instead of R2/S3.
- `@tanstack/react-query` unused by hooks; `zod` unused by routes.

---

## 17. Missing Backend Capabilities

See `20-backend-gap-analysis.md` and `machine-readable/backend-gaps.json` (`GAP-SEC-01..03`, `GAP-ATELIER-01..03`, `GAP-PAY-01`, `GAP-SKIN-01`, `GAP-SCAN-01`, `GAP-SHOP-01`, `GAP-SOC-01`, `GAP-LB-01`, `GAP-ADMIN-01`, `GAP-OPS-01`).

---

## 18. Architectural Constraints

- Cloudflare Workers (`nodejs_compat`, Hyperdrive, no native C++ addons), Neon Postgres (`PointsLedger_append_only` trigger), `Africa/Lagos` daily resets, NDPA tombstoning (`User.status = 'DELETED'`), no fiat-for-points.

---

## 19. Provisional Entity Requirements

`AtelierProduct`, `ProductVariant`, `Ingredient`, `SkinProfile`, `SkincareRoutine`, `RoutineStep`, `ShoppingBag`, `BagItem`, `Order`, `OrderItem`, `PaymentTransaction`, `Friendship`, `Referral`.

---

## 20. Unresolved Product Decisions

18 open decisions (`DEC-01` through `DEC-18` in `22-product-decision-register.md`), notably: Atelier retail model (1P vs 3P), currency/regions, points-to-Atelier interaction, guest checkout, Black Card threshold (10k vs 20k), auth stack consolidation, AI fallback policy, and Arena 2nd-player retake locking.

---

## 21. Relevant Source References

Full file-by-file index in `24-evidence-index.md`.
