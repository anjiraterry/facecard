import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SurfaceCard } from '@/components/ui/SurfaceCard';

export default function TermsPage() {
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
              Legal &amp; Community Standards
            </span>
            <h1 className="font-display text-3xl font-semibold">Terms of Service</h1>
            <p className="text-xs text-[var(--foreground-muted)]">
              Effective November 2026
            </p>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-[var(--foreground-secondary)] leading-relaxed">
            <section className="space-y-1">
              <h2 className="text-sm font-bold text-[var(--foreground)]">1. Eligibility (18+ Only)</h2>
              <p>
                Face Card is strictly for adults aged 18 and older. By creating a Face Card or using portrait analysis, you confirm that you are at least 18 years old.
              </p>
            </section>

            <section className="space-y-1">
              <h2 className="text-sm font-bold text-[var(--foreground)]">2. Entertainment &amp; Portrait Craft</h2>
              <p>
                Lethality Scores and Harmony Index metrics evaluate photo craft, lighting, framing, and geometric proportions for entertainment and personal grooming insight. They are not medical, dermatological, or clinical diagnoses.
              </p>
            </section>

            <section className="space-y-1">
              <h2 className="text-sm font-bold text-[var(--foreground)]">3. Points, Tiers &amp; Arena Fairness</h2>
              <p>
                Face Card points have no cash value and cannot be redeemed for fiat currency. Cosmetics redeemed in the Boutique never alter portrait scoring or Arena match outcomes. Automated farming, spoofing, or multi-account abuse may result in account suspension.
              </p>
            </section>

            <section className="space-y-1">
              <h2 className="text-sm font-bold text-[var(--foreground)]">4. Atelier Commerce</h2>
              <p>
                Physical skincare orders in The Atelier are priced in Nigerian Naira (NGN) and fulfilled according to the delivery zone selected at checkout.
              </p>
            </section>
          </div>
        </SurfaceCard>
      </main>
    </div>
  );
}
