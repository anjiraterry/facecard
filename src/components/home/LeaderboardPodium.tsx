'use client';

import React from 'react';
import { Crown, ChevronUp, Star } from 'lucide-react';

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
    <div className="p-6 rounded-[32px] bg-white/90 dark:bg-[#1A1A1E]/90 backdrop-blur-xl border border-black/[0.04] dark:border-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.04)] space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black tracking-tight text-[#1A1A1A] dark:text-white">
          Leaderboard
        </h2>
        <span className="text-xs font-bold text-[#8C9BAE]">Lethality Global</span>
      </div>

      {/* Top 3 Podium */}
      <div className="flex items-end justify-center gap-3 sm:gap-6 pt-3 pb-2">
        {/* Rank 2 */}
        <div className="flex flex-col items-center">
          <div className="relative mb-2">
            <div className="w-16 h-16 rounded-full p-[3px] bg-[#56CCF2]">
              <img
                src={TOP_THREE[0].avatar}
                alt={TOP_THREE[0].name}
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[#56CCF2] text-white font-extrabold text-[10px] flex items-center justify-center shadow-sm">
              2
            </span>
          </div>
          <span className="text-xs font-bold text-[#1A1A1A] dark:text-white mt-1">
            {TOP_THREE[0].name}
          </span>
          <span className="text-[10px] text-[#7A869A] font-semibold">
            {TOP_THREE[0].score} Lethal
          </span>
        </div>

        {/* Rank 1 (Center) */}
        <div className="flex flex-col items-center -mt-4">
          <div className="relative mb-2">
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[#F2C94C]">
              <Crown className="w-6 h-6 fill-[#F2C94C] drop-shadow-sm" />
            </div>
            <div className="w-20 h-20 rounded-full p-[4px] bg-[#F2C94C] shadow-[0_6px_20px_rgba(242,201,76,0.35)]">
              <img
                src={TOP_THREE[1].avatar}
                alt={TOP_THREE[1].name}
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[#F2C94C] text-[#1A1A1A] font-extrabold text-[10px] flex items-center justify-center shadow-sm">
              1
            </span>
          </div>
          <span className="text-xs font-bold text-[#1A1A1A] dark:text-white mt-1">
            {TOP_THREE[1].name}
          </span>
          <span className="text-[10px] text-[#F5B800] font-extrabold">
            {TOP_THREE[1].score} Lethal
          </span>
        </div>

        {/* Rank 3 */}
        <div className="flex flex-col items-center">
          <div className="relative mb-2">
            <div className="w-16 h-16 rounded-full p-[3px] bg-[#EB5757]">
              <img
                src={TOP_THREE[2].avatar}
                alt={TOP_THREE[2].name}
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[#EB5757] text-white font-extrabold text-[10px] flex items-center justify-center shadow-sm">
              3
            </span>
          </div>
          <span className="text-xs font-bold text-[#1A1A1A] dark:text-white mt-1">
            {TOP_THREE[2].name}
          </span>
          <span className="text-[10px] text-[#7A869A] font-semibold">
            {TOP_THREE[2].score} Lethal
          </span>
        </div>
      </div>

      {/* Your Rating Banner (Soft Pastel Lime) */}
      <div className="p-3.5 rounded-2xl bg-[#EDF8E9] dark:bg-[#1E2E1A] border border-[#D5EED0] dark:border-[#2D4527] flex items-center justify-between">
        <span className="text-xs font-bold text-[#27AE60] dark:text-[#52D489]">
          Your Rating
        </span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-extrabold text-[#27AE60] dark:text-[#52D489] font-mono">
            24
          </span>
          <span className="w-5 h-5 rounded-full bg-[#27AE60]/20 flex items-center justify-center text-[#27AE60] dark:text-[#52D489]">
            <ChevronUp className="w-3.5 h-3.5 stroke-[3]" />
          </span>
        </div>
      </div>

      {/* Rank list rows */}
      <div className="space-y-2 pt-1">
        {LEADERBOARD_LIST.map((item) => (
          <div
            key={item.name}
            className="p-3 rounded-2xl bg-white dark:bg-[#222228] border border-black/[0.03] dark:border-white/5 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <img
                src={item.avatar}
                alt={item.name}
                className="w-10 h-10 rounded-full object-cover border border-black/5"
              />
              <div>
                <span className="text-xs font-bold text-[#1A1A1A] dark:text-white block">
                  {item.name}
                </span>
                <span className="text-[10px] text-[#8C9BAE] font-medium flex items-center gap-1">
                  <Star className="w-3 h-3 fill-[#F5B800] text-[#F5B800]" />
                  {item.points} habit points
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-[#7A869A] font-mono">
                {item.rank}
              </span>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                item.trend === 'up' ? 'text-[#27AE60] bg-[#27AE60]/10' : 'text-[#EB5757] bg-[#EB5757]/10'
              }`}>
                {item.trend === 'up' ? '▲' : '▼'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
