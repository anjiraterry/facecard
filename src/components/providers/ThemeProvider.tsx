'use client';

import React, { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { MotionConfig } from 'framer-motion';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function subscribeTheme(callback: () => void) {
  window.addEventListener('storage', callback);
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  mql.addEventListener('change', callback);
  return () => {
    window.removeEventListener('storage', callback);
    mql.removeEventListener('change', callback);
  };
}

function getThemeSnapshot(): Theme {
  const saved = localStorage.getItem('facecard-theme') as Theme | null;
  if (saved && ['light', 'dark', 'system'].includes(saved)) {
    return saved;
  }
  return 'light';
}

function getServerThemeSnapshot(): Theme {
  return 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const storedTheme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getServerThemeSnapshot
  );

  const [localTheme, setLocalTheme] = useState<Theme | null>(null);
  const theme = localTheme ?? storedTheme;

  const [systemPrefersDark, setSystemPrefersDark] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const resolvedTheme: 'light' | 'dark' =
    theme === 'system'
      ? (systemPrefersDark ? 'dark' : 'light')
      : theme;

  const applyThemeDom = (nextResolved: 'light' | 'dark') => {
    const root = document.documentElement;
    root.setAttribute('data-theme', nextResolved);
    if (nextResolved === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  useEffect(() => {
    applyThemeDom(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = (newTheme: Theme) => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const commit = () => {
      setLocalTheme(newTheme);
      localStorage.setItem('facecard-theme', newTheme);
      window.dispatchEvent(new Event('storage'));
    };

    if (prefersReduced || typeof document === 'undefined') {
      commit();
      return;
    }

    const docWithVT = document as Document & {
      startViewTransition?: (cb: () => void) => { finished: Promise<void> };
    };

    if (typeof docWithVT.startViewTransition === 'function') {
      docWithVT.startViewTransition(() => {
        const nextResolved: 'light' | 'dark' =
          newTheme === 'system'
            ? (systemPrefersDark ? 'dark' : 'light')
            : newTheme;
        applyThemeDom(nextResolved);
        commit();
      });
    } else {
      const root = document.documentElement;
      root.classList.add('theme-transitioning');
      commit();
      window.setTimeout(() => {
        root.classList.remove('theme-transitioning');
      }, 320);
    }
  };

  const toggleTheme = () => {
    const next = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
        {children}
      </ThemeContext.Provider>
    </MotionConfig>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
