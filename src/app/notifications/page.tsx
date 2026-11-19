'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  Award,
  Bell,
  CheckCheck,
  Flame,
  Gift,
  Package,
  Swords,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { EmptyState, LoadingState } from '@/components/ui/StateViews';
import { useToast } from '@/components/common/ToastProvider';

type NotificationType =
  | 'TIER_UPGRADE'
  | 'STREAK_MILESTONE'
  | 'FACEOFF_INVITE'
  | 'FACEOFF_RESULT'
  | 'FRIEND_REQUEST'
  | 'FRIEND_ACCEPTED'
  | 'GIFT_RECEIVED'
  | 'ORDER_UPDATE'
  | 'SYSTEM';

interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function getNotificationMeta(type: NotificationType) {
  switch (type) {
    case 'TIER_UPGRADE':
      return { icon: Award, label: 'Congratulations', accent: true };
    case 'STREAK_MILESTONE':
      return { icon: Flame, label: 'Streak', accent: true };
    case 'FACEOFF_INVITE':
    case 'FACEOFF_RESULT':
      return { icon: Swords, label: 'Arena', accent: false };
    case 'FRIEND_REQUEST':
    case 'FRIEND_ACCEPTED':
      return { icon: Users, label: 'Circle', accent: false };
    case 'GIFT_RECEIVED':
      return { icon: Gift, label: 'Boutique Gift', accent: true };
    case 'ORDER_UPDATE':
      return { icon: Package, label: 'Atelier Order', accent: false };
    default:
      return { icon: Bell, label: 'Update', accent: false };
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (res.ok && data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount ?? 0);
      }
    } catch {
      showToast('Failed to load notifications', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      const res = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        const now = new Date().toISOString();
        setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || now })));
        setUnreadCount(0);
        queryClient.setQueryData(['notifications-unread'], 0);
        showToast('All notifications marked as read', 'success');
      }
    } finally {
      setMarkingAll(false);
    }
  };

  const handleOpenNotification = async (item: NotificationItem) => {
    if (!item.readAt) {
      const now = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, readAt: now } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      void fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      }).then(() => {
        void queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
      });
    }
    if (item.href) {
      router.push(item.href);
    }
  };

  const visible =
    filter === 'UNREAD' ? notifications.filter((n) => !n.readAt) : notifications;

  return (
    <div className="relative min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans antialiased pb-28 md:pl-16 lg:pl-52">
      <main className="relative z-10 max-w-4xl mx-auto px-5 sm:px-8 pt-5 space-y-5">
        <PageHeader
          title="Notifications"
          backHref="/home"
          backLabel="Back to home"
          rightSlot={
            unreadCount > 0 ? (
              <button
                type="button"
                disabled={markingAll}
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[var(--surface-secondary)] hover:bg-[var(--accent)] text-[var(--foreground)] border border-[var(--border)] text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-60"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            ) : null
          }
        />

        {/* Filter Tabs */}
        <div className="flex items-center p-1 rounded-full bg-[var(--surface)] border border-[var(--border)] max-w-xs">
          {(['ALL', 'UNREAD'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-full transition-colors cursor-pointer ${
                filter === tab
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                  : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
              }`}
            >
              {tab === 'ALL'
                ? `All (${notifications.length})`
                : `Unread (${unreadCount})`}
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingState label="Loading notifications..." />
        ) : visible.length === 0 ? (
          <EmptyState
            title={filter === 'UNREAD' ? 'You are all caught up' : 'No notifications yet'}
            description={
              filter === 'UNREAD'
                ? 'Every notification has been read.'
                : 'Tier upgrades, streak milestones, Arena invites, and gifts will appear here.'
            }
            actionLabel="Go to Home"
            actionHref="/home"
          />
        ) : (
          <div className="space-y-2.5">
            {visible.map((item) => {
              const meta = getNotificationMeta(item.type);
              const Icon = meta.icon;
              const isUnread = !item.readAt;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleOpenNotification(item)}
                  className="w-full text-left cursor-pointer"
                >
                  <SurfaceCard
                    variant={isUnread ? 'warm' : 'default'}
                    padding="sm"
                    className={`flex items-start gap-3 transition-colors hover:border-[var(--border-strong)] ${
                      isUnread ? 'border-[var(--border-strong)]' : ''
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                        meta.accent
                          ? 'bg-[var(--surface-accent)] border-[var(--border-strong)] text-[var(--accent-brand)]'
                          : 'bg-[var(--surface-secondary)] border-[var(--border)] text-[var(--foreground)]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--accent-brand)]">
                            {meta.label}
                          </span>
                          {isUnread && (
                            <span
                              aria-label="Unread"
                              className="w-2 h-2 rounded-full bg-[var(--accent-brand)] shrink-0"
                            />
                          )}
                        </div>
                        <span className="text-[10px] text-[var(--foreground-muted)] shrink-0 tabular-nums">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>

                      <h3 className="text-xs font-bold text-[var(--foreground)] leading-snug">
                        {item.title}
                      </h3>
                      <p className="text-[11px] text-[var(--foreground-secondary)] leading-relaxed">
                        {item.body}
                      </p>
                    </div>
                  </SurfaceCard>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
