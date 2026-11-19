'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FaceCard } from '@/components/card/FaceCard';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { ClaimFaceCardModal } from '@/components/card/ClaimFaceCardModal';
import { Button } from '@/components/ui/Button';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { useAuth } from '@/hooks/useAuth';
import { FaceCardData } from '@/types';

export default function LandingPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'claim' | 'login'>('claim');

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/home');
    }
  }, [isLoading, user, router]);

  const openClaimModal = () => {
    setModalMode('claim');
    setModalOpen(true);
  };

  const openLoginModal = () => {
    setModalMode('login');
    setModalOpen(true);
  };

  const showcaseCard: FaceCardData = {
    id: 'landing-showcase',
    tier: 'BLACK',
    cardholderName: 'Amara Okafor',
    handle: '@amara',
    title: 'Velvet Matte',
    score: 96,
    band: 'LETHAL',
    streakDays: 21,
    multiplier: 1.4,
  };

  const classicCard: FaceCardData = {
    id: 'landing-classic',
    tier: 'CLASSIC',
    cardholderName: 'Maya Chen',
    handle: '@mayachen',
    title: 'Lilac Satin',
    score: 78,
    band: 'DANGEROUS',
    streakDays: 7,
    multiplier: 1.1,
  };

  return (
    <div className="relative min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans antialiased overflow-x-hidden transition-colors duration-200">
      {/* Top Navigation */}
      <header className="relative z-20 max-w-7xl mx-auto px-5 sm:px-8 py-6 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center shrink-0">
          <span className="font-sans text-xl sm:text-2xl font-extrabold tracking-[-0.03em] lowercase text-[var(--foreground)]">
            facecard.
          </span>
        </Link>

        <nav aria-label="Landing navigation" className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          {user ? (
            <Link
              href="/home"
              className="inline-flex items-center justify-center h-9 px-3 rounded-full text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-secondary)] transition-colors"
            >
              Home
            </Link>
          ) : (
            <Button variant="ghost" size="sm" onClick={openLoginModal}>
              Sign In
            </Button>
          )}
          <Link
            href="/atelier"
            className="inline-flex items-center justify-center h-9 px-4 rounded-full text-xs font-semibold bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity shadow-[var(--shadow-xs)]"
          >
            Atelier
          </Link>
        </nav>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 pt-8 sm:pt-14 pb-24 space-y-20 sm:space-y-24">
        {/* Editorial Hero */}
        <section className="text-center max-w-3xl mx-auto space-y-6">
    

          <h1 className="font-display text-5xl sm:text-6xl lg:text-[72px] font-semibold tracking-[-0.03em] leading-[1.02] text-[var(--foreground)]">
            Beauty is yours. <br />
            <span className="text-[var(--brand-plum)]">Own it.</span>
          </h1>

          <p className="text-sm sm:text-base text-[var(--foreground-secondary)] max-w-xl mx-auto leading-relaxed">
            Discover your skin, express yourself, and carry the face card that never declines.
            Collect your tiered Face Card, build daily rituals, and connect with your circle.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <Button variant="primary" size="lg" onClick={openClaimModal} className="w-full sm:w-auto">
              Claim Your Card
            </Button>

            <Button variant="secondary" size="lg" onClick={openLoginModal} className="w-full sm:w-auto">
              Enter with PIN
            </Button>
          </div>
        </section>

        {/* Dual Collectible Tier Showcase */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
                Black Card · Velvet Matte
              </span>
              <span className="text-xs font-semibold text-[var(--foreground)] tabular-nums">
                Index 96/100
              </span>
            </div>
            <FaceCard card={showcaseCard} variant="hero" interactive={true} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.12 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
                Classic · Lilac Satin
              </span>
              <span className="text-xs font-semibold text-[var(--foreground)] tabular-nums">
                Index 78/100
              </span>
            </div>
            <FaceCard card={classicCard} variant="hero" interactive={true} />
          </motion.div>
        </section>

        {/* Three Clean Editorial Pillars */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SurfaceCard variant="default" padding="lg" className="space-y-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--brand-plum)] block">
              01 · Analysis
            </span>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Lighting &amp; Craft
            </h2>
            <p className="text-xs sm:text-sm text-[var(--foreground-secondary)] leading-relaxed">
              Evaluates studio lighting, focal sharpness, framing, expression, and skin clarity — calibrated across every skin tone.
            </p>
          </SurfaceCard>

          <SurfaceCard variant="default" padding="lg" className="space-y-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--brand-plum)] block">
              02 · Editions
            </span>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Collectible Tiers
            </h2>
            <p className="text-xs sm:text-sm text-[var(--foreground-secondary)] leading-relaxed">
              Progress from Dusty Lilac Classic to Brushed Gold, Pearlescent Platinum, and Velvet Matte Black through daily streaks.
            </p>
          </SurfaceCard>

          <SurfaceCard variant="default" padding="lg" className="space-y-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--brand-plum)] block">
              03 · Community
            </span>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Curated Arena Duels
            </h2>
            <p className="text-xs sm:text-sm text-[var(--foreground-secondary)] leading-relaxed">
              Invite friends to friendly or staked portrait face-offs with same-tier parity and instant ephemeral scoring.
            </p>
          </SurfaceCard>
        </section>

        {/* Skincare Atelier Callout */}
        <SurfaceCard variant="warm" padding="lg" className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-plum)]">
              Skincare Commerce
            </span>
            <h2 className="text-2xl font-semibold text-[var(--foreground)]">
              Atelier
            </h2>
            <p className="text-xs sm:text-sm text-[var(--foreground-secondary)] leading-relaxed">
              Curated formulations, personalised AM/PM routines, and seamless NGN checkout designed for melanin-rich skin.
            </p>
          </div>
          <Link
            href="/atelier"
            className="inline-flex items-center justify-center h-11 px-6 rounded-full bg-[var(--surface)] border border-[var(--border)] text-xs sm:text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors shrink-0"
          >
            Explore the Atelier
          </Link>
        </SurfaceCard>

        {/* Bottom Editorial CTA */}
        <SurfaceCard variant="dark" padding="lg" className="text-center space-y-5 py-10 sm:py-12">
          <h2 className="text-2xl sm:text-4xl font-semibold text-[#FAF7F4] max-w-md mx-auto leading-tight">
            Ready to claim your official Face Card?
          </h2>
          <p className="text-xs sm:text-sm text-[#EBDCD5]/80 max-w-md mx-auto leading-relaxed">
            Set your name, reserve your handle, and choose a 4-digit PIN in moments.
          </p>
          <div className="pt-1">
            <button
              type="button"
              onClick={openClaimModal}
              className="inline-flex items-center justify-center h-12 px-8 rounded-full text-sm font-semibold bg-[#FAF7F4] text-[#251E24] hover:bg-[#EBDCD5] active:scale-[0.98] transition-all cursor-pointer"
            >
              Claim Your Card
            </button>
          </div>
        </SurfaceCard>
      </main>

      <footer className="relative z-10 border-t border-[var(--border)] py-8 px-6 text-xs text-[var(--foreground-muted)]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-sans text-sm font-extrabold tracking-[-0.03em] lowercase text-[var(--foreground)]">
            facecard. © 2026
          </span>
          <div className="flex flex-wrap justify-center gap-6 font-medium">
            <button type="button" onClick={openLoginModal} className="hover:text-[var(--foreground)] transition-colors cursor-pointer">
              Sign In
            </button>
            <button type="button" onClick={openClaimModal} className="hover:text-[var(--foreground)] transition-colors cursor-pointer">
              Claim Card
            </button>
            <Link href="/faceoff" className="hover:text-[var(--foreground)] transition-colors">
              Arena
            </Link>
            <Link href="/atelier" className="hover:text-[var(--foreground)] transition-colors">
              The Skin Edit
            </Link>
          </div>
        </div>
      </footer>

      <ClaimFaceCardModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultMode={modalMode}
      />
    </div>
  );
}
