'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Coins, Lock, Palette, Sparkles } from 'lucide-react';
import { FaceCard } from './FaceCard';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import type { Tier } from '@/types';

interface ThemeItem {
  themeId: string;
  slug: string;
  name: string;
  description: string;
  collectionName: string;
  minimumTier: Tier;
  acquisition: string;
  pricePoints: number;
  textColor: string;
  mutedTextColor?: string | null;
  accentColor: string;
  material: string;
  paletteFrom: string;
  paletteTo: string;
  backgroundImageUrl?: string | null;
  reflectionIntensity: number;
  maximumTiltDegrees: number;
  engravingOpacity: number;
  grainOpacity: number;
  tierEligible: boolean;
  owned: boolean;
  equipped: boolean;
  canPurchase: boolean;
}

const TIERS: Tier[] = ['CLASSIC', 'GOLD', 'PLATINUM', 'BLACK'];
const COLLECTION_LABELS: Record<Tier, string> = {
  CLASSIC: 'Classic — The Essentials',
  GOLD: 'Gold — The Gilded Edit',
  PLATINUM: 'Platinum — The Atelier Edition',
  BLACK: 'Black — The Private Reserve',
};

export function CardThemeSelector({
  onNotify,
}: {
  onNotify?: (msg: string) => void;
}) {
  const [themes, setThemes] = useState<ThemeItem[]>([]);
  const [actualTier, setActualTier] = useState<Tier>('CLASSIC');
  const [balance, setBalance] = useState(0);
  const [equippedThemeId, setEquippedThemeId] = useState<string>('signature-mauve');
  const [previewTier, setPreviewTier] = useState<Tier>('CLASSIC');
  const [previewTheme, setPreviewTheme] = useState<ThemeItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadThemes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/card/themes');
      if (res.ok) {
        const json = await res.json();
        setThemes(json.themes || []);
        setActualTier(json.actualTier || 'CLASSIC');
        setPreviewTier(json.actualTier || 'CLASSIC');
        setBalance(json.spendableBalance || 0);
        setEquippedThemeId(json.equippedThemeId || 'signature-mauve');
        const eq = (json.themes || []).find((t: ThemeItem) => t.themeId === json.equippedThemeId);
        if (eq) setPreviewTheme(eq);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadThemes();
  }, [loadThemes]);

  const handleEquip = async (theme: ThemeItem) => {
    setBusyId(theme.themeId);
    try {
      const res = await fetch('/api/card/themes/equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeId: theme.themeId }),
      });
      const json = await res.json();
      if (res.ok) {
        onNotify?.(`${theme.name} equipped to your Face Card!`);
        await loadThemes();
      } else {
        onNotify?.(json.error || 'Could not equip theme');
      }
    } finally {
      setBusyId(null);
    }
  };

  const handlePurchase = async (theme: ThemeItem) => {
    setBusyId(theme.themeId);
    try {
      const res = await fetch('/api/card/themes/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeId: theme.themeId }),
      });
      const json = await res.json();
      if (res.ok) {
        onNotify?.(`Purchased ${theme.name}!`);
        await loadThemes();
      } else {
        onNotify?.(json.error || 'Purchase failed');
      }
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <SurfaceCard padding="lg" className="text-center text-xs text-[var(--muted-foreground)]">
        Loading Card Theme collections...
      </SurfaceCard>
    );
  }

  const activePreview =
    previewTheme || themes.find((t) => t.themeId === equippedThemeId) || themes[0];
  const isLockedPreview = Boolean(activePreview && !activePreview.tierEligible);

  return (
    <div className="space-y-6">
      {/* Live Preview Header */}
      <SurfaceCard className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        <div className="max-w-[360px] mx-auto w-full">
          <FaceCard
            variant="preview"
            isLockedPreview={isLockedPreview}
            card={{
              id: 'theme-preview',
              cardNumber: 'FC-SIGNATURE',
              cardholderName: 'Your Face Card',
              handle: 'member',
              tier: actualTier,
              score: 91,
              band: 'LETHAL',
              theme: activePreview ?? undefined,
            }}
          />
          {isLockedPreview && (
            <p className="text-[11px] text-amber-700 dark:text-amber-300 text-center mt-2">
              Preview only — requires {activePreview?.minimumTier} tier. Your equipped card is unchanged.
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-widest font-semibold text-[var(--muted-foreground)]">
              THE VANITY / CARD THEMES
            </span>
            <span className="text-xs font-semibold tabular-nums flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-[var(--primary)]" /> {balance.toLocaleString()} PTS
            </span>
          </div>

          <div>
            <h2 className="text-2xl font-serif font-semibold">{activePreview?.name}</h2>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">{activePreview?.description}</p>
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              Browse collection by tier
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TIERS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setPreviewTier(t)}
                  className={`h-8 px-3 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                    previewTier === t
                      ? 'bg-[#251E24] text-[#FAF7F4]'
                      : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--muted-foreground)]'
                  }`}
                >
                  {t} {t === actualTier ? '(You)' : ''}
                </button>
              ))}
            </div>
          </div>
        </div>
      </SurfaceCard>

      {/* Tier Collection Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-2">
          <Palette className="w-4 h-4 text-[var(--primary)]" />
          {COLLECTION_LABELS[previewTier]}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {themes
            .filter((t) => t.minimumTier === previewTier)
            .map((theme) => {
              const busy = busyId === theme.themeId;
              return (
                <SurfaceCard
                  key={theme.themeId}
                  padding="sm"
                  className={`space-y-3 cursor-pointer transition-all ${
                    activePreview?.themeId === theme.themeId ? 'ring-2 ring-[var(--primary)]' : ''
                  }`}
                >
                  <div
                    onClick={() => setPreviewTheme(theme)}
                    className="h-24 rounded-2xl p-3 flex flex-col justify-between border border-black/10"
                    style={{
                      background: `linear-gradient(135deg, ${theme.paletteFrom} 0%, ${theme.paletteTo} 100%)`,
                      color: theme.textColor,
                    }}
                  >
                    <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider">
                      <span>{theme.material.replace('_', ' ')}</span>
                      {theme.equipped && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {!theme.tierEligible && <Lock className="w-3.5 h-3.5" />}
                    </div>
                    <div className="font-serif font-semibold text-sm">{theme.name}</div>
                  </div>

                  <p className="text-[11px] text-[var(--muted-foreground)] line-clamp-2 min-h-[32px]">
                    {theme.description}
                  </p>

                  {!theme.tierEligible ? (
                    <button
                      type="button"
                      onClick={() => setPreviewTheme(theme)}
                      className="w-full h-8 rounded-full bg-[var(--muted)] text-[11px] font-semibold text-[var(--muted-foreground)] inline-flex items-center justify-center gap-1"
                    >
                      <Lock className="w-3 h-3" /> Unlock at {theme.minimumTier}
                    </button>
                  ) : theme.equipped ? (
                    <div className="w-full h-8 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold inline-flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Equipped
                    </div>
                  ) : theme.owned ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleEquip(theme)}
                      className="w-full h-8 rounded-full bg-[#251E24] text-[#FAF7F4] text-[11px] font-semibold cursor-pointer"
                    >
                      {busy ? 'Equipping...' : 'Equip Theme'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy || !theme.canPurchase}
                      onClick={() => void handlePurchase(theme)}
                      className="w-full h-8 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] text-[11px] font-semibold disabled:opacity-45 inline-flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      {busy ? 'Purchasing...' : `${theme.pricePoints.toLocaleString()} PTS`}
                    </button>
                  )}
                </SurfaceCard>
              );
            })}
        </div>
      </div>
    </div>
  );
}
