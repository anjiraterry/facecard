'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-colors text-[var(--foreground)] hover:bg-[var(--surface-secondary)] active:scale-95 cursor-pointer ${className}`}
      title={isDark ? 'Switch to Porcelain Light Mode' : 'Switch to Black Plum Dark Mode'}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={resolvedTheme}
          initial={{ rotate: -25, scale: 0.8, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 25, scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center justify-center"
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-[#EBDCD5] stroke-[1.8]" />
          ) : (
            <Moon className="w-4 h-4 text-[#251E24] stroke-[1.8]" />
          )}
        </motion.div>
      </AnimatePresence>
    </button>
  );
}
