'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Swords, 
  Camera, 
  ArrowRight, 
  ShieldCheck, 
  KeyRound,
  CreditCard
} from 'lucide-react';
import { FaceCard } from '@/components/card/FaceCard';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { ClaimFaceCardModal } from '@/components/card/ClaimFaceCardModal';
import { FaceCardData } from '@/types';

export default function LandingPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'claim' | 'login'>('claim');

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
    cardholderName: '@alexcross',
    handle: '@alexcross',
    title: 'Lethal Weapon',
    score: 96,
    band: 'LETHAL',
    streakDays: 21,
    multiplier: 1.4,
  };

  const lilacCard: FaceCardData = {
    id: 'landing-lilac',
    tier: 'CLASSIC',
    cardholderName: '@mayachen',
    handle: '@mayachen',
    title: 'Certified Classic',
    score: 78,
    band: 'DANGEROUS',
    streakDays: 7,
    multiplier: 1.1,
  };

  return (
    <div className="relative min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] font-sans antialiased overflow-x-hidden selection:bg-[#E8D744] selection:text-[#1A1A1A] transition-colors duration-200">
      {/* Dynamic Orla Ambient Background */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-70 dark:opacity-25"
        style={{
          background: `
            radial-gradient(ellipse at 50% -10%, rgba(232, 215, 68, 0.16) 0%, transparent 55%),
            radial-gradient(ellipse at 85% 35%, rgba(242, 166, 162, 0.12) 0%, transparent 50%),
            radial-gradient(ellipse at 15% 65%, rgba(179, 191, 240, 0.14) 0%, transparent 50%)
          `
        }}
      />

      {/* Top Navigation Bar */}
      <header className="relative z-20 max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-xl sm:text-2xl font-black tracking-widest uppercase text-[var(--text-main)]">
            FACECARD
          </span>
        </Link>

        <nav className="flex items-center gap-3 sm:gap-4">
          <ThemeToggle />
          <button
            onClick={openLoginModal}
            className="text-xs sm:text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors px-3 py-1.5 cursor-pointer"
          >
            Sign In
          </button>
          <button
            onClick={openClaimModal}
            className="text-xs sm:text-sm font-bold px-4 py-2 sm:px-5 sm:py-2.5 rounded-full bg-[#1A1A1A] hover:bg-black text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-[#1A1A1A] shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            Claim Your Card
          </button>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 pt-10 sm:pt-16 pb-24 space-y-20">
        
        {/* Main Headline & Pitch */}
        <section className="text-center max-w-3xl mx-auto space-y-6">
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.08] text-[var(--text-main)]">
            Your Face Has Value. <br />
            <span className="bg-gradient-to-r from-[#1A1A1A] via-[#9333EA] to-[#D9628E] dark:from-[#E8D744] dark:via-[#F2A6A2] dark:to-[#B3BFF0] bg-clip-text text-transparent">
              Claim Your Facecard.
            </span>
          </h1>

          <p className="text-sm sm:text-lg text-[var(--text-muted)] max-w-xl mx-auto leading-relaxed">
            The objective AI facial lethality rating and collectible card game. High aura, verified geometry, certified lethality. Face card never declines.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
            <button
              onClick={openClaimModal}
              className="w-full sm:w-auto px-8 py-4 rounded-full text-sm font-bold bg-[#1A1A1A] hover:bg-black text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-[#1A1A1A] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>Claim Your Card</span>
            </button>

            <button
              onClick={openLoginModal}
              className="w-full sm:w-auto px-8 py-4 rounded-full text-sm font-bold border border-black/15 dark:border-white/20 bg-white/60 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 text-[var(--text-main)] shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <KeyRound className="w-4 h-4 text-current" />
              <span>Enter with PIN</span>
            </button>
          </div>
        </section>

        {/* Dual Interactive Cards Showcase */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                <span>Tier 4: Black Card</span>
              </span>
              <span className="text-[11px] font-bold text-purple-600 dark:text-purple-300">
                Lethality 96/100
              </span>
            </div>
            <FaceCard card={showcaseCard} interactive={true} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-500" />
                <span>Tier 1: Classic Lilac</span>
              </span>
              <span className="text-[11px] font-bold text-purple-600 dark:text-purple-300">
                Lethality 78/100
              </span>
            </div>
            <FaceCard card={lilacCard} interactive={true} />
          </motion.div>
        </section>

        {/* 3 Pillar Features */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
          <div className="p-7 rounded-[32px] bg-white/80 dark:bg-[#140826]/80 backdrop-blur-xl border border-white/90 dark:border-white/10 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-300 flex items-center justify-center">
              <Camera className="w-6 h-6 stroke-[2]" />
            </div>
            <h3 className="text-base font-extrabold text-[var(--text-main)]">
              AI Lethality Scoring
            </h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              7-factor diagnostic formula evaluating facial symmetry, lighting craft, expression, and aura. Objective, calibrated, and consistent.
            </p>
          </div>

          <div className="p-7 rounded-[32px] bg-white/80 dark:bg-[#140826]/80 backdrop-blur-xl border border-white/90 dark:border-white/10 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 flex items-center justify-center">
              <Sparkles className="w-6 h-6 stroke-[2]" />
            </div>
            <h3 className="text-base font-extrabold text-[var(--text-main)]">
              Collectible Prestige Cards
            </h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Ascend from Classic Lilac to Gold Bullion, Titanium Platinum, and the elusive Black Card. Each Facecard is uniquely certified with your streak multiplier.
            </p>
          </div>

          <div className="p-7 rounded-[32px] bg-white/80 dark:bg-[#140826]/80 backdrop-blur-xl border border-white/90 dark:border-white/10 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-300 flex items-center justify-center">
              <Swords className="w-6 h-6 stroke-[2]" />
            </div>
            <h3 className="text-base font-extrabold text-[var(--text-main)]">
              P2P Arena Duels
            </h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Stake points against friends or battle in public matchmaking. 1v1 lethality comparisons settle the score. Winner takes the pot.
            </p>
          </div>
        </section>

        {/* Live Status Ticker */}
        <section className="p-6 rounded-[28px] bg-white/60 dark:bg-[#140826]/60 backdrop-blur-md border border-white/80 dark:border-white/10 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <span className="text-2xl font-black text-[var(--text-main)] block">24,800+</span>
            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Facecards Issued</span>
          </div>
          <div>
            <span className="text-2xl font-black text-purple-600 dark:text-purple-300 block">8,920+</span>
            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Duels Settled</span>
          </div>
          <div>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 block">100%</span>
            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">On-Device Privacy</span>
          </div>
          <div>
            <span className="text-2xl font-black text-[#FF7A50] block">0 Declines</span>
            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Face Card Status</span>
          </div>
        </section>

        {/* Bottom CTA Banner */}
        <section className="p-10 rounded-[36px] bg-gradient-to-br from-[#140826] via-[#210D3A] to-[#2D124E] text-white text-center space-y-6 shadow-2xl border border-purple-400/25">
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white max-w-md mx-auto">
            Ready to claim your official Facecard?
          </h2>
          <p className="text-xs sm:text-sm text-purple-200/80 max-w-sm mx-auto">
            Takes 10 seconds. Put your name, pick your handle, set a 4-digit PIN, and start playing.
          </p>
          <div>
            <button
              onClick={openClaimModal}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-sm font-bold bg-white text-[#140826] hover:bg-zinc-100 shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <span>Claim Your Card</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-black/5 dark:border-white/10 py-8 px-6 text-center text-xs text-[var(--text-muted)]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-extrabold tracking-wider uppercase">
            FACECARD © 2026
          </span>
          <div className="flex gap-6 font-semibold">
            <button onClick={openLoginModal} className="hover:text-[var(--text-main)] transition-colors cursor-pointer">Sign In</button>
            <button onClick={openClaimModal} className="hover:text-[var(--text-main)] transition-colors cursor-pointer">Claim Your Card</button>
            <Link href="/arena" className="hover:text-[var(--text-main)] transition-colors">Arena</Link>
          </div>
        </div>
      </footer>

      {/* Claim / PIN Login Modal */}
      <ClaimFaceCardModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultMode={modalMode}
      />
    </div>
  );
}
