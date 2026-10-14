'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Search, 
  UserPlus, 
  Swords, 
  Flame, 
  Award, 
  Sparkles,
  ExternalLink,
  Users
} from 'lucide-react';
import { BottomNav } from '@/components/navigation/BottomNav';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { useFriends } from '@/hooks/useFriends';

export default function FriendsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { friends, isLoading } = useFriends(searchQuery);

  return (
    <div className="relative min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] font-sans antialiased pb-32">
      {/* Dynamic Ambient Background */}
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
        
        {/* Top Header */}
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
              friends
            </span>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/friends/add"
              className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-300 flex items-center justify-center hover:bg-purple-500/20 transition-colors"
              title="Add Friends"
            >
              <UserPlus className="w-4 h-4" />
            </Link>
          </div>
        </header>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or @handle..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/80 dark:bg-[#140826]/80 backdrop-blur-xl border border-black/[0.06] dark:border-white/10 text-xs text-[var(--text-main)] placeholder:text-[var(--text-muted)] outline-none focus:border-purple-400/50 shadow-xs transition-colors"
          />
        </div>

        {/* Friends Directory List */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-[var(--text-main)]">
              Your Network ({friends.length})
            </h2>
            <Link
              href="/friends/add"
              className="text-xs font-bold text-purple-600 dark:text-purple-300 hover:underline flex items-center gap-1"
            >
              <span>+ Add Contenders</span>
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="w-7 h-7 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : friends.length === 0 ? (
            <div className="p-8 text-center rounded-[28px] bg-white/60 dark:bg-white/[0.04] border border-dashed border-black/10 dark:border-white/10 space-y-2">
              <Users className="w-8 h-8 mx-auto text-[var(--text-muted)] opacity-60" />
              <p className="text-xs font-bold text-[var(--text-main)]">No friends found</p>
              <p className="text-[10px] text-[var(--text-muted)]">Search a different handle or invite friends to duel!</p>
            </div>
          ) : (
            friends.map((friend) => (
              <div
                key={friend.id}
                className="p-3.5 rounded-2xl bg-white/90 dark:bg-[#140826]/80 backdrop-blur-xl border border-black/[0.04] dark:border-white/10 shadow-xs flex items-center justify-between transition-shadow hover:shadow-md"
              >
                <Link
                  href={`/friends/${friend.id}`}
                  className="flex items-center gap-3 min-w-0 flex-1 group"
                >
                  <div className="relative shrink-0">
                    <img
                      src={friend.avatar}
                      alt={friend.name}
                      className="w-11 h-11 rounded-full object-cover border border-black/5"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-[#140826] ${
                        friend.status === 'ONLINE'
                          ? 'bg-emerald-500'
                          : friend.status === 'IN_ARENA'
                          ? 'bg-purple-500 animate-pulse'
                          : 'bg-zinc-400'
                      }`}
                    />
                  </div>

                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[var(--text-main)] truncate group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">
                        {friend.name}
                      </span>
                      <span className="text-[10px] font-extrabold text-purple-600 dark:text-purple-300 shrink-0">
                        ★ {friend.score}
                      </span>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] block truncate">
                      {friend.handle} • {friend.tier} Tier
                    </span>
                    <span className="text-[9px] text-[var(--text-muted)] block opacity-75 mt-0.5">
                      {friend.lastActive}
                    </span>
                  </div>
                </Link>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/faceoff`}
                    className="py-1.5 px-3 rounded-xl bg-[#140826] hover:bg-[#251040] text-white text-[11px] font-bold flex items-center gap-1 shadow-xs transition-transform active:scale-95"
                  >
                    <Swords className="w-3 h-3" />
                    <span>Duel</span>
                  </Link>

                  <Link
                    href={`/friends/${friend.id}`}
                    className="w-7 h-7 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 flex items-center justify-center text-[var(--text-main)] transition-colors"
                    title="View Face Card"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </section>

      </main>

      <BottomNav />
    </div>
  );
}
