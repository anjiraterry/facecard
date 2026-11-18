# 09 — Gamification, Points Economy & Rewards

## 1. Dual-Balance Economy (`src/lib/economy.ts`, `src/lib/ledger.ts`)

| Balance | Purpose | Mutation Rules |
|---|---|---|
| **`User.lifetimePoints`** (`BalanceKind.LIFETIME`) | Determines `User.tier` (`CLASSIC` 0, `GOLD` 1,000, `PLATINUM` 5,000, `BLACK` 20,000) and `/leaderboard` ranking | **Strictly non-decreasing** (`postLedger` throws if `< 0`). |
| **`User.spendableBalance`** (`BalanceKind.SPENDABLE`) | Spent in `/shop` (Boutique) and staked in `/faceoff` (Arena) | Can increase (signup grant, scan, duel payout/refund/bonus) or decrease (shop purchase, duel stake hold). DB `CHECK ("spendableBalance" >= 0)` + atomic conditional `updateMany`. |

- **Append-Only Ledger (`PointsLedger`):**
  - Enforced by `postLedger()` (`src/lib/ledger.ts:51-97`) and PostgreSQL trigger `PointsLedger_append_only` (`prisma/migrations/2_points_integrity/migration.sql:9-17`), which raises an exception on `UPDATE` or `DELETE`.
  - Unique constraint `@@unique([idempotencyKey, balanceKind])` allows one business event (e.g. `scan:<scanId>`) to write both `SPENDABLE` and `LIFETIME` rows atomically.

## 2. Earning Mechanisms & Calculations

1. **Welcome Grant (`grantSignupBonus`, `src/lib/ledger.ts:100-114`):**
   - Credits `100` `SPENDABLE` + `100` `LIFETIME` (`ADJUSTMENT`, `refType: 'SIGNUP_GRANT'`) on `/api/card/claim` and new-user `/api/auth/otp/verify`.
2. **Daily Solo Scans (`src/app/api/scan/route.ts`, `src/lib/scoring.ts:62-70`):**
   - Cap: **3 scans/day** resetting `00:00` `Africa/Lagos` (WAT), guarded by `ScanSlot` (`@@unique([userId, dayKey, slotIndex])`).
   - Formula: `Math.round(score * baseRate * multiplier)` where `baseRate` is `1.0` (scan 1) or `0.5` (scans 2 & 3).
   - Credited to **both** `SPENDABLE` and `LIFETIME`.
3. **Streaks & Streak Freeze (`src/app/api/scan/route.ts:302-317`, `src/lib/scoring.ts:54-60`):**
   - Ladder: `1–2d: ×1.0`, `3–6d: ×1.1`, `7–13d: ×1.25`, `14–29d: ×1.5`, `30+d: ×2.0`.
   - If `lastScanDayKey === yesterdayKey`, increments `currentCount`. If `lastScanDayKey === todayKey`, unchanged. If missed a day and `freezesHeld > 0`, decrements `freezesHeld` by 1 and preserves streak. Otherwise resets to `1`.
   - **Note:** `Streak` is initialized at `currentCount: 1` upon signup (`claim/route.ts:101`) before any scan is taken.
4. **Arena Victory Bonus (`src/lib/faceoff.ts:295,333-344`):**
   - `WIN_BONUS_POINTS = 25` credited to `SPENDABLE` only on non-forfeit `resolveFaceOff()` wins (both `STAKED` and `FRIENDLY`).

## 3. Rewards, Cosmetics & Unimplemented Mechanics

- **Points Boutique (`/shop`):** Redeems `SPENDABLE` points for `SKIN`, `TITLE`, `FRAME`, and `CONSUMABLE` (`streak-freeze` 150 PTS, `boost-aura-2x` 250 PTS). Purely cosmetic/in-app game perks — **no cash value, no physical product redemption, no Atelier link**.
- **Unimplemented / Broken Mechanics:**
  - **`boost-aura-2x` ("Double Points Surge"):** Seeded in `prisma/seed.ts:66-73` and purchasable in `/shop`, but `/api/scan/route.ts` **never checks `UserItem` for `boost-aura-2x` and never doubles points**.
  - **2nd Streak Freeze Purchase Bug:** `POST /api/shop/purchase` falls back to `shop-purchase-${userId}-${itemId}` when no `Idempotency-Key` header is sent (`purchase/route.ts:27`), blocking a second purchase within 24h even though `MAX_STREAK_FREEZES = 2`.
  - **Referral Bonus (`+100 PTS`):** Advertised on `/friends/add` (`src/app/friends/add/page.tsx:119`) but not implemented.
  - **Courtesy Point Gifting (`50 PTS`):** Mocked on `/friends/[id]` (`src/app/friends/[id]/page.tsx:183-194`).
  - **Achievements & Seasonal Progression:** Do not exist in schema or code.
