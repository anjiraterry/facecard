import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { FaceCard } from '@/components/card/FaceCard';
import { Tier, Band, FaceCardData } from '@/types';
import { ShieldCheck, Sparkles, Swords, ArrowRight, Award, Flame } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const shareCard = await db.shareCard.findFirst({
    where: {
      OR: [{ publicId: id }, { id: id.length === 36 ? id : undefined }],
    },
    include: {
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
  const score = user.scans[0]?.score ?? 84;
  const band = (user.scans[0]?.band as Band) ?? 'DANGEROUS';

  const ogUrl = `/api/og?name=${encodeURIComponent(user.displayName)}&tier=${user.tier}&score=${score}&band=${band}`;

  return {
    title: `${user.displayName}'s Face Card (${user.tier}) | Face Card`,
    description: `Lethality score: ${score}/100 (${band}). Face card never declines. Claim your Facecard today.`,
    openGraph: {
      title: `${user.displayName} • Lethality ${score}/100 • ${user.tier} Tier`,
      description: `Face card never declines. View verified AI Facecard.`,
      images: [
        {
          url: ogUrl,
          width: 1200,
          height: 630,
          alt: `${user.displayName}'s Face Card`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${user.displayName}'s Face Card`,
      description: `Lethality: ${score}/100 (${band}). Claim your Facecard.`,
      images: [ogUrl],
    },
  };
}

export default async function PublicShareCardPage({ params }: Props) {
  const { id } = await params;

  const shareCard = await db.shareCard.findFirst({
    where: {
      OR: [{ publicId: id }, { id: id.length === 36 ? id : undefined }],
    },
    include: {
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
      <div className="min-h-screen bg-[#09090B] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white/[0.04] border border-white/10 space-y-4">
          <Sparkles className="w-10 h-10 text-purple-400 mx-auto" />
          <h1 className="text-xl font-black">Face Card Expired or Not Found</h1>
          <p className="text-sm text-zinc-400">
            This card link may have expired or was removed. You can claim your own verifiable Facecard now.
          </p>
          <Link
            href="/"
            className="block w-full py-3.5 rounded-full bg-white text-black font-bold text-xs hover:bg-zinc-200 transition-all"
          >
            Claim Your Facecard
          </Link>
        </div>
      </div>
    );
  }

  const user = shareCard.user;
  const latestScan = user.scans[0];
  const score = latestScan?.score ?? 84;
  const band = (latestScan?.band as Band) ?? 'DANGEROUS';
  const streakDays = user.streak?.currentCount ?? 1;

  const cardData: FaceCardData = {
    id: user.id,
    tier: user.tier as Tier,
    cardholderName: user.displayName.toUpperCase(),
    title: user.tier === 'BLACK' ? 'Apex Obsidian' : user.tier === 'PLATINUM' ? 'Platinum Elite' : 'Golden Standard',
    score,
    band,
    streakDays,
    multiplier: 1.25,
  };

  return (
    <div className="relative min-h-screen bg-[#09090B] text-white font-sans antialiased flex flex-col items-center justify-between p-6">
      {/* Dynamic Ambient Background */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-30"
        style={{
          background: `
            radial-gradient(ellipse at 50% -10%, rgba(139, 92, 246, 0.25) 0%, transparent 60%),
            radial-gradient(ellipse at 85% 40%, rgba(244, 114, 182, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 15% 70%, rgba(99, 102, 241, 0.15) 0%, transparent 50%)
          `
        }}
      />

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-md flex items-center justify-between pt-2">
        <Link href="/" className="text-sm font-black tracking-widest uppercase text-white/90">
          FACECARD
        </Link>
        <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-white/10 text-white/80 border border-white/15">
          Public Verification
        </span>
      </header>

      {/* Card Presentation */}
      <main className="relative z-10 w-full max-w-md my-auto space-y-6 pt-6 pb-6">
        <div className="text-center space-y-1.5">
          <span className="text-[11px] font-extrabold tracking-widest uppercase text-purple-400">
            OFFICIAL VERIFIED FACECARD
          </span>
          <h1 className="text-2xl font-black tracking-tight text-white">
            {user.displayName}
          </h1>
          <p className="text-xs text-zinc-400">
            Member since {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </p>
        </div>

        {/* 3D Glass Face Card */}
        <div className="shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
          <FaceCard card={cardData} interactive={true} />
        </div>

        {/* Key Card Metrics */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
            <span className="text-[10px] text-zinc-400 block font-semibold">Lethality</span>
            <span className="text-base font-black text-white">{score}/100</span>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
            <span className="text-[10px] text-zinc-400 block font-semibold">Tier</span>
            <span className="text-base font-black text-white">{user.tier}</span>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
            <span className="text-[10px] text-zinc-400 block font-semibold">Streak</span>
            <span className="text-base font-black text-orange-400 flex items-center justify-center gap-1">
              <Flame className="w-3.5 h-3.5 fill-current" />
              {streakDays}d
            </span>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="space-y-3 pt-2">
          <Link
            href="/onboarding"
            className="w-full py-4 px-6 rounded-full bg-white text-[#09090B] hover:bg-zinc-200 text-xs font-black flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(255,255,255,0.15)] transition-all active:scale-95"
          >
            <span>Claim Your Own Face Card</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href={`/faceoff`}
            className="w-full py-3.5 px-6 rounded-full bg-purple-600/30 hover:bg-purple-600/40 text-purple-200 border border-purple-500/40 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Swords className="w-4 h-4 text-purple-300" />
            <span>Challenge {user.displayName.split(' ')[0]} to a Duel</span>
          </Link>
        </div>

        {/* NDPA Zero Raw Image Retention Guarantee */}
        <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 text-center space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>NDPA Compliant Privacy</span>
          </div>
          <p className="text-[10px] text-zinc-400 leading-relaxed">
            Zero raw selfie photos are stored or exposed. Scoring is evaluated ephemeral in-memory via AI Vision.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-[10px] text-zinc-500 pb-2">
        Face card never declines • facecard.app
      </footer>
    </div>
  );
}
