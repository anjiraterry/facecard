'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Aperture,
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  Coins,
  Crown,
  Feather,
  Flower2,
  Frame,
  Gem,
  Gift,
  Layers,
  Lock,
  Palette,
  ShoppingBag,
  Snowflake,
  Swords,
  Zap,
} from 'lucide-react';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { EmptyState } from '@/components/ui/StateViews';
import { PageHeader } from '@/components/ui/PageHeader';
import { FramerTabPanel } from '@/components/ui/MotionPrimitives';
import { Tier } from '@/types';
import { useShop } from '@/hooks/useShop';
import { resolveItemAppearance, BOUTIQUE_CATEGORY_PALETTES } from '@/lib/boutique/palette';
import { CollectibleArtwork } from '@/components/boutique/CollectibleArtwork';

const Cannon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <circle cx="8" cy="16" r="4" />
    <circle cx="8" cy="16" r="1.5" />
    <path d="M10 16l8 3" />
    <path d="M8 12l2-1" />
    <path d="M4 11.5l10.5-5.5a1.2 1.2 0 0 1 1.6.6l1 1.8a1.2 1.2 0 0 1-.6 1.6L7 15" />
    <path d="M16 5l3-1.5" />
  </svg>
);

const getShopItemIcon = (kind: string, slugOrId: string, category?: string) => {
  const key = slugOrId.toLowerCase();
  if (key.includes('freeze')) return Snowflake;
  if (key.includes('crown') || key.includes('champagne') || key.includes('golden-hour') || key.includes('icon')) return Crown;
  if (key.includes('rose') || key.includes('bouquet') || key.includes('bloom')) return Flower2;
  if (key.includes('moonstone') || key.includes('pearl') || key.includes('porcelain')) return Gem;
  if (key.includes('muse') || key.includes('title')) return Feather;
  if (key.includes('nameplate') || key.includes('backdrop') || key.includes('frame')) return Frame;
  if (key.includes('studio') || key.includes('portrait')) return Aperture;
  if (key.includes('admiration') || key.includes('ovation') || key.includes('gift') || category === 'GIFTS') return Gift;
  if (key.includes('arena') || key.includes('entrance') || category === 'ARENA') return Swords;
  if (key.includes('boost') || key.includes('surge')) return Zap;
  if (kind === 'SKIN') return Palette;
  if (kind === 'FRAME') return Award;
  if (kind === 'TITLE') return Feather;
  return Layers;
};

const getShopItemPastelBg = (kind: string, slugOrId: string) => {
  const key = slugOrId.toLowerCase();
  if (key.includes('velvet-rose') || key.includes('rose') || key.includes('bouquet')) return '#F2E4EC';
  if (key.includes('porcelain')) return '#F7EFEA';
  if (key.includes('champagne') || key.includes('golden')) return '#F4EAD7';
  if (key.includes('moonstone')) return '#E8E5F0';
  if (key.includes('obsidian') || key.includes('midnight') || key.includes('black')) return '#E5DCE2';
  if (key.includes('editorial') || key.includes('studio-pass')) return '#EDE3E9';
  if (key.includes('freeze')) return '#E6EEF2';
  if (key.includes('pearl') || key.includes('lavender')) return '#F1E6ED';
  if (key.includes('arena') || key.includes('entrance') || key.includes('victory')) return '#EFE5EC';
  if (kind === 'SKIN') return '#F2E8EE';
  return '#F4ECE7';
};

type CategoryFilter = 'ALL' | 'CARDS' | 'PROFILE' | 'GIFTS' | 'PERKS' | 'ARENA';

export default function ShopPage() {
  const {
    items: backendItems,
    spendableBalance: backendBalance,
    tier: backendTier,
    isLoading,
    purchaseItem,
    equipItem,
  } = useShop();

  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const balance = backendBalance ?? 0;
  const userTier: Tier = (backendTier as Tier) || 'GOLD';

  const items = backendItems.map((bi) => {
    const slugKey = bi.slug || bi.id;
    const appearance = resolveItemAppearance(bi);
    return {
      ...bi,
      owned: Boolean(bi.isOwned),
      equipped: Boolean(bi.isEquipped),
      appearance,
      icon: getShopItemIcon(bi.kind, slugKey, bi.category),
    };
  });

  const TIER_RANK: Record<Tier, number> = { CLASSIC: 1, GOLD: 2, PLATINUM: 3, BLACK: 4 };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleBuy = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item || item.owned || balance < item.price) return;

    try {
      await purchaseItem(id);
      showToast(`Unlocked ${item.name}`);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Purchase failed');
    }
  };

  const handleEquip = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item || !item.owned) return;

    try {
      await equipItem(id, item.kind);
      showToast(item.equipped ? `Unequipped ${item.name}` : `Equipped ${item.name}`);
    } catch {
      showToast('Failed to equip item');
    }
  };

  const filteredItems = items.filter((item) => {
    if (activeCategory === 'ALL') return true;
    return item.category === activeCategory;
  });

  return (
    <div className="relative min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] font-sans antialiased pb-32 md:pl-16 lg:pl-52">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[#251E24] text-[#FAF7F4] text-xs font-semibold shadow-[var(--shadow-lg)] flex items-center gap-2 border border-[#EBDCD5]/20"
          >
            <CheckCircle2 className="w-4 h-4 text-[#78B894]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10 max-w-6xl xl:max-w-7xl mx-auto px-5 sm:px-8 pt-5 space-y-5">
        <PageHeader
          title="Boutique"
          backHref="/home"
          backLabel="Back to home"
          points={balance}
          rightSlot={
            <Link
              href="/vanity"
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-[#251E24] text-[#FAF7F4] text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              <span>The Vanity</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
        />

        {/* Skincare Atelier Link */}
        <SurfaceCard variant="warm" padding="sm" className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--accent-brand)] block">
              Skincare Commerce
            </span>
            <p className="text-xs font-semibold text-[var(--text-main)] truncate">
              Atelier Formulations &amp; Routines
            </p>
          </div>
          <Link
            href="/skincare"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--accent-primary)] text-[var(--bg-page)] text-xs font-semibold hover:bg-[var(--accent-primary-hover)] transition-colors shrink-0"
          >
            <span>Explore</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </SurfaceCard>

        {/* Category Filters */}
        <section aria-label="Item categories" className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {[
            { id: 'ALL', label: 'All Editions' },
            { id: 'CARDS', label: 'Card Skins' },
            { id: 'PROFILE', label: 'Profile & Identity' },
            { id: 'GIFTS', label: 'Social Gifts' },
            { id: 'PERKS', label: 'Perks' },
            { id: 'ARENA', label: 'Arena' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id as CategoryFilter)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-[var(--accent-primary)] text-[var(--bg-page)] shadow-[var(--shadow-sm)]'
                  : 'bg-[var(--bg-surface-warm)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </section>

        {/* 2-Column Cosmetic Grid with Smooth Category Transition */}
        <FramerTabPanel tabKey={activeCategory}>
          <section className="grid grid-cols-2 md:grid-cols-3 gap-3.5 pt-1">
          {isLoading && items.length === 0 ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] rounded-[24px] bg-[var(--bg-surface-warm)] animate-pulse" />
            ))
          ) : filteredItems.length === 0 ? (
            <div className="col-span-2 md:col-span-3">
              <EmptyState
                title="No items available"
                description="Check back soon for new card finishes, titles, and ritual perks."
              />
            </div>
          ) : (
            filteredItems.map((item) => {
              const isTierLocked = TIER_RANK[item.minTier] > TIER_RANK[userTier];
              const Icon = item.icon;
              const { palette } = item.appearance;
              const rarity = (item.rarity || 'ESSENTIAL').toUpperCase();

              return (
                <SurfaceCard
                  key={item.id}
                  variant="default"
                  padding="none"
                  className="p-3.5 flex flex-col justify-between overflow-hidden"
                >
                  <div
                    className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden p-3 flex flex-col justify-between"
                    style={{
                      backgroundColor: palette.surface,
                      color: palette.text,
                    }}
                  >
                    {/* Subtle material contour lines */}
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 200 150"
                      className="pointer-events-none absolute inset-0 w-full h-full opacity-30"
                      fill="none"
                    >
                      <path d="M-10 120 Q 70 40, 210 90" stroke={palette.accent} strokeWidth="0.9" strokeOpacity="0.35" />
                      <path d="M-10 140 Q 90 60, 210 115" stroke={palette.accent} strokeWidth="0.7" strokeOpacity="0.2" />
                    </svg>
                    <div className="relative z-10 flex items-center justify-between gap-1">
                      <span
                        className="px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider"
                        style={{
                          backgroundColor: palette.border,
                          color: palette.text,
                        }}
                      >
                        {item.categoryLabel}
                      </span>

                      {item.equipped && (
                        <span className="px-2 py-0.5 rounded-full bg-[#251E24] text-[#FAF7F4] text-[9px] font-semibold">
                          ACTIVE
                        </span>
                      )}
                    </div>

                    <div className="relative z-10 flex items-center justify-center my-auto">
                      <Icon
                        className="w-11 h-11 stroke-[1.65]"
                        style={{ color: palette.text }}
                      />
                    </div>

                    <div className="relative z-10 flex items-center justify-between gap-1">
                      {rarity !== 'ESSENTIAL' ? (
                        <span
                          className="text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider"
                          style={{ backgroundColor: palette.border, color: palette.text }}
                        >
                          {rarity}
                        </span>
                      ) : <span />}
                      {item.minTier !== 'CLASSIC' && (
                        <span
                          className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: palette.border, color: palette.text }}
                        >
                          {item.minTier} Only
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 pb-2 space-y-1">
                    <h3 className="text-xs font-semibold text-[var(--text-main)] truncate">{item.name}</h3>
                    <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-1 p-1.5 rounded-full bg-[#251E24] text-[#FAF7F4] flex items-center justify-between shadow-xs">
                    <div className="pl-2.5 text-xs font-bold tabular-nums text-[#FAF7F4]">
                      {item.price} <span className="text-[9px] text-[#EBDCD5] font-semibold">PTS</span>
                    </div>

                    {isTierLocked ? (
                      <button
                        type="button"
                        disabled
                        className="px-3 py-1.5 rounded-full bg-[#65475D]/50 text-[10px] font-semibold text-[#FAF7F4]/85 flex items-center gap-1 cursor-not-allowed"
                      >
                        <Lock className="w-3 h-3" />
                        <span>{item.minTier}</span>
                      </button>
                    ) : item.owned ? (
                      <button
                        type="button"
                        onClick={() => handleEquip(item.id)}
                        className={`px-3.5 py-1.5 rounded-full text-[10px] font-semibold text-[#FAF7F4] transition-colors cursor-pointer ${
                          item.equipped
                            ? 'bg-[#96788D]'
                            : 'bg-[#65475D] hover:bg-[#7A5770]'
                        }`}
                      >
                        {item.equipped ? 'Equipped' : 'Equip'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleBuy(item.id)}
                        disabled={balance < item.price}
                        className="px-4 py-1.5 rounded-full text-[10px] font-semibold bg-[#65475D] text-[#FAF7F4] hover:bg-[#7A5770] transition-colors disabled:bg-[#65475D]/45 disabled:text-[#FAF7F4]/75 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Redeem
                      </button>
                    )}
                  </div>
                </SurfaceCard>
              );
            })
          )}
          </section>
        </FramerTabPanel>

        <SurfaceCard variant="default" padding="sm" className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--bg-surface-warm)] flex items-center justify-center text-[var(--accent-brand)]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-[var(--text-main)]">Collectibles &amp; Fairness</h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Portrait scoring is never influenced by redeemed cosmetics.
              </p>
            </div>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
            Points are earned exclusively through daily scans, streak multipliers, and friendly or staked Arena matches.
          </p>
        </SurfaceCard>
      </main>
    </div>
  );
}
