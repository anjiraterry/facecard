# Face Card — Project Context & Codebase Audit Report

> **Audit Date:** October 14, 2026  
> **Environment:** Windows (Node.js v24.6.0, npm 11.5.1)  
> **Target Output:** `docs/project-context.md`  
> **Status:** Pre-Build Architectural & Readiness Audit Complete  

---

## 1. Snapshot
1. **Face Card** is a mobile-first social progression web application where users convert selfies into collectible tiered "Facecards" evaluated on a calibrated 0–100 Lethality index.
2. The core engagement loop enforces a 3-scan daily cap resetting at Lagos (WAT) midnight, feeding points into an append-only dual-balance ledger with streak multipliers.
3. Cards advance across four metallic finishes (Classic, Gold, Platinum, Black Card) and are customizable using cosmetics purchased with earned points in the shop.
4. Social competition is driven by peer-to-peer Face-Off duels (staked and friendly modes with an escrow pot and 5% fee burn) alongside device-rendered viral share cards.
5. The system is designed with an uncompromising zero-selfie-retention privacy policy (raw images exist in volatile memory only and are discarded immediately after inference).

---

## 2. Stack and Versions

| Component / Layer | Specification / Version in Codebase | Lockfile / Installed Version | Notes & Status |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js `16.4.0` | `next@16.4.0` | App Router with Turbopack, uses Next 16 `proxy.ts` convention |
| **UI Library** | React `19.3.0` / React-DOM `19.3.0` | `react@19.3.0`, `react-dom@19.3.0` | React 19 baseline |
| **Language** | TypeScript `^5` | `typescript@5.9.3` | Strict mode enabled, `tsc --noEmit` passes with 0 errors |
| **Runtime** | Node.js | `v24.6.0` | Active system Node version |
| **Package Manager** | npm | `11.5.1` | `package-lock.json` (v3 lockfile, 532 KB) |
| **Styling** | Tailwind CSS `^4` | `tailwindcss@4.3.3`, `@tailwindcss/turbopack@4.3.3` | Configured directly in CSS via `@theme` |
| **Database ORM** | Prisma `^7.10.0` | `prisma@7.10.0`, `@prisma/client@7.10.0` | Configured with `adapter-neon` in `src/lib/db.ts` |
| **Database Driver** | `@prisma/adapter-neon` `^7.10.0` | `@prisma/adapter-neon@7.10.0` | Serverless WebSocket/HTTP pooler adapter |
| **Database Host** | Neon Lakebase Postgres | Serverless Postgres (`us-east-2`) | Project `proud-sunset-14399858`, branch `production` |
| **Auth Library** | `@neondatabase/auth` `^0.6.0-beta` | `@neondatabase/auth@0.6.0-beta` | Managed Better Auth on Neon branch |
| **Object Storage SDK** | `@aws-sdk/client-s3` `^3.1150.0` | `3.1150.0` | Presigned URL client configured in `src/lib/storage.ts` |
| **AI Gateway** | Neon AI Gateway (`@neon/config`, `@neon/env`) | `@neon/config@1.9.1`, `@neon/env@1.6.1` | Integration module in `src/lib/aiGateway.ts` |
| **State / Queries** | `@tanstack/react-query` `^5.104.2` | `5.104.2` | Used for client data management |
| **Motion & Icons** | `framer-motion` `^14.1.0`, `lucide-react` `^1.55.0` | `14.1.0`, `1.55.0` | UI animations and icon library |
| **Forms & Validation** | `react-hook-form` `^7.90.0`, `zod` `^3.25.76` | `7.90.0`, `3.25.76` | Schema validation |
| **Lint Setup** | ESLint `^9`, `eslint-config-next` `16.4.0` | `eslint@9.39.5` | `eslint.config.mjs` (flat config) |
| **Test Setup** | None | None | No test script, runner (vitest/jest), or test files configured |
| **Format Setup** | None | None | No Prettier configuration present |
| **CI/CD Config** | None | None | No `.github/workflows`, `.gitlab-ci.yml`, or CI pipeline |
| **Docs Inventory** | 8 markdown specification docs in `docs/` | Present | See inventory list below |

### Docs Inventory (`/docs`)
- **PRD (`docs/PRD.md`):** Complete (15.5 KB) — Product Requirements Document.
- **Frontend (`docs/FRONTEND.md`):** Complete (17.0 KB) — Mobile-first screens and client architecture.
- **Backend (`docs/BACKEND.md`):** Complete (26.6 KB) — Data models, APIs, and business rules.
- **Design System (`docs/STYLE.md`):** Complete (28.2 KB) — Orla AI design system specification.
- **Project Description (`docs/PRODUCT.md`):** Complete (5.3 KB) — Executive summary and pillars.
- **face-card-ai-rating.md (`docs/AI_RATING.md`):** Complete (18.9 KB) — Rating formula, quality gates, and fairness.
- **face-card-implementation-plan.md (`docs/PLAN.md`):** Complete (21.5 KB) — Phased master plan (Phases 0–11).
- **Audit (`docs/AUDIT.md`):** Complete (16.2 KB) — Spec reconciliation decisions (D1–D15, C1–C14).

---

## 3. Cloudflare Setup

| Parameter / Resource | Current Codebase State | Assessment / Finding |
| :--- | :--- | :--- |
| **Wrangler Config** | **Missing** | No `wrangler.toml`, `wrangler.json`, or `wrangler.jsonc` exists in the repository. |
| **Compatibility Date & Flags** | **Unconfigured** | No compatibility date set; missing `nodejs_compat` flag required for crypto/buffer packages. |
| **Bindings: R2** | **Unbound** | No R2 bucket binding configured (code uses `@aws-sdk/client-s3` pointing to Neon storage endpoint). |
| **Bindings: Hyperdrive** | **Unbound** | Not configured. Code connects directly to Neon connection pooler via `@prisma/adapter-neon`. |
| **Bindings: Workers AI** | **Unbound** | Not configured. AI routing is planned through Neon AI Gateway (`src/lib/aiGateway.ts`). |
| **Bindings: KV / Durable Objects** | **Unbound** | No KV or DO namespaces declared. |
| **Cron Triggers** | **Unbound** | No cron triggers defined in code for midnight sweeps or reconciliation jobs. |
| **OpenNext Config** | **Missing** | No `open-next.config.ts` or `open-next.config.js`. `@opennextjs/cloudflare` is not in `package.json`. |
| **Existing Cloudflare Deploy** | **None** | No Cloudflare Worker deployment exists. Neon backend branch exists (`proud-sunset-14399858`). |
| **Worker Bundle Size** | **Unknown / Unmeasurable** | `opennextjs-cloudflare build` fails because `@opennextjs/cloudflare` is not installed. |

---

## 4. Database

- **Prisma Version:** `7.10.0` (Client: `^7.10.0`, CLI: `^7.10.0`, Adapter: `^7.10.0`).
- **Prisma Generator:** `prisma-client-js` in `prisma/schema.prisma`.
- **Driver Adapter:** `@prisma/adapter-neon` (`PrismaNeon({ connectionString })` instantiated in `src/lib/db.ts`).
- **Connection Method:**
  - Runtime app & API routes: Pooled connection via `DATABASE_URL` (Neon PgBouncer pooler endpoint, `sslmode=require`).
  - Prisma CLI & migrations: Direct URL via `DIRECT_URL` configured in `prisma.config.js`.
- **Neon Region:** `us-east-2` (AWS Ohio, verified in `.env` and `.env.example`).
- **Schema & Migrations:**
  - `prisma/schema.prisma` contains 367 lines defining **16 models** and 8 enums.
  - **No `prisma/migrations/` folder exists.** The schema has only been applied via `prisma db push` or generated locally; formal migration history is missing.
- **Existing Models (16 total):**
  1. `User`: Identity, handle, consent timestamps, cached lifetime and spendable points, tier, status, PIN hash.
  2. `ScanSlot`: Reservation slots for daily scan concurrency.
  3. `Scan`: Scan scores, verdict bands, category breakdowns, prompt/model version, Lagos `dayKey`.
  4. `PointsLedger`: Append-only transactional ledger with `idempotencyKey`, `balanceKind` (LIFETIME/SPENDABLE), and `type`.
  5. `Streak`: Consecutive scan count, longest count, last scan day key, and streak freeze shields.
  6. `Card`: Card number, active skin, title, and frame cosmetics.
  7. `ShopItem`: Cosmetic catalog with item kind, tier gating, price in points, and slug.
  8. `UserItem`: User-owned cosmetics with quantity.
  9. `Purchase`: Purchase audit record with idempotency key.
  10. `FaceOff`: Peer-to-peer duel record with challenger, opponent, invite code, stake, and status.
  11. `FaceOffAttempt`: Individual user scan attempts within a duel.
  12. `ShareCard`: Generated share card record with public ID and blob key.
  13. `IdempotencyRecord`: Generic API idempotency guard.
  14. `EconomyConfig`: Dynamic economic weight and multiplier configuration.
  15. `AbuseFlag`: Security and anti-abuse flag records.
  16. `AuditLog`: General administrative and operational audit trail.

---

## 5. Auth

- **Library:** `@neondatabase/auth` (`0.6.0-beta`) for Managed Neon Auth (Better Auth integration), combined with custom application session cookie and PIN logic.
- **Implemented Auth Flows:**
  1. **Email OTP Request:** `POST /api/auth/otp/send` proxies requests to Neon Auth's endpoint (`${NEON_AUTH_BASE_URL}/email-otp/send-verification-otp`).
  2. **Email OTP Verification:** `POST /api/auth/otp/verify` receives email and a 6-digit code. **Note: Verification is currently a stub/mock.** It checks if the code is 6 digits, but does not validate the code with Neon Auth. It provisions the `User` in Postgres and sets cookies.
  3. **PIN Login:** `POST /api/auth/pin-login` allows fast re-authentication via `@handle` or card number and 4-6 digit numeric PIN, salted and hashed using Node `scrypt`.
  4. **Email Linking:** `POST /api/auth/link-email` links an email address to a newly claimed card.
  5. **Session Refresh & Signout:** `GET /api/auth/session/refresh` and `POST /api/auth/signout`.
- **Email Delivery Provider:**
  - `docs/BACKEND.md` and `docs/PLAN.md` explicitly mandate **Brevo** for email OTP delivery.
  - **Brevo is NOT implemented in code.** Instead, code routes to Neon Auth Managed Service (`auth@mail.myneon.app`). No Brevo API keys or SMTP settings exist in `.env` or source.
- **Session Handling:**
  - Dual HTTP-only cookies: `fc_session` (session token) and `fc_user_id` (User UUID) with 30-day lifetime, `SameSite=lax`, and `secure` in production.
  - Server helper `getSessionUser()` in `src/lib/auth/session.ts` checks direct cookies, Bearer token/`x-user-id` headers, and falls back to `auth.getSession()`.
  - Client mirrors profile data in `localStorage` (`facecard_user`, `fc_user_id`).
- **Middleware / Proxy:**
  - No `middleware.ts` exists. The application uses Next.js 16's official convention `src/proxy.ts`.
  - `src/proxy.ts` guards protected routes (`/home`, `/card`, `/scan`, `/faceoff`, `/arena`, `/profile`, `/shop`, etc.) and redirects unauthenticated users to `/sign-in`.
  - **Node.js Compatibility Flags:** `src/proxy.ts` uses Web standards (`NextRequest`, `NextResponse`), but auth helpers in `src/lib/auth/pin.ts`, `src/lib/auth/session.ts`, and `src/app/api/auth/otp/verify/route.ts` import Node built-ins (`crypto`: `scrypt`, `randomUUID`, `randomBytes`, `timingSafeEqual`; `util`: `promisify`). These will require `nodejs_compat` on Cloudflare Workers.

---

## 6. UI and Design Tokens

### Design System Comparison (Code vs Orla AI Specification)

| Token / Asset | Orla Design System (`docs/STYLE.md`) | Current Implementation (`src/app/globals.css` & `layout.tsx`) | Status / Conflict |
| :--- | :--- | :--- | :--- |
| **Primary Typography** | **Switzer** (Fontshare CDN or self-hosted) | **Montserrat** (`next/font/google` in `layout.tsx`) | **Direct Conflict** |
| **Brand Accent (Primary)** | Warm Gold: `#E8D744` | Clean Obsidian (`#18181B`) & Indigo (`#6366F1`) | **Direct Conflict** ("No Nasty Yellow" comment in CSS) |
| **Brand Accent (Secondary)**| Soft Lavender: `#B3BFF0` | Violet: `#8B5CF6` | **Mismatched** |
| **Brand Accent (Tertiary)** | Warm Magenta: `#D9628E` | Sky Blue: `#38BDF8` | **Mismatched** |
| **Cream Neutral** | `#F8F6F4` | `#F8FAFC` (Slate cream) | Minor shift |
| **Charcoal Neutral** | `#1A1A1A` | `#18181B` (Zinc charcoal) | Minor shift |
| **Muted Neutral** | `#979797` | `#71717A` (Zinc gray) | Minor shift |
| **Pill Badges at Top** | Disliked by user rule | None present on landing page | **Compliant with User Rule** |

### Component Inventory (`src/components/`)
- `card/FaceCard.tsx`: Complete metallic card component with 3D gyroscopic tilt, EMV chip, contactless wave, 4 tier styles, and Black Card specular animation.
- `card/ClaimFaceCardModal.tsx`: Handle selection and PIN setup modal.
- `card/MintFaceCardModal.tsx`: Card generation modal.
- `card/ShareCardModal.tsx`: Preview and share modal with download and clipboard fallbacks.
- `navigation/BottomNav.tsx`: Mobile dock with central glowing scan button and icon states.
- `common/TopStatsBar.tsx`: Header displaying active tier, balance, and streak badge.
- `common/PlayfulBackground.tsx`: Background gradient mesh with particle effects.
- `common/ThemeToggle.tsx`: Light/dark mode toggle.
- `home/ChallengeDuelCard.tsx`: Home duel challenge preview widget.
- `home/LeaderboardPodium.tsx`: Top 3 ranked users podium display.
- `providers/ThemeProvider.tsx` & `QueryProvider.tsx`: Context providers.

### Routes and Pages Inventory (`src/app/`)
- `src/app/page.tsx`: Marketing landing page with live interactive tier preview.
- `src/app/landing/page.tsx`: Secondary landing route.
- `src/app/start/page.tsx`: Onboarding start page with age gate.
- `src/app/sign-in/page.tsx`: Email input and PIN sign-in tab.
- `src/app/verify/page.tsx`: 6-digit OTP code entry screen with timer.
- `src/app/onboarding/page.tsx`: Identity creation and handle selection.
- `src/app/home/page.tsx`: Main user dashboard with quick stats and recent scans.
- `src/app/card/page.tsx`: Detailed card view, tier progress bar, and card controls.
- `src/app/scan/page.tsx`: Real-time camera viewfinder, portrait oval guide, capture button, and result reveal.
- `src/app/shop/page.tsx`: Cosmetic shop grid with tabbed categories and equip actions.
- `src/app/faceoff/page.tsx`: Arena duel lobby, match creator, and active challenges.
- `src/app/arena/invite/[code]/page.tsx`: Dynamic invite landing page for challenge recipients.
- `src/app/leaderboard/page.tsx`: Global and friends ranking table.
- `src/app/profile/page.tsx`: Profile settings, bio, and sign-out.
- `src/app/friends/page.tsx` & `/friends/add/page.tsx` & `/friends/[id]/page.tsx`: Friends list and profiles.
- `src/app/s/[id]/page.tsx`: Public share card display page.

---

## 7. API and Feature Status

The repository contains **34 API route endpoints** under `src/app/api/`:

| Feature Area | Endpoints | Implementation Status |
| :--- | :--- | :--- |
| **Scanning & Scoring** | `POST /api/scan`<br>`GET /api/scans`<br>`GET /api/scans/[id]`<br>`GET /api/rating/fairness` | **Partial / Mocked Engine**.<br>• Route enforces 3 scans/day Lagos cap and ACID database persistence.<br>• Raw image base64 is purged from memory immediately (`delete body.imageBase64`).<br>• Scoring in `src/lib/rating/engine.ts` returns deterministic mock scores; live AI vision inference is not connected. |
| **Points & Ledger** | `GET /api/points` | **Fully Functional**.<br>• Computes funding history (from scans) and spending history (shop purchases and duel escrows).<br>• Uses append-only `PointsLedger` entries with dual `LIFETIME` and `SPENDABLE` balances. |
| **Daily Streaks** | Integrated in `/api/scan` & `/api/points` | **Fully Functional**.<br>• Midnight calculation aligned to Lagos WAT (`getLagosDayKey()`).<br>• Streak multiplier ladder (1.0x to 2.0x) applied to earned points.<br>• Automated streak freeze consumption (holding up to 2 shields). |
| **Cosmetics Shop** | `GET /api/shop`<br>`GET /api/shop/items`<br>`POST /api/shop/purchase`<br>`POST /api/shop/equip` | **Fully Functional**.<br>• 11 catalog items seeded via `prisma/seed.ts`.<br>• Purchases executed in ACID transaction updating `UserItem`, deducting balance, and recording ledger debit.<br>• Streak freeze purchases capped at 2. |
| **Face-Off Arena** | `GET /api/faceoffs`<br>`POST /api/faceoffs`<br>`POST /api/faceoff/create`<br>`POST /api/faceoff/resolve`<br>`GET /api/faceoffs/[id]`<br>`POST /api/faceoffs/[id]/join`<br>`GET /api/faceoffs/invite/[code]` | **Functional**.<br>• Supports Staked and Friendly duels.<br>• Escrow holds points via `FACEOFF_STAKE_HOLD`; resolution calculates 5% system fee and awards pot to winner.<br>• Unique 6-character invite codes generated for challenge links. |
| **Share Cards & OG** | `POST /api/share-cards`<br>`GET /api/share-cards/[id]`<br>`GET /api/og` | **Functional**.<br>• Creates `ShareCard` records with 30-day auto-expiry.<br>• `/api/og` generates dynamic 1200x630 social preview cards using `@vercel/og` (`ImageResponse`). |
| **Identity & Me** | `GET /api/me`<br>`PATCH /api/me`<br>`POST /api/consent` | **Fully Functional**.<br>• Profile updates and age confirmation / biometric consent recording. |
| **Cron / Reconcile** | `GET /api/cron/reconcile` | **Partial**.<br>• Endpoint executes `reconcileLedger()` checking cached vs calculated balances for drift.<br>• Not yet wired to a scheduled cron trigger. |
| **Rate Limiting** | N/A | **Missing**.<br>• No Cloudflare Rate Limiting binding, Upstash Redis, or token bucket implemented.<br>• Only the 3-scans/day database count check is present. |

---

## 8. Build, Test, and Bundle Results

| Step / Command | Exit Code | Result | Output Summary / Error Details |
| :--- | :---: | :---: | :--- |
| **1. Install Check** (`npm ls --depth=0`) | `0` | **PASS** | 27 top-level dependencies verified without missing packages or unmet peer warnings. |
| **2. Lint** (`npm run lint` / `eslint`) | `1` | **FAIL** | **151 problems (38 errors, 113 warnings)**.<br>• Primary error: `react-hooks/set-state-in-effect` (calling setState synchronously in `useEffect`) across `useAuth.ts`, `useCard.ts`, `useFaceoff.ts`, `useFriends.ts`, `useShop.ts`.<br>• Secondary error: `@typescript-eslint/no-explicit-any` across services (`faceoffService.ts`, `friendService.ts`, `scanService.ts`, `ledger.ts`).<br>• Warning: `@next/next/no-location-assign-relative-destination` in `useAuth.ts`. |
| **3. Typecheck** (`npx tsc --noEmit`) | `0` | **PASS** | Completed with **0 TypeScript errors**. |
| **4. Tests** (`npm test`) | `1` | **FAIL** | `npm error Missing script: "test"`. No test suite configured in `package.json`. |
| **5. Next.js Build** (`npm run build`) | `0` | **PASS** | Next.js 16.4.0 Turbopack production build succeeded in 6.4s. 37 routes generated (static and dynamic), Proxy compiled successfully. |
| **6. OpenNext Cloudflare Build** (`opennextjs-cloudflare build`) | `1` | **FAIL** | `npm error could not determine executable to run`. Package `@opennextjs/cloudflare` is not installed in the project. Worker bundle size could not be evaluated. |

---

## 9. Plan Status by Phase

Comparison against `docs/PLAN.md` (Phases 0 through 11):

| Phase & Step | Task Description | Status | Evidence / File Paths |
| :--- | :--- | :---: | :--- |
| **Phase 0: Decisions & Accounts** | | | |
| 0.1 | Reconcile Documentation | **Done** | `docs/PRD.md`, `docs/FRONTEND.md`, `docs/BACKEND.md`, `docs/STYLE.md`, `docs/AI_RATING.md`, `docs/AUDIT.md`, `docs/PLAN.md` |
| 0.2 | Vision Provider Selection | **Partial** | `src/lib/aiGateway.ts` configured for Neon AI Gateway; formal provider bake-off undocumented |
| 0.3 | Provision Cloudflare & Neon | **Partial** | Neon project active (`.neon`); Cloudflare Workers, R2, Brevo, and Turnstile not provisioned |
| 0.4 | Legal Groundwork | **Partial** | Consent fields on `User` model, `src/app/api/consent/route.ts`; formal NDPA legal texts not written |
| 0.5 | Economy Pacing Simulation | **Partial** | Constants defined in `src/lib/economy.ts`; mathematical spreadsheet simulation undocumented |
| 0.6 | Calibration Dataset Setup | **Missing** | No offline dataset of diverse Nigerian skin tones / hair types in repository |
| 0.7 | Paystack Registration | **Missing** | No Paystack integration or credentials present |
| **Phase 1: Platform Foundation & Spikes** | | | |
| 1.1 | Next.js 16 Scaffold | **Done** | `package.json` (`next@16.4.0`), `next.config.ts`, `src/app/` |
| 1.2 | Database & Prisma Integration | **Done** | `src/lib/db.ts`, `prisma/schema.prisma`, `src/app/api/health/route.ts` |
| 1.3 | CI/CD & Branch Previews | **Missing** | No `.github/workflows` present |
| 1.4 | Technical Spikes (S1–S5) | **Missing** | S1 (Workers bundle), S2 (WASM codecs), S3 (Rate limiting), S4 (Dynamic OG Workers), S5 (Brevo delivery) not recorded |
| 1.5 | Observability | **Partial** | Console logging present; structured JSON scrubber and Sentry integration missing |
| **Phase 2: Design System & Shell** | | | |
| 2.1 | Token Layer & Typography | **Partial / Conflict** | `src/app/globals.css` implements Obsidian & Indigo instead of Switzer + Orla Gold/Lavender/Pink |
| 2.2 | Base Component Kit | **Done** | `src/components/common/TopStatsBar.tsx`, `PlayfulBackground.tsx`, `ThemeToggle.tsx` |
| 2.3 | FaceCard Component | **Done** | `src/components/card/FaceCard.tsx` (1.586:1 aspect ratio, EMV chip, 4 tiers, specular sheen) |
| 2.4 | App Shell & Navigation | **Done** | `src/components/navigation/BottomNav.tsx` (390px dock, floating scan orb) |
| 2.5 | Public Routes | **Done** | `src/app/page.tsx` (no top pill badge), `src/app/start/page.tsx`, `/sign-in`, `/verify` |
| 2.6 | Accessibility & Motion Audit | **Missing** | WCAG AA and `prefers-reduced-motion` compliance audit not conducted |
| **Phase 3: Auth & Accounts** | | | |
| 3.1 | Auth Schema | **Done** | `User`, `PointsLedger`, `AuditLog`, `AbuseFlag` in `prisma/schema.prisma` |
| 3.2 | Email OTP Pipeline | **Partial** | `src/app/api/auth/otp/send/route.ts` uses Neon Auth; verify route is mocked; Brevo not used |
| 3.3 | Anti-Abuse Shield | **Missing** | No Turnstile bot check or disposable email blocklist |
| 3.4 | Auth UI Flow | **Done** | `src/app/sign-in/page.tsx`, `src/app/verify/page.tsx` with auto-advancing digit inputs |
| 3.5 | Consent Persistence | **Done** | `src/app/api/consent/route.ts` records `ageConfirmedAt` and `consentVersion` |
| 3.6 | Profile & Session Management | **Done** | `src/app/api/me/route.ts`, `src/proxy.ts`, `src/lib/auth/session.ts` |
| 3.7 | Security Unit Tests | **Missing** | No test suites for brute-force resistance or OTP replay |
| **Phase 4: AI Rating Engine** | | | |
| 4.1 | Architecture Adapter | **Partial** | `src/lib/aiGateway.ts` exists for Neon AI Gateway; not connected to rating pipeline |
| 4.2 | Deterministic Quality Gate | **Partial** | `evaluateQualityGate` in `src/lib/rating/engine.ts` returns static values (no Laplacian variance) |
| 4.3 | Vision Model Call | **Missing** | `src/lib/rating/engine.ts` uses hardcoded simulated scoring; no live vision model call |
| 4.4 | Lethality Score Calculation | **Partial** | Formula weights defined in `src/lib/economy.ts`, but calculated on mock inputs |
| 4.5 | Dynamic Copy & Verdict Engine | **Done** | `TONE_VERDICTS` (Hype, Smooth, Roast) and `ACTIONABLE_TIPS` in `src/lib/rating/engine.ts` |
| 4.6 | Safety & Minor Gating | **Missing** | Automated minor detection (<18) and non-face rejection missing |
| 4.7 | Fairness Test Harness | **Partial** | `src/lib/rating/fairness.ts` and `src/app/api/rating/fairness/route.ts` exist with mock data |
| 4.8 | Budget Circuit Breaker | **Missing** | Daily model cost ceiling not implemented |
| **Phase 5: Core Scan Flow & Ledger (Alpha)** | | | |
| 5.1 | Append-Only Points Ledger | **Done** | `PointsLedger` model, `src/lib/ledger.ts`, balance verification |
| 5.2 | Daily Streak & Tier Engine | **Done** | `src/lib/scoring.ts` (Lagos WAT midnight, multipliers, freeze shield consumption) |
| 5.3 | Scan Pipeline Route (`POST /api/scan`)| **Partial** | ACID transaction persists scan/streak/ledger and purges base64, but scoring is mocked |
| 5.4 | Camera Capture HUD | **Done** | `src/app/scan/page.tsx` (WebRTC stream, canvas capture, 1024px JPEG downscale) |
| 5.5 | Score Result Reveal | **Done** | `src/app/scan/page.tsx` (count-up score animation, band chip, breakdown meters) |
| 5.6 | User Status Dashboard | **Done** | `src/app/card/page.tsx` (FaceCard, streak count, spendable/lifetime balance) |
| **Phase 6: Shop & Customization** | | | |
| 6.1 | Catalog Seeding | **Done** | `prisma/seed.ts` seeds 11 cosmetic items and streak freezes |
| 6.2 | Transactional Purchase Engine | **Done** | `src/app/api/shop/purchase/route.ts` (ACID purchase, ledger debit, freeze cap of 2) |
| 6.3 | Equip API | **Done** | `src/app/api/shop/equip/route.ts` updates equipped items on `Card` |
| 6.4 | Shop Interface | **Done** | `src/app/shop/page.tsx` (category tabs, price tags, equip actions) |
| 6.5 | Real-Time Card Skinning | **Partial** | Basic skin classes in `FaceCard.tsx`; full cosmetic dynamic styling incomplete |
| **Phase 7: Social Sharing Engine** | | | |
| 7.1 | Device-Side Canvas Renderer | **Partial** | `src/components/card/ShareCardModal.tsx` renders preview; 1080x1920 offscreen Canvas export missing |
| 7.2 | Native Share Integration | **Partial** | Web Share API in `ShareCardModal.tsx` with clipboard fallback; native file sharing partial |
| 7.3 | Dynamic OpenGraph Cards | **Done** | `src/app/api/og/route.tsx` generates dynamic OG images via `ImageResponse` |
| 7.4 | Opt-In Cloud Share Links | **Partial** | `src/app/api/share-cards/route.ts` creates database record; R2 blob storage unlinked |
| **Phase 8: Face-Off Arena (PvP)** | | | |
| 8.1 | Schema & State Machine | **Done** | `FaceOff` and `FaceOffAttempt` in `prisma/schema.prisma` with 6 status states |
| 8.2 | Staked Match Engine | **Done** | `src/app/api/faceoffs/route.ts` escrows stake; `/api/faceoff/resolve/route.ts` deducts 5% fee and pays out |
| 8.3 | Friendly Mode Engine | **Done** | Zero-stake duel flow supported |
| 8.4 | Best-of-Three Attempts | **Partial** | Attempt models exist; multi-round attempt resolution simplified |
| 8.5 | Auto-Resolution & Expiry | **Partial** | Reconcile endpoint sweeps expired duels; scheduled Cloudflare Cron missing |
| 8.6 | Anti-Collusion Engine | **Missing** | Daily match caps per pair and account age checks not enforced |
| 8.7 | Arena UI & Public Invites | **Done** | `src/app/faceoff/page.tsx` and `src/app/arena/invite/[code]/page.tsx` |
| **Phase 9: Hardening & Compliance** | | | |
| 9.1–9.8 | Security audit, rate limits, tombstoning, NDPA sign-off | **Missing** | Not yet started |
| **Phase 10: Closed Beta** | Cohort recruitment, telemetry, live tuning | **Missing** | Not yet started |
| **Phase 11: Launch & Monetization** | Paystack integration, memberships | **Missing** | Not yet started |

---

## 10. Conflicts and Blockers

### Critical Blockers (P0)
1. **Cloudflare Deployment Tooling Missing:** The project documentation stipulates deployment to Cloudflare Workers via OpenNext, but neither `wrangler` nor `@opennextjs/cloudflare` is installed. No `wrangler.toml` or `open-next.config.ts` exists.
2. **Next.js 16 vs OpenNext Cloudflare Compatibility:** The codebase uses Next.js `16.4.0`. `@opennextjs/cloudflare` officially supports Next.js 14 and 15. Next.js 16 includes breaking changes (such as replacing `middleware.ts` with `proxy.ts` and React 19 bindings) that may fail to compile or bundle on OpenNext without either an upgrade to an experimental adapter or a downgrade to Next.js 15.
3. **Lint Failure on Build:** `npm run lint` fails with **38 errors** (ESLint 9 / React 19 `react-hooks/set-state-in-effect` and `@typescript-eslint/no-explicit-any`). This will block any standard CI/CD deployment pipeline.

### Architectural Conflicts (P1)
4. **Design System & Token Divergence:** `docs/STYLE.md` dictates the Orla AI design system (font: Switzer, brand colors: Warm Gold `#E8D744`, Lavender `#B3BFF0`, Magenta `#D9628E`, Cream `#F8F6F4`). In contrast, `src/app/globals.css` and `src/app/layout.tsx` implement Montserrat and an "Obsidian & Indigo" palette (`#6366F1`) with an explicit comment: `/* Modern Ethereal Palette - Clean Obsidian & Indigo (No Nasty Yellow) */`.
5. **Auth Provider Discrepancy:** `docs/BACKEND.md` and `docs/PLAN.md` specify **Brevo** for email OTP delivery. The actual codebase routes OTPs to Neon Managed Auth (`auth@mail.myneon.app`), leaving Brevo completely unintegrated.
6. **Mocked OTP Verification:** `src/app/api/auth/otp/verify/route.ts` does not verify the OTP against Neon Auth or any store. Any 6-digit code is accepted and provisions a session.
7. **Simulated AI Scoring:** `src/lib/rating/engine.ts` returns hardcoded numbers (`sharpness: 88, lighting: 90, harmony: 88`). `src/lib/aiGateway.ts` is implemented but disconnected from the scanning pipeline.
8. **Prisma Migrations Missing:** `prisma/schema.prisma` is up to date, but `prisma/migrations` does not exist. Direct deployment to production without migration history risks schema drift.

---

## 11. Questions for You (Prioritized)

1. **Deployment Architecture:** The specifications require deployment to Cloudflare Workers via OpenNext, but no Wrangler/OpenNext configs exist and the project is running Next.js 16.4.0 (which OpenNext does not yet officially support). Should we:
   - Downgrade Next.js to 15.x and set up `@opennextjs/cloudflare` + `wrangler.json`?
   - Or deploy the Next.js 16 app to a Node.js / Vercel container and connect to Neon via serverless drivers?
2. **Design System & Palette:** `STYLE.md` mandates the Orla design system (Switzer font, Warm Gold `#E8D744`, Lavender, Pink, Cream), while the code explicitly rejects it in favor of Montserrat and Obsidian/Indigo (`#6366F1`, "No Nasty Yellow"). Which visual identity is canonical?
3. **Email OTP Delivery Provider:** Should we integrate **Brevo** (as documented in `BACKEND.md`) via its API/SMTP, or continue using **Neon Managed Auth**'s internal email delivery (`auth@mail.myneon.app`)?
4. **Live Vision Model Selection:** Which vision model should `scoreFace()` call via the Neon AI Gateway (e.g. OpenAI `gpt-4o-mini`, `gpt-4o`, Google `gemini-1.5-flash`, or Anthropic `claude-3-5-sonnet`)?
5. **OTP Verification Enforcement:** Should `/api/auth/otp/verify` be wired to validate codes directly against Neon Auth, or do you intend to use a custom OTP code table in Postgres?
6. **Prisma Migrations Baseline:** Should we generate the initial Prisma migration baseline (`prisma migrate dev --name init`) using `DIRECT_URL`?
7. **Testing Framework:** No test runner is currently installed. Do you prefer **Vitest** for unit/integration testing and **Playwright** for E2E tests?
8. **Turnstile & Rate Limiting:** Are Cloudflare Turnstile keys available now, or should bot protection and rate limiting be mocked in local development?

---

## 12. Recommended Starting Phase and Step

### Recommended Starting Point: **Phase 1, Step 1.4 & Phase 4, Step 4.1**
While the repository has UI screens and API endpoints for Phases 2, 3, 5, 6, and 8 already in place, **the core platform foundation and AI engine are currently mocked or incompatible with the deployment target**.

### Immediate Execution Sequence:
1. **Resolve Runtime & Deployment Host (Phase 1, Step 1.1 / 1.4):**
   - Decide between Next.js 15 on Cloudflare Workers vs Next.js 16 on standard serverless/Node.
   - If Cloudflare Workers: downgrade Next.js to 15, install `@opennextjs/cloudflare` and `wrangler`, enable `nodejs_compat`, and run Spike S1.
2. **Fix Linting Errors (Pre-requisite for CI):**
   - Resolve the 38 ESLint errors (`react-hooks/set-state-in-effect` in `useAuth`, `useCard`, `useFaceoff`, `useFriends`, `useShop`).
3. **Baseline Database Migrations (Phase 1, Step 1.2):**
   - Run `npx prisma migrate dev --name init` to create the formal `prisma/migrations` history.
4. **Wire Real AI Vision Rating Engine (Phase 4, Steps 4.1–4.4):**
   - Connect `src/lib/rating/engine.ts` to `callNeonAIGateway` in `src/lib/aiGateway.ts` with multimodal vision input to replace mock scores with real Lethality evaluations.
5. **Align Design Tokens (Phase 2, Step 2.1):**
   - Resolve the conflict between Orla Gold/Lavender (`STYLE.md`) and Indigo/Obsidian (`globals.css`), and install Switzer typography if Orla is confirmed.
