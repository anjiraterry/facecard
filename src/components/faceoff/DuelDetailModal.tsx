'use client';

import React from 'react';
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
} from 'lucide-react';
import { DuelItem } from '@/services/faceoffService';
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
  const [copied, setCopied] = React.useState(false);

  if (!duel) return null;

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
          <section className="grid grid-cols-2 gap-3 relative">
            <div className="p-4 rounded-2xl bg-[var(--bg-surface-warm)] border border-[var(--border-subtle)] space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5">
                  <UserAvatar
                    name={duel.handle || duel.opponentName}
                    src={duel.iconAvatar || duel.image}
                    size="md"
                    className="w-10 h-10 ring-1 ring-[var(--border-card)]"
                  />
                  <div className="min-w-0">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] block uppercase tracking-[0.08em]">
                      Challenger
                    </span>
                    <span className="text-xs font-bold text-[var(--text-main)] truncate block">
                      {opponentHandle}
                    </span>
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-xs tabular-nums">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-muted)]">Index</span>
                    <span className="font-bold text-[var(--text-main)]">{duel.score}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-muted)]">Division</span>
                    <span className="font-semibold text-[var(--accent-brand)]">{duel.requiredTier || duel.tier}</span>
                  </div>
                </div>
              </div>

              {profileUrl ? (
                <Link
                  href={profileUrl}
                  onClick={onClose}
                  className="w-full py-2 rounded-full bg-[var(--bg-surface)] hover:bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-main)] text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>View Profile</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              ) : (
                <div className="w-full py-2 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-muted)] text-[11px] font-medium text-center">
                  Open Challenge
                </div>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-[var(--bg-surface-warm)] border border-[var(--border-subtle)] space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-[var(--bg-secondary)] text-[var(--text-main)] font-bold flex items-center justify-center text-xs border border-[var(--border-card)]">
                    YOU
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] block uppercase tracking-[0.08em]">
                      Contender
                    </span>
                    <span className="text-xs font-bold text-[var(--text-main)] truncate block">
                      {duel.isMine ? 'Awaiting Rival' : 'Your Rating'}
                    </span>
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-xs tabular-nums">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-muted)]">Your Index</span>
                    <span className="font-bold text-[var(--text-main)]">{currentUserScore || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-muted)]">Your Tier</span>
                    <span className="font-semibold text-[var(--accent-brand)]">{currentUserTier}</span>
                  </div>
                </div>
              </div>

              <div className="w-full py-2 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-muted)] text-[11px] font-medium text-center">
                {duel.sameTier === false ? 'Tier Mismatch' : 'Parity Verified'}
              </div>
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
                <span className="block">Division Parity</span>
                <span className="font-semibold text-[var(--text-main)]">{duel.requiredTier || duel.tier}</span>
              </div>
            </div>
          </section>

          <section className="p-4 rounded-2xl bg-[var(--bg-surface-warm)] border border-[var(--border-subtle)] space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)] flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-[var(--status-success)]" />
              <span>Arena Match Rules</span>
            </h3>
            <ul className="space-y-1.5 text-xs text-[var(--text-muted)]">
              <li>• <strong className="text-[var(--text-main)]">Same-Tier Parity:</strong> Both contenders match within the same tier.</li>
              <li>• <strong className="text-[var(--text-main)]">10-Minute Window:</strong> Capture your match scan before the timer closes.</li>
              <li>• <strong className="text-[var(--text-main)]">Zero Photo Storage:</strong> Evaluated in ephemeral memory only.</li>
            </ul>
          </section>
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
              {duel.status === 'WAITING' ? (
                <>
                  <div className="p-3 rounded-2xl bg-[var(--status-warning-bg)] border border-[var(--status-warning)]/25 text-center space-y-1">
                    <span className="text-[11px] font-semibold text-[var(--status-warning)] uppercase tracking-wider block">
                      Awaiting Opponent Confirmation
                    </span>
                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                      Share your invite link. Once accepted, both contenders submit their match scans.
                    </p>
                  </div>
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
              ) : duel.status === 'ACTIVE' ? (
                <>
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
                    <span>Take Match Scan</span>
                  </Button>
                  <Button variant="ghost" size="sm" fullWidth onClick={copyLink}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Duel Link Copied' : 'Copy Match Invite Link'}</span>
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
