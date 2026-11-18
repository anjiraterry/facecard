import { CARD_REFERENCE_HEIGHT, CARD_REFERENCE_WIDTH } from './materials';

export const ENGRAVING_ALGORITHM_VERSION = 'contour-v2';

export interface ContourCurve {
  d: string;
  kind: 'primary' | 'secondary';
  weight: number;
  opacityFactor: number;
}

export interface EngravingPattern {
  version: string;
  seed: string;
  focalX: number;
  focalY: number;
  curves: ContourCurve[];
}

const patternCache = new Map<string, EngravingPattern>();
const MAX_CACHE_ENTRIES = 250;

/**
 * FNV-1a 32-bit hash for deterministic seeding from a non-sensitive card identifier.
 */
function hashSeed(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Mulberry32 deterministic PRNG — never uses Math.random().
 */
function createRng(seedInt: number): () => number {
  let state = seedInt || 0x9e3779b9;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fmt(n: number): string {
  return n.toFixed(1);
}

/**
 * Generates deterministic Contour Engraving vector paths in 856x540 space.
 * Creates a sculptural pinched S-ribbon of flowing contour lines concentrated
 * on the right side with subtle secondary intersecting arcs, preserving clean
 * negative space on the left for typography.
 */
export function generateContourEngraving(seedInput: string): EngravingPattern {
  const normalizedSeed = (seedInput || 'facecard-default').trim();
  const cacheKey = `${ENGRAVING_ALGORITHM_VERSION}:${normalizedSeed}`;
  const cached = patternCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const rng = createRng(hashSeed(cacheKey));
  const W = CARD_REFERENCE_WIDTH;
  const H = CARD_REFERENCE_HEIGHT;

  // Bounded deterministic parameters (24..48 primary curves)
  const primaryCount = 28 + Math.floor(rng() * 10); // 28..37
  const secondaryCount = 7 + Math.floor(rng() * 5); // 7..11
  const focalX = W * (0.64 + rng() * 0.12); // Right-side waist focal point
  const focalY = H * (0.38 + rng() * 0.14);
  const topAnchorX = W * (0.62 + rng() * 0.08);
  const bottomAnchorX = W * (0.44 + rng() * 0.10);
  const waistSpread = 0.24 + rng() * 0.10; // Pinched ribbon waist tightness
  const ribbonSway = 42 + rng() * 26;
  const phaseOffset = rng() * Math.PI * 2;

  const curves: ContourCurve[] = [];

  // Primary contour family: sculptural pinched S-wave ribbon sweeping from
  // top-right through a graceful waist and flaring toward bottom-center/right.
  for (let i = 0; i < primaryCount; i += 1) {
    const t = i / Math.max(1, primaryCount - 1); // 0..1 across ribbon width
    const centered = t - 0.5; // -0.5..0.5
    const edgeFade = Math.sin(t * Math.PI); // Stronger in ribbon core, softer at edges

    const startX = topAnchorX + centered * 320;
    const startY = -30;

    // Waist pinch near focalX, focalY
    const waistX = focalX + centered * (320 * waistSpread) + Math.sin(phaseOffset + t * 2.2) * 8;
    const waistY = focalY + centered * 24;

    // Lower flare sweeping left-to-right at the bottom
    const endX = bottomAnchorX + centered * 430 + (t * t) * 90;
    const endY = H + 30;

    // Smooth cubic Bézier control points for continuous S-ribbon flow
    const c1x = startX - ribbonSway * (0.45 + (1 - t) * 0.35);
    const c1y = H * 0.14;
    const c2x = waistX - ribbonSway * 0.22;
    const c2y = waistY - H * 0.14;

    const c3x = waistX + ribbonSway * 0.28;
    const c3y = waistY + H * 0.16;
    const c4x = endX + ribbonSway * 0.18;
    const c4y = H * 0.86;

    const d = [
      `M ${fmt(startX)} ${fmt(startY)}`,
      `C ${fmt(c1x)} ${fmt(c1y)}, ${fmt(c2x)} ${fmt(c2y)}, ${fmt(waistX)} ${fmt(waistY)}`,
      `C ${fmt(c3x)} ${fmt(c3y)}, ${fmt(c4x)} ${fmt(c4y)}, ${fmt(endX)} ${fmt(endY)}`,
    ].join(' ');

    curves.push({
      d,
      kind: 'primary',
      weight: 0.95 + (i % 4 === 0 ? 0.2 : 0),
      opacityFactor: 0.52 + edgeFade * 0.48,
    });
  }

  // Secondary intersecting contour arcs: delicate sweeping arcs across the upper-right
  for (let j = 0; j < secondaryCount; j += 1) {
    const s = j / Math.max(1, secondaryCount - 1);
    const startX = W * (0.64 + s * 0.14);
    const startY = -20;
    const endX = W + 40;
    const endY = H * (0.28 + s * 0.46);

    const cp1x = startX + (endX - startX) * 0.18;
    const cp1y = H * (0.22 + s * 0.18);
    const cp2x = startX + (endX - startX) * 0.68;
    const cp2y = endY - 12 + Math.sin(phaseOffset + s * 2.5) * 14;

    const d = `M ${fmt(startX)} ${fmt(startY)} C ${fmt(cp1x)} ${fmt(cp1y)}, ${fmt(cp2x)} ${fmt(cp2y)}, ${fmt(endX)} ${fmt(endY)}`;

    curves.push({
      d,
      kind: 'secondary',
      weight: 0.85,
      opacityFactor: 0.35 + Math.sin(s * Math.PI) * 0.35,
    });
  }

  const pattern: EngravingPattern = {
    version: ENGRAVING_ALGORITHM_VERSION,
    seed: normalizedSeed,
    focalX,
    focalY,
    curves,
  };

  if (patternCache.size >= MAX_CACHE_ENTRIES) {
    const firstKey = patternCache.keys().next().value;
    if (firstKey) patternCache.delete(firstKey);
  }
  patternCache.set(cacheKey, pattern);

  return pattern;
}

/**
 * Renders the exact same deterministic Contour Engraving onto a 2D Canvas
 * for high-resolution exports (using Path2D in browser contexts).
 */
export function drawEngravingOnCanvas(
  ctx: CanvasRenderingContext2D,
  pattern: EngravingPattern,
  x: number,
  y: number,
  width: number,
  height: number,
  darkColor: string,
  darkOpacity: number,
  lightColor: string,
  lightOpacity: number
): void {
  if (typeof Path2D === 'undefined') return;

  const scaleX = width / CARD_REFERENCE_WIDTH;
  const scaleY = height / CARD_REFERENCE_HEIGHT;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scaleX, scaleY);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const curve of pattern.curves) {
    const path = new Path2D(curve.d);

    ctx.strokeStyle = darkColor;
    ctx.globalAlpha = darkOpacity * curve.opacityFactor;
    ctx.lineWidth = curve.weight;
    ctx.stroke(path);

    ctx.save();
    ctx.translate(0.75, 0.5);
    ctx.strokeStyle = lightColor;
    ctx.globalAlpha = lightOpacity * curve.opacityFactor * 0.8;
    ctx.lineWidth = curve.weight * 0.85;
    ctx.stroke(path);
    ctx.restore();
  }

  ctx.restore();
}
