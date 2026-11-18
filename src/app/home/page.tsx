'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Camera,
  Swords,
  Lock,
  Zap,
  Award,
  Bell,
  Coins,
  ChevronRight,
  Star,
  User,
  Heart,
  UserPlus,
  ShoppingBag,
} from 'lucide-react';
import { FaceCard } from '@/components/card/FaceCard';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { UserAvatar } from '@/components/common/UserAvatar';
import { FaceCardSkeleton } from '@/components/common/Skeleton';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { EmptyState } from '@/components/ui/StateViews';
import { GsapStagger } from '@/components/ui/MotionPrimitives';
import { FaceCardData } from '@/types';
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

  const formulaList =
    formula && formula.length > 0
      ? formula
      : [
          { name: 'Photo Craft', weight: '30%', score: 94, tip: 'Balanced studio lighting & sharp focal alignment' },
          { name: 'Harmony & Proportion', weight: '25%', score: 88, tip: 'Facial balance & geometric structure' },
          { name: 'Skin Clarity & Glow', weight: '20%', score: 91, tip: 'Natural radiance & even illumination' },
          { name: 'Expression & Eyes', weight: '15%', score: 95, tip: 'Engaged gaze & confident micro-expression' },
          { name: 'Aura & Presence', weight: '10%', score: 98, tip: 'Charismatic framing & distinct silhouette impact' },
        ];

  return (
    <div className="relative min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] font-sans antialiased pb-28 md:pl-16 lg:pl-52">
      <main className="relative z-10 max-w-6xl xl:max-w-7xl mx-auto px-5 sm:px-8 pt-5 space-y-5">
        <GsapStagger className="space-y-5">
        {/* Top Header */}
        <header className="relative flex items-center justify-between md:justify-end h-10 px-1">
          {/* Mobile Left: Profile + ThemeToggle */}
          <div className="flex items-center gap-1 md:hidden">
            <Link
              href="/profile"
              aria-label="Profile and Friends"
              className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-main)] hover:bg-[var(--bg-surface-warm)] transition-colors"
            >
              <User className="w-5 h-5 stroke-[1.8]" />
            </Link>
            <ThemeToggle />
          </div>

          {/* Mobile Center Wordmark (hidden on desktop where left sidebar shows facecard.) */}
          <div className="md:hidden absolute left-1/2 -translate-x-1/2 pointer-events-none">
            <span className="font-sans text-lg font-extrabold tracking-[-0.03em] lowercase text-[var(--text-main)]">
              facecard
            </span>
          </div>

          {/* Right: Desktop has ThemeToggle + Coins + Bell + Profile; Mobile has Coins + Bell */}
          <div className="flex items-center gap-2">
            <div className="hidden md:flex">
              <ThemeToggle />
            </div>

            <Link
              href="/shop"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--bg-surface)] border border-[var(--border-card)] text-xs font-semibold text-[var(--text-main)] hover:bg-[var(--bg-surface-warm)] transition-colors tabular-nums"
              title="Shop & Spendable Balance"
            >
              <Coins className="w-3.5 h-3.5 text-[var(--accent-brand)]" />
              {cardLoading ? (
                <span className="w-7 h-3 rounded bg-[var(--bg-surface-warm)] animate-pulse inline-block" />
              ) : (
                <span>{(spendableBalance ?? 0).toLocaleString()}</span>
              )}
            </Link>

            <Link
              href="/scan"
              aria-label="Notifications and daily scan"
              className="relative w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-main)] hover:bg-[var(--bg-surface-warm)] transition-colors"
            >
              <Bell className="w-5 h-5 stroke-[1.8]" />
              <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-[var(--accent-primary)] text-[var(--bg-page)] text-[9px] font-bold flex items-center justify-center tabular-nums">
                {myDuels.length > 0 ? Math.min(myDuels.length, 9) : 1}
              </span>
            </Link>

            <Link
              href="/profile"
              aria-label="Profile and Friends"
              className="hidden md:flex w-9 h-9 rounded-full items-center justify-center text-[var(--text-main)] hover:bg-[var(--bg-surface-warm)] transition-colors"
            >
              <User className="w-5 h-5 stroke-[1.8]" />
            </Link>
          </div>
        </header>

        {/* Friends Strip */}
        {friendsLoading ? (
          <div className="w-full h-14 rounded-2xl bg-[var(--bg-surface-warm)] animate-pulse" />
        ) : friends.length === 0 ? (
          <SurfaceCard variant="warm" padding="sm" className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[var(--bg-surface)] border border-[var(--border-card)] text-[var(--text-main)] flex items-center justify-center shrink-0">
                <UserPlus className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-semibold text-[var(--text-main)] block truncate">
                  No Friends Added Yet
                </span>
                <span className="text-[11px] text-[var(--text-muted)] block truncate">
                  Connect with friends to share &amp; duel
                </span>
              </div>
            </div>

            <Link
              href="/friends/add"
              className="flex items-center gap-1.5 py-1.5 px-3.5 rounded-full text-xs font-semibold bg-[var(--bg-surface)] hover:bg-[var(--bg-secondary)] text-[var(--text-main)] border border-[var(--border-card)] transition-colors shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add</span>
            </Link>
          </SurfaceCard>
        ) : (
          <div className="flex items-center justify-between px-1">
            <div className="flex -space-x-2.5 overflow-hidden">
              {friends.slice(0, 4).map((f) => (
                <UserAvatar
                  key={f.id}
                  name={f.name}
                  handle={f.handle}
                  src={f.avatar}
                  size="sm"
                  className="ring-2 ring-[var(--bg-page)]"
                />
              ))}
              {friends.length > 4 && (
                <div className="w-8 h-8 rounded-full bg-[var(--accent-primary)] text-[var(--bg-page)] text-[10px] font-bold flex items-center justify-center ring-2 ring-[var(--bg-page)]">
                  +{friends.length - 4}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5 text-right">
              <div>
                <span className="text-xs font-semibold text-[var(--text-main)] block leading-tight">
                  Circle ({friends.length})
                </span>
                <span className="text-[10px] text-[var(--text-muted)] block">
                  {myDuels.length > 0 ? `${myDuels.length} Active Duels` : 'Ready for Duels'}
                </span>
              </div>
              <Link
                href="/friends/add"
                aria-label="Add friends"
                className="w-8 h-8 rounded-full bg-[var(--bg-surface-warm)] border border-[var(--border-card)] text-[var(--text-main)] flex items-center justify-center hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* Featured Face Card */}
        <SurfaceCard variant="default" padding="md" className="space-y-4">
          {cardLoading ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-[var(--bg-surface-warm)] animate-pulse" />
                  <div className="space-y-1">
                    <div className="w-28 h-3.5 rounded bg-[var(--bg-surface-warm)] animate-pulse" />
                    <div className="w-36 h-2.5 rounded bg-[var(--bg-surface-warm)] animate-pulse" />
                  </div>
                </div>
              </div>
              <FaceCardSkeleton />
            </div>
          ) : !activeCard ? (
            <div className="text-center py-6 px-3 space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-[var(--bg-surface-warm)] border border-[var(--border-card)] flex items-center justify-center text-[var(--accent-brand)]">
                <Camera className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 max-w-xs mx-auto">
                <h2 className="font-display text-2xl font-semibold text-[var(--text-main)]">
                  Claim Your Face Card
                </h2>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Take a portrait scan in ephemeral memory to calibrate your harmony index and unlock your card.
                </p>
              </div>
              <Link
                href="/scan"
                className="w-full flex items-center justify-center h-12 px-6 rounded-full text-xs font-semibold bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--bg-page)] transition-all shadow-[var(--shadow-sm)]"
              >
                Start Portrait Scan
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2.5">
                  <UserAvatar
                    name={activeCard.cardholderName}
                    src={activeCard.avatarUrl}
                    size="md"
                    className="ring-1 ring-[var(--border-card)]"
                  />
                  <div>
                    <span className="text-xs font-semibold text-[var(--text-main)] block leading-tight">
                      {activeCard.cardholderName}
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)] block">
                      Verified Portrait · {activeCard.tier} Edition
                    </span>
                  </div>
                </div>

                <Link
                  href="/card"
                  className="text-xs font-semibold text-[var(--accent-brand)] hover:text-[var(--text-main)] transition-colors"
                >
                  Details →
                </Link>
              </div>

              <div className="relative space-y-3.5">
                <FaceCard card={activeCard} />

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  <span className="px-3 py-1 rounded-full bg-[var(--bg-surface-warm)] text-[var(--text-main)] text-[11px] font-semibold shrink-0 tabular-nums">
                    Index {activeCard.score}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[var(--bg-surface-warm)] text-[var(--text-muted)] text-[11px] font-medium shrink-0">
                    {activeCard.band}
                  </span>
                  {formulaList[0] && (
                    <span className="px-3 py-1 rounded-full bg-[var(--bg-surface-warm)] text-[var(--text-muted)] text-[11px] font-medium shrink-0 tabular-nums">
                      {formulaList[0].name} {formulaList[0].score}
                    </span>
                  )}
                  {formulaList[2] && (
                    <span className="px-3 py-1 rounded-full bg-[var(--bg-surface-warm)] text-[var(--text-muted)] text-[11px] font-medium shrink-0 tabular-nums">
                      {formulaList[2].name} {formulaList[2].score}
                    </span>
                  )}
                </div>

                {/* Action Bar */}
                <div className="p-2 rounded-full bg-[#251E24] text-[#FAF7F4] border border-[#EBDCD5]/15 flex items-center justify-between shadow-[var(--shadow-sm)]">
                  <div className="flex items-center gap-1.5 text-xs font-semibold px-3 tabular-nums">
                    <Star className="w-3.5 h-3.5 text-[#EBDCD5] fill-[#EBDCD5]" />
                    <span>{activeCard.score} Harmony</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href="/faceoff"
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#FAF7F4]/15 hover:bg-[#FAF7F4]/25 text-xs font-semibold text-[#FAF7F4] transition-colors"
                    >
                      <Swords className="w-3.5 h-3.5" />
                      <span>Duel</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => setIsLiked(!isLiked)}
                      aria-label={isLiked ? 'Remove favorite' : 'Favorite card'}
                      className="w-9 h-9 rounded-full bg-[#EBDCD5] text-[#251E24] flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#251E24]' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs px-1 text-[var(--text-muted)]">
                <span className="flex items-center gap-1.5 font-medium tabular-nums">
                  <Award className="w-3.5 h-3.5 text-[var(--accent-brand)]" />
                  {activeCard.tier} Tier · {(lifetimePoints ?? 0).toLocaleString()} lifetime pts
                </span>
                <Link href="/card" className="font-semibold text-[var(--text-main)] hover:underline">
                  View Tiers →
                </Link>
              </div>

              <div className="pt-1 space-y-2.5">
                <Link
                  href="/scan"
                  className="w-full flex items-center justify-center h-12 px-6 rounded-full text-xs font-semibold bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--bg-page)] transition-all shadow-[var(--shadow-sm)]"
                >
                  Take a Portrait Scan
                </Link>

                <Link
                  href="/faceoff"
                  className="w-full flex items-center justify-center h-11 px-6 rounded-full text-xs font-semibold border border-[var(--border-card)] bg-[var(--bg-secondary)] hover:bg-[var(--accent-soft)] text-[var(--text-main)] transition-colors"
                >
                  Challenge a Friend in Arena
                </Link>
              </div>
            </>
          )}
        </SurfaceCard>

        {/* Skincare Atelier Quick Link */}
        <SurfaceCard variant="warm" padding="sm" className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[var(--bg-surface)] border border-[var(--border-card)] flex items-center justify-center text-[var(--accent-brand)] shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-[var(--text-main)] block">
                Atelier
              </span>
              <span className="text-[11px] text-[var(--text-muted)] block">
                Explore personalized routines &amp; storefront preview
              </span>
            </div>
          </div>

          <Link
            href="/skincare"
            className="py-1.5 px-3.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-card)] hover:bg-[var(--bg-secondary)] text-xs font-semibold text-[var(--text-main)] transition-colors shrink-0"
          >
            Preview →
          </Link>
        </SurfaceCard>

        {/* Arena Duels Grid */}
        <section className="space-y-3 pt-1">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="font-display text-xl font-semibold text-[var(--text-main)]">
                Arena Duels
              </h2>
              <p className="text-xs text-[var(--text-muted)]">Head-to-head portrait challenges</p>
            </div>
            <Link href="/faceoff" className="text-xs font-semibold text-[var(--text-main)] hover:underline flex items-center gap-0.5">
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {duelsLoading ? (
              <>
                <div className="aspect-[3/4] rounded-[24px] bg-[var(--bg-surface-warm)] animate-pulse" />
                <div className="aspect-[3/4] rounded-[24px] bg-[var(--bg-surface-warm)] animate-pulse" />
              </>
            ) : myDuels.length === 0 ? (
              <div className="col-span-2">
                <EmptyState
                  title="No active duels yet"
                  description="Challenge a friend or join an open match in the Arena."
                  actionLabel="Challenge a Friend"
                  actionHref="/faceoff"
                  secondaryLabel="Add Friends"
                  secondaryHref="/friends/add"
                />
              </div>
            ) : (
              myDuels.map((duel) => (
                <div
                  key={duel.id}
                  className="relative aspect-[3/4] rounded-[24px] overflow-hidden group bg-[var(--bg-surface)] border border-[var(--border-card)]"
                >
                  <img
                    src={duel.image}
                    alt={duel.opponentName}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                  />

                  <div className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full bg-[#251E24]/80 text-[#FAF7F4] text-[10px] font-semibold tabular-nums">
                    {duel.score}
                  </div>

                  <div className="absolute bottom-2.5 inset-x-2.5 p-2.5 rounded-2xl bg-[#251E24]/90 text-[#FAF7F4] space-y-1.5 border border-[#EBDCD5]/20">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold truncate max-w-[90px]">
                        {duel.opponentName}
                      </span>
                      <span className="text-[9px] font-semibold text-[#EBDCD5] bg-[#FAF7F4]/10 px-1.5 py-0.5 rounded-full">
                        {duel.stake}
                      </span>
                    </div>

                    <Link
                      href="/faceoff"
                      className="w-full py-1.5 rounded-full bg-[#FAF7F4] text-[#251E24] text-[11px] font-semibold flex items-center justify-center gap-1"
                    >
                      <Swords className="w-3 h-3" />
                      <span>Duel</span>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Calibration Breakdown */}
        <SurfaceCard variant="default" padding="md" className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold text-[var(--text-main)]">
                Portrait Calibration
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Craft, lighting &amp; harmony breakdown
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.08em] bg-[var(--bg-surface-warm)] text-[var(--text-secondary)]">
              5 Factors
            </span>
          </div>

          <div className="divide-y divide-[var(--border-subtle)]">
            {formulaList.map((item) => (
              <div key={item.name} className="flex items-center justify-between py-3 px-1">
                <div className="space-y-0.5 pr-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-[var(--text-main)]">{item.name}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">({item.weight})</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">{item.tip}</p>
                </div>

                <div className="text-right shrink-0 tabular-nums">
                  <span className="text-sm font-bold text-[var(--text-main)]">{item.score}</span>
                  <span className="text-[10px] text-[var(--text-muted)] block leading-none">/100</span>
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>

        {/* Pillars */}
        <section className="grid grid-cols-2 gap-3 pt-1">
          <SurfaceCard variant="warm" padding="sm" className="space-y-1.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-card)] flex items-center justify-center text-[var(--accent-brand)]">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-semibold text-[var(--text-main)]">Daily Ritual Streaks</h3>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Earn multipliers up to ×2.0 with consecutive daily check-ins.
            </p>
          </SurfaceCard>

          <SurfaceCard variant="warm" padding="sm" className="space-y-1.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-card)] flex items-center justify-center text-[var(--status-success)]">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-semibold text-[var(--text-main)]">Zero Image Retention</h3>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Selfies are processed in volatile memory and discarded immediately.
            </p>
          </SurfaceCard>
        </section>

        <footer className="text-center text-xs text-[var(--text-muted)] space-y-2 pt-3 pb-4">
          <p>Portrait scores celebrate photo craft &amp; self-expression. 18+ only.</p>
          <div className="flex items-center justify-center gap-4 text-[11px] font-medium">
            <Link href="/leaderboard" className="hover:text-[var(--text-main)] transition-colors">Leaderboard</Link>
            <Link href="/friends" className="hover:text-[var(--text-main)] transition-colors">Friends</Link>
            <Link href="/skincare" className="hover:text-[var(--text-main)] transition-colors">Atelier</Link>
          </div>
        </footer>
        </GsapStagger>
      </main>
    </div>
  );
}
