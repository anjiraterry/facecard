'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  toast: {
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration: number = 3500) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { id, message, type, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const toastMethods = useMemo(
    () => ({
      success: (msg: string, dur?: number) => showToast(msg, 'success', dur),
      error: (msg: string, dur?: number) => showToast(msg, 'error', dur),
      info: (msg: string, dur?: number) => showToast(msg, 'info', dur),
      warning: (msg: string, dur?: number) => showToast(msg, 'warning', dur),
    }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, toast: toastMethods }}>
      {children}

      {/* Floating Toast Notification Container */}
      <aside aria-label="Notifications" className="fixed top-5 inset-x-0 z-[100] flex flex-col items-center gap-2 pointer-events-none px-4">
        <AnimatePresence mode="popLayout">
          {toasts.map((item) => {
            const isSuccess = item.type === 'success';
            const isError = item.type === 'error';
            const isWarning = item.type === 'warning';

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -15, scale: 0.92 }}
                transition={{ type: 'spring', damping: 24, stiffness: 350 }}
                role="status"
                aria-live="polite"
                className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-[20px] max-w-md w-full shadow-lg backdrop-blur-xl border transition-all ${
                  isSuccess
                    ? 'bg-emerald-950/90 text-emerald-100 border-emerald-500/30 dark:bg-emerald-950/95'
                    : isError
                    ? 'bg-rose-950/90 text-rose-100 border-rose-500/30 dark:bg-rose-950/95'
                    : isWarning
                    ? 'bg-amber-950/90 text-amber-100 border-amber-500/30 dark:bg-amber-950/95'
                    : 'bg-neutral-900/90 text-neutral-100 border-white/15 dark:bg-[#1A1A22]/95'
                }`}
              >
                <div className="shrink-0">
                  {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {isError && <AlertCircle className="w-4 h-4 text-rose-400" />}
                  {isWarning && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                  {!isSuccess && !isError && !isWarning && <Info className="w-4 h-4 text-indigo-400" />}
                </div>

                <p className="flex-1 text-xs font-semibold leading-snug">{item.message}</p>

                <button
                  type="button"
                  onClick={() => removeToast(item.id)}
                  className="shrink-0 p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Dismiss toast"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </aside>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Graceful fallback for components rendered outside provider
    return {
      showToast: (msg: string) => console.log('[Toast]', msg),
      toast: {
        success: (msg: string) => console.log('[Toast:success]', msg),
        error: (msg: string) => console.error('[Toast:error]', msg),
        info: (msg: string) => console.log('[Toast:info]', msg),
        warning: (msg: string) => console.warn('[Toast:warning]', msg),
      },
    };
  }
  return context;
}
