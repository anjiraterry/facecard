'use client';

import React, { useEffect, useState } from 'react';

interface BeautyAdminData {
  rubric: {
    activeProductionVersion: string;
    experimentalVersion: string;
    experimentalEnabledInProd: boolean;
  };
  observationRegistry: {
    version: string;
    items: Array<{ id: string; label: string; region: string }>;
  };
  knowledgeBase: {
    version: string;
    ingredients: Array<{ slug: string; name: string; timeOfDay: string; potentialIrritation: string }>;
    compatibilities: Array<{ ingredientASlug: string; ingredientBSlug: string; status: string }>;
    concernMappings: Array<{ concernSlug: string; ingredientSlug: string; evidenceStrength: string }>;
  };
  ruleVersions: Array<{ id: string; version: number; status: string; notes: string | null }>;
  funnelAnalytics: {
    totalScans: number;
    totalSkinProfiles: number;
    totalRoutines: number;
    interactions: Array<{ eventType: string; count: number }>;
  };
}

export function BeautyIntelligenceAdminPanel({
  canAdjust,
  onNotify,
}: {
  canAdjust: boolean;
  onNotify: (kind: 'ok' | 'err', msg: string) => void;
}) {
  const [data, setData] = useState<BeautyAdminData | null>(null);
  const [simConcern, setSimConcern] = useState('uneven-tone');
  const [simSensitivity, setSimSensitivity] = useState('');
  const [simResult, setSimResult] = useState<string | null>(null);

  const load = () => {
    fetch('/api/admin/v1/beauty-intelligence')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.success) setData(d);
      })
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  if (!data) return null;

  const handleSimulate = async () => {
    const res = await fetch('/api/admin/v1/beauty-intelligence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'SIMULATE',
        concernSlugs: [simConcern],
        sensitivities: simSensitivity ? simSensitivity.split(',').map((s) => s.trim()) : [],
      }),
    });
    if (res.ok) {
      const json = await res.json();
      const names = (json.simulation?.matchedMappings || [])
        .map((m: { ingredientSlug: string; evidenceStrength: string }) => `${m.ingredientSlug} (${m.evidenceStrength})`)
        .join(', ');
      setSimResult(names || 'No safe ingredient matches under current exclusions.');
    }
  };

  const handleCreateRuleDraft = async () => {
    const res = await fetch('/api/admin/v1/beauty-intelligence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'CREATE_RULE_DRAFT',
        rules: { kbVersion: data.knowledgeBase.version, excludeAllergies: true, allowNoPurchase: true },
        notes: 'Snapshot deterministic rule set',
      }),
    });
    if (res.ok) {
      onNotify('ok', 'Created recommendation rule draft');
      load();
    } else {
      onNotify('err', 'Failed to create rule draft');
    }
  };

  return (
    <div className="rounded-xl bg-white border border-[#E6DDD6] p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Beauty Intelligence &amp; Atelier Control Centre</h2>
          <p className="text-xs text-[#6E626B]">
            Active Scoring: <strong>{data.rubric.activeProductionVersion}</strong> · Experimental V2.1 (
            {data.rubric.experimentalVersion}):{' '}
            <strong>{data.rubric.experimentalEnabledInProd ? 'ENABLED' : 'DISABLED IN PROD'}</strong> · KB:{' '}
            <strong>{data.knowledgeBase.version}</strong>
          </p>
        </div>
        {canAdjust && (
          <button
            type="button"
            onClick={handleCreateRuleDraft}
            className="px-3 h-8 rounded-lg bg-[#251E24] text-white text-xs cursor-pointer"
          >
            New Recommendation Rule Draft
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="p-3 rounded-lg bg-[#FAF7F4] border border-[#E6DDD6]">
          <p className="font-semibold">Observations Registry ({data.observationRegistry.items.length})</p>
          <p className="text-[#6E626B] mt-1">
            {data.observationRegistry.items.slice(0, 5).map((i) => i.label).join(' · ')}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-[#FAF7F4] border border-[#E6DDD6]">
          <p className="font-semibold">
            Ingredients ({data.knowledgeBase.ingredients.length}) &amp; Mappings ({data.knowledgeBase.concernMappings.length})
          </p>
          <p className="text-[#6E626B] mt-1">
            {data.knowledgeBase.compatibilities.length} compatibility rules active
          </p>
        </div>
        <div className="p-3 rounded-lg bg-[#FAF7F4] border border-[#E6DDD6]">
          <p className="font-semibold">Funnel Analytics</p>
          <p className="text-[#6E626B] mt-1">
            Scans: {data.funnelAnalytics.totalScans} · Profiles: {data.funnelAnalytics.totalSkinProfiles} · Routines:{' '}
            {data.funnelAnalytics.totalRoutines}
          </p>
        </div>
      </div>

      {/* Evaluation Lab Simulator */}
      <div className="p-3.5 rounded-lg bg-[#FAF7F4] border border-[#E6DDD6] space-y-2 text-xs">
        <p className="font-semibold">Evaluation Lab — Deterministic Recommendation Simulator</p>
        <div className="flex flex-wrap gap-2">
          <select
            value={simConcern}
            onChange={(e) => setSimConcern(e.target.value)}
            className="h-8 px-2.5 rounded border border-[#D8CEC6] bg-white"
          >
            <option value="uneven-tone">uneven-tone</option>
            <option value="breakouts-blemishes">breakouts-blemishes</option>
            <option value="dryness-hydration">dryness-hydration</option>
            <option value="excess-shine">excess-shine</option>
            <option value="sensitivity-barrier">sensitivity-barrier</option>
            <option value="sun-protection">sun-protection</option>
          </select>
          <input
            type="text"
            value={simSensitivity}
            onChange={(e) => setSimSensitivity(e.target.value)}
            placeholder="Exclusions (e.g. vitamin-c)"
            className="h-8 px-2.5 rounded border border-[#D8CEC6] bg-white"
          />
          <button
            type="button"
            onClick={handleSimulate}
            className="px-3 h-8 rounded bg-[#251E24] text-white cursor-pointer"
          >
            Simulate Match
          </button>
        </div>
        {simResult && <p className="text-[#251E24] font-medium">Result: {simResult}</p>}
      </div>

      {data.ruleVersions.length > 0 && (
        <div className="divide-y divide-[#F0EAE4] text-xs">
          {data.ruleVersions.map((rv) => (
            <div key={rv.id} className="py-2 flex items-center justify-between gap-2">
              <span>
                <strong>Rule v{rv.version}</strong> · {rv.status}
                {rv.notes ? ` — ${rv.notes}` : ''}
              </span>
              {canAdjust && rv.status === 'DRAFT' && (
                <button
                  type="button"
                  onClick={async () => {
                    const res = await fetch('/api/admin/v1/beauty-intelligence', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id: rv.id, action: 'PUBLISH' }),
                    });
                    if (res.ok) {
                      onNotify('ok', `Published Rule v${rv.version}`);
                      load();
                    }
                  }}
                  className="px-2.5 h-7 rounded bg-emerald-700 text-white text-[11px] cursor-pointer"
                >
                  Publish
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
