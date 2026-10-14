# Face Card — Backend Requirements

Version 0.1 · October 12, 2026 · Companion to the Face Card PRD

## 1. Scope and stack

The backend is the source of truth for scoring, points, streaks, stakes, and the shop. The client never decides anything involving points.

- **Runtime:** Next.js route handlers on Cloudflare Workers, using the OpenNext Cloudflare adapter with the nodejs\_compat flag.
- **Database:** Neon Postgres reached through Neon's serverless driver (HTTP or WebSocket), which works on Workers; Prisma with the Neon driver adapter and a Workers-compatible client (check Prisma's current Workers guidance); Prisma Migrate for schema changes. Cloudflare Hyperdrive is an optional connection pooler.
- **Auth:** Better Auth or Auth.js with email one-time code, plus optional Google sign-in. Email delivery through Brevo.
- **Scoring:** one `scoreFace()` function wrapping a vision model, so the provider can be swapped.
- **Rate limiting and counters:** Redis (redis.io) for rate limits and fast daily counters, reached through a Workers-compatible client (see section 17); Postgres remains the source of truth.
- **Object storage:** Cloudflare R2 through a Workers binding (no S3 SDK needed), used only for opt-in share-card images.
- **Scheduling:** Cloudflare Cron Triggers running a scheduled handler that calls the job logic; expired face-offs also resolve lazily when read.
- **Validation:** Zod on every request and on every model response.
- **Observability:** Sentry plus structured logs, with image data scrubbed.

## 2. Data model (Prisma on Neon)

| Model | Key fields and rules |
| --- | --- |
| User | id, email (unique, lowercased), displayName, ageConfirmedAt, consentVersion, consentAt, lifetimePoints, spendableBalance (CHECK ≥ 0), tier, createdAt, unlockedAt, status (ACTIVE, FLAGGED, BANNED, DELETED) |
| Auth tables | Sessions, accounts, and verification codes from the auth library; codes stored hashed |
| Scan | id, userId, score, band, categoryScores (JSON), modelVersion, promptVersion, scanIndexOfDay, dayKey, source (SOLO or FACEOFF), faceOffId (nullable), createdAt. **No image field.** |
| PointsLedger | id, userId, type, amount, balanceKind (LIFETIME or SPENDABLE), refType, refId, idempotencyKey (unique), createdAt. Append-only. |
| Streak | userId (unique), currentCount, longestCount, lastScanDayKey, freezesHeld |
| Card | id, userId, tier, cardNumber (unique), equippedSkinId, equippedTitleId, equippedFrameId, slot |
| ShopItem | id, kind (SKIN, TITLE, FRAME, BADGE, CONSUMABLE, FEATURE), name, price, minTier, maxOwned, active, assetRef |
| UserItem | id, userId, itemId, quantity, acquiredAt |
| Purchase | id, userId, itemId, price, idempotencyKey (unique), createdAt |
| FaceOff | id, challengerId, opponentId (nullable), inviteCode (unique), mode (STAKED or FRIENDLY), stake, status, challengerBestScanId, opponentBestScanId, winnerId, rematchCount, feeAmount, expiresAt, resolvedAt |
| FaceOffAttempt | id, faceOffId, userId, scanId, attemptNumber (1–3) |
| ShareCard | id, userId, scanId or faceOffId, blobKey, publicId, expiresAt, deletedAt |
| EconomyConfig | version, values (JSON: tier thresholds, multipliers, caps, fee, stake limits), activeFrom |
| AbuseFlag | id, userId, reason, severity, createdAt, reviewedAt, outcome |
| AuditLog | id, actor, action, targetType, targetId, detail, createdAt |

Enums: Tier (CLASSIC, GOLD, PLATINUM, BLACK), Band (HARMLESS, SUSPICIOUS, DANGEROUS, LETHAL), FaceOffStatus (WAITING, ACTIVE, TIE\_REMATCH, COMPLETED, EXPIRED, CANCELLED).

Key indexes: Scan(userId, dayKey); PointsLedger(userId, createdAt); FaceOff(inviteCode), FaceOff(challengerId, status), FaceOff(opponentId, status), FaceOff(expiresAt) where status is open; ShareCard(expiresAt).

## 3. API surface

All routes require a session unless noted. Mutating routes require an `Idempotency-Key` header.

| Method and path | Purpose | Key rules |
| --- | --- | --- |
| `/api/auth/*` | Email OTP and Google sign-in (library-managed) | Rate-limited; see section 8 |
| `POST /api/consent` | Record age confirmation and consent version | Required before any scan |
| `GET /api/me` | Profile, tier, balances, scans left today, streak, multiplier, reset time | Server time in WAT |
| `POST /api/scan` | Submit a selfie (multipart) | Full pipeline in section 4 |
| `GET /api/scans/:id` | Scan result | Owner only |
| `GET /api/card` | Card, tier progress, equipped items |  |
| `GET /api/points` | Balances and recent ledger entries | Paginated |
| `GET /api/shop` | Catalog with owned, locked, and price state | Cached |
| `POST /api/shop/purchase` | Buy an item | Transactional; tier and balance checked |
| `POST /api/shop/equip` | Equip an owned item | Ownership checked |
| `POST /api/faceoffs` | Create a face-off | Stake held in escrow |
| `GET /api/faceoffs` | My face-offs | Paginated |
| `GET /api/faceoffs/invite/:code` | Public preview of a challenge (no auth) | Challenger display name, tier, stake, deadline only |
| `POST /api/faceoffs/:id/join` | Accept a challenge | Stake held |
| `POST /api/faceoffs/:id/scan` | Submit a face-off attempt | Same pipeline; does not use the daily cap |
| `POST /api/faceoffs/:id/lock` | Lock in the best attempt | Triggers resolution when both locked |
| `POST /api/faceoffs/:id/cancel` | Cancel before an opponent joins | Refunds the stake |
| `POST /api/share-cards` | Upload a rendered card (opt-in) | Section 10 |
| `DELETE /api/share-cards/:id` | Delete a share card | Owner only |
| `DELETE /api/account` | Delete the account | Section 8 |
| `GET /api/account/export` | Export the user's own data | Access right |
| `POST /api/report` | Report abuse or a result | Creates an AbuseFlag |
| `POST /api/jobs/:name` | Cron entry points | Secret-protected |

Authorization rule on every object route: the caller must own the object or be a participant in the face-off. Add tests for IDOR on scans, face-offs, and share cards.

## 4. Scan pipeline

1. **Authenticate** and confirm age and consent are recorded.
2. **Reserve** a scan slot atomically (Redis counter backed by a Postgres unique constraint on user, day, and scan index). Daily cap: 3 point-earning scans per user per day, with the day computed in Africa/Lagos time. Face-off scans bypass this cap and use the face-off limits instead.
3. **Validate the upload:** JPEG or PNG, maximum 2 MB (the client downscales first; this is an abuse and cost limit, not a platform limit), sensible dimensions, one face.
4. **Quality gate** (deterministic code, not the model): sharpness by Laplacian variance, exposure measured on the face region relative to that person's skin tone (never absolute brightness), lighting evenness, framing and angle. Failure returns a specific reason and **releases the reserved slot**.
5. **Liveness check:** reject photos of screens, printed photos, and obvious reuse (perceptual hash against that user's recent scans, held in memory only for the check and discarded).
6. **Score with the vision model:** the model returns structured JSON with subjective sub-scores (harmony, skin clarity, feature definition, symmetry, expression, aura). Validate with Zod; one retry on malformed output; low temperature. Code-measured values supply sharpness, exposure and lighting, and framing.
7. **Compute Lethality (0–100)** with the weights below, then the band.
8. **Persist in one transaction:** Scan row, ledger entries, streak update, tier recalculation.
9. **Discard the image buffer.** It is never written to disk, storage, or logs.
10. **Respond** with score, band, breakdown, points earned, multiplier applied, new streak, and any tier change.

If the model call fails or times out (20-second limit), release the reserved slot, grant nothing, and return a retryable error.

**Scoring weights (config-driven):** photo craft 30 (lighting 15, sharpness 8, framing and angle 7); face 45 (harmony and averageness 18, skin clarity 12, feature definition 10, symmetry 5); expression and eye contact 15; aura 10. Lethality is the weighted sum of the 0–100 sub-scores. Bands: Harmless under 40, Suspicious 40–64, Dangerous 65–84, Lethal 85 and above.

**Scoring principles**

- Skin lightness is never an input. Skin clarity and evenness only.
- No random jitter on scores in face-offs. For stability, score twice and average when the two runs differ by more than a small threshold.
- Store `modelVersion` and `promptVersion` with every scan so scores can be audited and re-baselined.
- Maintain an offline calibration set spanning a wide range of Nigerian faces, skin tones, and lighting. Run it on every prompt or model change and block releases that widen gaps between groups.
- Configure the model provider for zero data retention and no training on inputs. Confirm this in the provider terms before launch.

## 5. Points ledger and economy engine

- **Append-only ledger.** Never update or delete entries; corrections are new entries. Balances on the User row are a cached projection updated in the same transaction, with `spendableBalance ≥ 0` enforced by a database check and row locks (`SELECT ... FOR UPDATE`).
- **Ledger types:** SCAN, FACEOFF\_STAKE\_HOLD, FACEOFF\_PAYOUT, FACEOFF\_REFUND, FACEOFF\_FEE, FACEOFF\_WIN\_BONUS, SHOP\_PURCHASE, ADJUSTMENT.
- **Scan points:** base equals the Lethality score. Scan 1 of the day pays 100%, scans 2 and 3 pay 50%. Multiply by the streak multiplier, round, and credit both lifetime and spendable balances.
- **Streak multiplier:** days 1–2 ×1.0; 3–6 ×1.1; 7–13 ×1.25; 14–29 ×1.5; 30 and above ×2.0. Applies to scan points only.
- **Streak logic (lazy, on each scan):** compare today's dayKey with `lastScanDayKey`. Same day: no change. Yesterday: increment. Gap: consume one freeze per missed day if enough are held, otherwise reset the streak to 1. Maximum 2 freezes held.
- **Tiers:** based on lifetime points only and never decrease. Initial thresholds: Classic 0, Gold 1,000, Platinum 5,000, Black Card 20,000.
- **New-account lock:** points on a new account are unspendable for 24 hours or until three scans complete, tracked with `unlockedAt`.
- **Config-driven:** every number lives in `EconomyConfig` with a version, so the economy can be tuned without a deploy. Ledger rows record the config version used.
- **Reconciliation:** a nightly job checks that cached balances equal ledger sums and raises an alert on any drift.

## 6. Face-off engine

Status flow: WAITING → ACTIVE → COMPLETED, with TIE\_REMATCH, EXPIRED, and CANCELLED as side exits.

1. **Create:** validate the stake, hold it from the challenger's spendable balance (FACEOFF\_STAKE\_HOLD), generate an invite code, set `expiresAt` to 24 hours.
2. **Join:** the opponent's equal stake is held. Challenger and opponent cannot be the same user or the same device or IP pair flagged as linked.
3. **Attempts:** each player may submit up to 3 attempts (the first plus two retakes). The best-scoring attempt counts. Players lock in when ready; the face-off resolves when both have locked or when the deadline hits.
4. **Resolve:** the higher score wins. Pot is two times the stake. The system fee is 5% of the pot, rounded down (FACEOFF\_FEE). The winner receives the rest (FACEOFF\_PAYOUT) plus a small win bonus. Tier and lifetime points are unaffected by staking.
5. **Tie:** stakes remain held and status moves to TIE\_REMATCH for one more round. A second tie refunds both stakes with no fee.
6. **Expiry:** if the opponent never completes, the stake is refunded to the challenger. If one player locks and the other doesn't before the deadline, the player who locked wins by forfeit and receives the opponent's stake minus the fee.
7. **Cancel:** allowed only while WAITING; refunds the stake.

**Stake rules (initial, config-driven):** minimum 50; maximum is the lower of 500 and 25% of the smaller player's spendable balance; both stakes equal; only unlocked points can be staked.

**Friendly mode (assumption to confirm):** a no-stake face-off for players who have no unlocked points, so new invitees can still play. The winner gets a small system-funded bonus. This keeps invite links converting without letting brand-new accounts move points.

**Anti-collusion:** maximum 5 face-offs per account per day; after 3 face-offs between the same pair in 7 days the win bonus is removed, and after 5 the pair is blocked for the week; wins against accounts under 7 days old pay no win bonus; nightly job flags net point flow from many accounts into one.

**Concurrency:** all stake and payout movements run in a single transaction with row locks on both users, ordered by user id to avoid deadlocks.

## 7. Shop and inventory

- Catalog seeded from a versioned file and stored in `ShopItem`; prices can change without breaking past purchases (price recorded on the Purchase).
- Purchase transaction: verify tier gate, ownership limits, and balance; write the SHOP\_PURCHASE ledger entry, the Purchase, and the UserItem together.
- Cosmetics are owned once; consumables have quantity and caps (streak freezes max 2; retake tokens that grant practice scans earning no points).
- Equip endpoint validates ownership and writes the card's equipped item ids.
- No item can add point-earning scans, so the daily cap cannot be bought around.

## 8. Auth, sessions, and account lifecycle

- **Email OTP:** 6 digits, hashed at rest, 10-minute expiry, single use, 5 attempts per code, 60-second resend cooldown, rate limits per email and per IP.
- **Disposable emails:** block known disposable domains; maintain the list as a config file.
- **Sessions:** httpOnly, secure, SameSite=Lax cookies; sessions rotate on sign-in; users can sign out of all devices.
- **Age and consent:** record `ageConfirmedAt`, `consentVersion`, and timestamp. Re-prompt when the consent version changes.
- **Account deletion:** immediate deactivation, then a purge job within 30 days that deletes the user, scans, share cards (and blob objects), and sessions. Ledger rows are kept with the user id replaced by a tombstone so the economy still reconciles.
- **Data export:** a JSON export of the user's own profile, scans (scores only), ledger, and purchases.

## 9. Anti-abuse and fraud

| Control | Rule |
| --- | --- |
| Scan cap | 3 point-earning scans per account per day (WAT), enforced atomically |
| IP and device limits | Per-IP and per-device-cookie scan and sign-up limits, with hashed identifiers only |
| OTP abuse | Per-email and per-IP send and verify limits |
| New accounts | Points unspendable for 24 hours or until 3 scans complete |
| Liveness | Reject screens, printed photos, and repeated images |
| Collusion | Pair limits, win-bonus removal, nightly flow analysis (section 6) |
| Model cost guard | Global daily budget circuit breaker that pauses scans and shows a friendly message |
| Review | AbuseFlag queue with a minimal admin view; actions logged in AuditLog |
| Sanctions | WARN, LIMIT (no staking), or BAN; banned accounts keep data access for export |

## 10. Share cards and storage

- Share-card images are rendered on the client and uploaded only when the user taps "Get share link".
- Server checks: PNG or JPEG, maximum 1.5 MB, expected dimensions (1080×1350 or 1080×1920), a signed token tied to a real scan or face-off, metadata stripped, and an automated image-safety check so the endpoint cannot host arbitrary images.
- Stored under an unguessable key; public page `/s/[publicId]` serves the image with Open Graph tags.
- Default expiry 30 days; user can delete at any time; deletion removes the blob and sets `deletedAt`.
- The original selfie is never stored.

## 11. Privacy, compliance, and retention

- Selfies are biometric data under the NDPA: processed in memory, discarded, never logged. Scrub request bodies from logs and error reports (for example Sentry `beforeSend`).
- No model training on user images; any future training use needs a separate opt-in.
- Review with a Nigerian lawyer before launch: NDPA controller registration duties, consent wording, cross-border transfer to the model provider, and the rule that points stay non-cash, non-purchasable, and non-transferable.
- Keep a record of processing activities and a data-protection impact assessment for the scoring feature.

| Data | Retention |
| --- | --- |
| Selfie image | Not retained (memory only during the request) |
| Scan records (scores) | While the account is active; deleted with the account |
| OTP codes | 10 minutes |
| Ledger | Kept for economy integrity; user id tombstoned on deletion |
| Share cards | 30 days or until deleted |
| Application logs | 30 days, with no image data |
| Abuse flags and audit log | 12 months |

## 12. Scheduled jobs

| Job | Frequency | Purpose |
| --- | --- | --- |
| expire-faceoffs | Every 5 minutes | Resolve forfeits, expire open face-offs, refund stakes |
| expire-share-cards | Daily | Delete expired blobs and rows |
| reconcile-ledger | Nightly | Compare cached balances to ledger sums and alert on drift |
| collusion-scan | Nightly | Flag suspicious point flows and repeated pairs |
| purge-deleted-accounts | Daily | Hard-delete accounts past the grace period |
| economy-report | Weekly | Points minted versus sunk, tier distribution, inflation trend |

Jobs are idempotent and protected by a secret header.

## 13. Observability and operations

- Metrics: scan latency (target p95 under 8 seconds), model cost per scan, quality-gate rejection rate, model failure rate, face-off completion rate, ledger drift (target zero).
- Alerts on error spikes, cost spikes, drift, and job failures.
- Minimal admin tools in v1: user lookup, ledger view, flag review, manual adjustment with a required reason (written to AuditLog).
- Feature flags for the economy and new features, driven by `EconomyConfig`.

## 14. Performance and cost

- Use Neon's serverless driver with the Prisma Neon adapter (or Hyperdrive) so Workers never exhaust database connections.
- Cache the shop catalog and economy config in memory with short TTLs.
- Keep scan handlers lean: no unnecessary database round trips; one transaction for all writes. On Workers, analyze images with WebAssembly codecs (for example jSquash) at a reduced size, since native libraries such as sharp are unavailable, and keep CPU time within the plan's limit (the scan route needs Workers Paid).
- Track and cap model spend per day; consider a cheaper model tier for the quality pre-check.

## 15. Testing

- Unit tests for scoring math, streak logic, multipliers, and tier thresholds, including edge cases around midnight WAT.
- Property tests: the ledger always sums to the cached balance; spendable balance never goes negative.
- Concurrency tests: simultaneous scans at the cap, double-submitted purchases, double-joined face-offs, opposing payouts.
- Idempotency tests for every mutating route.
- Security tests: OTP brute force, IDOR on scans, face-offs, and share cards, upload abuse.
- Fairness suite: calibration set across skin tones and lighting before every model or prompt change.
- Load test for scan throughput and model timeouts.
- Use Neon branches for isolated test databases.

## 16. Environments and deployment

- Environments: local, preview (per pull request, with its own Neon branch), and production.
- Prisma Migrate runs in CI; migrations are backward compatible and reviewed.
- Secrets as Wrangler secrets, never in the repo; separate keys per environment, including the model provider.
- Seed scripts for shop items, economy config, and test users.
- Rollback plan: roll back to the previous Worker version, plus forward-only migrations.

## 17. Open questions

- Which vision model provider and prompt set gives the most consistent scores, and does its zero-retention setting meet NDPA needs?
- Confirm the friendly (no-stake) face-off mode.
- Confirm best-of-three attempts per face-off, and forfeit-by-lock handling.
- Final stake limits, fee percentage, and tier thresholds after an economy simulation.
- Whether phone verification is added later for high stakes or shop purchases.

* Redis on Workers: Redis Cloud (redis.io) is TCP-only. Confirm a Workers-compatible client works reliably, or use Cloudflare's Rate Limiting binding for rate limits and keep the daily cap in Postgres.
* Add Cloudflare Turnstile to the OTP request form to cut bot sign-ups.
* Dynamic Open Graph images for face-off invites need a Workers-compatible generator.

## 18. Audit amendments (proposed, pending your confirmation)

These come from `AUDIT.md`. Sections 1 to 17 above are your original text and are unchanged. Once an amendment is approved, it replaces any conflicting text above. IDs match `AUDIT.md`.

**Confirmed decisions:** friendly (no-stake) face-offs ship in v1 alongside staked ones. Hosting is Cloudflare Workers.

### 18.1 Schema and ledger fixes

| ID | Amendment | Affects |
| --- | --- | --- |
| D1 | Never hard-delete the `User` row. The purge job anonymizes it (clear email, set display name to "Deleted user", status DELETED) and deletes scans, share cards (and R2 blobs), and sessions explicitly. Foreign keys from `PointsLedger` and `FaceOff` to `User` must not cascade. | Sections 2, 8 |
| D2 | A scan writes two ledger rows (lifetime and spendable) from one request, so `idempotencyKey` cannot be unique on its own. Make uniqueness `(idempotencyKey, balanceKind)`, or derive per-row keys (`{key}:LIFETIME`, `{key}:SPENDABLE`). | Section 2 |
| D3 | Add `IdempotencyRecord` (key, userId, route, requestHash, status, responseBody, createdAt, expiresAt). A retry with the same key replays the stored response; the same key with a different request hash is rejected. Keep for 48 hours. Responses never contain image data. | Section 3 |
| D4 | Add `ScanSlot` (userId, dayKey, slotIndex, state RESERVED, COMMITTED or RELEASED, scanId, reservedAt) with a unique `(userId, dayKey, slotIndex)`. The cap counts RESERVED and COMMITTED slots. A sweep releases slots stuck in RESERVED for more than 2 minutes (the model timeout is 20 seconds). | Section 4 |
| D5 | Prisma cannot declare CHECK constraints, so add them in a raw SQL migration: `spendableBalance >= 0`, `lifetimePoints >= 0`, `stake > 0`, `attemptNumber BETWEEN 1 AND 3`. | Section 2 |
| D6 | Create the `Streak` row on the first scan with `currentCount = 1`. No default before that. | Section 2 |
| D7 | Keep the tier in one place (`User.tier`) and drop `Card.tier`, or update both in the same transaction. | Section 2 |
| D8 | Add: `User.handle` (unique, lowercase, 3 to 20 characters) with an onboarding step, so challenge-by-username works; `ConsentRecord` (userId, version, kind, acceptedAt) for consent history and a separate analytics consent; invite attribution on `User` (the face-off that brought them in) for the "no payout between a new account and its inviter" rule; stores for hashed device and IP identifiers. Make `Scan.source` an enum (SOLO, FACEOFF, PRACTICE) and add the relation from `Scan.faceOffId` to `FaceOff`. `FaceOff.mode` is an enum. | Sections 2, 6, 9 |

### 18.2 Missing endpoints

| Method and path | Purpose |
| --- | --- |
| `GET /api/faceoffs/:id` | Face-off detail for the frontend detail page (participants only) |
| `GET /api/share-cards` | List the user's share links for settings |
| `PATCH /api/me` | Update display name and handle |
| `POST /api/auth/sign-out-all` | Sign out of all devices (or confirm the auth library provides it) |
| `POST /api/scan/practice` | Practice scan using a retake token: scored, no ledger writes, no streak change, not counted against the daily cap |
| `GET /api/config/public` | Stake limits, fee, tier thresholds and perks for the StakePicker and tier ladder |
| `GET /s/[publicId]` | Public share-card page with Open Graph tags (page route, not API) |

`GET /api/me` should also return `serverNow` and `resetAt` so the client countdown does not depend on the device clock.

### 18.3 Infrastructure choices to confirm

| ID | Proposal |
| --- | --- |
| D9 | **Redis on Workers:** use Cloudflare's Rate Limiting binding for rate limits and enforce the daily cap in Postgres through `ScanSlot`. Drop Redis from v1. This resolves the first note in section 17. |
| D10 | **Face detection on the server is unspecified.** The quality gate needs "one face" and a face region for exposure, and Workers has no native imaging libraries. Pick one: (a) a WASM face landmarker on the Worker, after checking CPU limits, or (b) take the face count from the vision model and keep the deterministic gate for sharpness, exposure, and lighting only. Decide before building the scan route. |
| D13 | Verify Prisma's current Workers guidance (preview flags, client engine, bundle size) before scaffolding. |
| D15 | Choose one job entry path. The `scheduled` handler needs a custom Worker entry that wraps the OpenNext output; either call job logic from it directly and drop `POST /api/jobs/:name`, or keep the route and have the scheduled handler call it. |

### 18.4 Face-off and economy rules to settle

| ID | Issue | Proposal |
| --- | --- | --- |
| C2 | Face-off scans bypass the daily cap, and the spec does not say whether they earn SCAN points or count toward the streak. | Face-off scans earn no SCAN points and do not count toward the streak. Only the pot, the fee, and the win bonus apply. |
| C3 | Scored photos per user per day are unbounded in cost: 3 solo plus up to 15 face-off attempts, doubled by "score twice and average". | Cap total scored photos per user per day, and double-score only in staked face-offs or only when two runs disagree. Build the cost model before choosing the provider. |
| C4 | "24 hours or until three scans complete" lets a new account unlock in minutes. | Require both conditions, or a return on a second day. |
| C5 | Friendly-mode winner bonus is system-funded, so it creates points and can be farmed with alternate accounts. | No bonus in friendly mode, or cosmetic rewards only. Open question also logged in `PRD.md` section 15. |
| D11 | Undefined face-off edge cases. | See the table below. |

| Situation | Proposed outcome |
| --- | --- |
| WAITING face-off expires | EXPIRED; refund the challenger |
| ACTIVE, neither player has attempted by expiry | EXPIRED; refund both, no fee |
| ACTIVE, both have at least one attempt but not both locked | Auto-lock each player's best attempt and resolve normally |
| ACTIVE, only one player has attempted | That player wins by forfeit and receives the opponent's stake minus the fee (as in section 6) |
| Join and cancel at the same moment | Row lock on the `FaceOff`; the first status check wins and the other call fails cleanly |
| Friendly mode, any outcome | No ledger writes and no fee |

