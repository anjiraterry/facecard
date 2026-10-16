/**
 * Avatar & initials utilities for Facecard.
 * Generates clean, elegant initials SVG data URIs and human-readable acronyms
 * matching the app's signature aesthetic (no blocky identicons).
 */

export function getUserInitials(name?: string | null, fallbackHandle?: string | null): string {
  const cleanName = (name || '').trim();
  if (cleanName) {
    const parts = cleanName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    if (parts.length === 1 && parts[0].length >= 2) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (parts.length === 1 && parts[0].length === 1) {
      return parts[0].toUpperCase();
    }
  }

  const cleanHandle = (fallbackHandle || '').replace(/^@/, '').trim();
  if (cleanHandle.length >= 2) {
    return cleanHandle.slice(0, 2).toUpperCase();
  }
  if (cleanHandle.length === 1) {
    return cleanHandle.toUpperCase();
  }

  return 'FC';
}

const PALETTES = [
  { bg1: '#DDD6FE', bg2: '#C4B5FD', text: '#140826' }, // Soft Lavender
  { bg1: '#FEF08A', bg2: '#FDE047', text: '#140826' }, // Warm Gold
  { bg1: '#FED7AA', bg2: '#FDBA74', text: '#140826' }, // Soft Peach
  { bg1: '#FECDD3', bg2: '#FDA4AF', text: '#140826' }, // Soft Rose
  { bg1: '#C7D2FE', bg2: '#A5B4FC', text: '#140826' }, // Lilac Indigo
  { bg1: '#A7F3D0', bg2: '#6EE7B7', text: '#140826' }, // Pale Mint
];

export function getInitialsAvatarSvg(name?: string | null, fallbackHandle?: string | null): string {
  const initials = getUserInitials(name, fallbackHandle);
  const hash = Math.abs(
    (name || fallbackHandle || 'FC').split('').reduce((acc, c) => ((acc << 5) - acc) + c.charCodeAt(0), 0)
  );
  const palette = PALETTES[hash % PALETTES.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <linearGradient id="g_${hash}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.bg1}"/>
      <stop offset="100%" stop-color="${palette.bg2}"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="50" fill="url(#g_${hash})"/>
  <text x="50" y="54" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="36" font-weight="800" fill="${palette.text}" text-anchor="middle" dominant-baseline="middle">${initials}</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const AVATAR_PRESETS = [
  {
    id: 'cosmic-violet',
    name: 'Cosmic Violet',
    url: 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="cv" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#8B5CF6"/><stop offset="100%" stop-color="#4C1D95"/></linearGradient></defs><circle cx="50" cy="50" r="50" fill="url(#cv)"/><path d="M50 25 L54 42 L71 42 L58 52 L63 69 L50 59 L37 69 L42 52 L29 42 L46 42 Z" fill="#FFFFFF"/></svg>`),
  },
  {
    id: 'solar-gold',
    name: 'Solar Gold',
    url: 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FBBF24"/><stop offset="100%" stop-color="#B45309"/></linearGradient></defs><circle cx="50" cy="50" r="50" fill="url(#sg)"/><path d="M50 24 L74 48 L50 72 L26 48 Z" fill="#FFFFFF"/></svg>`),
  },
  {
    id: 'obsidian-stealth',
    name: 'Obsidian Stealth',
    url: 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="os" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#3F3F46"/><stop offset="100%" stop-color="#18181B"/></linearGradient></defs><circle cx="50" cy="50" r="50" fill="url(#os)"/><path d="M50 26 C64 26 71 31 71 46 C71 63 50 74 50 74 C50 74 29 63 29 46 C29 31 36 26 50 26 Z" fill="#FFFFFF"/></svg>`),
  },
  {
    id: 'liquid-platinum',
    name: 'Liquid Platinum',
    url: 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="lp" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#E2E8F0"/><stop offset="100%" stop-color="#64748B"/></linearGradient></defs><circle cx="50" cy="50" r="50" fill="url(#lp)"/><path d="M53 23 L33 50 L49 50 L45 77 L67 46 L51 46 Z" fill="#FFFFFF"/></svg>`),
  },
  {
    id: 'cyber-emerald',
    name: 'Cyber Emerald',
    url: 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="ce" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#34D399"/><stop offset="100%" stop-color="#065F46"/></linearGradient></defs><circle cx="50" cy="50" r="50" fill="url(#ce)"/><path d="M50 25 C50 25 60 37 60 49 C60 60 52 69 50 74 C48 69 40 60 40 49 C40 37 50 25 50 25 Z" fill="#FFFFFF"/></svg>`),
  },
  {
    id: 'crimson-aura',
    name: 'Crimson Aura',
    url: 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="ca" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FB7185"/><stop offset="100%" stop-color="#9F1239"/></linearGradient></defs><circle cx="50" cy="50" r="50" fill="url(#ca)"/><circle cx="50" cy="50" r="22" fill="none" stroke="#FFFFFF" stroke-width="5"/><circle cx="50" cy="50" r="9" fill="#FFFFFF"/></svg>`),
  },
];

export function getCardCoverArtSvg(opts: {
  name?: string | null;
  handle?: string | null;
  tier?: string | null;
}): string {
  const cleanHandle = (opts.handle || '').replace(/^@/, '').trim();
  const initials = getUserInitials(opts.name, cleanHandle);
  const tierUpper = (opts.tier || 'CLASSIC').toUpperCase();

  let bg1 = '#1C1236';
  let bg2 = '#0D071B';
  let accent = '#9333EA';

  if (tierUpper === 'GOLD') {
    bg1 = '#281703';
    bg2 = '#110901';
    accent = '#D97706';
  } else if (tierUpper === 'PLATINUM') {
    bg1 = '#131B2E';
    bg2 = '#070C18';
    accent = '#0284C7';
  } else if (tierUpper === 'BLACK') {
    bg1 = '#18181B';
    bg2 = '#09090B';
    accent = '#E11D48';
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" width="300" height="400">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${bg1}"/>
      <stop offset="100%" stop-color="${bg2}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="42%" r="48%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${bg1}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Clean, smooth minimal gradient canvas -->
  <rect width="300" height="400" fill="url(#bg)"/>
  <rect width="300" height="400" fill="url(#glow)"/>

  <!-- Simple, elegant center monogram hallmark -->
  <circle cx="150" cy="170" r="48" fill="rgba(255, 255, 255, 0.05)" stroke="rgba(255, 255, 255, 0.12)" stroke-width="1.5"/>
  <text x="150" y="175" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="42" font-weight="800" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle" letter-spacing="1">${initials}</text>

  <!-- Clean bottom vignette for capsule drawer legibility -->
  <rect y="250" width="300" height="150" fill="url(#bg)" opacity="0.65"/>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
