# 06 — Authentication, Identity & Profiles

## 1. Dual Authentication Architecture (Contradiction)

1. **Active Custom Auth System (Used by all pages & APIs):**
   - **Cookie:** `fc_session` (`HttpOnly`, `SameSite=Lax`, `Secure` in production, 30-day TTL) (`src/lib/auth/sessions.ts:6-9,238-250`).
   - **Storage:** `AuthSession` table storing `tokenHash` (SHA-256 of 32 random bytes), `expiresAt`, `revokedAt`, `ip`, `userAgent` (`prisma/schema.prisma:117-132`).
   - **Claim / Registration (`POST /api/card/claim`):** Creates `User` + `Streak` + `Card` + 100 PTS signup grant in one transaction, hashes 4–6 digit PIN with `scrypt` + 16-byte random salt (`src/lib/auth/pin.ts:9-13`), issues `fc_session`. Rate-limited to 10/hour/IP via `AuthAttempt`.
   - **PIN Login (`POST /api/auth/pin-login`):** Looks up user by `handle` (case-insensitive) or `Card.cardNumber`, verifies `pinHash` with `timingSafeEqual`. Rate-limited to 5 fails/15m per identifier and 20 fails/15m per IP. Runs dummy `hashPin()` on missing user to prevent timing-based enumeration.
   - **Email OTP (`POST /api/auth/otp/send`, `POST /api/auth/otp/verify`):** Generates 6-digit code, stores HMAC-SHA256(`AUTH_SECRET`, `email:code`) in `OtpChallenge` (10-min TTL, max 5 guesses, single-use `consumedAt`). Blocks 10 disposable domains (`src/lib/auth/otp.ts:7-18`). Sends via Brevo API (`src/lib/spikes/spikes.ts:147-186`) or returns `devCode` in non-prod when `BREVO_API_KEY` is unset. Auto-creates `User` if email is new.
   - **Link Email (`POST /api/auth/link-email`):** Authenticated user verifies OTP before attaching `email`.
   - **Session Refresh & Signout:** `GET/POST /api/auth/session/refresh` slides `expiresAt` by 30 days; `POST /api/auth/signout` revokes `AuthSession` and clears `fc_session` + legacy `fc_user_id`.

2. **Unused Neon Auth (`@neondatabase/auth`):**
   - `src/lib/auth/server.ts:3-8` (`createNeonAuth`) is mounted at `src/app/api/auth/[...path]/route.ts`.
   - `src/lib/auth/client.ts:3` exports `authClient = createAuthClient()`.
   - **Zero** components, hooks, or API routes call `auth` or `authClient`. Note also `NEON_AUTH_COOKIE_SECRET` falls back to a hardcoded dev string in `server.ts:6`.

---

## 2. User Profile, Consent, Roles & Account Deletion

- **Identity vs. Profile:** Both live on the single `User` model (`prisma/schema.prisma:81-114`). There is no separate `Profile` table.
- **Uniqueness:** `User.email` (`@unique`, nullable), `User.handle` (`@unique`, nullable).
- **Age & Consent (`POST /api/consent`, `POST /api/scan`):**
  - `User.ageConfirmedAt` (18+ gate) and `User.consentAt` / `consentVersion` (`1.0-NDPA`).
  - **Gap:** `claim/route.ts:95-97` and `otp/verify/route.ts:65-67` automatically set `ageConfirmedAt = new Date()` and `consentAt = new Date()` on signup without showing an explicit 18+ or NDPA consent step!
- **Profile Updates (`PATCH /api/me`):**
  - Updates `displayName`, `handle`, and **`email` directly without OTP verification** (`src/app/api/me/route.ts:108-115`) — a critical security bypass of `/api/auth/link-email`.
  - Frontend `/profile` (`src/app/profile/page.tsx:149-154`) also sends `bio` and `location`, which are silently ignored because `User` has no `bio` or `location` columns.
- **Account Deletion (`DELETE /api/me`):**
  - Revokes all `AuthSession`s, tombstones `User` (`status: 'DELETED'`, `email: null`, `handle: null`, `displayName: 'Deleted Contender'`, `pinHash: null`, `ageConfirmedAt: null`, `consentAt: null`), and deletes `ShareCard` rows (`src/app/api/me/route.ts:134-175`). Preserves `PointsLedger` (`onDelete: Restrict`) and `Scan`s.
  - **Gap:** `User.avatarUrl` is **not** cleared during account deletion!
- **Missing Capabilities:** Password/PIN reset flow (if user has no email linked, account is unrecoverable if PIN is forgotten), roles/RBAC (`ADMIN` role does not exist on `User`), user blocking, and privacy visibility settings (all profiles and scores are readable via `/api/friends/[id]` and `/api/leaderboard`).
