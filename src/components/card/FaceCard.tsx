'use client';

import React, { useMemo, useRef } from 'react';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion';
import { FaceCardData, Tier } from '@/types';
import { VERDICT_BANDS } from '@/lib/tokens';
import { cn } from '@/lib/utils';
import {
  CARD_REFERENCE_HEIGHT,
  CARD_REFERENCE_WIDTH,
  TierMaterialSpec,
  resolveCardMaterial,
} from './materials';
import { EngravingPattern, generateContourEngraving } from './engraving';

export type FaceCardVariant =
  | 'hero'
  | 'personal'
  | 'compact'
  | 'preview'
  | 'arena'
  | 'export';

export interface FaceCardProps {
  card: FaceCardData;
  className?: string;
  interactive?: boolean;
  variant?: FaceCardVariant;
  reveal?: boolean;
  isLockedPreview?: boolean;
}

// Re-export tier keys so material configuration stays centralized while preserving contract visibility
const SUPPORTED_TIERS: readonly Tier[] = ['CLASSIC', 'GOLD', 'PLATINUM', 'BLACK'];
void SUPPORTED_TIERS;

// Lightweight static SVG micrograin (~3% effective opacity, no runtime animation)
const MICROGRAIN_DATA_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")";

const ProceduralEngraving = React.memo(function ProceduralEngraving({
  pattern,
  material,
  compact,
}: {
  pattern: EngravingPattern;
  material: TierMaterialSpec;
  compact: boolean;
}) {
  const curves = compact ? pattern.curves.slice(0, 20) : pattern.curves;

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${CARD_REFERENCE_WIDTH} ${CARD_REFERENCE_HEIGHT}`}
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 h-full w-full select-none"
    >
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {curves.map((curve, idx) => (
          <g key={`${pattern.version}-${idx}`}>
            <path
              d={curve.d}
              stroke={material.engravingDarkColor}
              strokeWidth={Number(curve.weight.toFixed(4))}
              strokeOpacity={Number((material.engravingDarkOpacity * curve.opacityFactor).toFixed(4))}
            />
            {!compact && (
              <path
                d={curve.d}
                transform="translate(0.65 0.65)"
                stroke={material.engravingLightColor}
                strokeWidth={Number((curve.weight * 0.85).toFixed(4))}
                strokeOpacity={Number((material.engravingLightOpacity * curve.opacityFactor * 0.78).toFixed(4))}
              />
            )}
          </g>
        ))}
      </g>
    </svg>
  );
});

export function FaceCard({
  card,
  className,
  interactive = true,
  variant = 'personal',
  reveal = false,
  isLockedPreview = false,
}: FaceCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);

  const isCompact = variant === 'compact';
  const isExport = variant === 'export';
  const isArena = variant === 'arena';
  const isInteractive =
    interactive &&
    !prefersReducedMotion &&
    !isCompact &&
    !isExport &&
    !isArena;

  const material = useMemo(
    () => resolveCardMaterial(card.tier, card.skinId, card.frameId, card.theme),
    [card.tier, card.skinId, card.frameId, card.theme]
  );

  const engravingSeed = useMemo(
    () => card.id || card.cardNumber || card.handle || card.cardholderName || 'facecard',
    [card.id, card.cardNumber, card.handle, card.cardholderName]
  );

  const engravingPattern = useMemo(
    () => generateContourEngraving(engravingSeed),
    [engravingSeed]
  );

  const verdictConfig = card.band ? VERDICT_BANDS[card.band] : null;
  const displayName = card.cardholderName.trim().split(/\s+/).slice(0, 2).join(' ');
  const rawHandle = card.handle ? card.handle.replace(/^@/, '').trim() : '';
  const showTopHandle =
    Boolean(rawHandle) &&
    rawHandle.toLowerCase() !== displayName.toLowerCase().replace(/[^a-z0-9_]/g, '');
  const formattedHandle = showTopHandle ? `@${rawHandle}` : null;

  // Motion values updated without React re-renders
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);

  const springConfig = { stiffness: 210, damping: 24, mass: 0.8 };
  const smoothX = useSpring(pointerX, springConfig);
  const smoothY = useSpring(pointerY, springConfig);

  // Target: max +/-6deg rotation, max 4px translation, subtle layer parallax (0-2px)
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [6, -6]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-6, 6]);
  const translateX = useTransform(smoothX, [-0.5, 0.5], [-4, 4]);
  const translateY = useTransform(smoothY, [-0.5, 0.5], [-4, 4]);
  const engravingX = useTransform(smoothX, [-0.5, 0.5], [-1, 1]);
  const engravingY = useTransform(smoothY, [-0.5, 0.5], [-1, 1]);
  const finishX = useTransform(smoothX, [-0.5, 0.5], [-1.8, 1.8]);
  const finishY = useTransform(smoothY, [-0.5, 0.5], [-1.8, 1.8]);
  const contentX = useTransform(smoothX, [-0.5, 0.5], [0.8, -0.8]);
  const contentY = useTransform(smoothY, [-0.5, 0.5], [0.8, -0.8]);

  const updateLightingVars = (nx: number, ny: number, active: boolean) => {
    const el = surfaceRef.current;
    if (!el) return;
    const px = ((nx + 0.5) * 100).toFixed(2);
    const py = ((ny + 0.5) * 100).toFixed(2);
    const angle = Math.round(135 + nx * 38 - ny * 26);
    const [minOp, maxOp] = material.reflectionRange;
    const dist = Math.min(1, Math.hypot(nx, ny) * 1.4);
    const intensity = active ? minOp + (maxOp - minOp) * (0.45 + dist * 0.55) : 0;

    el.style.setProperty('--pointer-x', `${px}%`);
    el.style.setProperty('--pointer-y', `${py}%`);
    el.style.setProperty('--light-angle', `${angle}deg`);
    el.style.setProperty('--reflection-opacity', intensity.toFixed(3));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isInteractive || !wrapperRef.current) return;
    // On touch devices, only respond to deliberate drag when not scrolling
    if (e.pointerType === 'touch' && e.buttons === 0) return;

    const rect = wrapperRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const nx = Math.max(-0.5, Math.min(0.5, (e.clientX - rect.left) / rect.width - 0.5));
    const ny = Math.max(-0.5, Math.min(0.5, (e.clientY - rect.top) / rect.height - 0.5));

    pointerX.set(nx);
    pointerY.set(ny);
    updateLightingVars(nx, ny, true);
  };

  const handlePointerReset = () => {
    pointerX.set(0);
    pointerY.set(0);
    updateLightingVars(0, 0, false);
  };

  const shouldAnimateReveal = reveal && !prefersReducedMotion;

  return (
    <div
      ref={wrapperRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerReset}
      onPointerCancel={handlePointerReset}
      style={{ perspective: 1000 }}
      className={cn(
        'relative w-full select-none',
        isInteractive ? 'touch-pan-y' : '',
        className
      )}
    >
      <motion.div
        ref={surfaceRef}
        aria-label={`${material.name} for ${displayName}${card.score !== undefined ? `, Harmony Index ${card.score} out of 100` : ''}`}
        initial={
          shouldAnimateReveal
            ? { opacity: 0, scale: 0.95, rotateX: 8 }
            : false
        }
        animate={
          shouldAnimateReveal
            ? { opacity: 1, scale: 1, rotateX: 0 }
            : undefined
        }
        transition={
          shouldAnimateReveal
            ? { duration: 0.42, ease: [0.22, 1, 0.36, 1] }
            : undefined
        }
        whileHover={isInteractive ? { scale: 1.015 } : undefined}
        style={
          {
            '--pointer-x': '50%',
            '--pointer-y': '50%',
            '--light-angle': '135deg',
            '--reflection-opacity': '0',
            transformStyle: 'preserve-3d',
            rotateX: isInteractive ? rotateX : 0,
            rotateY: isInteractive ? rotateY : 0,
            x: isInteractive ? translateX : 0,
            y: isInteractive ? translateY : 0,
            background: material.backgroundImageUrl
              ? `url(${material.backgroundImageUrl}) center / cover no-repeat, ${material.baseGradient}`
              : material.baseGradient,
            color: material.typography,
            border: `1px solid ${material.borderColor}`,
            boxShadow: isExport
              ? 'none'
              : `${material.restingShadow}, ${material.insetBevel}`,
          } as React.CSSProperties
        }
        className={cn(
          'relative w-full aspect-[856/540] rounded-[4.5%] p-[6%] flex flex-col justify-between overflow-hidden',
          'transition-[background,border-color,box-shadow,color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
          isLockedPreview ? 'opacity-85 saturate-[0.85]' : ''
        )}
      >
        {/* Layer 2: Ambient Material Lighting */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: material.ambientLighting }}
        />

        {/* Layer 3: Deterministic Procedural Contour Engraving (0-1px parallax) */}
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={isInteractive ? { x: engravingX, y: engravingY } : undefined}
        >
          <ProceduralEngraving
            pattern={engravingPattern}
            material={material}
            compact={isCompact}
          />
        </motion.div>

        {/* Layer 4: Static Micrograin Texture (2-4% opacity) */}
        {!isCompact && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.03] mix-blend-overlay"
            style={{ backgroundImage: MICROGRAIN_DATA_URI, backgroundRepeat: 'repeat' }}
          />
        )}

        {/* Layer 5: Tier Material Finish (0-2px parallax) */}
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={
            isInteractive
              ? { background: material.finishOverlay, x: finishX, y: finishY }
              : { background: material.finishOverlay }
          }
        />

        {/* Layer 7: Dynamic Specular Reflection + Reveal Finishing Sweep */}
        {isInteractive && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 transition-opacity duration-300"
            style={{
              opacity: 'var(--reflection-opacity)' as unknown as number,
              background: `radial-gradient(65% 55% at var(--pointer-x) var(--pointer-y), ${material.reflectionTint} 0%, transparent 70%), linear-gradient(var(--light-angle), transparent 30%, ${material.reflectionTint} 50%, transparent 72%)`,
            }}
          />
        )}

        {card.tier === 'BLACK' && !isExport && !prefersReducedMotion && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background:
                'linear-gradient(115deg, transparent 42%, rgba(235, 220, 213, 0.08) 50%, transparent 58%)',
              backgroundSize: '200% 100%',
              animation: 'sheen 6s ease-in-out infinite',
            }}
          />
        )}

        {shouldAnimateReveal && (
          <motion.div
            aria-hidden="true"
            initial={{ x: '-110%', opacity: 0.45 }}
            animate={{ x: '120%', opacity: 0 }}
            transition={{ duration: 0.65, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none absolute inset-0"
            style={{
              background: `linear-gradient(112deg, transparent 35%, ${material.edgeHighlight} 50%, transparent 65%)`,
            }}
          />
        )}

        {/* Layer 8 & 9: Subtle Edge Highlight */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[4.5%]"
          style={{
            boxShadow: `inset 0 1px 0 ${material.edgeHighlight}`,
            opacity: 0.45,
          }}
        />

        {/* Layer 6: Card Content (Typography & Identifiers) */}
        <motion.div
          initial={shouldAnimateReveal ? { opacity: 0, y: 6 } : false}
          animate={shouldAnimateReveal ? { opacity: 1, y: 0 } : undefined}
          transition={
            shouldAnimateReveal
              ? { duration: 0.28, delay: 0.18, ease: [0.22, 1, 0.36, 1] }
              : undefined
          }
          style={isInteractive ? { x: contentX, y: contentY } : undefined}
          className="relative z-10 flex h-full flex-col justify-between"
        >
          {/* Top Row: Wordmark, Identifier & Tier Designation */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2.5 min-w-0">
              <span className="font-sans text-[15px] sm:text-[17px] font-bold tracking-[-0.03em] lowercase leading-none">
                facecard.
              </span>
              {!isCompact && formattedHandle && (
                <span
                  style={{ color: material.mutedTypography }}
                  className="font-sans text-[10px] sm:text-[11px] font-medium tracking-[0.02em] truncate"
                >
                  {formattedHandle}
                </span>
              )}
            </div>

            <div
              style={{
                background: material.badgeBg,
                border: `1px solid ${material.badgeBorder}`,
                color: material.badgeText,
              }}
              className="inline-flex items-center px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[8.5px] sm:text-[9.5px] font-medium tracking-[0.14em] uppercase shrink-0"
            >
              <span>{isLockedPreview ? `${material.name} · Preview` : material.name}</span>
            </div>
          </div>

          {/* Bottom Row: Cardholder, Title, Streak & Principal Score */}
          <div className="flex items-end justify-between gap-3">
            <div className="flex flex-col min-w-0">
              {(card.title || !isCompact) && (
                <span
                  style={{ color: material.mutedTypography }}
                  className="text-[8.5px] sm:text-[9.5px] tracking-[0.16em] uppercase font-medium truncate"
                >
                  {card.title || material.finishName}
                </span>
              )}

              <div className="flex items-center gap-2 mt-1 min-w-0">
                {card.avatarUrl &&
                  !card.avatarUrl.includes('%3Ctext') &&
                  !card.avatarUrl.includes('<text') &&
                  !card.avatarUrl.includes('dicebear.com') && (
                    <img
                      src={card.avatarUrl}
                      alt={`${displayName} portrait`}
                      className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover border border-current/25 shrink-0"
                    />
                  )}
                <span className="font-sans text-[19px] sm:text-[22px] md:text-[24px] font-normal tracking-[-0.02em] leading-none truncate">
                  {displayName}
                </span>
              </div>

              {card.streakDays !== undefined && card.streakDays > 0 && !isCompact && (
                <span
                  style={{ color: material.mutedTypography }}
                  className="text-[10px] sm:text-[11px] font-normal mt-1.5 tabular-nums"
                >
                  {card.streakDays} Day Streak
                  {card.multiplier ? ` · ×${card.multiplier.toFixed(1)}` : ''}
                </span>
              )}
            </div>

            {card.score !== undefined && (
              <div className="flex flex-col items-end shrink-0">
                <span
                  style={{ color: material.mutedTypography }}
                  className="text-[8.5px] sm:text-[9.5px] tracking-[0.14em] uppercase font-medium"
                >
                  Harmony Index
                </span>
                <div className="flex items-baseline gap-0.5 mt-0.5 tabular-nums">
                  <span className="text-[26px] sm:text-[32px] font-normal tracking-[-0.04em] leading-none">
                    {card.score}
                  </span>
                  <span
                    style={{ color: material.mutedTypography }}
                    className="text-[10px] sm:text-xs font-normal"
                  >
                    /100
                  </span>
                </div>
                {verdictConfig && !isCompact && (
                  <span
                    style={{
                      background:
                        card.tier === 'BLACK'
                          ? 'rgba(240, 223, 234, 0.14)'
                          : card.tier === 'PLATINUM'
                          ? 'rgba(60, 55, 68, 0.12)'
                          : card.tier === 'GOLD'
                          ? 'rgba(88, 65, 31, 0.72)'
                          : 'rgba(67, 49, 78, 0.68)',
                      color:
                        card.tier === 'BLACK'
                          ? '#F0DFEA'
                          : card.tier === 'PLATINUM'
                          ? '#3C3744'
                          : '#FAF7F4',
                    }}
                    className="mt-1.5 px-2.5 py-0.5 rounded-full text-[8.5px] sm:text-[9.5px] font-medium uppercase tracking-[0.12em]"
                  >
                    {verdictConfig.label}
                  </span>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
