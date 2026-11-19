'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  Layers,
  Camera,
  Lock,
  CheckCircle2,
  CreditCard,
} from 'lucide-react';
import { FaceCard } from '@/components/card/FaceCard';
import { ShareCardModal } from '@/components/card/ShareCardModal';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { FaceCardSkeleton } from '@/components/common/Skeleton';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { EmptyState } from '@/components/ui/StateViews';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { FramerTabPanel } from '@/components/ui/MotionPrimitives';
import { FaceCardData } from '@/types';
import { useCard } from '@/hooks/useCard';

export default function CardPage() {
  const [activeLedgerTab, setActiveLedgerTab] = useState<'FUNDING' | 'SPENDS'>('FUNDING');
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [hasInitializedSlide, setHasInitializedSlide] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const sliderRef = useRef<HTMLDivElement>(null);
  const cardSlideRefs = useRef<(HTMLDivElement | null)[]>([]);

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

  useEffect(() => {
    if (!hasInitializedSlide && sliderCards.length > 0) {
      const activeIdx = sliderCards.findIndex((t) => t.status === 'ACTIVE');
      if (activeIdx >= 0) {
        setSelectedSlideIndex(activeIdx);
        requestAnimationFrame(() => {
          cardSlideRefs.current[activeIdx]?.scrollIntoView({
            behavior: 'auto',
            block: 'nearest',
            inline: 'center',
          });
        });
      }
      setHasInitializedSlide(true);
    }
  }, [hasInitializedSlide, sliderCards]);

  const scrollToSlide = (idx: number) => {
    setSelectedSlideIndex(idx);
    cardSlideRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  };

  const userCard: FaceCardData | null = backendCard;

  return (
    <div className="relative min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] font-sans antialiased pb-28 md:pl-16 lg:pl-52">
      <main className="relative z-10 max-w-6xl xl:max-w-7xl mx-auto px-5 sm:px-8 pt-5 space-y-5">
        <PageHeader
          title="Card & Tiers"
          backHref="/home"
          backLabel="Back to home"
          points={backendSpendable ?? 0}
        />

        {/* Balance Hero */}
        <section className="grid grid-cols-2 gap-3">
          {isLoading ? (
            <>
              <div className="p-4 rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-card)] space-y-2 animate-pulse">
                <div className="h-3 w-16 rounded bg-[var(--bg-surface-warm)]" />
                <div className="h-6 w-24 rounded bg-[var(--bg-surface-warm)]" />
              </div>
              <div className="p-4 rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-card)] space-y-2 animate-pulse">
                <div className="h-3 w-16 rounded bg-[var(--bg-surface-warm)]" />
                <div className="h-6 w-24 rounded bg-[var(--bg-surface-warm)]" />
              </div>
            </>
          ) : (
            <>
              <SurfaceCard variant="default" padding="sm" className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--text-muted)] flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-[var(--accent-brand)]" />
                    Spendable
                  </span>
                  <Link href="/shop" className="text-[11px] font-semibold text-[var(--accent-brand)] hover:underline">
                    Shop →
                  </Link>
                </div>
                <div className="text-xl font-bold text-[var(--text-main)] tabular-nums">
                  {spendablePoints.toLocaleString()}{' '}
                  <span className="text-xs font-medium text-[var(--text-muted)]">PTS</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  For boutique &amp; arena stakes
                </p>
              </SurfaceCard>

              <SurfaceCard variant="default" padding="sm" className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--text-muted)] flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-[var(--accent-brand)]" />
                    Lifetime
                  </span>
                  <span className="text-[11px] font-semibold text-[var(--accent-brand)] tabular-nums">
                    ×{userCard ? (userCard.multiplier || 1.0).toFixed(1) : '1.0'}
                  </span>
                </div>
                <div className="text-xl font-bold text-[var(--text-main)] tabular-nums">
                  {lifetimePoints.toLocaleString()}{' '}
                  <span className="text-xs font-medium text-[var(--text-muted)]">PTS</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] tabular-nums">
                  {userCard ? userCard.streakDays : 0}-Day Streak Active
                </p>
              </SurfaceCard>
            </>
          )}
        </section>

        {/* Collectible Tier Carousel */}
        <section className="space-y-3">
          {isLoading && sliderCards.length === 0 ? (
            <FaceCardSkeleton />
          ) : sliderCards.length === 0 ? (
            <SurfaceCard variant="default" padding="lg" className="text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-[var(--bg-surface-warm)] text-[var(--accent-brand)] flex items-center justify-center">
                <CreditCard className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h2 className="font-display text-2xl font-semibold text-[var(--text-main)]">
                  Claim Your Face Card
                </h2>
                <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto">
                  Sign in or take a portrait scan to unlock your collectible tier card.
                </p>
              </div>
              <Link
                href="/sign-in?redirect=/card"
                className="inline-flex items-center justify-center gap-2 py-3 px-6 rounded-full bg-[var(--accent-primary)] text-[var(--bg-page)] text-xs font-semibold"
              >
                <span>Sign In to Claim Card</span>
              </Link>
            </SurfaceCard>
          ) : (
            <>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {sliderCards.map((tierItem, idx) => {
                  const isSelected = selectedSlideIndex === idx;
                  return (
                    <button
                      key={tierItem.id}
                      type="button"
                      onClick={() => scrollToSlide(idx)}
                      className={`flex-1 py-2 px-3 text-xs font-semibold rounded-full whitespace-nowrap transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--accent-primary)] text-[var(--bg-page)] shadow-[var(--shadow-sm)]'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-surface-warm)]'
                      }`}
                    >
                      {tierItem.tier === 'CLASSIC'
                        ? 'Classic'
                        : tierItem.tier === 'GOLD'
                        ? 'Gold'
                        : tierItem.tier === 'PLATINUM'
                        ? 'Platinum'
                        : 'Black Card'}
                    </button>
                  );
                })}
              </div>

              <div
                ref={sliderRef}
                className="flex gap-4 overflow-x-auto snap-x snap-mandatory py-2 px-1 custom-scrollbar scroll-smooth"
              >
                {sliderCards.map((item, idx) => {
                  const isCurrentActive = item.status === 'ACTIVE';
                  const isSurpassed = item.status === 'SURPASSED';
                  const isLockedOrProgress = item.status === 'IN_PROGRESS' || item.status === 'LOCKED';
                  const pct = Math.min(
                    100,
                    Math.round((item.prerequisites.pointsCurrent / (item.prerequisites.pointsTarget || 1)) * 100)
                  );

                  return (
                    <div
                      key={item.id}
                      ref={(el) => { cardSlideRefs.current[idx] = el; }}
                      className="w-[86vw] max-w-[380px] shrink-0 snap-center space-y-3"
                    >
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] px-2.5 py-0.5 rounded-full bg-[var(--bg-surface-warm)] border border-[var(--border-card)] text-[var(--text-main)]">
                          {item.statusBadge}
                        </span>
                        <span className="text-[11px] font-semibold text-[var(--text-muted)] tabular-nums">
                          Tier {idx + 1} of 4
                        </span>
                      </div>

                      <div className="relative">
                        {isCurrentActive && (
                          <FaceCard card={item.card} interactive={true} />
                        )}

                        {isSurpassed && <FaceCard card={item.card} interactive={true} />}

                        {isLockedOrProgress && (
                          <div
                            className={`relative rounded-[4.5%] overflow-hidden transition-all ${
                              item.status === 'IN_PROGRESS' ? 'opacity-85' : 'opacity-65'
                            }`}
                          >
                            <FaceCard card={item.card} variant="preview" interactive={false} isLockedPreview={true} />
                            <div className="absolute inset-0 bg-[#251E24]/30 backdrop-blur-[1.5px] flex items-center justify-center p-4">
                              <div className="px-4 py-2 rounded-full bg-[#251E24]/90 border border-[#EBDCD5]/25 text-[#FAF7F4] text-xs font-semibold flex items-center gap-2 shadow-md">
                                <Lock className="w-3.5 h-3.5 text-[#EBDCD5]" />
                                <span>{item.status === 'IN_PROGRESS' ? `${pct}% Ready` : 'Edition Locked'}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <SurfaceCard variant="default" padding="sm" className="space-y-2">
                        {isCurrentActive && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-[var(--text-main)] flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-[var(--status-success)]" />
                                <span>Active Edition</span>
                              </span>
                              <span className="text-[11px] font-semibold text-[var(--accent-brand)]">Equipped</span>
                            </div>
                            <p className="text-[11px] text-[var(--text-muted)]">{item.prerequisites.summary}</p>
                          </div>
                        )}

                        {isSurpassed && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-[var(--text-main)] flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-[var(--accent-brand)]" />
                                <span>Unlocked &amp; Surpassed</span>
                              </span>
                              <span className="text-[11px] font-semibold text-[var(--text-muted)]">Archived</span>
                            </div>
                            <p className="text-[11px] text-[var(--text-muted)]">{item.prerequisites.summary}</p>
                          </div>
                        )}

                        {isLockedOrProgress && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-[var(--text-main)] flex items-center gap-1.5">
                                <Lock className="w-3.5 h-3.5 text-[var(--accent-brand)]" />
                                <span>Unlock Progress</span>
                              </span>
                              <span className="text-[11px] font-semibold text-[var(--text-muted)] tabular-nums">
                                {pct}%
                              </span>
                            </div>

                            <div className="space-y-1">
                              <div className="w-full h-2 rounded-full bg-[var(--bg-surface-warm)] overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500 bg-[var(--accent-brand)]"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-[10px] text-[var(--text-muted)] tabular-nums">
                                <span>
                                  {item.prerequisites.pointsCurrent.toLocaleString()} /{' '}
                                  {item.prerequisites.pointsTarget.toLocaleString()} PTS
                                </span>
                                <span>
                                  Index {item.prerequisites.scoreTarget}+ · {item.prerequisites.streakTarget}D Streak
                                </span>
                              </div>
                            </div>

                            <p className="text-[11px] text-[var(--text-muted)] italic">{item.prerequisites.summary}</p>
                          </div>
                        )}
                      </SurfaceCard>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-3 pt-1">
                <Button variant="primary" size="lg" className="flex-1" onClick={() => setIsShareModalOpen(true)}>
                  Share Card
                </Button>

                <Link
                  href="/gallery"
                  className="flex-1 h-12 px-4 rounded-full bg-[var(--bg-secondary)] hover:bg-[var(--accent-soft)] text-[var(--text-main)] border border-[var(--border-card)] flex items-center justify-center text-xs sm:text-sm font-semibold transition-colors"
                >
                  Saved Gallery
                </Link>
              </div>

              <SurfaceCard variant="default" padding="sm" className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--text-main)] flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-[var(--accent-brand)]" />
                    <span>
                      Next:{' '}
                      {userCard?.tier === 'CLASSIC'
                        ? 'Gold'
                        : userCard?.tier === 'GOLD'
                        ? 'Platinum'
                        : 'Black Card'}{' '}
                      Tier
                    </span>
                  </span>
                  <span className="font-semibold text-[var(--text-muted)] tabular-nums">{progressPercent}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--bg-surface-warm)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 bg-[var(--accent-brand)]"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] tabular-nums">
                  <span>{lifetimePoints.toLocaleString()} lifetime pts</span>
                  <span>{nextTierPoints.toLocaleString()} pts required</span>
                </div>
              </SurfaceCard>
            </>
          )}
        </section>

        {/* Ledger */}
        <section className="space-y-3.5">
          <div className="flex items-center gap-1.5 p-1 rounded-full bg-[var(--bg-surface-warm)] border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setActiveLedgerTab('FUNDING')}
              className={`flex-1 py-2 text-xs font-semibold rounded-full transition-colors cursor-pointer ${
                activeLedgerTab === 'FUNDING'
                  ? 'bg-[var(--accent-primary)] text-[var(--bg-page)] shadow-[var(--shadow-sm)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Funding History ({fundingList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveLedgerTab('SPENDS')}
              className={`flex-1 py-2 text-xs font-semibold rounded-full transition-colors cursor-pointer ${
                activeLedgerTab === 'SPENDS'
                  ? 'bg-[var(--accent-primary)] text-[var(--bg-page)] shadow-[var(--shadow-sm)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Point Spends ({spendsList.length})
            </button>
          </div>

          <FramerTabPanel tabKey={activeLedgerTab}>
          {activeLedgerTab === 'FUNDING' && (
            <div className="space-y-3">
              <div className="px-1 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-[var(--text-main)]">Portrait Funding Ledger</h3>
                  <p className="text-[11px] text-[var(--text-muted)]">Points credited from verified scans</p>
                </div>
                <Link
                  href="/scan"
                  className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-[var(--accent-primary)] text-[var(--bg-page)] hover:bg-[var(--accent-primary-hover)] flex items-center gap-1 transition-colors"
                >
                  <Camera className="w-3 h-3" />
                  <span>New Scan</span>
                </Link>
              </div>

              <div className="space-y-2.5">
                {fundingList.length === 0 ? (
                  <EmptyState
                    title="No funding events yet"
                    description="Complete a daily scan to earn points and progress your edition."
                    actionLabel="Take a Scan"
                    actionHref="/scan"
                  />
                ) : (
                  fundingList.map((item) => (
                    <SurfaceCard
                      key={item.id}
                      variant="default"
                      padding="sm"
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-[var(--bg-surface-warm)] border border-[var(--border-subtle)] text-[var(--accent-brand)] flex items-center justify-center shrink-0">
                          <Camera className="w-4 h-4" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-[var(--text-main)] truncate">
                              Scan #{item.scanNumber}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--bg-surface-warm)] text-[var(--text-main)] tabular-nums">
                              {item.score}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">{item.breakdown}</p>
                          <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">{item.date}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 tabular-nums">
                        <span className="text-xs font-bold text-[var(--status-success)] flex items-center justify-end gap-0.5">
                          <ArrowUpRight className="w-3.5 h-3.5" />+{item.pointsEarned} PTS
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">Credited</span>
                      </div>
                    </SurfaceCard>
                  ))
                )}
              </div>
            </div>
          )}

          {activeLedgerTab === 'SPENDS' && (
            <div className="space-y-3">
              <div className="px-1">
                <h3 className="text-xs font-semibold text-[var(--text-main)]">Point Expenditures</h3>
                <p className="text-[11px] text-[var(--text-muted)]">Boutique perks, finishes &amp; arena stakes</p>
              </div>

              <div className="space-y-2.5">
                {spendsList.length === 0 ? (
                  <EmptyState
                    title="No expenditures yet"
                    description="Redeem points in the boutique or stake them in Arena duels."
                    actionLabel="Visit Boutique"
                    actionHref="/shop"
                  />
                ) : (
                  spendsList.map((spend) => {
                    const Icon = spend.category.includes('Perk')
                      ? Snowflake
                      : spend.category.includes('Cosmetic')
                      ? Layers
                      : Swords;
                    return (
                      <SurfaceCard
                        key={spend.id}
                        variant="default"
                        padding="sm"
                        className="flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-2xl bg-[var(--bg-surface-warm)] border border-[var(--border-subtle)] text-[var(--accent-brand)] flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-[var(--text-main)] truncate">
                                {spend.title}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-[var(--bg-surface-warm)] text-[var(--text-muted)]">
                                {spend.category}
                              </span>
                            </div>
                            <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">{spend.note}</p>
                            <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">{spend.date}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0 tabular-nums">
                          <span className="text-xs font-bold text-[var(--status-danger)] flex items-center justify-end gap-0.5">
                            <ArrowDownRight className="w-3.5 h-3.5" />-{spend.pointsSpent} PTS
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">{spend.status}</span>
                        </div>
                      </SurfaceCard>
                    );
                  })
                )}
              </div>
            </div>
          )}
          </FramerTabPanel>
        </section>
      </main>

      {userCard && (
        <ShareCardModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} card={userCard} />
      )}
    </div>
  );
}
