import React from 'react';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-neutral-200/70 dark:bg-white/[0.07] rounded-xl ${className}`}
    />
  );
}

export function FaceCardSkeleton() {
  return (
    <div className="w-full aspect-[1.586/1] rounded-[28px] bg-gradient-to-br from-neutral-200/80 via-neutral-100 to-neutral-200/60 dark:from-white/[0.08] dark:via-white/[0.04] dark:to-white/[0.06] p-5 flex flex-col justify-between shadow-sm animate-pulse border border-black/5 dark:border-white/5">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 rounded-md bg-neutral-300/70 dark:bg-white/10" />
        <div className="h-5 w-16 rounded-full bg-neutral-300/70 dark:bg-white/10" />
      </div>

      {/* Chip & Signal */}
      <div className="flex items-center gap-2">
        <div className="w-10 h-7 rounded-md bg-neutral-300/60 dark:bg-white/10" />
        <div className="w-4 h-4 rounded-full bg-neutral-300/50 dark:bg-white/10" />
      </div>

      {/* Bottom Info */}
      <div className="flex items-end justify-between">
        <div className="space-y-1.5">
          <div className="h-3 w-20 rounded bg-neutral-300/60 dark:bg-white/10" />
          <div className="h-5 w-36 rounded bg-neutral-300/80 dark:bg-white/15" />
          <div className="h-2.5 w-24 rounded bg-neutral-300/50 dark:bg-white/10" />
        </div>
        <div className="space-y-1 text-right">
          <div className="h-2.5 w-14 rounded bg-neutral-300/50 dark:bg-white/10 ml-auto" />
          <div className="h-6 w-12 rounded bg-neutral-300/80 dark:bg-white/15 ml-auto" />
          <div className="h-4 w-16 rounded-full bg-neutral-300/60 dark:bg-white/10 ml-auto" />
        </div>
      </div>
    </div>
  );
}

export function FriendRowSkeleton() {
  return (
    <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-[#140826]/70 backdrop-blur-xl border border-black/5 dark:border-white/10 flex items-center justify-between animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-white/10" />
        <div className="space-y-1.5">
          <div className="h-3.5 w-24 rounded bg-neutral-200 dark:bg-white/10" />
          <div className="h-2.5 w-32 rounded bg-neutral-200/60 dark:bg-white/5" />
        </div>
      </div>
      <div className="h-7 w-16 rounded-xl bg-neutral-200 dark:bg-white/10" />
    </div>
  );
}
