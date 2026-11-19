'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BookmarkCheck,
  Camera,
  CheckCircle2,
  Download,
  Heart,
  Layers,
  Share2,
  Trash2,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { EmptyState, LoadingState } from '@/components/ui/StateViews';
import { useToast } from '@/components/common/ToastProvider';
import { SavedScanItem, scanService } from '@/services/scanService';

export default function GalleryPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<SavedScanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'FAVORITES'>('ALL');
  const [selected, setSelected] = useState<SavedScanItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [settingPortraitId, setSettingPortraitId] = useState<string | null>(null);

  const loadGallery = useCallback(async () => {
    setLoading(true);
    try {
      const res = await scanService.getSavedScans();
      if (res.success) {
        setItems(res.items || []);
      }
    } catch {
      showToast('Could not load saved gallery', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadGallery();
  }, [loadGallery]);

  const handleToggleFavorite = async (item: SavedScanItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setBusyId(item.id);
    try {
      const res = await scanService.updateSavedScan(item.id, { isFavorite: !item.isFavorite });
      if (res.success) {
        setItems((prev) => prev.map((it) => (it.id === item.id ? res.item : it)));
        if (selected?.id === item.id) setSelected(res.item);
      }
    } catch {
      showToast('Could not update favorite', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleDownload = (item: SavedScanItem) => {
    if (!item.imageDataUrl) return;
    const link = document.createElement('a');
    link.href = item.imageDataUrl;
    link.download = `facecard-scan-${item.score}-${item.id.slice(0, 6)}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Selfie downloaded', 'success');
  };

  const handleShare = async (item: SavedScanItem) => {
    const shareText = `Face Card Lethality Score: ${item.score}/100 (${item.band} · ${item.tier} Edition)${
      item.verdictLine ? ` — "${item.verdictLine}"` : ''
    }`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        if (item.imageDataUrl && navigator.canShare) {
          const blob = await (await fetch(item.imageDataUrl)).blob();
          const file = new File([blob], `facecard-${item.score}.jpg`, { type: blob.type || 'image/jpeg' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: `Face Card · ${item.score}/100`,
              text: shareText,
              files: [file],
            });
            return;
          }
        }
        await navigator.share({
          title: `Face Card · ${item.score}/100`,
          text: shareText,
          url: window.location.origin,
        });
        return;
      } catch {
        // User cancelled or share unsupported; fall back to clipboard
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(`${shareText} · ${window.location.origin}`);
      showToast('Scan summary copied to clipboard', 'success');
    }
  };

  const handleSetPortrait = async (item: SavedScanItem) => {
    if (!item.imageDataUrl) return;
    setSettingPortraitId(item.id);
    try {
      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: item.imageDataUrl }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update portrait');
      }
      showToast('Set as your Facecard portrait!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update portrait', 'error');
    } finally {
      setSettingPortraitId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    try {
      const res = await scanService.deleteSavedScan(id);
      if (res.success) {
        setItems((prev) => prev.filter((it) => it.id !== id));
        if (selected?.id === id) setSelected(null);
        setConfirmDeleteId(null);
        showToast('Removed from gallery', 'success');
      }
    } catch {
      showToast('Failed to delete saved scan', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const visibleItems = filter === 'FAVORITES' ? items.filter((i) => i.isFavorite) : items;

  return (
    <div className="relative min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans antialiased pb-28 md:pl-16 lg:pl-52">
      <main className="relative z-10 max-w-6xl xl:max-w-7xl mx-auto px-5 sm:px-8 pt-5 space-y-5">
        <PageHeader
          title="Saved Gallery"
          backHref="/home"
          backLabel="Back to home"
          rightSlot={
            <Link
              href="/scan"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>New Scan</span>
            </Link>
          }
        />

        <SurfaceCard variant="warm" padding="sm" className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--accent-brand)] shrink-0">
              <BookmarkCheck className="w-4 h-4" />
            </div>
            <p className="text-xs text-[var(--foreground-secondary)] leading-snug">
              Your private selfie archive. Only scans you explicitly save are stored here for revisiting, downloading, or sharing.
            </p>
          </div>
          <span className="text-xs font-bold text-[var(--foreground)] tabular-nums shrink-0">
            {items.length} Saved
          </span>
        </SurfaceCard>

        {/* Filter Tabs */}
        <div className="flex items-center p-1 rounded-full bg-[var(--surface)] border border-[var(--border)] max-w-xs">
          {(['ALL', 'FAVORITES'] as const).map((tab) => (
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
              {tab === 'ALL' ? `All (${items.length})` : `Favorites (${items.filter((i) => i.isFavorite).length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingState label="Loading your saved scans..." />
        ) : visibleItems.length === 0 ? (
          <EmptyState
            title={filter === 'FAVORITES' ? 'No favorites yet' : 'Your gallery is empty'}
            description={
              filter === 'FAVORITES'
                ? 'Tap the heart on any saved selfie to pin it here.'
                : 'Take a portrait scan and tap "Save to Gallery" on your results to keep the selfies you love.'
            }
            actionLabel="Take a Portrait Scan"
            actionHref="/scan"
          />
        ) : (
          <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {visibleItems.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelected(item)}
                className="group relative aspect-[3/4] rounded-[24px] overflow-hidden bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-sm)] cursor-pointer"
              >
                {item.imageDataUrl ? (
                  <img
                    src={item.imageDataUrl}
                    alt={`Saved scan ${item.score}/100`}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[var(--surface-secondary)] text-[var(--foreground-muted)] text-xs">
                    No preview
                  </div>
                )}

                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#251E24]/85 text-[#FAF7F4] text-[11px] font-bold tabular-nums">
                    ★ {item.score}
                  </span>
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={(e) => handleToggleFavorite(item, e)}
                    aria-label={item.isFavorite ? 'Remove favorite' : 'Favorite scan'}
                    className="w-8 h-8 rounded-full bg-[#251E24]/75 text-[#FAF7F4] flex items-center justify-center hover:bg-[#251E24] transition-colors cursor-pointer"
                  >
                    <Heart
                      className={`w-4 h-4 ${item.isFavorite ? 'fill-[#F2A5B1] text-[#F2A5B1]' : 'text-[#FAF7F4]'}`}
                    />
                  </button>
                </div>

                <div className="absolute inset-x-2 bottom-2 p-2.5 rounded-2xl bg-[#251E24]/88 text-[#FAF7F4] border border-[#EBDCD5]/15 space-y-0.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold uppercase tracking-wider text-[#D2B8C9]">
                      {item.band}
                    </span>
                    <span className="text-[#FAF7F4]/75">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {item.verdictLine && (
                    <p className="text-[11px] text-[#FAF7F4]/90 line-clamp-1">{item.verdictLine}</p>
                  )}
                </div>
              </div>
            ))}
          </section>
        )}
      </main>

      {/* Lightbox Detail Modal */}
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Saved scan details"
          onClick={() => {
            setSelected(null);
            setConfirmDeleteId(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#251E24]/75 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-[28px] bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] shadow-[var(--shadow-modal)] overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="px-5 py-3.5 flex items-center justify-between border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-bold tabular-nums">
                  ★ {selected.score}/100
                </span>
                <span className="text-xs font-semibold text-[var(--foreground-secondary)]">
                  {selected.band} · {selected.tier}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setConfirmDeleteId(null);
                }}
                aria-label="Close"
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--foreground-muted)] hover:bg-[var(--surface-secondary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              {selected.imageDataUrl && (
                <div className="aspect-[3/4] w-full max-h-[45vh] mx-auto rounded-2xl overflow-hidden bg-black border border-[var(--border)]">
                  <img
                    src={selected.imageDataUrl}
                    alt={`Scan ${selected.score}/100`}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {selected.verdictLine && (
                <p className="text-xs italic text-center text-[var(--foreground-secondary)]">
                  &ldquo;{selected.verdictLine}&rdquo;
                </p>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleDownload(selected)}
                  className="py-2.5 px-4 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleShare(selected)}
                  className="py-2.5 px-4 rounded-full bg-[var(--surface-secondary)] text-[var(--foreground)] border border-[var(--border-strong)] hover:opacity-90 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </button>
              </div>

              <button
                type="button"
                disabled={settingPortraitId === selected.id}
                onClick={() => handleSetPortrait(selected)}
                className="w-full py-2.5 px-4 rounded-full bg-[var(--success-surface)] text-[var(--success)] border border-[var(--success)]/30 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {settingPortraitId === selected.id ? (
                  <span>Updating Portrait...</span>
                ) : (
                  <>
                    <Layers className="w-3.5 h-3.5" />
                    <span>Set as Facecard Portrait</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between pt-1 border-t border-[var(--border)]">
                <button
                  type="button"
                  disabled={busyId === selected.id}
                  onClick={() => handleToggleFavorite(selected)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--foreground-secondary)] hover:text-[var(--foreground)] cursor-pointer"
                >
                  <Heart
                    className={`w-4 h-4 ${
                      selected.isFavorite ? 'fill-[#A34753] text-[#A34753]' : ''
                    }`}
                  />
                  <span>{selected.isFavorite ? 'Favorited' : 'Add to Favorites'}</span>
                </button>

                {confirmDeleteId === selected.id ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-xs text-[var(--foreground-muted)] hover:underline cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={busyId === selected.id}
                      onClick={() => handleDelete(selected.id)}
                      className="px-3 py-1 rounded-full bg-[var(--error)] text-white text-xs font-semibold cursor-pointer"
                    >
                      Confirm Delete
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(selected.id)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--error)] hover:underline cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
