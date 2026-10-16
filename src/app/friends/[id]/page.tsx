'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Swords, 
  Gift, 
  Share2, 
  Flame, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  TrendingUp, 
  UserPlus,
  UserCheck,
  Edit3,
  Calendar,
  Award,
  AlertCircle,
  ExternalLink,
  Coins
} from 'lucide-react';
import { FaceCard } from '@/components/card/FaceCard';
import { BottomNav } from '@/components/navigation/BottomNav';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { FaceCardData, Tier, Band } from '@/types';
import { friendService } from '@/services/friendService';
import { UserAvatar } from '@/components/common/UserAvatar';
import { FaceCardSkeleton, Skeleton } from '@/components/common/Skeleton';
import { useAuth } from '@/hooks/useAuth';

interface FriendProfileData {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  avatarUrl?: string | null;
  score: number;
  band?: Band | null;
  tier: Tier;
  title?: string;
  status: string;
  streak: number;
  bio?: string | null;
  memberSince?: string;
  lifetimePoints?: number;
  duelsPlayed: number;
  duelsWon: number;
  isSelf: boolean;
  isFriend: boolean;
  activeDuelWithYou?: {
    id: string;
    status: string;
    stake: number;
    inviteCode?: string;
  } | null;
  headToHeadWithYou: {
    played: number;
    wins: number;
    losses: number;
    netPoints: number;
  };
  breakdown: {
    photoCraft: number;
    harmony: number;
    skinClarity: number;
    expression: number;
    aura: number;
  };
}

function FriendProfileContent() {
  const params = useParams();
  const router = useRouter();
  const rawId = (params?.id as string) || '';
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState<FriendProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTogglingFriend, setIsTogglingFriend] = useState(false);
  const [isGifting, setIsGifting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  useEffect(() => {
    let isMounted = true;
    if (!rawId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    friendService.getFriendProfile(rawId)
      .then((res) => {
        if (isMounted && res.success && res.friend) {
          const f = res.friend;
          setProfile({
            id: f.id,
            name: f.name || 'Anonymous Contender',
            handle: f.handle?.startsWith('@') ? f.handle : `@${f.handle || 'user'}`,
            avatar: f.avatar || '',
            avatarUrl: f.avatarUrl || null,
            score: typeof f.score === 'number' ? f.score : 0,
            band: f.band || (f.score >= 90 ? 'LETHAL' : f.score >= 75 ? 'DANGEROUS' : 'SUSPICIOUS'),
            tier: (f.tier as Tier) || 'CLASSIC',
            title: f.tier === 'BLACK' ? 'Apex Obsidian' : f.tier === 'PLATINUM' ? 'Platinum Elite' : f.tier === 'GOLD' ? 'Golden Standard' : 'Certified Classic',
            status: f.status ? f.status.toLowerCase() : 'offline',
            streak: typeof f.streak === 'number' ? f.streak : 0,
            bio: f.bio || null,
            memberSince: f.memberSince || 'Recent Member',
            lifetimePoints: f.lifetimePoints || 0,
            duelsPlayed: f.duelsPlayed || 0,
            duelsWon: f.duelsWon || 0,
            isSelf: Boolean(f.isSelf || (currentUser && currentUser.id === f.id)),
            isFriend: Boolean(f.isFriend),
            activeDuelWithYou: f.activeDuelWithYou || null,
            headToHeadWithYou: f.headToHeadWithYou || { played: 0, wins: 0, losses: 0, netPoints: 0 },
            breakdown: f.breakdown || {
              photoCraft: f.score > 0 ? Math.min(100, f.score + 4) : 0,
              harmony: f.score > 0 ? f.score : 0,
              skinClarity: f.score > 0 ? Math.max(0, f.score - 3) : 0,
              expression: f.score > 0 ? f.score : 0,
              aura: f.score > 0 ? Math.min(100, f.score + 7) : 0,
            },
          });
        } else if (isMounted) {
          setProfile(null);
        }
      })
      .catch((err) => {
        console.warn('Failed to load user profile:', err);
        if (isMounted) setProfile(null);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, [rawId, currentUser]);

  const handleToggleFriend = async () => {
    if (!profile) return;
    if (!currentUser) {
      showToast('Please sign in to add friends.');
      setTimeout(() => router.push(`/sign-in?redirect=/friends/${rawId}`), 1000);
      return;
    }

    try {
      setIsTogglingFriend(true);
      if (profile.isFriend) {
        await friendService.removeFriendById(profile.id);
        setProfile((prev) => prev ? { ...prev, isFriend: false } : null);
        showToast(`Removed ${profile.handle} from friends.`);
      } else {
        await friendService.addFriendById(profile.id);
        setProfile((prev) => prev ? { ...prev, isFriend: true } : null);
        showToast(`Added ${profile.handle} as a friend!`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      showToast(msg);
    } finally {
      setIsTogglingFriend(false);
    }
  };

  const handleShare = () => {
    if (!profile) return;
    if (typeof window !== 'undefined' && navigator.clipboard) {
      const url = `${window.location.origin}/friends/${profile.handle.replace(/^@/, '')}`;
      navigator.clipboard.writeText(url);
      showToast(`${profile.handle}'s profile link copied!`);
    }
  };

  const handleGiftPoints = () => {
    if (!profile) return;
    if (!currentUser) {
      showToast('Please sign in to gift points.');
      return;
    }
    setIsGifting(true);
    setTimeout(() => {
      setIsGifting(false);
      showToast(`Gifted 50 PTS courtesy boost to ${profile.handle}!`);
    }, 600);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] font-sans antialiased pb-32">
        <main className="max-w-md mx-auto px-4 sm:px-5 pt-5 sm:pt-6 space-y-5">
          <header className="relative flex items-center justify-between h-10 px-1">
            <Link href="/friends" className="w-9 h-9 flex items-center justify-center text-[var(--text-main)]">
              <ArrowLeft className="w-5 h-5 stroke-[2]" />
            </Link>
            <span className="text-lg font-bold tracking-tight text-[var(--text-main)]">profile</span>
            <div className="w-9 h-9" />
          </header>
          <div className="p-5 rounded-[28px] bg-white/70 dark:bg-[#140826]/70 border border-black/5 dark:border-white/10 animate-pulse space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-full bg-neutral-200 dark:bg-white/10 shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-32 bg-neutral-200 dark:bg-white/10 rounded" />
                <div className="h-3 w-20 bg-neutral-200/60 dark:bg-white/5 rounded" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-black/5 dark:border-white/5">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
          <FaceCardSkeleton />
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-[var(--text-muted)]">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-[var(--text-main)]">User Not Found</h2>
          <p className="text-xs text-[var(--text-muted)]">
            This cardholder profile could not be found or does not exist.
          </p>
        </div>
        <div className="flex items-center gap-2 pt-2">
          <Link
            href="/faceoff"
            className="py-2.5 px-5 rounded-full bg-[#140826] dark:bg-white text-white dark:text-[#140826] text-xs font-bold shadow-sm active:scale-95 transition-transform"
          >
            Explore Arena
          </Link>
          <Link
            href="/friends"
            className="py-2.5 px-5 rounded-full bg-black/5 dark:bg-white/10 text-[var(--text-main)] text-xs font-bold hover:bg-black/10 transition-colors"
          >
            Back to Friends
          </Link>
        </div>
      </div>
    );
  }

  const friendCard: FaceCardData = {
    id: `card-${profile.id}`,
    tier: profile.tier,
    cardholderName: profile.handle,
    title: profile.title || 'Certified Classic',
    score: profile.score,
    band: profile.band || 'DANGEROUS',
    streakDays: profile.streak,
    multiplier: profile.tier === 'BLACK' ? 2.0 : profile.tier === 'PLATINUM' ? 1.5 : profile.tier === 'GOLD' ? 1.25 : 1.0,
    avatarUrl: profile.avatarUrl || undefined,
  };

  return (
    <div className="relative min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] font-sans antialiased pb-32 transition-colors duration-200">
      {/* Subtle Ethereal Ambient Background (Matching profile/page.tsx) */}
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

      <main className="relative z-10 max-w-md mx-auto px-4 sm:px-5 pt-5 sm:pt-6 space-y-5">
        
        {/* Top Header Row */}
        <header className="relative flex items-center justify-between h-10 px-1">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center text-[var(--text-main)] transition-transform active:scale-95"
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2]" />
          </button>

          <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none">
            <span className="text-lg font-bold tracking-tight text-[var(--text-main)]">
              {profile.isSelf ? 'your profile' : 'profile'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <button
              onClick={handleShare}
              className="w-9 h-9 flex items-center justify-center text-[var(--text-main)] transition-transform active:scale-95"
              title="Share Card"
            >
              <Share2 className="w-5 h-5 stroke-[2]" />
            </button>
          </div>
        </header>

        {/* Self Profile Banner Notice */}
        {profile.isSelf && (
          <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                This is your public collectible card view
              </span>
            </div>
            <Link
              href="/profile"
              className="text-xs font-bold text-indigo-600 dark:text-indigo-300 hover:underline flex items-center gap-1"
            >
              <span>Edit Settings</span>
              <Edit3 className="w-3 h-3" />
            </Link>
          </div>
        )}

        {/* Active Duel In Progress Banner Indicator */}
        {profile.activeDuelWithYou && (
          <div className="p-3.5 rounded-2xl bg-[#FF7A50]/15 border border-[#FF7A50]/30 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <Swords className="w-4 h-4 text-[#FF7A50] animate-pulse" />
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#FF7A50] block leading-tight">
                  Active Duel In Progress
                </span>
                <span className="text-xs font-bold text-[var(--text-main)]">
                  {profile.activeDuelWithYou.stake > 0 ? `${profile.activeDuelWithYou.stake} PTS Stake` : 'Friendly Match'}
                </span>
              </div>
            </div>
            <Link
              href={`/faceoff/${profile.activeDuelWithYou.id}`}
              className="py-1.5 px-3 rounded-full bg-[#FF7A50] hover:bg-[#e06840] text-white text-xs font-bold shadow-xs active:scale-95 transition-transform"
            >
              View Duel
            </Link>
          </div>
        )}

        {/* User Identity Banner (Identical layout to profile/page.tsx) */}
        <section className="p-5 rounded-[28px] bg-white/80 dark:bg-[#140826]/80 backdrop-blur-xl border border-white/90 dark:border-white/10 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <UserAvatar
                  name={profile.name}
                  handle={profile.handle}
                  src={profile.avatarUrl || profile.avatar}
                  size="xl"
                  className="w-14 h-14 ring-2 ring-black/5 dark:ring-white/10 shadow-sm"
                />
                {profile.status === 'online' && (
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#140826]" />
                )}
                {profile.status === 'in_arena' && (
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#FF7A50] ring-2 ring-white dark:ring-[#140826]" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-extrabold text-[var(--text-main)] leading-tight">
                    {profile.name}
                  </h1>
                </div>
                <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">
                  {profile.handle}
                </p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                    profile.tier === 'BLACK' ? 'bg-black text-white dark:bg-white dark:text-black' :
                    profile.tier === 'PLATINUM' ? 'bg-cyan-100 dark:bg-cyan-900/60 text-cyan-800 dark:text-cyan-200' :
                    profile.tier === 'GOLD' ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200' :
                    'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-200'
                  }`}>
                    {profile.tier} Tier
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 dark:bg-orange-950/60 text-[#FF7A50] flex items-center gap-1">
                    <Flame className="w-3 h-3 fill-[#FF7A50]" />
                    {profile.streak} Day{profile.streak === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
            </div>

            {/* Friendship Status Indicator Badge */}
            {!profile.isSelf && (
              <div className="flex items-center">
                {profile.isFriend ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40">
                    <Check className="w-3 h-3 stroke-[3]" />
                    <span>Friends</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-black/5 dark:bg-white/10 text-[var(--text-muted)]">
                    Not Friends
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Quick Counter Grid */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-black/[0.05] dark:border-white/[0.08]">
            <div className="text-center py-1">
              <span className="block text-sm font-extrabold text-[var(--text-main)]">
                {profile.score}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] font-medium">Lethality</span>
            </div>
            <div className="text-center py-1 border-x border-black/[0.05] dark:border-white/[0.08]">
              <span className="block text-sm font-extrabold text-[var(--text-main)]">
                {profile.duelsPlayed}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] font-medium">Duels</span>
            </div>
            <div className="text-center py-1">
              <span className="block text-sm font-extrabold text-[var(--text-main)]">
                {profile.duelsWon}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] font-medium">Wins</span>
            </div>
          </div>
        </section>

        {/* Issued Collectible Face Card (Verified, Interactive, No Chip, No Initials) */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Verified Face Card
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              AI Certified
            </span>
          </div>

          <FaceCard card={friendCard} interactive={true} />
        </section>

        {/* Primary Interactive CTAs */}
        {!profile.isSelf ? (
          <section className="grid grid-cols-2 gap-3">
            {profile.activeDuelWithYou ? (
              <Link
                href={`/faceoff?duel=${profile.activeDuelWithYou.inviteCode || profile.activeDuelWithYou.id}`}
                className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-full text-xs font-bold bg-[#6366F1] hover:bg-[#5558E6] text-white shadow-[0_8px_24px_rgba(99,102,241,0.25)] active:scale-[0.99] transition-transform"
              >
                <Swords className="w-4 h-4 text-white animate-pulse" />
                <span>View Active Clash</span>
              </Link>
            ) : (
              <Link
                href={`/faceoff?opponent=${profile.handle}`}
                className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-full text-xs font-bold bg-[#140826] dark:bg-white hover:bg-[#241040] dark:hover:bg-zinc-200 text-white dark:text-[#140826] shadow-[0_8px_24px_rgba(20,8,38,0.25)] active:scale-[0.99] transition-transform"
              >
                <Swords className="w-4 h-4 text-white dark:text-[#140826]" />
                <span>Challenge to Duel</span>
              </Link>
            )}

            <button
              onClick={handleToggleFriend}
              disabled={isTogglingFriend}
              className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-full text-xs font-bold border transition-all active:scale-[0.99] shadow-xs ${
                profile.isFriend
                  ? 'border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-[var(--text-main)]'
                  : 'border-[#DDD6FE] dark:border-purple-500/30 bg-[#EDE9FE] dark:bg-[#6366F1]/20 hover:bg-[#DDD6FE] text-[#140826] dark:text-purple-200'
              }`}
            >
              {profile.isFriend ? (
                <>
                  <UserCheck className="w-4 h-4 text-emerald-500" />
                  <span>{isTogglingFriend ? 'Updating...' : 'Friends'}</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 text-[#6366F1] dark:text-purple-300" />
                  <span>{isTogglingFriend ? 'Adding...' : 'Add Friend'}</span>
                </>
              )}
            </button>
          </section>
        ) : (
          <section className="flex items-center gap-3">
            <Link
              href="/profile"
              className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-full text-xs font-bold bg-[#140826] dark:bg-white text-white dark:text-[#140826] shadow-sm active:scale-95 transition-transform"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Profile & Settings</span>
            </Link>
            <button
              onClick={handleShare}
              className="py-3.5 px-5 rounded-full text-xs font-bold border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 text-[var(--text-main)] active:scale-95 transition-transform"
            >
              Share Card
            </button>
          </section>
        )}

        {/* Head-to-Head Duel Indicator & Record */}
        {!profile.isSelf && (
          <section className="p-5 rounded-[28px] bg-white/80 dark:bg-[#140826]/80 backdrop-blur-xl border border-white/90 dark:border-white/10 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-purple-500" />
                <span>Head-to-Head Clash Record</span>
              </h2>
              <span className="text-[11px] font-bold text-purple-600 dark:text-purple-300">
                {profile.headToHeadWithYou.played > 0 
                  ? `${profile.headToHeadWithYou.played} Duel${profile.headToHeadWithYou.played === 1 ? '' : 's'} Fought`
                  : 'Never Dueled'
                }
              </span>
            </div>

            {profile.headToHeadWithYou.played > 0 ? (
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="p-2.5 rounded-2xl bg-black/5 dark:bg-white/5">
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 block leading-tight">
                    {profile.headToHeadWithYou.wins}
                  </span>
                  <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase">Your Wins</span>
                </div>

                <div className="p-2.5 rounded-2xl bg-black/5 dark:bg-white/5">
                  <span className="text-lg font-black text-rose-500 dark:text-rose-400 block leading-tight">
                    {profile.headToHeadWithYou.losses}
                  </span>
                  <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase">Losses</span>
                </div>

                <div className="p-2.5 rounded-2xl bg-black/5 dark:bg-white/5">
                  <span className={`text-lg font-black block leading-tight ${profile.headToHeadWithYou.netPoints >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                    {profile.headToHeadWithYou.netPoints > 0 ? `+${profile.headToHeadWithYou.netPoints}` : profile.headToHeadWithYou.netPoints}
                  </span>
                  <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase">Net PTS</span>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-dashed border-black/10 dark:border-white/10 text-center space-y-1">
                <p className="text-xs font-bold text-[var(--text-main)]">You haven’t dueled {profile.handle} yet</p>
                <p className="text-[11px] text-[var(--text-muted)]">Challenge them in the arena to stake points and claim victory!</p>
              </div>
            )}
          </section>
        )}

        {/* View-Only Personal Details Card (Member since, Tier, Lifetime PTS) */}
        <section className="p-5 rounded-[28px] bg-white/80 dark:bg-[#140826]/80 backdrop-blur-xl border border-white/90 dark:border-white/10 shadow-sm space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Cardholder Information
          </h2>

          <div className="space-y-2.5 pt-1 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-black/[0.04] dark:border-white/[0.06]">
              <span className="text-[var(--text-muted)] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#6366F1]" />
                <span>Member Since</span>
              </span>
              <span className="font-bold text-[var(--text-main)]">
                {profile.memberSince}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-black/[0.04] dark:border-white/[0.06]">
              <span className="text-[var(--text-muted)] flex items-center gap-2">
                <Award className="w-4 h-4 text-[#6366F1]" />
                <span>Division Class</span>
              </span>
              <span className="font-bold text-[var(--text-main)]">
                {profile.tier} Weight Class
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-black/[0.04] dark:border-white/[0.06]">
              <span className="text-[var(--text-muted)] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#6366F1]" />
                <span>Lifetime Prestige</span>
              </span>
              <span className="font-bold text-[var(--text-main)]">
                {(profile.lifetimePoints || 0).toLocaleString()} PTS
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-[var(--text-muted)] flex items-center gap-2">
                <Coins className="w-4 h-4 text-[#6366F1]" />
                <span>Community Courtesy</span>
              </span>
              <button
                onClick={handleGiftPoints}
                disabled={isGifting || profile.isSelf}
                className="text-[11px] font-bold text-[#6366F1] dark:text-purple-300 hover:underline flex items-center gap-1 active:scale-95 transition-transform"
              >
                <Gift className="w-3.5 h-3.5" />
                <span>{isGifting ? 'Gifting...' : 'Send 50 PTS Boost'}</span>
              </button>
            </div>
          </div>
        </section>

        {/* Diagnostic Lethal Formula Sub-scores */}
        <section className="p-5 rounded-[28px] bg-white/80 dark:bg-[#140826]/80 backdrop-blur-xl border border-white/90 dark:border-white/10 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Diagnostic Lethal Formula
            </h2>
            <span className="text-[11px] font-semibold text-[var(--text-muted)]">
              Score: {profile.score}/100
            </span>
          </div>

          <div className="space-y-2.5">
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-[var(--text-main)]">
                <span>Photo Craft & Lighting</span>
                <span className="font-mono font-bold">{profile.breakdown.photoCraft}</span>
              </div>
              <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                <div className="h-full bg-[#0EA5E9] rounded-full" style={{ width: `${profile.breakdown.photoCraft}%` }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-[var(--text-main)]">
                <span>Facial Harmony & Symmetry</span>
                <span className="font-mono font-bold">{profile.breakdown.harmony}</span>
              </div>
              <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                <div className="h-full bg-[#A855F7] rounded-full" style={{ width: `${profile.breakdown.harmony}%` }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-[var(--text-main)]">
                <span>Skin Clarity & Glow</span>
                <span className="font-mono font-bold">{profile.breakdown.skinClarity}</span>
              </div>
              <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                <div className="h-full bg-[#38BDF8] rounded-full" style={{ width: `${profile.breakdown.skinClarity}%` }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-[var(--text-main)]">
                <span>Expression & Eye Contact</span>
                <span className="font-mono font-bold">{profile.breakdown.expression}</span>
              </div>
              <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                <div className="h-full bg-[#6366F1] rounded-full" style={{ width: `${profile.breakdown.expression}%` }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-[var(--text-main)]">
                <span>Aura & Presence</span>
                <span className="font-mono font-bold">{profile.breakdown.aura}</span>
              </div>
              <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                <div className="h-full bg-[#EC4899] rounded-full" style={{ width: `${profile.breakdown.aura}%` }} />
              </div>
            </div>
          </div>
        </section>

      </main>

      <BottomNav />
    </div>
  );
}

export default function FriendProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg-page)]" />}>
      <FriendProfileContent />
    </Suspense>
  );
}
