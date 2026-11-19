'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Clock,
  Gift,
  Heart,
  Layers,
  ShoppingBag,
  Zap,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { EmptyState } from '@/components/ui/StateViews';
import { resolveItemAppearance, BOUTIQUE_CATEGORY_PALETTES } from '@/lib/boutique/palette';
import { CollectibleArtwork } from '@/components/boutique/CollectibleArtwork';

type VanityTab = 'OWNED' | 'EFFECTS' | 'GIFTS' | 'COLLECTIONS' | 'HISTORY';

export default function VanityPage() {
  const [tab, setTab] = useState<VanityTab>('OWNED');
  const [data, setData] = useState<any>(null);
  const [inbox, setInbox] = useState<any[]>([]);
  const [sentGifts, setSentGifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, inboxRes, sentRes] = await Promise.all([
        fetch('/api/inventory'),
        fetch('/api/gifts/inbox'),
        fetch('/api/gifts/sent'),
      ]);
      if (invRes.ok) setData(await invRes.json());
      if (inboxRes.ok) setInbox((await inboxRes.json()).gifts || []);
      if (sentRes.ok) setSentGifts((await sentRes.json()).gifts || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleEquipToggle = async (userItemId: string, isEquipped: boolean) => {
    const endpoint = isEquipped
      ? `/api/inventory/${userItemId}/unequip`
      : `/api/inventory/${userItemId}/equip`;
    const res = await fetch(endpoint, { method: 'POST' });
    const json = await res.json();
    if (res.ok) {
      notify(isEquipped ? 'Item unequipped (ownership retained)' : 'Item equipped');
      await loadAll();
    } else {
      notify(json.error || 'Action failed');
    }
  };

  const handleActivate = async (userItemId: string) => {
    const res = await fetch(`/api/inventory/${userItemId}/activate`, { method: 'POST' });
    const json = await res.json();
    if (res.ok) {
      notify('Effect activated');
      await loadAll();
    } else {
      notify(json.error || 'Activation failed');
    }
  };

  const handleGiftDecision = async (giftId: string, decision: 'accept' | 'decline') => {
    const res = await fetch(`/api/gifts/${giftId}/${decision}`, { method: 'POST' });
    const json = await res.json();
    if (res.ok) {
      notify(
        decision === 'accept'
          ? 'Gift accepted and added to your Vanity!'
          : 'Gift declined and points refunded to sender.'
      );
      await loadAll();
    } else {
      notify(json.error || 'Could not process gift');
    }
  };

  const ownedItems = data?.ownedItems || [];
  const activeEffects = data?.activeEffects || [];
  const movements = data?.movements || [];
  const collections = data?.collectionProgress || [];
  const pendingGiftsCount = inbox.filter((g) => g.status === 'PENDING').length;

  return (
    <div className="min-h-screen pb-28 bg-[var(--background)] text-[var(--foreground)] md:pl-16 lg:pl-52">
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[#251E24] text-[#FAF7F4] text-xs font-semibold shadow-lg">
          {toast}
        </div>
      )}

      <main className="max-w-5xl mx-auto px-5 sm:px-8 pt-6 space-y-6">
        <PageHeader
          title="The Vanity"
          backHref="/shop"
          backLabel="Back to Boutique"
          rightSlot={
            <Link
              href="/shop"
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-semibold"
            >
              <ShoppingBag className="w-3.5 h-3.5" /> Visit Boutique
            </Link>
          }
        />

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'OWNED', label: `Owned (${ownedItems.length})` },
              { id: 'EFFECTS', label: `Active Effects (${activeEffects.filter((e: any) => e.status === 'ACTIVE').length})` },
              { id: 'GIFTS', label: `Gifts${pendingGiftsCount > 0 ? ` (${pendingGiftsCount} new)` : ''}` },
              { id: 'COLLECTIONS', label: 'Collections' },
              { id: 'HISTORY', label: 'History' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`h-9 px-4 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                tab === t.id
                  ? 'bg-[#251E24] text-[#FAF7F4]'
                  : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-secondary)] hover:text-[var(--foreground)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <SurfaceCard padding="lg" className="text-center text-xs text-[var(--foreground-muted)]">
            Loading your Vanity...
          </SurfaceCard>
        ) : (
          <>
            {tab === 'OWNED' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ownedItems.length === 0 ? (
                  <div className="col-span-full">
                    <EmptyState
                      icon={<Layers className="w-6 h-6" />}
                      title="Your Vanity is empty"
                      description="Explore The Boutique to collect card skins, profile frames, and perks."
                    />
                  </div>
                ) : (
                  ownedItems.map((entry: any) => {
                    const item = entry.item;
                    const appearance = resolveItemAppearance(item);
                    const isEquipable =
                      item.effectKind === 'EQUIP_COSMETIC' ||
                      ['SKIN', 'FRAME', 'TITLE'].includes(item.kind);
                    const isActivatable =
                      item.effectKind &&
                      ['REWARD_MULTIPLIER', 'FEATURE_ENTITLEMENT', 'EXPORT_ENTITLEMENT', 'PROFILE_SHOWCASE'].includes(
                        item.effectKind
                      );

                    return (
                      <SurfaceCard key={entry.id} padding="md" className="space-y-3 flex flex-col justify-between">
                        <div
                          className="rounded-xl p-3 flex items-center gap-3 border"
                          style={{
                            backgroundColor: appearance.palette.surface,
                            borderColor: appearance.palette.border,
                            color: appearance.palette.text,
                          }}
                        >
                          <CollectibleArtwork
                            slug={item.slug}
                            presetKey={appearance.presetKey}
                            palette={appearance.palette}
                            artworkUrl={appearance.artworkUrl}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between text-[10px] opacity-80">
                              <span className="uppercase tracking-wider font-semibold">{item.rarity || item.kind}</span>
                              <span>Qty: {entry.quantity}</span>
                            </div>
                            <h3 className="text-sm font-bold truncate">{item.name}</h3>
                          </div>
                        </div>
                        <p className="text-xs text-[var(--foreground-secondary)]">{item.description}</p>
                        <div className="flex items-center gap-2 pt-2">
                          {isEquipable && (
                            <button
                              type="button"
                              onClick={() => handleEquipToggle(entry.id, entry.isEquipped)}
                              className={`flex-1 h-8 rounded-full text-xs font-semibold cursor-pointer ${
                                entry.isEquipped
                                  ? 'bg-[#F1E6ED] text-[#251E24] border border-[#96788D]'
                                  : 'bg-[#251E24] text-[#FAF7F4]'
                              }`}
                            >
                              {entry.isEquipped ? 'Equipped · Unequip' : 'Equip'}
                            </button>
                          )}
                          {isActivatable && (
                            <button
                              type="button"
                              onClick={() => handleActivate(entry.id)}
                              className="flex-1 h-8 rounded-full bg-[#96788D] text-white text-xs font-semibold cursor-pointer inline-flex items-center justify-center gap-1"
                            >
                              <Zap className="w-3.5 h-3.5" /> Activate
                            </button>
                          )}
                        </div>
                      </SurfaceCard>
                    );
                  })
                )}
              </div>
            )}

            {tab === 'EFFECTS' && (
              <div className="space-y-3">
                {activeEffects.length === 0 ? (
                  <EmptyState
                    icon={<Clock className="w-6 h-6" />}
                    title="No active or past effects"
                    description="Activate a Studio Pass, Share Studio Pass, or accept a timed gift to track it here."
                  />
                ) : (
                  activeEffects.map((eff: any) => (
                    <SurfaceCard key={eff.id} padding="md" className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold">{eff.item?.name || eff.effectKind}</div>
                        <div className="text-xs text-[var(--foreground-secondary)]">
                          Status: <strong>{eff.status}</strong>
                          {eff.remainingUses !== null && ` · Uses left: ${eff.remainingUses}`}
                          {eff.expiresAt && ` · Expires: ${new Date(eff.expiresAt).toLocaleString()}`}
                          {eff.terminalReason && ` · Ended: ${eff.terminalReason}`}
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-semibold ${
                          eff.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-[#F1E6ED] text-[#6E6069]'
                        }`}
                      >
                        {eff.status}
                      </span>
                    </SurfaceCard>
                  ))
                )}
              </div>
            )}

            {tab === 'GIFTS' && (
              <div className="space-y-5">
                <div className="space-y-3">
                  <h2 className="text-sm font-bold">Gift Inbox</h2>
                  {inbox.length === 0 ? (
                    <EmptyState
                      icon={<Gift className="w-6 h-6" />}
                      title="No gifts received yet"
                      description="Gifts sent by members in your Circle will appear here."
                    />
                  ) : (
                    inbox.map((g: any) => (
                      <SurfaceCard key={g.id} padding="md" className="flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-sm font-bold">
                            {g.item?.name} from @{g.sender?.handle || g.sender?.displayName}
                          </div>
                          {g.message && <p className="text-xs italic text-[var(--foreground-secondary)]">“{g.message}”</p>}
                          <div className="text-[11px] text-[var(--foreground-muted)]">
                            Status: {g.status} · Expires {new Date(g.expiresAt).toLocaleDateString()}
                          </div>
                        </div>
                        {g.status === 'PENDING' ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleGiftDecision(g.id, 'accept')}
                              className="px-4 h-8 rounded-full bg-[#251E24] text-[#FAF7F4] text-xs font-semibold cursor-pointer"
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              onClick={() => handleGiftDecision(g.id, 'decline')}
                              className="px-4 h-8 rounded-full border border-[var(--border)] text-xs font-semibold cursor-pointer"
                            >
                              Decline
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-[var(--foreground-muted)]">{g.status}</span>
                        )}
                      </SurfaceCard>
                    ))
                  )}
                </div>

                {sentGifts.length > 0 && (
                  <div className="space-y-2">
                    <h2 className="text-sm font-bold">Sent Gifts</h2>
                    {sentGifts.map((g: any) => (
                      <SurfaceCard key={g.id} padding="sm" className="flex items-center justify-between text-xs">
                        <span>
                          {g.item?.name} → @{g.recipient?.handle || g.recipient?.displayName}
                        </span>
                        <span className="text-[var(--foreground-muted)]">{g.status}</span>
                      </SurfaceCard>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'COLLECTIONS' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {collections.length === 0 ? (
                  <div className="col-span-full">
                    <EmptyState
                      icon={<Heart className="w-6 h-6" />}
                      title="No collections published yet"
                      description="Curated collections will appear here as items release."
                    />
                  </div>
                ) : (
                  collections.map((col: any) => {
                    const colPalette = BOUTIQUE_CATEGORY_PALETTES.COLLECTIONS.palette;
                    return (
                    <SurfaceCard
                      key={col.id}
                      padding="md"
                      className="space-y-3 border"
                      style={{ backgroundColor: colPalette.surface, borderColor: colPalette.border, color: colPalette.text }}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold">{col.name}</h3>
                        <span className="text-xs font-semibold" style={{ color: colPalette.accent }}>
                          {col.ownedCount}/{col.total}
                        </span>
                      </div>
                      <p className="text-xs opacity-80">{col.description}</p>
                      <div className="space-y-1">
                        {col.items.map((ci: any) => (
                          <div key={ci.id} className="flex items-center justify-between text-xs">
                            <span className={ci.owned ? 'font-semibold' : 'opacity-65'}>
                              {ci.name}
                            </span>
                            {ci.owned && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />}
                          </div>
                        ))}
                      </div>
                    </SurfaceCard>
                    );
                  })
                )}
              </div>
            )}

            {tab === 'HISTORY' && (
              <div className="space-y-2">
                {movements.length === 0 ? (
                  <EmptyState
                    icon={<Clock className="w-6 h-6" />}
                    title="No inventory movements yet"
                    description="Purchases, gifts, and activations are recorded here."
                  />
                ) : (
                  movements.map((m: any) => (
                    <SurfaceCard key={m.id} padding="sm" className="flex items-center justify-between text-xs">
                      <span>
                        <strong>{m.item?.name}</strong> · {m.reason} ({m.quantityDelta > 0 ? `+${m.quantityDelta}` : m.quantityDelta})
                      </span>
                      <span className="text-[var(--foreground-muted)]">
                        {new Date(m.createdAt).toLocaleString()}
                      </span>
                    </SurfaceCard>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
