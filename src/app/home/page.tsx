'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  Swords, 
  ShieldCheck, 
  Zap, 
  ArrowRight,
  Award,
  Bell,
  Coins,
  ChevronRight,
  MoreHorizontal,
  Share2,
  X,
  Star,
  User,
  Heart,
  UserPlus
} from 'lucide-react';
import { FaceCard } from '@/components/card/FaceCard';
import { BottomNav } from '@/components/navigation/BottomNav';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { UserAvatar } from '@/components/common/UserAvatar';
import { FaceCardSkeleton } from '@/components/common/Skeleton';
import { Tier, FaceCardData } from '@/types';
import { TIER_CONFIG } from '@/lib/tokens';
import { useCard } from '@/hooks/useCard';
import { useFaceoff } from '@/hooks/useFaceoff';
import { useFriends } from '@/hooks/useFriends';

export default function HomePage() {
  const [isLiked, setIsLiked] = useState(false);
  const { activeCard: backendCard, formula, spendableBalance, lifetimePoints, isLoading: cardLoading } = useCard();
  const { faceoffs, isLoading: duelsLoading } = useFaceoff();
  const { friends, isLoading: friendsLoading } = useFriends();

  const activeCard: FaceCardData | null = backendCard;
  const myDuels = faceoffs.filter((d) => (d as unknown as { isMine?: boolean }).isMine);

  const formulaList = formula && formula.length > 0 ? formula : [
    { name: 'Photo Craft', weight: '30%', score: 94, tip: 'Balanced studio lighting & sharp focal alignment' },
    { name: 'Harmony & Proportion', weight: '25%', score: 88, tip: 'Facial balance & geometric structure' },
    { name: 'Skin Clarity & Glow', weight: '20%', score: 91, tip: 'Natural radiance & even illumination' },
    { name: 'Expression & Eyes', weight: '15%', score: 95, tip: 'Engaged gaze & confident micro-expression' },
    { name: 'Aura & Presence', weight: '10%', score: 98, tip: 'Charismatic framing & distinct silhouette impact' },
  ];

  return (
    <div className="relative min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] font-sans antialiased pb-28">
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

      <main className="relative z-10 max-w-md mx-auto px-5 pt-5 space-y-5">
        
        {/* Top Header Row */}
        <header className="relative flex items-center justify-between h-10 px-1">
          <Link
            href="/profile"
            className="w-9 h-9 flex items-center justify-center text-[var(--text-main)] transition-transform active:scale-95"
            title="Profile & Friends"
          >
            <User className="w-5 h-5 stroke-[2]" />
          </Link>

          <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none">
            <span className="text-xl font-bold tracking-tight text-[var(--text-main)]">
              facecard
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />

            <Link
              href="/shop"
              className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-main)] transition-opacity hover:opacity-80"
              title="Shop & Spendable Balance"
            >
              <Coins className="w-4 h-4 text-[#6366F1]" />
              {cardLoading ? (
                <span className="w-8 h-3.5 rounded bg-neutral-200 dark:bg-white/10 animate-pulse inline-block" />
              ) : (
                <span>{(spendableBalance ?? 0).toLocaleString()}</span>
              )}
            </Link>

            <Link
              href="/scan"
              className="relative w-8 h-8 flex items-center justify-center text-[var(--text-main)] transition-transform active:scale-95"
              title="Notifications"
            >
              <Bell className="w-5 h-5 stroke-[1.9]" />
              <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-[#FF7A50] text-white text-[8px] font-bold flex items-center justify-center">
                {myDuels.length > 0 ? Math.min(myDuels.length, 9) : 1}
              </span>
            </Link>
          </div>
        </header>

        {/* Sub-Header Row: Friends Empty State with Add Friends CTA or Friend Avatars */}
        {friendsLoading ? (
          <div className="w-full h-14 rounded-2xl bg-neutral-200/60 dark:bg-white/[0.05] animate-pulse" />
        ) : friends.length === 0 ? (
          <section className="flex items-center justify-between p-3 rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-black/5 dark:border-white/10 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#EDE9FE] dark:bg-[#6366F1]/20 text-[#140826] dark:text-purple-300 flex items-center justify-center font-bold text-xs shrink-0">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[var(--text-main)] block leading-tight">
                  No Friends Added Yet
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-medium block">
                  Connect with friends to challenge them
                </span>
              </div>
            </div>

            <Link
              href="/friends/add"
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-bold bg-[#EDE9FE] dark:bg-[#6366F1]/20 hover:bg-[#DDD6FE] dark:hover:bg-[#6366F1]/30 text-[#140826] dark:text-purple-200 border border-[#DDD6FE] dark:border-purple-500/30 transition-all active:scale-95 shadow-xs shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Friends</span>
            </Link>
          </section>
        ) : (
          <section className="flex items-center justify-between px-1">
            <div className="flex items-center">
              <div className="flex -space-x-2.5 overflow-hidden">
                {friends.slice(0, 4).map((f) => (
                  <UserAvatar
                    key={f.id}
                    name={f.name}
                    handle={f.handle}
                    src={f.avatar}
                    size="sm"
                    className="ring-2 ring-white dark:ring-[#140826] shadow-xs"
                  />
                ))}
                {friends.length > 4 && (
                  <div className="w-8 h-8 rounded-full bg-[#140826] text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-[#140826] shadow-xs">
                    +{friends.length - 4}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 text-right">
              <div>
                <span className="text-xs font-bold text-[var(--text-main)] block leading-tight">
                  Friends ({friends.length})
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-medium block">
                  {myDuels.length > 0 ? `${myDuels.length} Duels Active` : 'Ready for Duels'}
                </span>
              </div>
              <Link
                href="/friends/add"
                className="w-7 h-7 rounded-full bg-[#EDE9FE] dark:bg-[#6366F1]/20 text-[#140826] dark:text-purple-200 flex items-center justify-center hover:bg-[#DDD6FE] transition-colors"
                title="Add Friends"
              >
                <UserPlus className="w-3.5 h-3.5" />
              </Link>
            </div>
          </section>
        )}

        {/* The Main Featured Facecard Container */}
        <section className="rounded-[32px] p-5 bg-white/85 dark:bg-[#140826]/75 backdrop-blur-2xl border border-white/95 dark:border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.06)] space-y-4">
          {cardLoading ? (
            <div className="space-y-4">
              {/* Card Top Row Skeleton */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-neutral-200/80 dark:bg-white/10 animate-pulse" />
                  <div className="space-y-1">
                    <div className="w-28 h-3.5 rounded bg-neutral-200/80 dark:bg-white/10 animate-pulse" />
                    <div className="w-36 h-2.5 rounded bg-neutral-200/60 dark:bg-white/5 animate-pulse" />
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-neutral-200/60 dark:bg-white/5 animate-pulse" />
              </div>

              {/* Prominent Collectible Card Skeleton */}
              <FaceCardSkeleton />

              {/* Tag Pills Skeleton */}
              <div className="flex items-center gap-1.5 py-0.5">
                <div className="w-20 h-6 rounded-full bg-neutral-200/70 dark:bg-white/10 animate-pulse" />
                <div className="w-24 h-6 rounded-full bg-neutral-200/70 dark:bg-white/10 animate-pulse" />
                <div className="w-24 h-6 rounded-full bg-neutral-200/70 dark:bg-white/10 animate-pulse" />
              </div>

              {/* Action Pill Bar Skeleton */}
              <div className="w-full h-12 rounded-full bg-neutral-200/70 dark:bg-white/10 animate-pulse" />

              {/* Tier Threshold Callout Skeleton */}
              <div className="flex items-center justify-between px-1">
                <div className="w-36 h-3 rounded bg-neutral-200/60 dark:bg-white/5 animate-pulse" />
                <div className="w-24 h-3 rounded bg-neutral-200/60 dark:bg-white/5 animate-pulse" />
              </div>

              {/* Action Buttons Skeleton */}
              <div className="pt-1 space-y-2.5">
                <div className="w-full h-11 rounded-full bg-neutral-200/80 dark:bg-white/10 animate-pulse" />
                <div className="w-full h-10 rounded-full bg-neutral-200/60 dark:bg-white/5 animate-pulse" />
              </div>
            </div>
          ) : !activeCard ? (
            <div className="text-center py-6 px-3 space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#EDE9FE] dark:bg-[#6366F1]/20 flex items-center justify-center text-[#140826] dark:text-purple-200 shadow-sm">
                <Camera className="w-7 h-7" />
              </div>
              <div className="space-y-1.5 max-w-xs mx-auto">
                <h3 className="text-sm font-bold text-[var(--text-main)]">Claim Your Personal Facecard</h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Take a selfie to verify your face in memory, calculate your official lethality score, and claim your card.
                </p>
              </div>
              <Link
                href="/scan"
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-full text-xs font-bold bg-[#140826] hover:bg-[#241040] text-white transition-all active:scale-[0.99] shadow-md"
              >
                <Camera className="w-4 h-4 text-white" />
                <span>Take a Selfie</span>
              </Link>
            </div>
          ) : (
            <>
              {/* Card Top Row: Author & Status */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2.5">
                  <UserAvatar
                    name={activeCard.cardholderName}
                    src={activeCard.avatarUrl}
                    size="md"
                    className="ring-2 ring-[#18181B]/10 dark:ring-white/20"
                  />
                  <div>
                    <span className="text-xs font-bold text-[var(--text-main)] block leading-tight">
                      {activeCard.cardholderName}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] font-medium block">
                      Selfie · Verified • {activeCard.tier} Status
                    </span>
                  </div>
                </div>

                <button 
                  className="w-8 h-8 flex items-center justify-center text-[var(--text-main)] hover:opacity-70 transition-opacity"
                  title="Options"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>

              {/* Prominent Collectible Face Card */}
              <div className="relative space-y-3.5">
                <FaceCard card={activeCard} />

                {/* In-Card Frosted Tag Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  <span className="px-3 py-1 rounded-full bg-black/[0.05] dark:bg-white/10 text-[var(--text-main)] text-[11px] font-bold shrink-0">
                    ★ {activeCard.score} Lethal
                  </span>
                  <span className="px-3 py-1 rounded-full bg-black/[0.05] dark:bg-white/10 text-[var(--text-muted)] text-[11px] font-semibold shrink-0">
                    {activeCard.band}
                  </span>
                  {formulaList[0] && (
                    <span className="px-3 py-1 rounded-full bg-black/[0.05] dark:bg-white/10 text-[var(--text-muted)] text-[11px] font-semibold shrink-0">
                      {formulaList[0].name} {formulaList[0].score}
                    </span>
                  )}
                  {formulaList[4] && (
                    <span className="px-3 py-1 rounded-full bg-black/[0.05] dark:bg-white/10 text-[var(--text-muted)] text-[11px] font-semibold shrink-0">
                      {formulaList[4].name} {formulaList[4].score}
                    </span>
                  )}
                </div>

                {/* Floating Action Pill Bar */}
                <div className="p-2 rounded-full bg-[#140826] text-white shadow-[0_10px_30px_rgba(20,8,38,0.35)] border border-purple-400/25 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white px-3">
                    <Star className="w-3.5 h-3.5 text-white fill-white" />
                    <span>{activeCard.score} Lethality</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href="/faceoff"
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/15 hover:bg-white/20 text-xs font-bold text-white transition-colors"
                      title="Challenge in Arena"
                    >
                      <Swords className="w-3.5 h-3.5 text-white" />
                      <span>Duel</span>
                    </Link>

                    <button
                      onClick={() => setIsLiked(!isLiked)}
                      className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#FF7A50] to-[#FFAE80] text-white flex items-center justify-center shadow-[0_4px_16px_rgba(255,122,80,0.45)] border border-white/20 transition-transform active:scale-95"
                      title="Like / Save Card"
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? 'fill-white' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Tier Threshold Callout */}
              <div className="flex items-center justify-between text-xs px-1 text-[var(--text-muted)]">
                <span className="flex items-center gap-1 font-medium">
                  <Award className="w-3.5 h-3.5 text-[#6366F1]" />
                  {activeCard.tier} Tier • {(lifetimePoints ?? 0).toLocaleString()} lifetime pts
                </span>
                <Link href="/card" className="font-bold text-[#6366F1] dark:text-purple-300 hover:underline">
                  View All Tiers →
                </Link>
              </div>

              {/* Main Action Buttons */}
              <div className="pt-1 space-y-2.5">
                <Link
                  href="/scan"
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-full text-xs font-bold bg-[#140826] hover:bg-[#241040] text-white transition-all active:scale-[0.99] shadow-[0_8px_24px_rgba(20,8,38,0.3)] border border-purple-400/20"
                >
                  <Camera className="w-4 h-4 text-white" />
                  <span>Take a Selfie</span>
                </Link>

                <Link
                  href="/faceoff"
                  className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-full text-xs font-bold border border-[#DDD6FE] dark:border-purple-500/30 bg-[#EDE9FE] dark:bg-[#6366F1]/20 hover:bg-[#DDD6FE] dark:hover:bg-[#6366F1]/30 text-[#140826] dark:text-purple-200 transition-all active:scale-[0.99] shadow-xs"
                >
                  <Swords className="w-4 h-4 text-[#140826] dark:text-purple-200" />
                  <span>Challenge a Friend in Arena</span>
                </Link>
              </div>
            </>
          )}
        </section>

        {/* Sub-Card Row: Arena Teaser */}
        {duelsLoading ? (
          <div className="h-16 rounded-[28px] bg-neutral-200/60 dark:bg-white/[0.05] animate-pulse" />
        ) : (
          <section className="p-4 rounded-[28px] bg-white/85 dark:bg-[#140826]/75 backdrop-blur-xl border border-white/95 dark:border-white/10 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#EDE9FE] dark:bg-[#6366F1]/20 flex items-center justify-center text-[#140826] dark:text-purple-200 shrink-0">
                <Swords className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[var(--text-main)] block leading-tight">
                  Arena Battles
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-medium block">
                  {myDuels.length > 0 ? `${myDuels.length} Active Duels Live` : 'Head-to-head card battles'}
                </span>
              </div>
            </div>

            <Link
              href="/faceoff"
              className="py-1.5 px-3.5 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-xs font-bold text-[var(--text-main)] transition-colors"
            >
              Enter Arena →
            </Link>
          </section>
        )}

        {/* Live Arena Duels Grid */}
        <section className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[var(--text-main)] tracking-tight">
                Arena Duels
              </h2>
              <p className="text-xs text-[var(--text-muted)]">Head-to-head card battles</p>
            </div>
            <Link href="/faceoff" className="text-xs font-bold text-[var(--text-main)] hover:underline flex items-center gap-0.5">
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {duelsLoading ? (
              <>
                <div className="aspect-[3/4] rounded-[28px] bg-neutral-200/60 dark:bg-white/[0.05] animate-pulse" />
                <div className="aspect-[3/4] rounded-[28px] bg-neutral-200/60 dark:bg-white/[0.05] animate-pulse" />
              </>
            ) : myDuels.length === 0 ? (
              <div className="col-span-2 p-6 text-center rounded-[28px] bg-white/70 dark:bg-[#140826]/70 backdrop-blur-xl border border-dashed border-black/10 dark:border-white/10 space-y-3">
                <div className="w-11 h-11 mx-auto rounded-full bg-[#EDE9FE] dark:bg-[#6366F1]/20 flex items-center justify-center text-[#140826] dark:text-purple-200">
                  <Swords className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-[var(--text-main)]">No active duels yet</h3>
                  <p className="text-[11px] text-[var(--text-muted)] max-w-xs mx-auto">
                    Challenge a friend or join an open battle in the Arena to test your card lethality.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <Link
                    href="/faceoff"
                    className="py-2 px-4 rounded-full text-xs font-bold bg-[#140826] hover:bg-[#241040] text-white transition-all active:scale-95 shadow-xs"
                  >
                    Challenge a Friend
                  </Link>
                  <Link
                    href="/friends/add"
                    className="py-2 px-4 rounded-full text-xs font-bold bg-[#EDE9FE] dark:bg-[#6366F1]/20 text-[#140826] dark:text-purple-200 border border-[#DDD6FE] dark:border-purple-500/30 hover:bg-[#DDD6FE] transition-all active:scale-95"
                  >
                    Add Friends
                  </Link>
                </div>
              </div>
            ) : myDuels.map((duel) => (
              <div
                key={duel.id}
                className="relative aspect-[3/4] rounded-[28px] overflow-hidden group bg-white shadow-sm border border-black/[0.04]"
              >
                <img
                  src={duel.image}
                  alt={duel.opponentName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                <div className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold border border-white/20">
                  ★ {duel.score}
                </div>

                <div className="absolute bottom-2.5 inset-x-2.5 p-2.5 rounded-[20px] bg-[#140826]/90 text-white backdrop-blur-xl space-y-1.5 border border-purple-400/25">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold truncate max-w-[90px]">
                      {duel.opponentName}
                    </span>
                    <span className="text-[9px] font-bold text-white/70 bg-white/10 px-1.5 py-0.5 rounded-full">
                      {duel.stake}
                    </span>
                  </div>

                  <Link
                    href="/faceoff"
                    className="w-full py-1.5 rounded-xl bg-white text-[#18181B] text-[11px] font-bold flex items-center justify-center gap-1 transition-transform active:scale-95 shadow-xs"
                  >
                    <Swords className="w-3 h-3 text-[#18181B]" />
                    <span>Duel</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Lethal Formula */}
        <section className="p-5 rounded-[32px] bg-white/85 dark:bg-[#140826]/75 backdrop-blur-2xl border border-white/95 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.04)] space-y-3.5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[var(--text-main)]">
                Lethal Formula
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Objective scoring pipeline. 100% free forever.
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#140826] text-white border border-purple-400/20">
              FREE
            </span>
          </div>

          <div className="space-y-1 pt-1">
            {formulaList.map((item) => (
              <div 
                key={item.name} 
                className="flex items-center justify-between py-3 px-1 border-b border-black/[0.04] dark:border-white/[0.06] last:border-b-0 hover:translate-x-0.5 transition-transform"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[var(--text-main)]">
                      {item.name}
                    </span>
                    <span className="text-[10px] opacity-60 font-semibold">
                      ({item.weight})
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {item.tip}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-sm font-extrabold font-mono text-[var(--text-main)]">
                    {item.score}
                  </span>
                  <span className="text-[10px] opacity-50 block leading-none">/100</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Core Pillars Grid */}
        <section className="grid grid-cols-2 gap-3 pt-1">
          <div className="p-4 rounded-[24px] bg-white/80 dark:bg-[#140826]/75 backdrop-blur-xl border border-white/90 dark:border-white/10 space-y-1.5 shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-black/[0.04] dark:bg-white/10 flex items-center justify-center text-[var(--text-main)]">
              <Zap className="w-4 h-4 fill-current text-[#6366F1]" />
            </div>
            <h3 className="text-xs font-bold text-[var(--text-main)]">Daily Selfie Streaks</h3>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Earn multipliers up to ×2.0 as you build streaks. Protect with freezes.
            </p>
          </div>

          <div className="p-4 rounded-[24px] bg-white/80 dark:bg-[#140826]/75 backdrop-blur-xl border border-white/90 dark:border-white/10 space-y-1.5 shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-black/[0.04] dark:bg-white/10 flex items-center justify-center text-[var(--text-main)]">
              <ShieldCheck className="w-4 h-4 text-[var(--text-main)]" />
            </div>
            <h3 className="text-xs font-bold text-[var(--text-main)]">Zero Image Retention</h3>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Selfies processed in volatile memory only and discarded instantly.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-[#A1A1AA] space-y-2 pt-4 pb-6">
          <p>Lethality scores are designed for entertainment & self-expression. 18+ only.</p>
          <div className="flex items-center justify-center gap-4 text-[11px] font-medium text-[#71717A]">
            <Link href="/privacy" className="hover:underline">Privacy</Link>
            <Link href="/terms" className="hover:underline">Terms</Link>
            <Link href="/audit" className="hover:underline">Calibration</Link>
          </div>
        </footer>
      </main>

      {/* Floating Bottom Nav Dock */}
      <BottomNav />
    </div>
  );
}
