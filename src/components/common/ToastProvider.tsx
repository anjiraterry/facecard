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

      <aside
        aria-label="Notifications"
        className="fixed top-5 inset-x-0 z-[100] flex flex-col items-center gap-2 pointer-events-none px-4"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((item) => {
            const isSuccess = item.type === 'success';
            const isError = item.type === 'error';
            const isWarning = item.type === 'warning';

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: -16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                role="status"
                aria-live="polite"
                className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl max-w-md w-full bg-[#251E24] text-[#FAF7F4] border border-[#EBDCD5]/15 shadow-[var(--shadow-lg)]"
              >
                <div className="shrink-0">
                  {isSuccess && <CheckCircle2 className="w-4 h-4 text-[#78B894]" />}
                  {isError && <AlertCircle className="w-4 h-4 text-[#E28C99]" />}
                  {isWarning && <AlertTriangle className="w-4 h-4 text-[#DFB178]" />}
                  {!isSuccess && !isError && !isWarning && <Info className="w-4 h-4 text-[#D2B8C9]" />}
                </div>

                <p className="flex-1 text-xs font-medium leading-snug">{item.message}</p>

                <button
                  type="button"
                  onClick={() => removeToast(item.id)}
                  className="shrink-0 p-1 rounded-full text-[#EBDCD5]/70 hover:text-[#FAF7F4] hover:bg-[#FAF7F4]/10 transition-colors cursor-pointer"
                  aria-label="Dismiss notification"
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
