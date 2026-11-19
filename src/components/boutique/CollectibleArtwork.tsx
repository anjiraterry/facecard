'use client';

import React from 'react';
import type { BoutiquePaletteKey, FourTokenPalette, MaterialTexture } from '@/lib/boutique/palette';

interface CollectibleArtworkProps {
  slug?: string | null;
  presetKey: BoutiquePaletteKey;
  palette: FourTokenPalette;
  texture?: MaterialTexture;
  artworkUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Bespoke 3D-inspired luxury collectible SVG illustrations tailored per item family.
 * Renders subtle metallic detailing, layered depth, and soft shadows without neon or generic icons.
 */
export function CollectibleArtwork({
  slug,
  presetKey,
  palette,
  artworkUrl,
  size = 'md',
}: CollectibleArtworkProps) {
  const dims = size === 'sm' ? 'w-12 h-12' : size === 'lg' ? 'w-24 h-24' : 'w-20 h-20';

  if (artworkUrl) {
    return (
      <div className={`${dims} relative flex items-center justify-center rounded-2xl overflow-hidden shadow-sm`}>
        <img src={artworkUrl} alt={slug || presetKey} className="w-full h-full object-cover" />
      </div>
    );
  }

  const key = (slug || '').toLowerCase();

  // 1. Luxury Card Skin (tilted layered card with bevel & metallic seal)
  if (presetKey === 'CARDS' || key.includes('skin')) {
    return (
      <svg viewBox="0 0 96 72" className={`${dims} drop-shadow-[0_8px_14px_rgba(37,30,36,0.14)]`} fill="none">
        <rect x="14" y="10" width="68" height="44" rx="9" fill={palette.border} opacity="0.7" transform="rotate(-4 48 32)" />
        <rect x="14" y="14" width="68" height="44" rx="9" fill={palette.accent} stroke="#FAF7F4" strokeWidth="1.4" />
        <rect x="17" y="17" width="62" height="38" rx="6.5" stroke="#FAF7F4" strokeOpacity="0.35" strokeWidth="0.8" />
        <path d="M18 46 Q 44 26, 78 36" stroke="#FAF7F4" strokeOpacity="0.32" strokeWidth="1.1" />
        <circle cx="67" cy="27" r="5" fill="#FAF7F4" fillOpacity="0.85" />
        <circle cx="67" cy="27" r="2.5" fill={palette.accent} />
      </svg>
    );
  }

  // 2. Streak Freeze (glacier faceted crystal prism)
  if (presetKey === 'STREAK' || key.includes('freeze')) {
    return (
      <svg viewBox="0 0 80 80" className={`${dims} drop-shadow-[0_8px_14px_rgba(27,47,56,0.16)]`} fill="none">
        <polygon points="40,8 64,26 56,64 24,64 16,26" fill={palette.border} stroke="#FAF7F4" strokeWidth="1.5" />
        <polygon points="40,8 64,26 40,42 16,26" fill="#FAF7F4" fillOpacity="0.65" />
        <polygon points="40,42 64,26 56,64" fill={palette.accent} fillOpacity="0.55" />
        <polygon points="40,42 16,26 24,64" fill={palette.accent} fillOpacity="0.85" />
        <line x1="40" y1="8" x2="40" y2="64" stroke="#FAF7F4" strokeOpacity="0.6" strokeWidth="1" />
      </svg>
    );
  }

  // 3. Social Gifts (sculpted rose / crown / gift keepsake)
  if (presetKey === 'GIFTS') {
    if (key.includes('crown')) {
      return (
        <svg viewBox="0 0 88 72" className={`${dims} drop-shadow-[0_8px_14px_rgba(53,31,40,0.16)]`} fill="none">
          <path d="M16 52 L12 24 L30 36 L44 16 L58 36 L76 24 L72 52 Z" fill={palette.accent} stroke="#FAF7F4" strokeWidth="1.5" strokeLinejoin="round" />
          <rect x="16" y="52" width="56" height="8" rx="3" fill={palette.text} />
          <circle cx="44" cy="14" r="3.5" fill="#FAF7F4" />
          <circle cx="12" cy="22" r="2.8" fill="#FAF7F4" />
          <circle cx="76" cy="22" r="2.8" fill="#FAF7F4" />
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 80 80" className={`${dims} drop-shadow-[0_8px_14px_rgba(53,31,40,0.14)]`} fill="none">
        <rect x="18" y="32" width="44" height="34" rx="7" fill={palette.accent} stroke="#FAF7F4" strokeWidth="1.4" />
        <rect x="14" y="24" width="52" height="11" rx="4" fill={palette.border} stroke="#FAF7F4" strokeWidth="1.2" />
        <rect x="36" y="24" width="8" height="42" fill="#FAF7F4" fillOpacity="0.85" />
        <path d="M40 24 C30 10, 18 18, 28 24 Z" fill={palette.accent} stroke="#FAF7F4" strokeWidth="1.2" />
        <path d="M40 24 C50 10, 62 18, 52 24 Z" fill={palette.accent} stroke="#FAF7F4" strokeWidth="1.2" />
      </svg>
    );
  }

  // 4. Profile Cosmetics (layered halo medallion & nameplate)
  if (presetKey === 'PROFILE') {
    return (
      <svg viewBox="0 0 80 80" className={`${dims} drop-shadow-[0_8px_14px_rgba(29,43,58,0.14)]`} fill="none">
        <circle cx="40" cy="38" r="24" stroke={palette.accent} strokeWidth="5" fill={palette.border} fillOpacity="0.45" />
        <circle cx="40" cy="38" r="18" stroke="#FAF7F4" strokeWidth="1.5" fill={palette.surface} />
        <circle cx="40" cy="33" r="6.5" fill={palette.accent} />
        <path d="M28 50 C31 43, 49 43, 52 50" stroke={palette.accent} strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  }

  // 5. Sharing Studio (precision metallic frame & lens)
  if (presetKey === 'SHARING') {
    return (
      <svg viewBox="0 0 80 80" className={`${dims} drop-shadow-[0_8px_14px_rgba(32,37,58,0.15)]`} fill="none">
        <rect x="14" y="18" width="52" height="44" rx="10" fill={palette.accent} stroke="#FAF7F4" strokeWidth="1.5" />
        <circle cx="40" cy="40" r="14" fill={palette.surface} stroke="#FAF7F4" strokeWidth="1.6" />
        <circle cx="40" cy="40" r="7" fill={palette.accent} />
        <circle cx="43" cy="37" r="2.2" fill="#FAF7F4" />
      </svg>
    );
  }

  // 6. Arena Cosmetics (sculpted crest & twin banners)
  if (presetKey === 'ARENA') {
    return (
      <svg viewBox="0 0 80 80" className={`${dims} drop-shadow-[0_8px_14px_rgba(54,32,25,0.15)]`} fill="none">
        <path d="M22 14 H58 V46 L40 64 L22 46 Z" fill={palette.accent} stroke="#FAF7F4" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M29 22 H51 V43 L40 54 L29 43 Z" fill={palette.surface} fillOpacity="0.35" stroke="#FAF7F4" strokeOpacity="0.6" strokeWidth="1" />
        <circle cx="40" cy="35" r="5" fill="#FAF7F4" />
      </svg>
    );
  }

  // 7. Perks / Collections / Community / Limited (layered ceramic jewel box)
  return (
    <svg viewBox="0 0 80 80" className={`${dims} drop-shadow-[0_8px_14px_rgba(30,48,30,0.14)]`} fill="none">
      <rect x="16" y="18" width="48" height="44" rx="12" fill={palette.border} stroke="#FAF7F4" strokeWidth="1.4" />
      <rect x="22" y="24" width="36" height="32" rx="8" fill={palette.accent} />
      <polygon points="40,30 49,40 40,50 31,40" fill="#FAF7F4" fillOpacity="0.9" />
    </svg>
  );
}
