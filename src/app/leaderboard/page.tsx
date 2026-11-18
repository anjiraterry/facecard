'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Swords } from 'lucide-react';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { LoadingState, EmptyState } from '@/components/ui/StateViews';
import { FramerStagger, FramerTabPanel } from '@/components/ui/MotionPrimitives';
import { PageHeader } from '@/components/ui/PageHeader';

interface LeaderboardUser {
  rank: number;
  id: string;
  name: string;
  handle: string;
  avatar: string;
  score: number | null;
  tier: string;
  streak: number;
  points: number;
  isCurrentUser: boolean;
}

export default function LeaderboardPage() {
  const [tab, setTab] = useState<'GLOBAL' | 'FRIENDS' | 'WEEKLY'>('GLOBAL');
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/leaderboard?scope=${tab}`);
        const data = await res.json();
        if (data.success && data.leaderboard) {
          setLeaderboard(data.leaderboard);
        }
      } catch (err) {
        console.warn('Failed to load leaderboard:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLeaderboard();
  }, [tab]);

  const topThree = leaderboard.slice(0, 3);
  const remaining = leaderboard.slice(3);
  const currentUserEntry = leaderboard.find((u) => u.isCurrentUser);

  return (
    <div className="relative min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans antialiased pb-32 md:pl-16 lg:pl-52">
      <main className="relative z-10 max-w-6xl xl:max-w-7xl mx-auto px-5 sm:px-8 pt-5 space-y-5">
        <PageHeader title="Leaderboard" backHref="/home" backLabel="Back to home" />

        {/* Clean Segmented Tabs */}
        <div className="flex items-center p-1 rounded-full bg-[var(--surface)] border border-[var(--border)]">
          {(['GLOBAL', 'FRIENDS', 'WEEKLY'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 py-2 px-2 text-xs font-semibold rounded-full transition-colors cursor-pointer ${
                tab === t
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                  : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
              }`}
            >
              {t === 'GLOBAL' ? 'Global' : t === 'FRIENDS' ? 'Circle' : 'This Week'}
            </button>
          ))}
        </div>

        {isLoading ? (
          <LoadingState label="Loading standings..." />
        ) : leaderboard.length === 0 ? (
          <EmptyState
            title="No standings yet"
            description="Complete a portrait scan to join the community leaderboard."
          />
        ) : (
          <FramerTabPanel tabKey={tab}>
            <FramerStagger className="space-y-4">
            {/* Simple, Clean Top 3 Podium */}
            {topThree.length >= 3 && (
              <SurfaceCard variant="default" padding="md">
                <div className="grid grid-cols-3 gap-3 items-end text-center">
                  {/* #2 */}
                  <div className="flex flex-col items-center space-y-1.5">
                    <span className="text-[11px] font-bold text-[var(--foreground-muted)] tabular-nums">#2</span>
                    <img
                      src={topThree[1].avatar}
                      alt={topThree[1].name}
                      className="w-12 h-12 rounded-full object-cover border border-[var(--border-strong)]"
                    />
                    <div className="min-w-0 w-full">
                      <span className="text-xs font-semibold text-[var(--foreground)] block truncate">
                        {topThree[1].name}
                      </span>
                      <span className="text-[11px] text-[var(--foreground-muted)] block tabular-nums">
                        {topThree[1].points.toLocaleString()} PTS
                      </span>
                    </div>
                  </div>

                  {/* #1 */}
                  <div className="flex flex-col items-center space-y-1.5">
                    <span className="text-[11px] font-bold text-[var(--brand-plum)] tabular-nums">#1</span>
                    <img
                      src={topThree[0].avatar}
                      alt={topThree[0].name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-[var(--brand-plum)]"
                    />
                    <div className="min-w-0 w-full">
                      <span className="text-xs font-bold text-[var(--foreground)] block truncate">
                        {topThree[0].name}
                      </span>
                      <span className="text-[11px] font-semibold text-[var(--foreground-secondary)] block tabular-nums">
                        {topThree[0].points.toLocaleString()} PTS
                      </span>
                    </div>
                  </div>

                  {/* #3 */}
                  <div className="flex flex-col items-center space-y-1.5">
                    <span className="text-[11px] font-bold text-[var(--foreground-muted)] tabular-nums">#3</span>
                    <img
                      src={topThree[2].avatar}
                      alt={topThree[2].name}
                      className="w-12 h-12 rounded-full object-cover border border-[var(--border-strong)]"
                    />
                    <div className="min-w-0 w-full">
                      <span className="text-xs font-semibold text-[var(--foreground)] block truncate">
                        {topThree[2].name}
                      </span>
                      <span className="text-[11px] text-[var(--foreground-muted)] block tabular-nums">
                        {topThree[2].points.toLocaleString()} PTS
                      </span>
                    </div>
                  </div>
                </div>
              </SurfaceCard>
            )}

            {currentUserEntry && (
              <div className="px-4 py-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--foreground)]">
                  Your Standing · #{currentUserEntry.rank}
                </span>
                <span className="font-bold text-[var(--foreground)] tabular-nums">
                  {currentUserEntry.points.toLocaleString()} PTS
                </span>
              </div>
            )}

            {/* Unified Clean Standings List */}
            {remaining.length > 0 && (
              <SurfaceCard variant="default" padding="none" className="divide-y divide-[var(--border)]">
                {remaining.map((item) => (
                  <div
                    key={item.id}
                    className={`px-4 py-3 flex items-center justify-between gap-3 ${
                      item.isCurrentUser ? 'bg-[var(--surface-accent)]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 text-xs font-semibold text-[var(--foreground-muted)] tabular-nums shrink-0">
                        #{item.rank}
                      </span>
                      <img
                        src={item.avatar}
                        alt={item.name}
                        className="w-9 h-9 rounded-full object-cover border border-[var(--border)] shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-[var(--foreground)] block truncate">
                          {item.name} {item.isCurrentUser && '(You)'}
                        </span>
                        <span className="text-[11px] text-[var(--foreground-muted)] block tabular-nums">
                          {item.score !== null ? `Index ${item.score} · ${item.tier}` : `Unrated · ${item.tier}`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-bold text-[var(--foreground)] tabular-nums">
                        {item.points.toLocaleString()} PTS
                      </span>
                      <Link
                        href="/faceoff"
                        aria-label={`Challenge ${item.name} in Arena`}
                        className="w-8 h-8 rounded-full bg-[var(--surface-secondary)] hover:bg-[var(--accent)] flex items-center justify-center text-[var(--foreground)] transition-colors"
                      >
                        <Swords className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </SurfaceCard>
            )}
            </FramerStagger>
          </FramerTabPanel>
        )}
      </main>
    </div>
  );
}
