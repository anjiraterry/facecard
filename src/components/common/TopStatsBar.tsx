'use client';

import React from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';

interface TopStatsBarProps {
  gems?: number;
  stars?: number;
  streak?: number;
}

export function TopStatsBar({ gems = 120, stars = 850, streak = 7 }: TopStatsBarProps) {
  return (
    <div className="flex items-center justify-between py-2 px-1">
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Gems / Spendable Points */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-[#1A1A1E] border border-black/[0.04] dark:border-white/10 shadow-sm text-xs font-bold text-[#1A1A1A] dark:text-white">
          <span className="text-sm">💎</span>
          <span>{gems.toLocaleString()}</span>
        </div>

        {/* Stars / Lifetime Points */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-[#1A1A1E] border border-black/[0.04] dark:border-white/10 shadow-sm text-xs font-bold text-[#1A1A1A] dark:text-white">
          <span className="text-sm text-[#F5B800]">★</span>
          <span>{stars.toLocaleString()}</span>
        </div>

        {/* Streak */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-[#1A1A1E] border border-black/[0.04] dark:border-white/10 shadow-sm text-xs font-bold text-[#1A1A1A] dark:text-white">
          <span className="text-sm">🔥</span>
          <span>{streak}</span>
        </div>
      </div>

      {/* Plus Action Button */}
      <Link
        href="/scan"
        className="w-8 h-8 rounded-full bg-[#78C257] hover:bg-[#6EB54E] text-white flex items-center justify-center shadow-sm transition-transform active:scale-95"
        title="Start Daily Scan"
      >
        <Plus className="w-5 h-5 stroke-[2.5]" />
      </Link>
    </div>
  );
}
