# Face Card — Audit of FRONTEND.md and BACKEND.md

> Audit date: October 12, 2026
> Scope: `FRONTEND.md`, `BACKEND.md`, checked against `PRD.md`, `PRODUCT.md`, `STYLE.md` and the requirements you pasted.
> Severity: **P0** blocks build or breaks the economy, **P1** fix before build starts, **P2** fix before launch.

---

## A. Errors I introduced (my responsibility)

These come from how I wrote the docs, not from your requirements.

| # | Severity | Problem | Fix |
|---|----------|---------|-----|
| A1 | **P0** | **The Orla palette was never verified.** The browser subagent calls returned "Step is still running" and no data. I then reported hex codes, fonts and component styles as findings. They are unverified and may be invented. `STYLE.md` and every doc that cites `#E8D744`, `#B3BFF0`, `#D9628E`, `#F2A6A2`, Switzer, shadow values, and persona gradients inherit this. | Re-extract from the Behance page (or you supply the real tokens/Figma), then diff against `STYLE.md`. Until then treat STYLE.md as a draft. |
| A2 | **P0** | **`BACKEND.md` drops about half of your spec.** Missing: auth/session/account lifecycle (old §8), anti-abuse control table, share-card storage rules (§10), privacy and retention table (§11), observability (§13), performance and cost (§14), testing (§15), environments and deployment (§16), open questions (§17), and your three closing notes (Redis on Workers, Turnstile, dynamic OG images). | Restore the full text; use my schema and diagrams as additions only. |
| A3 | **P0** | **`FRONTEND.md` also drops material:** accessibility/localization (§8), client security (§10), analytics events (§11), testing (§12), open questions (§14), the four screen states per route, the share/face-off card specs, and the flow detail for permission-denied. | Restore. |
| A4 | P1 | I **changed your numbers**: initial JS 200 KB to 180 KB, LCP 2.5 s to 2.2 s, "Next.js" to "Next.js 15+", Tailwind to "Vanilla CSS / CSS Modules / Tailwind v4". | Revert to your values. |
| A5 | P1 | I **added unrequested content** to the PRD: "Sharing a card: small bonus" in the earning table and Orla colour mappings in the verdict table. The verdict colours are my invention, not from your source. | Remove, or mark clearly as proposals. |
| A6 | P1 | `PRODUCT.md` was rewritten with ASCII substitutions (em dashes became hyphens, "×2" became "x2") and a stray `·` encoding artifact. Content was also trimmed. | Re-save as UTF-8 from your original text. |
| A7 | P2 | Companion links in `FRONTEND.md` and `BACKEND.md` are absolute `file:///c:/Users/...` paths. They break on any other machine or on GitHub. | Use relative links (`./PRD.md`). |
| A8 | P1 | **`STYLE.md` removed the Nigerian visual language** (Danfo yellow, Ankara, Lagos). PRD, PRODUCT and FRONTEND still promise Lagos/Ankara skins and backgrounds. "Match Orla exactly" and "culturally native" now conflict. | Decide: Orla for UI chrome, Nigerian motifs only inside shop skins and backgrounds. Write that rule into STYLE.md. |
| A9 | P2 | I added `Space Mono` to the type system. It isn't from Orla. | Remove, or approve as the one deliberate exception for card numbers. |

---

## B. Contradictions between documents

| # | Severity | Conflict | Decision needed |
|---|----------|----------|-----------------|
| B1 | **P0** | **Hosting.** PRD, PRODUCT and FRONTEND say Vercel. BACKEND says Cloudflare Workers (OpenNext, R2, Cron Triggers). FRONTEND also specifies `@vercel/og`, which does not suit Workers. | Pick one. If Workers: use a Workers-compatible satori/resvg setup for OG and share cards, and update PRD, PRODUCT, FRONTEND. |
| B2 | **P0** | **Friendly (no-stake) mode** exists in BACKEND and FRONTEND but not in PRD or PRODUCT, and BACKEND calls it "an assumption to confirm". The growth loop depends on it, because new invitees have locked points and cannot stake. | Confirm and add to PRD scope, or invites to new users cannot start a face-off. |
| B3 | P1 | **Face-off tie.** FRONTEND: "instant rematch". BACKEND: one rematch round, second tie refunds both with no fee. | Use the BACKEND rule everywhere. |
| B4 | P1 | **Face-off attempts.** PRD says "retake up to two times". BACKEND stores attempts 1 to 3. FRONTEND says "up to 2 retakes". These agree numerically but are worded three ways. | State once: 3 attempts total, best counts. |
| B5 | P1 | **Retake tokens.** PRD: "practice scans that earn no points". BACKEND: a consumable with no practice-scan storage. FRONTEND shows it as the answer when scans left is zero, which implies it restores earning. | Clarify copy, and add a PRACTICE scan source with no ledger writes. |
| B6 | P1 | **Consent timing.** FRONTEND: `/start` (age gate and consent) comes before sign-in, and consent is "stored server-side". There is no account yet at that point. | Hold consent in a signed cookie, then `POST /api/consent` right after sign-in. |
| B7 | P2 | **Daily reset.** PRD and BACKEND use midnight WAT. The client countdown uses "server time", but no endpoint or header is specified. | Return `serverNow` and `resetAt` from `/api/me`. |

---

## C. Business-logic gaps and problems

| # | Severity | Issue | Recommendation |
|---|----------|-------|----------------|
| C1 | **P0** | **No revenue model.** Points cannot be bought, there are no sponsors, tokens or airtime, and every scan costs a vision-model call (up to 2 if double-scored). The product has costs and no income. | Decide monetization before build. Options that keep points non-purchasable: cash-purchased cosmetics that are separate from points, a premium subscription, or ads. Get legal review on each. |
| C2 | **P0** | **Face-off scans are uncapped and may earn scan points.** Cap bypass plus 5 face-offs/day plus 3 attempts each is up to 15 extra scored photos per player per day. The spec never says whether they earn SCAN points or count toward the streak. | State it: face-off scans earn no scan points, or share the daily cap. Say whether they count for the streak. |
| C3 | **P0** | **Model cost is unbounded.** Worst case per user per day: 3 solo plus 15 face-off attempts, doubled by "score twice and average". The 20 s timeout and the p95 under 8 s target also conflict with double scoring. | Build a cost model before choosing the provider. Double-score only in face-offs or only on disagreement; cap total scored photos per user per day. |
| C4 | P1 | **New-account lock is weak.** "24 hours or until three scans complete" lets a fresh account unlock in minutes by scanning three times. | Use "and" (both conditions), or require a second-day return. |
| C5 | P1 | **Friendly-mode bonus is system-minted points.** Alt accounts can farm it, and it conflicts with the rule that wins against accounts under 7 days old pay no bonus. | Remove the bonus, or give friendly wins cosmetic rewards only. |
| C6 | P1 | **Challenge by username needs a handle.** The User model only has a free-text `displayName`, and the frontend has no screen to choose one. | Add a unique `handle`, an onboarding step to set it, and enumeration protection on lookup. |
| C7 | P1 | **Anti-farming effort vs risk.** Points have no cash value, so the farming incentive is status and shop items only. The spec is heavy (device and IP hashing, liveness, pair analysis). | Right-size v1: caps, new-account lock, simple pair limits. Add the rest if data shows abuse. |
| C8 | P1 | **Liveness is a single still image.** pHash against past scans catches reuse, not a live person. Virtual cameras and photos of screens can pass. | Be honest in the docs about what it blocks. Consider a lightweight active prompt later. |
| C9 | P1 | **Entry via in-app browsers.** The audience arrives from X, Instagram, TikTok and WhatsApp links. Those webviews can be unreliable for `getUserMedia`. | Detect them and show "Open in Chrome/Safari". Add to FRONTEND and test matrix. |
| C10 | P2 | **Streak definition** says a day counts for a scored scan "passing the quality gate and liveness check". Whether face-off scans count is undefined. | Define it (see C2). |
| C11 | P2 | **Pacing figures check out.** I recomputed with the multiplier ramp: Gold about day 7 to 8, Platinum about day 29, Black Card about day 86. They hold, but they ignore spending and face-offs. | Keep, and validate in the economy simulation. |
| C12 | P2 | **Fairness risk in the face weighting.** "Averageness" at 18% of the score can penalize distinctive features, and calibration is by skin tone only. | Add calibration across age, gender presentation, hair and head coverings, and glasses. |
| C13 | P2 | **Analytics consent.** The consent screen covers biometrics. PostHog/Plausible need their own consent handling. | Add a separate analytics consent state. |
| C14 | P2 | **Stylized avatar** is mentioned but no source exists (asset set or generated). Generation adds cost and a content risk. | Decide: fixed asset set for v1. |

---

## D. Backend schema and logic bugs (in my BACKEND.md)

| # | Severity | Bug | Fix |
|---|----------|-----|-----|
| D1 | **P0** | **Ledger deleted with the user.** `PointsLedger.user` has `onDelete: Cascade`, but your spec says ledger rows stay with a tombstoned user id. Several other relations cascade too, and FaceOff has no cascade, so deleting a user would either wipe the economy or fail on foreign keys. | Never hard-delete the User row. Anonymize it (tombstone) and remove personal fields; restrict deletes on ledger and face-off. |
| D2 | **P0** | **One scan writes two ledger rows (lifetime and spendable) with one `idempotencyKey`, but the key is `@unique`.** The second insert fails. | Derive keys per row (`{key}:LIFETIME`, `{key}:SPENDABLE`) or make uniqueness `(idempotencyKey, balanceKind)`. |
| D3 | **P0** | **No idempotency store for non-ledger actions.** A retried `POST /api/scan` after success needs the original response replayed. Failed scans write no ledger row. | Add an `IdempotencyRecord` table (key, route, userId, status, response, expiry). |
| D4 | **P0** | **Slot reservation and release have no model.** The pipeline "reserves then releases" a slot, but the schema has only committed scans with a unique `(user, day, index)` idea. | Add `ScanSlot` with state RESERVED/COMMITTED/RELEASED and a TTL sweep. Resolve Redis vs Postgres (see D9). |
| D5 | P1 | **`spendableBalance ≥ 0` CHECK cannot be declared in Prisma schema.** | Add it in a raw SQL migration; same for any other check constraints. |
| D6 | P1 | `Streak.currentCount` defaults to 1 before any scan; `Streak` should key on `userId` per spec. | Create the row on first scan with count 1; drop the extra `id`. |
| D7 | P1 | `Card.tier` duplicates `User.tier`. | Keep one source of truth. |
| D8 | P1 | Missing models: `ConsentRecord` (settings shows consent history), unique `handle` and avatar choice on User, invite attribution (needed for "no payout between a new account and its inviter"), hashed device/IP identifiers, an `IdempotencyRecord`, and a PRACTICE scan source. `Scan.source` is a free string; `Scan.faceOffId` has no relation. | Add them; use enums. |
| D9 | P1 | **Redis on Workers is unresolved.** Your note flags it, and I kept "Redis / Rate Limiting binding" without deciding. | Recommend: Cloudflare Rate Limiting binding for rate limits, daily cap in Postgres only. Drop Redis from v1. |
| D10 | P1 | **Face detection on the server is unspecified.** The quality gate needs "one face" and face-region exposure, but Workers has no native image/ML libraries and the client MediaPipe check is advisory only. | Choose: a WASM landmarker on the Worker (check CPU limit), or use the vision model's face count and keep the gate for sharpness/exposure only. |
| D11 | P1 | **Face-off edge cases undefined:** both joined but neither locked at expiry; one player never scanned at all; join racing with cancel. | Add rules (default: refund both, no fee) and lock ordering. |
| D12 | P1 | **Missing endpoints the frontend needs:** `GET /api/faceoffs/:id` (detail page), `GET /api/share-cards` (settings lists them), profile update, sign-out-all-devices, a practice-scan route, a config endpoint for stake limits and tier perks, and the public `/s/[publicId]` page. | Add to the API table. |
| D13 | P2 | Prisma on Workers: `previewFeatures = ["driverAdapters"]` may be outdated, and bundle size and the client choice need checking against current Prisma Workers guidance. | Verify against current docs before scaffolding. |
| D14 | P2 | Redundant `@@index([email])` next to `@unique`. | Remove. |
| D15 | P2 | Job entry points are duplicated: Cron `scheduled` handler and `POST /api/jobs/:name`. OpenNext needs a custom worker entry to expose `scheduled`. | Choose one path; document the entry file. |

---

## E. Frontend gaps (beyond A3)

| # | Severity | Gap |
|---|----------|-----|
| E1 | P1 | No onboarding step for display name or handle (see C6). |
| E2 | P1 | No screen or component for stake limits and fee display data source (needs the config endpoint, D12). |
| E3 | P1 | In-app browser detection and fallback missing (C9). |
| E4 | P2 | No design for the "points locked for 24 h" state on balances, shop and stake picker. |
| E5 | P2 | No error state for model-budget circuit breaker ("scans paused"). |
| E6 | P2 | Share-link management UI (list, expiry, delete) is in settings but has no component spec. |
| E7 | P2 | Dark mode is "supported" but only the Orla surface tokens are listed; tier cards in dark mode are unspecified. |

---

## F. What to do next (in order)

1. **Verify the Orla tokens** (A1). Everything visual depends on it.
2. **Decide hosting** (B1) and **monetization** (C1). Both change the architecture and the PRD.
3. **Confirm friendly mode** (B2) and write it into PRD and PRODUCT.
4. **Restore the trimmed spec text** in BACKEND.md and FRONTEND.md (A2, A3, A4), then merge my schema and diagrams in.
5. **Fix the P0 schema bugs** (D1 to D4) and the economy rules (C2, C3, C4).
6. **Add the missing models and endpoints** (D8, D12) and settle Redis vs Postgres (D9) and server face detection (D10).
7. **Run the cost and economy simulation** before choosing the model provider (open question in PRD §15).

## G. Decisions log

| Date | Item | Decision |
|------|------|----------|
| Oct 12, 2026 | A1 / STYLE.md | Owner supplied a new `STYLE.md` (Orla tokens, Face Card additions from Orla tokens only) and it replaced the old file. The token values still trace back to my unverified extraction, so they remain unverified against the Behance source. |
| Oct 12, 2026 | B2 / Friendly mode | Both modes ship in v1: face-offs can be staked or non-staked. PRD, PRODUCT, FRONTEND and BACKEND still need updating (friendly mode is absent from PRD and PRODUCT). The C5 bonus question remains open. |
| Oct 12, 2026 | C1 / Monetization | Undecided. Owner will define it later. Blocks cost planning (C3). |
| Oct 12, 2026 | AI Spec | Owner supplied full AI Rating Specification; created `AI_RATING.md`. Confirms rating is 100% free with no paywalled breakdown. Removed conflicting "stat breakdown unlock" shop item from `PRD.md`. |

### Sync status (Oct 12, 2026)

| Doc | State |
|-----|-------|
| `STYLE.md` | Owner's version in place. Skins are Orla-only (Danfo/Ankara/Lagos removed). Orla values still unverified against Behance. |
| `FRONTEND.md` | Owner's version in place (Cloudflare Workers), Orla-only look. Section 15 adds gap fixes (E1 to E7, C9, C13, B6), pending approval. |
| `BACKEND.md` | Owner's version in place. Section 18 holds proposed fixes for D1 to D15, C2 to C5 and the missing endpoints, pending approval. |
| `PRD.md` | Hosting (Cloudflare Workers), both face-off modes, tier finishes (matching `STYLE.md`) updated. Unrequested share bonus removed. Removed paywalled breakdown shop item. Added `AI_RATING.md` reference. |
| `PRODUCT.md` | Restored to owner's original text, updated for Cloudflare Workers, both face-off modes, and Orla-only visual language. Added `AI_RATING.md` reference. |
| `AI_RATING.md` | Created with full vision model specification, quality gates, structured prompt, weights, calibration, fairness release gates, and cost control rules. |

Still open: A1 (verify Orla tokens), C1 (monetization), C2 to C5 and D10 decisions, and the frontend gaps listed in section E.
