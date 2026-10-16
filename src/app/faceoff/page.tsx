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
  AlertCircle,
  Camera
} from 'lucide-react';
import { BottomNav } from '@/components/navigation/BottomNav';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { FaceOffMode } from '@/types';
import { useFaceoff } from '@/hooks/useFaceoff';
import { useCard } from '@/hooks/useCard';
import { UserAvatar } from '@/components/common/UserAvatar';
import { useToast } from '@/components/common/ToastProvider';
import { DuelDetailModal } from '@/components/faceoff/DuelDetailModal';
import { DuelItem } from '@/services/faceoffService';

function FaceOffContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const duelParam = searchParams.get('duel');
  const opponentParam = searchParams.get('opponent');
  const { showToast } = useToast();

  const { faceoffs, createChallenge, joinDuel, cancelDuel, refreshFaceoffs, isLoading } = useFaceoff();
  const { activeCard, spendableBalance, isLoading: cardLoading } = useCard();

  const [mode, setMode] = useState<FaceOffMode>('STAKED');
  const [stakeAmount, setStakeAmount] = useState<number>(100);
  const [targetHandle, setTargetHandle] = useState<string>(opponentParam || '');
  const [selectedDivision, setSelectedDivision] = useState<'ALL' | 'CLASSIC' | 'GOLD' | 'PLATINUM'>('ALL');
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [createdDuelId, setCreatedDuelId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [selectedDuel, setSelectedDuel] = useState<DuelItem | null>(null);

  useEffect(() => {
    if (opponentParam) {
      setTargetHandle(opponentParam.startsWith('@') ? opponentParam : `@${opponentParam}`);
    }
  }, [opponentParam]);

  const STAKE_OPTIONS = [50, 100, 250, 500];
  const liveDuels = faceoffs;
  const avatarList = liveDuels.map((d) => d.iconAvatar || d.image);
  const featuredOpponent = liveDuels.find((d) => !d.isMine) || liveDuels[0];

  // 1. Direct incoming requests directed at this user
  const incomingDirectRequests = liveDuels.filter(
    (d) => !d.isMine && d.canJoin && d.status === 'WAITING' && Boolean(d.targetUserId || d.opponentId)
  );

  // 2. Ongoing matches where the user is a contender
  const myActiveClashes = liveDuels.filter(
    (d) => d.isMine && d.status !== 'COMPLETED'
  );

  // 3. Open arena matchmaking by division
  const displayedDuels = liveDuels.filter((d) => {
    if (d.isMine) return false;
    if (selectedDivision === 'ALL') return true;
    const duelTier = (d.rawTier || d.requiredTier || d.tier || '').toUpperCase();
    return duelTier.includes(selectedDivision);
  });

  const handleCreateChallenge = async () => {
    if (!activeCard?.id) {
      showToast('Please claim your Face Card first to enter the Arena.');
      router.push('/card');
      return;
    }
    try {
      const res = await createChallenge({
        mode,
        stakeAmount: mode === 'STAKED' ? stakeAmount : 0,
        opponentHandle: targetHandle.trim() || undefined,
      });
      setInviteCode(res.inviteCode);
      setCreatedDuelId(res.duelId);
      refreshFaceoffs();
      showToast(targetHandle.trim() ? `Direct duel created for @${targetHandle.replace(/^@/, '')}!` : 'Public duel created!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create challenge';
      showToast(msg);
    }
  };

  const handleAcceptDuel = async (duelId: string, opponentName: string) => {
    if (!activeCard?.id) {
      showToast('Please claim your Face Card first to enter the Arena.');
      router.push('/card');
      return;
    }
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

  const handleCancelDuel = async (duelId: string) => {
    try {
      setCancellingId(duelId);
      const res = await cancelDuel(duelId);
      showToast(res.message || 'Challenge cancelled and stake refunded!');
      setSelectedDuel(null);
      refreshFaceoffs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to cancel challenge';
      showToast(msg);
    } finally {
      setCancellingId(null);
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

        {/* Unclaimed Face Card Warning Banner */}
        {!cardLoading && !activeCard?.id && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between shadow-xs">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300 block">
                Face Card Not Claimed
              </span>
              <span className="text-[11px] text-[var(--text-muted)] block">
                Claim your card to rank in the arena and challenge rivals.
              </span>
            </div>
            <Link
              href="/card"
              className="py-1.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-xs active:scale-95 transition-all shrink-0"
            >
              Claim Card
            </Link>
          </div>
        )}

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
                  handleAcceptDuel(target.id, target.handle || target.opponentName);
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

        {/* Incoming Direct Challenge Requests Directed At You */}
        {incomingDirectRequests.length > 0 && (
          <section className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-300 flex items-center gap-1.5">
                <Swords className="w-3.5 h-3.5 animate-pulse" /> Action Required ({incomingDirectRequests.length})
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">Direct Challenge</span>
            </div>
            {incomingDirectRequests.map((req) => (
              <div 
                key={req.id}
                onClick={() => setSelectedDuel(req)}
                className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-500/15 via-indigo-500/15 to-pink-500/15 border border-purple-500/30 flex items-center justify-between shadow-xs cursor-pointer hover:border-purple-400/50 transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <UserAvatar
                    name={req.handle}
                    src={req.iconAvatar}
                    size="md"
                    className="w-10 h-10 ring-2 ring-purple-500 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-[var(--text-main)] block truncate">
                      {req.handle} challenged you
                    </span>
                    <span className="text-[10px] text-purple-600 dark:text-purple-300 font-semibold block">
                      {req.stake} • {req.requiredTier || req.tier} Division
                    </span>
                  </div>
                </div>

                <button
                  disabled={joiningId === req.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAcceptDuel(req.id, req.handle);
                  }}
                  className="py-1.5 px-3 rounded-xl bg-[#6366F1] hover:bg-[#5558E6] text-white text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Swords className="w-3.5 h-3.5" />
                  <span>{joiningId === req.id ? 'Joining...' : 'Accept Match'}</span>
                </button>
              </div>
            ))}
          </section>
        )}

        {/* Your Active Clashes */}
        {myActiveClashes.length > 0 && (
          <section className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-[#FF7A50]" /> Your Active Duels ({myActiveClashes.length})
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">Tap to view match</span>
            </div>
            <div className="space-y-2">
              {myActiveClashes.map((duel) => (
                <div
                  key={duel.id}
                  onClick={() => setSelectedDuel(duel)}
                  className="p-3 rounded-2xl bg-white/90 dark:bg-[#140826]/85 border border-black/[0.06] dark:border-white/10 shadow-xs flex items-center justify-between cursor-pointer hover:border-purple-400/40 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <UserAvatar
                      name={duel.handle}
                      src={duel.iconAvatar}
                      size="sm"
                      className="w-9 h-9"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-[var(--text-main)] block truncate">
                        vs {duel.handle}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] block">
                        {duel.stake} • {duel.requiredTier || duel.tier}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {duel.status === 'WAITING' ? (
                      <span className="py-1 px-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold border border-amber-500/20">
                        Awaiting Opponent
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/scan?duelId=${duel.id}`);
                        }}
                        className="py-1 px-3 rounded-xl bg-[#6366F1] hover:bg-[#5558E6] text-white text-[11px] font-bold flex items-center gap-1 shadow-xs transition-transform active:scale-95 cursor-pointer"
                      >
                        <Camera className="w-3 h-3" />
                        <span>Take Match Scan</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Direct Challenge Opponent Banner if coming from /friends */}
        {opponentParam && (
          <div className="p-4 rounded-2xl bg-[#6366F1]/15 border border-[#6366F1]/30 flex items-center justify-between shadow-sm animate-fade-in">
            <div className="flex items-center gap-2.5">
              <Swords className="w-5 h-5 text-[#6366F1] animate-pulse" />
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#6366F1] dark:text-purple-300 block">
                  Direct Clash Ready
                </span>
                <span className="text-xs font-bold text-[var(--text-main)] block">
                  Challenging {targetHandle || opponentParam}
                </span>
              </div>
            </div>
            <a
              href="#create-challenge"
              className="py-1.5 px-3 rounded-xl bg-[#6366F1] text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
            >
              Set Wager
            </a>
          </div>
        )}

        {/* Sub-Header Row: Overlapping Member Avatars + Stats Tag */}
        <section className="flex items-center justify-between px-1">
          <div className="flex items-center">
            <div className="flex -space-x-2.5 overflow-hidden">
              {avatarList.slice(0, 5).map((src, i) => (
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
          {cardLoading ? (
            <div className="p-4 rounded-[28px] bg-white/85 dark:bg-[#140826]/75 border border-black/5 dark:border-white/10 shadow-sm space-y-3 animate-pulse">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-white/10 shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 w-16 bg-neutral-200 dark:bg-white/10 rounded" />
                  <div className="h-2.5 w-12 bg-neutral-200/60 dark:bg-white/5 rounded" />
                </div>
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="h-3 w-20 bg-neutral-200/70 dark:bg-white/10 rounded" />
                <div className="h-3 w-16 bg-neutral-200/70 dark:bg-white/10 rounded" />
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-[28px] bg-white/85 dark:bg-[#140826]/75 backdrop-blur-xl border border-white/95 dark:border-white/10 shadow-sm space-y-3">
              <div className="flex items-center gap-2.5">
                <UserAvatar
                  name={activeCard?.handle || activeCard?.cardholderName || 'You'}
                  src={activeCard?.avatarUrl}
                  size="md"
                  className="w-10 h-10 ring-2 ring-[#6366F1]"
                />
                <div className="min-w-0">
                  <span className="text-xs font-bold block text-[var(--text-main)] truncate max-w-[100px]">
                    {activeCard?.handle || activeCard?.cardholderName || '@you'}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] block font-medium">
                    ★ {activeCard ? activeCard.score : 0} Lethal
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
                  <span>{activeCard ? `${activeCard.streakDays} day streak` : '0 day streak'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Featured Opponent Card */}
          <div 
            onClick={() => featuredOpponent && setSelectedDuel(featuredOpponent)}
            className="p-4 rounded-[28px] bg-white/85 dark:bg-[#140826]/75 backdrop-blur-xl border border-white/95 dark:border-white/10 shadow-sm space-y-3 cursor-pointer hover:border-purple-400/30 active:scale-[0.99] transition-all"
          >
            {featuredOpponent ? (
              <div className="flex items-center gap-2.5">
                <UserAvatar
                  name={featuredOpponent.handle || featuredOpponent.opponentName}
                  src={featuredOpponent.iconAvatar || featuredOpponent.image}
                  size="md"
                  className="w-10 h-10 ring-2 ring-black/10 dark:ring-white/20"
                />
                <div className="min-w-0">
                  <span className="text-xs font-bold block text-[var(--text-main)] truncate max-w-[100px]">
                    {featuredOpponent.handle || `@${featuredOpponent.opponentName.toLowerCase().replace(/\s+/g, '_')}`}
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
                <span>{featuredOpponent ? (featuredOpponent.requiredTier || featuredOpponent.tier) : 'Arena Tier'}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Live Active Duels with Weight Class Division Tabs */}
        <section className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[var(--text-main)]">
                Arena Matchmaking
              </h2>
              <span className="text-[11px] text-[var(--text-muted)]">
                Weight class duels • Fair rating parity
              </span>
            </div>
            <span className="text-xs text-[var(--text-muted)]">Tap to accept</span>
          </div>

          {/* Division Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'ALL', label: 'All Arenas' },
              { id: 'CLASSIC', label: 'Classic' },
              { id: 'GOLD', label: 'Gold' },
              { id: 'PLATINUM', label: 'Platinum' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedDivision(tab.id as typeof selectedDivision)}
                className={`py-1 px-3 rounded-full text-[11px] font-bold whitespace-nowrap transition-all ${
                  selectedDivision === tab.id
                    ? 'bg-[#140826] text-white shadow-xs dark:bg-white dark:text-[#140826]'
                    : 'bg-black/5 dark:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {isLoading ? (
              <>
                <div className="aspect-[3/4] rounded-[28px] bg-neutral-200/70 dark:bg-white/[0.06] animate-pulse border border-black/5 dark:border-white/10" />
                <div className="aspect-[3/4] rounded-[28px] bg-neutral-200/70 dark:bg-white/[0.06] animate-pulse border border-black/5 dark:border-white/10" />
              </>
            ) : displayedDuels.length === 0 ? (
              <div className="col-span-2 p-8 text-center rounded-[28px] bg-white/60 dark:bg-white/[0.04] border border-dashed border-black/10 dark:border-white/10 space-y-2">
                <Swords className="w-7 h-7 mx-auto text-[var(--text-muted)] opacity-60" />
                <p className="text-xs font-bold text-[var(--text-main)]">No active duels in this division</p>
                <p className="text-[10px] text-[var(--text-muted)]">Create a challenge below to stake points and duel!</p>
              </div>
            ) : (
              displayedDuels.map((duel) => (
                <div
                  key={duel.id}
                  onClick={() => setSelectedDuel(duel)}
                  className="relative aspect-[3/4] rounded-[28px] overflow-hidden group bg-white dark:bg-[#140826] shadow-sm border border-black/[0.04] dark:border-white/10 cursor-pointer hover:border-purple-400/40 hover:shadow-md transition-all active:scale-[0.99]"
                  title="Click to view full match details and opponent profile"
                >
                  <img
                    src={duel.image}
                    alt={duel.handle}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Tier Pill Badge top left */}
                  <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[9px] font-black border border-white/20 uppercase tracking-wider">
                    {duel.requiredTier || duel.tier}
                  </div>

                  {/* Score Tag with Frosted Pill top right */}
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold border border-white/20">
                    ★ {duel.score}
                  </div>

                  {/* Bottom Overlay Capsule Drawer */}
                  <div className="absolute bottom-2.5 inset-x-2.5 p-2.5 rounded-[20px] bg-[#140826]/90 text-white backdrop-blur-xl space-y-1.5 border border-purple-400/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0 max-w-[105px]">
                        <img
                          src={duel.iconAvatar || duel.image}
                          alt=""
                          className="w-4 h-4 rounded-full object-cover shrink-0 border border-white/40"
                        />
                        <span className="text-[12px] font-extrabold truncate text-white tracking-tight">
                          {duel.handle}
                        </span>
                      </div>
                      <span className="text-[9px] font-bold text-white/80 bg-white/10 px-1.5 py-0.5 rounded-full shrink-0">
                        {duel.stake}
                      </span>
                    </div>

                    <button
                      disabled={joiningId === duel.id || duel.canJoin === false}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAcceptDuel(duel.id, duel.handle);
                      }}
                      className={`w-full py-1.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-transform active:scale-95 shadow-xs ${
                        duel.canJoin === false
                          ? 'bg-white/20 text-white/40 cursor-not-allowed'
                          : 'bg-white text-[#18181B] hover:bg-neutral-100 disabled:opacity-50'
                      }`}
                    >
                      <Swords className="w-3 h-3" />
                      <span>
                        {joiningId === duel.id
                          ? 'Entering...'
                          : duel.isMine
                          ? 'Your Duel'
                          : duel.sameTier === false
                          ? `Requires ${duel.requiredTier || duel.tier}`
                          : 'Accept Duel'}
                      </span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Create Private Duel Box */}
        <section 
          id="create-challenge"
          className="p-4 rounded-[28px] bg-white/85 dark:bg-[#140826]/75 backdrop-blur-xl border border-white/95 dark:border-white/10 shadow-sm space-y-4 scroll-mt-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#18181B] dark:text-zinc-100">
                Create Duel Challenge
              </h2>
              <p className="text-xs text-[#71717A] dark:text-zinc-400 mt-0.5">
                Challenge an opponent directly or host in the open arena.
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-black/5 dark:bg-white/10 text-[#71717A] dark:text-zinc-300">
              Arena
            </span>
          </div>

          {/* Direct Opponent Input */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[#71717A] dark:text-zinc-400 block">
              Opponent Username (Optional):
            </label>
            <input
              type="text"
              value={targetHandle}
              onChange={(e) => setTargetHandle(e.target.value)}
              placeholder="@username (Leave blank for open arena)"
              className="w-full py-2 px-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-medium text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-hidden focus:border-[#6366F1]"
            />
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
              className="w-full py-3.5 rounded-full bg-[#140826] hover:bg-[#241040] text-white text-xs font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-[0_8px_24px_rgba(20,8,38,0.3)] border border-purple-400/20 cursor-pointer"
            >
              <Swords className="w-4 h-4 text-white" />
              <span>Create Match Challenge</span>
            </button>
          ) : (
            <div className="p-4 rounded-2xl bg-white dark:bg-[#140826] border border-black/[0.06] dark:border-white/10 space-y-3">
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center space-y-1">
                <span className="text-[11px] font-bold text-purple-600 dark:text-purple-300 uppercase tracking-wider block">
                  Challenge Created!
                </span>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  Share your invite link with your contender. Once they accept, the match is confirmed and both fighters will have 24 hours to submit their match scan!
                </p>
              </div>
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-[var(--text-muted)] font-medium">Invite Code:</span>
                <span className="font-mono font-bold text-[var(--text-main)] text-sm tracking-wider">{inviteCode}</span>
              </div>
              <button
                onClick={copyInviteLink}
                className="w-full py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#5558E6] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-transform active:scale-95 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Match Invite Link'}</span>
              </button>
              <button
                onClick={() => { setInviteCode(null); setCreatedDuelId(null); }}
                className="w-full py-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 text-[var(--text-main)] text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          )}
        </section>

      </main>

      {/* Expanded Match Details Modal */}
      <DuelDetailModal
        duel={selectedDuel}
        onClose={() => setSelectedDuel(null)}
        onAccept={handleAcceptDuel}
        onCancel={handleCancelDuel}
        isJoining={joiningId === selectedDuel?.id}
        isCancelling={cancellingId === selectedDuel?.id}
        currentUserTier={activeCard?.tier}
        currentUserScore={activeCard?.score}
      />

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
