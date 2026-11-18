'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, AtSign, Camera } from 'lucide-react';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { FaceCard } from '@/components/card/FaceCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { FaceCardData } from '@/types';
import { authService } from '@/services/authService';

export default function LightOnboardingPage() {
  const router = useRouter();
  const [handle, setHandle] = useState('');
  const [consent, setConsent] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cleanHandle = handle.trim().replace(/^@/, '');

  const previewCard: FaceCardData = {
    id: 'preview-onboarding',
    tier: 'CLASSIC',
    cardholderName: cleanHandle || 'Your Handle',
    title: 'Classic Satin',
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
      <main className="relative z-10 max-w-md mx-auto px-5 pt-5 space-y-6">
        <header className="flex items-center justify-between h-10 px-1">
          <Link
            href="/"
            aria-label="Back to landing"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-main)] hover:bg-[var(--bg-surface-warm)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5 stroke-[1.8]" />
          </Link>

          <span className="font-sans text-lg font-extrabold tracking-[-0.03em] lowercase text-[var(--text-main)]">
            facecard
          </span>

          <ThemeToggle />
        </header>

        <div className="space-y-1.5 text-center pt-1">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--text-main)]">
            Claim Your Face Card
          </h1>
          <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto leading-relaxed">
            Calibrated photo craft &amp; facial harmony (0–100). Take one portrait scan to unlock your card.
          </p>
        </div>

        <div className="py-1">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="w-full flex justify-center"
          >
            <div className="w-full max-w-[340px]">
              <FaceCard card={previewCard} />
            </div>
          </motion.div>
        </div>

        <SurfaceCard variant="default" padding="md">
          <form onSubmit={handleClaim} className="space-y-4">
            <Input
              label="Choose Your Handle"
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="yourhandle"
              maxLength={20}
              leftIcon={<AtSign className="w-4 h-4" />}
            />

            <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-[var(--bg-surface-warm)] border border-[var(--border-subtle)] cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 rounded border-[var(--border-strong)] text-[var(--accent-primary)] focus:ring-[var(--focus-ring)] w-4 h-4 cursor-pointer"
              />
              <span className="text-[11px] leading-relaxed text-[var(--text-muted)]">
                I am 18+ and accept the NDPA biometric privacy terms. Raw selfies are scored in ephemeral memory and never permanently stored.
              </span>
            </label>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isSubmitting}
              disabled={!consent}
            >
              {isSubmitting ? 'Issuing Card...' : 'Take First Portrait Scan'}
            </Button>
          </form>
        </SurfaceCard>

        <div className="text-center pt-1">
          <p className="text-xs text-[var(--text-muted)]">
            Already have an account?{' '}
            <Link href="/sign-in" className="font-semibold text-[var(--text-main)] underline underline-offset-4 hover:text-[var(--accent-brand)]">
              Sign In
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
