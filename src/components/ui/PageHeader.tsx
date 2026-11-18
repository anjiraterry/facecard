'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Bell, Coins, User } from 'lucide-react';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { cardService } from '@/services/cardService';

interface PageHeaderProps {
  title: string;
  backHref?: string;
  backLabel?: string;
  rightSlot?: React.ReactNode;
  showQuickActions?: boolean;
  points?: number;
}

/**
 * Uniform header format for all inner authenticated pages:
 * Left: Back arrow (+ Title on narrow screens) | Center (sm+): Title |
 * Right: ThemeToggle + optional Quick Actions (Points, Notifications, Profile) + optional slot.
 */
export function PageHeader({
  title,
  backHref = '/home',
  backLabel = 'Back',
  rightSlot,
  showQuickActions = true,
  points,
}: PageHeaderProps) {
  const router = useRouter();
  const { data: cardRes } = useQuery({
    queryKey: ['header-balance'],
    queryFn: () => cardService.getCardDetails(),
    enabled: showQuickActions && points === undefined,
    staleTime: 60 * 1000,
  });

  const displayPoints = points ?? cardRes?.spendableBalance ?? 0;

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(backHref);
    }
  };

  return (
    <header className="relative flex items-center justify-between h-11 px-1 gap-2">
      <div className="flex items-center gap-1 min-w-0">
        <button
          type="button"
          onClick={handleBack}
          aria-label={backLabel}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[var(--foreground)] hover:bg-[var(--surface-secondary)] transition-colors shrink-0 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 stroke-[1.75]" />
        </button>

        <h1 className="sm:hidden text-[15px] font-bold tracking-tight text-[var(--foreground)] truncate">
          {title}
        </h1>
      </div>

      <div className="hidden sm:block sm:absolute sm:left-1/2 sm:-translate-x-1/2 pointer-events-none">
        <h1 className="text-base font-bold tracking-tight text-[var(--foreground)] whitespace-nowrap">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        <ThemeToggle />

        {showQuickActions && (
          <>
            <Link
              href="/shop"
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[11px] sm:text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-secondary)] transition-colors tabular-nums"
              title="Boutique & Spendable Balance"
            >
              <Coins className="w-3.5 h-3.5 text-[var(--accent-brand)] shrink-0" />
              <span>{displayPoints.toLocaleString()}</span>
            </Link>

            <Link
              href="/scan"
              aria-label="Notifications and daily scan"
              className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[var(--foreground)] hover:bg-[var(--surface-secondary)] transition-colors"
              title="Daily Scan & Alerts"
            >
              <Bell className="w-[18px] h-[18px] stroke-[1.75]" />
            </Link>

            <Link
              href="/profile"
              aria-label="Profile"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[var(--foreground)] hover:bg-[var(--surface-secondary)] transition-colors"
              title="Profile"
            >
              <User className="w-[18px] h-[18px] stroke-[1.75]" />
            </Link>
          </>
        )}

        {rightSlot}
      </div>
    </header>
  );
}
