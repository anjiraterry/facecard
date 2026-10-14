'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Coins, 
  Copy, 
  Check, 
  Flame, 
  Star, 
  Swords, 
  Users,
  ChevronRight,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { BottomNav } from '@/components/navigation/BottomNav';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { FaceOffMode } from '@/types';
import { useFaceoff } from '@/hooks/useFaceoff';
import { useCard } from '@/hooks/useCard';

function FaceOffContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const duelParam = searchParams.get('duel');

  const { faceoffs, createChallenge, joinDuel, refreshFaceoffs, isLoading } = useFaceoff();
  const { activeCard, spendableBalance } = useCard();

  const [mode, setMode] = useState<FaceOffMode>('STAKED');
  const [stakeAmount, setStakeAmount] = useState<number>(100);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const STAKE_OPTIONS = [50, 100, 250, 500];
  const liveDuels = faceoffs;
  const avatarList = liveDuels.map((d) => d.image);
  const featuredOpponent = liveDuels[0];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCreateChallenge = async () => {
    try {
      const res = await createChallenge({
        mode,
        stakeAmount: mode === 'STAKED' ? stakeAmount : 0,
      });
      setInviteCode(res.inviteCode);
      refreshFaceoffs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create challenge';
      showToast(msg);
    }
  };

  const handleAcceptDuel = async (duelId: string, opponentName: string) => {
    try {
      setJoiningId(duelId);
      const res = await joinDuel(duelId);
      if (res.success) {
        showToast(`Duel accepted against ${opponentName}! Taking you to scan...`);
        setTimeout(() => {
          router.push(`/scan?duelId=${duelId}`);
        }, 1200);
      } else {
        showToast(res.message || 'Failed to enter duel');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to join duel';
      showToast(msg);
    } finally {
      setJoiningId(null);
    }
  };

  const copyInviteLink = () => {
    if (!inviteCode) return;
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/faceoff?duel=${inviteCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] font-sans antialiased pb-32">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-[#140826] text-white text-xs font-bold shadow-xl border border-purple-400/40 animate-fade-in flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Subtle Ethereal Ambient Background */}
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
        
        {/* Top Header Row (Clean Transparent, Centered Title) */}
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
              arena
            </span>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-main)]">
              <Coins className="w-4 h-4 text-[#6366F1]" />
              <span>{spendableBalance ?? 0}</span>
            </div>
          </div>
        </header>

        {/* Incoming Challenge Banner if arriving via link */}
        {duelParam && (
          <div className="p-4 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-between shadow-sm">
            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-300 block">
                Incoming Duel Invite
              </span>
              <span className="text-xs font-bold text-[var(--text-main)] block">
                Challenge Code: {duelParam}
              </span>
            </div>
            <button
              onClick={() => {
                const target = liveDuels.find((d) => d.id === duelParam);
                if (target) {
                  handleAcceptDuel(target.id, target.opponentName);
                } else {
                  router.push(`/arena/invite/${duelParam}`);
                }
              }}
              className="py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
            >
              View Match
            </button>
          </div>
        )}

        {/* Sub-Header Row: Overlapping Member Avatars + Stats Tag */}
        <section className="flex items-center justify-between px-1">
          <div className="flex items-center">
            <div className="flex -space-x-2.5 overflow-hidden">
              {avatarList.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-white dark:ring-[#140826] shadow-xs"
                />
              ))}
              <div className="w-8 h-8 rounded-full bg-[#140826] text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-[#140826] shadow-xs">
                +{liveDuels.length}
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold text-[var(--text-main)] block leading-tight">
              Arena
            </span>
            <span className="text-[10px] text-[var(--text-muted)] font-medium block">
              {liveDuels.length > 0 ? `${liveDuels.length} Duels Live Now` : 'Duels Live in Arena'}
            </span>
          </div>
        </section>

        {/* You vs Featured Opponent Stand-Off */}
        <section className="grid grid-cols-2 gap-3">
          {/* You Card */}
          <div className="p-4 rounded-[28px] bg-white/85 dark:bg-[#140826]/75 backdrop-blur-xl border border-white/95 dark:border-white/10 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5">
              {activeCard?.avatarUrl ? (
                <img
                  src={activeCard.avatarUrl}
                  alt={activeCard.cardholderName}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-[#6366F1]"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#6366F1]/20 text-[#6366F1] flex items-center justify-center font-bold text-sm ring-2 ring-[#6366F1]">
                  {(activeCard?.cardholderName || 'You').charAt(0)}
                </div>
              )}
              <div>
                <span className="text-xs font-bold block text-[var(--text-main)] truncate max-w-[80px]">
                  {activeCard?.cardholderName || 'You'}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] block font-medium">
                  ★ {activeCard?.score ?? 84} Lethal
                </span>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-1.5 text-[#6366F1] font-bold">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>{(spendableBalance ?? 0).toLocaleString()} points</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#FF7A50] font-bold">
                <Flame className="w-3.5 h-3.5 fill-[#FF7A50]" />
                <span>{activeCard?.streakDays ?? 7} day streak</span>
              </div>
            </div>
          </div>

          {/* Featured Opponent Card */}
          <div className="p-4 rounded-[28px] bg-white/85 dark:bg-[#140826]/75 backdrop-blur-xl border border-white/95 dark:border-white/10 shadow-sm space-y-3">
            {featuredOpponent ? (
              <div className="flex items-center gap-2.5">
                <img
                  src={featuredOpponent.image}
                  alt={featuredOpponent.opponentName}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-black/10 dark:ring-white/20"
                />
                <div>
                  <span className="text-xs font-bold block text-[var(--text-main)] truncate max-w-[80px]">
                    {featuredOpponent.opponentName}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] block font-medium">
                    ★ {featuredOpponent.score} Lethal
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-[var(--text-muted)] font-bold text-xs">
                  ?
                </div>
                <div>
                  <span className="text-xs font-bold block text-[var(--text-main)]">Open Duel</span>
                  <span className="text-[10px] text-[var(--text-muted)] block font-medium">Join Match</span>
                </div>
              </div>
            )}

            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-1.5 text-[#6366F1] font-bold">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>{featuredOpponent ? featuredOpponent.stake : 'Open Match'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#FF7A50] font-bold">
                <Flame className="w-3.5 h-3.5 fill-[#FF7A50]" />
                <span>{featuredOpponent ? featuredOpponent.tier : 'Arena Tier'}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Live Active Duels */}
        <section className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--text-main)]">
              Active Duel Challenges
            </h2>
            <span className="text-xs text-[var(--text-muted)]">Tap to accept duel</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {liveDuels.length === 0 ? (
              <div className="col-span-2 p-8 text-center rounded-[28px] bg-white/60 dark:bg-white/[0.04] border border-dashed border-black/10 dark:border-white/10 space-y-2">
                <Swords className="w-7 h-7 mx-auto text-[var(--text-muted)] opacity-60" />
                <p className="text-xs font-bold text-[var(--text-main)]">No active duels found</p>
                <p className="text-[10px] text-[var(--text-muted)]">Create a challenge below to stake points and duel!</p>
              </div>
            ) : (
              liveDuels.map((duel) => (
                <div
                  key={duel.id}
                  className="relative aspect-[3/4] rounded-[28px] overflow-hidden group bg-white dark:bg-[#140826] shadow-sm border border-black/[0.04] dark:border-white/10"
                >
                  <img
                    src={duel.image}
                    alt={duel.opponentName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Score Tag with Frosted Pill */}
                  <div className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold border border-white/20">
                    ★ {duel.score}
                  </div>

                  {/* Bottom Overlay Capsule Drawer */}
                  <div className="absolute bottom-2.5 inset-x-2.5 p-2.5 rounded-[20px] bg-[#140826]/90 text-white backdrop-blur-xl space-y-1.5 border border-purple-400/20">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold truncate max-w-[90px]">
                        {duel.opponentName}
                      </span>
                      <span className="text-[9px] font-bold text-white/70 bg-white/10 px-1.5 py-0.5 rounded-full">
                        {duel.stake}
                      </span>
                    </div>

                    <button
                      disabled={joiningId === duel.id}
                      onClick={() => handleAcceptDuel(duel.id, duel.opponentName)}
                      className="w-full py-1.5 rounded-xl bg-white text-[#18181B] text-[11px] font-bold flex items-center justify-center gap-1 transition-transform active:scale-95 shadow-xs disabled:opacity-50"
                    >
                      <Swords className="w-3 h-3 text-[#18181B]" />
                      <span>{joiningId === duel.id ? 'Entering...' : 'Accept Duel'}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Create Private Duel Box */}
        <section className="p-4 rounded-[28px] bg-white/85 dark:bg-[#140826]/75 backdrop-blur-xl border border-white/95 dark:border-white/10 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#18181B] dark:text-zinc-100">
                Create Private Duel
              </h2>
              <p className="text-xs text-[#71717A] dark:text-zinc-400 mt-0.5">
                Share a link with a friend or battle publicly.
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-black/5 dark:bg-white/10 text-[#71717A] dark:text-zinc-300">
              P2P
            </span>
          </div>

          {/* Mode Selector */}
          <div className="flex items-center gap-1.5 p-0">
            <button
              onClick={() => { setMode('STAKED'); setInviteCode(null); }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                mode === 'STAKED'
                  ? 'bg-[#DDD6FE] dark:bg-[#7C3AED]/40 text-[#140826] dark:text-purple-100 border border-[#C4B5FD] dark:border-purple-500/40 shadow-xs'
                  : 'text-[#71717A] dark:text-zinc-300 hover:text-[#18181B] dark:hover:text-white bg-black/5 dark:bg-white/5'
              }`}
            >
              <Coins className="w-3.5 h-3.5 text-current" />
              <span>Staked</span>
            </button>

            <button
              onClick={() => { setMode('FRIENDLY'); setInviteCode(null); }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                mode === 'FRIENDLY'
                  ? 'bg-[#DDD6FE] dark:bg-[#7C3AED]/40 text-[#140826] dark:text-purple-100 border border-[#C4B5FD] dark:border-purple-500/40 shadow-xs'
                  : 'text-[#71717A] dark:text-zinc-300 hover:text-[#18181B] dark:hover:text-white bg-black/5 dark:bg-white/5'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-current" />
              <span>Friendly (Zero Risk)</span>
            </button>
          </div>

          {/* Stake Amount Selector */}
          {mode === 'STAKED' && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-[#71717A] dark:text-zinc-400 block">
                Stake Amount:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {STAKE_OPTIONS.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setStakeAmount(amt)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                      stakeAmount === amt
                        ? 'border-[#C4B5FD] dark:border-purple-500/40 bg-[#DDD6FE] dark:bg-[#7C3AED]/40 text-[#140826] dark:text-purple-100 shadow-xs'
                        : 'border-transparent bg-white/50 dark:bg-white/5 text-[#71717A] dark:text-zinc-300 hover:text-[#18181B] dark:hover:text-white'
                    }`}
                  >
                    {amt} PTS
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Button */}
          {!inviteCode ? (
            <button
              onClick={handleCreateChallenge}
              className="w-full py-3.5 rounded-full bg-[#140826] hover:bg-[#241040] text-white text-xs font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-[0_8px_24px_rgba(20,8,38,0.3)] border border-purple-400/20"
            >
              <Swords className="w-4 h-4 text-white" />
              <span>Generate Duel Link</span>
            </button>
          ) : (
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#140826] border border-black/[0.06] dark:border-white/10 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-muted)]">Invite Code:</span>
                <span className="font-mono font-bold text-[var(--text-main)]">{inviteCode}</span>
              </div>
              <button
                onClick={copyInviteLink}
                className="w-full py-2.5 rounded-xl bg-[#6366F1] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-transform active:scale-95"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Invite Link'}</span>
              </button>
            </div>
          )}
        </section>

      </main>

      <BottomNav />
    </div>
  );
}

export default function FaceOffPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg-page)]" />}>
      <FaceOffContent />
    </Suspense>
  );
}
