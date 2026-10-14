# Face Card — Product Requirements Document

> **Version:** 0.1 · October 12, 2026
> **Status:** Draft for build

---

## 1. Overview

Face Card is a web app where users take a selfie and receive a **Lethality score** (0–100) with a category breakdown. Scans earn points. Lifetime points raise the user's **Face Card** through bank-style tiers (Classic → Gold → Platinum → Black Card). Spendable points buy cosmetics and features in an in-app shop, and can be staked in head-to-head **face-offs**. Results are shareable on social media as a card image.

The angle: *"face card never declines."* The product issues the user an actual card, built for screenshots and quote-tweets. The visual language and interface adhere strictly to the **Orla AI Design System**: clean Switzer typography, exact pastel/warm palette (`#E8D744` Warm Gold, `#B3BFF0` Soft Lavender, `#D9628E` Warm Magenta, `#F2A6A2` Peach), organic fluid gradients, glassmorphism, soft specular drop shadows, and dark mode surface elevation (`#0F0F0F` / `#1A1A1A` / `#252525`). See `STYLE.md`.

---

## 2. Problem and Opportunity

- Face-rating apps are popular but feel clinical, one-off, and often mean-spirited.
- Nigerian social media runs on challenges, rivalry, and quote-tweeting results. There is no local, culturally native face-card product.
- Opportunity: a playful progression game (card, tiers, shop, duels) where the selfie score is the engine and the card is the status symbol.

---

## 3. Target Users

- **Primary:** Nigerians aged 18–30 active on Twitter/X, Instagram, TikTok, and WhatsApp, including university students.
- **Secondary:** diaspora users and friend groups who want a fun challenge to share.
- Everyone must be 18+.

---

## 4. Goals and Non-Goals

### Goals (v1)
- Deliver a fun, fair, shareable scan result in under 30 seconds.
- Make face-offs the main growth loop (every challenge is an invite).
- Build a points economy that is balanced, farm-resistant, and entirely in-app.
- Protect user privacy: no raw selfies stored.

### Non-Goals (v1)
- No tokens, crypto, transfers, or cash-out. Points have no cash value and cannot be bought with real money.
- No sponsors, giveaways, airtime, or data rewards.
- No model training on user selfies.
- No campus or city team battles (later).

---

## 5. Core User Flows

1. **Onboarding:** age gate (18+) → consent screen → email + OTP sign-in.
2. **Scan:** light tips → camera → quality check (retake if too dark or blurry) → score → card update.
3. **Progress:** points added → tier progress bar → optional shop visit.
4. **Face-off:** challenge by link or username → opponent joins and scans → higher score wins the pot → result card.
5. **Share:** download or share the result card; optional share link.

---

## 6. Features (v1)

### 6.1 Authentication

- Email + one-time code sign-in (Better Auth or Auth.js). Google sign-in as an optional second method.
- Block disposable email domains.
- New accounts: points are unspendable for 24 hours or until three scans complete.

### 6.2 Scan and Scoring

- Camera via `getUserMedia`; the image is sent to an API route, scored by a vision model behind a single `scoreFace()` function (swappable provider), then **discarded**.
- Verdict bands (mapped directly to the Orla design palette):

| Band | Score Range | Brand Color Token | Hex Code | Tone |
|------|-------------|-------------------|----------|------|
| Harmless | Under 40 | `--color-lavender` | `#B3BFF0` | Kind, encouraging line |
| Suspicious | 40–64 | `--color-yellow` / `--color-peach` | `#E8D744` / `#F2A6A2` | Cheeky, warm line |
| Dangerous | 65–84 | `--color-pink` | `#D9628E` | Impressed, hype line |
| Lethal | 85+ | Signature Quad-Gradient | Multi-Orb | Full status flex, celebration line |

- Every band has a kind, funny line. There is no "loser card" and no declined stamp.
- **Daily scan cap:** 3 point-earning scans per user per day, resetting at midnight Lagos time (WAT). Scans 2 and 3 earn 50% of base points. A photo rejected by the quality gate does not count against the cap. The cap cannot be raised with money or points.

### 6.3 Points and Tiers

- Two balances: **Lifetime points** (only goes up, decides tier) and **Spendable balance** (shop and stakes).
- Losing a stake or buying an item never lowers lifetime points or tier.
- Tiers (initial thresholds, to tune):

| Tier | Lifetime Points Required | Finish (from `STYLE.md`) |
|------|--------------------------|--------------------------|
| Classic | 0 | Dark surfaces: `#2E2E2E` → `#1A1A1A` |
| Gold | 1,000 | Warm Gold to Soft Peach: `#E8D744` → `#F2A6A2` |
| Platinum | 5,000 | Luna gradient: `#D4C5F0` → `#B3BFF0` |
| Black Card | 20,000 | `#0F0F0F` base with brand-gradient sheen |

Each tier unlocks shop items that lower tiers cannot buy.

#### Streak Multiplier

| Streak (consecutive days) | Multiplier on scan points |
|--------------------------|---------------------------|
| 1–2 | ×1.0 |
| 3–6 | ×1.1 |
| 7–13 | ×1.25 |
| 14–29 | ×1.5 |
| 30+ | ×2.0 (maximum) |

- A day counts when the user completes at least one scored scan (passing the quality gate and liveness check) before midnight WAT.
- The multiplier applies to scan points only, in both lifetime and spendable balances. It does not apply to face-off pots or win bonuses.
- Missing a day resets the streak to 1, unless a **streak freeze** is held. A freeze is a shop item (maximum 2 held) and is used automatically to save the streak.
- **Daily ceiling:** base points are at most 200 (100 + 50 + 50), so at most 400 points per day at ×2.0.
- **Rough pacing** at an average score of 65 and 3 scans a day: Gold in ~8 days, Platinum in ~29 days, Black Card in ~86 days — before face-offs and shop spending. To be validated in the economy simulation.

### 6.4 Shop

- **Card skins:** Orla-only looks built from `STYLE.md` tokens: the brand gradient, the persona gradients (Ember, Luna, Nova, Sage), tinted yellow, dark glass, and the animated Black Card sheen
- **Titles and badges:** e.g. "Island Boy", "Mainland Menace", "Wahala Face"
- **Frames and backgrounds:** Orla-only: gradient and glass frames, hero glow and soft page-gradient backgrounds, light and dark variants
- **Features:** retake tokens (practice scans that earn no points), streak freezes, roast modes, extra card slots

### 6.5 Face-offs

- Start by shareable link or by username. Link opens straight to sign-up and scan for new users.
- **Two modes, both in v1:** **staked** and **friendly (no stake)**. The challenger picks the mode when creating the face-off. Friendly mode lets new invitees, whose points are still locked, play without moving points.
- **Staked mode:** both players stake an **equal amount** from spendable balance. Winner takes the pot, minus a **5% system fee** (inflation sink).
- **Friendly mode:** no points are held or paid out. Whether a friendly win pays any bonus is an open question (section 15).
- Stake range: fixed minimum and maximum, capped at a share of the player's balance. Same-tier matchmaking.
- **Window:** 24 hours for the opponent to scan. If it expires, the stake is refunded.
- Face-off scans do not count toward the daily scan cap; each account is limited to **5 face-offs per day**.
- Each player may retake up to **two times** per face-off. Ties trigger a rematch with stakes held.
- Tier and lifetime points are unaffected by stake outcome; the winner earns normal scan points plus a win bonus.
- **Result card:** split-screen of both cards with a crown on the winner. No loser stamp.

### 6.6 Share Cards

- The card image (selfie, score, tier, card number, title) is rendered from the in-memory photo and offered as a download or Web Share action. Nothing is stored by default.
- Optional "Get share link" stores **only the rendered card image** (not the original selfie) so links preview correctly on social. Opt-in, user-deletable, auto-expiring.
- Users can choose a stylized avatar in place of their face on shared cards.

---

## 7. Scoring Model

The score is deliberately about more than the face, so results feel fair and improvable. Starting weights — to be tuned after testing:

| Category | Weight | Notes |
|----------|--------|-------|
| Photo craft | 30% | Lighting 15%, sharpness 8%, framing and angle 7% |
| Face | 45% | Harmony/averageness 18%, skin clarity 12%, feature definition 10%, symmetry 5% |
| Expression and eye contact | 15% | — |
| Aura | 10% | Playful wildcard |

**Rationale from research:** Facial symmetry has the smallest effect among classic attractiveness factors, and a large study of natural faces found no robust independent effect once other shape properties were controlled — so symmetry carries low weight. Averageness, skin texture, and sexual dimorphism are stronger predictors. Attractiveness remains subjective, so the score is presented as entertainment, not measurement. Golden-ratio style claims are not used.

### Fairness Rules

- Score what the user controls (light direction, exposure, sharpness, framing), never camera hardware or megapixels.
- Measure exposure **relative to the face and the person's skin tone**, not absolute brightness, so darker-skinned users are not penalised.
- Do not score skin lightness. Score evenness and clarity only.
- Quality gate: if the photo is too dark or blurry, prompt a retake instead of scoring.
- Pre-launch bias testing across a wide range of Nigerian faces and skin tones; tune prompts until scores are consistent.

---

## 8. Points Economy

### Earning (initial values, to tune)

| Source | Amount |
|--------|--------|
| Scan 1 of the day | Lethality score × streak multiplier |
| Scan 2 of the day | (Lethality score × 0.5) × streak multiplier |
| Scan 3 of the day | (Lethality score × 0.5) × streak multiplier |
| Face-off win bonus | Fixed bonus + pot winnings |

### Spending and Sinks
- Shop purchases
- Face-off stakes
- 5% face-off fee (inflation sink)

### Rules
- Points are **non-transferable**, cannot be bought with real money, and have **no cash value**.
- This keeps stakes a game mechanic and not gambling. Any change to this needs legal review first.
- All point movement is recorded in an **append-only ledger**, never a single mutable number.

---

## 9. Data Model (Neon Postgres + Prisma)

**Stack:** Next.js on Cloudflare Workers (OpenNext adapter), Neon Postgres via the pooled connection string, Prisma with the Neon driver adapter.

| Model | Key Fields |
|-------|-----------|
| `User` | id, email, displayName, ageConfirmedAt, consentVersion, createdAt |
| Auth tables | Provided by the auth library (sessions, verification codes, accounts) |
| `Scan` | id, userId, score, bandLabel, categoryScores (JSON), modelVersion, createdAt (**no image**) |
| `PointsLedger` | id, userId, type, amount, balanceKind (LIFETIME or SPENDABLE), refType, refId, createdAt |
| `Card` | id, userId, tier, skinId, titleId, cardNumber, slot |
| `ShopItem` | id, kind, name, price, minTier, active |
| `Purchase` | id, userId, itemId, price, createdAt |
| `Streak` | userId, currentCount, lastScanDate |
| `FaceOff` | id, challengerId, opponentId (nullable), inviteCode, stake, status, challengerScanId, opponentScanId, winnerId, expiresAt |
| `ShareCard` | id, userId, imageUrl, expiresAt, deletedAt |

> All point changes happen inside database transactions. Balances are derived from, and reconciled against, the ledger.

---

## 10. Privacy, Consent, and Safety

- Face images are biometric data. **Raw selfies are never stored**; the image is processed in memory and discarded.
- Explicit consent screen and 18+ gate before first scan. Consent versions are recorded.
- No use of any image for model training. If training is ever considered, it requires a separate, clearly labelled opt-in with deletion on request.
- Face-off opponents see only the card and score. Both players are told before a face-off that the opponent sees their card.
- Users can delete their account, share cards, and ledger-linked personal data on request.
- **Compliance to review** with a Nigerian data-protection and fintech lawyer before launch: NDPA obligations for biometric data, consent, and any future change to points convertibility.
- **Tone rules:** every verdict band has a playful, encouraging line; no insults or body-shaming copy.

---

## 11. Anti-Abuse

- Daily caps on scans and face-offs per account, device, and IP.
- Disposable email blocking; unspendable points on brand-new accounts for 24 hours.
- Liveness check to reject photos of screens or photos.
- Collusion controls: diminishing rewards for repeated pairs, no payout between a brand-new account and the account that invited it, same-tier matchmaking, stake caps.
- Anomaly monitoring on the ledger (rapid transfers of balance to a single account via lost stakes).
- Optional later: phone verification for shop purchases or high stakes.

---

## 12. Success Metrics

| Metric | What it measures |
|--------|-----------------|
| Scans per active user per week | Core engagement |
| Day-1 and Day-7 retention | Stickiness |
| Face-offs started per active user + invite-to-signup conversion | Growth loop health |
| Share rate (shares per scan) | Virality |
| % scans failing quality gate | Tips effectiveness (should fall over time) |
| Abuse rate (flagged collusion / farming accounts) | Economy health |
| Score distribution consistency across skin-tone test groups | Fairness |

---

## 13. Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Backlash over face-rating or bias | Score photo craft as well, tone rules, skin-tone-aware exposure, bias testing, entertainment framing |
| Point farming with fake faces or alt accounts | Liveness check, caps, new-account lock, collusion controls |
| Staking seen as gambling | No cash value, no purchase with money, no transfers; legal review before any change |
| Biometric data liability | No raw image storage, explicit consent, deletion on request |
| Inflation of points | 5% face-off fee, shop sinks, daily caps |
| Vision-model cost at scale | Daily caps, cheaper model tier, caching, cost monitoring per scan |

---

## 14. Out of Scope (Later)

- Campus and city team face-offs and leaderboards
- Top-duelist leaderboard
- Multiple card slots with trading of cosmetic collectibles inside the app
- Phone verification, push notifications, native apps
- Any token or external-value mechanism (requires separate legal review)

---

## 15. Open Questions

- [ ] Final tier thresholds and earn rates after a balance simulation
- [ ] Which vision model provider and prompt set gives the most consistent scores
- [ ] Stake range and the exact fee percentage
- [ ] Whether to offer a stylized-avatar default for shared cards
- [ ] Whether a win in a friendly (no-stake) face-off pays any bonus, given that a system-funded bonus creates points and could be farmed with alternate accounts

---

## Related Documents

| Document | Purpose |
|----------|---------|
| `PRODUCT.md` | Top-level product description and reference |
| `PRD.md` *(this file)* | Full requirements, scoring model, points economy, data model, risk register |
| `STYLE.md` | Orla AI-exact design system and visual tokens |
| `FRONTEND.md` | Frontend specifications, routes, components, and motion |
| `BACKEND.md` | Backend architecture, Cloudflare Workers runtime, data models, and API |
| `AI_RATING.md` | Vision scoring engine, quality gates, prompt specs, fairness, and safety |
| `AUDIT.md` | Architecture and requirements audit, decisions log, and amendments |

---

*"Face card never declines."*
