# Face Card — Design System & Style Guide

Version 0.1 · October 12, 2026 · Uses the Orla AI design system exactly, with Face Card additions built only from Orla tokens

## 1. Principle: Orla, exactly

Face Card uses the Orla AI design system as it is: the same fonts, colors, gradients, spacing, radii, shadows, glass, components, and motion. No Orla token is changed. Face Card adds only the pieces Orla has no equivalent for (the Face Card, tiers, verdict chips, score, streak, and share cards), and those are built from Orla tokens alone.

Source: [Orla AI UI/UX case study by Gulshan on Behance](https://www.behance.net/gallery/256677813/Orla-AI-Personal-Assistant-App-UI-UX-Case-Study).

| Orla element | Face Card use |
| --- | --- |
| Brand blob and orb gradient | App mark, scan button, Lethal chip, Black Card sheen |
| Persona gradients (Ember, Luna, Nova, Sage) | Tone modes |
| Calendar event colors | Breakdown category colors |
| Tags (lavender, yellow, pink) | Verdict band chips |
| Bottom nav with central orb | Bottom nav with central scan button |
| Prompt input | Email, OTP, username, and amount inputs |
| Cards, tinted cards, dark cards | List cards, shop items, panels |
| Glassmorphism | Floating nav, camera hints, overlays |
| Light page background with dark mode | Same: light by default, dark mode supported |

## 2. Brand identity

| Attribute | Value |
| --- | --- |
| Product name | Face Card |
| Tagline | *"Face card never declines."* |
| Category | Selfie-scoring progression game (mobile-first web app) |
| Brand personality | Warm, approachable, modern, with a confident and playful edge |
| Logo / icon | Fluid multi-color blob in Orla's language: an organic circle blending yellow, peach, pink, and lavender in a radial gradient. Final mark to be designed |

## 3. Typography

### Primary font

**Switzer** only, exactly as in Orla. A clean, geometric sans-serif with humanist proportions, available through [Fontshare](https://www.fontshare.com/fonts/switzer). Self-host the files for performance.

```css
@import url('https://api.fontshare.com/v2/css?f[]=switzer@400,500,600,700&display=swap');
font-family: 'Switzer', sans-serif;
```

### Font weights

| Weight | Name | Usage |
| --- | --- | --- |
| 400 | Regular | Body text, descriptions, captions |
| 500 | Medium | UI labels, secondary headings, card numbers |
| 600 | SemiBold | Subheadings, card titles, button labels |
| 700 | Bold | Primary headings, hero text, the Lethality score |

### Type scale

| Token | Size | Weight | Usage |
| --- | --- | --- | --- |
| `--text-xs` | 11px | 400 | Timestamps, metadata |
| `--text-sm` | 13px | 400–500 | Captions, helper text, camera hints |
| `--text-base` | 15px | 400–500 | Body copy |
| `--text-md` | 17px | 500–600 | UI labels, card text |
| `--text-lg` | 20px | 600 | Section headings |
| `--text-xl` | 24px | 600–700 | Screen titles |
| `--text-2xl` | 32px | 700 | Hero headings |
| `--text-3xl` | 40px | 700 | Display headings, the Lethality score on screen |

- **Line heights:** body 1.5, headings 1.15–1.25, labels and UI 1.2.
- **Letter spacing:** headings −0.02em, body and UI 0em, all-caps labels +0.05em.
- **Face Card numbers:** the card number uses Switzer 500 with `font-variant-numeric: tabular-nums` and the all-caps +0.05em tracking. Share cards scale the same sizes up proportionally.

## 4. Color palette

### Primary brand colors

| Token | Name | Hex | Usage |
| --- | --- | --- | --- |
| `--color-yellow` | Warm Gold | `#E8D744` | Primary accent, highlights, energetic CTAs |
| `--color-lavender` | Soft Lavender | `#B3BFF0` | Calm UI elements, tags |
| `--color-pink` | Warm Magenta | `#D9628E` | Action highlights, emotional accents, pulse indicators |

### Neutrals

| Token | Name | Hex | Usage |
| --- | --- | --- | --- |
| `--color-white` | Pure White | `#FFFFFF` | Surfaces, card backgrounds |
| `--color-cream` | Warm Cream | `#F8F6F4` | Page backgrounds, soft fills |
| `--color-gray` | Muted Gray | `#979797` | Placeholder, inactive states |
| `--color-charcoal` | Deep Charcoal | `#1A1A1A` | Primary text, dark containers |
| `--color-black` | True Black | `#000000` | High-contrast headings, dark mode base |

### Extended palette

| Token | Name | Hex | Usage in Face Card |
| --- | --- | --- | --- |
| `--color-peach` | Soft Peach | `#F2A6A2` | Gradient midpoint, Roast tone mode |
| `--color-sky` | Sky Blue | `#87C5F0` | Hype tone mode accent |
| `--color-sage-dark` | Bronze/Dark | `#4A3728` | Straight tone mode |
| `--color-event-pink` | Event Pink | `#E87FA0` | Breakdown: face |
| `--color-event-purple` | Event Purple | `#9B8FD4` | Breakdown: expression |
| `--color-event-blue` | Event Blue | `#6BAED6` | Breakdown: photo craft |

### Dark mode surfaces

| Token | Hex | Usage |
| --- | --- | --- |
| `--surface-dark-base` | `#0F0F0F` | Full black base, Black Card |
| `--surface-dark-1` | `#1A1A1A` | Bottom nav, modal backgrounds |
| `--surface-dark-2` | `#252525` | Card surfaces |
| `--surface-dark-3` | `#2E2E2E` | Elevated elements, Classic card |

## 5. Gradients

### Brand signature gradient

The core identity gradient: the app mark, the scan button, hero backgrounds, and the Lethal chip.

```css
/* Linear */
background: linear-gradient(135deg, #E8D744 0%, #F2A6A2 35%, #D9628E 65%, #B3BFF0 100%);

/* Radial (logo and orb) */
background: radial-gradient(circle at 40% 40%, #E8D744 0%, #F2A6A2 30%, #D9628E 60%, #B3BFF0 100%);
```

### Persona gradients (used for tone modes)

```css
/* Ember */
background: linear-gradient(135deg, #F2A6A2 0%, #D9628E 100%);
/* Luna */
background: linear-gradient(135deg, #D4C5F0 0%, #B3BFF0 100%);
/* Nova */
background: linear-gradient(135deg, #87C5F0 0%, #F2A6A2 100%);
/* Sage */
background: linear-gradient(135deg, #4A3728 0%, #6B5444 100%);
```

### Background soft gradients

```css
/* Page background — warm light mode */
background: linear-gradient(180deg, #F8F6F4 0%, #FFFFFF 100%);

/* Hero section glow */
background: radial-gradient(ellipse at 50% 0%, rgba(232, 215, 68, 0.15) 0%, transparent 60%),
            radial-gradient(ellipse at 80% 50%, rgba(179, 191, 240, 0.12) 0%, transparent 50%),
            #F8F6F4;

/* Dark mode hero */
background: radial-gradient(ellipse at 50% 0%, rgba(232, 215, 68, 0.08) 0%, transparent 60%),
            #0F0F0F;
```

## 6. Spacing and layout

### Spacing scale (8px base grid)

| Token | Value | Usage |
| --- | --- | --- |
| `--space-1` | 4px | Micro gaps, icon padding |
| `--space-2` | 8px | Tight spacing, inner elements |
| `--space-3` | 12px | Tag padding, small gaps |
| `--space-4` | 16px | Standard component padding |
| `--space-5` | 20px | Card inner padding |
| `--space-6` | 24px | Section sub-spacing |
| `--space-8` | 32px | Section padding |
| `--space-10` | 40px | Large component spacing |
| `--space-12` | 48px | Section gaps |
| `--space-16` | 64px | Major section breaks |
| `--space-20` | 80px | Hero padding |
| `--space-24` | 96px | Full-page section spacing |

### Grid system

- **Mobile:** single column with 16px horizontal safe-area padding.
- **Content max width:** 390px for app screens, centered on larger screens. The landing page may use a wider layout.
- **Bottom nav clearance:** 83px, plus the device safe-area inset.
- **Face Card shape:** aspect ratio 1.586 : 1 (the standard bank-card ratio) at every size.

## 7. Border radius

| Token | Value | Usage |
| --- | --- | --- |
| `--radius-sm` | 8px | Small chips, tags |
| `--radius-md` | 12px | Input fields, small cards |
| `--radius-lg` | 16px | Feature cards, shop items |
| `--radius-xl` | 20px | Bottom sheets, modals |
| `--radius-2xl` | 24px | Primary cards, the Face Card |
| `--radius-3xl` | 32px | Large surface cards |
| `--radius-full` | 9999px | Pill buttons, avatars, orbs |

## 8. Shadows and elevation

### Light mode shadows

```css
/* Level 1 — subtle lift (most cards) */
box-shadow: 0px 4px 16px rgba(0, 0, 0, 0.05);
/* Level 2 — standard elevation */
box-shadow: 0px 8px 24px rgba(0, 0, 0, 0.07);
/* Level 3 — floating elements (bottom nav, modals) */
box-shadow: 0px 12px 32px rgba(0, 0, 0, 0.10);
/* Level 4 — prominent (CTAs, the scan button) */
box-shadow: 0px 16px 48px rgba(0, 0, 0, 0.14);

/* Colored glow — yellow accent */
box-shadow: 0px 8px 24px rgba(232, 215, 68, 0.35);
/* Colored glow — pink accent */
box-shadow: 0px 8px 24px rgba(217, 98, 142, 0.30);
/* Colored glow — lavender accent */
box-shadow: 0px 8px 24px rgba(179, 191, 240, 0.35);
```

### Dark mode shadows

```css
/* Dark — Level 1 */
box-shadow: 0px 4px 16px rgba(0, 0, 0, 0.3);
/* Dark — Level 2 */
box-shadow: 0px 8px 24px rgba(0, 0, 0, 0.45);
/* Dark — orb glow (also the Black Card glow) */
box-shadow: 0px 0px 32px rgba(232, 215, 68, 0.25), 0px 0px 64px rgba(217, 98, 142, 0.15);
```

## 9. Glassmorphism

Used for prompt bars, overlays, the floating nav, and camera hints.

```css
/* Standard glass card */
.glass {
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0px 8px 24px rgba(0, 0, 0, 0.06);
}

/* Dark glass */
.glass-dark {
  background: rgba(26, 26, 26, 0.75);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0px 8px 32px rgba(0, 0, 0, 0.4);
}

/* Prompt / input glass */
.glass-prompt {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 9999px;
  box-shadow: 0px 4px 16px rgba(0, 0, 0, 0.05);
}
```

## 10. UI components (from Orla)

### Buttons

```css
/* Primary CTA — pill */
.btn-primary {
  background: #1A1A1A;
  color: #FFFFFF;
  border-radius: 9999px;
  padding: 14px 28px;
  font-family: 'Switzer', sans-serif;
  font-size: 15px;
  font-weight: 600;
  border: none;
  box-shadow: 0px 4px 16px rgba(0, 0, 0, 0.12);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0px 8px 24px rgba(0, 0, 0, 0.18);
}

/* Accent CTA — yellow */
.btn-accent {
  background: #E8D744;
  color: #1A1A1A;
  border-radius: 9999px;
  padding: 14px 28px;
  font-weight: 700;
  box-shadow: 0px 8px 24px rgba(232, 215, 68, 0.35);
}

/* Ghost / outline */
.btn-ghost {
  background: transparent;
  border: 1.5px solid rgba(0, 0, 0, 0.12);
  border-radius: 9999px;
  color: #1A1A1A;
  padding: 12px 24px;
  font-weight: 500;
}
```

Face Card usage: Accent for the scan and share actions, Primary for everything else. A stake or purchase button always shows the amount in its label (for example "Stake 200 points").

### Cards

```css
/* Standard feature card */
.card {
  background: #FFFFFF;
  border-radius: 24px;
  padding: 20px;
  box-shadow: 0px 4px 16px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.04);
}

/* Tinted accent card */
.card-tinted-yellow {
  background: linear-gradient(135deg, rgba(232, 215, 68, 0.12) 0%, rgba(242, 166, 162, 0.08) 100%);
  border-radius: 24px;
  border: 1px solid rgba(232, 215, 68, 0.2);
}

/* Dark card */
.card-dark {
  background: #1A1A1A;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}
```

### Input and prompt bar

```css
.input-prompt {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(0, 0, 0, 0.07);
  border-radius: 9999px;
  padding: 14px 20px;
  font-family: 'Switzer', sans-serif;
  font-size: 15px;
  color: #1A1A1A;
  width: 100%;
  box-shadow: 0px 4px 16px rgba(0, 0, 0, 0.05);
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.input-prompt::placeholder { color: #979797; }
.input-prompt:focus {
  border-color: rgba(232, 215, 68, 0.5);
  box-shadow: 0px 4px 16px rgba(232, 215, 68, 0.15);
}
```

### Tags and chips

```css
.tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 9999px;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 500;
  color: #1A1A1A;
}
.tag-lavender { background: rgba(179, 191, 240, 0.2); color: #5B6DC4; }
.tag-yellow   { background: rgba(232, 215, 68, 0.2);  color: #7A720A; }
.tag-pink     { background: rgba(217, 98, 142, 0.15); color: #C2496D; }
```

### Bottom navigation

The dock is unchanged. The central orb becomes the **scan button**, using the same brand radial gradient and glow. Tabs: Home, Shop, Scan (center), Face-offs, Card.

```css
.bottom-nav {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 32px);
  max-width: 358px;
  background: rgba(26, 26, 26, 0.92);
  backdrop-filter: blur(24px);
  border-radius: 9999px;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0px 8px 32px rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* Central scan button (Orla's AI orb) */
.nav-orb {
  width: 52px;
  height: 52px;
  border-radius: 9999px;
  background: radial-gradient(circle at 40% 40%, #E8D744 0%, #F2A6A2 40%, #D9628E 70%, #B3BFF0 100%);
  box-shadow: 0px 0px 20px rgba(232, 215, 68, 0.4), 0px 0px 40px rgba(217, 98, 142, 0.2);
}
```

## 11. Face Card components (built from Orla tokens)

### The Face Card and its tiers

Every tier uses only Orla colors and gradients.

| Tier | Background | Text | Source of the look |
| --- | --- | --- | --- |
| Classic | `linear-gradient(135deg, #2E2E2E 0%, #1A1A1A 100%)` | `#FFFFFF` | Dark surfaces 3 and 1 |
| Gold | `linear-gradient(135deg, #E8D744 0%, #F2A6A2 100%)` | `#1A1A1A` | Warm Gold to Soft Peach |
| Platinum | `linear-gradient(135deg, #D4C5F0 0%, #B3BFF0 100%)` | `#1A1A1A` | The Luna gradient |
| Black Card | `#0F0F0F` base with the brand gradient sheen | `#FFFFFF` | Dark base plus the orb glow |

```css
.face-card {
  aspect-ratio: 1.586 / 1;
  border-radius: 24px;
  padding: 20px;
  position: relative;
  overflow: hidden;
  background: var(--card-bg);
  color: var(--card-text);
  box-shadow: 0px 8px 24px rgba(0, 0, 0, 0.07);
}
.face-card--classic  { --card-bg: linear-gradient(135deg, #2E2E2E 0%, #1A1A1A 100%); --card-text: #FFFFFF; }
.face-card--gold     { --card-bg: linear-gradient(135deg, #E8D744 0%, #F2A6A2 100%); --card-text: #1A1A1A; }
.face-card--platinum { --card-bg: linear-gradient(135deg, #D4C5F0 0%, #B3BFF0 100%); --card-text: #1A1A1A; }
.face-card--black {
  --card-bg: #0F0F0F;
  --card-text: #FFFFFF;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0px 0px 32px rgba(232, 215, 68, 0.25), 0px 0px 64px rgba(217, 98, 142, 0.15);
}
/* Black Card sheen: the brand gradient sweeping across */
.face-card--black::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(115deg, transparent 40%, rgba(232, 215, 68, 0.25) 50%, transparent 60%);
  background-size: 200% 100%;
  animation: sheen 6s ease-in-out infinite;
}
@keyframes sheen {
  0%   { background-position: -150% 0; }
  100% { background-position: 250% 0; }
}
```

Layers from back to front: skin, frame, selfie (or stylized avatar), name and title, tier tag, card number, score. Skins use only Orla colors and gradients. Examples: the brand gradient, each persona gradient (Ember, Luna, Nova, Sage), the tinted yellow card, and dark glass. No outside patterns or motifs are introduced.

### Verdict chips

The four bands reuse Orla's tags. Lethal uses the brand gradient.

```css
.chip-harmless   { /* Harmless: lavender tag */   background: rgba(179, 191, 240, 0.2); color: #5B6DC4; }
.chip-suspicious { /* Suspicious: yellow tag */   background: rgba(232, 215, 68, 0.2);  color: #7A720A; }
.chip-dangerous  { /* Dangerous: pink tag */      background: rgba(217, 98, 142, 0.15); color: #C2496D; }
.chip-lethal {     /* Lethal: brand gradient */
  background: linear-gradient(135deg, #E8D744 0%, #F2A6A2 35%, #D9628E 65%, #B3BFF0 100%);
  color: #1A1A1A;
  box-shadow: 0px 8px 24px rgba(232, 215, 68, 0.35);
}
```

All four share the `.tag` shape (pill, 12px, weight 600 on result screens). Harmless is lavender on purpose, so a low band never reads as an error.

### Score and breakdown

- **Score:** the Lethality number in Switzer 700 at `--text-3xl`, with a count-up on reveal and the verdict chip beside it.
- **Breakdown rows** reuse Orla's schedule rows, one per category, each with its one-line tip beneath:

```css
.event-row { display: flex; align-items: center; gap: 12px; border-radius: 12px; padding: 10px 14px; }
.event-photo      { background: rgba(107, 174, 214, 0.15); border-left: 3px solid #6BAED6; } /* photo craft */
.event-face       { background: rgba(232, 127, 160, 0.15); border-left: 3px solid #E87FA0; } /* face */
.event-expression { background: rgba(155, 143, 212, 0.15); border-left: 3px solid #9B8FD4; } /* expression */
.event-aura       { background: rgba(232, 215, 68, 0.15);  border-left: 3px solid #E8D744; } /* aura */
```

### Other components

| Component | Spec |
| --- | --- |
| TierProgress | Track `rgba(0,0,0,0.05)`, fill with the brand linear gradient, pill shape; label in `--text-sm` with points to go |
| StreakWidget | `.card-tinted-yellow`; flame icon in Warm Gold; multiplier shown as a `.tag-yellow`; freezes as small `.tag-lavender` chips; reset countdown in `--text-xs` |
| ScansLeftChip | A `.tag` with three dots: filled `#1A1A1A` when used, `rgba(0,0,0,0.15)` when left |
| BalanceBar | Two `.card`s side by side: Lifetime (tier icon) and Spendable (coin icon, `.card-tinted-yellow`), clearly labeled so they never read as one number |
| ShopItemCard | `.card` at `--radius-lg`; states: buyable, owned (`.tag`), equipped (`.tag-yellow`), tier-locked (padlock plus a `.tag-lavender` with the tier name, 60% opacity), too expensive (price in `#979797`) |
| StakePicker | Track `rgba(0,0,0,0.08)`, fill with the brand gradient, quick-amount `.tag` chips, a live pot and 5% fee line, and a `.btn-primary` with the stake in its label |
| FaceOffCard | Two Face Cards side by side on a `.card`; a crown icon in Warm Gold over the winner; the pot in `--text-xl`; no loser stamp |
| CameraGuide | Oval face guide. Ready: white outline with `--glow-lavender`. Needs adjusting: Warm Gold outline with `--glow-yellow`. Blocked: Warm Magenta outline with `--glow-pink`. Hint text sits in `.glass-dark` |
| Toast | `.glass-dark` at `--radius-xl`, 4 seconds, one line plus an optional action |

Orla has no separate success or error colors. Face Card uses Warm Gold or Soft Lavender for positive states and Warm Magenta (`.tag-pink`) for errors, always paired with an icon and plain text.

## 12. Iconography

- **Style:** thin-to-medium line icons, stroke about 1.5–2px, rounded line caps and joins.
- **Size:** 20px standard, 24px for nav, 16px inline.
- **Color:** `#979797` inactive, `#1A1A1A` active, `#FFFFFF` on dark.
- **Active state:** a filled variant or a colored accent beneath.
- **Face Card icons to draw in the same style:** flame (streak), snowflake (streak freeze), crown (face-off winner), coin (spendable), shield (lifetime tier), shutter, padlock (tier lock).

## 13. Motion and micro-animations

### Transition defaults

```css
/* Standard interaction transition */
transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
/* Spring-like button press */
transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
/* Smooth reveal / fade in */
transition: opacity 0.3s ease, transform 0.3s ease;
```

### Animation patterns

```css
/* Orb pulse — scan button ready state */
@keyframes orb-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(232, 215, 68, 0.4); }
  50%      { box-shadow: 0 0 0 16px rgba(232, 215, 68, 0); }
}

/* Waveform bars — scoring in progress */
@keyframes wave-bar {
  0%, 100% { transform: scaleY(0.4); }
  50%      { transform: scaleY(1.0); }
}

/* Float / breathe — hero Face Card on the landing page */
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50%      { transform: translateY(-8px); }
}
animation: float 4s ease-in-out infinite;

/* Shimmer — loading skeleton */
@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
```

### Hover states

- **Cards:** `translateY(-2px)` and a stronger shadow.
- **Buttons:** `translateY(-1px)` and scale 1.01.
- **Nav icons:** scale 1.1 and a color shift to the active color.
- **Tone mode cards:** brighter border and a subtle scale.

### Where Face Card uses them

| Moment | Motion |
| --- | --- |
| Scan button ready | `orb-pulse` |
| Scoring in progress | `wave-bar` bars with `shimmer` on the result placeholder |
| Result reveal | Card flip (rotateY 180°, 600ms, spring easing), then the score counts up over 800ms |
| Tier up | Card scales to 1.05 with the sheen sweep, new tier styling fades in |
| Black Card at rest | `sheen` loop (section 11) |
| Landing hero card | `float` |

**Reduced motion:** when `prefers-reduced-motion` is set, remove loops (sheen, float, orb-pulse), replace flips and sweeps with 150ms fades, and show final values instantly.

## 14. Tone modes (Orla's voice personas)

Tone modes control the verdict lines and tips, and they use Orla's persona gradients exactly. Hype is the default. Copy needs a review by Nigerian writers before launch.

| Mode | Orla persona | Gradient from | Gradient to | Personality | Sample line |
| --- | --- | --- | --- | --- | --- |
| Hype (default) | Nova | `#87C5F0` | `#F2A6A2` | Energetic, upbeat, cheerful | "Face card never declines. Keep it moving." |
| Smooth | Luna | `#D4C5F0` | `#B3BFF0` | Calm, soothing, understated | "Quietly dangerous. We see you." |
| Roast (opt-in) | Ember | `#F2A6A2` | `#D9628E` | Warm, playful teasing about the photo, never the face or body | "That lighting is doing you dirty. Find a window." |
| Straight | Sage | `#4A3728` | `#6B5444` | Clear, direct, professional | "72. Photo craft 14 of 30. Face a window." |

```css
.persona-card { border-radius: 20px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.persona-ember { background: linear-gradient(135deg, #F2A6A2, #D9628E); }
.persona-luna  { background: linear-gradient(135deg, #D4C5F0, #B3BFF0); }
.persona-nova  { background: linear-gradient(135deg, #87C5F0, #F2A6A2); }
.persona-sage  { background: linear-gradient(135deg, #4A3728, #6B5444); }
```

All modes keep the same rules: no insults, no body-shaming, and every low-band result ends with a way to improve.

## 15. Dark mode

Face Card follows Orla: light by default, with full dark mode support and a manual toggle.

```css
[data-theme='dark'] {
  --bg-base: #0F0F0F;
  --bg-surface-1: #1A1A1A;
  --bg-surface-2: #252525;
  --bg-surface-3: #2E2E2E;
  --text-primary: #FFFFFF;
  --text-secondary: rgba(255, 255, 255, 0.6);
  --text-tertiary: rgba(255, 255, 255, 0.35);
  --border-default: rgba(255, 255, 255, 0.08);
  --border-subtle: rgba(255, 255, 255, 0.04);
}
```

Face Cards look the same in both themes; only the surrounding UI changes.

## 16. Share card layouts

| Format | Size | Safe margins | Layout |
| --- | --- | --- | --- |
| Feed (4:5) | 1080 × 1350 | 72px all sides | App mark top; Face Card centered at 936px wide; score and verdict chip below; four breakdown rows; streak and tier line; URL footer |
| Story (9:16) | 1080 × 1920 | 72px sides, 250px top, 340px bottom | Same stack with a larger Face Card and score |
| Face-off | 1080 × 1350 | 72px | Two cards stacked or split, crown on the winner, pot size centered, both scores |

- Background: the Orla light page gradient and hero glow (section 5), or the dark hero if the user's theme is dark.
- Typography is Switzer at the type scale, enlarged proportionally.
- Always include the app name and URL in the footer.
- The selfie area can swap to a stylized avatar when the user chooses.
- Render at 2× and export as PNG.

## 17. Accessibility

- **Contrast with Orla's colors (approximate, verify each pair):** Warm Gold `#E8D744` on white or cream is only about 1.5:1, so never use it for text or icons on light backgrounds. It works on Deep Charcoal (about 12:1). On light backgrounds use the Orla yellow tag text `#7A720A` (about 4.6:1 on cream).
- **Muted Gray `#979797` is about 2.7:1 on cream.** Use it only for placeholders and inactive icons. For readable secondary text use Deep Charcoal at 60% opacity, mirroring Orla's dark-mode secondary text approach.
- Check the tag text colors (`#5B6DC4`, `#C2496D`) on their tinted fills against AA (4.5:1 for body text, 3:1 for large text and icons).
- Never rely on color alone: bands show their name, camera hints show text, locked items show a padlock.
- Visible focus ring: 2px outline in Deep Charcoal on light, Warm Gold on dark, with a 2px offset.
- Tap targets at least 44 × 44px; the camera capture button at least 64px.
- Respect reduced motion (section 13).
- Alt text for cards: tier, score, band, and display name.

## 18. Complete CSS token reference

### Orla tokens (unchanged)

```css
:root {
  /* Brand Colors */
  --color-yellow:    #E8D744;
  --color-lavender:  #B3BFF0;
  --color-pink:      #D9628E;
  --color-peach:     #F2A6A2;
  --color-sky:       #87C5F0;

  /* Neutrals */
  --color-white:     #FFFFFF;
  --color-cream:     #F8F6F4;
  --color-gray:      #979797;
  --color-charcoal:  #1A1A1A;
  --color-black:     #000000;

  /* Dark Surfaces */
  --surface-dark-0:  #0F0F0F;
  --surface-dark-1:  #1A1A1A;
  --surface-dark-2:  #252525;
  --surface-dark-3:  #2E2E2E;

  /* Typography */
  --font-sans: 'Switzer', sans-serif;
  --text-xs:   11px;
  --text-sm:   13px;
  --text-base: 15px;
  --text-md:   17px;
  --text-lg:   20px;
  --text-xl:   24px;
  --text-2xl:  32px;
  --text-3xl:  40px;

  /* Spacing */
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;

  /* Border Radius */
  --radius-sm:   8px;
  --radius-md:   12px;
  --radius-lg:   16px;
  --radius-xl:   20px;
  --radius-2xl:  24px;
  --radius-3xl:  32px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm:  0px 4px 16px rgba(0, 0, 0, 0.05);
  --shadow-md:  0px 8px 24px rgba(0, 0, 0, 0.07);
  --shadow-lg:  0px 12px 32px rgba(0, 0, 0, 0.10);
  --shadow-xl:  0px 16px 48px rgba(0, 0, 0, 0.14);
  --glow-yellow: 0px 8px 24px rgba(232, 215, 68, 0.35);
  --glow-pink:   0px 8px 24px rgba(217, 98, 142, 0.30);
  --glow-lavender: 0px 8px 24px rgba(179, 191, 240, 0.35);

  /* Transitions */
  --transition-fast:   0.15s cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base:   0.2s cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow:   0.3s cubic-bezier(0.4, 0, 0.2, 1);
  --transition-spring: 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### Face Card additions (aliases of Orla values only)

```css
:root {
  /* Tiers */
  --tier-classic-bg:  linear-gradient(135deg, #2E2E2E 0%, #1A1A1A 100%);
  --tier-gold-bg:     linear-gradient(135deg, #E8D744 0%, #F2A6A2 100%);
  --tier-platinum-bg: linear-gradient(135deg, #D4C5F0 0%, #B3BFF0 100%);
  --tier-black-bg:    #0F0F0F;

  /* Breakdown categories */
  --cat-photo:      #6BAED6; /* event blue */
  --cat-face:       #E87FA0; /* event pink */
  --cat-expression: #9B8FD4; /* event purple */
  --cat-aura:       #E8D744; /* warm gold */

  /* Brand gradient for Lethal chip, scan button, progress fills */
  --gradient-brand: linear-gradient(135deg, #E8D744 0%, #F2A6A2 35%, #D9628E 65%, #B3BFF0 100%);
}
```

## 19. Open items

- Confirm you have permission or a licence to reuse the Orla design for a commercial product. It comes from a Behance case study by Gulshan, and design-system reuse can be restricted.
- Switzer is free through Fontshare; confirm the licence covers self-hosting for your use.
- Logo and app mark: draw the Face Card mark in the Orla blob language.
- Skin art: create the Orla-only skin set (brand gradient, persona gradients, tinted yellow, dark glass) using only Orla colors.
- Contrast pass on the muted gray text and tag text pairs (section 17).
- Review the Roast and Straight tone mode copy with Nigerian writers.
- Decide whether new users start in light mode (Orla's default, used here) or follow their device setting.
