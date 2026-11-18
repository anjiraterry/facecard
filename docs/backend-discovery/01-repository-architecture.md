# 01 — Repository & System Architecture

## 1. Repository Classification

Face Card is a **single-package full-stack Next.js 16 application** (monolith) with an accompanying Neon Functions starter (`hello.ts`) and Cloudflare Workers deployment configuration (`wrangler.jsonc`, `open-next.config.ts`). It is **not** a monorepo (no `workspaces` in `package.json`, no `packages/` or `apps/` subdirectories).

---

## 2. Repository Structure

```text
facecard/
├── .github/workflows/ci.yml       # CI: tsc, eslint, vitest, opennextjs-cloudflare build
├── docs/                          # Product & spec docs (PRD, PRODUCT, BACKEND, FRONTEND, AI_RATING, AUDIT, STYLE, PLAN)
├── prisma/
│   ├── schema.prisma              # 16 models, 10 enums (PostgreSQL)
│   ├── seed.ts                    # Seeds 6 ShopItems, 5 Users, Streaks, Card, Scan, Ledger, 3 FaceOffs
│   └── migrations/
│       ├── 0_init/                # Initial schema SQL
│       ├── 1_auth_sessions/       # AuthSession, OtpChallenge, AuthAttempt
│       └── 2_points_integrity/    # Non-negative balance CHECKs + PointsLedger append-only trigger
├── scripts/                       # Ad-hoc DB inspection & constraint scripts (add_constraints.ts, etc.)
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout (ThemeProvider, QueryProvider, ToastProvider, BottomNav)
│   │   ├── globals.css            # Tailwind v4 + CSS custom properties
│   │   ├── api/                   # 27 Next.js Route Handler files
│   │   └── [pages]/               # 21 App Router page files
│   ├── components/
│   │   ├── camera/                # LivenessOverlay.tsx
│   │   ├── card/                  # FaceCard.tsx, ClaimFaceCardModal.tsx, ShareCardModal.tsx, engraving.ts, materials.ts
│   │   ├── commerce/              # Atelier preview-only components (ProductCard, PDP, Bag, Checkout, Routine, Orders)
│   │   ├── common/                # ToastProvider, TopStatsBar, UserAvatar, ThemeToggle, Skeleton, PlayfulBackground
│   │   ├── faceoff/               # DuelDetailModal.tsx
│   │   ├── home/                  # ChallengeDuelCard.tsx, LeaderboardPodium.tsx
│   │   ├── navigation/            # BottomNav.tsx (mobile dock + desktop left sidebar)
│   │   ├── providers/             # QueryProvider.tsx, ThemeProvider.tsx
│   │   └── ui/                    # Button, Input, SurfaceCard, PageHeader, StateViews, MotionPrimitives
│   ├── hooks/                     # Client state hooks (useAuth, useCard, useFaceoff, useFriends, useScan, useShop)
│   ├── lib/
│   │   ├── auth/                  # server.ts (Neon Auth), client.ts, session.ts, sessions.ts, otp.ts, pin.ts, rateLimit.ts
│   │   ├── rating/                # engine.ts (scoreFace), fairness.ts (runFairnessAudit)
│   │   ├── spikes/                # spikes.ts (legacy/spike scoring & Brevo/SVG helpers)
│   │   ├── vision/                # liveness.ts (MediaPipe FaceLandmarker + optical fallback)
│   │   ├── aiGateway.ts           # Unused Neon AI Gateway wrapper
│   │   ├── avatar.ts              # Initials SVG + preset emblems + cover art SVG
│   │   ├── db.ts                  # PrismaClient proxy with Cloudflare Hyperdrive / DATABASE_URL resolution
│   │   ├── economy.ts             # EconomyConfig constants
│   │   ├── faceoff.ts             # Arena duel lifecycle (create, join, resolve, cancel, expire)
│   │   ├── idempotency.ts         # IdempotencyRecord middleware
│   │   ├── ledger.ts              # postLedger(), grantSignupBonus(), reconciliation
│   │   ├── logger.ts              # StructuredLogger with base64/secret scrubber
│   │   ├── paystack.ts            # Unused Paystack API + webhook signature helper
│   │   ├── scoring.ts             # calculateRawScore, getVerdictBand, calculateScanPoints, getLagosDayKey
│   │   ├── share.ts               # Web Share API + clipboard helper
│   │   ├── storage.ts             # Unused S3/Neon Object Storage presigned URL helpers
│   │   ├── tokens.ts              # BRAND_COLORS, TIER_CONFIG, VERDICT_BANDS
│   │   └── utils.ts               # cn, formatPoints, maskCardNumber
│   ├── services/                  # Typed fetch wrappers (apiClient + 6 domain services)
│   └── types/index.ts             # Core shared TypeScript interfaces & union types
├── tests/                         # 18 Vitest test files + helpers/fakeDb.ts
├── hello.ts                       # Neon Functions starter handler (unused by Next.js app)
├── neon.ts                        # @neon/config v1 service declarations (auth, aiGateway, functions, selfies bucket)
├── next.config.ts                 # images.unoptimized: true, serverExternalPackages: ['pg-cloudflare']
├── open-next.config.ts            # defineCloudflareConfig()
├── prisma.config.js               # Prisma 7 datasource + seed config
└── wrangler.jsonc                 # Cloudflare Workers config (HYPERDRIVE, R2 CARDS_BUCKET, ASSETS)
```

---

## 3. Technology Stack & Dependency Usage

| Category | Technology & Version (`package.json`) | Active Usage Status |
|---|---|---|
| **Framework** | `next` `16.4.0`, `react` `19.3.0`, `react-dom` `19.3.0` | **Actively used** (App Router, Route Handlers, `next/og`) |
| **Language** | `typescript` `^5` (`strict: true`) | **Actively used** |
| **Styling** | `tailwindcss` `^4`, `@tailwindcss/turbopack` `^4` | **Actively used** |
| **Animations** | `framer-motion` `^14.1.0` | **Actively used** (`FaceCard`, modals, `BottomNav`, `FramerTabPanel`) |
| **Icons** | `lucide-react` `^1.55.0` | **Actively used** |
| **Data Fetching** | `@tanstack/react-query` `^5.104.2` | **Mounted** in `QueryProvider.tsx`, but hooks use raw `useState`+`useEffect`+`fetch` |
| **Forms & Validation** | `react-hook-form` `^7.90.0`, `@hookform/resolvers` `^5.9.1`, `zod` `^3.25.76` | **Installed, largely unused** in inspected UI/API routes (manual validation used instead) |
| **Database & ORM** | `prisma` `^7.10.0`, `@prisma/client` `^7.10.0`, `@prisma/adapter-pg` `^7.10.0`, `pg` `^8.23.1`, `pg-cloudflare` `^1.4.1` | **Actively used** (`src/lib/db.ts`) |
| **Neon Packages** | `@neondatabase/serverless` `^1.2.0`, `@prisma/adapter-neon` `^7.10.0` | **Used in `prisma/seed.ts`**, not in `src/lib/db.ts` (uses `pg` + `PrismaPg`) |
| **Auth** | `@neondatabase/auth` `^0.6.0-beta` | **Mounted** at `/api/auth/[...path]`, **unused** by app flows (custom `AuthSession` used) |
| **Neon Infra** | `@neon/config` `^1.9.1`, `@neon/env` `^1.6.1` | `neon.ts` config only |
| **Object Storage** | `@aws-sdk/client-s3` `^3.1150.0`, `@aws-sdk/s3-request-presigner` `^3.1150.0` | **Unused** (`src/lib/storage.ts` has no callers) |
| **Computer Vision** | `@mediapipe/tasks-vision` `^1.1.1` | **Actively used** in browser (`src/lib/vision/liveness.ts`) via CDN WASM |
| **Email** | Brevo HTTP API (`fetch`) | **Actively used** in `src/lib/spikes/spikes.ts` (if `BREVO_API_KEY` set; dev fallback returns code) |
| **AI Vision** | Neon AI Gateway (`fetch` to `/v1/chat/completions`) | **Conditionally used** in `src/lib/rating/engine.ts` (falls back to SHA-256 hash) |
| **Payments** | Paystack (`src/lib/paystack.ts`) | **Unused** (no API routes or UI callers) |
| **Hosting** | `@opennextjs/cloudflare` `^1.20.11`, `wrangler` `^4.151.0` | **Configured** (`wrangler.jsonc`, `open-next.config.ts`) |
| **Testing** | `vitest` `^2.1.9`, `tsx` `^4.23.15` | **Configured** (`tests/*.test.ts`) |

---

## 4. Existing System Architecture Diagrams

### 4.1 Overall System Architecture (Verified)

```mermaid
flowchart TB
  Browser["Next.js Client (React 19, Framer Motion, MediaPipe WASM)"]
  CF["Cloudflare Worker (OpenNext)"]
  API["Next.js Route Handlers (/api/*)"]
  PG["Neon Lakebase Postgres (PrismaPg / Hyperdrive)"]
  AIGW["Neon AI Gateway (/v1/chat/completions)"]
  Brevo["Brevo SMTP API (api.brevo.com)"]
  NeonAuth["Neon Auth (/api/auth/[...path]) - Unused by App"]
  S3["Neon Object Storage (storage.ts) - Unused"]
  Paystack["Paystack (paystack.ts) - Unused"]

  Browser -->|HTTPS + fc_session cookie| CF
  CF --> API
  API --> PG
  API -->|Optional if env set| AIGW
  API -->|OTP email if BREVO_API_KEY set| Brevo
  API -.->|Mounted only| NeonAuth
  API -.->|No callers| S3
  API -.->|No callers| Paystack
```

### 4.2 Authentication & Session Lifecycle (Verified)

```mermaid
sequenceDiagram
  participant U as User Browser
  participant API as Next.js API
  participant DB as Neon Postgres

  alt Claim New Card (/api/card/claim)
    U->>API: POST {displayName, handle, pin}
    API->>DB: Rate limit check (AuthAttempt) + handle check
    API->>DB: Tx: create User + Streak + Card + grantSignupBonus(100 PTS)
    API->>DB: createSession() -> AuthSession (SHA-256 tokenHash)
    API-->>U: Set-Cookie: fc_session (HttpOnly, 30d)
  else PIN Login (/api/auth/pin-login)
    U->>API: POST {identifier, pin}
    API->>DB: Rate limit check + verifyPin(scrypt)
    API->>DB: createSession() -> AuthSession
    API-->>U: Set-Cookie: fc_session
  else Email OTP (/api/auth/otp/send -> /verify)
    U->>API: POST /otp/send {email}
    API->>DB: Store OtpChallenge (HMAC-SHA256 codeHash, 10m TTL)
    U->>API: POST /otp/verify {email, code}
    API->>DB: Atomic consume OtpChallenge + find/create User + createSession()
    API-->>U: Set-Cookie: fc_session
  end
```

### 4.3 Frontend Data Flow (Verified)

```mermaid
flowchart LR
  Pages["App Router Pages (src/app/*/page.tsx)"]
  Hooks["Custom Hooks (useAuth, useCard, useShop, useFaceoff, useFriends, useScan)"]
  Services["Service Layer (src/services/*Service.ts)"]
  Client["apiRequest() (src/services/apiClient.ts)"]
  Local["localStorage / sessionStorage (cache & onboarding flags)"]
  Routes["/api/* Route Handlers"]

  Pages --> Hooks
  Hooks --> Services
  Services --> Client
  Services -.->|facecard_user cache| Local
  Client -->|credentials: include + Idempotency-Key| Routes
```
