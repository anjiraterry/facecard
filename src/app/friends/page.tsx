'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  UserPlus,
  Swords,
  ExternalLink,
  Users,
} from 'lucide-react';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { useFriends } from '@/hooks/useFriends';
import { UserAvatar } from '@/components/common/UserAvatar';
import { FriendRowSkeleton } from '@/components/common/Skeleton';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { EmptyState } from '@/components/ui/StateViews';
import { PageHeader } from '@/components/ui/PageHeader';
import { FramerStagger } from '@/components/ui/MotionPrimitives';

export default function FriendsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const { friends, incomingRequests, isLoading, respondToRequest } = useFriends(searchQuery);

  const handleRespond = async (id: string, action: 'accept' | 'decline') => {
    setRespondingId(id);
    try {
      await respondToRequest(id, action);
    } finally {
      setRespondingId(null);
    }
  };

  return (
    <div className="relative min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] font-sans antialiased pb-32 md:pl-16 lg:pl-52">
      <main className="relative z-10 max-w-6xl xl:max-w-7xl mx-auto px-5 sm:px-8 pt-5 space-y-5">
        <PageHeader
          title="Circle"
          backHref="/home"
          backLabel="Back to home"
          rightSlot={
            <Link
              href="/friends/add"
              aria-label="Add friends"
              className="w-9 h-9 rounded-full bg-[var(--bg-surface-warm)] border border-[var(--border-card)] text-[var(--text-main)] flex items-center justify-center hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <UserPlus className="w-4 h-4" />
            </Link>
          }
        />

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            aria-label="Search friends"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or @handle..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-card)] text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-brand)] transition-colors"
          />
        </div>

        {incomingRequests.length > 0 && (
          <section className="space-y-2.5">
            <div className="px-1">
              <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--accent-brand)]">
                Pending Circle Requests ({incomingRequests.length})
              </h2>
            </div>
            {incomingRequests.map((req) => (
              <SurfaceCard
                key={req.id}
                variant="warm"
                padding="sm"
                className="flex items-center justify-between gap-3"
              >
                <Link href={`/friends/${req.userId}`} className="flex items-center gap-3 min-w-0 flex-1">
                  <UserAvatar
                    name={req.name}
                    handle={req.handle}
                    src={req.avatar}
                    size="md"
                    className="w-10 h-10 border border-[var(--border-card)] shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-[var(--text-main)] block truncate">
                      {req.name}
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)] block truncate">
                      {req.handle} · {req.tier} · Index {req.score}
                    </span>
                  </div>
                </Link>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={respondingId === req.id}
                    onClick={() => handleRespond(req.id, 'accept')}
                    className="px-3 py-1.5 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={respondingId === req.id}
                    onClick={() => handleRespond(req.id, 'decline')}
                    className="px-3 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              </SurfaceCard>
            ))}
          </section>
        )}

        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
              Your Circle ({isLoading ? '...' : friends.length})
            </h2>
            <Link
              href="/friends/add"
              className="text-xs font-semibold text-[var(--accent-brand)] hover:text-[var(--text-main)] transition-colors"
            >
              + Add Contenders
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-2.5">
              <FriendRowSkeleton />
              <FriendRowSkeleton />
              <FriendRowSkeleton />
            </div>
          ) : friends.length === 0 ? (
            <EmptyState
              title="No friends added yet"
              description="Connect with friends or discover contenders to duel in the Arena."
              actionLabel="Add Friends"
              actionHref="/friends/add"
            />
          ) : (
            friends.map((friend) => (
              <SurfaceCard
                key={friend.id}
                variant="default"
                padding="sm"
                className="flex items-center justify-between gap-3"
              >
                <Link
                  href={`/friends/${friend.id}`}
                  className="flex items-center gap-3 min-w-0 flex-1 group"
                >
                  <div className="relative shrink-0">
                    <UserAvatar
                      name={friend.name}
                      handle={friend.handle}
                      src={friend.avatar}
                      size="lg"
                      className="w-11 h-11 border border-[var(--border-card)]"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[var(--bg-surface)] ${
                        friend.status === 'ONLINE'
                          ? 'bg-[var(--status-success)]'
                          : friend.status === 'IN_ARENA'
                          ? 'bg-[var(--accent-brand)]'
                          : 'bg-[var(--text-muted)]/40'
                      }`}
                    />
                  </div>

                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-[var(--text-main)] truncate group-hover:text-[var(--accent-brand)] transition-colors">
                        {friend.name}
                      </span>
                      <span className="text-[11px] font-semibold text-[var(--accent-brand)] shrink-0 tabular-nums">
                        {friend.score}
                      </span>
                    </div>
                    <span className="text-[11px] text-[var(--text-muted)] block truncate">
                      {friend.handle} · {friend.tier} Tier
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
                      {friend.lastActive}
                    </span>
                  </div>
                </Link>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/faceoff?opponent=${encodeURIComponent(friend.handle)}`}
                    className="py-1.5 px-3.5 rounded-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--bg-page)] text-[11px] font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Swords className="w-3 h-3" />
                    <span>Duel</span>
                  </Link>

                  <Link
                    href={`/friends/${friend.id}`}
                    aria-label={`View ${friend.name}'s profile`}
                    className="w-8 h-8 rounded-full bg-[var(--bg-surface-warm)] hover:bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-main)] transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </SurfaceCard>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
