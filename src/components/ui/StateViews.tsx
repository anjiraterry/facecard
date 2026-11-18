'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from './Button';
import { SurfaceCard } from './SurfaceCard';

const STATE_EASE = [0.22, 1, 0.36, 1] as const;

export function LoadingState({ label = 'Preparing your space...' }: { label?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.25, ease: STATE_EASE }}
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-3"
    >
      <div className="w-8 h-8 rounded-full border-2 border-[var(--accent-brand)] border-t-transparent animate-spin" />
      <p className="text-xs font-medium tracking-wide text-[var(--foreground-muted)]">{label}</p>
    </motion.div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  secondaryLabel,
  secondaryHref,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  secondaryHref?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: STATE_EASE }}
    >
      <SurfaceCard variant="warm" padding="lg" className="text-center space-y-3">
        <div className="space-y-1 max-w-xs mx-auto">
          <h3 className="text-base font-semibold text-[var(--foreground)]">{title}</h3>
          <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">{description}</p>
        </div>
        {(actionLabel || secondaryLabel) && (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {actionLabel && actionHref && (
              <Link
                href={actionHref}
                className="inline-flex items-center justify-center h-9 px-4 rounded-full text-xs font-semibold bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] transition-colors"
              >
                {actionLabel}
              </Link>
            )}
            {actionLabel && onAction && !actionHref && (
              <Button variant="primary" size="sm" onClick={onAction}>
                {actionLabel}
              </Button>
            )}
            {secondaryLabel && secondaryHref && (
              <Link
                href={secondaryHref}
                className="inline-flex items-center justify-center h-9 px-4 rounded-full text-xs font-semibold bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors"
              >
                {secondaryLabel}
              </Link>
            )}
          </div>
        )}
      </SurfaceCard>
    </motion.div>
  );
}

export function ErrorState({
  title = 'Something interrupted your session',
  message = 'Please try again in a moment.',
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: STATE_EASE }}
    >
      <SurfaceCard role="alert" variant="default" padding="lg" className="text-center space-y-3 border-[var(--error)]/25">
        <div className="w-11 h-11 rounded-full bg-[var(--error-surface)] text-[var(--error)] flex items-center justify-center mx-auto">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div className="space-y-1 max-w-xs mx-auto">
          <h3 className="text-base font-semibold text-[var(--foreground)]">{title}</h3>
          <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">{message}</p>
        </div>
        {onRetry && (
          <div className="pt-1">
            <Button variant="secondary" size="sm" onClick={onRetry}>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </Button>
          </div>
        )}
      </SurfaceCard>
    </motion.div>
  );
}

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const update = () => setIsOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.22, ease: STATE_EASE }}
          role="status"
          aria-live="assertive"
          className="fixed top-3 left-1/2 -translate-x-1/2 z-[90] px-4 py-2 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-semibold shadow-[var(--shadow-md)] flex items-center gap-2"
        >
          <WifiOff className="w-3.5 h-3.5" />
          <span>You appear to be offline — some actions are paused.</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
