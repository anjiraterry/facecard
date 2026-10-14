'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  AtSign, 
  Check, 
  Camera 
} from 'lucide-react';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { FaceCard } from '@/components/card/FaceCard';
import { FaceCardData } from '@/types';
import { authService } from '@/services/authService';

export default function LightOnboardingPage() {
  const router = useRouter();
  const [handle, setHandle] = useState('');
  const [consent, setConsent] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cleanHandle = handle.trim().replace(/^@/, '');
  const isValidHandle = cleanHandle.length >= 3 && /^[a-zA-Z0-9_]+$/.test(cleanHandle);

  const previewCard: FaceCardData = {
    id: 'preview-onboarding',
    tier: 'CLASSIC',
    cardholderName: (cleanHandle || 'YOUR HANDLE').toUpperCase(),
    title: 'Certified Classic',
    score: 84,
    band: 'DANGEROUS',
    streakDays: 1,
    multiplier: 1.0,
  };

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) return;

    setIsSubmitting(true);
    try {
      if (cleanHandle) {
        await authService.updateProfile({
          handle: cleanHandle,
          displayName: cleanHandle.charAt(0).toUpperCase() + cleanHandle.slice(1),
        }).catch(() => {});
      }

      await authService.recordConsent({
        ageConfirmed: true,
        consentVersion: '1.0-NDPA',
        biometricConsent: true,
      }).catch(() => {});

      if (typeof window !== 'undefined') {
        localStorage.setItem('fc_onboarded', 'true');
        if (cleanHandle) {
          localStorage.setItem('facecard_handle', cleanHandle);
        }
      }

      router.push('/scan');
    } catch (err) {
      console.warn('Onboarding error, proceeding to scan:', err);
      router.push('/scan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] font-sans antialiased pb-12 transition-colors duration-200">
      {/* Subtle Ambient Ethereal Glow */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-75 dark:opacity-25"
        style={{
          background: `
            radial-gradient(ellipse at 50% -10%, rgba(244, 114, 182, 0.08) 0%, transparent 55%),
            radial-gradient(ellipse at 85% 35%, rgba(251, 146, 60, 0.06) 0%, transparent 45%),
            radial-gradient(ellipse at 15% 70%, rgba(99, 102, 241, 0.06) 0%, transparent 50%)
          `
        }}
      />

      <main className="relative z-10 max-w-md mx-auto px-5 pt-5 space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between h-10 px-1">
          <Link
            href="/"
            className="w-9 h-9 flex items-center justify-center text-[var(--text-main)] transition-transform active:scale-95"
            title="Back to Landing"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2]" />
          </Link>

          <span className="text-xl font-bold tracking-tight text-[var(--text-main)]">
            facecard
          </span>

          <ThemeToggle />
        </header>

        {/* Title */}
        <div className="space-y-1.5 text-center pt-2">
          <h1 className="text-2xl font-black tracking-tight text-[var(--text-main)]">
            Claim Your Face Card
          </h1>
          <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto leading-relaxed">
            AI-calibrated facial lethality rating (0–100). Take 1 selfie, claim your card, and battle in the Arena.
          </p>
        </div>

        {/* Live Card Preview */}
        <div className="py-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="w-full flex justify-center"
          >
            <div className="w-full max-w-[340px]">
              <FaceCard card={previewCard} />
            </div>
          </motion.div>
        </div>

        {/* Light Onboarding Form */}
        <form onSubmit={handleClaim} className="p-5 rounded-[28px] bg-white/85 dark:bg-[#140826]/80 backdrop-blur-2xl border border-white/95 dark:border-white/10 shadow-sm space-y-4">
          {/* Handle Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-muted)] block px-1">
              Choose Your Handle
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-[var(--text-muted)]">
                <AtSign className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="yourhandle"
                maxLength={20}
                className="w-full pl-9 pr-4 py-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 text-xs sm:text-sm font-semibold text-[var(--text-main)] focus:outline-none focus:border-[#6366F1] transition-all"
              />
            </div>
          </div>

          {/* Quick 1-tap Consent */}
          <label className="flex items-start gap-3 p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 rounded border-zinc-300 text-[#6366F1] focus:ring-[#6366F1] w-4 h-4 cursor-pointer"
            />
            <span className="text-[11px] leading-relaxed text-[var(--text-muted)]">
              I am 18+ and accept biometric privacy terms under NDPA. Raw selfies are instantly scored in memory and zero biometric photos are permanently stored.
            </span>
          </label>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!consent || isSubmitting}
            className="w-full py-3.5 px-5 rounded-2xl bg-[#140826] hover:bg-[#251040] dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-[#140826] font-black text-xs sm:text-sm shadow-md active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Camera className="w-4 h-4" />
            <span>{isSubmitting ? 'Issuing Card...' : 'Take First Selfie Scan'}</span>
            <ArrowRight className="w-4 h-4 ml-1 opacity-80" />
          </button>
        </form>

        {/* Existing User Redirect */}
        <div className="text-center pt-2">
          <p className="text-xs text-[var(--text-muted)]">
            Already have an account?{' '}
            <Link href="/sign-in" className="font-bold text-[#6366F1] hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
