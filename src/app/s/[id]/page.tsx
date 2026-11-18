import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@/lib/db';
import { FaceCard } from '@/components/card/FaceCard';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { Tier, Band, FaceCardData } from '@/types';
import { Lock, Layers, Swords, ArrowRight, Flame } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const shareCard = await db.shareCard.findFirst({
    where: {
      OR: [{ publicId: id }, ...(id.length === 36 ? [{ id }] : [])],
      deletedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      snapshot: true,
      user: {
        include: {
          scans: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      },
    },
  });

  if (!shareCard || !shareCard.user) {
    return {
      title: 'Face Card Not Found',
      description: 'The requested Face Card does not exist or has expired.',
    };
  }

  const user = shareCard.user;
  const snap = shareCard.snapshot;
  const displayName = snap?.cardholderName ?? user.displayName;
  const tier = snap?.tier ?? user.tier;
  const score = snap?.score ?? user.scans[0]?.score ?? 84;
  const band = ((snap?.band ?? user.scans[0]?.band) as Band) ?? 'DANGEROUS';
  const ogUrl = `/api/og?name=${encodeURIComponent(displayName)}&tier=${tier}&score=${score}&band=${band}`;

  return {
    title: `${displayName}'s Face Card (${tier}) | Face Card`,
    description: `Harmony Index: ${score}/100. Face card never declines.`,
    openGraph: {
      title: `${displayName} · Index ${score}/100 · ${tier} Edition`,
      description: 'Face card never declines. View verified Face Card.',
      images: [{ url: ogUrl, width: 1200, height: 630, alt: `${displayName}'s Face Card` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${displayName}'s Face Card`,
      description: `Index: ${score}/100. Claim your Face Card.`,
      images: [ogUrl],
    },
  };
}

export default async function PublicShareCardPage({ params }: Props) {
  const { id } = await params;

  const shareCard = await db.shareCard.findFirst({
    where: {
      OR: [{ publicId: id }, ...(id.length === 36 ? [{ id }] : [])],
      deletedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      snapshot: true,
      user: {
        include: {
          cards: true,
          streak: true,
          scans: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      },
    },
  });

  if (!shareCard || !shareCard.user) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] flex flex-col items-center justify-center p-6 text-center">
        <SurfaceCard variant="default" padding="lg" className="max-w-md w-full space-y-4">
          <Layers className="w-10 h-10 text-[var(--accent-brand)] mx-auto" />
          <h1 className="font-display text-2xl font-semibold">Face Card Not Found</h1>
          <p className="text-xs text-[var(--text-muted)]">
            This card link may have expired or been removed. You can claim your own Face Card anytime.
          </p>
          <Link
            href="/"
            className="block w-full py-3 rounded-full bg-[var(--accent-primary)] text-[var(--bg-page)] font-semibold text-xs hover:bg-[var(--accent-primary-hover)] transition-colors"
          >
            Claim Your Face Card
          </Link>
        </SurfaceCard>
      </div>
    );
  }

  const user = shareCard.user;
  const snap = shareCard.snapshot;
  const latestScan = user.scans[0];
  const score = snap?.score ?? latestScan?.score ?? 84;
  const band = ((snap?.band ?? latestScan?.band) as Band) ?? 'DANGEROUS';
  const streakDays = snap?.streakDays ?? user.streak?.currentCount ?? 1;
  const tier = (snap?.tier ?? user.tier) as Tier;

  const cardData: FaceCardData = {
    id: snap?.cardId ?? user.id,
    tier,
    cardholderName: snap?.cardholderName ?? user.displayName,
    title:
      snap?.title ??
      (tier === 'BLACK'
        ? 'Velvet Matte'
        : tier === 'PLATINUM'
        ? 'Pearlescent'
        : 'Brushed Gold'),
    score,
    band,
    streakDays,
    multiplier: snap?.multiplier ?? 1.25,
  };

  return (
    <div className="relative min-h-screen bg-[#251E24] text-[#FAF7F4] font-sans antialiased flex flex-col items-center justify-between p-6">
      <header className="relative z-10 w-full max-w-md flex items-center justify-between pt-2">
        <Link href="/" className="font-sans text-base font-extrabold tracking-[-0.03em] lowercase text-[#FAF7F4]">
          facecard
        </Link>
        <span className="px-3 py-1 rounded-full text-[10px] font-semibold bg-[#FAF7F4]/10 text-[#EBDCD5] border border-[#EBDCD5]/20">
          Public Verification
        </span>
      </header>

      <main className="relative z-10 w-full max-w-md my-auto space-y-6 py-6">
        <div className="text-center space-y-1.5">
          <span className="text-[10px] font-semibold tracking-[0.16em] uppercase text-[#D2B8C9]">
            Official Face Card
          </span>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-[#FAF7F4]">
            {user.displayName}
          </h1>
          <p className="text-xs text-[#EBDCD5]/70">
            Member since {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </p>
        </div>

        <FaceCard card={cardData} interactive={true} />

        <div className="grid grid-cols-3 gap-2.5 tabular-nums">
          <div className="p-3 rounded-2xl bg-[#FAF7F4]/5 border border-[#EBDCD5]/15 text-center">
            <span className="text-[10px] text-[#EBDCD5]/70 block font-medium">Harmony</span>
            <span className="text-base font-bold text-[#FAF7F4]">{score}/100</span>
          </div>
          <div className="p-3 rounded-2xl bg-[#FAF7F4]/5 border border-[#EBDCD5]/15 text-center">
            <span className="text-[10px] text-[#EBDCD5]/70 block font-medium">Edition</span>
            <span className="text-base font-bold text-[#FAF7F4]">{user.tier}</span>
          </div>
          <div className="p-3 rounded-2xl bg-[#FAF7F4]/5 border border-[#EBDCD5]/15 text-center">
            <span className="text-[10px] text-[#EBDCD5]/70 block font-medium">Streak</span>
            <span className="text-base font-bold text-[#D2B8C9] flex items-center justify-center gap-1">
              <Flame className="w-3.5 h-3.5" />
              {streakDays}d
            </span>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <Link
            href="/onboarding"
            className="w-full py-3.5 px-6 rounded-full bg-[#FAF7F4] text-[#251E24] hover:bg-[#EBDCD5] text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <span>Claim Your Own Face Card</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/faceoff"
            className="w-full py-3.5 px-6 rounded-full bg-[#FAF7F4]/10 hover:bg-[#FAF7F4]/15 text-[#FAF7F4] border border-[#EBDCD5]/20 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Swords className="w-4 h-4" />
            <span>Challenge {user.displayName.split(' ')[0]} in Arena</span>
          </Link>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#FAF7F4]/5 border border-[#EBDCD5]/15 text-center space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[#78B894]">
            <Lock className="w-3.5 h-3.5" />
            <span>NDPA Compliant Privacy</span>
          </div>
          <p className="text-[10px] text-[#EBDCD5]/70 leading-relaxed">
            Zero raw selfie photos are stored or exposed. Evaluated in ephemeral memory only.
          </p>
        </div>
      </main>

      <footer className="relative z-10 text-[11px] text-[#EBDCD5]/60 pb-2">
        Face card never declines · facecard.app
      </footer>
    </div>
  );
}
