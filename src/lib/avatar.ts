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

export function getInitialsAvatarSvg(name?: string | null, seed?: string | null): string {
  const initials = getUserInitials(name, seed);
  const hashKey = (seed || name || initials).toLowerCase();
  let hash = 0;
  for (let i = 0; i < hashKey.length; i++) {
    hash = (hash << 5) - hash + hashKey.charCodeAt(i);
    hash |= 0;
  }
  const palette = PALETTES[Math.abs(hash) % PALETTES.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.bg1}"/>
      <stop offset="100%" stop-color="${palette.bg2}"/>
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="50" fill="url(#g)"/>
  <text x="50" y="55" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="38" font-weight="800" fill="${palette.text}" text-anchor="middle" dominant-baseline="middle" letter-spacing="-0.5">${initials}</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
