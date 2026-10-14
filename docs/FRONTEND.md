# Face Card — Frontend Requirements

Version 0.1 · October 12, 2026 · Companion to the Face Card PRD

## 1. Scope and stack

The frontend is a mobile-first web app. Most users will be on mid-range Android phones over 4G, so camera reliability, load time, and data use come first.

- **Framework:** Next.js (App Router) with TypeScript, deployed on Cloudflare Workers with the OpenNext Cloudflare adapter.
- **Styling and motion:** Tailwind CSS with a small design-token layer; Framer Motion for card, points, and tier animations.
- **Data and forms:** TanStack Query for server state; React Hook Form with Zod for forms and validation.
- **Camera:** `getUserMedia` with canvas capture. MediaPipe Face Landmarker, lazy-loaded on the scan screen only, for framing and quality hints.
- **Sharing:** card rendering on canvas (or `satori`), Web Share API with file support, download fallback.
- **Browsers:** last two major versions of Chrome and Samsung Internet on Android, Safari on iOS, plus desktop Chrome, Safari, and Edge.
- **PWA:** web manifest and a service worker for static assets as a stretch goal, not a v1 blocker.

## 2. Screens and routes

Every screen needs four states designed and built: loading (skeleton), empty, error with retry, and offline.

| Route | Screen | Must do |
| --- | --- | --- |
| `/` | Landing | Pitch, sample card, "Get your card" button, privacy link |
| `/start` | Age gate and consent | 18+ confirmation, consent text with version number, links to privacy and terms; blocks everything else until accepted |
| `/sign-in` | Email entry | Email field, disposable-email error, optional Google sign-in |
| `/verify` | OTP entry | 6-digit input with auto-advance and paste, 60-second resend timer, wrong-code and lockout states |
| `/home` | Dashboard | Card preview, tier progress bar, scans left today, streak and multiplier, both balances, shortcuts to scan, shop, face-off |
| `/scan` | Camera capture | Permission prompt, light tips, live guidance, capture, upload progress, scoring animation |
| `/result/[id]` | Scan result | Score, verdict band, playful line, category breakdown, points earned (with multiplier shown), share button, scan again if scans remain |
| `/card` | My card | Full card view, equip skin, title, and frame, tier ladder with perks, card slots |
| `/shop` | Shop | Item grid by kind, tier locks, prices, preview on my card, purchase confirmation |
| `/faceoff` | Face-off hub | Active, waiting, and past face-offs; new face-off button |
| `/faceoff/new` | Create face-off | Choose opponent (share link or username), friendly or stake mode, stake picker |
| `/f/[code]` | Public challenge page | Who challenged you, stake, deadline; sign up or sign in, then straight into the scan |
| `/faceoff/[id]` | Face-off detail | Status timeline, both cards after reveal, result, share |
| `/settings` | Settings | Manage share links, delete account, consent history, sign out |
| `/privacy`, `/terms` | Legal | Static pages |

## 3. Core components

- **CameraCapture:** permission handling, front camera by default with flip, mirrored preview, capture button, retake.
- **QualityOverlay:** live hints ("too dark", "move to a window", "hold still", "center your face", "one face only").
- **LightTipsSheet:** short tips shown before the camera opens (face a window, avoid backlight, clean the lens).
- **ScoringAnimation:** playful wait state while the server scores (target under 8 seconds).
- **ResultCard and BreakdownBars:** Lethality score, band, and the four weighted categories (photo craft, face, expression, aura) with the sub-scores.
- **FaceCard:** the hero component. Renders any tier and skin; reused in the dashboard, result, shop preview, share card, and face-off.
- **TierProgress:** progress bar to the next tier based on lifetime points, with the perks it unlocks.
- **StreakWidget:** day count, current multiplier, freezes held, time left until midnight Lagos time (WAT).
- **ScansLeftChip:** scans remaining today, with a note that scans 2 and 3 earn half points.
- **BalanceBar:** lifetime points and spendable balance, clearly labeled and visually distinct.
- **ShopGrid and ItemCard:** locked, owned, equipped, and buyable states; try-on preview.
- **StakePicker:** slider and quick amounts within the allowed range, showing the pot and the 5% fee.
- **FaceOffTimeline:** waiting for opponent, both scanned, result, with a live countdown to expiry.
- **ShareSheet:** download, native share, copy link, and an opt-in "Get share link" action.
- **Toasts, modals, confirm dialogs:** especially for purchases and stakes.

## 4. Key flows

### 4.1 Scan

1. Check scans left; if zero, show the reset countdown and the shop link for retake tokens.
2. Show light tips, then request camera permission.
3. Live preview with quality hints; the capture button enables only when face detected, centered, and brightness acceptable.
4. Capture, downscale, upload with progress. If the server rejects the photo for quality or liveness, show the specific reason and keep the scan count unchanged.
5. Scoring animation, then the result screen with points, streak update, and any tier-up celebration.

If the camera permission is denied, show step-by-step instructions to re-enable it. v1 does not accept gallery uploads, so liveness checks stay meaningful.

### 4.2 Face-off

1. Create: pick friendly (no stake) or stake mode, set the stake, get a share link, and a 24-hour deadline starts.
2. Opponent opens `/f/[code]`, signs in, accepts, and scans. New users without unlocked points are offered a friendly face-off.
3. Both players can retake up to two times before locking in their score.
4. Result: the split-screen result card with a crown on the winner, pot breakdown, and share action. No loser stamp.

### 4.3 Share

1. The card image is rendered on the device from the in-memory photo (or a stylized avatar if the user chose that).
2. Primary actions: native share sheet with the image file, and download.
3. "Get share link" is opt-in. It uploads only the rendered card image so the link previews on social, and shows the expiry date and a delete button.

## 5. Client logic and data handling

- **Image handling:** capture at a maximum of 1024 px on the long side, JPEG at about 0.85 quality, re-encoded through canvas (which strips EXIF), front-camera mirroring handled before upload.
- **No selfie persistence:** never write the photo to localStorage, sessionStorage, IndexedDB, or the service worker cache. Revoke object URLs and clear canvases after use.
- **Client checks are advisory:** brightness on the face region, blur, face present, centered, single face. The server is the source of truth for quality and scoring.
- **Server-authoritative economy:** points, caps, streaks, and stakes are always read from the server. No optimistic updates for anything involving points.
- **Idempotency:** every purchase, stake, and scan upload carries a generated idempotency key so retries never double-charge or double-count.
- **Time:** daily reset countdown computed from server time in WAT, not the device clock.
- **Face-off updates:** poll every 10 seconds on the face-off screen and refetch on window focus; push notifications come later.
- **Retries:** upload retries with backoff, 20-second timeout, clear error messages, and a "try again" that reuses the same photo only while it is still in memory.

## 6. Visual design and share cards

- **Look:** follows the Face Card Design System, which uses the Orla AI design system exactly: Switzer, warm cream surfaces, the yellow-peach-pink-lavender brand gradient, pill shapes, and glassmorphism. Light by default with dark mode supported. The card is the hero, with Orla-only skins and backgrounds (see `STYLE.md`).
- **Tier styling:** Classic in dark charcoal, Gold from Orla's warm gold and peach, Platinum from Orla's lavender gradient, Black Card on the dark base with a brand-gradient sheen.
- **Motion:** card flip on reveal, points count-up, tier-up celebration, streak flame. Respect reduced-motion settings. Sound off by default; haptics optional.
- **Share card formats:** 1080×1350 (feed) and 1080×1920 (story). Contents: selfie crop or stylized avatar, display name and title, tier, card number, Lethality score and band, mini breakdown, streak count, app name and URL.
- **Face-off card:** split-screen of both cards, crown on the winner, pot size, both scores.
- **Skins and frames:** delivered as assets plus tokens so new items can be added without code changes.

## 7. Copy and tone

Playful, kind, and confident. No insults, no body-shaming, no negative framing for low bands. Sample lines to refine:

- Harmless: "Warm-up round. Your card is just getting started."
- Suspicious: "Eyebrows raised. People are looking twice."
- Dangerous: "Careful out there. This card travels with a warning."
- Lethal: "Face card never declines. Black Card energy."

Every category score on the breakdown comes with one actionable tip, mostly about the photo ("try facing a window"), so a lower score reads as fixable.

## 8. Accessibility and localization

- WCAG AA contrast, visible focus, full keyboard use on desktop, screen-reader labels on all controls.
- Alt text and text equivalents for score cards and charts; the camera screen announces hints with an ARIA live region.
- Respect `prefers-reduced-motion` and `prefers-color-scheme`.
- English (Nigerian English tone, light local flavor) at launch, with strings externalized for future languages.
- Dates and countdowns in WAT.

## 9. Performance and flaky networks

- Targets on a mid-range Android over 4G: LCP under 2.5 seconds on landing, initial JavaScript under 200 KB gzipped on landing.
- Code-split the scan screen; load MediaPipe only when `/scan` opens.
- Optimize images and skins; skeleton screens instead of spinners.
- Keep data use low: compressed uploads, small card assets, lazy-loaded shop previews.
- Offline: static shell and clear "you're offline" states; scans and purchases need a connection.

## 10. Security and privacy on the client

- Strict Content Security Policy; no third-party trackers before consent.
- Render all user-provided text (display names, titles) safely escaped.
- OTP UX: 60-second resend cooldown, attempt limit messages, no account-existence leaks.
- Auth cookies are httpOnly and handled by the auth library; no tokens in localStorage.
- Consent and age gate stored server-side with a version number; the client only reflects the state.

## 11. Analytics (privacy-friendly)

Use PostHog or Plausible, gated by consent, with no image data. Events: `scan_started`, `scan_quality_rejected` (with reason), `scan_completed` (with band), `share_clicked`, `share_completed`, `share_link_created`, `faceoff_created`, `faceoff_joined`, `faceoff_completed`, `shop_purchase`, `streak_milestone`, `tier_up`.

## 12. Testing

- Unit tests with Vitest; component tests with Testing Library.
- End-to-end with Playwright using Chromium's fake camera stream, covering the scan, share, and face-off flows.
- Visual regression tests for every tier, skin, and share-card size.
- Device matrix: low-end Android, mid-range Android, iPhone Safari, desktop.
- Quality-hint tests across a wide range of skin tones and lighting, so the hints never push darker-skinned users to over-brighten.
- Accessibility audit with axe and a manual screen-reader pass.

## 13. Suggested build order

1. Design tokens, FaceCard component, landing, age gate and consent.
2. Email OTP sign-in screens.
3. Camera capture, quality hints, scan and result screens.
4. Dashboard with points, tier progress, scans left, and streak.
5. Shop and equip flow.
6. Share card rendering, native share, and opt-in share links.
7. Face-off creation, challenge page, detail, and result card.
8. Polish: animations, accessibility, performance, analytics.

## 14. Open questions

- Final visual identity: logo, card typography, and skin art direction.
- Whether to offer a PWA install prompt at launch.
- Whether the stylized avatar is the default on shared cards.
- Gallery upload support later, and how it would pass the liveness check.

## 15. Audit additions (proposed, pending your confirmation)

These close the frontend gaps listed in `AUDIT.md` (C9, C13, E1 to E7 and related items). Sections 1 to 14 are your original text. All new UI uses `STYLE.md` tokens only; no new colors, fonts, or components are introduced. Several items depend on backend decisions in `BACKEND.md` section 18.

### 15.1 New and changed routes

| Route | Screen | Must do |
| --- | --- | --- |
| `/welcome` | Name and handle (new accounts, shown after `/verify`) | Display name and unique handle (lowercase, 3 to 20 characters) with a debounced availability check and clear error states; saves with `PATCH /api/me`. Needed for challenge-by-username |
| `/s/[publicId]` | Public share card | Server-rendered page that shows the share image, with Open Graph tags and a "Get your card" button. Not behind sign-in |
| `/faceoff/new` (changed) | Create face-off | A Friendly / Staked switch at the top. Staked is disabled with an explanation while the user's points are locked (15.3). Stake limits and fee come from `GET /api/config/public` |
| `/settings` (changed) | Settings | Share-link manager (15.4) and a separate analytics consent toggle, off by default |

### 15.2 Entry and consent

- **In-app browsers (C9).** Players will often arrive from links inside Instagram, TikTok, X, or WhatsApp, where camera access can be unreliable. Detect these browsers from the user agent on `/` and `/f/[code]`. Do not request the camera inside them. Show a notice with an "Open in Chrome or Safari" action and a copy-link button. Add these browsers to the device test matrix.
- **Consent before an account exists (B6).** `/start` keeps the age confirmation and consent version in a short-lived signed cookie. After sign-in, the client calls `POST /api/consent` and clears the cookie. The server stays the source of truth.
- **Analytics consent (C13).** Separate from the biometric consent. Off by default; analytics code loads only after it is turned on.

### 15.3 New and changed states

| State | Behavior |
| --- | --- |
| Points locked (E4) | While the new-account lock is active, BalanceBar shows a padlock `.tag-lavender` with the time or scans left to unlock. Shop buy buttons and the staked face-off option are disabled with a one-line reason. Face-off creation defaults to Friendly. The exact wording follows the final lock rule (C4) |
| Scans paused (E5) | When the model budget breaker is on, the scan button is replaced by a `.tag-yellow` note: "Scans are paused for now. Back soon." The camera never opens. Everything else keeps working |
| Practice scan | When scans left is zero and the user holds retake tokens, offer "Practice scan". The result carries a `.tag` reading "Practice, no points" and shows no points or streak change. Uses `POST /api/scan/practice` |
| Face-off outcomes | FaceOffTimeline covers: expired and refunded, forfeit win, auto-locked attempts, and the tie rematch round. Friendly face-offs show "No points at stake" and no pot or fee line |
| Server time | All countdowns (daily reset, face-off expiry, unlock timer) use `serverNow` and `resetAt` from `GET /api/me`, never the device clock |

### 15.4 Share-link manager (E6)

In `/settings`, list each share link: a small preview of the card image, format (feed, story, or face-off), created date, expiry date, a copy-link button, and delete. Delete asks for confirmation and then removes the link. Empty state: "No share links yet." Loading uses skeleton rows. Data comes from `GET /api/share-cards` and `DELETE /api/share-cards/:id`.

### 15.5 Dark mode Face Cards (E7)

Face Cards look the same in both themes (`STYLE.md` section 15). On dark surfaces the Classic card (`#2E2E2E` to `#1A1A1A`) sits close to the `#1A1A1A` background, so give it the dark-mode shadow Level 2 and a `1px solid rgba(255, 255, 255, 0.08)` border, both existing Orla values. Run the visual regression tests for every tier in both themes.

### 15.6 New components

| Component | Purpose |
| --- | --- |
| InAppBrowserNotice | The "Open in Chrome or Safari" notice (15.2) |
| HandleField | Handle input with live availability and error text, built on `.input-prompt` |
| LockedPointsBadge | Padlock tag and unlock countdown for the locked-points state |
| ScansPausedBanner | The paused-scans note |
| PracticeScanBanner | Offers a practice scan and labels the result |
| FaceOffModeSwitch | Friendly / Staked switch |
| ShareLinkRow | One row in the share-link manager |

### 15.7 Added analytics events

`inapp_browser_detected`, `handle_set`, `practice_scan_completed`, `scans_paused_seen`, `analytics_consent_changed`. Same rules as section 11: gated by consent and no image data.

### 15.8 Still open

- Whether the stylized avatar is the default on shared cards, and where the avatar art comes from (a fixed Orla-style set is the cheapest choice for v1).
- The wording of the locked-points message, once the new-account lock rule is settled.
