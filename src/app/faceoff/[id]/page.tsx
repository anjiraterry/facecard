'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Swords, 
  Flame, 
  ShieldCheck, 
  Coins, 
  Copy, 
  Check, 
  ExternalLink, 
  User, 
  AlertCircle 
} from 'lucide-react';
import { BottomNav } from '@/components/navigation/BottomNav';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { UserAvatar } from '@/components/common/UserAvatar';
import { useCard } from '@/hooks/useCard';
import { useFaceoff } from '@/hooks/useFaceoff';
import { useToast } from '@/components/common/ToastProvider';

interface DuelDetailResponse {
  id: string;
  inviteCode?: string;
  challenger: {
    id: string;
    displayName: string;
    handle: string;
    score: number;
    tier: string;
    avatar: string;
  };
  opponent: {
    id: string;
    displayName: string;
    handle: string;
    score: number;
    tier: string;
    avatar: string;
  } | null;
  mode: string;
  stakeAmount: number;
  status: string;
  winnerId: string | null;
  expiresAt: string;
}

function DuelDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const duelId = (params?.id as string) || '';
  const { showToast } = useToast();

  const { activeCard } = useCard();
  const { joinDuel } = useFaceoff();

  const [duel, setDuel] = useState<DuelDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!duelId) {
      setIsLoading(false);
      return;
    }

    fetch(`/api/faceoffs/${duelId}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && data.duel) {
          setDuel(data.duel);
        } else if (isMounted) {
          setDuel(null);
        }
      })
      .catch((err) => {
        console.warn('Failed to load duel:', err);
        if (isMounted) setDuel(null);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, [duelId]);

  const handleAcceptDuel = async () => {
    if (!duel) return;
    try {
      setIsJoining(true);
      const res = await joinDuel(duel.id);
      if (res.success) {
        showToast('Duel accepted! Proceeding to selfie scan...');
        setTimeout(() => router.push(`/scan?duelId=${duel.id}`), 1000);
      } else {
        showToast(res.message || 'Could not enter duel');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to join duel';
      showToast(msg);
    } finally {
      setIsJoining(false);
    }
  };

  const copyLink = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] font-sans antialiased pb-32">
        <main className="max-w-md mx-auto px-5 pt-5 space-y-5 animate-pulse">
          <header className="flex items-center justify-between h-10 px-1">
            <div className="w-9 h-9 rounded-full bg-neutral-200 dark:bg-white/10" />
            <div className="w-24 h-5 rounded bg-neutral-200 dark:bg-white/10" />
            <div className="w-9 h-9 rounded-full bg-neutral-200 dark:bg-white/10" />
          </header>
          <div className="h-64 rounded-[32px] bg-neutral-200 dark:bg-white/10" />
          <div className="h-40 rounded-[24px] bg-neutral-200 dark:bg-white/10" />
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!duel) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-[var(--text-muted)]">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-[var(--text-main)]">Duel Not Found</h2>
          <p className="text-xs text-[var(--text-muted)]">This duel challenge may have expired, settled, or does not exist.</p>
        </div>
        <Link
          href="/faceoff"
          className="py-2.5 px-5 rounded-full bg-[#140826] dark:bg-white text-white dark:text-[#140826] text-xs font-bold shadow-sm"
        >
          Return to Arena
        </Link>
      </div>
    );
  }

  const isExpired = new Date(duel.expiresAt).getTime() <= Date.now();
  const canJoin = duel.status === 'WAITING' && !isExpired && activeCard?.id !== duel.challenger.id;
  const isMine = activeCard?.id === duel.challenger.id;
  const totalPrize = duel.stakeAmount ? duel.stakeAmount * 2 : 0;
  const challengerProfileUrl = `/friends/${duel.challenger.handle.replace(/^@/, '')}`;

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
            href="/faceoff"
            className="w-9 h-9 flex items-center justify-center text-[var(--text-main)] transition-transform active:scale-95"
            title="Back to Arena"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2]" />
          </Link>

          <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none">
            <span className="text-lg font-bold tracking-tight text-[var(--text-main)]">
              arena clash
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <ThemeToggle />
          </div>
        </header>

        {/* Division & Status Pill */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#140826] text-white dark:bg-white dark:text-[#140826]">
              {duel.challenger.tier} Division
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-300">
              {duel.mode === 'STAKED' ? `${duel.stakeAmount} PTS Stake` : 'Friendly Match'}
            </span>
          </div>
          <span className="text-xs font-bold text-[var(--text-muted)]">
            {duel.status === 'WAITING' ? (isExpired ? 'Expired' : 'Awaiting Opponent') : duel.status}
          </span>
        </div>

        {/* Contender Stand-Off Cards */}
        <section className="grid grid-cols-2 gap-3 relative">
          {/* Challenger */}
          <div className="p-4 rounded-[28px] bg-white/85 dark:bg-[#140826]/75 backdrop-blur-xl border border-white/95 dark:border-white/10 shadow-sm space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <UserAvatar
                  name={duel.challenger.displayName}
                  handle={duel.challenger.handle}
                  src={duel.challenger.avatar}
                  size="md"
                  className="w-10 h-10 ring-2 ring-black/10 dark:ring-white/20"
                />
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] block uppercase">Challenger</span>
                  <span className="text-xs font-black text-[var(--text-main)] truncate block">{duel.challenger.handle}</span>
                </div>
              </div>

              <div className="mt-3 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Score</span>
                  <span className="font-mono font-black text-[var(--text-main)]">★ {duel.challenger.score}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Tier</span>
                  <span className="font-bold text-purple-600 dark:text-purple-300">{duel.challenger.tier}</span>
                </div>
              </div>
            </div>

            <Link
              href={challengerProfileUrl}
              className="w-full py-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 text-[var(--text-main)] text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors active:scale-95"
            >
              <span>View Profile</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          {/* Opponent */}
          <div className="p-4 rounded-[28px] bg-white/85 dark:bg-[#140826]/75 backdrop-blur-xl border border-white/95 dark:border-white/10 shadow-sm space-y-3 flex flex-col justify-between">
            <div>
              {duel.opponent ? (
                <>
                  <div className="flex items-center gap-2.5">
                    <UserAvatar
                      name={duel.opponent.displayName}
                      handle={duel.opponent.handle}
                      src={duel.opponent.avatar}
                      size="md"
                      className="w-10 h-10 ring-2 ring-black/10 dark:ring-white/20"
                    />
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-[var(--text-muted)] block uppercase">Contender</span>
                      <span className="text-xs font-black text-[var(--text-main)] truncate block">{duel.opponent.handle}</span>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Score</span>
                      <span className="font-mono font-black text-[var(--text-main)]">★ {duel.opponent.score}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Tier</span>
                      <span className="font-bold text-purple-600 dark:text-purple-300">{duel.opponent.tier}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-4 space-y-1">
                  <div className="w-10 h-10 mx-auto rounded-full bg-purple-500/10 text-purple-600 font-black flex items-center justify-center text-xs">
                    ?
                  </div>
                  <span className="text-xs font-bold block text-[var(--text-main)]">Open Slot</span>
                  <span className="text-[10px] text-[var(--text-muted)] block">Awaiting Contender</span>
                </div>
              )}
            </div>

            {duel.opponent ? (
              <Link
                href={`/friends/${duel.opponent.handle.replace(/^@/, '')}`}
                className="w-full py-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 text-[var(--text-main)] text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors active:scale-95"
              >
                <span>View Profile</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            ) : (
              <div className="w-full py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.05] text-[var(--text-muted)] text-[11px] font-semibold text-center">
                Join to Clash
              </div>
            )}
          </div>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#140826] dark:bg-white text-white dark:text-[#140826] font-black text-[10px] flex items-center justify-center shadow-lg border-2 border-white dark:border-[#140826]">
            VS
          </div>
        </section>

        {/* Stakes Bounty Pool Card */}
        <section className="p-4 rounded-[28px] bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 border border-purple-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-[#6366F1]" />
              <span>Prize Bounty Pool</span>
            </span>
            <span className="text-sm font-black text-[#6366F1] dark:text-purple-300">
              {duel.mode === 'STAKED' ? `${totalPrize} PTS Winner Takes All` : 'Glory & Honor'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-[var(--text-muted)]">
            <div>
              <span className="block font-medium">Individual Stake</span>
              <span className="font-bold text-[var(--text-main)]">{duel.stakeAmount} PTS</span>
            </div>
            <div>
              <span className="block font-medium">Division Class</span>
              <span className="font-bold text-[var(--text-main)]">{duel.challenger.tier}</span>
            </div>
          </div>
        </section>

        {/* Official Arena Rules */}
        <section className="p-4 rounded-[28px] bg-white/80 dark:bg-[#140826]/80 border border-black/[0.06] dark:border-white/10 space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Arena Clash Protocols</span>
          </h3>
          <div className="space-y-2 text-xs text-[var(--text-muted)]">
            <p>• <strong>Weight-Class Parity:</strong> Contenders compete within verified rating tiers.</p>
            <p>• <strong>In-Memory Evaluation:</strong> Zero persistent storage of facial biometric data.</p>
            <p>• <strong>Instant Settlement:</strong> Points ledger updates immediately when both scores are locked.</p>
          </div>
        </section>

        {/* Action Controls */}
        <section className="space-y-2 pt-2">
          {canJoin ? (
            <button
              disabled={isJoining}
              onClick={handleAcceptDuel}
              className="w-full py-4 rounded-full bg-[#140826] dark:bg-white hover:bg-[#251040] dark:hover:bg-zinc-200 text-white dark:text-[#140826] font-bold text-xs flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-transform"
            >
              <Swords className="w-4 h-4" />
              <span>{isJoining ? 'Entering Clash...' : `Accept Duel & Take Selfie (${duel.stakeAmount} PTS)`}</span>
            </button>
          ) : isMine ? (
            <button
              onClick={copyLink}
              className="w-full py-3.5 rounded-full bg-[#140826] dark:bg-white text-white dark:text-[#140826] font-bold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Duel Link Copied!' : 'Copy Match Invite Link'}</span>
            </button>
          ) : (
            <div className="p-3 text-center text-xs font-bold text-[var(--text-muted)] bg-black/5 dark:bg-white/5 rounded-2xl">
              This clash is completed or not currently open to new entrants.
            </div>
          )}

          <Link
            href={challengerProfileUrl}
            className="w-full py-3 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 text-[var(--text-main)] text-xs font-semibold text-center transition-colors flex items-center justify-center gap-1.5"
          >
            <User className="w-3.5 h-3.5" />
            <span>View Challenger Profile ({duel.challenger.handle})</span>
          </Link>
        </section>

      </main>

      <BottomNav />
    </div>
  );
}

export default function DuelDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg-page)]" />}>
      <DuelDetailPageContent />
    </Suspense>
  );
}
