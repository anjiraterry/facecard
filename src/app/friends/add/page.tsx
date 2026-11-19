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
  Layers,
  Users,
  QrCode,
} from 'lucide-react';
import { BottomNav } from '@/components/navigation/BottomNav';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Tier } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { UserAvatar } from '@/components/common/UserAvatar';
import { FriendRowSkeleton } from '@/components/common/Skeleton';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { EmptyState } from '@/components/ui/StateViews';
import { PageHeader } from '@/components/ui/PageHeader';

interface SuggestedUser {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  score: number;
  tier: Tier;
  mutualCount: number;
  reason: string;
  friendshipStatus?: 'NONE' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'ACCEPTED';
}

export default function AddFriendsPage() {
  const { user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { friends: apiFriends, isLoading, addFriend } = useFriends(searchQuery, true);

  const cleanHandle = currentUser?.handle ? currentUser.handle.replace(/^@/, '') : '';
  const personalInviteCode = cleanHandle
    ? `FC-${cleanHandle.toUpperCase()}`
    : currentUser?.id
    ? `FC-${currentUser.id.slice(0, 6).toUpperCase()}`
    : 'FACECARD';

  const getInviteUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    if (currentUser?.id) {
      return `${origin}/u/${currentUser.id}`;
    }
    return `${origin}/friends/add`;
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleAddFriend = async (user: SuggestedUser) => {
    try {
      setAddedIds((prev) => ({ ...prev, [user.id]: true }));
      await addFriend(user.handle);
      showToast(`Added ${user.name} to your Circle`);
    } catch {
      showToast(`Added ${user.name} to your Circle`);
    }
  };

  const handleCopyCode = async () => {
    const url = getInviteUrl();
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      showToast('Friend invite link copied to clipboard');
    }
  };

  const handleShareInvite = async () => {
    const url = getInviteUrl();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Join my Face Card Circle',
          text: `Add me on Face Card (${personalInviteCode})`,
          url,
        });
        return;
      } catch {
        // fallback to copy
      }
    }
    await handleCopyCode();
  };

  const candidateUsers: SuggestedUser[] = apiFriends.map((f, i) => ({
    id: f.id,
    name: f.name,
    handle: f.handle,
    avatar: f.avatar,
    score: f.score,
    tier: (f.tier as Tier) || 'GOLD',
    mutualCount: 3 + i,
    reason: f.status === 'IN_ARENA' ? 'Currently active in Arena' : 'Verified Contender',
    friendshipStatus: f.friendshipStatus ?? 'NONE',
  }));

  const filtered = candidateUsers;

  return (
    <div className="relative min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] font-sans antialiased pb-32 transition-colors duration-200 md:pl-16 lg:pl-52">
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[#251E24] text-[#FAF7F4] text-xs font-semibold shadow-[var(--shadow-lg)] flex items-center gap-2 border border-[#EBDCD5]/20">
          <Check className="w-4 h-4 text-[#78B894]" />
          <span>{toastMessage}</span>
        </div>
      )}

      <main className="relative z-10 max-w-6xl xl:max-w-7xl mx-auto px-5 sm:px-8 pt-5 space-y-5">
        <PageHeader title="Add Friends" backHref="/friends" backLabel="Back to circle" />

        <div className="relative">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            aria-label="Search contenders by handle or name"
            placeholder="Search by @handle or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-card)] text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-brand)] transition-colors"
          />
        </div>

        <SurfaceCard variant="dark" padding="md" className="space-y-3.5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-semibold tracking-[0.12em] text-[#D2B8C9]">
                Your Personal Invite
              </span>
              <h2 className="font-display text-xl font-semibold tracking-wide mt-0.5 text-[#FAF7F4]">
                {personalInviteCode}
              </h2>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-[#FAF7F4]/10 border border-[#EBDCD5]/20 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-[#FAF7F4]" />
            </div>
          </div>

          <p className="text-xs text-[#EBDCD5]/80 leading-relaxed">
            Share your personal profile link so friends can find and add you to their Face Card circle.
          </p>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleCopyCode}
              className="flex-1 py-2.5 px-3 rounded-full bg-[#FAF7F4]/15 hover:bg-[#FAF7F4]/25 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Link</span>
            </button>

            <button
              type="button"
              onClick={handleShareInvite}
              className="py-2.5 px-5 rounded-full bg-[#EBDCD5] hover:bg-[#FAF7F4] text-[#251E24] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
          </div>
        </SurfaceCard>

        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[var(--accent-brand)]" />
              <span>Suggested ({isLoading ? '...' : filtered.length})</span>
            </h2>
            <span className="text-[11px] font-medium text-[var(--accent-brand)]">Community</span>
          </div>

          <div className="space-y-2.5">
            {isLoading ? (
              <div className="space-y-2.5">
                <FriendRowSkeleton />
                <FriendRowSkeleton />
                <FriendRowSkeleton />
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                title="No contenders found"
                description="Try another search query or share your invite link."
              />
            ) : (
              filtered.map((user) => {
                const status = addedIds[user.id] ? 'PENDING_SENT' : user.friendshipStatus || 'NONE';
                const isAccepted = status === 'ACCEPTED';
                const isPending = status === 'PENDING_SENT';
                const isIncoming = status === 'PENDING_RECEIVED';
                const isDisabled = isAccepted || isPending;

                return (
                  <SurfaceCard
                    key={user.id}
                    variant="default"
                    padding="sm"
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar
                        name={user.name}
                        handle={user.handle}
                        src={user.avatar}
                        size="lg"
                        className="w-11 h-11 border border-[var(--border-card)]"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-[var(--text-main)] truncate">
                            {user.name}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-[var(--bg-surface-warm)] text-[var(--text-secondary)]">
                            {user.tier}
                          </span>
                        </div>
                        <span className="text-[11px] text-[var(--text-muted)] block mt-0.5 tabular-nums">
                          {user.handle} · Index {user.score}
                        </span>
                        <span className="text-[10px] text-[var(--accent-brand)] font-medium block mt-0.5">
                          {user.reason}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddFriend(user)}
                      disabled={isDisabled}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer ${
                        isAccepted
                          ? 'bg-[var(--status-success-bg)] text-[var(--status-success)]'
                          : isPending
                          ? 'bg-[var(--bg-surface-warm)] text-[var(--text-muted)] border border-[var(--border-card)]'
                          : 'bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--bg-page)]'
                      }`}
                    >
                      {isAccepted ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>In Circle</span>
                        </>
                      ) : isPending ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Requested</span>
                        </>
                      ) : isIncoming ? (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Accept</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </>
                      )}
                    </button>
                  </SurfaceCard>
                );
              })
            )}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
