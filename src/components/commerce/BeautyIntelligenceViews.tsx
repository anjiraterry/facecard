'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, BookOpen, CheckCircle2, ShieldCheck, Trash2 } from 'lucide-react';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { Button } from '@/components/ui/Button';
import type { IngredientCompatibilityRule, IngredientRecord } from '@/lib/beauty-intelligence/ingredients';

export function IngredientLibraryView() {
  const [ingredients, setIngredients] = useState<IngredientRecord[]>([]);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>(['niacinamide', 'ceramides']);
  const [warnings, setWarnings] = useState<IngredientCompatibilityRule[]>([]);

  useEffect(() => {
    fetch('/api/atelier/beauty-intelligence')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.ingredients) setIngredients(data.ingredients);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedSlugs.length < 2) {
      queueMicrotask(() => setWarnings([]));
      return;
    }
    fetch('/api/atelier/beauty-intelligence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredientSlugs: selectedSlugs }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.warnings) setWarnings(data.warnings);
      })
      .catch(() => {});
  }, [selectedSlugs]);

  const toggleSlug = (slug: string) => {
    setSelectedSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  return (
    <div className="space-y-5">
      <SurfaceCard variant="warm" padding="md" className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--foreground)]">
          <ShieldCheck className="w-4 h-4 text-[var(--brand-plum)]" />
          <span>Routine Ingredient Compatibility Checker</span>
        </div>
        <p className="text-xs text-[var(--foreground-secondary)]">
          Select two or more active ingredients to check for AM/PM layering guidance or irritation precautions.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {ingredients.map((ing) => {
            const active = selectedSlugs.includes(ing.slug);
            return (
              <button
                key={ing.slug}
                type="button"
                onClick={() => toggleSlug(ing.slug)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
                  active
                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-transparent'
                    : 'bg-[var(--surface)] text-[var(--foreground-secondary)] border-[var(--border)]'
                }`}
              >
                {ing.name}
              </button>
            );
          })}
        </div>

        {warnings.length > 0 ? (
          <div className="space-y-2 pt-1">
            {warnings.map((w, idx) => (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-[var(--warning-surface)] border border-[var(--warning)]/30 text-xs space-y-1"
              >
                <div className="font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-[var(--warning)]" />
                  <span>{w.status}: {w.ingredientASlug} + {w.ingredientBSlug}</span>
                </div>
                <p className="text-[11px] text-[var(--foreground-secondary)]">{w.rationale} {w.guidance}</p>
              </div>
            ))}
          </div>
        ) : (
          selectedSlugs.length >= 2 && (
            <div className="p-2.5 rounded-xl bg-[var(--success-surface)] text-[var(--success)] text-xs font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>No layering conflicts flagged among your selected ingredients.</span>
            </div>
          )
        )}
      </SurfaceCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ingredients.map((ing) => (
          <SurfaceCard key={ing.slug} variant="default" padding="md" className="space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)]">{ing.name}</h3>
                <p className="text-[11px] text-[var(--foreground-muted)]">
                  INCI: {ing.inciName || 'Varies by UV filter formulation'} · {ing.timeOfDay}
                </p>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--surface-secondary)] text-[var(--foreground-muted)]">
                Irritation: {ing.potentialIrritation}
              </span>
            </div>
            <p className="text-xs text-[var(--foreground-secondary)]">
              <strong>Purposes:</strong> {ing.supportedPurposes.join(', ')}
            </p>
            <p className="text-[11px] text-[var(--foreground-muted)]">{ing.typicalUsageContext}</p>
            {ing.precautions.length > 0 && (
              <p className="text-[11px] text-[var(--warning)]">
                Precaution: {ing.precautions.join(' ')}
              </p>
            )}
          </SurfaceCard>
        ))}
      </div>
    </div>
  );
}

interface ProgressEntryItem {
  id: string;
  adherencePercent: number | null;
  userNotes: string | null;
  productsUsed: string[];
  comparisonEligible: boolean;
  createdAt: string;
}

export function ProgressJournalView({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [entries, setEntries] = useState<ProgressEntryItem[]>([]);
  const [adherence, setAdherence] = useState(80);
  const [notes, setNotes] = useState('');
  const [lightingMatched, setLightingMatched] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadEntries = () => {
    if (!isAuthenticated) return;
    fetch('/api/atelier/progress', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.entries) setEntries(data.entries);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/atelier/progress', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adherencePercent: adherence,
          userNotes: notes,
          captureConditions: { lightingMatched, makeupPresent: false },
        }),
      });
      if (res.ok) {
        setNotes('');
        loadEntries();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id?: string) => {
    await fetch(id ? `/api/atelier/progress?id=${encodeURIComponent(id)}` : '/api/atelier/progress', {
      method: 'DELETE',
      credentials: 'include',
    });
    loadEntries();
  };

  if (!isAuthenticated) {
    return (
      <SurfaceCard variant="default" padding="lg" className="text-center space-y-2">
        <BookOpen className="w-6 h-6 text-[var(--brand-plum)] mx-auto" />
        <p className="text-sm font-semibold text-[var(--foreground)]">Sign in to track your Progress Journal</p>
        <p className="text-xs text-[var(--foreground-secondary)]">
          Log routine adherence and subjective comfort notes privately. Ordinary score changes do not measure treatment effectiveness.
        </p>
      </SurfaceCard>
    );
  }

  return (
    <div className="space-y-5">
      <SurfaceCard variant="default" padding="md" className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-[var(--foreground)]">Voluntary Progress Journal</h2>
          <p className="text-xs text-[var(--foreground-secondary)]">
            Track routine consistency and notes. Ordinary selfie score fluctuations are not proof of treatment efficacy.
          </p>
        </div>

        <form onSubmit={handleAdd} className="space-y-3">
          <label className="block text-xs font-medium text-[var(--foreground)]">
            Weekly Routine Adherence: <strong>{adherence}%</strong>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={adherence}
              onChange={(e) => setAdherence(Number(e.target.value))}
              className="w-full mt-1 accent-[var(--primary)]"
            />
          </label>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How did your skin feel this week? (e.g., comfortable after moisturiser, mild tingling with new serum)"
            rows={2}
            className="w-full p-3 rounded-2xl bg-[var(--surface-secondary)] border border-[var(--border)] text-xs text-[var(--foreground)]"
          />

          <label className="flex items-center gap-2 text-xs text-[var(--foreground-secondary)] cursor-pointer">
            <input
              type="checkbox"
              checked={lightingMatched}
              onChange={(e) => setLightingMatched(e.target.checked)}
              className="accent-[var(--primary)]"
            />
            <span>Same-window / matched lighting conditions (if comparing photos)</span>
          </label>

          <div className="flex items-center justify-between gap-2">
            <Button type="submit" variant="primary" size="sm" isLoading={saving}>
              Log Journal Entry
            </Button>
            {entries.length > 0 && (
              <button
                type="button"
                onClick={() => handleDelete()}
                className="text-xs text-[var(--status-danger)] hover:underline cursor-pointer"
              >
                Delete All Entries
              </button>
            )}
          </div>
        </form>
      </SurfaceCard>

      <div className="space-y-2.5">
        {entries.map((entry) => (
          <SurfaceCard key={entry.id} variant="warm" padding="sm" className="flex items-start justify-between gap-3">
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[var(--foreground)]">
                  Adherence: {entry.adherencePercent ?? 0}%
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)]">
                  {entry.comparisonEligible ? 'Matched Capture' : 'Self-Reported Note'}
                </span>
              </div>
              {entry.userNotes && <p className="text-[var(--foreground-secondary)]">{entry.userNotes}</p>}
              <p className="text-[10px] text-[var(--foreground-muted)]">
                {new Date(entry.createdAt).toLocaleDateString()}
              </p>
            </div>
            <button
              type="button"
              aria-label="Delete entry"
              onClick={() => handleDelete(entry.id)}
              className="p-1.5 rounded-full text-[var(--foreground-muted)] hover:text-[var(--status-danger)] cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </SurfaceCard>
        ))}
      </div>
    </div>
  );
}
