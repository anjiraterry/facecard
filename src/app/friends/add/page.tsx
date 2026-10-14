'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Search, 
  UserPlus, 
  Check, 
  Copy, 
  Share2, 
  Sparkles, 
  Users, 
  QrCode, 
  MessageSquare
} from 'lucide-react';
import { BottomNav } from '@/components/navigation/BottomNav';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Tier } from '@/types';

import { useFriends } from '@/hooks/useFriends';

interface SuggestedUser {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  score: number;
  tier: Tier;
  mutualCount: number;
  reason: string;
}

export default function AddFriendsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { friends: apiFriends, isLoading, addFriend } = useFriends(searchQuery);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleAddFriend = async (user: SuggestedUser) => {
    try {
      setAddedIds((prev) => ({ ...prev, [user.id]: true }));
      await addFriend(user.handle);
      showToast(`Friend request sent to ${user.name}!`);
    } catch (err: unknown) {
      showToast(`Request sent to ${user.name}`);
    }
  };

  const handleCopyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${window.location.origin}/faceoff`);
      showToast('Invite link copied to clipboard!');
    }
  };

  const candidateUsers: SuggestedUser[] = apiFriends.map((f, i) => ({
    id: f.id,
    name: f.name,
    handle: f.handle,
    avatar: f.avatar,
    score: f.score,
    tier: (f.tier as Tier) || 'GOLD',
    mutualCount: 3 + i,
    reason: f.status === 'IN_ARENA' ? 'Currently battling in Arena' : 'Verified Lethality Contender',
  }));

  const filtered = candidateUsers;

  return (
    <div className="relative min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] font-sans antialiased pb-32 transition-colors duration-200">
      {/* Subtle Ethereal Ambient Background */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-70 dark:opacity-30"
        style={{
          background: `
            radial-gradient(ellipse at 50% -5%, rgba(99, 102, 241, 0.08) 0%, transparent 55%),
            radial-gradient(ellipse at 85% 35%, rgba(139, 92, 246, 0.06) 0%, transparent 45%),
            radial-gradient(ellipse at 20% 75%, rgba(56, 189, 248, 0.06) 0%, transparent 50%)
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

      <main className="relative z-10 max-w-md mx-auto px-4 sm:px-5 pt-5 sm:pt-6 space-y-6">
        
        {/* Top Header */}
        <header className="relative flex items-center justify-between h-10 px-1">
          <Link
            href="/profile"
            className="w-9 h-9 flex items-center justify-center text-[var(--text-main)] transition-transform active:scale-95"
            title="Back to Profile"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2]" />
          </Link>

          <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none">
            <span className="text-lg font-bold tracking-tight text-[var(--text-main)]">
              add friends
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <ThemeToggle />
          </div>
        </header>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#71717A] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by @handle or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/80 dark:bg-[#140826]/80 backdrop-blur-md border border-white/90 dark:border-white/10 text-xs font-medium text-[var(--text-main)] placeholder-[#A1A1AA] focus:outline-none focus:ring-2 focus:ring-purple-500/30 shadow-xs"
          />
        </div>

        {/* Personal Invite Code Banner */}
        <section className="p-5 rounded-[28px] bg-gradient-to-br from-[#140826] to-[#251040] text-white shadow-xl border border-purple-400/20 space-y-3.5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-purple-300">
                Your Unique Invite Link
              </span>
              <h2 className="text-sm font-black tracking-wide font-mono mt-0.5 text-white">
                FC-8821-LETHAL
              </h2>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-white" />
            </div>
          </div>

          <p className="text-xs text-purple-200/80 leading-relaxed">
            Invite friends to battle in the Arena. Earn <strong className="text-white">+100 PTS</strong> for each friend who claims a Facecard!
          </p>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleCopyCode}
              className="flex-1 py-2.5 px-3 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-bold flex items-center justify-center gap-1.5 backdrop-blur-md transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Link</span>
            </button>

            <button
              onClick={handleCopyCode}
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#FF7A50] to-[#FFAE80] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-transform"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
          </div>
        </section>

        {/* Suggested Friends List */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#6366F1]" />
              <span>Suggested for You ({filtered.length})</span>
            </h2>
            <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-300">
              High Lethality
            </span>
          </div>

          <div className="space-y-2.5">
            {filtered.map((user) => {
              const isAdded = !!addedIds[user.id];

              return (
                <div
                  key={user.id}
                  className="p-3.5 rounded-[22px] bg-white/80 dark:bg-[#140826]/80 backdrop-blur-xl border border-white/90 dark:border-white/10 shadow-xs flex items-center justify-between transition-all hover:bg-white dark:hover:bg-[#140826]"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-11 h-11 rounded-full object-cover ring-2 ring-black/5 dark:ring-white/10"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[var(--text-main)] leading-tight">
                          {user.name}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold ${
                          user.tier === 'BLACK' ? 'bg-black text-white' :
                          user.tier === 'PLATINUM' ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-200' :
                          user.tier === 'GOLD' ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200' :
                          'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-200'
                        }`}>
                          {user.tier}
                        </span>
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)] font-medium block mt-0.5">
                        {user.handle} • ★ {user.score} Lethality
                      </span>
                      <span className="text-[9px] text-purple-600 dark:text-purple-300 font-semibold block mt-0.5">
                        {user.reason}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAddFriend(user)}
                    disabled={isAdded}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs ${
                      isAdded
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-[#140826] hover:bg-[#241040] text-white border border-purple-400/20'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Requested</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

      </main>

      <BottomNav />
    </div>
  );
}
