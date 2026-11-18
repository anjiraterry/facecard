import React from 'react';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-[var(--bg-surface-warm)] rounded-2xl ${className}`}
      aria-hidden="true"
    />
  );
}

export function FaceCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="w-full aspect-[1.586/1] rounded-[24px] bg-[var(--bg-surface-warm)] p-5 flex flex-col justify-between animate-pulse border border-[var(--border-card)]"
    >
      <div className="flex items-center justify-between">
        <div className="h-3.5 w-24 rounded-full bg-[var(--bg-secondary)]" />
        <div className="h-5 w-16 rounded-full bg-[var(--bg-secondary)]" />
      </div>

      <div className="flex items-center gap-2">
        <div className="w-9 h-6 rounded-md bg-[var(--bg-secondary)]" />
        <div className="w-3.5 h-3.5 rounded-full bg-[var(--bg-secondary)]" />
      </div>

      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <div className="h-2.5 w-20 rounded-full bg-[var(--bg-secondary)]" />
          <div className="h-5 w-36 rounded-full bg-[var(--bg-secondary)]" />
          <div className="h-2.5 w-24 rounded-full bg-[var(--bg-secondary)]" />
        </div>
        <div className="space-y-1.5 text-right">
          <div className="h-2.5 w-14 rounded-full bg-[var(--bg-secondary)] ml-auto" />
          <div className="h-6 w-12 rounded-full bg-[var(--bg-secondary)] ml-auto" />
          <div className="h-4 w-16 rounded-full bg-[var(--bg-secondary)] ml-auto" />
        </div>
      </div>
    </div>
  );
}

export function FriendRowSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-card)] flex items-center justify-between animate-pulse"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[var(--bg-surface-warm)]" />
        <div className="space-y-1.5">
          <div className="h-3.5 w-24 rounded-full bg-[var(--bg-surface-warm)]" />
          <div className="h-2.5 w-32 rounded-full bg-[var(--bg-surface-warm)]" />
        </div>
      </div>
      <div className="h-7 w-16 rounded-full bg-[var(--bg-surface-warm)]" />
    </div>
  );
}
