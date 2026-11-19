import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SurfaceCard } from '@/components/ui/SurfaceCard';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans antialiased py-8 px-5 sm:px-8">
      <main className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>
          <span className="font-sans text-lg font-extrabold tracking-[-0.03em] lowercase">
            facecard.
          </span>
        </div>

        <SurfaceCard variant="default" padding="lg" className="space-y-5">
          <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-brand)]">
              Biometric &amp; Data Protection
            </span>
            <h1 className="font-display text-3xl font-semibold">Privacy Policy</h1>
            <p className="text-xs text-[var(--foreground-muted)]">
              Effective November 2026 · NDPR Aligned
            </p>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-[var(--foreground-secondary)] leading-relaxed">
            <section className="space-y-1">
              <h2 className="text-sm font-bold text-[var(--foreground)]">1. On-Device Processing &amp; Volatile Memory</h2>
              <p>
                Portrait landmark and liveness checks run primarily on your device. By default, selfies submitted for scoring are evaluated in volatile memory and are not permanently stored.
              </p>
            </section>

            <section className="space-y-1">
              <h2 className="text-sm font-bold text-[var(--foreground)]">2. Opt-In Saved Gallery &amp; Facecard Portrait</h2>
              <p>
                Your portrait image is only saved if you explicitly choose to set it as your Facecard Portrait or tap &ldquo;Save Scan to Gallery.&rdquo; You can delete any saved scan from your Gallery at any time.
              </p>
            </section>

            <section className="space-y-1">
              <h2 className="text-sm font-bold text-[var(--foreground)]">3. Account Deletion &amp; Data Rights</h2>
              <p>
                You may update your profile details, withdraw consent, or permanently delete your account at any time from your Profile settings. Ledger records are anonymized in accordance with financial integrity requirements.
              </p>
            </section>
          </div>
        </SurfaceCard>
      </main>
    </div>
  );
}
