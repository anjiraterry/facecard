'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  X, 
  Swords, 
  Flame, 
  ShieldCheck, 
  Clock, 
  Award, 
  Copy, 
  Check, 
  User, 
  ExternalLink,
  Coins,
  Sparkles,
  Camera
} from 'lucide-react';
import { DuelItem } from '@/services/faceoffService';
import { UserAvatar } from '@/components/common/UserAvatar';

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

  const opponentHandle = duel.handle?.startsWith('@') ? duel.handle : `@${duel.handle || 'opponent'}`;
  const profileUrl = `/friends/${duel.targetUserId || duel.opponentId || opponentHandle.replace(/^@/, '')}`;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-lg rounded-[32px] bg-white dark:bg-[#140826] text-[var(--text-main)] border border-black/10 dark:border-white/15 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Glow */}
        <div 
          className="pointer-events-none absolute inset-0 z-0 opacity-40 dark:opacity-20"
          style={{
            background: 'radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.25) 0%, transparent 60%)'
          }}
        />

        {/* Modal Header */}
        <div className="relative z-10 p-5 pb-3 flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#140826] text-white dark:bg-white dark:text-[#140826]">
              {duel.requiredTier || duel.tier} Division
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-300">
              {duel.mode === 'STAKED' ? `${duel.stakeAmount} PTS Stake` : 'Friendly Match'}
            </span>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="relative z-10 p-5 space-y-5 overflow-y-auto">

          {/* Contenders Face-Off Matchup Cards */}
          <section className="grid grid-cols-2 gap-3 relative">
            {/* Challenger Card */}
            <div className="p-4 rounded-[24px] bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/10 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5">
                  <UserAvatar
                    name={duel.handle || duel.opponentName}
                    src={duel.iconAvatar || duel.image}
                    size="md"
                    className="w-10 h-10 ring-2 ring-black/10 dark:ring-white/20"
                  />
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold text-[var(--text-muted)] block uppercase tracking-wider">
                      Challenger
                    </span>
                    <span className="text-xs font-black text-[var(--text-main)] truncate block">
                      {opponentHandle}
                    </span>
                  </div>
                </div>

                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-muted)]">Verified Score</span>
                    <span className="font-mono font-black text-[var(--text-main)]">★ {duel.score}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-muted)]">Division</span>
                    <span className="font-bold text-purple-600 dark:text-purple-300">{duel.requiredTier || duel.tier}</span>
                  </div>
                </div>
              </div>

              {/* View Challenger Profile CTA */}
              <Link
                href={profileUrl}
                onClick={onClose}
                className="w-full py-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 text-[var(--text-main)] text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors active:scale-95"
              >
                <span>View Profile</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            {/* Opponent Card (You or Open Spot) */}
            <div className="p-4 rounded-[24px] bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/10 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-300 font-black flex items-center justify-center text-xs ring-2 ring-purple-500/30">
                    YOU
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold text-[var(--text-muted)] block uppercase tracking-wider">
                      Contender
                    </span>
                    <span className="text-xs font-black text-[var(--text-main)] truncate block">
                      {duel.isMine ? 'Waiting for Player' : 'Your Rating'}
                    </span>
                  </div>
                </div>

                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-muted)]">Your Score</span>
                    <span className="font-mono font-black text-[var(--text-main)]">★ {currentUserScore || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-muted)]">Your Tier</span>
                    <span className="font-bold text-purple-600 dark:text-purple-300">{currentUserTier}</span>
                  </div>
                </div>
              </div>

              <div className="w-full py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.05] text-[var(--text-muted)] text-[11px] font-semibold text-center">
                {duel.sameTier === false ? 'Tier Mismatch' : 'Fair Parity Verified'}
              </div>
            </div>

            {/* Floating VS Badge in center */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#140826] dark:bg-white text-white dark:text-[#140826] font-black text-[10px] flex items-center justify-center shadow-lg border-2 border-white dark:border-[#140826]">
              VS
            </div>
          </section>

          {/* Stakes & Prize Bounty Box */}
          <section className="p-4 rounded-[24px] bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 border border-purple-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-[#6366F1]" />
                <span>Prize Bounty Pool</span>
              </span>
              <span className="text-sm font-black text-[#6366F1] dark:text-purple-300">
                {duel.mode === 'STAKED' ? `${totalPrize} PTS Winner Takes All` : 'Friendly Glory'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-[var(--text-muted)]">
              <div>
                <span className="block font-medium">Entry Stake</span>
                <span className="font-bold text-[var(--text-main)]">{duel.stake}</span>
              </div>
              <div>
                <span className="block font-medium">Lethality Parity</span>
                <span className="font-bold text-[var(--text-main)]">{duel.requiredTier || duel.tier} Required</span>
              </div>
            </div>
          </section>

          {/* Official Arena Match Rules */}
          <section className="p-4 rounded-[24px] bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/10 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Official Arena Duel Rules</span>
            </h3>

            <div className="space-y-2 text-xs text-[var(--text-muted)]">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                <span><strong>Weight-Class Parity:</strong> Both fighters must be in the same tier to protect stakes fairness.</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                <span><strong>10-Minute Battle Window:</strong> Contenders must capture their selfie before the match timer expires.</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                <span><strong>In-Memory AI Evaluation:</strong> Photos are evaluated in ephemeral memory for tamper-proof lethality scores.</span>
              </div>
            </div>
          </section>

        </div>

        {/* Modal Actions Footer */}
        <div className="relative z-10 p-5 pt-3 border-t border-black/[0.06] dark:border-white/[0.08] space-y-2">
          {duel.canJoin ? (
            <button
              disabled={isJoining}
              onClick={() => onAccept(duel.id, opponentHandle)}
              className="w-full py-3.5 rounded-full bg-[#140826] dark:bg-white hover:bg-[#251040] dark:hover:bg-zinc-200 text-white dark:text-[#140826] font-bold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-[0.99] transition-transform"
            >
              <Swords className="w-4 h-4" />
              <span>{isJoining ? 'Entering Duel...' : `Accept Match & Take Selfie (${duel.stake})`}</span>
            </button>
          ) : duel.isMine ? (
            <div className="space-y-2">
              {duel.status === 'WAITING' ? (
                <>
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center space-y-1">
                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                      Awaiting Opponent Confirmation
                    </span>
                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                      This duel is not confirmed yet. Share your invite link. Once an opponent accepts, both fighters will have 24 hours to submit their match selfies.
                    </p>
                  </div>
                  <button
                    onClick={copyLink}
                    className="w-full py-3 rounded-full bg-[#6366F1] hover:bg-[#5558E6] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs active:scale-[0.99] transition-transform cursor-pointer"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Duel Link Copied!' : 'Copy Match Invite Link'}</span>
                  </button>
                  {onCancel && (
                    <button
                      disabled={isCancelling}
                      onClick={() => onCancel(duel.id)}
                      className="w-full py-2.5 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>{isCancelling ? 'Cancelling...' : 'Cancel Challenge & Refund Stake'}</span>
                    </button>
                  )}
                </>
              ) : duel.status !== 'COMPLETED' ? (
                <>
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-1">
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                      Match Confirmed (Active)
                    </span>
                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                      Both contenders are committed! Take your match scan now to lock in your lethality score.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      router.push(`/scan?duelId=${duel.id}`);
                    }}
                    className="w-full py-3.5 rounded-full bg-[#6366F1] hover:bg-[#5558E6] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-[0.99] transition-transform cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Take Match Scan</span>
                  </button>
                  <button
                    onClick={copyLink}
                    className="w-full py-2.5 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 text-[var(--text-main)] font-bold text-xs flex items-center justify-center gap-2 shadow-xs active:scale-[0.99] transition-transform cursor-pointer"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Duel Link Copied!' : 'Copy Match Invite Link'}</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={copyLink}
                  className="w-full py-2.5 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 text-[var(--text-main)] font-bold text-xs flex items-center justify-center gap-2 shadow-xs active:scale-[0.99] transition-transform cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Duel Link Copied!' : 'Copy Match Link'}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="p-3 text-center text-xs font-bold text-[var(--text-muted)] bg-black/5 dark:bg-white/5 rounded-2xl">
              {duel.sameTier === false 
                ? `You must be in the ${duel.requiredTier || duel.tier} tier to join this clash.`
                : 'This duel is currently not available to enter.'}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Link
              href={profileUrl}
              onClick={onClose}
              className="flex-1 py-2.5 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 text-[var(--text-main)] text-xs font-semibold text-center transition-colors flex items-center justify-center gap-1.5"
            >
              <User className="w-3.5 h-3.5" />
              <span>View {opponentHandle}’s Profile</span>
            </Link>
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 text-[var(--text-muted)] text-xs font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
