'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, 
  Coins, 
  Lock, 
  ArrowLeft,
  Sparkles,
  Shield,
  Palette,
  Type,
  Award,
  Check,
  Zap,
  Flame,
  CheckCircle2,
  Snowflake
} from 'lucide-react';
import { BottomNav } from '@/components/navigation/BottomNav';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Tier } from '@/types';

const Cannon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
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

interface ShopItemData {
  id: string;
  name: string;
  kind: 'SKIN' | 'TITLE' | 'FRAME' | 'CONSUMABLE';
  categoryLabel: string;
  price: number;
  minTier: Tier;
  description: string;
  owned: boolean;
  equipped: boolean;
  gradient: string;
  icon: React.ComponentType<{ className?: string }>;
}


const getShopItemIcon = (kind: string, id: string) => {
  if (id.includes('freeze')) return Snowflake;
  if (id.includes('boost') || id.includes('surge')) return Zap;
  if (kind === 'CONSUMABLE') return Snowflake;
  if (kind === 'TITLE') return Cannon;
  if (kind === 'SKIN') return Palette;
  if (kind === 'FRAME') return Award;
  return Sparkles;
};

const getShopItemGradient = (kind: string, id: string) => {
  if (id.includes('freeze')) return 'linear-gradient(135deg, #0EA5E9 0%, #38BDF8 50%, #7DD3FC 100%)';
  if (id.includes('gold') || id.includes('weapon')) return 'linear-gradient(135deg, #D4AF37 0%, #F5E6CA 50%, #AA771C 100%)';
  if (id.includes('lavender')) return 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%)';
  if (id.includes('black')) return 'linear-gradient(135deg, #18181B 0%, #27272A 50%, #09090B 100%)';
  if (id.includes('foil') || id.includes('silver')) return 'linear-gradient(135deg, #E2E8F0 0%, #CBD5E1 50%, #94A3B8 100%)';
  if (id.includes('surge') || id.includes('boost')) return 'linear-gradient(135deg, #F43F5E 0%, #FB7185 50%, #FFAE80 100%)';
  return 'linear-gradient(135deg, #7C3AED 0%, #C4B5FD 50%, #FF8A65 100%)';
};

import { useShop } from '@/hooks/useShop';

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
      showToast(`Unlocked ${item.name}!`);
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
    } catch (err: unknown) {
      showToast('Failed to equip item');
    }
  };

  const filteredItems = items.filter((item) => {
    if (activeCategory === 'ALL') return true;
    return item.kind === activeCategory;
  });

  return (
    <div className="relative min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] font-sans antialiased pb-32">
      {/* Subtle Ethereal Ambient Glow Backdrop */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-75 dark:opacity-25"
        style={{
          background: `
            radial-gradient(ellipse at 50% -10%, rgba(244, 114, 182, 0.06) 0%, transparent 55%),
            radial-gradient(ellipse at 85% 35%, rgba(251, 146, 60, 0.05) 0%, transparent 45%),
            radial-gradient(ellipse at 15% 70%, rgba(99, 102, 241, 0.04) 0%, transparent 50%)
          `
        }}
      />

      {/* Floating Feedback Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[#21123B] text-white text-xs font-bold shadow-xl flex items-center gap-2 border border-purple-300/20"
          >
            <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10 max-w-md mx-auto px-5 pt-5 space-y-5">
        
        {/* Top Header Row (Clean Transparent, Centered Title) */}
        <header className="relative flex items-center justify-between h-10 px-1">
          <Link
            href="/home"
            className="w-9 h-9 flex items-center justify-center text-[var(--text-main)] transition-transform active:scale-95"
            title="Back to Feed"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2]" />
          </Link>

          <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none">
            <span className="text-xl font-bold tracking-tight text-[var(--text-main)]">
              shop
            </span>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div
              className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-main)]"
              title="Available Points"
            >
              <Coins className="w-4 h-4 text-[#6366F1]" />
              <span>{balance}</span>
            </div>
          </div>
        </header>


        {/* Category Pill Filters (Active Filter is LILAC!) */}
        <section className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {[
            { id: 'ALL', label: 'All Items' },
            { id: 'SKIN', label: 'Card Skins' },
            { id: 'TITLE', label: 'Titles' },
            { id: 'FRAME', label: 'Foil Frames' },
            { id: 'CONSUMABLE', label: 'Perks' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as CategoryFilter)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
                activeCategory === cat.id
                  ? 'bg-[#DDD6FE] text-[#140826] shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </section>

        {/* 2-Column Product Grid (Matching the Right Screen Mockup 6-Tile Layout) */}
        <section className="grid grid-cols-2 gap-3 pt-1">
          {isLoading && items.length === 0 ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] rounded-[28px] bg-black/5 dark:bg-white/5 animate-pulse" />
            ))
          ) : filteredItems.length === 0 ? (
            <div className="col-span-2 p-8 text-center rounded-[28px] bg-white/60 dark:bg-white/[0.04] border border-dashed border-black/10 dark:border-white/10 space-y-2">
              <ShoppingBag className="w-7 h-7 mx-auto text-[var(--text-muted)] opacity-60" />
              <p className="text-xs font-bold text-[var(--text-main)]">No items available</p>
              <p className="text-[10px] text-[var(--text-muted)]">Check back soon for new skins, titles, and perks.</p>
            </div>
          ) : filteredItems.map((item) => {
              const isTierLocked = TIER_RANK[item.minTier] > TIER_RANK[userTier];
              const Icon = item.icon;

              return (
              <div
                key={item.id}
                className="relative rounded-[28px] bg-white/85 dark:bg-[#140826]/75 backdrop-blur-xl border border-white/95 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-3.5 flex flex-col justify-between overflow-hidden group"
              >
                {/* Visual Preview Container */}
                <div 
                  className="relative w-full aspect-[4/3] rounded-[22px] overflow-hidden p-3 flex flex-col justify-between shadow-inner"
                  style={{ background: item.gradient }}
                >
                  {/* Subtle Sheen Highlight */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/30 pointer-events-none" />

                  {/* Top Badges */}
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md text-[9px] font-bold text-white uppercase border border-white/10">
                      {item.categoryLabel}
                    </span>

                    {item.equipped && (
                      <span className="px-2 py-0.5 rounded-full bg-gradient-to-tr from-[#FF7A50] to-[#FFAE80] text-white text-[9px] font-extrabold shadow-sm">
                        ACTIVE
                      </span>
                    )}
                  </div>

                  {/* Center Decorative Icon */}
                  <div className="relative z-10 flex items-center justify-center my-auto">
                    <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-sm">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  {/* Bottom Tier Requirement */}
                  {item.minTier !== 'CLASSIC' && (
                    <div className="relative z-10 self-start">
                      <span className="text-[9px] font-bold text-white/90 bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-full">
                        {item.minTier} Only
                      </span>
                    </div>
                  )}
                </div>

                {/* Details Row */}
                <div className="pt-3 pb-2 space-y-1">
                  <h3 className="text-xs font-bold text-[var(--text-main)] truncate">
                    {item.name}
                  </h3>
                  <p className="text-[10px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Bottom Floating Action Bar / CTA (Really Dark Purple #140826) */}
                <div className="mt-1 p-1.5 rounded-full bg-[#140826] text-white flex items-center justify-between shadow-[0_6px_20px_rgba(20,8,38,0.35)] border border-purple-400/20">
                  <div className="pl-2.5 text-xs font-black font-mono text-purple-100">
                    {item.price} <span className="text-[9px] text-purple-300 font-sans font-semibold">PTS</span>
                  </div>

                  {isTierLocked ? (
                    <button
                      disabled
                      className="px-3 py-1.5 rounded-full bg-white/15 text-[10px] font-bold text-white/50 flex items-center gap-1 cursor-not-allowed"
                    >
                      <Lock className="w-3 h-3" />
                      <span>{item.minTier}</span>
                    </button>
                  ) : item.owned ? (
                    <button
                      onClick={() => handleEquip(item.id)}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all active:scale-95 ${
                        item.equipped
                          ? 'bg-gradient-to-tr from-[#FF7A50] to-[#FFAE80] text-white shadow-xs'
                          : 'bg-white text-[#140826] hover:bg-purple-50'
                      }`}
                    >
                      {item.equipped ? 'Equipped' : 'Equip'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBuy(item.id)}
                      disabled={balance < item.price}
                      className="px-3.5 py-1.5 rounded-full text-[10px] font-bold bg-white text-[#140826] hover:bg-purple-50 shadow-xs transition-transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Buy
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        {/* Perks Information Banner */}
        <section className="p-4 rounded-[28px] bg-white/85 dark:bg-[#140826]/75 backdrop-blur-xl border border-white/95 dark:border-white/10 shadow-sm space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center text-[var(--text-main)]">
              <Sparkles className="w-4 h-4 text-[#6366F1]" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[var(--text-main)]">
                Collectibles & Cosmetics Policy
              </h3>
              <p className="text-[10px] text-[var(--text-muted)]">
                Scoring is never influenced by purchased cosmetics.
              </p>
            </div>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] leading-relaxed pl-1">
            Points are earned exclusively through daily selfies, streak multipliers, and winning Face-Off duels. No pay-to-win.
          </p>
        </section>

      </main>

      {/* Floating Bottom Nav Dock */}
      <BottomNav />
    </div>
  );
}
