'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Info, Sparkles, X } from 'lucide-react';
import type { SkinAppearanceObservation, SkinObservationItem } from '@/lib/vision/skinAppearanceEngine';

interface SkinEditFunnelCardProps {
  skinAppearance: SkinAppearanceObservation | null;
  scanId?: string | null;
}

const FEATURED_KEYS = new Set([
  'tone_unevenness',
  'visible_surface_texture',
  'surface_shine',
  'surface_reflection',
  'visible_redness',
]);

export function SkinEditFunnelCard({ skinAppearance, scanId }: SkinEditFunnelCardProps) {
  const [decisions, setDecisions] = useState<Record<string, 'confirmed' | 'dismissed'>>({});

  const observations = skinAppearance?.observations ?? [];
  const featured = observations.filter((o) => FEATURED_KEYS.has(o.id)).slice(0, 3);
  const displayList: SkinObservationItem[] = featured.length > 0 ? featured : observations.slice(0, 3);

  const handleDecision = async (obs: SkinObservationItem, status: 'confirmed' | 'dismissed') => {
    setDecisions((prev) => ({ ...prev, [obs.id]: status }));
    try {
      await fetch('/api/atelier/observations', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scanId: scanId ?? undefined,
          observationKey: obs.id,
          method: obs.measurementMethod,
          measuredValue: obs.measuredValue,
          confidence: obs.confidence,
          availability: obs.availability,
          region: obs.region,
          limitations: obs.captureLimitations,
          algorithmVersion: obs.algorithmVersion,
          concernCandidates: obs.concernCandidates,
          confirmed: status === 'confirmed',
          dismissed: status === 'dismissed',
        }),
      });
    } catch {
      // Non-critical if user is guest or offline
    }
  };

  return (
    <section className="p-5 rounded-[28px] bg-[var(--surface)] border border-[var(--border-card)] shadow-sm space-y-4">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-plum)] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>THE SKIN EDIT · Build your glow routine</span>
          </span>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--surface-secondary)] text-[var(--foreground-muted)]">
            {skinAppearance?.availability === 'AVAILABLE' ? 'Observations Ready' : 'Limited Capture'}
          </span>
        </div>
        <h3 className="text-base font-semibold text-[var(--foreground)]">
          Photographic Skin Observations
        </h3>
        <p className="text-xs text-[var(--foreground-secondary)] leading-relaxed">
          Explore products based on your confirmed skincare goals and observations from this portrait. Confirm or dismiss any item below.
        </p>
      </div>

      {displayList.length > 0 ? (
        <div className="space-y-2.5">
          {displayList.map((obs) => {
            const decision = decisions[obs.id];
            return (
              <div
                key={obs.id}
                className={`p-3.5 rounded-2xl border transition-colors ${
                  decision === 'dismissed'
                    ? 'opacity-50 bg-[var(--surface-secondary)] border-[var(--border)]'
                    : decision === 'confirmed'
                    ? 'bg-[var(--surface-accent)] border-[var(--brand-plum)]'
                    : 'bg-[var(--bg-surface-warm)] border-[var(--border-subtle)]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-[var(--foreground)]">
                        {obs.label}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)]">
                        {obs.availability === 'AVAILABLE'
                          ? `Conf ${Math.round(obs.confidence * 100)}%`
                          : 'Unavailable'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--foreground-secondary)] leading-relaxed">
                      {obs.plainLanguageNote}
                    </p>
                  </div>

                  {obs.availability === 'AVAILABLE' && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        aria-label={`Confirm ${obs.label}`}
                        onClick={() => handleDecision(obs, 'confirmed')}
                        className={`w-7 h-7 rounded-full flex items-center justify-center border transition-colors cursor-pointer ${
                          decision === 'confirmed'
                            ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-transparent'
                            : 'bg-[var(--surface)] text-[var(--foreground-muted)] border-[var(--border)] hover:text-[var(--foreground)]'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Dismiss ${obs.label}`}
                        onClick={() => handleDecision(obs, 'dismissed')}
                        className={`w-7 h-7 rounded-full flex items-center justify-center border transition-colors cursor-pointer ${
                          decision === 'dismissed'
                            ? 'bg-[var(--foreground-muted)] text-[var(--surface)] border-transparent'
                            : 'bg-[var(--surface)] text-[var(--foreground-muted)] border-[var(--border)] hover:text-[var(--foreground)]'
                        }`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-warm)] border border-[var(--border-subtle)] text-xs text-[var(--foreground-secondary)]">
          Take your portrait in soft, even front lighting to unlock photographic skin observations, or complete your voluntary Skin Profile directly.
        </div>
      )}

      <div className="flex items-start gap-2 text-[11px] text-[var(--foreground-muted)] leading-relaxed">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>
          Illustrative observations only—not a facial or medical skin diagnosis. Purchasing skincare products never changes your Face Card score.
        </span>
      </div>

      <Link
        href="/skincare?view=QUESTIONNAIRE"
        className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-full text-xs font-bold bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity shadow-[var(--shadow-xs)]"
      >
        <span>Discover my skincare routine</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </section>
  );
}
