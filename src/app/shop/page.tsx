'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  Coins,
  Lock,
  ArrowLeft,
  Layers,
  Palette,
  Award,
  Zap,
  CheckCircle2,
  Snowflake,
  ArrowRight,
} from 'lucide-react';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { EmptyState } from '@/components/ui/StateViews';
import { PageHeader } from '@/components/ui/PageHeader';
import { FramerTabPanel } from '@/components/ui/MotionPrimitives';
import { Tier } from '@/types';
import { useShop } from '@/hooks/useShop';

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

const getShopItemIcon = (kind: string, id: string) => {
  if (id.includes('freeze')) return Snowflake;
  if (id.includes('boost') || id.includes('surge')) return Zap;
  if (kind === 'CONSUMABLE') return Snowflake;
  if (kind === 'TITLE') return Cannon;
  if (kind === 'SKIN') return Palette;
  if (kind === 'FRAME') return Award;
  return Layers;
};

const getShopItemGradient = (kind: string, id: string) => {
  if (id.includes('freeze')) return 'linear-gradient(135deg, #EAE3E8 0%, #D2B8C9 55%, #96788D 100%)';
  if (id.includes('gold') || id.includes('weapon')) return 'linear-gradient(135deg, #F6ECD6 0%, #E7CFA0 50%, #D4B072 100%)';
  if (id.includes('lavender') || id.includes('mauve')) return 'linear-gradient(135deg, #F2E8EE 0%, #D2B8C9 50%, #96788D 100%)';
  if (id.includes('black')) return 'linear-gradient(145deg, #2D242C 0%, #251E24 55%, #171216 100%)';
  if (id.includes('foil') || id.includes('silver')) return 'linear-gradient(135deg, #FAF7F4 0%, #EBDCD5 50%, #D2B8C9 100%)';
  if (id.includes('surge') || id.includes('boost')) return 'linear-gradient(135deg, #EBDCD5 0%, #D2B8C9 50%, #96788D 100%)';
  return 'linear-gradient(135deg, #EBDCD5 0%, #D2B8C9 60%, #96788D 100%)';
};

type CategoryFilter = 'ALL' | 'SKIN' | 'TITLE' | 'FRAME' | 'CONSUMABLE';

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

  const items = backendItems.map((bi) => ({
    ...bi,
    owned: Boolean(bi.isOwned),
    equipped: Boolean(bi.isEquipped),
    gradient: bi.gradient || getShopItemGradient(bi.kind, bi.id),
    icon: getShopItemIcon(bi.kind, bi.id),
  }));

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
    return item.kind === activeCategory;
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
            { id: 'SKIN', label: 'Card Finishes' },
            { id: 'TITLE', label: 'Titles' },
            { id: 'FRAME', label: 'Frames' },
            { id: 'CONSUMABLE', label: 'Perks' },
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
              const isDarkSwatch = item.id.includes('black');

              return (
                <SurfaceCard
                  key={item.id}
                  variant="default"
                  padding="none"
                  className="p-3.5 flex flex-col justify-between overflow-hidden"
                >
                  <div
                    className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden p-3 flex flex-col justify-between border border-[var(--border-subtle)]"
                    style={{ background: item.gradient }}
                  >
                    <div className="relative z-10 flex items-center justify-between gap-1">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider ${
                          isDarkSwatch
                            ? 'bg-[#FAF7F4]/15 text-[#FAF7F4]'
                            : 'bg-[#251E24]/10 text-[#251E24]'
                        }`}
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
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
                          isDarkSwatch
                            ? 'bg-[#FAF7F4]/15 border-[#FAF7F4]/25 text-[#FAF7F4]'
                            : 'bg-[#FAF7F4]/65 border-[#251E24]/10 text-[#251E24]'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                    </div>

                    {item.minTier !== 'CLASSIC' && (
                      <div className="relative z-10 self-start">
                        <span
                          className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                            isDarkSwatch
                              ? 'bg-[#FAF7F4]/15 text-[#FAF7F4]'
                              : 'bg-[#251E24]/10 text-[#251E24]'
                          }`}
                        >
                          {item.minTier} Only
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 pb-2 space-y-1">
                    <h3 className="text-xs font-semibold text-[var(--text-main)] truncate">{item.name}</h3>
                    <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-1 p-1.5 rounded-full bg-[#251E24] text-[#FAF7F4] flex items-center justify-between">
                    <div className="pl-2.5 text-xs font-bold tabular-nums">
                      {item.price} <span className="text-[9px] text-[#EBDCD5] font-medium">PTS</span>
                    </div>

                    {isTierLocked ? (
                      <button
                        type="button"
                        disabled
                        className="px-3 py-1.5 rounded-full bg-[#FAF7F4]/15 text-[10px] font-semibold text-[#FAF7F4]/60 flex items-center gap-1 cursor-not-allowed"
                      >
                        <Lock className="w-3 h-3" />
                        <span>{item.minTier}</span>
                      </button>
                    ) : item.owned ? (
                      <button
                        type="button"
                        onClick={() => handleEquip(item.id)}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-semibold transition-colors cursor-pointer ${
                          item.equipped
                            ? 'bg-[#D2B8C9] text-[#251E24]'
                            : 'bg-[#FAF7F4] text-[#251E24] hover:bg-[#EBDCD5]'
                        }`}
                      >
                        {item.equipped ? 'Equipped' : 'Equip'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleBuy(item.id)}
                        disabled={balance < item.price}
                        className="px-3.5 py-1.5 rounded-full text-[10px] font-semibold bg-[#FAF7F4] text-[#251E24] hover:bg-[#EBDCD5] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
