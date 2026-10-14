'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, Camera, Clock, Star } from 'lucide-react';

interface ChallengeDuelCardProps {
  title?: string;
  day?: number;
  opponentName?: string;
  opponentAvatar?: string;
  userAvatar?: string;
  bonusPoints?: number;
  timeLeft?: string;
}

export function ChallengeDuelCard({
  title = 'Daily Lethality Face-Off',
  day = 6,
  opponentName = 'Alex Simmons',
  opponentAvatar = 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
  userAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  bonusPoints = 40,
  timeLeft = '24 min left to check in',
}: ChallengeDuelCardProps) {
  return (
    <div className="p-4 sm:p-5 rounded-[32px] bg-white/95 dark:bg-[#1A1A1E]/95 backdrop-blur-xl border border-black/[0.04] dark:border-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.04)] space-y-4">
      {/* Visual Challenge Container */}
      <div className="relative h-64 sm:h-72 rounded-[24px] overflow-hidden bg-slate-900 group shadow-inner">
        <img
          src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800&auto=format&fit=crop&q=80"
          alt="Challenge selfie"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/35" />

        {/* Top Tag & Title */}
        <div className="absolute top-4 left-4 right-4 flex flex-col items-start gap-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold text-white border border-white/20 shadow-sm">
            <Calendar className="w-3 h-3 text-[#56CCF2]" />
            <span>Day {day}</span>
          </span>
          <h3 className="text-xl font-black text-white tracking-tight mt-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
            {title}
          </h3>
        </div>

        {/* Floating Duel Badge Pill */}
        <div className="absolute bottom-4 inset-x-4 flex items-center justify-between p-2 rounded-2xl bg-black/50 backdrop-blur-md border border-white/15">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              <img
                src={userAvatar}
                alt="You"
                className="w-8 h-8 rounded-full border-2 border-white object-cover"
              />
              <img
                src={opponentAvatar}
                alt={opponentName}
                className="w-8 h-8 rounded-full border-2 border-[#56CCF2] object-cover"
              />
            </div>
            <span className="text-xs font-bold text-white tracking-tight">
              Battle vs {opponentName.split(' ')[0]}
            </span>
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#78C257] text-white text-[11px] font-extrabold shadow-sm">
            <Star className="w-3 h-3 fill-white" />
            <span>+{bonusPoints} pts</span>
          </div>
        </div>
      </div>

      {/* Salmon/Coral Action Button */}
      <Link
        href="/scan"
        className="w-full py-4 px-5 rounded-2xl bg-[#EF6C65] hover:bg-[#E55B54] text-white shadow-[0_8px_20px_rgba(239,108,101,0.35)] flex flex-col items-center justify-center transition-transform active:scale-[0.99]"
      >
        <span className="text-sm font-extrabold tracking-tight flex items-center gap-1.5">
          <Camera className="w-4 h-4" />
          <span>Take Part in Challenge</span>
        </span>
        <span className="text-[11px] opacity-85 font-medium flex items-center gap-1 mt-0.5">
          <Clock className="w-3 h-3" />
          <span>{timeLeft} with selfie</span>
        </span>
      </Link>
    </div>
  );
}
