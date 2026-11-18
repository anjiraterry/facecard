'use client';

import React from 'react';
import { Crown, ChevronUp, Star } from 'lucide-react';
import { SurfaceCard } from '@/components/ui/SurfaceCard';

interface LeaderboardUser {
  rank: number;
  name: string;
  avatar: string;
  score: number;
  tier: string;
}

const TOP_THREE: LeaderboardUser[] = [
  {
    rank: 2,
    name: 'Jeniffer C.',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    score: 92,
    tier: 'Platinum',
  },
  {
    rank: 1,
    name: 'Jack Parker',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    score: 96,
    tier: 'Black Card',
  },
  {
    rank: 3,
    name: 'Brian Jones',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    score: 89,
    tier: 'Gold',
  },
];

const LEADERBOARD_LIST = [
  {
    rank: 4,
    name: 'Stephanie Thompson',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    points: 680,
    trend: 'down',
  },
  {
    rank: 5,
    name: 'Alex Simmons',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    points: 560,
    trend: 'up',
  },
  {
    rank: 6,
    name: 'Jeffrey Smith',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    points: 540,
    trend: 'down',
  },
];

export function LeaderboardPodium() {
  return (
    <SurfaceCard variant="default" padding="md" className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-semibold text-[var(--text-main)]">
          Leaderboard
        </h2>
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
          Global Index
        </span>
      </div>

      <div className="flex items-end justify-center gap-4 sm:gap-6 pt-3 pb-2">
        {/* Rank 2 */}
        <div className="flex flex-col items-center">
          <div className="relative mb-2">
            <div className="w-16 h-16 rounded-full p-[2px] bg-[#D2B8C9]">
              <img
                src={TOP_THREE[0].avatar}
                alt={TOP_THREE[0].name}
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[#D2B8C9] text-[#251E24] font-bold text-[10px] flex items-center justify-center">
              2
            </span>
          </div>
          <span className="text-xs font-semibold text-[var(--text-main)] mt-1">{TOP_THREE[0].name}</span>
          <span className="text-[10px] text-[var(--text-muted)] tabular-nums">{TOP_THREE[0].score} Index</span>
        </div>

        {/* Rank 1 */}
        <div className="flex flex-col items-center -mt-4">
          <div className="relative mb-2">
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[#9A6B32]">
              <Crown className="w-5 h-5 fill-current" />
            </div>
            <div className="w-20 h-20 rounded-full p-[3px] bg-[#E5CA99] shadow-[var(--shadow-sm)]">
              <img
                src={TOP_THREE[1].avatar}
                alt={TOP_THREE[1].name}
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[#251E24] text-[#FAF7F4] font-bold text-[10px] flex items-center justify-center">
              1
            </span>
          </div>
          <span className="text-xs font-bold text-[var(--text-main)] mt-1">{TOP_THREE[1].name}</span>
          <span className="text-[10px] text-[var(--accent-brand)] font-semibold tabular-nums">{TOP_THREE[1].score} Index</span>
        </div>

        {/* Rank 3 */}
        <div className="flex flex-col items-center">
          <div className="relative mb-2">
            <div className="w-16 h-16 rounded-full p-[2px] bg-[#EBDCD5]">
              <img
                src={TOP_THREE[2].avatar}
                alt={TOP_THREE[2].name}
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[#EBDCD5] text-[#251E24] font-bold text-[10px] flex items-center justify-center">
              3
            </span>
          </div>
          <span className="text-xs font-semibold text-[var(--text-main)] mt-1">{TOP_THREE[2].name}</span>
          <span className="text-[10px] text-[var(--text-muted)] tabular-nums">{TOP_THREE[2].score} Index</span>
        </div>
      </div>

      <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-warm)] border border-[var(--border-subtle)] flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--text-main)]">Your Standing</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[var(--text-main)] tabular-nums">24</span>
          <span className="w-5 h-5 rounded-full bg-[var(--status-success-bg)] flex items-center justify-center text-[var(--status-success)]">
            <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
          </span>
        </div>
      </div>

      <div className="space-y-2 pt-1">
        {LEADERBOARD_LIST.map((item) => (
          <div
            key={item.name}
            className="p-3 rounded-2xl bg-[var(--bg-surface-warm)] border border-[var(--border-subtle)] flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <img
                src={item.avatar}
                alt={item.name}
                className="w-10 h-10 rounded-full object-cover border border-[var(--border-card)]"
              />
              <div>
                <span className="text-xs font-semibold text-[var(--text-main)] block">{item.name}</span>
                <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 tabular-nums">
                  <Star className="w-3 h-3 text-[var(--accent-brand)]" />
                  {item.points} pts
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 tabular-nums">
              <span className="text-xs font-bold text-[var(--text-muted)]">{item.rank}</span>
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${
                  item.trend === 'up'
                    ? 'text-[var(--status-success)] bg-[var(--status-success-bg)]'
                    : 'text-[var(--status-danger)] bg-[var(--status-danger-bg)]'
                }`}
              >
                {item.trend === 'up' ? '▲' : '▼'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </SurfaceCard>
  );
}
