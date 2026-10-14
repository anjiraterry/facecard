# Face Card — Project Description

Version 0.1 · October 12, 2026

## What it is

Face Card is a web app that turns a selfie into a collectible, shareable card. Users snap a photo and get a **Lethality score** from 0 to 100, with a breakdown of what drove it. Scans earn points, and points level up the user's card through four tiers: **Classic, Gold, Platinum, and Black Card**. The card is the user's status symbol, and the points are their wallet.

The idea comes from a familiar piece of internet slang: "face card never declines." Here, the card is literal.

## Who it is for

Nigerians aged 18 and over who live on Twitter/X, Instagram, TikTok, and WhatsApp, especially students and friend groups who love a challenge. The product is built for the screenshot and the quote-tweet. Its visual language follows the Orla AI design system exactly (see `STYLE.md`).

## How it works

1. **Sign up** with email and a one-time code, after confirming age (18+) and consent.
2. **Scan.** Take a selfie, up to 3 point-earning scans a day. The app checks the photo quality, scores it, and discards the image.
3. **Earn.** Points are added to lifetime points (which set the tier) and to a spendable balance. Scanning on consecutive days builds a streak multiplier of up to ×2, and a streak freeze can save a missed day.
4. **Spend.** Buy card skins, titles, frames, and extra features in the in-app shop.
5. **Face off.** Challenge a friend by link, either **staked** (both players put in equal points and the higher score wins the pot) or **friendly** (no points at stake).
6. **Share.** Post the result card to social media with one tap.

## What makes it different

- **A card, not a number.** The user owns a progression object that grows and can be customized.
- **Fair by design.** The score covers photo craft (lighting, sharpness, framing), expression, and aura as well as the face, and it is built to be consistent across skin tones.
- **Rivalry as growth.** Every face-off link doubles as an invite.
- **Strictly in-app economy.** No tokens, cash-out, sponsors, or giveaways. Points are a game currency only.
- **Privacy first.** Raw selfies are never stored, and nothing is used for model training.

## Product pillars

- Playful, never cruel: every result comes with a kind, funny line, and there is no loser card.
- Fair and improvable: users can raise their score by learning to take a better shot.
- Farm-resistant: a cap of 3 point-earning scans a day, liveness checks, and collusion controls protect the economy.
- Culturally native: copy, humor, and tone reflect Nigerian social life, while visual styling strictly follows the Orla AI design system.

## Technical overview

- **Frontend and API:** Next.js, deployed on Cloudflare Workers with the OpenNext Cloudflare adapter.
- **Database:** Neon Postgres with Prisma (pooled connection string and the Neon driver adapter).
- **Auth:** email one-time code via Better Auth or Auth.js, with optional Google sign-in.
- **Scoring:** a single `scoreFace()` function wrapping a vision model, so the provider can be swapped.
- **Imagery:** share cards rendered from the in-memory photo; a stored share image only when the user opts in to a share link.
- **Core data:** users, scans, an append-only points ledger, cards, shop items, purchases, streaks, and face-offs.

## Scope of version 1

**Included:** age gate and consent, email OTP sign-in, selfie scan with quality gate, Lethality score and breakdown, lifetime and spendable points, tiered card, shop, face-offs in both staked (equal stakes) and friendly (no stake) modes, a daily cap of 3 point-earning scans, a streak multiplier (up to ×2.0) with streak freezes, and shareable result cards.

**Not included:** tokens or crypto, transfers, sponsors, airtime rewards, photo storage, model training on selfies, and campus or city team battles.

## Roadmap

- **Phase 1 — Foundation:** auth, database, scan and scoring pipeline, points ledger, card and tiers.
- **Phase 2 — Economy:** shop, streaks, daily caps, anti-abuse controls.
- **Phase 3 — Rivalry:** face-offs, share cards, invite links.
- **Phase 4 — Launch prep:** bias and fairness testing across Nigerian skin tones, legal review (NDPA, points rules), load and cost testing, beta.
- **Later:** campus and city leaderboards, multiple card slots with in-app collectible trading, phone verification, native apps.

## Key risks to manage

- Backlash over face-rating: handled with photo-craft weighting, skin-tone-aware scoring, and a kind tone.
- Biometric data liability: handled by never storing raw selfies and by explicit consent.
- Point farming and collusion: handled with caps, liveness checks, and same-tier matchmaking.
- Staking seen as gambling: handled by keeping points non-purchasable, non-transferable, and without cash value, with legal review before any change.

## Related documents

The full requirements, scoring model, points economy, data model, and risk register are in `PRD.md`. The rest of the build documentation:

- `STYLE.md`: design system and style guide.
- `FRONTEND.md`: frontend requirements.
- `BACKEND.md`: backend requirements.
- `AI_RATING.md`: AI vision rating specification, quality gates, and fairness testing.
- `AUDIT.md`: audit of the frontend and backend specs, with a decisions log.
