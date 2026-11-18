# 19 — Performance & Scalability

## 1. Verified Query & Architecture Concerns

1. **Unbounded `GET /api/friends` (`src/app/api/friends/route.ts:44-87`):**
   - When `?suggested=true` or even when listing friends, it executes `db.user.findMany({ where: { id: { not: sessionUser.id } }, include: { streak: true, scans: { take: 1 }, faceOffsWon: ..., faceOffsChallenged: ..., faceOffsOpposed: ... } })` **across ALL users in the database** with no `take`/pagination, plus fetches all `WAITING`/`ACTIVE` `FaceOff` rows! This will degrade linearly with user growth ($O(N)$ full-table scan).
2. **On-Read Duel Expiry (`src/app/api/faceoffs/route.ts:14`):**
   - Every `GET /api/faceoffs` awaits `expireStaleDuels()`, which queries all expired duels and runs sequential `db.$transaction` loops. Under concurrent traffic, multiple requests will contend on the same expiring duels.
3. **Leaderboard Query (`src/app/api/leaderboard/route.ts:13-23`):**
   - No caching (runs `findMany` + `scans` + `streak` join on every request).
4. **Full-Table Reconciliation (`src/lib/ledger.ts:166-189`):**
   - `reconcileAllLedgers()` loads all `User` rows into memory; fine at small scale, will need cursor batching at >100k users.
5. **In-Memory Rate Limiter Fallback (`src/lib/auth/rateLimit.ts:17`):**
   - Falls back to `memoryAttempts` `Map` if `db.authAttempt` fails, which is ineffective across stateless Cloudflare Worker isolates (though `AuthAttempt` in Postgres is primary).
6. **Large Base64 Payloads:**
   - `POST /api/scan` accepts up to 11MB JSON (`imageBase64`), and `POST /api/profile/avatar` stores up to 5.5MB base64 strings directly in Postgres `User.avatarUrl`! Moving avatars to R2/Neon Object Storage is critical for DB size and egress.
7. **Unused TanStack Query:** `@tanstack/react-query` is mounted in `QueryProvider.tsx`, but all hooks (`useCard`, `useShop`, `useFaceoff`, `useFriends`) use raw `useEffect` + `fetch`, missing client-side caching and deduplication.
