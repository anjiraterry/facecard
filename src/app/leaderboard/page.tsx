'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Bell, 
  Crown, 
  Star, 
  ArrowLeft,
  Sparkles,
  Trophy,
  Flame,
  Award,
  Swords
} from 'lucide-react';
import { BottomNav } from '@/components/navigation/BottomNav';
import { ThemeToggle } from '@/components/common/ThemeToggle';

interface LeaderboardUser {
  rank: number;
  id: string;
  name: string;
  handle: string;
  avatar: string;
  score: number;
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
        const res = await fetch('/api/leaderboard');
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
  }, []);

  const topThree = leaderboard.slice(0, 3);
  const remaining = leaderboard.slice(3);
  const currentUserEntry = leaderboard.find((u) => u.isCurrentUser);

  return (
    <div className="relative min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] font-sans antialiased pb-36">
      {/* Dynamic Ambient Glow */}
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
        
        {/* Header */}
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
              leaderboard
            </span>
          </div>

          <ThemeToggle />
        </header>

        {/* Tab Filters */}
        <div className="flex items-center p-1 rounded-2xl bg-white/80 dark:bg-[#140826]/80 backdrop-blur-xl border border-black/[0.04] dark:border-white/10 shadow-sm">
          {(['GLOBAL', 'FRIENDS', 'WEEKLY'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 px-2 text-xs font-bold rounded-xl transition-all ${
                tab === t
                  ? 'bg-[#140826] text-white dark:bg-white dark:text-[#140826] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              {t === 'GLOBAL' ? 'Global Status' : t === 'FRIENDS' ? 'Friends' : 'This Week'}
            </button>
          ))}
        </div>

        {/* Podium Section (Top 3) */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
          </div>
        ) : topThree.length >= 3 ? (
          <section className="pt-2 pb-2">
            <div className="flex items-end justify-center gap-3 sm:gap-6">
              
              {/* Rank 2 (Left) */}
              <div className="flex flex-col items-center">
                <div className="relative mb-2">
                  <div className="w-16 h-16 rounded-full p-[3px] bg-[#56CCF2] shadow-sm">
                    <img
                      src={topThree[1].avatar}
                      alt={topThree[1].name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[#56CCF2] text-white font-extrabold text-[10px] flex items-center justify-center shadow-sm">
                    2
                  </span>
                </div>
                <span className="text-xs font-bold text-[var(--text-main)] mt-1 truncate max-w-[90px] text-center">
                  {topThree[1].name}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-semibold">
                  ★ {topThree[1].score} Lethal
                </span>
                <span className="text-[9px] font-bold text-cyan-600 dark:text-cyan-400">
                  {topThree[1].points.toLocaleString()} PTS
                </span>
              </div>

              {/* Rank 1 (Center - Elevated) */}
              <div className="flex flex-col items-center -mt-5">
                <div className="relative mb-2">
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[#F2C94C]">
                    <Crown className="w-6 h-6 fill-[#F2C94C] drop-shadow-sm" />
                  </div>
                  <div className="w-20 h-20 rounded-full p-[4px] bg-[#F2C94C] shadow-[0_8px_24px_rgba(242,201,76,0.4)]">
                    <img
                      src={topThree[0].avatar}
                      alt={topThree[0].name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[#F2C94C] text-[#140826] font-extrabold text-[10px] flex items-center justify-center shadow-sm">
                    1
                  </span>
                </div>
                <span className="text-xs font-bold text-[var(--text-main)] mt-1 truncate max-w-[100px] text-center">
                  {topThree[0].name}
                </span>
                <span className="text-[10px] text-[#F5B800] font-extrabold">
                  ★ {topThree[0].score} Lethal
                </span>
                <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400">
                  {topThree[0].points.toLocaleString()} PTS
                </span>
              </div>

              {/* Rank 3 (Right) */}
              <div className="flex flex-col items-center">
                <div className="relative mb-2">
                  <div className="w-16 h-16 rounded-full p-[3px] bg-[#EB5757] shadow-sm">
                    <img
                      src={topThree[2].avatar}
                      alt={topThree[2].name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[#EB5757] text-white font-extrabold text-[10px] flex items-center justify-center shadow-sm">
                    3
                  </span>
                </div>
                <span className="text-xs font-bold text-[var(--text-main)] mt-1 truncate max-w-[90px] text-center">
                  {topThree[2].name}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-semibold">
                  ★ {topThree[2].score} Lethal
                </span>
                <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400">
                  {topThree[2].points.toLocaleString()} PTS
                </span>
              </div>

            </div>
          </section>
        ) : null}

        {/* Your Rating Banner */}
        {currentUserEntry && (
          <section className="p-3.5 rounded-2xl bg-[#EDE9FE] dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-xs font-bold text-purple-800 dark:text-purple-200">
                Your Standings: Rank #{currentUserEntry.rank}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-purple-800 dark:text-purple-200 font-mono">
                {currentUserEntry.points.toLocaleString()} PTS
              </span>
            </div>
          </section>
        )}

        {/* Remaining Contenders List */}
        <section className="space-y-2.5">
          {remaining.map((item) => (
            <div
              key={item.id}
              className={`p-3.5 rounded-2xl bg-white/95 dark:bg-[#140826]/85 backdrop-blur-xl border ${
                item.isCurrentUser
                  ? 'border-purple-400 dark:border-purple-500 shadow-sm ring-2 ring-purple-400/20'
                  : 'border-black/[0.04] dark:border-white/10'
              } flex items-center justify-between shadow-xs transition-shadow`}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src={item.avatar}
                    alt={item.name}
                    className="w-10 h-10 rounded-full object-cover border border-black/5"
                  />
                  {item.streak > 3 && (
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#FF7A50] text-white text-[8px] font-black flex items-center justify-center ring-1 ring-white">
                      🔥
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-xs font-bold text-[var(--text-main)] block">
                    {item.name} {item.isCurrentUser && '★'}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] font-medium flex items-center gap-1.5">
                    <span>★ {item.score} Lethal</span>
                    <span>•</span>
                    <span className="text-purple-600 dark:text-purple-300 font-semibold">{item.tier} Tier</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-xs font-extrabold text-[var(--text-main)] font-mono block">
                    {item.points.toLocaleString()} PTS
                  </span>
                  <span className="text-[9px] text-[var(--text-muted)] font-medium">
                    #{item.rank}
                  </span>
                </div>

                <Link
                  href={`/faceoff`}
                  className="w-7 h-7 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 flex items-center justify-center text-[var(--text-main)] transition-colors"
                  title="Challenge in Arena"
                >
                  <Swords className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </section>

      </main>

      <BottomNav />
    </div>
  );
}
