# Face Card — Implementation Progress Checklist

Last Updated: October 14, 2026

## Phase 1 — Platform Foundation & Spikes

| Step | Description | Status | Branch | Tests Run | Notes |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **1.1** | Platform Foundation & OpenNext Cloudflare Setup | **Completed** | `phase-1-step-1` | 4/4 Vitest, tsc 0 errors, eslint 0 errors, opennextjs-cloudflare build ok | Configured `@opennextjs/cloudflare`, `wrangler.jsonc` (2025-05-05, nodejs_compat), `open-next.config.ts`, `vitest`, removed Node middleware, verified Next.js 16.4 + OpenNext build. |
| **1.2** | Database & Prisma Integration with Hyperdrive / `@prisma/adapter-pg` | **Completed** | `phase-1-step-2` | 7/7 Vitest, tsc 0 errors, eslint 0 errors, opennextjs-cloudflare build ok | Configured `@prisma/adapter-pg` for Cloudflare Hyperdrive, `prisma/migrations/0_init/migration.sql` baseline established, Prisma 7 client regenerated. |
| **1.3** | CI/CD & Branch Previews | **Completed** | `phase-1-step-3` | 9/9 Vitest, tsc 0 errors, eslint 0 errors, opennextjs-cloudflare build ok | Configured `.github/workflows/ci.yml` running lint, tsc, Vitest, and opennextjs-cloudflare build. |
| **1.4** | Technical Spikes S1–S5 | **In Progress** | `phase-1-step-4` | Pending | S1 (Workers bundle), S2 (On-device MediaPipe Face Landmarker), S3 (Rate limiting), S4 (Dynamic OG), S5 (Brevo OTP). |
| **1.5** | Observability & Zero-Image Scrubber | **Pending** | - | - | Structured logger with regex image data scrubber and Sentry. |

## Open Questions & Decisions
- None currently blocking Phase 1, Step 1.1. Locked decisions rule Cloudflare Workers + Hyperdrive + on-device MediaPipe scoring.
