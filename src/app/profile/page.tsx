'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Settings, 
  Calendar, 
  Mail, 
  MapPin, 
  Lock, 
  Edit3, 
  Check, 
  X, 
  UserPlus, 
  Swords, 
  Flame, 
  Award, 
  Search, 
  MoreVertical, 
  UserCheck, 
  Layers,
  Clock,
  Trash2,
  ExternalLink,
  CreditCard,
  Camera,
  Upload,
  CheckCircle2,
  LifeBuoy,
  FileText
} from 'lucide-react';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import { useCard } from '@/hooks/useCard';
import { useFriends } from '@/hooks/useFriends';
import { friendService } from '@/services/friendService';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Skeleton, FriendRowSkeleton } from '@/components/common/Skeleton';
import { scanService } from '@/services/scanService';
import { AVATAR_PRESETS } from '@/lib/avatar';
import { PageHeader } from '@/components/ui/PageHeader';
import { FramerTabPanel } from '@/components/ui/MotionPrimitives';
import { EmptyState } from '@/components/ui/StateViews';

interface Friend {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  score: number;
  tier: string;
  status: 'online' | 'in-duel' | 'offline' | string;
  lastSeen?: string;
}

export default function ProfilePage() {
  const { user, isLoading: authLoading, updateProfile, signOut, deleteAccount } = useAuth();
  const { activeCard, isLoading: cardLoading, refreshCard } = useCard();

  const [activeTab, setActiveTab] = useState<'FRIENDS' | 'HISTORY'>('FRIENDS');
  const [isEditing, setIsEditing] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string | null>(null);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const avatarFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportSubject, setSupportSubject] = useState('');
  const [supportCategory, setSupportCategory] = useState<'GENERAL' | 'SCAN_SCORING' | 'ARENA_DUEL' | 'ATELIER_ORDER' | 'ACCOUNT_PRIVACY'>('GENERAL');
  const [supportMessage, setSupportMessage] = useState('');
  const [submittingSupport, setSubmittingSupport] = useState(false);
  const [myTickets, setMyTickets] = useState<Array<{ id: string; subject: string; status: string; createdAt: string }>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuFriendId, setActiveMenuFriendId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<{
    id: string;
    name: string;
    handle: string;
    avatar: string;
    score: number;
  }[]>([]);
  const [activityHistory, setActivityHistory] = useState<{
    id: string;
    title: string;
    desc: string;
    timestamp: string;
    badge: string;
    badgeColor: string;
    icon: typeof Layers;
  }[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const { friends: apiFriends, isLoading: friendsLoading } = useFriends(searchQuery);

  const friends: Friend[] = apiFriends.map((f) => ({
    id: f.id,
    name: f.name,
    handle: f.handle,
    avatar: f.avatar,
    score: f.score,
    tier: f.tier,
    status: f.status === 'ONLINE' ? 'online' : f.status === 'IN_ARENA' ? 'in-duel' : 'offline',
    lastSeen: f.lastActive,
  }));

  useEffect(() => {
    scanService.getRecentScans().then((res) => {
      if (res.success && res.scans) {
        const mapped = res.scans.map((s, idx) => ({
          id: s.evaluatedAt || `act-${idx}`,
          title: `Selfie Scored & Verified (${s.score}/100)`,
          desc: `Lethality score ${s.score}/100 • Credited +${s.pointsEarned} PTS • ${s.tips?.[0] || 'Quality verified'}`,
          timestamp: s.evaluatedAt || 'Recent',
          badge: `★ ${s.score}`,
          badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200/50',
          icon: Layers,
        }));
        setActivityHistory(mapped);
      }
    }).catch(() => {}).finally(() => setHistoryLoading(false));
  }, []);

  // User Profile Basic Info State backed by useAuth hook
  const [localUserInfo, setLocalUserInfo] = useState<Partial<{
    name: string;
    handle: string;
    dob: string;
    dobFormatted: string;
    email: string;
    location: string;
    bio: string;
    memberSince: string;
  }>>({});

  const userInfo = {
    name: localUserInfo.name ?? user?.displayName ?? '',
    handle: localUserInfo.handle ?? (user?.handle ? (user.handle.startsWith('@') ? user.handle : `@${user.handle}`) : ''),
    dob: localUserInfo.dob ?? user?.dob ?? '',
    dobFormatted: localUserInfo.dobFormatted ?? user?.dobFormatted ?? (user ? 'Verified Age (18+)' : 'Unverified'),
    email: localUserInfo.email ?? user?.email ?? '',
    location: localUserInfo.location ?? user?.location ?? 'WAT (West Africa)',
    bio: localUserInfo.bio ?? user?.bio ?? '',
    memberSince: localUserInfo.memberSince ?? user?.memberSince ?? 'Member',
  };

  const [editForm, setEditForm] = useState({ ...userInfo });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const openSupportModal = async () => {
    setShowSupportModal(true);
    try {
      const res = await fetch('/api/support');
      const data = await res.json();
      if (res.ok && data.success) {
        setMyTickets(data.tickets || []);
      }
    } catch {
      // ignore
    }
  };

  const handleSubmitSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingSupport(true);
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: supportSubject,
          category: supportCategory,
          message: supportMessage,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit ticket');
      setMyTickets((prev) => [data.ticket, ...prev]);
      setSupportSubject('');
      setSupportMessage('');
      showToast('Support ticket submitted!');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to submit ticket');
    } finally {
      setSubmittingSupport(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile({
        displayName: editForm.name,
        handle: editForm.handle,
        bio: editForm.bio,
        location: editForm.location,
      });
      setLocalUserInfo({ ...editForm });
      setIsEditing(false);
      showToast('Profile information updated successfully!');
    } catch (err: unknown) {
      showToast('Failed to save profile updates');
    }
  };

  const handleOpenAvatarModal = () => {
    setSelectedAvatarUrl(activeCard?.avatarUrl || user?.avatarUrl || null);
    setShowAvatarModal(true);
  };

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      showToast('Image file must be under 4MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSelectedAvatarUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAvatar = async () => {
    if (!selectedAvatarUrl) {
      showToast('Please select or upload a portrait');
      return;
    }
    try {
      setIsSavingAvatar(true);
      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: selectedAvatarUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update portrait');
      }
      showToast('Facecard portrait updated!');
      setShowAvatarModal(false);
      await refreshCard();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to update portrait');
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const [removedFriendIds, setRemovedFriendIds] = useState<string[]>([]);

  const handleRemoveFriend = async (id: string, name: string) => {
    setActiveMenuFriendId(null);
    setRemovedFriendIds((prev) => [...prev, id]);
    try {
      await friendService.removeFriendById(id);
      showToast(`Removed ${name} from friends`);
    } catch {
      setRemovedFriendIds((prev) => prev.filter((fid) => fid !== id));
      showToast(`Could not remove ${name}. Please try again.`);
    }
  };

  const filteredFriends = friends.filter(
    (f) =>
      !removedFriendIds.includes(f.id) &&
      (f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
       f.handle.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="relative min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] font-sans antialiased pb-28 md:pl-16 lg:pl-52">
      {/* Subtle Ethereal Ambient Background */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-75 dark:opacity-25"
        style={{
          background: `
            radial-gradient(ellipse at 50% -5%, rgba(99, 102, 241, 0.06) 0%, transparent 55%),
            radial-gradient(ellipse at 85% 35%, rgba(139, 92, 246, 0.04) 0%, transparent 45%),
            radial-gradient(ellipse at 20% 75%, rgba(56, 189, 248, 0.04) 0%, transparent 50%)
          `
        }}
      />

      {/* Floating Feedback Toast */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[#251E24] text-white text-xs font-bold shadow-xl flex items-center gap-2 border border-[var(--border-card)] animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <main className="relative z-10 max-w-6xl xl:max-w-7xl mx-auto px-5 sm:px-8 pt-5 space-y-5">
        
        <PageHeader
          title="Profile"
          backHref="/home"
          backLabel="Back to home"
          showQuickActions={false}
          rightSlot={
            <div className="flex items-center gap-1.5">
              <Link
                href="/gallery"
                className="text-xs font-semibold text-[var(--foreground)] bg-[var(--surface)] hover:bg-[var(--surface-secondary)] border border-[var(--border)] px-3 py-1.5 rounded-full transition-colors"
              >
                Gallery
              </Link>
              <Link
                href="/card"
                className="text-xs font-semibold text-[var(--foreground)] bg-[var(--surface-secondary)] hover:bg-[var(--accent)] border border-[var(--border)] px-3 py-1.5 rounded-full transition-colors"
              >
                My Card
              </Link>
            </div>
          }
        />

        {/* User Identity Hero Section */}
        {authLoading ? (
          <section className="p-5 rounded-[28px] bg-[var(--surface)] border border-[var(--border-card)] shadow-sm space-y-4 animate-pulse">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-18 h-18 rounded-full bg-[var(--surface-secondary)] shrink-0" />
                <div className="space-y-2">
                  <div className="h-5 w-32 rounded bg-[var(--surface-secondary)]" />
                  <div className="h-3 w-20 rounded bg-[var(--surface-secondary)]" />
                  <div className="flex items-center gap-1.5 pt-1">
                    <div className="h-4 w-16 rounded-full bg-[var(--surface-secondary)]" />
                    <div className="h-4 w-14 rounded-full bg-[var(--surface-secondary)]" />
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-black/[0.05] dark:border-white/[0.08]">
              <div className="text-center py-1 space-y-1">
                <div className="h-4 w-8 rounded bg-[var(--surface-secondary)] mx-auto" />
                <div className="h-2.5 w-12 rounded bg-[var(--surface-secondary)] mx-auto" />
              </div>
              <div className="text-center py-1 border-x border-black/[0.05] dark:border-white/[0.08] space-y-1">
                <div className="h-4 w-8 rounded bg-[var(--surface-secondary)] mx-auto" />
                <div className="h-2.5 w-12 rounded bg-[var(--surface-secondary)] mx-auto" />
              </div>
              <div className="text-center py-1 space-y-1">
                <div className="h-4 w-8 rounded bg-[var(--surface-secondary)] mx-auto" />
                <div className="h-2.5 w-12 rounded bg-[var(--surface-secondary)] mx-auto" />
              </div>
            </div>
          </section>
        ) : (
          <section className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-xs)] space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <button
                  type="button"
                  onClick={handleOpenAvatarModal}
                  className="relative w-18 h-18 rounded-full p-1 ring-2 ring-[var(--focus-ring)] ring-offset-2 flex items-center justify-center shrink-0 shadow-xs cursor-pointer group hover:ring-[var(--brand-plum)] transition-all"
                  title="Change Card Portrait"
                >
                  <UserAvatar
                    name={userInfo.name}
                    handle={userInfo.handle}
                    src={activeCard?.avatarUrl}
                    size="xl"
                    className="w-full h-full rounded-full object-cover"
                  />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[var(--primary)] border-2 border-[var(--surface)] flex items-center justify-center shadow-xs group-hover:bg-[var(--brand-plum)] transition-colors">
                    <Camera className="w-3 h-3 text-[var(--primary-foreground)]" />
                  </div>
                </button>

                <div>
                  <h1 className="text-lg font-extrabold text-[var(--text-main)] tracking-tight leading-tight">
                    {userInfo.name || 'Contender'}
                  </h1>
                  <p className="text-xs font-medium text-[var(--text-muted)] mt-0.5">
                    {userInfo.handle || '@user'}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    {activeCard?.title && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--primary)] text-[var(--primary-foreground)]">
                        {activeCard.title}
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--surface-secondary)] text-[var(--foreground)] border border-[var(--border)]">
                      {activeCard?.tier ? `${activeCard.tier} Tier` : (user ? 'Member' : 'Guest')}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--surface-accent)] text-[var(--foreground)] border border-[var(--border)]">
                      {activeCard ? `${activeCard.streakDays} Day${activeCard.streakDays === 1 ? '' : 's'}` : '0 Days'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsEditing(!isEditing)}
                className="p-2 rounded-full hover:bg-[var(--surface-secondary)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                title={isEditing ? 'Cancel Editing' : 'Edit Profile'}
              >
                {isEditing ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
              </button>
            </div>

            {userInfo.bio && userInfo.bio.trim().length > 0 && (
              <p className="text-xs text-[var(--text-muted)] leading-relaxed italic bg-[var(--bg-surface-warm)] p-2.5 rounded-2xl border border-black/[0.03] dark:border-white/[0.06]">
                &ldquo;{userInfo.bio}&rdquo;
              </p>
            )}

            {/* Quick Counter Grid */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[var(--border)]">
              <div className="text-center py-1">
                {cardLoading ? (
                  <Skeleton className="h-5 w-8 mx-auto mb-1" />
                ) : (
                  <span className="block text-sm font-extrabold text-[var(--text-main)]">
                    {activeCard ? activeCard.score : 0}
                  </span>
                )}
                <span className="text-[10px] text-[var(--text-muted)] font-medium">Harmony Index</span>
              </div>
              <div className="text-center py-1 border-x border-black/[0.05] dark:border-white/[0.08]">
                {friendsLoading ? (
                  <Skeleton className="h-5 w-8 mx-auto mb-1" />
                ) : (
                  <span className="block text-sm font-extrabold text-[var(--text-main)]">
                    {friends.length}
                  </span>
                )}
                <span className="text-[10px] text-[var(--text-muted)] font-medium">Friends</span>
              </div>
              <div className="text-center py-1">
                {historyLoading ? (
                  <Skeleton className="h-5 w-8 mx-auto mb-1" />
                ) : (
                  <span className="block text-sm font-extrabold text-[var(--text-main)]">
                    {activityHistory.length}
                  </span>
                )}
                <span className="text-[10px] text-[var(--text-muted)] font-medium">Selfies</span>
              </div>
            </div>
          </section>
        )}

        {/* User Information Details Card (Name, DOB, Basic Stuff) */}
        <section className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-xs)] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Personal Information
            </h2>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-[11px] font-semibold text-[var(--accent-brand)] hover:underline cursor-pointer"
              >
                Edit
              </button>
            )}
          </div>

          {isEditing ? (
            /* Editing Form State */
            <div className="space-y-3.5 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--input-border)] text-xs font-medium text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={editForm.dob}
                  onChange={(e) => {
                    const val = e.target.value;
                    const d = new Date(val);
                    const formatted = isNaN(d.getTime()) ? val : `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
                    setEditForm({ ...editForm, dob: val, dobFormatted: formatted });
                  }}
                  className="w-full h-11 px-3.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--input-border)] text-xs font-medium text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                  Bio / Motto
                </label>
                <textarea
                  rows={2}
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--input-border)] text-xs font-medium text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--input-border)] text-xs font-medium text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--input-border)] text-xs font-medium text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={handleSaveProfile}
                  className="flex-1 py-2.5 rounded-full bg-[var(--primary)] hover:opacity-90 text-[var(--primary-foreground)] text-xs font-semibold transition-all shadow-[var(--shadow-xs)] active:scale-95 cursor-pointer"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setEditForm({ ...userInfo });
                    setIsEditing(false);
                  }}
                  className="px-4 py-2.5 rounded-full bg-[var(--surface-secondary)] hover:bg-[var(--surface-accent)] text-[var(--foreground)] text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* Read-Only Details List */
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-[var(--border)]">
                <span className="text-[var(--text-muted)] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[var(--accent-brand)]" />
                  <span>Date of Birth</span>
                </span>
                <span className="font-bold text-[var(--text-main)]">
                  {userInfo.dobFormatted}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs py-1.5 border-b border-[var(--border)]">
                <span className="text-[var(--text-muted)] flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[var(--accent-brand)]" />
                  <span>Email</span>
                </span>
                <span className="font-bold text-[var(--text-main)] truncate max-w-[200px]">
                  {userInfo.email}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs py-1.5 border-b border-[var(--border)]">
                <span className="text-[var(--text-muted)] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[var(--accent-brand)]" />
                  <span>Location</span>
                </span>
                <span className="font-bold text-[var(--text-main)]">
                  {userInfo.location}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs py-1.5 border-b border-[var(--border)]">
                <span className="text-[var(--text-muted)] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[var(--accent-brand)]" />
                  <span>Member Since</span>
                </span>
                <span className="font-bold text-[var(--text-main)]">
                  {userInfo.memberSince}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-[var(--text-muted)] flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[var(--success)]" />
                  <span>Biometric Identity</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--success-surface)] text-[var(--success)] border border-[var(--success)]/20">
                  Verified
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Section Tabs: Friends & Friend Management | History */}
        <section>
          <div className="flex items-center p-1 rounded-full bg-[var(--surface)] border border-[var(--border)]">
            <button
              onClick={() => setActiveTab('FRIENDS')}
              className={`flex-1 py-2 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                activeTab === 'FRIENDS'
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[var(--shadow-xs)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'
              }`}
            >
              Friends ({friends.length})
            </button>
            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`flex-1 py-2 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                activeTab === 'HISTORY'
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[var(--shadow-xs)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'
              }`}
            >
              History & Milestones
            </button>
          </div>
        </section>

        <FramerTabPanel tabKey={activeTab}>
        {/* Tab 1: Friends & Friend Management */}
        {activeTab === 'FRIENDS' && (
          <section className="space-y-4">
            
            {/* Search and Add Friend Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search friends by name or @handle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-[var(--surface)] border border-[var(--input-border)] text-xs font-medium text-[var(--foreground)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] shadow-[var(--shadow-xs)]"
              />
            </div>

            {/* Pending Friend Requests Banner (Bright Font in Dark Mode) */}
            {pendingRequests.length > 0 && (
              <div className="p-3.5 rounded-[22px] bg-[var(--bg-surface-warm)] dark:bg-[#20103A]/95 border border-[#D2B8C9] dark:border-[var(--border-strong)] space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-[#251E24] dark:text-white flex items-center gap-1.5 text-xs">
                    <UserPlus className="w-4 h-4 text-[#251E24] dark:text-[#D2B8C9]" />
                    <span>Friend Requests ({pendingRequests.length})</span>
                  </span>
                  <span className="text-[10px] text-[var(--brand-plum)] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/70 dark:bg-purple-900/60 border border-[var(--border-strong)]">Pending</span>
                </div>

                <div className="space-y-2">
                  {pendingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-[var(--surface)] border border-[var(--border-card)] shadow-2xs"
                    >
                      <Link href={`/friends/${req.id}`} className="flex items-center gap-2.5 hover:opacity-85 transition-opacity">
                        <img
                          src={req.avatar}
                          alt={req.name}
                          className="w-8 h-8 rounded-full object-cover ring-1 ring-black/10 dark:ring-white/10"
                        />
                        <div>
                          <span className="text-xs font-bold text-[#18181B] dark:text-zinc-100 block leading-tight">
                            {req.name}
                          </span>
                          <span className="text-[10px] text-[#71717A] dark:text-zinc-400 font-medium block">
                            {req.handle} • ★ {req.score}
                          </span>
                        </div>
                      </Link>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setPendingRequests((prev) => prev.filter((r) => r.id !== req.id));
                            showToast(`Accepted request from ${req.name}`);
                          }}
                          className="p-1.5 rounded-full bg-[#251E24] dark:bg-[var(--accent-primary)] text-white hover:bg-[#3A2F38] transition-transform active:scale-90"
                          title="Accept"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setPendingRequests((prev) => prev.filter((r) => r.id !== req.id));
                            showToast(`Ignored request from ${req.name}`);
                          }}
                          className="p-1.5 rounded-full bg-[var(--bg-surface-warm)] text-[#71717A] dark:text-zinc-300 hover:bg-black/10 transition-transform active:scale-90"
                          title="Decline"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Friend List Cards */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  All Friends ({filteredFriends.length})
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-[var(--success)] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
                    {friends.filter((f) => f.status === 'online').length} online
                  </span>
                  <Link
                    href="/friends/add"
                    className="px-3 py-1 rounded-full text-[11px] font-semibold bg-[var(--surface-secondary)] text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--surface-accent)] transition-colors"
                  >
                    Add
                  </Link>
                </div>
              </div>

              {friendsLoading ? (
                <div className="space-y-2.5">
                  <FriendRowSkeleton />
                  <FriendRowSkeleton />
                  <FriendRowSkeleton />
                </div>
              ) : filteredFriends.length === 0 ? (
                <EmptyState
                  title="No friends added yet"
                  description="Add friends or share your invite link to challenge them in the Arena."
                  actionLabel="Add Friends"
                  actionHref="/friends/add"
                />
              ) : (
                filteredFriends.map((friend) => (
                <div
                  key={friend.id}
                  className="relative p-3 rounded-[22px] bg-[var(--surface)] border border-[var(--border-card)] shadow-xs flex items-center justify-between transition-all hover:bg-white dark:hover:bg-[#251E24]"
                >
                  {/* Friend Info */}
                  <Link href={`/friends/${friend.id}`} className="flex items-center gap-3 flex-1 hover:opacity-90 transition-opacity">
                    <div className="relative">
                      <UserAvatar
                        name={friend.name}
                        handle={friend.handle}
                        src={friend.avatar}
                        size="lg"
                        className="w-11 h-11 ring-2 ring-black/5 dark:ring-white/10"
                      />
                      {friend.status === 'online' && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[var(--success)] ring-2 ring-[var(--surface)]" />
                      )}
                      {friend.status === 'in-duel' && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[var(--accent-brand)] ring-2 ring-[var(--surface)]" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[var(--foreground)] leading-tight">
                          {friend.name}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                          friend.tier === 'BLACK' ? 'bg-[var(--primary)] text-[var(--primary-foreground)]' :
                          'bg-[var(--surface-secondary)] text-[var(--foreground)] border border-[var(--border)]'
                        }`}>
                          {friend.tier}
                        </span>
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)] font-medium block mt-0.5">
                        {friend.handle} • {friend.score} Harmony {friend.lastSeen && `• ${friend.lastSeen}`}
                      </span>
                    </div>
                  </Link>

                  {/* Actions: Duel Button + Options Menu */}
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/faceoff?opponent=${friend.handle}`}
                      className="px-3.5 py-1.5 rounded-full bg-[var(--primary)] hover:opacity-90 text-[var(--primary-foreground)] text-[11px] font-semibold transition-all active:scale-95 shadow-[var(--shadow-xs)]"
                      title={`Challenge ${friend.name} in Arena`}
                    >
                      Duel
                    </Link>

                    {/* Friend Management Dropdown Trigger */}
                    <div className="relative">
                      <button
                        onClick={() => setActiveMenuFriendId(activeMenuFriendId === friend.id ? null : friend.id)}
                        className="p-1.5 rounded-full hover:bg-[var(--surface-secondary)] text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                        title="Manage Friend"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeMenuFriendId === friend.id && (
                        <div className="absolute right-0 top-8 z-30 w-36 rounded-2xl bg-[var(--surface-elevated)] shadow-[var(--shadow-md)] border border-[var(--border)] py-1.5 text-xs font-semibold">
                          <Link
                            href={`/friends/${friend.id}`}
                            className="w-full px-3 py-2 text-left hover:bg-[var(--surface-secondary)] text-[var(--foreground)] flex items-center gap-2"
                          >
                            <CreditCard className="w-3.5 h-3.5 text-[var(--accent-brand)]" />
                            <span>View Profile</span>
                          </Link>
                          <button
                            onClick={() => {
                              showToast(`Viewing ${friend.name}'s card`);
                              setActiveMenuFriendId(null);
                            }}
                            className="w-full px-3 py-1.5 text-left text-[var(--foreground)] hover:bg-[var(--surface-secondary)] flex items-center gap-2"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                            View Card
                          </button>
                          <button
                            onClick={() => handleRemoveFriend(friend.id, friend.name)}
                            className="w-full px-3 py-1.5 text-left text-[var(--error)] hover:bg-[var(--error-surface)] flex items-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-[var(--error)]" />
                            Remove Friend
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )))}
            </div>
          </section>
        )}

        {/* Tab 2: Activity & History */}
        {activeTab === 'HISTORY' && (
          <section className="space-y-3">
            <div className="px-1">
              <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                Recent Selfies, Duels & Milestones
              </span>
            </div>

            <div className="space-y-2.5">
              {historyLoading ? (
                <div className="space-y-2.5">
                  <div className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] animate-pulse flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-[var(--surface-secondary)] shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-3/4 bg-[var(--surface-secondary)] rounded" />
                      <div className="h-2.5 w-full bg-[var(--surface-secondary)] rounded" />
                      <div className="h-2 w-20 bg-[var(--surface-secondary)] rounded" />
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] animate-pulse flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-[var(--surface-secondary)] shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-2/3 bg-[var(--surface-secondary)] rounded" />
                      <div className="h-2.5 w-full bg-[var(--surface-secondary)] rounded" />
                      <div className="h-2 w-20 bg-[var(--surface-secondary)] rounded" />
                    </div>
                  </div>
                </div>
              ) : activityHistory.length === 0 ? (
                <EmptyState
                  title="No milestone history yet"
                  description="Take your daily selfie or battle in the Arena to record activity."
                  actionLabel="Take a Scan"
                  actionHref="/scan"
                />
              ) : (
                activityHistory.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-xs)] flex items-start gap-3"
                    >
                      <div className="w-9 h-9 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center shrink-0 shadow-[var(--shadow-xs)]">
                        <IconComponent className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[var(--text-main)] leading-tight truncate">
                            {item.title}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border shrink-0 ${item.badgeColor}`}>
                            {item.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">
                          {item.desc}
                        </p>
                        <span className="text-[10px] text-[var(--text-muted)] opacity-70 font-medium block mt-1">
                          {item.timestamp}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}
        </FramerTabPanel>

        {/* Account, Support & Legal Section */}
        <section className="pt-2 space-y-3">
          <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-xs)] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <LifeBuoy className="w-4 h-4 text-[var(--accent-brand)] shrink-0" />
              <div>
                <p className="text-xs font-bold text-[var(--text-main)]">Help &amp; Support</p>
                <p className="text-[10px] text-[var(--text-muted)]">Questions about scans, Arena duels, or Atelier orders</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openSupportModal}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity cursor-pointer"
              >
                Contact Support
              </button>
              <Link
                href="/terms"
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--surface-secondary)] text-[var(--foreground)] hover:opacity-90 transition-opacity inline-flex items-center gap-1"
              >
                <FileText className="w-3 h-3" />
                <span>Terms</span>
              </Link>
              <Link
                href="/privacy"
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--surface-secondary)] text-[var(--foreground)] hover:opacity-90 transition-opacity"
              >
                Privacy
              </Link>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-xs)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-[var(--success)] shrink-0" />
              <div>
                <p className="text-xs font-bold text-[var(--text-main)]">NDPA Biometric Protected</p>
                <p className="text-[10px] text-[var(--text-muted)] truncate max-w-[200px]">{user?.email || 'Authenticated User'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={signOut}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[var(--surface-secondary)] text-[var(--foreground)] hover:bg-[var(--surface-accent)] transition-colors cursor-pointer"
              >
                Sign Out
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[var(--error-surface)] text-[var(--error)] border border-[var(--error)]/25 hover:opacity-90 transition-colors cursor-pointer"
              >
                Delete Account
              </button>
            </div>
          </div>

          {/* Support Ticket Modal */}
          {showSupportModal && (
            <div
              onClick={() => setShowSupportModal(false)}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-[24px] bg-[var(--surface)] border border-[var(--border-card)] p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[var(--foreground)]">Help &amp; Support</h3>
                  <button
                    type="button"
                    onClick={() => setShowSupportModal(false)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--foreground-muted)] hover:bg-[var(--surface-secondary)] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSubmitSupport} className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--foreground-secondary)] block mb-1">
                      Category
                    </label>
                    <select
                      value={supportCategory}
                      onChange={(e) => setSupportCategory(e.target.value as typeof supportCategory)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--foreground)]"
                    >
                      <option value="GENERAL">General</option>
                      <option value="SCAN_SCORING">Scan &amp; Scoring</option>
                      <option value="ARENA_DUEL">Arena Duels</option>
                      <option value="ATELIER_ORDER">Atelier Order</option>
                      <option value="ACCOUNT_PRIVACY">Account &amp; Privacy</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[var(--foreground-secondary)] block mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      required
                      minLength={3}
                      value={supportSubject}
                      onChange={(e) => setSupportSubject(e.target.value)}
                      placeholder="Brief summary..."
                      className="w-full px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--foreground)]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[var(--foreground-secondary)] block mb-1">
                      Message
                    </label>
                    <textarea
                      required
                      minLength={10}
                      rows={3}
                      value={supportMessage}
                      onChange={(e) => setSupportMessage(e.target.value)}
                      placeholder="Describe how we can help..."
                      className="w-full px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--foreground)]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingSupport}
                    className="w-full py-2.5 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-60"
                  >
                    {submittingSupport ? 'Submitting...' : 'Submit Support Ticket'}
                  </button>
                </form>

                {myTickets.length > 0 && (
                  <div className="pt-3 border-t border-[var(--border)] space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] block">
                      Your Recent Tickets
                    </span>
                    {myTickets.map((t) => (
                      <div
                        key={t.id}
                        className="p-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="font-semibold text-[var(--foreground)] truncate">{t.subject}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--surface-secondary)] text-[var(--foreground-secondary)] shrink-0">
                          {t.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Delete Account Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <div className="w-full max-w-sm rounded-[24px] bg-[var(--surface)] border border-[var(--border-card)] p-6 space-y-4 shadow-2xl">
                <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-main)]">Delete Your Account?</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                    Under Nigerian Data Protection Act (NDPA) right-to-be-forgotten standards, your account, biometric consent, and personal data will be permanently anonymized. This action cannot be undone.
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    disabled={isDeleting}
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold bg-[var(--surface-secondary)] text-[var(--text-main)] hover:bg-neutral-200 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={isDeleting}
                    onClick={async () => {
                      setIsDeleting(true);
                      try {
                        await deleteAccount();
                      } catch (e) {
                        alert(e instanceof Error ? e.message : 'Failed to delete account');
                        setIsDeleting(false);
                      }
                    }}
                    className="flex-1 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Change Card Portrait / Avatar Modal */}
        {showAvatarModal && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[var(--surface)] border border-[var(--border-card)] rounded-[32px] p-6 shadow-2xl space-y-5 animate-scale-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-[var(--text-main)]">
                    Facecard Portrait
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    Select an archetype or upload your custom portrait
                  </p>
                </div>
                <button
                  onClick={() => setShowAvatarModal(false)}
                  className="p-1.5 rounded-full hover:bg-[var(--surface-secondary)] text-[var(--text-muted)] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Active Selection Large Preview */}
              <div className="flex flex-col items-center justify-center py-2">
                <div className="relative w-24 h-24 rounded-full p-1.5 ring-4 ring-[var(--focus-ring)] shadow-lg">
                  <UserAvatar
                    name={userInfo.name}
                    handle={userInfo.handle}
                    src={selectedAvatarUrl}
                    size="xl"
                    className="w-full h-full rounded-full object-cover"
                  />
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#251E24] border-2 border-white flex items-center justify-center">
                    <Layers className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
                <span className="text-xs font-bold text-[var(--text-main)] mt-2">
                  {userInfo.handle}
                </span>
              </div>

              {/* Archetype Presets Grid */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Archetype Presets
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {AVATAR_PRESETS.map((preset) => {
                    const isSelected = selectedAvatarUrl === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedAvatarUrl(preset.url)}
                        className={`p-2 rounded-2xl flex flex-col items-center gap-1.5 border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#EBDCD5]/40 border-[var(--accent-brand)] ring-2 ring-[var(--focus-ring)]/50'
                            : 'bg-[var(--bg-surface-warm)] border-black/5 dark:border-white/5 hover:border-black/15'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="w-10 h-10 rounded-full object-cover shadow-xs"
                        />
                        <span className="text-[10px] font-bold text-[var(--text-main)] truncate max-w-full">
                          {preset.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Upload Option */}
              <div className="pt-1">
                <input
                  ref={avatarFileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                  onChange={handleAvatarFileUpload}
                />
                <button
                  type="button"
                  onClick={() => avatarFileInputRef.current?.click()}
                  className="w-full py-2.5 px-3 rounded-2xl border border border-[var(--border)] hover:border-[var(--accent-brand)] bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)] flex items-center justify-center gap-2 text-xs font-bold text-[var(--accent-brand)] dark:text-[#D2B8C9] transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Custom Photo (up to 4MB)</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={isSavingAvatar}
                  onClick={() => setShowAvatarModal(false)}
                  className="flex-1 py-3 rounded-2xl text-xs font-bold bg-[var(--surface-secondary)] text-[var(--text-main)] hover:bg-neutral-200 dark:hover:bg-white/15 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingAvatar || !selectedAvatarUrl}
                  onClick={handleSaveAvatar}
                  className="flex-1 py-3 rounded-2xl text-xs font-bold bg-[#251E24] hover:bg-[#3A2F38] text-white border border-[var(--border-strong)] transition-all shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isSavingAvatar ? 'Saving...' : 'Save Portrait'}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
