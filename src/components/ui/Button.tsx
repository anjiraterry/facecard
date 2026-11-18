'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] border border-transparent shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)]',
  secondary:
    'bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--accent)] border border-[var(--border)]',
  ghost:
    'bg-transparent text-[var(--foreground)] hover:bg-[var(--surface-secondary)] border border-[var(--border)] hover:border-[var(--border-strong)]',
  danger:
    'bg-[var(--error-surface)] text-[var(--error)] hover:opacity-90 border border-[var(--error)]/25',
};

const SIZE_CLASSES: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-9 px-3.5 text-xs',
  md: 'h-11 px-5 text-xs sm:text-sm',
  lg: 'h-12 px-7 text-sm',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      fullWidth = false,
      disabled,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        className={cn(
          'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-sans font-semibold tracking-[0.01em] transition-all duration-150 cursor-pointer',
          'active:scale-[0.98] disabled:bg-[var(--disabled)] disabled:text-[var(--foreground-muted)] disabled:border-[var(--border)] disabled:shadow-none disabled:cursor-not-allowed disabled:active:scale-100',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {isLoading && (
          <span
            aria-hidden="true"
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0"
          />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
