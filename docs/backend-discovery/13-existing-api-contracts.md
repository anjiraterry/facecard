# 13 — Existing API Contracts Catalogue

All 27 route files in `src/app/api/` are documented below.

| Endpoint | Method | Handler | Auth | AuthZ | Validation | DB Tables | Side Effects / Notes | Status |
|---|---|---|---|---|---|---|---|---|
| `/api/auth/[...path]` | `GET,POST,PUT,DELETE,PATCH` | `src/app/api/auth/[...path]/route.ts` | Neon Auth | Neon Auth | Neon Auth | Neon Auth internal | Mounted, **unused** by frontend | Unused |
| `/api/card/claim` | `POST` | `src/app/api/card/claim/route.ts` | Public | None | Manual (`displayName` 2-50, `handle` `[a-z0-9_]{3,20}`, `pin` 4-6 digits) | `User`, `Streak`, `Card`, `PointsLedger`, `AuthAttempt`, `AuthSession` | Rate limit 10/hr/IP; grants 100 PTS; sets `fc_session` | Functional |
| `/api/auth/pin-login` | `POST` | `src/app/api/auth/pin-login/route.ts` | Public | None | Manual (`identifier`, `pin`) | `User`, `Card`, `AuthAttempt`, `AuthSession` | Rate limit 5/15m/id, 20/15m/IP; sets `fc_session` | Functional |
| `/api/auth/otp/send` | `POST` | `src/app/api/auth/otp/send/route.ts` | Public | None | Manual (`email` + disposable domain block) | `OtpChallenge`, `AuthAttempt` | Brevo SMTP or `devCode` in non-prod; 60s cooldown | Functional |
| `/api/auth/otp/verify` | `POST` | `src/app/api/auth/otp/verify/route.ts` | Public | None | Manual (`email`, 6-digit `code`) | `OtpChallenge`, `User`, `Streak`, `Card`, `PointsLedger`, `AuthSession` | Creates user + 100 PTS if new; sets `fc_session` | Functional |
| `/api/auth/link-email` | `POST` | `src/app/api/auth/link-email/route.ts` | `getSessionUser` | Self | Manual + `verifyOtpCode` | `OtpChallenge`, `User` | Links verified email to account | Functional |
| `/api/auth/session/refresh` | `GET,POST` | `src/app/api/auth/session/refresh/route.ts` | Cookie `fc_session` | Self | Token check | `AuthSession` | Slides expiry by 30d; returns 200 `{authenticated:false}` if no cookie | Functional |
| `/api/auth/signout` | `POST` | `src/app/api/auth/signout/route.ts` | Cookie `fc_session` | Self | None | `AuthSession` | Revokes session & clears cookies | Functional |
| `/api/consent` | `POST` | `src/app/api/consent/route.ts` | `getRequiredUser` | Self | `ageConfirmed` boolean | `User` | Sets `ageConfirmedAt`, `consentAt`, `consentVersion` | Functional |
| `/api/me` | `GET` | `src/app/api/me/route.ts` | `getSessionUser` | Self | None | `User`, `Streak`, `Card`, `Scan` | Returns profile + latest scan | Functional |
| `/api/me` | `PATCH,POST` | `src/app/api/me/route.ts` | `getSessionUser` | Self | None (unsafe!) | `User` | **P0:** Allows updating `email` without OTP! Ignores `bio`/`location` | Partial / Insecure |
| `/api/me` | `DELETE` | `src/app/api/me/route.ts` | `getSessionUser` | Self | None | `User`, `AuthSession`, `ShareCard` | Tombstones user; **does not clear `avatarUrl`** | Partial |
| `/api/profile/avatar` | `POST` | `src/app/api/profile/avatar/route.ts` | `getRequiredUser` | Self | Length `<= 5.5M` | `User` | Stores arbitrary `avatarUrl` string (no MIME check) | Functional |
| `/api/card` | `GET` | `src/app/api/card/route.ts` | `getSessionUser` | Self | None | `User`, `Streak`, `Card`, `ShopItem`, `Scan` | Returns active card + 4-tier carousel (uses 10k Black threshold) | Functional |
| `/api/points` | `GET` | `src/app/api/points/route.ts` | `getSessionUser` | Self | None | `User`, `Streak`, `Scan`, `Purchase`, `PointsLedger` | Returns balances + funding/spends history | Functional |
| `/api/scan` | `POST` | `src/app/api/scan/route.ts` | `getSessionUser` | Self / Duel participant | `Idempotency-Key`, `imageBase64 <= 11M`, `toneMode` | `IdempotencyRecord`, `User`, `Scan`, `ScanSlot`, `PointsLedger`, `Streak`, `FaceOff`, `FaceOffAttempt` | Optional AI Gateway -> SHA-256 fallback; auto-resolves duels | Partial |
| `/api/scans` | `GET` | `src/app/api/scans/route.ts` | `getSessionUser` | Self | None | `User`, `Scan`, `Streak`, `PointsLedger` | Returns recent 20 scans | Functional |
| `/api/scans/[id]` | `GET` | `src/app/api/scans/[id]/route.ts` | **None!** | **None!** | None | `Scan`, `User`, `Streak`, `PointsLedger` | **P0:** Unauthenticated IDOR on any scan UUID | Insecure |
| `/api/rating/fairness` | `GET` | `src/app/api/rating/fairness/route.ts` | **None** | None | None | None | Runs synthetic `runFairnessAudit()` | Functional (synthetic) |
| `/api/shop` | `GET` | `src/app/api/shop/route.ts` | `getSessionUser` | Self | None | `User`, `UserItem`, `Card`, `ShopItem` | Returns Boutique catalog with ownership/lock status | Functional |
| `/api/shop/items` | `GET` | `src/app/api/shop/items/route.ts` | Public | None | None | `ShopItem` | Public active catalog | Functional |
| `/api/shop/purchase` | `POST` | `src/app/api/shop/purchase/route.ts` | `getSessionUser` | Self | `itemId`, `Idempotency-Key` | `IdempotencyRecord`, `User`, `ShopItem`, `UserItem`, `Streak`, `Purchase`, `PointsLedger` | Fallback key blocks 2nd `streak-freeze` | Partial |
| `/api/shop/equip` | `POST` | `src/app/api/shop/equip/route.ts` | `getRequiredUser` | Owns item & card | `itemId` | `User`, `UserItem`, `Card`, `ShopItem` | Toggles skin/title/frame on `cards[0]` | Functional |
| `/api/faceoffs` | `GET` | `src/app/api/faceoffs/route.ts` | Optional | Public open / own | None | `FaceOff`, `User`, `Scan` | Expires stale duels on read | Functional |
| `/api/faceoffs` | `POST` | `src/app/api/faceoffs/route.ts` | `getRequiredUser` | Self | Mode, stake, handle | `User`, `FaceOff`, `PointsLedger` | Holds stake, enforces 5/day cap & same-tier | Functional |
| `/api/faceoffs/[id]` | `GET` | `src/app/api/faceoffs/[id]/route.ts` | **None** | Public | None | `FaceOff`, `User`, `Scan` | Returns duel details | Functional |
| `/api/faceoffs/[id]` | `DELETE` | `src/app/api/faceoffs/[id]/route.ts` | `getRequiredUser` | Challenger only | None | `FaceOff`, `PointsLedger` | Cancels `WAITING` duel & refunds stake | Functional |
| `/api/faceoffs/[id]/join` | `POST` | `src/app/api/faceoffs/[id]/join/route.ts` | `getRequiredUser` | Not challenger; target if private | None | `User`, `FaceOff`, `PointsLedger` | Joins duel, holds stake | Functional |
| `/api/faceoffs/invite/[code]` | `GET` | `src/app/api/faceoffs/invite/[code]/route.ts` | Public | None | `code` | `FaceOff`, `User`, `Scan` | Returns invite preview | Functional |
| `/api/friends` | `GET` | `src/app/api/friends/route.ts` | `getSessionUser` | Self | `q`, `suggested` | `AuditLog`, `User`, `FaceOff`, `Scan`, `Streak` | Lists friends or all users | Functional |
| `/api/friends` | `POST` | `src/app/api/friends/route.ts` | `getSessionUser` | Self | `targetHandle` | `User`, `AuditLog` | Creates `ADD_FRIEND` AuditLog | Functional |
| `/api/friends/[id]` | `GET` | `src/app/api/friends/[id]/route.ts` | Optional | Public | UUID or handle | `User`, `AuditLog`, `FaceOff`, `Scan`, `Streak` | Returns profile & H2H record | Functional |
| `/api/friends/[id]` | `POST,DELETE` | `src/app/api/friends/[id]/route.ts` | `getSessionUser` | Self | UUID or handle | `User`, `AuditLog` | Adds/removes `ADD_FRIEND` AuditLog | Functional |
| `/api/leaderboard` | `GET` | `src/app/api/leaderboard/route.ts` | Optional | Public | None | `User`, `Streak`, `Scan` | Top 50 by `lifetimePoints` (includes `DELETED`!) | Partial |
| `/api/share-cards` | `POST` | `src/app/api/share-cards/route.ts` | `getRequiredUser` | Self | None | `ShareCard` | Creates 30d `ShareCard` row | Functional |
| `/api/share-cards/[id]` | `GET` | `src/app/api/share-cards/[id]/route.ts` | Public | Public | `id` | `ShareCard`, `User`, `Scan` | Ignores `expiresAt` & `deletedAt` | Partial |
| `/api/share-cards/[id]` | `DELETE` | `src/app/api/share-cards/[id]/route.ts` | **None!** | **None!** | `id` | `ShareCard` | **P0:** Unauthenticated arbitrary delete! | Insecure |
| `/api/og` | `GET` | `src/app/api/og/route.tsx` | Public | Public | Query params | None | Generates 1200×630 PNG via `next/og` | Functional |
| `/api/health` | `GET` | `src/app/api/health/route.ts` | Public | Public | None | `SELECT 1` | Returns DB latency & service status | Functional |
| `/api/cron/reconcile` | `GET` | `src/app/api/cron/reconcile/route.ts` | `CRON_SECRET` (prod) | Cron | Header check | `User`, `PointsLedger`, `FaceOff` | Reconciles ledgers & expires stale duels | Functional |
