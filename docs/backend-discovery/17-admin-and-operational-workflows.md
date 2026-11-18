# 17 — Administration & Operational Workflows

## 1. Administrative Capabilities

- **Existing Admin UI:** **None.** Zero `/admin` routes exist.
- **Existing Admin Auth/RBAC:** **None.** `User` has no `role` or `isAdmin` field (`prisma/schema.prisma:81-114`).
- **Existing Operational Endpoints:**
  - `GET /api/cron/reconcile` (`src/app/api/cron/reconcile/route.ts`): Protected by `CRON_SECRET` (`Bearer` or `x-cron-secret` header) in production; runs `reconcileAllLedgers()` and `expireStaleDuels()`.
  - `GET /api/health` (`src/app/api/health/route.ts`): Public DB `SELECT 1` latency check.
  - `GET /api/rating/fairness` (`src/app/api/rating/fairness/route.ts`): Public synthetic fairness audit.
- **Unused Admin/Moderation Tables:** `AbuseFlag` and `EconomyConfig` exist in `prisma/schema.prisma:377-395` with no API handlers or UI.
- **Implied Admin Requirements:** User suspension/banning (`UserStatus.FLAGGED`/`BANNED`), `AbuseFlag` review, `ShopItem` & Atelier product/inventory/order/refund management, `EconomyConfig` runtime tuning, and `AuditLog` viewer.

## 2. Asynchronous & Operational Workflows

| Workflow | Current Implementation | Missing / Required Async Support |
|---|---|---|
| **Ledger Reconciliation & Duel Expiry** | Synchronous in `GET /api/cron/reconcile` (and duel expiry on `GET /api/faceoffs`) | Cloudflare Cron Trigger (`wrangler.jsonc` has no `[triggers]` block yet!) |
| **Email OTP Delivery** | Synchronous `fetch` to Brevo in `POST /api/auth/otp/send` | Retry/dead-letter queue for transactional emails (orders, receipts, duel invites) |
| **Facial Analysis** | Synchronous `fetch` (6s timeout) in `POST /api/scan` | Budget circuit-breaker & observability |
| **Share Card / OG Rendering** | Client `<canvas>` + dynamic `/api/og` | Optional R2 upload & TTL cleanup cron for expired `ShareCard` / `IdempotencyRecord` / `OtpChallenge` / `AuthAttempt` rows |
| **Commerce Order Fulfilment & Webhooks** | **Missing** | Async Paystack webhook processor, inventory reservation expiry, shipping/fulfilment notifications |
| **Account Deletion** | Synchronous `DELETE /api/me` | Async cleanup of `User.avatarUrl` / R2 assets & Atelier PII anonymization |
