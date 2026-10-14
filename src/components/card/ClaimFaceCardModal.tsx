'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, KeyRound, User, AtSign, ArrowRight, AlertCircle, CreditCard } from 'lucide-react';
import { FaceCard } from '@/components/card/FaceCard';
import { useAuth } from '@/hooks/useAuth';
import { FaceCardData } from '@/types';

interface ClaimFaceCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'claim' | 'login';
}

export function ClaimFaceCardModal({ isOpen, onClose, defaultMode = 'claim' }: ClaimFaceCardModalProps) {
  const router = useRouter();
  const { claimFacecard, loginWithPin } = useAuth();
  
  const [mode, setMode] = useState<'claim' | 'login'>(defaultMode);
  
  // Claim fields
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [pin, setPin] = useState('');
  
  // Login fields
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPin, setLoginPin] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live preview card data
  const cleanHandle = handle.replace(/^@/, '').toLowerCase().trim();
  const previewCard: FaceCardData = {
    id: 'claim-preview',
    tier: 'CLASSIC',
    cardholderName: displayName.trim().toUpperCase() || 'YOUR NAME',
    title: 'Certified Classic',
    score: 0,
    band: 'HARMLESS',
    streakDays: 1,
    multiplier: 1.0,
    cardNumber: `FC-••••-2026`,
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!displayName.trim() || displayName.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }

    if (!cleanHandle || !/^[a-z0-9_]{3,20}$/.test(cleanHandle)) {
      setError('Username must be 3–20 letters, numbers, or underscores.');
      return;
    }

    if (!/^\d{4,6}$/.test(pin.trim())) {
      setError('Please set a 4 to 6 digit security PIN.');
      return;
    }

    setIsLoading(true);
    try {
      await claimFacecard({
        displayName: displayName.trim(),
        handle: cleanHandle,
        pin: pin.trim(),
      });
      onClose();
      router.push('/home');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to claim Facecard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanId = loginIdentifier.replace(/^@/, '').trim();
    if (!cleanId) {
      setError('Enter your @username or Facecard number.');
      return;
    }

    if (!/^\d{4,6}$/.test(loginPin.trim())) {
      setError('Enter your 4 to 6 digit PIN.');
      return;
    }

    setIsLoading(true);
    try {
      await loginWithPin(cleanId, loginPin.trim());
      onClose();
      router.push('/home');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative z-10 w-full max-w-xl bg-white dark:bg-[#151518] text-[#1A1A1A] dark:text-[#F9FAFB] rounded-[28px] border border-black/10 dark:border-white/10 shadow-[0_25px_70px_rgba(0,0,0,0.25)] dark:shadow-[0_25px_70px_rgba(0,0,0,0.7)] overflow-hidden my-auto"
        >
          {/* Top Warm Gold Accent Line */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#E8D744] via-[#F2A6A2] to-[#B3BFF0]" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-white/10 dark:hover:bg-white/20 flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-all z-20 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Header Tabs */}
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-white/10 pb-4 pr-10">
              <div className="flex gap-6">
                <button
                  type="button"
                  onClick={() => { setMode('claim'); setError(null); }}
                  className={`text-lg font-bold tracking-tight transition-colors pb-1.5 relative cursor-pointer ${
                    mode === 'claim'
                      ? 'text-[#1A1A1A] dark:text-white'
                      : 'text-neutral-400 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-300'
                  }`}
                >
                  Claim Facecard
                  {mode === 'claim' && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute bottom-0 inset-x-0 h-0.5 bg-[#1A1A1A] dark:bg-[#E8D744] rounded-full"
                    />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); }}
                  className={`text-lg font-bold tracking-tight transition-colors pb-1.5 relative cursor-pointer ${
                    mode === 'login'
                      ? 'text-[#1A1A1A] dark:text-white'
                      : 'text-neutral-400 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-300'
                  }`}
                >
                  Access with PIN
                  {mode === 'login' && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute bottom-0 inset-x-0 h-0.5 bg-[#1A1A1A] dark:bg-[#E8D744] rounded-full"
                    />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {mode === 'claim' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* Live Card Preview Column */}
                <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-100 dark:border-white/5 space-y-3">
                  <div className="w-full max-w-[230px] transform hover:scale-[1.02] transition-transform duration-300 pointer-events-none drop-shadow-md">
                    <FaceCard card={previewCard} interactive={false} />
                  </div>
                  <div className="text-center">
                    <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                      Live Preview &bull; {cleanHandle ? `@${cleanHandle}` : '@handle'}
                    </span>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">Includes 100 LP starter balance</p>
                  </div>
                </div>

                {/* Claiming Form */}
                <form onSubmit={handleClaimSubmit} className="space-y-3.5">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-neutral-400 dark:text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g. Maya Chen"
                        maxLength={40}
                        required
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] dark:focus:ring-white focus:border-transparent text-[#1A1A1A] dark:text-white placeholder:text-neutral-400 transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block mb-1.5">
                      Username
                    </label>
                    <div className="relative">
                      <AtSign className="w-4 h-4 text-neutral-400 dark:text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={handle}
                        onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                        placeholder="username"
                        maxLength={20}
                        required
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] dark:focus:ring-white focus:border-transparent text-[#1A1A1A] dark:text-white placeholder:text-neutral-400 transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block mb-1.5">
                      Security PIN (4–6 Digits)
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-neutral-400 dark:text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••"
                        required
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-semibold tracking-widest focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] dark:focus:ring-white focus:border-transparent text-[#1A1A1A] dark:text-white placeholder:text-neutral-400 transition-all shadow-sm"
                      />
                    </div>
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">
                      Used to quickly unlock your Facecard anytime.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 py-3 px-4 rounded-xl bg-[#1A1A1A] hover:bg-black text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-[#1A1A1A] font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        <span>Claim Your Facecard</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              /* PIN Sign In Form */
              <form onSubmit={handleLoginSubmit} className="max-w-sm mx-auto space-y-4 py-2">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block mb-1.5">
                    Username or Card Number
                  </label>
                  <div className="relative">
                    <AtSign className="w-4 h-4 text-neutral-400 dark:text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="@username or FC-1234-2026"
                      required
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] dark:focus:ring-white focus:border-transparent text-[#1A1A1A] dark:text-white placeholder:text-neutral-400 transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block mb-1.5">
                    4–6 Digit Security PIN
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-neutral-400 dark:text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={loginPin}
                      onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      required
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-semibold tracking-widest focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] dark:focus:ring-white focus:border-transparent text-[#1A1A1A] dark:text-white placeholder:text-neutral-400 transition-all shadow-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#1A1A1A] hover:bg-black text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-[#1A1A1A] font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Unlock Facecard</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="text-center pt-2">
              <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                Email is optional &bull; You can add an email anytime later to back up your Facecard.
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
