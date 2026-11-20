'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  X,
  Swords,
  Lock,
  Copy,
  Check,
  User,
  ExternalLink,
  Coins,
  Camera,
  Trophy,
  RefreshCw,
} from 'lucide-react';
import { DuelDetail, DuelItem, faceoffService } from '@/services/faceoffService';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Button } from '@/components/ui/Button';

interface DuelDetailModalProps {
  duel: DuelItem | null;
  onClose: () => void;
  onAccept: (duelId: string, opponentName: string) => void;
  onCancel?: (duelId: string) => Promise<void>;
  isJoining: boolean;
  isCancelling?: boolean;
  currentUserTier?: string;
  currentUserScore?: number;
}

export function DuelDetailModal({
  duel,
  onClose,
  onAccept,
  onCancel,
  isJoining,
  isCancelling,
  currentUserTier = 'CLASSIC',
  currentUserScore = 0,
}: DuelDetailModalProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [detail, setDetail] = useState<DuelDetail | null>(null);
  const [isLockingIn, setIsLockingIn] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);

  const loadDetail = useCallback(async (duelId: string) => {
    try {
      const res = await faceoffService.getDuelById(duelId);
      if (res.success && res.duel) {
        setDetail(res.duel);
      }
    } catch {
      // Ignore transient fetch failures
    }
  }, []);

  useEffect(() => {
    if (!duel?.id) {
      setDetail(null);
      return;
    }
    void loadDetail(duel.id);
    const interval = setInterval(() => {
      if (
        detail?.status === 'COMPLETED' ||
        detail?.status === 'EXPIRED' ||
        detail?.status === 'CANCELLED'
      ) {
        return;
      }
      void loadDetail(duel.id);
    }, 4000);
    return () => clearInterval(interval);
  }, [duel?.id, detail?.status, loadDetail]);

  if (!duel) return null;

  const activeStatus = detail?.status ?? duel.status;
  const isOpenWaiting = duel.handle === 'Waiting for Rival';
  const opponentHandle = isOpenWaiting
    ? 'Open Arena Slot'
    : duel.handle?.startsWith('@')
    ? duel.handle
    : `@${duel.handle || 'opponent'}`;
  const profileUrl = isOpenWaiting
    ? null
    : `/friends/${duel.targetUserId || duel.opponentId || opponentHandle.replace(/^@/, '')}`;
  const totalPrize = duel.stakeAmount ? duel.stakeAmount * 2 : 0;

  const me = detail
    ? detail.myRole === 'CHALLENGER'
      ? detail.challenger
      : detail.myRole === 'OPPONENT'
      ? detail.opponent
      : null
    : null;
  const opp = detail
    ? detail.myRole === 'CHALLENGER'
      ? detail.opponent
      : detail.myRole === 'OPPONENT'
      ? detail.challenger
      : null
    : null;

  const maxAttempts = detail?.maxAttemptsPerRound ?? duel.maxAttemptsPerRound ?? 2;

  const handleLockIn = async () => {
    if (isLockingIn) return;
    try {
      setIsLockingIn(true);
      setLockError(null);
      await faceoffService.lockInScore(duel.id);
      await loadDetail(duel.id);
    } catch (err) {
      setLockError(err instanceof Error ? err.message : 'Failed to lock in score');
    } finally {
      setIsLockingIn(false);
    }
  };

  const copyLink = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      const url = duel.inviteCode
        ? `${window.location.origin}/faceoff?duel=${duel.inviteCode}`
        : `${window.location.origin}/faceoff/${duel.id}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isCompleted = activeStatus === 'COMPLETED';
  const isTieRematch = activeStatus === 'TIE_REMATCH';
  const isSettling = activeStatus === 'READY_TO_SETTLE' || activeStatus === 'SETTLING';
  const isWinner = Boolean(isCompleted && detail?.winnerId && me && detail.winnerId === me.id);
  const isDraw = Boolean(isCompleted && !detail?.winnerId);
  const isLoss = Boolean(isCompleted && detail?.winnerId && me && detail.winnerId !== me.id);

  const statusExplanation = (() => {
    if (isCompleted) {
      if (isWinner) return 'Match completed — you won!';
      if (isLoss) return 'Match completed — opponent won this round.';
      if (isDraw) return 'Match ended in a draw after rematch.';
      return 'Match completed.';
    }
    if (activeStatus === 'EXPIRED') return 'Match expired before completion.';
    if (activeStatus === 'CANCELLED') return 'Match was cancelled.';
    if (isSettling) return 'Both participants locked in — settling match...';
    if (isTieRematch) return 'Round 1 ended in a tie! Complete Round 2 rematch.';
    if (activeStatus === 'WAITING') return 'Waiting for an opponent to accept the challenge.';
    if (me && opp) {
      if (!me.lockedIn && me.attemptsUsed === 0) return 'Take your first match scan to enter the round.';
      if (!me.lockedIn) return `You have ${me.attemptsRemaining} attempt${me.attemptsRemaining === 1 ? '' : 's'} left. You can lock in your best score now.`;
      if (opp.attemptsUsed === 0) return "Waiting for opponent's first scan.";
      if (!opp.lockedIn && opp.attemptsRemaining > 0) return `Opponent has ${opp.attemptsRemaining} remaining attempt${opp.attemptsRemaining === 1 ? '' : 's'}.`;
      if (!opp.lockedIn) return 'Waiting for opponent to lock in.';
      return 'Both participants ready.';
    }
    return 'Match in progress.';
  })();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Arena duel details"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#251E24]/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-[28px] bg-[var(--bg-surface)] text-[var(--text-main)] border border-[var(--border-card)] shadow-[var(--shadow-modal)] overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 pb-3.5 flex items-center justify-between border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.08em] bg-[var(--accent-primary)] text-[var(--bg-page)]">
              {duel.requiredTier || duel.tier} Division
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--bg-surface-warm)] text-[var(--text-secondary)]">
              {duel.mode === 'STAKED' ? `${duel.stakeAmount} PTS Stake` : 'Friendly Match'}
            </span>
            {detail && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--bg-surface-warm)] text-[var(--text-muted)]">
                Round {detail.currentRound}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close duel details"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-warm)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Status Banner */}
          <div className="p-3 rounded-2xl bg-[var(--bg-surface-warm)] border border-[var(--border-subtle)] flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-[var(--text-main)]">{statusExplanation}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[var(--bg-surface)] text-[var(--accent-brand)] shrink-0">
              {activeStatus.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Outcome Summary for Completed Matches */}
          {isCompleted && detail && (
            <div className="p-4 rounded-2xl bg-[var(--surface-accent)] border border-[var(--border-strong)] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Trophy className="w-5 h-5 text-[var(--accent-brand)]" />
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-[var(--accent-brand)] block">
                    {isWinner ? 'Arena Victory' : isDraw ? 'Draw · Stakes Refunded' : isLoss ? 'Arena Defeat' : 'Match Settled'}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    Final: {detail.challenger.score ?? '—'}/100 vs {detail.opponent?.score ?? '—'}/100
                  </span>
                </div>
              </div>
              {isWinner && (detail.payout > 0 || detail.winBonus > 0) && (
                <span className="text-xs font-black text-emerald-500">
                  +{detail.payout + detail.winBonus} PTS
                </span>
              )}
            </div>
          )}

          <section className="grid grid-cols-2 gap-3 relative">
            {/* Left Card: You (if participant) or Challenger */}
            <div className="p-4 rounded-2xl bg-[var(--bg-surface-warm)] border border-[var(--border-subtle)] space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-[var(--bg-secondary)] text-[var(--text-main)] font-bold flex items-center justify-center text-xs border border-[var(--border-card)]">
                    {me ? 'YOU' : 'CH'}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] block uppercase tracking-[0.08em]">
                      {me ? 'You' : 'Challenger'}
                    </span>
                    <span className="text-xs font-bold text-[var(--text-main)] truncate block">
                      {me ? me.handle : detail?.challenger.handle || opponentHandle}
                    </span>
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-xs tabular-nums">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-muted)]">Lethality</span>
                    <span className="font-bold text-[var(--text-main)]">
                      {me
                        ? me.score !== null
                          ? `${me.score}/100`
                          : '—'
                        : detail?.challenger.score !== null && detail?.challenger.score !== undefined
                        ? `${detail.challenger.score}/100`
                        : detail?.challenger.scoreHidden
                        ? '••'
                        : currentUserScore || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-muted)]">Attempts</span>
                    <span className="font-semibold text-[var(--accent-brand)]">
                      {me ? `${me.attemptsUsed} / ${maxAttempts}` : `0 / ${maxAttempts}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-muted)]">Status</span>
                    <span className="font-semibold text-[var(--text-main)]">
                      {me?.lockedIn ? 'Locked In' : 'Not Locked'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Card: Opponent */}
            <div className="p-4 rounded-2xl bg-[var(--bg-surface-warm)] border border-[var(--border-subtle)] space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5">
                  <UserAvatar
                    name={opp?.handle || duel.handle || duel.opponentName}
                    src={opp?.avatar || duel.iconAvatar || duel.image}
                    size="md"
                    className="w-10 h-10 ring-1 ring-[var(--border-card)]"
                  />
                  <div className="min-w-0">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] block uppercase tracking-[0.08em]">
                      Opponent
                    </span>
                    <span className="text-xs font-bold text-[var(--text-main)] truncate block">
                      {opp ? opp.handle : opponentHandle}
                    </span>
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-xs tabular-nums">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-muted)]">Lethality</span>
                    <span className="font-bold text-[var(--text-main)]">
                      {opp
                        ? opp.score !== null
                          ? `${opp.score}/100`
                          : opp.scoreHidden || opp.attemptsUsed > 0
                          ? '••'
                          : '—'
                        : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-muted)]">Attempts</span>
                    <span className="font-semibold text-[var(--accent-brand)]">
                      {opp ? `${opp.attemptsUsed} / ${maxAttempts}` : `0 / ${maxAttempts}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-muted)]">Status</span>
                    <span className="font-semibold text-[var(--text-main)]">
                      {opp ? (opp.lockedIn ? 'Locked In' : opp.attemptsUsed > 0 ? 'Scanning' : 'Waiting') : 'Open'}
                    </span>
                  </div>
                </div>
              </div>

              {profileUrl && (
                <Link
                  href={profileUrl}
                  onClick={onClose}
                  className="w-full py-1.5 rounded-full bg-[var(--bg-surface)] hover:bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-main)] text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Profile</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>

            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[var(--accent-primary)] text-[var(--bg-page)] font-bold text-[10px] flex items-center justify-center shadow-[var(--shadow-sm)] border-2 border-[var(--bg-surface)]">
              VS
            </div>
          </section>

          <section className="p-4 rounded-2xl bg-[var(--bg-secondary)]/55 border border-[var(--border-card)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)] flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-[var(--accent-brand)]" />
                <span>Prize Bounty Pool</span>
              </span>
              <span className="text-sm font-bold text-[var(--text-main)] tabular-nums">
                {duel.mode === 'STAKED' ? `${totalPrize} PTS Winner Takes All` : 'Friendly Glory'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-[var(--text-muted)]">
              <div>
                <span className="block">Entry Stake</span>
                <span className="font-semibold text-[var(--text-main)]">{duel.stake}</span>
              </div>
              <div>
                <span className="block">Attempts Per Round</span>
                <span className="font-semibold text-[var(--text-main)]">{maxAttempts} attempts (best kept)</span>
              </div>
            </div>
          </section>

          <section className="p-4 rounded-2xl bg-[var(--bg-surface-warm)] border border-[var(--border-subtle)] space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)] flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-[var(--status-success)]" />
              <span>Arena Match Rules</span>
            </h3>
            <ul className="space-y-1.5 text-xs text-[var(--text-muted)]">
              <li>• <strong className="text-[var(--text-main)]">Two Attempts:</strong> Best valid Lethality Score counts; auto-locks after 2nd attempt.</li>
              <li>• <strong className="text-[var(--text-main)]">Concealed Scores:</strong> Opponent score stays hidden until both participants lock in.</li>
              <li>• <strong className="text-[var(--text-main)]">Tie Policy:</strong> Ties trigger 1 rematch round; a second tie ends in a draw.</li>
            </ul>
          </section>

          {lockError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-500 font-medium">
              {lockError}
            </div>
          )}
        </div>

        <div className="p-5 pt-3.5 border-t border-[var(--border-subtle)] space-y-2">
          {duel.canJoin ? (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isJoining}
              onClick={() => onAccept(duel.id, opponentHandle)}
            >
              <Swords className="w-4 h-4" />
              <span>{isJoining ? 'Entering Duel...' : `Accept Match & Scan (${duel.stake})`}</span>
            </Button>
          ) : duel.isMine ? (
            <div className="space-y-2">
              {activeStatus === 'WAITING' ? (
                <>
                  <Button variant="primary" size="md" fullWidth onClick={copyLink}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Duel Link Copied' : 'Copy Match Invite Link'}</span>
                  </Button>
                  {onCancel && (
                    <Button
                      variant="danger"
                      size="sm"
                      fullWidth
                      isLoading={isCancelling}
                      onClick={() => onCancel(duel.id)}
                    >
                      <span>{isCancelling ? 'Cancelling...' : 'Cancel Challenge & Refund Stake'}</span>
                    </Button>
                  )}
                </>
              ) : activeStatus === 'ACTIVE' || activeStatus === 'TIE_REMATCH' ? (
                <>
                  {(!me || (!me.lockedIn && me.attemptsRemaining > 0)) && (
                    <Button
                      variant="primary"
                      size="lg"
                      fullWidth
                      onClick={() => {
                        onClose();
                        router.push(`/scan?duelId=${duel.id}`);
                      }}
                    >
                      <Camera className="w-4 h-4" />
                      <span>
                        {me && me.attemptsUsed > 0
                          ? `Take Attempt ${me.attemptsUsed + 1} of ${maxAttempts}`
                          : 'Take Match Scan'}
                      </span>
                    </Button>
                  )}
                  {me && me.attemptsUsed > 0 && !me.lockedIn && (
                    <Button
                      variant="secondary"
                      size="md"
                      fullWidth
                      isLoading={isLockingIn}
                      onClick={handleLockIn}
                    >
                      <Lock className="w-4 h-4" />
                      <span>{isLockingIn ? 'Locking In...' : `Lock In My Score (${me.score ?? 0}/100)`}</span>
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" fullWidth onClick={() => loadDetail(duel.id)}>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh Match Status</span>
                  </Button>
                </>
              ) : (
                <Button variant="ghost" size="sm" fullWidth onClick={copyLink}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Duel Link Copied' : 'Copy Match Link'}</span>
                </Button>
              )}
            </div>
          ) : (
            <div className="p-3 text-center text-xs font-medium text-[var(--text-muted)] bg-[var(--bg-surface-warm)] rounded-2xl">
              {duel.sameTier === false
                ? `Requires ${duel.requiredTier || duel.tier} tier to enter.`
                : 'This duel is currently unavailable.'}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            {profileUrl && (
              <Link
                href={profileUrl}
                onClick={onClose}
                className="flex-1 py-2.5 rounded-full bg-[var(--bg-surface-warm)] hover:bg-[var(--bg-secondary)] text-[var(--text-main)] text-xs font-semibold text-center transition-colors flex items-center justify-center gap-1.5"
              >
                <User className="w-3.5 h-3.5" />
                <span>View {opponentHandle}’s Profile</span>
              </Link>
            )}
            <Button variant="ghost" size="sm" className={profileUrl ? '' : 'flex-1'} onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
