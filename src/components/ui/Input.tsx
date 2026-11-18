'use client';

import React, { useId } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string | null;
  leftIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, helperText, error, leftIcon, id, disabled, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--foreground-secondary)]"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span
              aria-hidden="true"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] pointer-events-none"
            >
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={cn(
              'w-full h-12 pr-3.5 rounded-xl bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)]',
              'border text-sm font-medium transition-colors duration-150',
              'focus:outline-none focus:border-[var(--focus-ring)]',
              'disabled:bg-[var(--disabled)] disabled:text-[var(--foreground-muted)] disabled:cursor-not-allowed',
              error ? 'border-[var(--error)]' : 'border-[var(--input-border)]',
              leftIcon ? 'pl-10' : 'pl-4',
              className
            )}
            {...props}
          />
        </div>
        {error ? (
          <p id={errorId} role="alert" className="text-xs font-medium text-[var(--error)]">
            {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-[11px] text-[var(--foreground-muted)]">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
