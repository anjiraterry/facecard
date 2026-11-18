'use client';

import React from 'react';
import Link from 'next/link';
import { Plus, Gem, Star, Flame } from 'lucide-react';

interface TopStatsBarProps {
  gems?: number;
  stars?: number;
  streak?: number;
}

export function TopStatsBar({ gems = 120, stars = 850, streak = 7 }: TopStatsBarProps) {
  return (
    <div className="flex items-center justify-between py-2 px-1">
      <div className="flex items-center gap-2 sm:gap-2.5">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-surface)] border border-[var(--border-card)] shadow-[var(--shadow-sm)] text-xs font-semibold text-[var(--text-main)] tabular-nums">
          <Gem className="w-3.5 h-3.5 text-[var(--accent-brand)]" />
          <span>{gems.toLocaleString()}</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-surface)] border border-[var(--border-card)] shadow-[var(--shadow-sm)] text-xs font-semibold text-[var(--text-main)] tabular-nums">
          <Star className="w-3.5 h-3.5 text-[var(--accent-brand)]" />
          <span>{stars.toLocaleString()}</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-surface)] border border-[var(--border-card)] shadow-[var(--shadow-sm)] text-xs font-semibold text-[var(--text-main)] tabular-nums">
          <Flame className="w-3.5 h-3.5 text-[var(--accent-brand)]" />
          <span>{streak}</span>
        </div>
      </div>

      <Link
        href="/scan"
        className="w-8 h-8 rounded-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--bg-page)] flex items-center justify-center shadow-[var(--shadow-sm)] transition-transform active:scale-95"
        title="Start Daily Scan"
        aria-label="Start Daily Scan"
      >
        <Plus className="w-4 h-4 stroke-[2.2]" />
      </Link>
    </div>
  );
}
