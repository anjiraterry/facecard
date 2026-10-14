'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Share2, 
  Flame, 
  Award, 
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  User,
  Snowflake,
  Swords,
  Sparkles,
  Zap,
  Check,
  Download,
  Calendar,
  Camera,
  Lock,
  CheckCircle2
} from 'lucide-react';
import { FaceCard } from '@/components/card/FaceCard';
import { ShareCardModal } from '@/components/card/ShareCardModal';
import { BottomNav } from '@/components/navigation/BottomNav';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { FaceCardData, Tier } from '@/types';
import { useCard } from '@/hooks/useCard';

import { CardTierItem } from '@/services/cardService';

export default function CardPage() {
  const [activeLedgerTab, setActiveLedgerTab] = useState<'FUNDING' | 'SPENDS'>('FUNDING');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(1);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const sliderRef = useRef<HTMLDivElement>(null);
  const cardSlideRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Live backend data from useCard hook
  const {
    activeCard: backendCard,
    tiers: backendTiers,
    spendableBalance: backendSpendable,
    lifetimePoints: backendLifetime,
    nextTierPoints: backendNextTier,
    progressPercent: backendProgress,
    fundingHistory: backendFunding,
    spendsHistory: backendSpends,
    isLoading,
  } = useCard();

  const sliderCards = backendTiers;
  const fundingList = backendFunding;
  const spendsList = backendSpends;

  const spendablePoints = backendSpendable ?? 0;
  const lifetimePoints = backendLifetime ?? 0;
  const nextTierPoints = backendNextTier ?? 5000;
  const progressPercent = backendProgress ?? 0;

  const scrollToSlide = (idx: number) => {
    setSelectedSlideIndex(idx);
    cardSlideRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  };

  const userCard: FaceCardData = backendCard ?? (sliderCards[1]?.card || sliderCards[0]?.card || {
    id: 'user-active-card',
    tier: 'GOLD',
    cardholderName: 'FACE CARD HOLDER',
    title: 'Golden Standard',
    score: 84,
    band: 'DANGEROUS',
    streakDays: 7,
    multiplier: 1.25,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  return (
    <div className="relative min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] font-sans antialiased pb-28">
      {/* Subtle Ethereal Ambient Background */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-75 dark:opacity-25"
        style={{
          background: `
            radial-gradient(ellipse at 50% -5%, rgba(99, 102, 241, 0.06) 0%, transparent 55%),
            radial-gradient(ellipse at 85% 35%, rgba(139, 92, 246, 0.04) 0%, transparent 45%),
            radial-gradient(ellipse at 20% 75%, rgba(56, 189, 248, 0.04) 0%, transparent 50%)
          `
        }}
      />

      {/* Floating Feedback Toast */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[#140826] text-white text-xs font-bold shadow-xl flex items-center gap-2 border border-purple-400/20 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <main className="relative z-10 max-w-md mx-auto px-5 pt-6 space-y-6">
        
        {/* Top Header Row (Centered Title, Transparent, No Background) */}
        <header className="relative flex items-center justify-between h-10 px-1">
          <Link
            href="/"
            className="w-9 h-9 flex items-center justify-center text-[var(--text-main)] transition-transform active:scale-95"
            title="Back to Feed"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2]" />
          </Link>

          <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none">
            <span className="text-xl font-bold tracking-tight text-[var(--text-main)]">
              card
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <Link
              href="/profile"
              className="w-9 h-9 flex items-center justify-center text-[var(--text-main)] transition-transform active:scale-95"
              title="View Profile & Friends"
            >
              <User className="w-5 h-5 stroke-[2]" />
            </Link>
          </div>
        </header>

        {/* Balance Hero & Quick Stats */}
        <section className="grid grid-cols-2 gap-3">
          {/* Spendable Points Card */}
          <div className="p-4 rounded-[24px] bg-white/80 dark:bg-[#140826]/75 backdrop-blur-xl border border-white/90 dark:border-white/10 shadow-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-[#6366F1]" />
                Spendable
              </span>
              <Link href="/shop" className="text-[10px] font-bold text-[#6366F1] dark:text-purple-300 hover:underline">
                Shop →
              </Link>
            </div>
            <div className="text-xl font-extrabold text-[var(--text-main)] tracking-tight">
              {spendablePoints.toLocaleString()} <span className="text-xs font-bold text-[var(--text-muted)]">PTS</span>
            </div>
            <p className="text-[10px] text-[var(--text-muted)]">
              Usable in shop & arena duels
            </p>
          </div>

          {/* Lifetime Points & Multiplier Card */}
          <div className="p-4 rounded-[24px] bg-white/80 dark:bg-[#140826]/75 backdrop-blur-xl border border-white/90 dark:border-white/10 shadow-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-[#FF7A50] fill-[#FF7A50]" />
                Lifetime
              </span>
              <span className="text-[10px] font-bold text-[#FF7A50]">
                ×{userCard.multiplier || 1.25} Boost
              </span>
            </div>
            <div className="text-xl font-extrabold text-[var(--text-main)] tracking-tight">
              {lifetimePoints.toLocaleString()} <span className="text-xs font-bold text-[var(--text-muted)]">PTS</span>
            </div>
            <p className="text-[10px] text-[var(--text-muted)]">
              {userCard.streakDays || 7}-Day Streak Active
            </p>
          </div>
        </section>

        {/* The Collectible Face Card Section: Horizontal Slider */}
        <section className="space-y-3">
          {isLoading && sliderCards.length === 0 ? (
            <div className="w-full aspect-[1.586/1] rounded-[28px] bg-black/5 dark:bg-white/5 animate-pulse flex items-center justify-center">
              <span className="text-xs font-bold text-[var(--text-muted)]">Loading Face Cards...</span>
            </div>
          ) : (
            <>
              {/* Quick Indicator Tabs for the Horizontal Slider */}
              <div className="flex items-center gap-1.5 p-0 overflow-x-auto no-scrollbar">
                {sliderCards.map((tierItem, idx) => {
                  const isSelected = selectedSlideIndex === idx;
                  return (
                    <button
                      key={tierItem.id}
                      onClick={() => scrollToSlide(idx)}
                      className={`flex-1 py-1.5 px-2 text-[11px] font-bold rounded-xl whitespace-nowrap transition-all ${
                        isSelected
                          ? 'bg-[#DDD6FE] text-[#140826] shadow-xs'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-main)] bg-black/[0.03] dark:bg-white/[0.05]'
                      }`}
                    >
                      {tierItem.tier === 'CLASSIC' ? 'Classic' : tierItem.tier === 'GOLD' ? 'Gold ★' : tierItem.tier === 'PLATINUM' ? 'Platinum' : 'Black Card'}
                    </button>
                  );
                })}
              </div>

              {/* Horizontal Slider: Surpassed, Current Active, and In-Progress/Locked with Custom Scrollbar */}
              <div 
                ref={sliderRef}
                className="flex gap-4 overflow-x-auto snap-x snap-mandatory py-2 px-1 custom-scrollbar scroll-smooth"
              >
                {sliderCards.map((item, idx) => {
                  const isCurrentActive = item.status === 'ACTIVE';
                  const isSurpassed = item.status === 'SURPASSED';
                  const isLockedOrProgress = item.status === 'IN_PROGRESS' || item.status === 'LOCKED';
                  const pct = Math.min(100, Math.round((item.prerequisites.pointsCurrent / (item.prerequisites.pointsTarget || 1)) * 100));

              return (
                <div 
                  key={item.id}
                  ref={(el) => { cardSlideRefs.current[idx] = el; }}
                  className="w-[88vw] max-w-[370px] shrink-0 snap-center space-y-3"
                >
                  {/* Slide Top Pill Badge & Status Header */}
                  <div className="flex items-center justify-between px-1">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${item.badgeStyle}`}>
                      {item.statusBadge}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-[var(--text-muted)]">
                      Tier {idx + 1}/4
                    </span>
                  </div>

                  {/* The FaceCard Container with Dimmed/Grayed-Out State for Locked Cards */}
                  <div className="relative">
                    {isCurrentActive && (
                      <div className="p-1 rounded-[30px] ring-2 ring-[#FF7A50]/50 shadow-[0_10px_32px_rgba(255,122,80,0.2)]">
                        <FaceCard card={item.card} interactive={true} />
                      </div>
                    )}

                    {isSurpassed && (
                      <FaceCard card={item.card} interactive={true} />
                    )}

                    {isLockedOrProgress && (
                      <div className={`relative rounded-[28px] overflow-hidden transition-all ${
                        item.status === 'IN_PROGRESS' 
                          ? 'grayscale-[60%] opacity-85 hover:grayscale-[30%] hover:opacity-95' 
                          : 'grayscale-[90%] opacity-60 hover:grayscale-[60%] hover:opacity-85'
                      }`}>
                        <FaceCard card={item.card} interactive={false} />

                        {/* Floating Frosted Lock Pill Overlay */}
                        <div className="absolute inset-0 bg-black/25 dark:bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4">
                          <div className="px-4 py-2 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-white text-xs font-bold flex items-center gap-2 shadow-xl">
                            <Lock className="w-3.5 h-3.5 text-amber-300" />
                            <span>{item.status === 'IN_PROGRESS' ? 'Prerequisites (47% Ready)' : 'Prestige Locked'}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Prerequisites / Status Information Box Beneath Card */}
                  <div className="p-3.5 rounded-[22px] bg-white/80 dark:bg-[#140826]/75 backdrop-blur-xl border border-white/90 dark:border-white/10 shadow-xs space-y-2">
                    {isCurrentActive && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[var(--text-main)] flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span>Current Equiped Tier</span>
                          </span>
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            Active Card
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)]">
                          {item.prerequisites.summary}
                        </p>
                      </div>
                    )}

                    {isSurpassed && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[var(--text-main)] flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-purple-500" />
                            <span>Unlocked & Surpassed</span>
                          </span>
                          <span className="text-[10px] font-bold text-purple-600 dark:text-purple-300">
                            Archived ✓
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)]">
                          {item.prerequisites.summary}
                        </p>
                      </div>
                    )}

                    {isLockedOrProgress && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[var(--text-main)] flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-amber-500" />
                            <span>Prerequisites to Unlock</span>
                          </span>
                          <span className="font-mono text-[10px] font-bold text-[var(--text-muted)]">
                            {pct}% Progress
                          </span>
                        </div>

                        {/* Purple-Lilac-Peach Gradient Progress Bar */}
                        <div className="space-y-1">
                          <div className="w-full h-2 rounded-full bg-black/[0.05] dark:bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ 
                                width: `${pct}%`,
                                background: 'linear-gradient(90deg, #7C3AED 0%, #C4B5FD 50%, #FF8A65 100%)'
                              }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-medium">
                            <span>Points: {item.prerequisites.pointsCurrent.toLocaleString()} / {item.prerequisites.pointsTarget.toLocaleString()} PTS</span>
                            <span>Score {item.prerequisites.scoreTarget}+ & {item.prerequisites.streakTarget}D Streak</span>
                          </div>
                        </div>

                        <p className="text-[10px] text-[var(--text-muted)] italic">
                          {item.prerequisites.summary}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Row: Really Dark Purple "Share Card" & Lilac "Arena" Buttons (Equal Width) */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleShare}
              className="flex-1 py-3.5 px-4 rounded-full bg-[#140826] hover:bg-[#241040] text-white text-xs font-bold transition-all shadow-[0_8px_24px_rgba(20,8,38,0.35)] active:scale-95 border border-purple-500/20 flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4 text-white" />
              <span>Share Card</span>
            </button>

            <Link
              href="/faceoff"
              className="flex-1 py-3.5 px-4 rounded-full bg-[#EDE9FE] dark:bg-[#6366F1]/20 hover:bg-[#DDD6FE] dark:hover:bg-[#6366F1]/30 text-[#140826] dark:text-purple-200 border border-[#DDD6FE] dark:border-purple-500/30 flex items-center justify-center gap-2 text-xs font-bold transition-all active:scale-95 shadow-xs"
              title="Stake Card in Arena"
            >
              <Swords className="w-4 h-4 text-current" />
              <span>Arena</span>
            </Link>
          </div>

          {/* Tier Progression Card (Purple-Lilac-Peach Gradient) */}
          <div className="p-4 rounded-[24px] bg-white/80 dark:bg-[#140826]/75 backdrop-blur-xl border border-white/90 dark:border-white/10 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[var(--text-main)] flex items-center gap-1.5">
                <Award className="w-4 h-4 text-[#6366F1]" />
                <span>Next: {userCard.tier === 'CLASSIC' ? 'Gold' : userCard.tier === 'GOLD' ? 'Platinum' : 'Black Card'} Tier Status</span>
              </span>
              <span className="font-mono font-bold text-[var(--text-muted)]">
                {progressPercent}%
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-black/[0.05] dark:bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ 
                  width: `${progressPercent}%`,
                  background: 'linear-gradient(90deg, #7C3AED 0%, #C4B5FD 50%, #FF8A65 100%)'
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
              <span>{lifetimePoints.toLocaleString()} lifetime pts</span>
              <span>{nextTierPoints.toLocaleString()} pts required</span>
            </div>
          </div>
          </>
          )}
        </section>

        {/* Card Ledgers: Funding History from Selfies | Point Balance Spends */}
        <section className="space-y-3.5">
          {/* Capsule Tab Switcher (Lilac Active Tab) */}
          <div className="flex items-center gap-1.5 p-0">
            <button
              onClick={() => setActiveLedgerTab('FUNDING')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                activeLedgerTab === 'FUNDING'
                  ? 'bg-[#DDD6FE] text-[#140826] shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Funding History ({fundingList.length})
            </button>
            <button
              onClick={() => setActiveLedgerTab('SPENDS')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                activeLedgerTab === 'SPENDS'
                  ? 'bg-[#DDD6FE] text-[#140826] shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Point Spends ({spendsList.length})
            </button>
          </div>

          {/* Ledger Content: Tab 1 - Funding History from Selfies */}
          {activeLedgerTab === 'FUNDING' && (
            <div className="space-y-3">
              <div className="px-1 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-[var(--text-main)]">
                    Selfie Funding Ledger
                  </h3>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    Points credited directly from verified selfies
                  </p>
                </div>
                <Link
                  href="/scan"
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#140826] text-white hover:bg-[#241040] flex items-center gap-1 transition-all border border-purple-400/20"
                >
                  <Camera className="w-3 h-3" />
                  <span>New Selfie</span>
                </Link>
              </div>

              <div className="space-y-2.5">
                {fundingList.length === 0 ? (
                  <div className="p-8 text-center rounded-[22px] bg-white/50 dark:bg-white/[0.04] border border-dashed border-black/10 dark:border-white/10 space-y-2">
                    <Camera className="w-7 h-7 mx-auto text-[var(--text-muted)] opacity-60" />
                    <p className="text-xs font-bold text-[var(--text-main)]">No selfie funding events yet</p>
                    <p className="text-[10px] text-[var(--text-muted)]">Take your daily selfie to earn points and level up your card.</p>
                  </div>
                ) : (
                  fundingList.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-[22px] bg-white/80 dark:bg-[#140826]/75 backdrop-blur-xl border border-white/90 dark:border-white/10 shadow-xs flex items-center justify-between gap-3 hover:bg-white dark:hover:bg-[#140826]/90 transition-all"
                    >
                      {/* Selfie Thumbnail & Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative w-12 h-14 rounded-[14px] overflow-hidden shrink-0 ring-1 ring-black/10 dark:ring-white/10 shadow-2xs">
                          <img
                            src={item.thumbnail}
                            alt={`Selfie #${item.scanNumber}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-1 left-1 px-1 py-0.2 rounded-md bg-black/60 backdrop-blur-xs text-white text-[8px] font-bold">
                            #{item.scanNumber}
                          </div>
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-[var(--text-main)] truncate">
                              Selfie #{item.scanNumber}
                            </span>
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                              ★ {item.score}
                            </span>
                          </div>
                          <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
                            {item.breakdown}
                          </p>
                          <span className="text-[9px] text-[var(--text-muted)] font-medium block mt-0.5">
                            {item.date}
                          </span>
                        </div>
                      </div>

                      {/* Credit Amount Badge */}
                      <div className="text-right shrink-0">
                        <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-0.5">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          +{item.pointsEarned} PTS
                        </span>
                        <span className="text-[9px] font-semibold text-[var(--text-muted)] block mt-0.5">
                          Funded ✓
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Ledger Content: Tab 2 - Point Balance Spends */}
          {activeLedgerTab === 'SPENDS' && (
            <div className="space-y-3">
              <div className="px-1">
                <h3 className="text-xs font-bold text-[var(--text-main)]">
                  Point Balance Expenditures
                </h3>
                <p className="text-[10px] text-[var(--text-muted)]">
                  Debits from perks, shop cosmetics & staked arena duels
                </p>
              </div>

              <div className="space-y-2.5">
                {spendsList.length === 0 ? (
                  <div className="p-8 text-center rounded-[22px] bg-white/50 dark:bg-white/[0.04] border border-dashed border-black/10 dark:border-white/10 space-y-2">
                    <Coins className="w-7 h-7 mx-auto text-[var(--text-muted)] opacity-60" />
                    <p className="text-xs font-bold text-[var(--text-main)]">No expenditures yet</p>
                    <p className="text-[10px] text-[var(--text-muted)]">Spend points in the shop for perks, card cosmetics, and arena stakes.</p>
                  </div>
                ) : (
                  spendsList.map((spend) => {
                    const Icon = spend.category.includes('Perk') ? Snowflake : spend.category.includes('Cosmetic') ? Sparkles : Swords;
                    return (
                      <div
                        key={spend.id}
                        className="p-3.5 rounded-[22px] bg-white/80 dark:bg-[#140826]/75 backdrop-blur-xl border border-white/90 dark:border-white/10 shadow-xs flex items-center justify-between gap-3 hover:bg-white dark:hover:bg-[#140826]/90 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${spend.iconBg} shadow-2xs`}>
                            <Icon className="w-4 h-4" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-[var(--text-main)] truncate">
                                {spend.title}
                              </span>
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-black/[0.04] dark:bg-white/10 text-[var(--text-muted)]">
                                {spend.category}
                              </span>
                            </div>
                            <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
                              {spend.note}
                            </p>
                            <span className="text-[9px] text-[var(--text-muted)] font-medium block mt-0.5">
                              {spend.date}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-extrabold text-[#E11D48] flex items-center justify-end gap-0.5">
                            <ArrowDownRight className="w-3.5 h-3.5" />
                            -{spend.pointsSpent} PTS
                          </span>
                          <span className="text-[9px] font-semibold text-[var(--text-muted)] block mt-0.5">
                            {spend.status}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </section>

      </main>

      <ShareCardModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        card={userCard}
      />

      <BottomNav />
    </div>
  );
}
