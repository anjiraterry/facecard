'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-colors text-inherit hover:opacity-80 active:scale-90 ${className}`}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label="Toggle theme"
    >
      <motion.div
        key={resolvedTheme}
        initial={{ rotate: -45, scale: 0.7, opacity: 0 }}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        exit={{ rotate: 45, scale: 0.7, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="flex items-center justify-center"
      >
        {isDark ? (
          <Sun className="w-4 h-4 text-[#FDE047] stroke-[2.2]" />
        ) : (
          <Moon className="w-4 h-4 text-[#18181B] stroke-[2]" />
        )}
      </motion.div>
    </button>
  );
}
