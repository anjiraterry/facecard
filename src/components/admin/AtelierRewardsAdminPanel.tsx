'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, Calculator } from 'lucide-react';
import { formatNgnMinor } from '@/lib/atelier/serialize';

export function AtelierRewardsAdminPanel({
  onToast,
}: {
  onToast: (type: 'ok' | 'err', text: string) => void;
}) {
  const [policies, setPolicies] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Simulator state
  const [simTier, setSimTier] = useState<'CLASSIC' | 'GOLD' | 'PLATINUM' | 'BLACK'>('PLATINUM');
  const [simSubtotalNgn, setSimSubtotalNgn] = useState(25000);
  const [simCostNgn, setSimCostNgn] = useState(17000);
  const [simPoints, setSimPoints] = useState(6000);
  const [simResult, setSimResult] = useState<any>(null);

  // Draft creation state
  const [minimumTier, setMinimumTier] = useState<'GOLD' | 'PLATINUM'>('GOLD');
  const [marginFloorBps, setMarginFloorBps] = useState(1500);
  const [emergencyPaused, setEmergencyPaused] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [polRes, anaRes, redRes] = await Promise.all([
        fetch('/api/admin/v1/atelier/redemption-policies'),
        fetch('/api/admin/v1/atelier/redemption-analytics'),
        fetch('/api/admin/v1/atelier/redemptions'),
      ]);
      if (polRes.ok) setPolicies((await polRes.json()).policies || []);
      if (anaRes.ok) setAnalytics(await anaRes.json());
      if (redRes.ok) setRedemptions((await redRes.json()).redemptions || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleCreateDraft = async () => {
    const res = await fetch('/api/admin/v1/atelier/redemption-policies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        minimumTier,
        marginFloorBps,
        emergencyPaused,
        notes: `Draft created via Control Centre (${minimumTier}+, floor ${marginFloorBps} bps)`,
      }),
    });
    const json = await res.json();
    if (res.ok) {
      onToast('ok', `Created policy draft v${json.policy.version}`);
      await loadAll();
    } else {
      onToast('err', json.error || 'Failed to create draft');
    }
  };

  const handleSimulate = async (policyId: string) => {
    const res = await fetch(`/api/admin/v1/atelier/redemption-policies/${policyId}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tier: simTier,
        subtotalMinor: simSubtotalNgn * 100,
        costPriceMinor: simCostNgn * 100,
        spendablePoints: simPoints,
      }),
    });
    const json = await res.json();
    if (res.ok) {
      setSimResult(json.simulation);
      onToast(json.valid ? 'ok' : 'err', json.valid ? 'Simulation passed margin floor' : 'Simulation breached margin floor');
    } else {
      onToast('err', json.error || 'Simulation failed');
    }
  };

  const handlePublish = async (policyId: string) => {
    const res = await fetch(`/api/admin/v1/atelier/redemption-policies/${policyId}/publish`, {
      method: 'POST',
    });
    const json = await res.json();
    if (res.ok) {
      onToast('ok', `Published policy v${json.policy.version}`);
      await loadAll();
    } else {
      onToast('err', json.error || 'Publish failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-serif font-semibold">Atelier Rewards &amp; Margin Governance</h2>
          <p className="text-xs text-stone-500">
            Configure tier caps, conversion rates, margin floors, and inspect financial exposure.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadAll()}
          className="h-9 px-3 rounded-lg border border-stone-200 text-xs font-semibold inline-flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {analytics?.analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white border border-stone-200">
            <p className="text-[11px] uppercase text-stone-500 font-semibold">Period Cost ({analytics.periodKey})</p>
            <p className="text-lg font-bold mt-1">{formatNgnMinor(Number(analytics.analytics.periodDiscountCostMinor || 0))}</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-stone-200">
            <p className="text-[11px] uppercase text-stone-500 font-semibold">Period Redemptions</p>
            <p className="text-lg font-bold mt-1">{analytics.analytics.periodRedemptions}</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-stone-200">
            <p className="text-[11px] uppercase text-stone-500 font-semibold">Active Reservations</p>
            <p className="text-lg font-bold mt-1">{analytics.analytics.activeReservationsCount}</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-stone-200">
            <p className="text-[11px] uppercase text-stone-500 font-semibold">Total Restored (Refunds)</p>
            <p className="text-lg font-bold mt-1">{analytics.analytics.totalRestoredPoints} PTS</p>
          </div>
        </div>
      )}

      {/* Simulator */}
      <div className="p-5 rounded-2xl bg-white border border-stone-200 space-y-4">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <Calculator className="w-4 h-4 text-[#96788D]" /> Margin &amp; Discount Simulator
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <label className="space-y-1">
            <span className="font-semibold text-stone-600">Tier</span>
            <select
              value={simTier}
              onChange={(e) => setSimTier(e.target.value as any)}
              className="w-full h-9 px-2 rounded-lg border border-stone-200"
            >
              <option value="CLASSIC">CLASSIC</option>
              <option value="GOLD">GOLD</option>
              <option value="PLATINUM">PLATINUM</option>
              <option value="BLACK">BLACK</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="font-semibold text-stone-600">Basket Subtotal (₦)</span>
            <input
              type="number"
              value={simSubtotalNgn}
              onChange={(e) => setSimSubtotalNgn(Number(e.target.value))}
              className="w-full h-9 px-2 rounded-lg border border-stone-200"
            />
          </label>
          <label className="space-y-1">
            <span className="font-semibold text-stone-600">Product Cost (₦)</span>
            <input
              type="number"
              value={simCostNgn}
              onChange={(e) => setSimCostNgn(Number(e.target.value))}
              className="w-full h-9 px-2 rounded-lg border border-stone-200"
            />
          </label>
          <label className="space-y-1">
            <span className="font-semibold text-stone-600">Spendable Points</span>
            <input
              type="number"
              value={simPoints}
              onChange={(e) => setSimPoints(Number(e.target.value))}
              className="w-full h-9 px-2 rounded-lg border border-stone-200"
            />
          </label>
        </div>

        {simResult && (
          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-stone-500 block">Actual Discount</span>
              <span className="font-bold">{formatNgnMinor(Number(simResult.quote.appliedDiscountMinor))}</span>
            </div>
            <div>
              <span className="text-stone-500 block">Points Required</span>
              <span className="font-bold">{simResult.quote.appliedPoints} PTS</span>
            </div>
            <div>
              <span className="text-stone-500 block">Customer Pays</span>
              <span className="font-bold">{formatNgnMinor(Number(simResult.customerPaysMinor))}</span>
            </div>
            <div>
              <span className="text-stone-500 block">Remaining Contribution</span>
              <span className="font-bold">
                {formatNgnMinor(Number(simResult.remainingContributionMinor))} ({(simResult.postDiscountMarginBps / 100).toFixed(1)}%)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Policy Draft & Versions */}
      <div className="p-5 rounded-2xl bg-white border border-stone-200 space-y-4">
        <h3 className="font-semibold text-sm">Create Policy Draft</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs items-end">
          <label className="space-y-1">
            <span className="font-semibold text-stone-600">Minimum Eligible Tier</span>
            <select
              value={minimumTier}
              onChange={(e) => setMinimumTier(e.target.value as 'GOLD' | 'PLATINUM')}
              className="w-full h-9 px-2 rounded-lg border border-stone-200"
            >
              <option value="GOLD">GOLD</option>
              <option value="PLATINUM">PLATINUM</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="font-semibold text-stone-600">Margin Floor (bps)</span>
            <input
              type="number"
              value={marginFloorBps}
              onChange={(e) => setMarginFloorBps(Number(e.target.value))}
              className="w-full h-9 px-2 rounded-lg border border-stone-200"
            />
          </label>
          <label className="flex items-center gap-2 h-9">
            <input
              type="checkbox"
              checked={emergencyPaused}
              onChange={(e) => setEmergencyPaused(e.target.checked)}
            />
            <span className="font-semibold text-stone-600">Emergency Pause</span>
          </label>
          <button
            type="button"
            onClick={() => void handleCreateDraft()}
            className="h-9 px-4 rounded-lg bg-[#251E24] text-white font-semibold"
          >
            Create Draft
          </button>
        </div>

        <div className="space-y-2 pt-2">
          {loading ? (
            <p className="text-xs text-stone-500">Loading policies...</p>
          ) : (
            policies.map((p) => (
              <div
                key={p.id}
                className="p-3 rounded-xl border border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div>
                  <span className="font-bold">v{p.version}</span> ·{' '}
                  <span className="font-semibold">{p.status}</span> · Min Tier: {p.minimumTier} · Margin Floor:{' '}
                  {(p.marginFloorBps / 100).toFixed(1)}%
                  {p.emergencyPaused && (
                    <span className="ml-2 text-rose-600 font-semibold inline-flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> PAUSED
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleSimulate(p.id)}
                    className="h-8 px-3 rounded-lg border border-stone-200 font-semibold"
                  >
                    Simulate
                  </button>
                  {p.status !== 'PUBLISHED' && (
                    <button
                      type="button"
                      onClick={() => void handlePublish(p.id)}
                      className="h-8 px-3 rounded-lg bg-[#65475D] text-white font-semibold inline-flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Publish
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Redemptions */}
      <div className="p-5 rounded-2xl bg-white border border-stone-200 space-y-3">
        <h3 className="font-semibold text-sm">Recent Finalized Redemptions ({redemptions.length})</h3>
        {redemptions.length === 0 ? (
          <p className="text-xs text-stone-500">No finalized Atelier points redemptions yet.</p>
        ) : (
          <div className="space-y-2 text-xs">
            {redemptions.slice(0, 10).map((r) => (
              <div key={r.id} className="p-2.5 rounded-lg bg-stone-50 flex justify-between">
                <span>
                  Order {r.orderId.slice(0, 8)} · {r.points} PTS
                </span>
                <span className="font-bold">{formatNgnMinor(Number(r.discountMinor))}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
