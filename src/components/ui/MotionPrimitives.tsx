'use client';

import React from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';

const LUXURY_EASE = [0.22, 1, 0.36, 1] as const;

const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.055,
      delayChildren: 0.03,
    },
  },
};

const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.34,
      ease: LUXURY_EASE,
    },
  },
};

/**
 * Framer Motion staggered container for page sections and card lists.
 */
export function FramerStagger({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Individual staggered child inside `FramerStagger`.
 */
export function FramerItem({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={staggerItemVariants} className={className}>
      {children}
    </motion.div>
  );
}

/**
 * Smooth AnimatePresence wrapper for tab-to-tab and state-to-state transitions.
 */
export function FramerTabPanel({
  tabKey,
  children,
  className = '',
}: {
  tabKey: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={tabKey}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.22, ease: LUXURY_EASE }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function FramerReveal({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: LUXURY_EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Backwards-compatible alias so any existing import compiles cleanly
export { FramerStagger as GsapStagger };
