'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Palette, RefreshCw, CheckCircle2 } from 'lucide-react';
import { getContrastRatio } from '@/lib/boutique/palette';
import { FaceCard } from '@/components/card/FaceCard';
import type { Tier } from '@/types';

export function CardThemeStudioPanel({
  onToast,
}: {
  onToast: (type: 'ok' | 'err', text: string) => void;
}) {
  const [themes, setThemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    themeId: '',
    name: '',
    description: '',
    collectionName: 'The Essentials',
    minimumTier: 'CLASSIC' as Tier,
    acquisition: 'POINTS_PURCHASE',
    pricePoints: 650,
    material: 'SATIN',
    paletteFrom: '#96788D',
    paletteTo: '#65475D',
    textColor: '#FAF7F4',
    accentColor: '#EBDCD5',
    backgroundImageUrl: '',
    status: 'PUBLISHED',
  });

  const loadThemes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/v1/card-themes');
      if (res.ok) setThemes((await res.json()).themes || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadThemes();
  }, [loadThemes]);

  const minContrast = Math.min(
    getContrastRatio(form.textColor, form.paletteFrom),
    getContrastRatio(form.textColor, form.paletteTo)
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/v1/card-themes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    if (res.ok) {
      onToast('ok', `Saved theme ${json.theme.name} (v${json.theme.version})`);
      await loadThemes();
    } else {
      onToast('err', json.error || 'Failed to save theme');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-serif font-semibold">Card Theme Studio</h2>
          <p className="text-xs text-stone-500">
            Create, contrast-validate, version, and publish tier-based Face Card themes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadThemes()}
          className="h-9 px-3 rounded-lg border border-stone-200 text-xs font-semibold inline-flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleSave} className="p-5 rounded-2xl bg-white border border-stone-200 space-y-3 text-xs">
          <h3 className="font-semibold text-sm flex items-center gap-1.5">
            <Palette className="w-4 h-4 text-[#96788D]" /> Theme Editor
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Theme ID (e.g. velvet-plum)"
              value={form.themeId}
              onChange={(e) => setForm({ ...form, themeId: e.target.value })}
              required
              className="h-9 px-2.5 rounded-lg border border-stone-200"
            />
            <input
              placeholder="Display Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="h-9 px-2.5 rounded-lg border border-stone-200"
            />
          </div>
          <input
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
            className="w-full h-9 px-2.5 rounded-lg border border-stone-200"
          />
          <div className="grid grid-cols-3 gap-2">
            <select
              value={form.minimumTier}
              onChange={(e) => setForm({ ...form, minimumTier: e.target.value as Tier })}
              className="h-9 px-2 rounded-lg border border-stone-200"
            >
              <option value="CLASSIC">CLASSIC</option>
              <option value="GOLD">GOLD</option>
              <option value="PLATINUM">PLATINUM</option>
              <option value="BLACK">BLACK</option>
            </select>
            <select
              value={form.material}
              onChange={(e) => setForm({ ...form, material: e.target.value })}
              className="h-9 px-2 rounded-lg border border-stone-200"
            >
              <option value="SATIN">SATIN</option>
              <option value="BRUSHED_METAL">BRUSHED_METAL</option>
              <option value="PEARLESCENT">PEARLESCENT</option>
              <option value="CERAMIC">CERAMIC</option>
              <option value="GLASS">GLASS</option>
              <option value="STONE">STONE</option>
            </select>
            <input
              type="number"
              placeholder="Price PTS"
              value={form.pricePoints}
              onChange={(e) => setForm({ ...form, pricePoints: Number(e.target.value) })}
              className="h-9 px-2 rounded-lg border border-stone-200"
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            <label className="space-y-1">
              <span>From</span>
              <input
                type="color"
                value={form.paletteFrom}
                onChange={(e) => setForm({ ...form, paletteFrom: e.target.value })}
                className="w-full h-9 rounded border border-stone-200"
              />
            </label>
            <label className="space-y-1">
              <span>To</span>
              <input
                type="color"
                value={form.paletteTo}
                onChange={(e) => setForm({ ...form, paletteTo: e.target.value })}
                className="w-full h-9 rounded border border-stone-200"
              />
            </label>
            <label className="space-y-1">
              <span>Text</span>
              <input
                type="color"
                value={form.textColor}
                onChange={(e) => setForm({ ...form, textColor: e.target.value })}
                className="w-full h-9 rounded border border-stone-200"
              />
            </label>
            <label className="space-y-1">
              <span>Accent</span>
              <input
                type="color"
                value={form.accentColor}
                onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                className="w-full h-9 rounded border border-stone-200"
              />
            </label>
          </div>
          <input
            placeholder="Background Image URL (optional 2568x1620 WebP/AVIF)"
            value={form.backgroundImageUrl}
            onChange={(e) => setForm({ ...form, backgroundImageUrl: e.target.value })}
            className="w-full h-9 px-2.5 rounded-lg border border-stone-200"
          />
          <div className="flex items-center justify-between pt-1">
            <span className={minContrast >= 4.5 ? 'text-emerald-700 font-semibold' : 'text-rose-600 font-semibold'}>
              Contrast Ratio: {minContrast.toFixed(2)}:1 {minContrast >= 4.5 ? '(WCAG AA Pass)' : '(Min 4.5:1 required)'}
            </span>
            <button
              type="submit"
              disabled={minContrast < 4.5}
              className="h-9 px-4 rounded-lg bg-[#251E24] text-white font-semibold disabled:opacity-45 inline-flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Save &amp; Publish
            </button>
          </div>
        </form>

        <div className="p-5 rounded-2xl bg-white border border-stone-200 flex flex-col items-center justify-center space-y-3">
          <div className="w-full max-w-[340px]">
            <FaceCard
              variant="preview"
              card={{
                id: 'studio-preview',
                cardNumber: 'FC-STUDIO',
                cardholderName: 'Studio Preview',
                handle: 'member',
                tier: form.minimumTier,
                score: 92,
                band: 'LETHAL',
                theme: {
                  themeId: form.themeId || 'preview',
                  name: form.name || 'Preview Theme',
                  material: form.material,
                  textColor: form.textColor,
                  accentColor: form.accentColor,
                  paletteFrom: form.paletteFrom,
                  paletteTo: form.paletteTo,
                  backgroundImageUrl: form.backgroundImageUrl || null,
                  reflectionIntensity: 0.12,
                  maximumTiltDegrees: 6,
                  engravingOpacity: 0.2,
                  grainOpacity: 0.03,
                },
              }}
            />
          </div>
          <p className="text-[11px] text-stone-500">Live 1.586:1 dynamic typography &amp; contrast preview</p>
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-white border border-stone-200 space-y-3">
        <h3 className="font-semibold text-sm">Published Theme Catalogue ({themes.length})</h3>
        {loading ? (
          <p className="text-xs text-stone-500">Loading themes...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {themes.map((t) => (
              <div key={t.id} className="p-3 rounded-xl border border-stone-200 space-y-1">
                <div className="flex items-center justify-between font-semibold">
                  <span>{t.name}</span>
                  <span className="text-[10px] text-stone-500">v{t.version}</span>
                </div>
                <p className="text-[11px] text-stone-500">
                  {t.minimumTier} · {t.acquisition} · {t.pricePoints} PTS
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
