import React from 'react';
import { cn } from '@/lib/utils';

export interface SurfaceCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'warm' | 'elevated' | 'dark';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const VARIANT_CLASSES: Record<NonNullable<SurfaceCardProps['variant']>, string> = {
  default: 'rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-xs)]',
  warm: 'rounded-2xl bg-[var(--surface-secondary)] border border-[var(--border)]',
  elevated: 'rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] shadow-[var(--shadow-sm)]',
  dark: 'rounded-3xl bg-[#251E24] text-[#FAF7F4] border border-[#EBDCD5]/15 shadow-[var(--shadow-md)]',
};

const PADDING_CLASSES: Record<NonNullable<SurfaceCardProps['padding']>, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
};

export function SurfaceCard({
  variant = 'default',
  padding = 'md',
  className,
  children,
  ...props
}: SurfaceCardProps) {
  return (
    <div
      className={cn(
        'transition-colors duration-150',
        VARIANT_CLASSES[variant],
        PADDING_CLASSES[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
