'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, Camera, Clock, Star } from 'lucide-react';
import { SurfaceCard } from '@/components/ui/SurfaceCard';

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
  title = 'Daily Portrait Face-Off',
  day = 6,
  opponentName = 'Amara Okafor',
  opponentAvatar = 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
  userAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  bonusPoints = 40,
  timeLeft = '24 min left to check in',
}: ChallengeDuelCardProps) {
  return (
    <SurfaceCard variant="default" padding="sm" className="space-y-4">
      <div className="relative h-64 sm:h-72 rounded-2xl overflow-hidden bg-[#251E24] group">
        <img
          src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800&auto=format&fit=crop&q=80"
          alt="Challenge portrait"
          className="w-full h-full object-cover object-center group-hover:scale-[1.03] transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#251E24]/90 via-[#251E24]/25 to-[#251E24]/30" />

        <div className="absolute top-4 left-4 right-4 flex flex-col items-start gap-1.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF7F4]/20 backdrop-blur-md text-[11px] font-semibold text-[#FAF7F4] border border-[#FAF7F4]/25">
            <Calendar className="w-3 h-3 text-[#EBDCD5]" />
            <span>Day {day}</span>
          </span>
          <h3 className="font-display text-2xl font-semibold text-[#FAF7F4] tracking-tight">
            {title}
          </h3>
        </div>

        <div className="absolute bottom-4 inset-x-4 flex items-center justify-between p-2.5 rounded-2xl bg-[#251E24]/75 backdrop-blur-md border border-[#EBDCD5]/20">
          <div className="flex items-center gap-2.5">
            <div className="flex -space-x-2">
              <img
                src={userAvatar}
                alt="You"
                className="w-8 h-8 rounded-full border-2 border-[#FAF7F4] object-cover"
              />
              <img
                src={opponentAvatar}
                alt={opponentName}
                className="w-8 h-8 rounded-full border-2 border-[#D2B8C9] object-cover"
              />
            </div>
            <span className="text-xs font-semibold text-[#FAF7F4]">
              Duel vs {opponentName.split(' ')[0]}
            </span>
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EBDCD5] text-[#251E24] text-[11px] font-bold tabular-nums">
            <Star className="w-3 h-3 fill-current" />
            <span>+{bonusPoints} pts</span>
          </div>
        </div>
      </div>

      <Link
        href="/scan"
        className="w-full py-3.5 px-5 rounded-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--bg-page)] shadow-[var(--shadow-sm)] flex flex-col items-center justify-center transition-all active:scale-[0.99]"
      >
        <span className="text-sm font-semibold flex items-center gap-1.5">
          <Camera className="w-4 h-4" />
          <span>Enter Daily Challenge</span>
        </span>
        <span className="text-[11px] opacity-80 font-medium flex items-center gap-1 mt-0.5">
          <Clock className="w-3 h-3" />
          <span>{timeLeft}</span>
        </span>
      </Link>
    </SurfaceCard>
  );
}
