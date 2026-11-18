# 18 — Security & Privacy Audit

## 1. Security Findings (Evidence-Based)

| Severity | Source Reference | Finding & Evidence | Impact & Remediation |
|---|---|---|---|
| **P0** | `src/app/api/share-cards/[id]/route.ts:54-80` | **Unauthenticated ShareCard Deletion:** `DELETE` handler has no `getSessionUser()` or `userId` check; deletes any `ShareCard` by `publicId` or `id`. | Anyone can delete any user's share card. Require auth + `where: { id, userId: sessionUser.id }`. |
| **P0** | `src/app/api/scans/[id]/route.ts:6-68` | **Unauthenticated Scan IDOR:** `GET` handler has no `getSessionUser()` or ownership check. | Anyone with a scan UUID can read another user's scan scores and points. Require auth + ownership (or duel participant). |
| **P0** | `src/app/api/me/route.ts:99-128` | **Unverified Email Takeover / Bypass:** `PATCH /api/me` accepts `updates.email` and writes it directly to `User.email` without OTP verification (bypassing `/api/auth/link-email`). | User can attach an arbitrary/unverified email (or lock out/confuse recovery). Remove `email` from `PATCH /api/me`; force `/api/auth/link-email`. |
| **P1** | `src/lib/rating/engine.ts:358-381`, `src/components/camera/LivenessOverlay.tsx:241,315` | **Client-Side Trust & Liveness Bypass:** Liveness can be skipped or tapped to pass on client; `/api/scan` never enforces liveness. `scoreFace()` also trusts `ClientFeatureVector` if passed. | Enables automated/synthetic photo farming (e.g. `startSyntheticCamera()`). Enforce server-side face detection + signed/verified liveness or stricter anti-abuse. |
| **P1** | `src/lib/paystack.ts:96-104` | **Webhook Signature Dev Bypass:** `verifyPaystackWebhookSignature` returns `true` when `PAYSTACK_SECRET_KEY` is empty. | If deployed without env var, anyone can forge payment webhooks. Fail closed (`false`) unless explicitly in local test mode. |
| **P1** | `src/app/api/profile/avatar/route.ts:7-40` | **Unvalidated Avatar Payload:** Accepts any string up to 5.5MB (`avatarUrl`) without MIME/URL/SVG sanitization. | Stored XSS if rendered in unsafe context or SVG injection; DB bloat. Validate image MIME/magic bytes and store in Object Storage (R2/S3). |
| **P1** | `src/app/api/me/route.ts:134-175` | **Incomplete Account Deletion:** `DELETE /api/me` does not clear `User.avatarUrl` (which may hold a user's selfie photo!). | Violates NDPA right-to-be-forgotten if custom selfie avatar remains in DB. Set `avatarUrl: null` on delete. |
| **P1** | `src/lib/auth/server.ts:6` | **Hardcoded Fallback Cookie Secret:** `NEON_AUTH_COOKIE_SECRET` falls back to `"fc_dev_auth_cookie_secret_0123456789abcdef"`. | Session forgery risk on `/api/auth/[...path]` if env var is missing. Remove fallback in production or remove unused Neon Auth handler. |
| **P2** | `src/app/api/leaderboard/route.ts:13-23` | **Deleted/Banned Users Exposed:** `db.user.findMany` does not filter `status: 'ACTIVE'`. | `"Deleted Contender"` rows leak into public leaderboard. Add `where: { status: 'ACTIVE' }`. |
| **P2** | `src/app/api/share-cards/[id]/route.ts:11-30`, `src/app/s/[id]/page.tsx:64-77` | **Expired/Deleted ShareCards Still Served:** Neither checks `expiresAt > now` or `deletedAt === null`. | Expired share links remain permanently accessible. |
| **P2** | `src/app/api/cron/reconcile/route.ts:14-20` | **Dev Cron Unauthenticated:** In non-prod, missing `CRON_SECRET` allows unauthenticated cron execution. | Low in dev, ensure `CRON_SECRET` is always set in staging/prod. |
| **P2** | `scripts/add_constraints.ts:30-48` | **Permissive RLS Policies:** RLS enabled with `USING (true) WITH CHECK (true)` for all roles. | Provides no tenant isolation if DB role is ever shared. |
| **P3** | `src/app/api/card/claim/route.ts:175` | **Stack Trace in Non-Prod Error:** Returns `error.stack` when `NODE_ENV !== 'production'`. | Minor info leak in staging if `NODE_ENV` misconfigured. |
| **P3** | `src/app/api/rating/fairness/route.ts` | **Unauthenticated Compute Endpoint:** Public GET runs 50 `scoreFace()` calls. | Minor DoS vector. |

## 2. Privacy & Data Governance (NDPA)

- **Raw Selfies:** Processed transiently in memory during `POST /api/scan` and discarded (`imageBase64 = ''`), scrubbed from logs (`src/lib/logger.ts`).
- **Exception / Contradiction:** `POST /api/profile/avatar` stores user-uploaded photos (including selfies from `/scan` `"Set Selfie as Facecard Portrait"`) **permanently** in `User.avatarUrl`!
- **Biometric Consent:** `User.ageConfirmedAt` and `User.consentAt` are auto-populated on `/api/card/claim` and `/api/auth/otp/verify` without an explicit consent checkbox.
- **Future Atelier PII:** Skin goals (`selectedGoals`), skin conditions, shipping addresses, and order history will require explicit consent, encryption/access controls, and NDPA deletion workflows.
