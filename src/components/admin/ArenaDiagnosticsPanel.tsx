'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Swords, RotateCcw, XCircle, Eye } from 'lucide-react';

interface ArenaMatchSummary {
  id: string;
  inviteCode: string;
  mode: string;
  stake: number;
  status: string;
  outcomeReason: string | null;
  currentRound: number;
  rematchCount: number;
  maxAttemptsPerRound: number;
  scoringVersion: string;
  challenger: { id: string; displayName: string; handle: string | null; tier: string };
  opponent: { id: string; displayName: string; handle: string | null; tier: string } | null;
  challengerStatus: string;
  opponentStatus: string;
  challengerLockedAt: string | null;
  opponentLockedAt: string | null;
  challengerFinalScore: number | null;
  opponentFinalScore: number | null;
  winnerId: string | null;
  settlementAttempts: number;
  lastSettlementError: string | null;
  attemptCount: number;
  eventCount: number;
  isExpired: boolean;
  expiresAt: string;
  createdAt: string;
}

interface ArenaMatchDetail {
  match: ArenaMatchSummary & {
    attempts: Array<{
      id: string;
      userId: string;
      scanId: string;
      roundNumber: number;
      attemptNumber: number;
      score: number;
      scoringVersion: string;
      verificationStatus: string;
      createdAt: string;
    }>;
    rounds: Array<{
      roundNumber: number;
      challengerScore: number | null;
      opponentScore: number | null;
      winnerId: string | null;
      isTie: boolean;
    }>;
    events: Array<{
      id: string;
      roundNumber: number;
      eventType: string;
      actorUserId: string | null;
      detail: Record<string, unknown> | null;
      createdAt: string;
    }>;
  };
  ledgerEntries: Array<{
    id: string;
    userId: string;
    type: string;
    amount: number;
    idempotencyKey: string;
    createdAt: string;
  }>;
}

export function ArenaDiagnosticsPanel() {
  const [filter, setFilter] = useState<'all' | 'stale' | 'active' | 'waiting'>('all');
  const [matches, setMatches] = useState<ArenaMatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ArenaMatchDetail | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadMatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/arena?filter=${filter}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setMatches(data.matches || []);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void loadMatches();
  }, [loadMatches]);

  const inspectMatch = async (id: string) => {
    const res = await fetch(`/api/admin/arena/${id}`, { credentials: 'include' });
    const data = await res.json();
    if (data.success) setSelected(data);
  };

  const runAction = async (id: string, action: 'RETRY_SETTLEMENT' | 'CANCEL_AND_REFUND') => {
    setActionBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/arena/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || 'Action failed');
      } else {
        setMessage(`${action} succeeded`);
        await loadMatches();
        await inspectMatch(id);
      }
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Swords className="w-5 h-5" /> Arena Face-Off Inspector
          </h2>
          <p className="text-xs text-neutral-400">
            Monitor active/stale matches, inspect attempt timelines, and retry idempotent settlement.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'stale', 'active', 'waiting'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase ${
                filter === f ? 'bg-purple-600 text-white' : 'bg-neutral-800 text-neutral-300'
              }`}
            >
              {f}
            </button>
          ))}
          <button
            onClick={() => loadMatches()}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-800 text-neutral-200 flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3 rounded-xl bg-purple-950/60 border border-purple-700/50 text-xs text-purple-200">
          {message}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-neutral-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-neutral-900 text-neutral-400 uppercase text-[10px]">
            <tr>
              <th className="p-3">Match</th>
              <th className="p-3">Contenders</th>
              <th className="p-3">Status</th>
              <th className="p-3">Round / Attempts</th>
              <th className="p-3">Lock-In</th>
              <th className="p-3">Settlement</th>
              <th className="p-3 text-right">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-neutral-400">Loading Arena matches...</td>
              </tr>
            ) : matches.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-neutral-400">No matches found for this filter.</td>
              </tr>
            ) : (
              matches.map((m) => (
                <tr key={m.id} className="hover:bg-neutral-900/50">
                  <td className="p-3 font-mono">
                    <div className="font-bold">{m.inviteCode}</div>
                    <div className="text-[10px] text-neutral-500">{m.mode} {m.stake > 0 ? `${m.stake} PTS` : ''}</div>
                  </td>
                  <td className="p-3">
                    <div>@{m.challenger.handle || m.challenger.displayName}</div>
                    <div className="text-neutral-400">
                      vs {m.opponent ? `@${m.opponent.handle || m.opponent.displayName}` : 'Open'}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded bg-neutral-800 font-semibold">{m.status}</span>
                    {m.isExpired && m.status !== 'COMPLETED' && m.status !== 'EXPIRED' && (
                      <span className="ml-1 text-[10px] text-amber-400">EXPIRED</span>
                    )}
                  </td>
                  <td className="p-3">
                    R{m.currentRound} · {m.attemptCount} attempts ({m.maxAttemptsPerRound}/round)
                  </td>
                  <td className="p-3">
                    C: {m.challengerLockedAt ? 'Locked' : 'Open'} / O: {m.opponentLockedAt ? 'Locked' : 'Open'}
                  </td>
                  <td className="p-3">
                    <div>Tries: {m.settlementAttempts}</div>
                    {m.lastSettlementError && (
                      <div className="text-[10px] text-red-400 truncate max-w-[160px]">{m.lastSettlementError}</div>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => inspectMatch(m.id)}
                      className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 inline-flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> Inspect
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/60 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold">
                Match {selected.match.inviteCode} ({selected.match.id})
              </h3>
              <p className="text-xs text-neutral-400">
                Status: {selected.match.status} · Scoring: {selected.match.scoringVersion} · Reason: {selected.match.outcomeReason || '—'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={actionBusy}
                onClick={() => runAction(selected.match.id, 'RETRY_SETTLEMENT')}
                className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Retry Settlement
              </button>
              <button
                disabled={actionBusy}
                onClick={() => runAction(selected.match.id, 'CANCEL_AND_REFUND')}
                className="px-3 py-1.5 rounded-lg bg-red-800 hover:bg-red-700 text-white text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" /> Cancel & Refund
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-lg bg-neutral-950/60 border border-neutral-800 space-y-1.5">
              <div className="font-bold text-neutral-300">Attempts ({selected.match.attempts.length})</div>
              {selected.match.attempts.map((a) => (
                <div key={a.id} className="flex justify-between text-neutral-400">
                  <span>R{a.roundNumber} · #{a.attemptNumber} · {a.userId.slice(0, 8)}</span>
                  <span className="font-mono text-white">{a.score}/100 ({a.verificationStatus})</span>
                </div>
              ))}
            </div>
            <div className="p-3 rounded-lg bg-neutral-950/60 border border-neutral-800 space-y-1.5">
              <div className="font-bold text-neutral-300">Event Timeline ({selected.match.events.length})</div>
              {selected.match.events.map((e) => (
                <div key={e.id} className="flex justify-between text-neutral-400">
                  <span className="font-mono text-purple-300">{e.eventType}</span>
                  <span>{new Date(e.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
