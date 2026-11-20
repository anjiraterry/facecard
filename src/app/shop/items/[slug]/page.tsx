'use client';

import React, { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Coins,
  Gift,
  Lock,
  ShieldAlert,
  Sparkles,
  Zap,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { FaceCard } from '@/components/card/FaceCard';
import { CollectibleArtwork } from '@/components/boutique/CollectibleArtwork';
import { resolveItemAppearance } from '@/lib/boutique/palette';
import { useFriends } from '@/hooks/useFriends';
import type { Tier } from '@/types';

interface ItemDetailResponse {
  success: boolean;
  user: {
    tier: Tier;
    spendableBalance: number;
    displayName: string;
    handle: string | null;
  };
  item: {
    id: string;
    sku: string | null;
    slug: string;
    name: string;
    description: string;
    kind: string;
    category: string;
    categoryLabel: string;
    rarity: string;
    price: number;
    minTier: Tier;
    maxOwned: number;
    isGiftable: boolean;
    active: boolean;
    status: string;
    slot: string | null;
    effectKind: string | null;
    currentVersionId: string | null;
    gradient: string;
  };
  lifecycle: {
    effectDescription: string;
    activationLabel: string;
    durationLabel: string;
    usesLabel: string;
    ownershipLimitLabel: string;
    stackingPolicyLabel: string;
    supportedModules: string[];
    usageInstructions: string[];
    endingBehavior: string;
    refundPolicy: string;
    isSupported: boolean;
    validationErrors: string[];
  };
  customerState: {
    ownershipStatus: string;
    ownedQuantity: number;
    userItemId: string | null;
    isEquipped: boolean;
    tierLocked: boolean;
    canAfford: boolean;
    activeEffect: {
      id: string;
      status: string;
      startsAt: string;
      expiresAt: string | null;
      remainingUses: number | null;
      remainingBonusPoints: number | null;
    } | null;
    primaryAction: {
      action: string;
      label: string;
      reason?: string;
    };
  };
}

export default function BoutiqueItemDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const { friends } = useFriends();

  const [data, setData] = useState<ItemDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [giftHandle, setGiftHandle] = useState('');
  const [giftMessage, setGiftMessage] = useState('');

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const loadItem = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/shop/items/${encodeURIComponent(slug)}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Could not load Boutique item');
        setData(null);
      } else {
        setData(json);
      }
    } catch {
      setError('Network error while loading Boutique item');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void loadItem();
  }, [loadItem]);

  const handlePrimaryAction = async () => {
    if (!data) return;
    const { action } = data.customerState.primaryAction;

    if (action === 'EARN_POINTS') {
      router.push('/scan');
      return;
    }
    if (action === 'VIEW_TIER_REQUIREMENTS') {
      router.push('/card');
      return;
    }
    if (action === 'VIEW_ACTIVE_EFFECT') {
      router.push('/vanity');
      return;
    }
    if (action === 'SEND_GIFT') {
      setShowGiftModal(true);
      return;
    }

    setBusy(true);
    try {
      if (action === 'PURCHASE') {
        const res = await fetch('/api/shop/purchase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId: data.item.id,
            expectedUnitPricePoints: data.item.price,
            expectedItemVersionId: data.item.currentVersionId,
            quantity: 1,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          notify(json.error || 'Purchase failed');
        } else {
          notify(`Purchased ${data.item.name}!`);
          await loadItem();
        }
      } else if (action === 'EQUIP' && data.customerState.userItemId) {
        const res = await fetch(`/api/inventory/${data.customerState.userItemId}/equip`, {
          method: 'POST',
        });
        const json = await res.json();
        notify(res.ok ? `${data.item.name} equipped!` : json.error || 'Failed to equip');
        await loadItem();
      } else if (action === 'UNEQUIP' && data.customerState.userItemId) {
        const res = await fetch(`/api/inventory/${data.customerState.userItemId}/unequip`, {
          method: 'POST',
        });
        const json = await res.json();
        notify(res.ok ? `${data.item.name} unequipped.` : json.error || 'Failed to unequip');
        await loadItem();
      } else if (action === 'ACTIVATE' && data.customerState.userItemId) {
        const res = await fetch(`/api/inventory/${data.customerState.userItemId}/activate`, {
          method: 'POST',
        });
        const json = await res.json();
        notify(res.ok ? `${data.item.name} activated!` : json.error || 'Activation failed');
        await loadItem();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSendGift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || !giftHandle.trim()) return;
    setBusy(true);
    try {
      const res = await fetch('/api/gifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: data.item.id,
          recipientHandle: giftHandle.trim().replace(/^@/, ''),
          message: giftMessage.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        notify(json.error || 'Failed to send gift');
      } else {
        notify(`Gift sent to @${giftHandle.trim().replace(/^@/, '')}!`);
        setShowGiftModal(false);
        setGiftHandle('');
        setGiftMessage('');
        await loadItem();
      }
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] md:pl-16 lg:pl-52 p-6">
        <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
          <div className="h-8 w-48 rounded-lg bg-[var(--muted)]" />
          <div className="h-64 rounded-3xl bg-[var(--muted)]" />
          <div className="h-48 rounded-3xl bg-[var(--muted)]" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] md:pl-16 lg:pl-52 p-6">
        <div className="max-w-2xl mx-auto pt-12 text-center space-y-4">
          <ShieldAlert className="w-10 h-10 mx-auto text-[var(--primary)]" />
          <h1 className="text-2xl font-serif font-semibold">Item Not Found</h1>
          <p className="text-sm text-[var(--muted-foreground)]">{error || 'This Boutique item could not be found.'}</p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Boutique
          </Link>
        </div>
      </div>
    );
  }

  const { item, lifecycle, customerState, user } = data;
  const appearance = resolveItemAppearance(item);
  const isCardCosmetic = item.slot === 'CARD_SKIN' || item.slot === 'CARD_FRAME';
  const primaryDisabled =
    busy ||
    customerState.primaryAction.action === 'UNAVAILABLE' ||
    customerState.primaryAction.action === 'NOT_PURCHASABLE';

  const statusBadge = !lifecycle.isSupported
    ? { label: 'Not Purchasable', cls: 'bg-rose-500/10 text-rose-700 border-rose-500/20' }
    : customerState.activeEffect
      ? { label: 'Active', cls: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' }
      : customerState.isEquipped
        ? { label: 'Equipped', cls: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' }
        : customerState.tierLocked
          ? { label: `Requires ${item.minTier}`, cls: 'bg-amber-500/10 text-amber-700 border-amber-500/20' }
          : !item.active || item.status !== 'PUBLISHED'
            ? { label: 'Unavailable', cls: 'bg-stone-500/10 text-stone-600 border-stone-500/20' }
            : { label: 'Available', cls: 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20' };

  return (
    <div className="min-h-screen pb-28 bg-[var(--background)] text-[var(--foreground)] md:pl-16 lg:pl-52">
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[#251E24] text-[#FAF7F4] text-xs font-semibold shadow-lg">
          {toast}
        </div>
      )}

      <main className="max-w-4xl mx-auto px-5 sm:px-8 pt-6 space-y-6">
        <PageHeader
          title={item.name}
          backHref="/shop"
          backLabel="The Boutique"
          rightSlot={
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--card)] border border-[var(--border)] text-xs font-semibold tabular-nums">
              <Coins className="w-3.5 h-3.5 text-[var(--primary)]" />
              Your balance: {user.spendableBalance.toLocaleString()} PTS
            </div>
          }
        />

        <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-widest text-[var(--muted-foreground)] font-semibold">
          <span>THE BOUTIQUE / {item.category}</span>
          <span>·</span>
          <span>
            {item.kind} · {item.rarity}
          </span>
          <span className={`ml-auto px-2.5 py-0.5 rounded-full border text-[10px] ${statusBadge.cls}`}>
            {statusBadge.label}
          </span>
        </div>

        {/* Hero Preview + Action */}
        <SurfaceCard className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="flex items-center justify-center">
            {isCardCosmetic ? (
              <div className="w-full max-w-[340px]">
                <FaceCard
                  variant="preview"
                  card={{
                    id: 'preview-card',
                    cardNumber: 'FC-PREVIEW',
                    cardholderName: user.displayName,
                    handle: user.handle || 'member',
                    tier: user.tier,
                    score: 88,
                    band: 'LETHAL',
                    skinId: item.slot === 'CARD_SKIN' ? item.slug : undefined,
                    frameId: item.slot === 'CARD_FRAME' ? item.slug : undefined,
                    issuedAt: new Date().toISOString(),
                  }}
                />
              </div>
            ) : (
              <div
                className="w-48 h-48 rounded-3xl flex items-center justify-center shadow-inner border border-[var(--border)]"
                style={{ background: item.gradient }}
              >
                <CollectibleArtwork
                  slug={item.slug}
                  presetKey={appearance.presetKey}
                  palette={appearance.palette}
                  texture={appearance.texture}
                  size="lg"
                />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-serif font-semibold">{item.name}</h1>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">{item.description}</p>
            </div>

            <div className="flex items-baseline gap-4 pt-1">
              <span className="text-2xl font-bold tabular-nums">{item.price.toLocaleString()} PTS</span>
              <span className="text-xs text-[var(--muted-foreground)] font-medium">
                You own: {customerState.ownedQuantity} / {item.maxOwned}
              </span>
            </div>

            {customerState.activeEffect && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-200 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> Active Effect Running
                </div>
                {customerState.activeEffect.expiresAt && (
                  <p>Expires: {new Date(customerState.activeEffect.expiresAt).toLocaleString()}</p>
                )}
                {customerState.activeEffect.remainingUses !== null && (
                  <p>Remaining uses: {customerState.activeEffect.remainingUses}</p>
                )}
              </div>
            )}

            {customerState.primaryAction.reason && (
              <p className="text-xs text-[var(--muted-foreground)] flex items-center gap-1.5">
                {customerState.tierLocked ? <Lock className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                {customerState.primaryAction.reason}
              </p>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                disabled={primaryDisabled}
                onClick={() => void handlePrimaryAction()}
                className="flex-1 min-w-[160px] h-11 px-5 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-semibold disabled:opacity-45 transition-opacity"
              >
                {busy ? 'Processing...' : customerState.primaryAction.label}
              </button>

              {item.isGiftable && customerState.primaryAction.action !== 'SEND_GIFT' && (
                <button
                  type="button"
                  disabled={busy || !lifecycle.isSupported}
                  onClick={() => setShowGiftModal(true)}
                  className="h-11 px-4 rounded-full border border-[var(--border)] bg-[var(--card)] text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Gift className="w-3.5 h-3.5" /> Send as gift
                </button>
              )}
            </div>
          </div>
        </SurfaceCard>

        {/* What it does & Specification Grid */}
        <SurfaceCard className="p-6 space-y-5">
          <div>
            <h2 className="text-lg font-serif font-semibold">What it does</h2>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">{lifecycle.effectDescription}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2 border-t border-[var(--border)] text-xs">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] font-semibold">Activation</p>
              <p className="font-medium mt-0.5">{lifecycle.activationLabel}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] font-semibold">Duration</p>
              <p className="font-medium mt-0.5">{lifecycle.durationLabel}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] font-semibold">Uses</p>
              <p className="font-medium mt-0.5">{lifecycle.usesLabel}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] font-semibold">Ownership Limit</p>
              <p className="font-medium mt-0.5">{lifecycle.ownershipLimitLabel}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] font-semibold">Works In</p>
              <p className="font-medium mt-0.5">{lifecycle.supportedModules.join(', ') || 'None'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] font-semibold">Required Tier</p>
              <p className="font-medium mt-0.5">{item.minTier}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] font-semibold">Stacking Policy</p>
              <p className="font-medium mt-0.5">{lifecycle.stackingPolicyLabel}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] font-semibold">Giftability</p>
              <p className="font-medium mt-0.5">{item.isGiftable ? 'Giftable to Circle friends' : 'Personal item only'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] font-semibold">Ending Behaviour</p>
              <p className="font-medium mt-0.5">{lifecycle.endingBehavior}</p>
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--border)] text-xs text-[var(--muted-foreground)]">
            <span className="font-semibold text-[var(--foreground)]">Refund policy: </span>
            {lifecycle.refundPolicy}
          </div>
        </SurfaceCard>

        {/* How to use it */}
        <SurfaceCard className="p-6 space-y-4">
          <h2 className="text-lg font-serif font-semibold">How to use it</h2>
          <ol className="space-y-3">
            {lifecycle.usageInstructions.map((step, idx) => (
              <li key={idx} className="flex items-start gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-[var(--primary)]/15 text-[var(--primary)] text-xs font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
          {customerState.ownedQuantity > 0 && (
            <div className="pt-2">
              <Link
                href="/vanity"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--primary)] hover:underline"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Manage in your Vanity inventory →
              </Link>
            </div>
          )}
        </SurfaceCard>
      </main>

      {showGiftModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <SurfaceCard className="w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-serif font-semibold">Send {item.name} as a gift</h3>
            <form onSubmit={handleSendGift} className="space-y-3">
              <div>
                <label className="text-xs font-semibold block mb-1">Recipient handle</label>
                <input
                  type="text"
                  required
                  value={giftHandle}
                  onChange={(e) => setGiftHandle(e.target.value)}
                  placeholder="username"
                  list="circle-friends-list"
                  className="w-full h-10 px-3 rounded-xl border border-[var(--border)] bg-[var(--background)] text-sm"
                />
                <datalist id="circle-friends-list">
                  {friends.map((f) => (
                    <option key={f.id} value={f.handle || f.name} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">Personal note (optional)</label>
                <textarea
                  value={giftMessage}
                  onChange={(e) => setGiftMessage(e.target.value)}
                  rows={2}
                  className="w-full p-3 rounded-xl border border-[var(--border)] bg-[var(--background)] text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGiftModal(false)}
                  className="h-9 px-4 rounded-full border border-[var(--border)] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="h-9 px-5 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-semibold"
                >
                  {busy ? 'Sending...' : `Send (${item.price} PTS)`}
                </button>
              </div>
            </form>
          </SurfaceCard>
        </div>
      )}
    </div>
  );
}
