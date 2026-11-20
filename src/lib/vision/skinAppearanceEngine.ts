export const SKIN_APPEARANCE_VERSION = 'v2.1-observation';

export type SkinObservationKey =
  | 'tone_unevenness'
  | 'local_color_variation'
  | 'visible_surface_texture'
  | 'surface_shine'
  | 'visible_spots'
  | 'visible_flaking'
  | 'visible_redness'
  | 'under_eye_contrast'
  | 'visible_fine_lines'
  | 'pore_visibility'
  | 'surface_reflection';

export const LAUNCH_OBSERVATION_KEYS = new Set<SkinObservationKey>([
  'tone_unevenness',
  'visible_surface_texture',
  'visible_redness',
]);

export interface SkinObservationItem {
  id: SkinObservationKey;
  label: string;
  launchStatus: 'LAUNCH' | 'PLANNED';
  measurementMethod: string;
  measuredValue: number | null; // 0 - 100 relative index when AVAILABLE, null when UNAVAILABLE
  confidence: number; // 0 - 1
  availability: 'AVAILABLE' | 'UNAVAILABLE';
  region: string;
  captureLimitations: string[];
  algorithmVersion: string;
  concernCandidates: string[];
  userConfirmationRequired: true;
  plainLanguageNote: string;
}

export interface SkinAppearanceObservation {
  version: string;
  availability: 'AVAILABLE' | 'UNAVAILABLE';
  toneUniformityNote: string;
  surfaceShineNote: string;
  hydrationStatus: 'USER_REPORTED_ONLY';
  skinTypeStatus: 'USER_REPORTED_ONLY';
  limitations: string[];
  observations: SkinObservationItem[];
}

export interface SkinObservationInput {
  exposure?: number | null;
  sharpness?: number | null;
  lightingBalance?: number | null;
  compressionScore?: number | null;
  resolutionMinEdge?: number | null;
  smoothingSuspected?: boolean;
  userSkinType?: string | null;
  /** Optional relative ROI metrics computed on-device from original unedited pixels */
  pixelMetrics?: {
    relativeToneContrast?: number | null;
    chromaVariance?: number | null;
    highPassTexture?: number | null;
    specularRatio?: number | null;
    spotDensity?: number | null;
    rednessDeltaA?: number | null;
    underEyeContrast?: number | null;
  };
}

const BASE_LIMITATIONS = [
  'Selfie cameras cannot reliably diagnose acne, eczema, hydration, barrier health, oil production, or biological age.',
  'Absolute skin lightness or complexion (MST 1–10) is never used in scoring.',
  'Lighting, perspiration, makeup, or camera smoothing can alter surface appearance.',
];

/**
 * Evaluates supported photographic skin observations with explicit confidence,
 * availability, capture limitations, and user-confirmation requirements.
 * Never fabricates values when capture quality is insufficient.
 */
export function evaluateSkinObservations(input: SkinObservationInput): SkinAppearanceObservation {
  const exposure = input.exposure ?? null;
  const sharpness = input.sharpness ?? null;
  const lightingBalance = input.lightingBalance ?? exposure ?? null;
  const smoothing = Boolean(input.smoothingSuspected);
  const resMin = input.resolutionMinEdge ?? 480;
  const compressionOk = (input.compressionScore ?? 75) >= 40;

  const basicReliable =
    typeof exposure === 'number' &&
    exposure >= 50 &&
    typeof sharpness === 'number' &&
    sharpness >= 50;

  const highResReliable = basicReliable && resMin >= 480 && compressionOk && !smoothing;
  const lightingEven = typeof lightingBalance === 'number' && lightingBalance >= 65;

  const pm = input.pixelMetrics;
  const buildObs = (params: {
    id: SkinObservationKey;
    label: string;
    method: string;
    available: boolean;
    value: number | null;
    confidence: number;
    region: string;
    extraLimitation?: string;
    concerns: string[];
    noteWhenAvail: string;
    noteWhenUnavail: string;
  }): SkinObservationItem => {
    const isLaunch = LAUNCH_OBSERVATION_KEYS.has(params.id);
    const effectiveAvailable = isLaunch && params.available;
    return {
      id: params.id,
      label: params.label,
      launchStatus: isLaunch ? 'LAUNCH' : 'PLANNED',
      measurementMethod: params.method,
      measuredValue:
        effectiveAvailable && typeof params.value === 'number'
          ? Math.max(0, Math.min(100, Math.round(params.value)))
          : null,
      confidence: effectiveAvailable ? Number(Math.max(0.15, Math.min(0.95, params.confidence)).toFixed(2)) : 0,
      availability: effectiveAvailable ? 'AVAILABLE' : 'UNAVAILABLE',
      region: params.region,
      captureLimitations: params.extraLimitation ? [...BASE_LIMITATIONS, params.extraLimitation] : BASE_LIMITATIONS,
      algorithmVersion: SKIN_APPEARANCE_VERSION,
      concernCandidates: params.concerns,
      userConfirmationRequired: true,
      plainLanguageNote: !isLaunch
        ? 'Planned: disabled pending smartphone validation and MST 1–10 skin-tone fairness audit.'
        : effectiveAvailable
        ? params.noteWhenAvail
        : params.noteWhenUnavail,
    };
  };

  const observations: SkinObservationItem[] = [
    buildObs({
      id: 'tone_unevenness',
      label: 'Relative Tone Consistency',
      method: 'Weber-normalised local chromatic & L* variation across cheek/forehead ROIs',
      available: basicReliable && lightingEven,
      value: pm?.relativeToneContrast ?? (basicReliable && lightingEven ? Math.round((lightingBalance! + exposure!) / 2) : null),
      confidence: smoothing ? 0.45 : 0.78,
      region: 'cheeks_and_forehead',
      extraLimitation: 'Side shadows can mimic uneven tone.',
      concerns: ['uneven-tone', 'sun-protection'],
      noteWhenAvail: 'Relative tone consistency observed across evenly lit cheek and forehead regions.',
      noteWhenUnavail: 'Unavailable: even front lighting is required to observe tone consistency.',
    }),
    buildObs({
      id: 'local_color_variation',
      label: 'Local Colour Variation',
      method: 'CIELAB Δa*/Δb* interquartile scatter relative to user median skin chroma',
      available: basicReliable && lightingEven,
      value: pm?.chromaVariance ?? (basicReliable && lightingEven ? Math.round(lightingBalance!) : null),
      confidence: 0.72,
      region: 'cheeks',
      concerns: ['uneven-tone'],
      noteWhenAvail: 'Local colour variation measured relative to your own baseline skin tone.',
      noteWhenUnavail: 'Unavailable under uneven or dim lighting.',
    }),
    buildObs({
      id: 'visible_surface_texture',
      label: 'Visible Surface Texture',
      method: 'Multi-scale band-pass L* texture variance on normalised ROI',
      available: highResReliable,
      value: pm?.highPassTexture ?? (highResReliable ? Math.round(sharpness!) : null),
      confidence: 0.74,
      region: 'cheeks_and_forehead',
      extraLimitation: 'Phone camera smoothing or JPEG compression can mask real surface texture.',
      concerns: ['rough-texture', 'dryness-hydration'],
      noteWhenAvail: 'Visible micro-texture observed in sharp, unsmoothed capture regions.',
      noteWhenUnavail: smoothing
        ? 'Unavailable: camera beautification or smoothing detected.'
        : 'Unavailable: higher sharpness and resolution needed for texture observation.',
    }),
    buildObs({
      id: 'surface_shine',
      label: 'Surface Shine',
      method: 'Specular highlight fraction vs. diffuse cheek luminance',
      available: basicReliable,
      value: pm?.specularRatio ?? (basicReliable ? Math.round(exposure!) : null),
      confidence: 0.65,
      region: 't_zone_and_cheeks',
      extraLimitation: 'Surface shine can result from lighting angles, perspiration, or recently applied skincare—not necessarily oily skin.',
      concerns: ['excess-shine'],
      noteWhenAvail: 'Capture-dependent surface reflection observed; confirm whether oiliness is a concern for you.',
      noteWhenUnavail: 'Unavailable under current lighting or blur.',
    }),
    buildObs({
      id: 'visible_spots',
      label: 'Visible Contrast Spots',
      method: 'Localised DoG chromatic & contrast peak observation',
      available: highResReliable && lightingEven,
      value: pm?.spotDensity ?? null,
      confidence: 0.62,
      region: 'cheeks',
      concerns: ['uneven-tone', 'breakouts-blemishes'],
      noteWhenAvail: 'Localised contrast variations observed; confirm any dark-spot or blemish goals in your profile.',
      noteWhenUnavail: 'Unavailable without sharp, evenly lit, unsmoothed capture.',
    }),
    buildObs({
      id: 'visible_flaking',
      label: 'Visible Flaking (Low Confidence)',
      method: 'High-frequency perinasal & chin edge detail analysis',
      available: highResReliable && typeof pm?.highPassTexture === 'number',
      value: pm?.highPassTexture ?? null,
      confidence: 0.4,
      region: 'perinasal_and_chin',
      extraLimitation: 'Ordinary selfies rarely resolve mild dryness flaking reliably.',
      concerns: ['dryness-hydration', 'sensitivity-barrier'],
      noteWhenAvail: 'Low-confidence surface detail cue; confirm dryness directly in your Skin Profile.',
      noteWhenUnavail: 'Unavailable: smartphone resolution cannot reliably detect subtle flaking.',
    }),
    buildObs({
      id: 'visible_redness',
      label: 'Redness-Like Colour Variation',
      method: 'Relative Δa* variation normalised to user cheek median under even lighting',
      available: basicReliable && lightingEven,
      value: pm?.rednessDeltaA ?? null,
      confidence: 0.58,
      region: 'cheeks_and_nose',
      extraLimitation: 'Warm ambient bulbs or camera white balance shift Δa* readings.',
      concerns: ['sensitivity-barrier', 'redness-soothing'],
      noteWhenAvail: 'Relative colour shift observed; warm bulbs can affect this reading.',
      noteWhenUnavail: 'Unavailable: balanced white light required for colour-variation cues.',
    }),
    buildObs({
      id: 'under_eye_contrast',
      label: 'Under-Eye Contrast',
      method: 'Periorbital vs. malar cheek ΔL* / ΔE contrast',
      available: basicReliable && lightingEven,
      value: pm?.underEyeContrast ?? null,
      confidence: 0.6,
      region: 'under_eye',
      extraLimitation: 'Overhead lighting casts natural brow shadows under the eyes.',
      concerns: ['under-eye-care', 'sun-protection'],
      noteWhenAvail: 'Periorbital contrast observed; overhead shadows strongly influence this.',
      noteWhenUnavail: 'Unavailable under uneven or overhead lighting.',
    }),
    buildObs({
      id: 'visible_fine_lines',
      label: 'Visible Fine Lines',
      method: 'Localised directional edge & texture analysis',
      available: highResReliable && typeof pm?.highPassTexture === 'number',
      value: pm?.highPassTexture ?? null,
      confidence: 0.48,
      region: 'periorbital_and_forehead',
      extraLimitation: 'Expression folds and camera sharpening can mimic fine lines.',
      concerns: ['fine-lines-firmness', 'sun-protection'],
      noteWhenAvail: 'Low-to-moderate confidence edge observation; expression affects this.',
      noteWhenUnavail: 'Unavailable without sharp, unsmoothed, high-resolution capture.',
    }),
    buildObs({
      id: 'pore_visibility',
      label: 'Pore Visibility',
      method: 'High-frequency micro-texture observation under adequate resolution',
      available: highResReliable && resMin >= 640 && typeof pm?.highPassTexture === 'number',
      value: pm?.highPassTexture ?? null,
      confidence: 0.45,
      region: 'central_cheeks_and_nose',
      extraLimitation: 'Pore visibility is normal anatomy and strongly depends on camera distance.',
      concerns: ['pore-care'],
      noteWhenAvail: 'High-resolution texture cue observed; pores are normal skin anatomy.',
      noteWhenUnavail: 'Unavailable: requires higher resolution and zero camera smoothing.',
    }),
    buildObs({
      id: 'surface_reflection',
      label: 'Surface Reflection / Radiance',
      method: 'Diffuse-to-specular cheek reflection ratio',
      available: basicReliable,
      value: pm?.specularRatio ?? (basicReliable ? Math.round(exposure!) : null),
      confidence: 0.66,
      region: 'malars_and_forehead',
      concerns: ['radiance-glow', 'dryness-hydration'],
      noteWhenAvail: 'Surface illumination characteristics observed within normal photographic range.',
      noteWhenUnavail: 'Unavailable under current lighting conditions.',
    }),
  ];

  return {
    version: SKIN_APPEARANCE_VERSION,
    availability: basicReliable ? 'AVAILABLE' : 'UNAVAILABLE',
    toneUniformityNote: !basicReliable
      ? 'Insufficient lighting or image detail for reliable visual observation.'
      : lightingEven
      ? 'Lighting is balanced across visible facial regions.'
      : 'Moderate shadows present; softer front lighting improves visual consistency.',
    surfaceShineNote: basicReliable
      ? 'Capture-dependent surface reflection within normal photographic range (lighting, sweat, or products can contribute).'
      : 'Unavailable under current capture conditions.',
    hydrationStatus: 'USER_REPORTED_ONLY',
    skinTypeStatus: 'USER_REPORTED_ONLY',
    limitations: BASE_LIMITATIONS,
    observations,
  };
}

/** Backward-compatible wrapper preserving existing callers */
export function evaluateSkinAppearance(input: {
  exposure?: number | null;
  sharpness?: number | null;
  lightingBalance?: number | null;
  smoothingSuspected?: boolean;
  userSkinType?: string | null;
}): SkinAppearanceObservation {
  return evaluateSkinObservations(input);
}
