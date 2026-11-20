'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Swords,
  CheckCircle2,
  Coins,
  Copy,
  Check,
  ExternalLink,
  User,
  AlertCircle,
  Camera,
  Lock,
  Trophy,
} from 'lucide-react';
import { BottomNav } from '@/components/navigation/BottomNav';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { UserAvatar } from '@/components/common/UserAvatar';
import { useCard } from '@/hooks/useCard';
import { useFaceoff } from '@/hooks/useFaceoff';
import { useToast } from '@/components/common/ToastProvider';
import { DuelDetail, faceoffService } from '@/services/faceoffService';

function DuelDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const duelId = (params?.id as string) || '';
  const { showToast } = useToast();

  const { activeCard } = useCard();
  const { joinDuel } = useFaceoff();

  const [duel, setDuel] = useState<DuelDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [isLockingIn, setIsLockingIn] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadDuel = useCallback(async () => {
    if (!duelId) {
      setIsLoading(false);
      return;
    }
    try {
      const data = await faceoffService.getDuelById(duelId);
      if (data.success && data.duel) {
        setDuel(data.duel);
      } else {
        setDuel(null);
      }
    } catch (err) {
      console.warn('Failed to load duel:', err);
    } finally {
      setIsLoading(false);
    }
  }, [duelId]);

  useEffect(() => {
    void loadDuel();
  }, [loadDuel]);

  useEffect(() => {
    if (!duel?.id) return;
    if (duel.status === 'COMPLETED' || duel.status === 'EXPIRED' || duel.status === 'CANCELLED') {
      return;
    }
    const timer = setInterval(() => {
      void loadDuel();
    }, 4000);
    return () => clearInterval(timer);
  }, [duel?.id, duel?.status, loadDuel]);

  const handleAcceptDuel = async () => {
    if (!duel) return;
    try {
      setIsJoining(true);
      const res = await joinDuel(duel.id);
      if (res.success) {
        showToast('Duel accepted! Proceeding to selfie scan...');
        setTimeout(() => router.push(`/scan?duelId=${duel.id}`), 800);
      } else {
        showToast(res.message || 'Could not enter duel');
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to join duel');
    } finally {
      setIsJoining(false);
    }
  };

  const handleLockIn = async () => {
    if (!duel || isLockingIn) return;
    try {
      setIsLockingIn(true);
      await faceoffService.lockInScore(duel.id);
      await loadDuel();
      showToast('Score locked in!', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to lock in score', 'error');
    } finally {
      setIsLockingIn(false);
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
        <main className="max-w-6xl xl:max-w-7xl mx-auto px-5 sm:px-8 pt-5 space-y-5 animate-pulse">
          <header className="flex items-center justify-between h-10 px-1">
            <div className="w-9 h-9 rounded-full bg-[var(--surface-secondary)]" />
            <div className="w-24 h-5 rounded bg-[var(--surface-secondary)]" />
            <div className="w-9 h-9 rounded-full bg-[var(--surface-secondary)]" />
          </header>
          <div className="h-64 rounded-[32px] bg-[var(--surface-secondary)]" />
          <div className="h-40 rounded-[24px] bg-[var(--surface-secondary)]" />
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!duel) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-[var(--bg-surface-warm)] flex items-center justify-center text-[var(--text-muted)]">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-[var(--text-main)]">Duel Not Found</h2>
          <p className="text-xs text-[var(--text-muted)]">This duel challenge may have expired, settled, or does not exist.</p>
        </div>
        <Link
          href="/faceoff"
          className="py-2.5 px-5 rounded-full bg-[#251E24] dark:bg-white text-white dark:text-[#251E24] text-xs font-bold shadow-sm"
        >
          Return to Arena
        </Link>
      </div>
    );
  }

  const isExpired = new Date(duel.expiresAt).getTime() <= Date.now();
  const canJoin = duel.status === 'WAITING' && !isExpired && !duel.isParticipant && activeCard?.id !== duel.challenger.id;
  const me = duel.myRole === 'CHALLENGER' ? duel.challenger : duel.myRole === 'OPPONENT' ? duel.opponent : null;
  const totalPrize = duel.stakeAmount ? duel.stakeAmount * 2 : 0;
  const challengerProfileUrl = `/friends/${duel.challenger.handle.replace(/^@/, '')}`;
  const isActiveRound = duel.status === 'ACTIVE' || duel.status === 'TIE_REMATCH';

  const formatScore = (score: number | null, hidden?: boolean, attemptsUsed?: number) => {
    if (score !== null && score !== undefined) return `${score}/100`;
    if (hidden || (attemptsUsed && attemptsUsed > 0)) return '••';
    return '—';
  };

  return (
    <div className="relative min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] font-sans antialiased pb-32 md:pl-16 lg:pl-52">
      <div
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-75 dark:opacity-25"
        style={{
          background: `
            radial-gradient(ellipse at 50% -10%, rgba(244, 114, 182, 0.06) 0%, transparent 55%),
            radial-gradient(ellipse at 85% 35%, rgba(251, 146, 60, 0.05) 0%, transparent 45%),
            radial-gradient(ellipse at 15% 70%, rgba(99, 102, 241, 0.04) 0%, transparent 50%)
          `,
        }}
      />

      <main className="relative z-10 max-w-6xl xl:max-w-7xl mx-auto px-5 sm:px-8 pt-5 space-y-5">
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

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#251E24] text-white dark:bg-white dark:text-[#251E24]">
              {duel.challenger.tier} Division
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--bg-surface-warm)] text-[var(--accent-brand)]">
              {duel.mode === 'STAKED' ? `${duel.stakeAmount} PTS Stake` : 'Friendly Match'}
            </span>
          </div>
          <span className="text-xs font-bold text-[var(--text-muted)]">
            Round {duel.currentRound} · {duel.status.replace(/_/g, ' ')}
          </span>
        </div>

        {duel.status === 'COMPLETED' && (
          <div className="p-4 rounded-[24px] bg-[var(--surface-accent)] border border-[var(--border-strong)] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Trophy className="w-5 h-5 text-[var(--accent-brand)]" />
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-[var(--accent-brand)] block">
                  {duel.winnerId ? 'Match Completed' : 'Draw · Stakes Refunded'}
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  Final: {duel.challenger.score ?? '—'}/100 vs {duel.opponent?.score ?? '—'}/100
                </span>
              </div>
            </div>
            {(duel.payout > 0 || duel.winBonus > 0) && (
              <span className="text-xs font-black text-emerald-500">
                +{duel.payout + duel.winBonus} PTS
              </span>
            )}
          </div>
        )}

        <section className="grid grid-cols-2 gap-3 relative">
          {/* Challenger */}
          <div className="p-4 rounded-[28px] bg-[var(--surface)] border border-[var(--border-card)] shadow-sm space-y-3 flex flex-col justify-between">
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
                  <span className="text-[var(--text-muted)]">Lethality</span>
                  <span className="font-mono font-black text-[var(--text-main)]">
                    {formatScore(duel.challenger.score, duel.challenger.scoreHidden, duel.challenger.attemptsUsed)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Attempts</span>
                  <span className="font-bold text-[var(--accent-brand)]">
                    {duel.challenger.attemptsUsed} / {duel.maxAttemptsPerRound}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Status</span>
                  <span className="font-bold text-[var(--text-main)]">
                    {duel.challenger.lockedIn ? 'Locked In' : 'Open'}
                  </span>
                </div>
              </div>
            </div>

            <Link
              href={challengerProfileUrl}
              className="w-full py-2 rounded-xl bg-[var(--bg-surface-warm)] hover:bg-black/10 text-[var(--text-main)] text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors active:scale-95"
            >
              <span>View Profile</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          {/* Opponent */}
          <div className="p-4 rounded-[28px] bg-[var(--surface)] border border-[var(--border-card)] shadow-sm space-y-3 flex flex-col justify-between">
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
                      <span className="text-[var(--text-muted)]">Lethality</span>
                      <span className="font-mono font-black text-[var(--text-main)]">
                        {formatScore(duel.opponent.score, duel.opponent.scoreHidden, duel.opponent.attemptsUsed)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Attempts</span>
                      <span className="font-bold text-[var(--accent-brand)]">
                        {duel.opponent.attemptsUsed} / {duel.maxAttemptsPerRound}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Status</span>
                      <span className="font-bold text-[var(--text-main)]">
                        {duel.opponent.lockedIn ? 'Locked In' : 'Open'}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-4 space-y-1">
                  <div className="w-10 h-10 mx-auto rounded-full bg-[var(--bg-surface-warm)] text-purple-600 font-black flex items-center justify-center text-xs">
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
                className="w-full py-2 rounded-xl bg-[var(--bg-surface-warm)] hover:bg-black/10 text-[var(--text-main)] text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors active:scale-95"
              >
                <span>View Profile</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            ) : (
              <div className="w-full py-2 rounded-xl bg-[var(--bg-surface-warm)] text-[var(--text-muted)] text-[11px] font-semibold text-center">
                Join to Clash
              </div>
            )}
          </div>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#251E24] dark:bg-white text-white dark:text-[#251E24] font-black text-[10px] flex items-center justify-center shadow-lg border-2 border-white dark:border-[var(--bg-surface)]">
            VS
          </div>
        </section>

        <section className="p-4 rounded-[28px] bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 border border-[var(--border-card)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-[var(--accent-brand)]" />
              <span>Prize Bounty Pool</span>
            </span>
            <span className="text-sm font-black text-[var(--accent-brand)] dark:text-[#D2B8C9]">
              {duel.mode === 'STAKED' ? `${totalPrize} PTS Winner Takes All` : 'Glory & Honor'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-[var(--text-muted)]">
            <div>
              <span className="block font-medium">Individual Stake</span>
              <span className="font-bold text-[var(--text-main)]">{duel.stakeAmount} PTS</span>
            </div>
            <div>
              <span className="block font-medium">Attempts Per Round</span>
              <span className="font-bold text-[var(--text-main)]">{duel.maxAttemptsPerRound} attempts (best kept)</span>
            </div>
          </div>
        </section>

        <section className="p-4 rounded-[28px] bg-[var(--surface)] border border-[var(--border-card)] space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Arena Clash Protocols</span>
          </h3>
          <div className="space-y-2 text-xs text-[var(--text-muted)]">
            <p>• <strong>Two Attempts:</strong> Best valid Lethality Score counts; auto-locks after attempt 2.</p>
            <p>• <strong>Concealed Scores:</strong> Opponent score stays hidden until both participants lock in.</p>
            <p>• <strong>Instant Settlement:</strong> Points ledger updates immediately when both scores are locked.</p>
          </div>
        </section>

        <section className="space-y-2 pt-2">
          {canJoin ? (
            <button
              disabled={isJoining}
              onClick={handleAcceptDuel}
              className="w-full py-4 rounded-full bg-[#251E24] dark:bg-white hover:bg-[#3A2F38] dark:hover:bg-zinc-200 text-white dark:text-[#251E24] font-bold text-xs flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-transform cursor-pointer"
            >
              <Swords className="w-4 h-4" />
              <span>{isJoining ? 'Entering Clash...' : `Accept Duel & Take Selfie (${duel.stakeAmount} PTS)`}</span>
            </button>
          ) : duel.isParticipant && isActiveRound && me && !me.lockedIn ? (
            <>
              {me.attemptsRemaining > 0 && (
                <button
                  onClick={() => router.push(`/scan?duelId=${duel.id}`)}
                  className="w-full py-4 rounded-full bg-[#251E24] dark:bg-white hover:bg-[#3A2F38] dark:hover:bg-zinc-200 text-white dark:text-[#251E24] font-bold text-xs flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-transform cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>
                    {me.attemptsUsed > 0
                      ? `Take Attempt ${me.attemptsUsed + 1} of ${duel.maxAttemptsPerRound}`
                      : 'Take Match Scan'}
                  </span>
                </button>
              )}
              {me.attemptsUsed > 0 && (
                <button
                  disabled={isLockingIn}
                  onClick={handleLockIn}
                  className="w-full py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform cursor-pointer disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  <span>{isLockingIn ? 'Locking In...' : `Lock In My Score (${me.score ?? 0}/100)`}</span>
                </button>
              )}
            </>
          ) : duel.isParticipant ? (
            <button
              onClick={copyLink}
              className="w-full py-3.5 rounded-full bg-[#251E24] dark:bg-white text-white dark:text-[#251E24] font-bold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform cursor-pointer"
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
            className="w-full py-3 rounded-full bg-[var(--bg-surface-warm)] hover:bg-black/10 text-[var(--text-main)] text-xs font-semibold text-center transition-colors flex items-center justify-center gap-1.5"
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
