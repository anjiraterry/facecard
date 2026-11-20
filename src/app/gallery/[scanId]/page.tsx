'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, CheckCircle2, Coins, ShieldCheck, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { SurfaceCard } from '@/components/ui/SurfaceCard';

interface ScanDetail {
  id: string;
  score: number;
  band: string;
  verdictLine: string;
  modelVersion?: string;
  promptVersion?: string;
  source?: string;
  pointsEarned: number;
  multiplier: number;
  scanIndexOfDay: number;
  evaluatedAt: string;
  categoryScores: Record<string, unknown> | null;
}

export default function GalleryScanDetailPage({
  params,
}: {
  params: Promise<{ scanId: string }>;
}) {
  const { scanId } = use(params);
  const [scan, setScan] = useState<ScanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/scans/${encodeURIComponent(scanId)}`, { credentials: 'include' })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Scan not found');
        if (active) setScan(json.scan);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load scan');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [scanId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] md:pl-16 lg:pl-52 p-6">
        <div className="max-w-3xl mx-auto animate-pulse space-y-4">
          <div className="h-8 w-48 rounded-lg bg-[var(--muted)]" />
          <div className="h-48 rounded-3xl bg-[var(--muted)]" />
        </div>
      </div>
    );
  }

  if (error || !scan) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] md:pl-16 lg:pl-52 p-6">
        <div className="max-w-xl mx-auto pt-12 text-center space-y-4">
          <h1 className="text-2xl font-serif font-semibold">Analysis Unavailable</h1>
          <p className="text-sm text-[var(--muted-foreground)]">{error}</p>
          <Link
            href="/gallery"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Gallery
          </Link>
        </div>
      </div>
    );
  }

  const cs = scan.categoryScores as {
    scoringVersion?: string;
    components?: Array<{ id: string; label: string; weight: number; score: number }>;
    photoCraft?: number;
    harmony?: number;
    skinClarity?: number;
    expression?: number;
    aura?: number;
  } | null;

  return (
    <div className="min-h-screen pb-28 bg-[var(--background)] text-[var(--foreground)] md:pl-16 lg:pl-52">
      <main className="max-w-3xl mx-auto px-5 sm:px-8 pt-6 space-y-6">
        <PageHeader
          title="Historical Analysis"
          backHref="/gallery"
          backLabel="The Gallery"
          rightSlot={
            <span className="px-3 py-1 rounded-full bg-[var(--card)] border border-[var(--border)] text-[11px] font-semibold">
              {cs?.scoringVersion || scan.modelVersion || 'Legacy Rubric'}
            </span>
          }
        />

        <SurfaceCard className="p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[var(--muted-foreground)] font-semibold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(scan.evaluatedAt).toLocaleString()}
              </p>
              <h1 className="text-4xl font-serif font-bold mt-1">
                {scan.score} <span className="text-base font-normal text-[var(--muted-foreground)]">/ 100 · {scan.band}</span>
              </h1>
            </div>
            <div className="text-right text-xs space-y-1">
              <p className="font-semibold flex items-center justify-end gap-1">
                <Coins className="w-3.5 h-3.5 text-[var(--primary)]" /> +{scan.pointsEarned} PTS earned
              </p>
              <p className="text-[var(--muted-foreground)]">
                Multiplier: ×{scan.multiplier.toFixed(1)} · Scan #{scan.scanIndexOfDay}
              </p>
            </div>
          </div>

          <p className="text-sm italic text-[var(--muted-foreground)]">“{scan.verdictLine}”</p>

          <div className="pt-2 border-t border-[var(--border)] flex flex-wrap gap-3 text-[11px] text-[var(--muted-foreground)]">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Immutable persisted record
            </span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--primary)]" /> Viewing archive does not consume scan allowance
            </span>
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-6 space-y-4">
          <h2 className="text-lg font-serif font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--primary)]" /> Factor Breakdown
          </h2>

          {Array.isArray(cs?.components) ? (
            <div className="space-y-3">
              {cs.components.map((c) => (
                <div key={c.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">
                      {c.label} <span className="text-[var(--muted-foreground)]">({Math.round(c.weight * 100)}%)</span>
                    </span>
                    <span className="font-mono font-bold">{c.score}/100</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--muted)] overflow-hidden">
                    <div className="h-full bg-[var(--primary)] rounded-full" style={{ width: `${c.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              {cs?.photoCraft !== undefined && (
                <div className="p-3 rounded-xl bg-[var(--muted)]/50">
                  <span className="text-[var(--muted-foreground)] block">Photo Craft</span>
                  <span className="font-bold text-base">{cs.photoCraft}</span>
                </div>
              )}
              {cs?.harmony !== undefined && (
                <div className="p-3 rounded-xl bg-[var(--muted)]/50">
                  <span className="text-[var(--muted-foreground)] block">Facial Harmony</span>
                  <span className="font-bold text-base">{cs.harmony}</span>
                </div>
              )}
              {cs?.skinClarity !== undefined && (
                <div className="p-3 rounded-xl bg-[var(--muted)]/50">
                  <span className="text-[var(--muted-foreground)] block">Skin Clarity</span>
                  <span className="font-bold text-base">{cs.skinClarity}</span>
                </div>
              )}
            </div>
          )}
        </SurfaceCard>
      </main>
    </div>
  );
}
