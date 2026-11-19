export const SKIN_APPEARANCE_VERSION = 'v1.0-observation';

export interface SkinAppearanceObservation {
  version: string;
  availability: 'AVAILABLE' | 'UNAVAILABLE';
  toneUniformityNote: string;
  surfaceShineNote: string;
  hydrationStatus: 'USER_REPORTED_ONLY';
  skinTypeStatus: 'USER_REPORTED_ONLY';
  limitations: string[];
}

/**
 * Separates capture-dependent visible appearance observations from user-reported skin profile.
 * Never uses absolute skin brightness/lightness as a beauty or skin quality metric (no colourism).
 * Returns UNAVAILABLE when lighting/sharpness cannot support reliable visual observation.
 */
export function evaluateSkinAppearance(input: {
  exposure?: number | null;
  sharpness?: number | null;
  userSkinType?: string | null;
}): SkinAppearanceObservation {
  const limitations = [
    'Selfie cameras cannot reliably diagnose acne, eczema, hydration, or skin type.',
    'Skin brightness or complexion is never used in scoring.',
  ];

  const reliableCapture =
    typeof input.exposure === 'number' &&
    input.exposure >= 50 &&
    typeof input.sharpness === 'number' &&
    input.sharpness >= 50;

  if (!reliableCapture) {
    return {
      version: SKIN_APPEARANCE_VERSION,
      availability: 'UNAVAILABLE',
      toneUniformityNote: 'Insufficient lighting or image detail for reliable visual observation.',
      surfaceShineNote: 'Unavailable under current capture conditions.',
      hydrationStatus: 'USER_REPORTED_ONLY',
      skinTypeStatus: 'USER_REPORTED_ONLY',
      limitations,
    };
  }

  return {
    version: SKIN_APPEARANCE_VERSION,
    availability: 'AVAILABLE',
    toneUniformityNote: input.exposure! >= 75
      ? 'Lighting is balanced across visible facial regions.'
      : 'Moderate shadows present; softer front lighting improves visual consistency.',
    surfaceShineNote: 'Capture-dependent surface reflection within normal photographic range.',
    hydrationStatus: 'USER_REPORTED_ONLY',
    skinTypeStatus: 'USER_REPORTED_ONLY',
    limitations,
  };
}
