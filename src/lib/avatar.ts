/**
 * Avatar & initials utilities for Face Card.
 * Generates Soft Luxury initials SVG data URIs and bespoke emblem presets.
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
  { bg1: '#FAF7F4', bg2: '#EBDCD5', text: '#251E24' }, // Porcelain to Skin Nude
  { bg1: '#EBDCD5', bg2: '#D2B8C9', text: '#251E24' }, // Skin Nude to Dusty Mauve
  { bg1: '#D2B8C9', bg2: '#96788D', text: '#FAF7F4' }, // Dusty Mauve to Muted Plum
  { bg1: '#F5E8CE', bg2: '#E5CA99', text: '#2B2118' }, // Warm Champagne
  { bg1: '#2C232B', bg2: '#251E24', text: '#FAF7F4' }, // Black Plum
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
  <text x="50" y="54" font-family="'Plus Jakarta Sans', 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif" font-size="34" font-weight="700" fill="${palette.text}" text-anchor="middle" dominant-baseline="middle">${initials}</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const AVATAR_PRESETS = [
  {
    id: 'dusty-mauve',
    name: 'Dusty Mauve',
    url: 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="dm" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#D2B8C9"/><stop offset="100%" stop-color="#96788D"/></linearGradient></defs><circle cx="50" cy="50" r="50" fill="url(#dm)"/><path d="M50 25 L54 42 L71 42 L58 52 L63 69 L50 59 L37 69 L42 52 L29 42 L46 42 Z" fill="#FAF7F4"/></svg>`),
  },
  {
    id: 'champagne-gold',
    name: 'Champagne Gold',
    url: 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="cg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#F5E8CE"/><stop offset="100%" stop-color="#D4B072"/></linearGradient></defs><circle cx="50" cy="50" r="50" fill="url(#cg)"/><path d="M50 24 L74 48 L50 72 L26 48 Z" fill="#251E24"/></svg>`),
  },
  {
    id: 'black-plum',
    name: 'Black Plum',
    url: 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="bp" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#3A2F38"/><stop offset="100%" stop-color="#251E24"/></linearGradient></defs><circle cx="50" cy="50" r="50" fill="url(#bp)"/><path d="M50 26 C64 26 71 31 71 46 C71 63 50 74 50 74 C50 74 29 63 29 46 C29 31 36 26 50 26 Z" fill="#FAF7F4"/></svg>`),
  },
  {
    id: 'skin-nude',
    name: 'Warm Nude',
    url: 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="sn" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FAF7F4"/><stop offset="100%" stop-color="#EBDCD5"/></linearGradient></defs><circle cx="50" cy="50" r="50" fill="url(#sn)"/><circle cx="50" cy="50" r="20" fill="none" stroke="#251E24" stroke-width="3"/><circle cx="50" cy="50" r="7" fill="#96788D"/></svg>`),
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

  let bg1 = '#251E24';
  let bg2 = '#171216';
  let accent = '#D2B8C9';

  if (tierUpper === 'GOLD') {
    bg1 = '#382B1E';
    bg2 = '#1F1710';
    accent = '#E5CA99';
  } else if (tierUpper === 'PLATINUM') {
    bg1 = '#342A33';
    bg2 = '#1E181D';
    accent = '#D2B8C9';
  } else if (tierUpper === 'BLACK') {
    bg1 = '#251E24';
    bg2 = '#120E11';
    accent = '#96788D';
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" width="300" height="400">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${bg1}"/>
      <stop offset="100%" stop-color="${bg2}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="42%" r="48%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${bg1}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="300" height="400" fill="url(#bg)"/>
  <rect width="300" height="400" fill="url(#glow)"/>
  <circle cx="150" cy="170" r="48" fill="rgba(250, 247, 244, 0.05)" stroke="rgba(235, 220, 213, 0.2)" stroke-width="1.5"/>
  <text x="150" y="175" font-family="'Plus Jakarta Sans', 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif" font-size="40" font-weight="700" fill="#FAF7F4" text-anchor="middle" dominant-baseline="middle" letter-spacing="2">${initials}</text>
  <rect y="250" width="300" height="150" fill="url(#bg)" opacity="0.65"/>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
