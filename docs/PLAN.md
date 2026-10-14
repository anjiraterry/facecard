# Face Card — Phased Implementation Plan

Version 0.1 · October 12, 2026 · Step-by-step master plan to build the MVP

## 0. How to use this plan

This plan turns the Face Card specification suite (`PRD.md`, `FRONTEND.md`, `BACKEND.md`, `STYLE.md`, `AI_RATING.md`, `AUDIT.md`, `PRODUCT.md`) into a rigorously ordered, phase-by-phase build.

### Document Map

| Short name | Document | What it defines |
| :--- | :--- | :--- |
| **PRD** | [`PRD.md`](./PRD.md) | Features, scoring model, points economy, privacy, anti-abuse, metrics, risks |
| **FE** | [`FRONTEND.md`](./FRONTEND.md) | Mobile-first screens, components, camera flows, client logic, share cards |
| **BE** | [`BACKEND.md`](./BACKEND.md) | Stack, data model, API surface, scan pipeline, ledger, face-off engine, jobs |
| **DS** | [`STYLE.md`](./STYLE.md) | Orla-exact tokens, components, tiers, motion, tone modes, share card layouts |
| **AI** | [`AI_RATING.md`](./AI_RATING.md) | Rating engine: deterministic quality gates, vision prompt, weights, fairness gates |
| **AUDIT**| [`AUDIT.md`](./AUDIT.md) | Reconciliations, schema amendments (D1–D15), business logic resolutions (C1–C14) |
| **PD** | [`PRODUCT.md`](./PRODUCT.md) | Executive summary, pillars, scope boundaries |

### Core Working Rules

1. **Vertical slices:** Each phase produces an end-to-end usable deliverable, not detached stubs.
2. **Server is source of truth:** Points, caps, streaks, and stakes are calculated exclusively on the server (`BE §1`, `FE §5`).
3. **Ledger first:** The append-only points ledger is built and verified before any feature moves points (`BE §5`).
4. **Config, not constants:** All economic parameters live in `EconomyConfig` (`BE §5`).
5. **Zero selfie persistence, ever:** Photos are processed in volatile memory and discarded instantly (`AI §10`, `BE §11`).
6. **The rating is free:** No score, breakdown, or tip is ever gated behind a paywall (`AI §1`).
7. **Strict Orla aesthetics:** All UI chrome strictly uses Orla design tokens; Nigerian context applies to copy, tone, and humor (`DS §1`, `STYLE.md`). No pill badges at top of pages.
8. **Automated tests gate each phase:** Exit criteria must pass before proceeding.

---

## 1. Phase Overview & Milestones

| Phase | Name | Scope & Deliverable | Target Exit Milestone |
| :---: | :--- | :--- | :--- |
| **0** | **Decisions & Accounts** | Docs reconciled, provider bake-off, accounts, legal text, economy model | Documentation & Setup Green |
| **1** | **Platform Foundation & Spikes** | Next.js on Cloudflare Workers, Neon Postgres, Spikes S1–S5 proven | **Platform Ready** |
| **2** | **Design System & Shell** | Orla UI kit, FaceCard (4 tiers + Black Card sheen), landing, age gate | **UI Shell Deployed** |
| **3** | **Auth & Accounts** | Email OTP via Brevo, Turnstile, session rotation, handle onboarding | **Auth Live** |
| **4** | **AI Rating Engine** | `scoreFace()`, deterministic photo craft gate, fairness test suite | **AI Fairness Gates Passed** |
| **5** | **Core Scan, Ledger & Card** | Slot reservations, append-only ledger, streak multipliers, HUD | **ALPHA MILESTONE** |
| **6** | **Shop & Customization** | Spendable points, cosmetics, streak freezes, tier gates | **Economy Engine Live** |
| **7** | **Social Sharing Engine** | Client-side 1080×1920 card render (WhatsApp, IG, TikTok, X), dynamic OG | **Share Engine Live** |
| **8** | **Face-Off Arena** | Staked duels, friendly mode, escrow, 5% fee, invite codes | **PvP Arena Live** |
| **9** | **Hardening & Compliance** | IDOR testing, zero-image audit, load testing, NDPA sign-off | **BETA-READY MILESTONE** |
| **10** | **Closed Beta** | 50–100 testers, real-user telemetry, economy tuning | **Beta Validated** |
| **11** | **Public Launch & Monetization** | Paystack integration (cosmetics/membership only), public rollout | **PUBLIC LAUNCH** |

---

## Phase 0 — Decisions & Accounts

**Goal:** Eliminate every architectural and legal ambiguity before writing production logic.

### Tasks
- [x] **0.1 Reconcile Documentation:** Confirm free rating (`AI §1`), friendly face-offs (`BE §6`), and Cloudflare Workers architecture (`AUDIT.md`).
- [ ] **0.2 Vision Provider Selection:** Test OpenAI vs Claude vs OpenRouter across 20–30 test images for latency, cost, and explicit zero-data-retention terms (`AI §11`).
- [ ] **0.3 Provision Cloudflare & Neon:**
  - Cloudflare Workers Paid with OpenNext adapter and R2 bucket (`BE §1`).
  - Neon Postgres with `dev`, `preview`, and `prod` branches (`BE §14`).
  - Brevo domain verification (SPF, DKIM, DMARC) (`BE §8`).
  - Cloudflare Turnstile keys (`BE §17`).
- [ ] **0.4 Legal Groundwork:** Draft NDPA-compliant privacy policy, biometric consent agreement, and "points have no cash value" disclosure (`PRD §10`, `BE §11`).
- [ ] **0.5 Economy Pacing Simulation:** Spreadsheet model verifying tier pacing (Classic: 0, Gold: ~8 days, Platinum: ~30 days, Black Card: ~90 days) (`PRD §8`).
- [ ] **0.6 Calibration Dataset Setup:** Create secure offline evaluation dataset spanning Nigerian skin tones, hair types, and lighting (`AI §11`).
- [ ] **0.7 Paystack Registration:** Initiate CAC requirements for in-app cosmetic payments (`Phase 11`).

**Exit Criteria:** All accounts active, provider selected, legal drafts approved, baseline economy simulation validated.

---

## Phase 1 — Platform Foundation & Spikes

**Goal:** Fully operational Next.js application running on Cloudflare Workers connected to Neon Postgres.

### Tasks
- [x] **1.1 Next.js 16 Scaffold:** Initialize App Router, TypeScript, Tailwind v4, and standard directory structure (`BE §1`, `FE §1`).
- [x] **1.2 Database & Prisma Integration:**
  - `@neondatabase/serverless` and `@prisma/adapter-neon` configured in [`src/lib/db.ts`](../src/lib/db.ts).
  - Schema with models, non-cascading ledger foreign keys, and `ScanSlot` in [`prisma/schema.prisma`](../prisma/schema.prisma).
  - Health check endpoint `GET /api/health`.
- [ ] **1.3 CI/CD & Branch Previews:** GitHub Actions workflow running `type-check`, `lint`, and deploying preview branches with isolated Neon databases.
- [ ] **1.4 Execute Technical Spikes:**
  - **S1 (Prisma on Workers):** Validate bundle size and latency under OpenNext.
  - **S2 (WASM Image Codecs):** Test Laplacian variance sharpness calculation within Worker CPU limits.
  - **S3 (Rate Limiting):** Benchmark Cloudflare Rate Limiting binding vs Postgres slot counters.
  - **S4 (Dynamic OG Generation):** Verify Workers-compatible SVG/PNG card rendering for invite links.
  - **S5 (Email Delivery):** Verify Brevo OTP delivery speeds to Nigerian email providers (Gmail, Yahoo, Outlook).
- [x] **1.5 Observability:** Structured JSON logger with regex-based image data scrubber and Sentry integration (`BE §11`).

**Exit Criteria:** Automated preview deployments operational, database reads/writes verified, Spikes S1–S5 concluded with documented fallback decisions.

---

## Phase 2 — Design System & App Shell

**Goal:** Faithful implementation of the Orla AI design system with complete component kit and public routes.

### Tasks
- [x] **2.1 Token Layer & Typography:** Switzer typography, exact Orla palette (`#E8D744`, `#B3BFF0`, `#D9628E`, `#F2A6A2`, `#F8F6F4`, `#1A1A1A`), organic gradients, and specular effects in [`src/app/globals.css`](../src/app/globals.css) and [`src/lib/tokens.ts`](../src/lib/tokens.ts).
- [x] **2.2 Base Component Kit:** Glass cards, primary/accent buttons, verdict chips, input fields, and mobile dock (`DS §9`).
- [x] **2.3 FaceCard Component:** 1.586 : 1 bank card aspect ratio, metallic EMV chip, contactless wave, 4 tier finishes, and Black Card animated specular sheen in [`src/components/card/FaceCard.tsx`](../src/components/card/FaceCard.tsx).
- [x] **2.4 App Shell & Navigation:** 390 px mobile container, responsive safe areas, floating navigation dock in [`src/components/navigation/BottomNav.tsx`](../src/components/navigation/BottomNav.tsx).
- [x] **2.5 Public Routes:**
  - Landing page with live tier switcher in [`src/app/page.tsx`](../src/app/page.tsx) (no pill badge at top).
  - Onboarding, 18+ age gate, and `@handle` selection in [`src/app/start/page.tsx`](../src/app/start/page.tsx).
  - Privacy policy and terms pages with NDPA notices.
- [ ] **2.6 Accessibility & Motion Audit:** Verify WCAG AA contrast compliance and `prefers-reduced-motion` fallbacks across all animations (`DS §17`).

**Exit Criteria:** Component gallery complete; Lighthouse accessibility score ≥ 95; landing and onboarding pages fully responsive.

---

## Phase 3 — Authentication & Accounts

**Goal:** Secure, passwordless email OTP sign-in with strict abuse prevention.

### Tasks
- [ ] **3.1 Auth Schema:** Implement `User`, `Session`, `VerificationToken`, `ConsentRecord`, and `AuditLog` in Prisma (`BE §2`).
- [ ] **3.2 Email OTP Pipeline:** 6-digit one-time code generated server-side, hashed with SHA-256 at rest, 10-minute expiry, 60s resend timer (`BE §8`).
- [ ] **3.3 Anti-Abuse Shield:** Disposable email domain filter, Turnstile bot detection, IP and email rate limiting (`BE §9`).
- [ ] **3.4 Auth UI Flow:** `/sign-in` and `/verify` screens with auto-advance digit inputs, clipboard paste, and countdown timer (`FE §2`).
- [ ] **3.5 Consent Persistence:** `POST /api/consent` recording `ageConfirmedAt`, `consentVersion`, and analytics consent state (`BE §8`).
- [ ] **3.6 Profile & Session Management:** `GET /api/me`, `PATCH /api/me` (display name & handle), and global device sign-out (`BE §3`).
- [ ] **3.7 Security Unit Tests:** Brute-force resistance, replay attacks, expired OTP rejection, session revocation (`BE §15`).

**Exit Criteria:** Seamless sign-up and sign-in verified on real mobile devices over 4G; zero OTP enumeration vulnerabilities.

---

## Phase 4 — AI Rating Engine

**Goal:** Robust, calibrated, and fair 0–100 Lethality rating pipeline passing all fairness benchmarks.

### Tasks
- [ ] **4.1 Architecture Adapter:** Abstract `scoreFace()` interface allowing hot-swapping between vision model providers (`AI §6`).
- [ ] **4.2 Deterministic Quality Gate:**
  - Sharpness via Laplacian variance (> threshold).
  - Exposure relative to facial skin tone (avoiding dark/blown-out frames).
  - Framing oval coverage and head pose angle checks (`AI §5`).
- [ ] **4.3 Vision Model Call:** Structured system prompt, JSON response schema, strict Zod validation, low temperature, and median-of-two retry rules (`AI §6`).
- [ ] **4.4 Lethality Score Calculation:**
  - Photo Craft (30%): Lighting (15%), Sharpness (8%), Framing (7%).
  - Face (45%): Harmony (18%), Skin Clarity (12%), Feature Definition (10%), Symmetry (5%).
  - Expression & Eye Contact (15%).
  - Aura & Presence (10%) (`AI §4`).
- [ ] **4.5 Dynamic Copy & Verdict Engine:** Tone mode library (Hype, Smooth, Roast, Straight) generating constructive, culture-aware verdict lines (`AI §8`, `DS §14`).
- [ ] **4.6 Safety & Minor Gating:** Automated checks flagging non-faces, screen re-photographs, or possible minors (<18) (`AI §10`).
- [ ] **4.7 Automated Fairness Test Harness:** Offline calibration script evaluating score distributions across Monk skin tones 1–10, hair types, and headwear (`AI §11`).
- [ ] **4.8 Budget Circuit Breaker:** Daily model spend ceiling automatically throttling non-essential scans when budget hits 100% (`AI §13`).

**Exit Criteria:** All fairness gates in `AI §11` pass on the calibration set; p95 latency < 8s; cost per scan strictly documented.

---

## Phase 5 — Core Scan Flow, Ledger, Streaks & Card (Alpha Milestone)

**Goal:** The complete core loop: capture selfie, score, record ledger transaction, update streak, tier up.

### Tasks
- [ ] **5.1 Append-Only Points Ledger:**
  - `PointsLedger` implementation with row locks (`SELECT FOR UPDATE`).
  - Cached balances on `User` with `spendableBalance >= 0` check.
  - Unique constraint on `(idempotencyKey, balanceKind)`.
  - Non-cascading FK to prevent ledger data loss on account deletion (`BE §5`, `AUDIT.md D1`).
- [ ] **5.2 Daily Streak & Tier Engine:**
  - Lagos timezone (WAT) midnight calculation.
  - Multiplier ladder: Days 1–2 (×1.0), 3–6 (×1.1), 7–13 (×1.25), 14–29 (×1.5), 30+ (×2.0).
  - Automated freeze consumption (max 2 freezes held).
  - Tier thresholds (Classic: 0, Gold: 1,000, Platinum: 5,000, Black: 20,000 pts).
- [ ] **5.3 Scan Pipeline Route (`POST /api/scan`):**
  - Verify session & consent.
  - Atomically reserve `ScanSlot` (3 scans/day cap; scan 1 = 100%, scans 2 & 3 = 50% pts).
  - Execute quality gate and `scoreFace()`.
  - Atomic transaction writing `Scan`, `PointsLedger` (lifetime & spendable), `Streak`, and `User.tier`.
  - **Discard raw image buffer from memory immediately** (`AI §10`).
- [x] **5.4 Camera Capture HUD:** Live camera stream, portrait oval guide, client-side downscale (1024 px), and upload fallback in [`src/app/scan/page.tsx`](../src/app/scan/page.tsx).
- [x] **5.5 Score Result Reveal:** Count-up animation, verdict chip, sub-score breakdown meters, points earned readout in [`src/app/scan/page.tsx`](../src/app/scan/page.tsx).
- [x] **5.6 User Status Dashboard:** Primary FaceCard, tier progress bar, streak counter, and balance display in [`src/app/card/page.tsx`](../src/app/card/page.tsx).

**Exit Criteria (Alpha Milestone):** A user signs in, takes a selfie on Android/iOS, receives a free score and breakdown, earns points, builds a streak, and observes tier progress. Zero photo bytes persist in any log or database.

---

## Phase 6 — Shop & Customization

**Goal:** Enable users to spend earned points on status cosmetics and protective streak freezes.

### Tasks
- [ ] **6.1 Catalog Seeding:** Seed initial cosmetics: streak freezes, retake practice tokens, titles ("Lethal Weapon"), card finishes (Cyber Lavender, Black Sheen), and custom EMV chips (`BE §7`).
- [ ] **6.2 Transactional Purchase Engine:**
  - `POST /api/shop/purchase` verifying tier unlock, ownership limits, and spendable balance.
  - Ledger write (`SHOP_PURCHASE`), `Purchase`, and `UserItem` in a single ACID transaction.
  - Strict rule: No item may grant point-earning scans (`BE §7`).
- [ ] **6.3 Equip API:** `POST /api/shop/equip` updating equipped skin, title, or frame on `Card`.
- [x] **6.4 Shop Interface:** Item grid, tier-locked indicators, price tags, and equip buttons in [`src/app/shop/page.tsx`](../src/app/shop/page.tsx).
- [ ] **6.5 Real-Time Card Skinning:** Dynamic styling in `<FaceCard />` reacting to equipped user items.

**Exit Criteria:** Users can purchase cosmetics with points, equip them to their card, and the ledger reconciles flawlessly.

---

## Phase 7 — Social Sharing Engine

**Goal:** Turn results into viral, highly shareable status assets for WhatsApp Status, Instagram, and TikTok.

### Tasks
- [ ] **7.1 Device-Side Canvas Renderer:** Render 1080×1920 (9:16 vertical) and 1080×1350 (4:5 portrait) status cards using HTML5 Canvas / Satori with safe margins (`FE §6`, `DS §16`).
- [ ] **7.2 Native Share Integration:** Web Share API integration triggering native file sharing on Android and iOS, with automatic PNG download fallback (`FE §4.3`).
- [ ] **7.3 Dynamic OpenGraph Cards:** High-performance dynamic preview generator for challenge links showing challenger tier and stake (without raw selfies) (`BE §17`).
- [ ] **7.4 Opt-In Cloud Share Links (Optional Flag):** `POST /api/share-cards` storing rendered cards in Cloudflare R2 with 30-day auto-expiry and user deletion endpoints (`BE §10`).

**Exit Criteria:** Share cards render correctly across WhatsApp Status, Instagram Stories, TikTok, and X without clipping or degradation.

---

## Phase 8 — Face-Off Arena (PvP Duels)

**Goal:** Head-to-head Lethality battles with friendly and staked modes.

### Tasks
- [ ] **8.1 Schema & State Machine:**
  - `FaceOff` and `FaceOffAttempt` models.
  - States: `WAITING` → `ACTIVE` → `COMPLETED` (side exits: `TIE_REMATCH`, `EXPIRED`, `CANCELLED`) (`BE §6`).
- [ ] **8.2 Staked Match Engine:**
  - Hold equal stakes (50, 100, 250, 500 pts) in escrow (`FACEOFF_STAKE_HOLD`).
  - Calculate 5% system fee on pot (`FACEOFF_FEE`).
  - Award remainder to winner (`FACEOFF_PAYOUT`) plus win bonus (`FACEOFF_WIN_BONUS`).
  - Strict dead-lock prevention with ordered row locks on users (`BE §6`).
- [ ] **8.3 Friendly Mode Engine:** Zero-stake challenge loop for new players with locked points (`BE §6`, `AUDIT.md B2`).
- [ ] **8.4 Best-of-Three Attempts:** Up to 3 scan attempts per player; highest score locked in.
- [ ] **8.5 Auto-Resolution & Expiry:** Lazy resolution on read + Cloudflare Cron Trigger sweeping expired duels every 5 minutes (`BE §12`).
- [ ] **8.6 Anti-Collusion Engine:** Max 5 face-offs/day; win bonus stripped for repeated opponents or accounts <7 days old (`BE §6`).
- [x] **8.7 Arena UI & Public Invites:** Match creation, stake selector, and invite link generator in [`src/app/faceoff/page.tsx`](../src/app/faceoff/page.tsx); challenge preview at `/f/[code]`.

**Exit Criteria:** Staked and friendly duels run reliably between distinct accounts; stakes and payouts reconcile; expired matches refund correctly.

---

## Phase 9 — Hardening & Compliance (Beta-Ready Milestone)

**Goal:** Fortress-grade security, bulletproof privacy, and performance optimization.

### Tasks
- [ ] **9.1 Anti-Abuse Rate Limits:** Cloudflare Rate Limiting binding per IP and account; 24-hour / 3-scan new account lock (`BE §9`).
- [ ] **9.2 Automated Maintenance Jobs:** Nightly ledger reconciliation job verifying `SUM(ledger) == User.balances`; alert on any drift (`BE §12`).
- [ ] **9.3 Security Audit & IDOR Testing:** Verify strict authorization checks on `/api/scans/:id`, `/api/faceoffs/:id`, and `/api/share-cards/:id`.
- [ ] **9.4 Zero-Data-Retention Audit:** Full cryptographic audit proving zero image buffers or base64 strings touch disk, logs, R2, or Sentry (`AI §10`).
- [ ] **9.5 Account Anonymization & Deletion:** User deletion tombstoning the user record (clearing email/name/handle) while preserving ledger rows (`AUDIT.md D1`).
- [ ] **9.6 Performance Optimization:** Achieve LCP < 2.5s on 4G; bundle size < 200 KB gzipped; scan API p95 < 8s (`FE §9`).
- [ ] **9.7 Device Compatibility Matrix:** Automated tests on Samsung Internet, Chrome Android, Safari iOS, and desktop browsers (`FE §12`).
- [ ] **9.8 Legal Sign-Off:** Final NDPA compliance review, biometric notice sign-off, terms agreement verification (`BE §11`).

**Exit Criteria (Beta-Ready Milestone):** Security penetration tests passed; zero image retention confirmed; load testing sustained at 100 concurrent scans; NDPA documentation finalized.

---

## Phase 10 — Closed Beta

**Goal:** Real-world validation with 50–100 active Nigerian users.

### Tasks
- [ ] **10.1 Cohort Recruitment:** Onboard 50–100 diverse testers across network conditions, devices, and skin tones (`Phase 10.1`).
- [ ] **10.2 KPI & Funnel Monitoring:** Track Day-1 and Day-7 retention, daily scans per user, face-off invite viral coefficient, and quality gate rejection rates (`PRD §12`).
- [ ] **10.3 Fairness Verification on Live Data:** Audit live scores across skin tones, lighting conditions, and camera sensors (`AI §11`).
- [ ] **10.4 Economic Tuning:** Calibrate tier thresholds and shop prices via `EconomyConfig` based on observed earn/burn velocity (`BE §5`).
- [ ] **10.5 Copy & Tone Polish:** Refine verdict lines and tips with feedback from Nigerian copywriters (`AI §9`).

**Exit Criteria:** D7 retention ≥ 35%; invite conversion ≥ 25%; fairness parity confirmed across cohorts; zero critical bugs.

---

## Phase 11 — Public Launch & Monetization Pilot

**Goal:** Open public launch with sustainable, non-predatory monetization.

### Tasks
- [ ] **11.1 Paystack Payment Gateway:** Implement Paystack for Nigerian bank transfers, USSD, and cards with webhook verification (`BE §1`).
- [ ] **11.2 Monetized Offerings (Strictly Cosmetics & Utility):**
  - Exclusive animated card finishes and custom titles.
  - Practice scan packs (no points earned).
  - Monthly premium membership (cosmetics only, no point or tier advantage) (`PRD §14`).
  - **Points are never sold directly.**
- [ ] **11.3 Production Launch Monitoring:** Live Sentry error tracking, Cloudflare analytics, automated model budget circuit breaker.
- [ ] **11.4 Viral Launch Seeding:** Campus and creator face-off challenges, launch share card campaigns.

**Exit Criteria:** Public application live on custom domain; Paystack payments functioning end-to-end; platform financially sustainable and scalable.

---

## 2. Definition of Done (MVP Acceptance)

The MVP is complete when:
1. A new user can sign up via passwordless email OTP, pass the 18+ age gate, and claim a unique `@handle`.
2. They can take a selfie on their phone and receive a 100% free Lethality score (0–100), breakdown, tips, and verdict.
3. They earn points, build streaks with multipliers, and watch their collectible FaceCard advance across tiers (Classic → Gold → Platinum → Black Card).
4. They can purchase and equip cosmetic card finishes in the shop using points.
5. They can share high-resolution status cards directly to WhatsApp Status, Instagram, TikTok, and X.
6. They can create and resolve staked and friendly face-off duels with friends.
7. The append-only ledger reconciles every night with zero drift.
8. Zero raw selfie images are stored anywhere on servers, databases, or logs.
9. All AI rating fairness gates pass across all skin tones and demographics.
