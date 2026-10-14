'use client';

import React from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Sparkles, Flame } from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { FaceCardData } from '@/types';
import { VERDICT_BANDS } from '@/lib/tokens';
import { cn } from '@/lib/utils';

interface FaceCardProps {
  card: FaceCardData;
  className?: string;
  interactive?: boolean;
}

export function FaceCard({ card, className, interactive = true }: FaceCardProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const verdictConfig = card.band ? VERDICT_BANDS[card.band] : null;

  // Authentic Glassmorphic styling per tier (Classic is Lilac, All Tiers High-Contrast & Prominent)
  const LIGHT_GLASS_STYLES: Record<string, {
    background: string;
    border: string;
    boxShadow: string;
    sheen: string;
    textColor: string;
    badgeBg: string;
    badgeText: string;
    name: string;
  }> = {
    CLASSIC: {
      name: 'Classic',
      background: 'linear-gradient(135deg, #EBE5FC 0%, #DFD5FA 50%, #D4C5F9 100%)',
      border: '1px solid rgba(255, 255, 255, 0.45)',
      boxShadow: '0 12px 32px rgba(139, 92, 246, 0.08), 0 2px 6px rgba(0, 0, 0, 0.02), inset 0 1px 1px rgba(255, 255, 255, 0.6)',
      sheen: 'linear-gradient(135deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.15) 35%, transparent 70%)',
      textColor: '#140826',
      badgeBg: 'rgba(139, 92, 246, 0.12)',
      badgeText: '#140826',
    },
    GOLD: {
      name: 'Gold',
      background: 'linear-gradient(135deg, #F8E7BE 0%, #EED192 50%, #E4BE6B 100%)',
      border: '1px solid rgba(255, 255, 255, 0.45)',
      boxShadow: '0 12px 32px rgba(180, 120, 20, 0.09), 0 2px 6px rgba(0, 0, 0, 0.02), inset 0 1px 1px rgba(255, 255, 255, 0.6)',
      sheen: 'linear-gradient(135deg, rgba(255, 255, 255, 0.65) 0%, rgba(255, 255, 255, 0.15) 35%, transparent 70%)',
      textColor: '#422006',
      badgeBg: 'rgba(161, 98, 7, 0.12)',
      badgeText: '#78350F',
    },
    PLATINUM: {
      name: 'Platinum',
      background: 'linear-gradient(135deg, #E0E7FF 0%, #C7D2FE 50%, #A5B4FC 100%)',
      border: '1px solid rgba(255, 255, 255, 0.45)',
      boxShadow: '0 12px 32px rgba(99, 102, 241, 0.09), 0 2px 6px rgba(0, 0, 0, 0.02), inset 0 1px 1px rgba(255, 255, 255, 0.6)',
      sheen: 'linear-gradient(135deg, rgba(255, 255, 255, 0.65) 0%, rgba(255, 255, 255, 0.15) 35%, transparent 70%)',
      textColor: '#1E1B4B',
      badgeBg: 'rgba(79, 70, 229, 0.12)',
      badgeText: '#312E81',
    },
    BLACK: {
      name: 'Black Card',
      background: 'linear-gradient(135deg, #1C1C20 0%, #111114 50%, #050507 100%)',
      border: '1px solid rgba(255, 255, 255, 0.06)',
      boxShadow: '0 16px 40px rgba(0, 0, 0, 0.35), 0 4px 12px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
      sheen: 'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.04) 40%, transparent 80%)',
      textColor: '#FFFFFF',
      badgeBg: 'rgba(255, 255, 255, 0.12)',
      badgeText: '#FFFFFF',
    },
  };

  // High-End Obsidian & Metallic Dark Mode styles
  const DARK_GLASS_STYLES: Record<string, {
    background: string;
    border: string;
    boxShadow: string;
    sheen: string;
    textColor: string;
    badgeBg: string;
    badgeText: string;
    name: string;
  }> = {
    CLASSIC: {
      name: 'Classic',
      background: 'linear-gradient(135deg, #2A1744 0%, #1B0B30 50%, #100520 100%)',
      border: '1px solid rgba(196, 181, 253, 0.25)',
      boxShadow: '0 16px 40px rgba(20, 8, 38, 0.6), 0 2px 8px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
      sheen: 'linear-gradient(135deg, rgba(221, 214, 254, 0.35) 0%, rgba(221, 214, 254, 0.08) 35%, transparent 70%)',
      textColor: '#EDE9FE',
      badgeBg: 'rgba(196, 181, 253, 0.18)',
      badgeText: '#DDD6FE',
    },
    GOLD: {
      name: 'Gold',
      background: 'linear-gradient(135deg, #3A2B0E 0%, #251B06 50%, #171003 100%)',
      border: '1px solid rgba(253, 224, 71, 0.3)',
      boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
      sheen: 'linear-gradient(135deg, rgba(254, 240, 138, 0.35) 0%, rgba(254, 240, 138, 0.08) 35%, transparent 70%)',
      textColor: '#FEF08A',
      badgeBg: 'rgba(234, 179, 8, 0.2)',
      badgeText: '#FDE047',
    },
    PLATINUM: {
      name: 'Platinum',
      background: 'linear-gradient(135deg, #1C223A 0%, #101426 50%, #090C18 100%)',
      border: '1px solid rgba(165, 180, 252, 0.3)',
      boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
      sheen: 'linear-gradient(135deg, rgba(199, 210, 254, 0.35) 0%, rgba(199, 210, 254, 0.08) 35%, transparent 70%)',
      textColor: '#E0E7FF',
      badgeBg: 'rgba(99, 102, 241, 0.2)',
      badgeText: '#C7D2FE',
    },
    BLACK: {
      name: 'Black Card',
      background: 'linear-gradient(135deg, #141419 0%, #0A0A0E 50%, #030305 100%)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      boxShadow: '0 18px 48px rgba(0, 0, 0, 0.7), inset 0 1px 1px rgba(255, 255, 255, 0.2)',
      sheen: 'linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.05) 40%, transparent 80%)',
      textColor: '#FFFFFF',
      badgeBg: 'rgba(255, 255, 255, 0.15)',
      badgeText: '#FFFFFF',
    },
  };

  const currentStyles = isDark ? DARK_GLASS_STYLES : LIGHT_GLASS_STYLES;
  const style = currentStyles[card.tier] || currentStyles.GOLD;

  // Custom equipped skin override
  let cardBg = style.background;
  if (card.skinId) {
    if (card.skinId.includes('lavender')) {
      cardBg = isDark
        ? 'linear-gradient(135deg, #3B166E 0%, #240C46 50%, #140529 100%)'
        : 'linear-gradient(135deg, #DDD6FE 0%, #C4B5FD 50%, #A78BFA 100%)';
    } else if (card.skinId.includes('black')) {
      cardBg = 'linear-gradient(135deg, #1C1C20 0%, #111114 50%, #050507 100%)';
    }
  }

  // Custom equipped frame override
  let cardBorder = style.border;
  let cardShadow = style.boxShadow;
  if (card.frameId) {
    if (card.frameId.includes('solar') || card.frameId.includes('flare')) {
      cardBorder = '2px solid rgba(251, 146, 60, 0.75)';
      cardShadow = `0 0 25px rgba(251, 146, 60, 0.35), ${style.boxShadow}`;
    }
  }

  // 3D Tilt motion values
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseX = useSpring(x, { stiffness: 200, damping: 20 });
  const mouseY = useSpring(y, { stiffness: 200, damping: 20 });
  const rotateX = useTransform(mouseY, [-0.5, 0.5], [10, -10]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-10, 10]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseXPos = (e.clientX - rect.left) / width - 0.5;
    const mouseYPos = (e.clientY - rect.top) / height - 0.5;
    x.set(mouseXPos);
    y.set(mouseYPos);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <div style={{ perspective: 1000 }} className="w-full">
      <motion.div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        whileHover={interactive ? { scale: 1.02 } : undefined}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        style={{
          background: cardBg,
          color: style.textColor,
          boxShadow: cardShadow,
          border: cardBorder,
          rotateX: interactive ? rotateX : 0,
          rotateY: interactive ? rotateY : 0,
          transformStyle: 'preserve-3d',
        }}
        className={cn(
          'relative w-full aspect-[1.586/1] rounded-[20px] sm:rounded-[24px] p-4 sm:p-5 md:p-6 overflow-hidden flex flex-col justify-between select-none backdrop-blur-2xl transition-all',
          className
        )}
      >
        {/* Specular Diagonal Frosted Glass Sheen Highlight */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: style.sheen,
          }}
        />

        {/* Subtle Geometric Card Watermark in Background */}
        <div className="absolute -right-8 -bottom-8 w-48 h-48 rounded-full opacity-[0.04] pointer-events-none border-[18px] border-current" />
        <div className="absolute right-10 bottom-10 w-28 h-28 rounded-full opacity-[0.03] pointer-events-none border-[8px] border-current" />

        {/* Black Card Sweeping Silver Sheen Beam Animation */}
        {card.tier === 'BLACK' && (
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(115deg, transparent 40%, rgba(255, 255, 255, 0.25) 50%, transparent 60%)',
              backgroundSize: '200% 100%',
              animation: 'sheen 6s ease-in-out infinite',
            }}
          />
        )}

        {/* Top Row: App Brand Name (left) & Tier Badge Pill (right) */}
        <div className="relative z-10 flex items-center justify-between">
          <span className="text-[11px] sm:text-[13px] font-black tracking-widest uppercase leading-none opacity-90">
            FACECARD
          </span>

          {/* Tier Badge Pill */}
          <div
            style={{ 
              background: style.badgeBg,
              color: style.badgeText,
            }}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold tracking-wider uppercase backdrop-blur-md border border-black/5 dark:border-white/10 shadow-sm"
          >
            {card.tier === 'BLACK' && <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />}
            <span>{style.name}</span>
          </div>
        </div>

        {/* Middle Area: Metallic EMV Chip & Contactless Indicator */}
        <div className="relative z-10 my-1 sm:my-auto flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Authentic Metallic EMV Smart Chip */}
            <div className="relative w-9 h-6 sm:w-11 sm:h-8 rounded-[4px] sm:rounded-[5px] overflow-hidden border border-black/15 dark:border-white/20 shadow-inner flex items-center justify-center shrink-0"
              style={{
                background: card.tier === 'GOLD' 
                  ? 'linear-gradient(135deg, #F0C45C 0%, #FDE08E 45%, #D4A030 100%)' 
                  : 'linear-gradient(135deg, #D6DCE7 0%, #F1F4F9 45%, #B8C2D3 100%)'
              }}
            >
              {/* Microcircuit contact dividing lines */}
              <div className="absolute inset-x-0 top-1/2 h-[1px] bg-black/25 dark:bg-black/35" />
              <div className="absolute inset-y-0 left-1/3 w-[1px] bg-black/25 dark:bg-black/35" />
              <div className="absolute inset-y-0 right-1/3 w-[1px] bg-black/25 dark:bg-black/35" />
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border border-black/25 dark:bg-black/10" />
            </div>

            {/* Contactless NFC Waves */}
            <svg 
              className="w-3.5 h-3.5 sm:w-5 sm:h-5 opacity-40 shrink-0" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round"
            >
              <path d="M8.5 6a9 9 0 0 1 0 12" />
              <path d="M12.5 4a13 13 0 0 1 0 16" />
              <path d="M16.5 2a17 17 0 0 1 0 20" />
            </svg>
          </div>

          {/* Tabular Card Identification Number */}
          <span className="font-mono text-[9px] sm:text-[11px] font-semibold tracking-widest opacity-60 tabular-nums">
            {card.cardNumber || 'FC •••• •••• 2026'}
          </span>
        </div>

        {/* Bottom Row: Cardholder, Title, Streak & Score Readout */}
        <div className="relative z-10 flex items-end justify-between gap-2 sm:gap-3">
          <div className="flex flex-col min-w-0">
            {card.title && (
              <span className="text-[9px] sm:text-[11px] tracking-wider uppercase font-extrabold opacity-70 truncate">
                {card.title}
              </span>
            )}
            <span className="text-sm sm:text-base md:text-lg font-black tracking-tight leading-tight mt-0.5 truncate">
              {card.cardholderName}
            </span>
            {card.streakDays !== undefined && card.streakDays > 0 && (
              <span className="text-[9px] sm:text-[11px] font-semibold opacity-80 mt-0.5 sm:mt-1 flex items-center gap-1">
                <Flame className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#FF7A50] fill-[#FF7A50] shrink-0" />
                <span>{card.streakDays} Day Streak</span>
                {card.multiplier && <span>• ×{card.multiplier.toFixed(1)}</span>}
              </span>
            )}
          </div>

          {/* Lethality Score & Verdict Chip */}
          {card.score !== undefined && (
            <div className="flex flex-col items-end shrink-0">
              <span className="text-[9px] sm:text-[10px] tracking-wider uppercase font-bold opacity-70">
                Lethality
              </span>
              <div className="flex items-baseline gap-0.5 sm:gap-1">
                <span className="text-xl sm:text-2xl md:text-3xl font-black tracking-tighter leading-none">
                  {card.score}
                </span>
                <span className="text-[10px] sm:text-xs opacity-65 font-bold">/100</span>
              </div>
              {verdictConfig && (
                <span
                  style={{
                    background: verdictConfig.chipBg,
                    color: verdictConfig.chipText,
                    boxShadow: verdictConfig.glow,
                  }}
                  className="mt-1 px-2 sm:px-2.5 py-0.5 rounded-full text-[8px] sm:text-[10px] font-extrabold uppercase tracking-wider shadow-sm backdrop-blur-md"
                >
                  {verdictConfig.label}
                </span>
              )}
            </div>
          )}
        </div>
    </motion.div>
  </div>
  );
}
