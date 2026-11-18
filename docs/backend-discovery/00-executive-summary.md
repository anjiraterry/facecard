# 00 — Executive Summary

> **Audit Target:** `facecard` repository (`package.json` v0.1.0)
> **Audit Date:** 2026-11-18
> **Nature:** Evidence-based product, architecture, security, and backend discovery audit.

---

## 1. High-Level Verdict

Face Card is a **Next.js 16.4.0** full-stack web application (configured for **Cloudflare Workers** via `@opennextjs/cloudflare` and **Neon Lakebase Postgres** via Prisma 7.10.0) that combines:

1. **Implemented Core Loop (Social Portrait Scoring & Progression):**
   - Custom **PIN + Handle/Card Number** and **Email 6-digit OTP** authentication backed by opaque SHA-256-hashed server sessions (`AuthSession`) in Postgres (`src/lib/auth/sessions.ts`, `src/app/api/card/claim/route.ts`, `src/app/api/auth/otp/verify/route.ts`, `src/app/api/auth/pin-login/route.ts`).
   - Ephemeral **Portrait Scan & Rating Engine** (`src/app/api/scan/route.ts`, `src/lib/rating/engine.ts`) with a byte-level quality gate, optional **Neon AI Gateway** (`gpt-4o-mini`) vision call, deterministic SHA-256 fallback scoring, daily 3-scan cap (`ScanSlot` in `Africa/Lagos` WAT), and append-only double-entry **Points Ledger** (`PointsLedger` with `SPENDABLE` and `LIFETIME` balances).
   - **Collectible Digital Face Cards** (`Card`, `src/components/card/FaceCard.tsx`) with 4 progression tiers (`CLASSIC`, `GOLD`, `PLATINUM`, `BLACK`), procedural SVG/Canvas contour engraving (`src/components/card/engraving.ts`), and public share cards (`/s/[id]`, `/api/share-cards`, `/api/og`).
   - **Points Boutique (`/shop`)**: Functional virtual cosmetics & perks store (`ShopItem`, `UserItem`, `Purchase`) supporting skins, titles, frames, and `streak-freeze` / `boost-aura-2x` consumables.
   - **Face-Off Arena (`/faceoff`)**: Staked (5% system fee) and Friendly 1v1 portrait duels (`FaceOff`, `FaceOffAttempt`) with invite codes, same-tier matchmaking, tie rematches, and cron/on-read expiry.
   - **Circle & Leaderboard (`/friends`, `/leaderboard`)**: Friend relationships stored in `AuditLog` (`action: 'ADD_FRIEND'`), public contender profiles (`/friends/[id]`, `/u/[id]`), and a global top-50 lifetime-points leaderboard.

2. **Preview-Only / Unimplemented Subsystems:**
   - **The Atelier (`/skincare`, `src/components/commerce/*`)**: Explicitly a **"Storefront Design Foundation (Preview Only)"** for physical skincare commerce, personalized AM/PM routines, skin profile questionnaires, shopping bag, checkout, and order history. **Zero backend APIs, zero database models, zero inventory, and zero checkout/payment integration exist for the Atelier.**
   - **Unused Infrastructure Stubs:** `src/lib/paystack.ts` (Paystack checkout/webhook helpers), `src/lib/storage.ts` (S3 presigned URLs), `src/lib/aiGateway.ts` (generic AI gateway client), and `hello.ts` (Neon Functions starter) exist in the repo but are not wired into any active route.
   - **Mocked/Incomplete UI Interactions:** Point gifting on `/friends/[id]` (`handleGiftPoints` uses `setTimeout`), friend removal on `/profile` (local state only), leaderboard `Circle`/`This Week` tabs (UI-only, same global payload), referral bonus copy (`FC-8821-ATELIER` / `+100 PTS` on `/friends/add`), and `boost-aura-2x` consumable (purchasable in `/shop`, never applied in `/api/scan`).

---

## 2. Quantitative Inventory Summary

| Metric | Count | Notes |
|---|---:|---|
| **App Router Page Routes** | 21 | Including 2 redirect pages (`/landing`, `/start`, `/auth` -> 3 redirects) and 1 alias (`/u/[id]`) |
| **API Route Files** | 27 | Covering 31 HTTP handlers + `/api/auth/[...path]` Neon Auth catch-all |
| **Prisma Database Models** | 16 | Plus 10 Postgres enums; 3 migrations (`0_init`, `1_auth_sessions`, `2_points_integrity`) |
| **Feature Groups** | 12 | Spanning Auth, Scan, Cards, Progression, Boutique, Atelier, Arena, Social, Leaderboard, Sharing, Ops, Security |
| **Identified Backend Gaps** | 28 | Grouped across Commerce/Atelier, Skincare Intelligence, Payments, Social, Moderation, Admin, Security |
| **Security Findings** | 14 | 3 P0 (Critical), 5 P1 (High), 4 P2 (Medium), 2 P3 (Low) |
| **Open Product Decisions** | 18 | Required before designing final Atelier, Commerce, Card, and Arena schemas |

---

## 3. Critical Architectural & Security Highlights

- **Dual Auth Stack:** `@neondatabase/auth` is mounted at `/api/auth/[...path]` (`src/lib/auth/server.ts`) and exported in `src/lib/auth/client.ts`, but **none of the application's routes or pages use it**. All active auth flows use custom `fc_session` cookies (`src/lib/auth/sessions.ts`), `OtpChallenge`, and `User.pinHash`.
- **P0 Security Issues:**
  1. `DELETE /api/share-cards/[id]` (`src/app/api/share-cards/[id]/route.ts:54-80`) has **no authentication or ownership check** — anyone can delete any share card.
  2. `GET /api/scans/[id]` (`src/app/api/scans/[id]/route.ts:6-68`) has **no authentication or ownership check** — any scan UUID can be read publicly.
  3. `PATCH /api/me` (`src/app/api/me/route.ts:99-128`) allows updating `User.email` **without OTP verification**, bypassing `/api/auth/link-email` ownership proof.
- **Scoring & Anti-Spoof Integrity:**
  - `scoreFace()` (`src/lib/rating/engine.ts:344-486`) falls back to deterministic SHA-256 hash-based scoring (70–96) when `NEON_AI_GATEWAY_*` is unset or times out.
  - Client-side `LivenessOverlay` (`src/components/camera/LivenessOverlay.tsx:241,315`) allows tapping the card or clicking `Skip Action →`, and `/api/scan` never enforces liveness.
- **Schema Drift:** `User.avatarUrl` exists in `prisma/schema.prisma:97` and is queried/written by APIs, but is absent from `prisma/migrations/0_init/migration.sql`.

---

## 4. Reading Guide for External Architects

- Start with **[MASTER-CONTEXT.md](./MASTER-CONTEXT.md)** for the complete self-contained architectural handoff.
- Use **[05-atelier-deep-audit.md](./05-atelier-deep-audit.md)**, **[15-commerce-and-payments.md](./15-commerce-and-payments.md)**, and **[16-skincare-and-personalisation.md](./16-skincare-and-personalisation.md)** for Atelier & skincare commerce design.
- Use **[12-existing-database-schema.md](./12-existing-database-schema.md)**, **[13-existing-api-contracts.md](./13-existing-api-contracts.md)**, and **[21-domain-entity-catalogue.md](./21-domain-entity-catalogue.md)** for database and API design.
- Machine-readable JSON files in `docs/backend-discovery/machine-readable/` link routes, features, entities, APIs, gaps, dependencies, and open decisions by stable IDs.
