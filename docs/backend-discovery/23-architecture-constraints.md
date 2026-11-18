# 23 — Architectural Constraints

1. **Runtime & Hosting Constraint:**
   - Configured for **Cloudflare Workers** via `@opennextjs/cloudflare` (`wrangler.jsonc`, `open-next.config.ts`). All backend code must be Workers/WinterTC-compatible (`nodejs_compat`, native `fetch`, no native C++ Node addons).
2. **Database Constraint:**
   - **Neon Lakebase Postgres** via Prisma 7.10.0 (`@prisma/adapter-pg` + `pg` + `pg-cloudflare`, and `HYPERDRIVE` binding in `src/lib/db.ts`).
   - Append-only `PointsLedger` trigger (`PointsLedger_append_only`) and non-negative `CHECK` constraints (`migration 2_points_integrity`) must be respected by all future ledger operations.
3. **Authentication Constraint:**
   - Frontend relies on `HttpOnly` cookie `fc_session` (`credentials: 'include'`) and `apiRequest()` auto-attaching `Idempotency-Key` on mutations (`src/services/apiClient.ts`).
4. **Privacy & Compliance Constraint (NDPA):**
   - Raw selfie images from `/scan` must remain ephemeral in memory and never be persisted to disk, logs (`src/lib/logger.ts`), or DB.
   - `User` records cannot be hard-deleted due to `PointsLedger` `onDelete: Restrict`; tombstoning (`status = 'DELETED'`) is mandatory.
5. **Regional & Timezone Constraint:**
   - Daily scan caps, streaks, and Arena daily duel caps reset at `00:00` **`Africa/Lagos` (WAT, UTC+1)** (`getLagosDayKey()`).
6. **Economy Constraint:**
   - Points (`PTS`) cannot be purchased directly with fiat (`src/lib/paystack.ts:34-36`).
7. **Existing Technical Debt:**
   - Schema drift (`User.avatarUrl` missing from `0_init/migration.sql`).
   - Dual unused auth (`@neondatabase/auth`) and unused stubs (`storage.ts`, `aiGateway.ts`, `paystack.ts`).
   - `AuditLog` overloaded as the `ADD_FRIEND` friendship store.
