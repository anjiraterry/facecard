import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { Swords, Coins, Flame, ArrowLeft, ArrowRight, ShieldCheck, Trophy } from 'lucide-react';
import { FaceCard } from '@/components/card/FaceCard';
import { Tier, Band } from '@/types';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const duel = await db.faceOff.findUnique({
    where: { inviteCode: code.toUpperCase() },
    include: {
      challenger: true,
    },
  });

  if (!duel) {
    return {
      title: 'Duel Not Found | Face Card Arena',
      description: 'Duel challenge not found or expired.',
    };
  }

  return {
    title: `Challenge from ${duel.challenger.displayName} | Face Card Arena`,
    description: `You've been challenged to a ${duel.mode === 'STAKED' ? `${duel.stake} PTS Staked` : 'Friendly'} duel! Prove your facial lethality now.`,
  };
}

export default async function ArenaInvitePage({ params }: Props) {
  const { code } = await params;

  const duel = await db.faceOff.findUnique({
    where: { inviteCode: code.toUpperCase() },
    include: {
      challenger: {
        include: {
          streak: true,
          scans: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      },
      opponent: true,
    },
  });

  if (!duel) {
    return (
      <div className="min-h-screen bg-[#0E081A] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white/[0.04] border border-white/10 space-y-4">
          <Swords className="w-10 h-10 text-purple-400 mx-auto" />
          <h1 className="text-xl font-black">Duel Challenge Expired</h1>
          <p className="text-sm text-zinc-400">
            This invite link is no longer valid or has already been completed.
          </p>
          <Link
            href="/faceoff"
            className="block w-full py-3.5 rounded-full bg-white text-black font-bold text-xs hover:bg-zinc-200 transition-all"
          >
            Enter Arena
          </Link>
        </div>
      </div>
    );
  }

  const challenger = duel.challenger;
  const latestScan = challenger.scans[0];
  const score = latestScan?.score ?? 84;
  const band = (latestScan?.band as Band) ?? 'DANGEROUS';
  const streakDays = challenger.streak?.currentCount ?? 1;

  const cardData = {
    id: challenger.id,
    tier: challenger.tier as Tier,
    cardholderName: challenger.displayName.toUpperCase(),
    title: challenger.tier === 'BLACK' ? 'Apex Obsidian' : challenger.tier === 'PLATINUM' ? 'Platinum Elite' : 'Golden Standard',
    score,
    band,
    streakDays,
    multiplier: 1.25,
  };

  return (
    <div className="relative min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] font-sans antialiased flex flex-col justify-between p-5 pb-12">
      {/* Dynamic Ambient Background */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-75 dark:opacity-25"
        style={{
          background: `
            radial-gradient(ellipse at 50% -10%, rgba(244, 114, 182, 0.06) 0%, transparent 55%),
            radial-gradient(ellipse at 85% 35%, rgba(251, 146, 60, 0.05) 0%, transparent 45%),
            radial-gradient(ellipse at 15% 70%, rgba(99, 102, 241, 0.04) 0%, transparent 50%)
          `
        }}
      />

      {/* Top Header */}
      <header className="relative z-10 max-w-md w-full mx-auto flex items-center justify-between pt-2">
        <Link href="/faceoff" className="text-xs font-bold flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-main)]">
          <ArrowLeft className="w-4 h-4" />
          <span>Arena</span>
        </Link>
        <span className="font-mono text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20">
          CODE: {duel.inviteCode}
        </span>
      </header>

      {/* Main Duel Invite Card */}
      <main className="relative z-10 max-w-md w-full mx-auto my-auto space-y-6 pt-4 pb-4">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/40 text-[#140826] dark:text-purple-200 mx-auto flex items-center justify-center shadow-sm">
            <Swords className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400 block">
            ARENA DUEL CHALLENGE
          </span>
          <h1 className="text-2xl font-black tracking-tight text-[var(--text-main)]">
            {challenger.displayName} is Calling You Out
          </h1>
          <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto">
            {duel.mode === 'STAKED'
              ? `Staked Duel with ${duel.stake} PTS on the line. Winner takes the ${duel.stake * 2} PTS pot (+25 PTS bonus).`
              : 'Friendly exhibition match. Zero risk, pure bragging rights.'}
          </p>
        </div>

        {/* Challenger Face Card Display */}
        <div className="shadow-lg">
          <FaceCard card={cardData} interactive={true} />
        </div>

        {/* Duel Stakes Summary Box */}
        <div className="p-4 rounded-2xl bg-white/80 dark:bg-[#140826]/80 backdrop-blur-xl border border-black/[0.05] dark:border-white/10 space-y-3 shadow-xs">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--text-muted)] font-medium">Battle Mode:</span>
            <span className="font-bold text-[var(--text-main)] flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-purple-500" />
              {duel.mode === 'STAKED' ? 'Staked Arena Match' : 'Friendly Duel'}
            </span>
          </div>

          {duel.mode === 'STAKED' && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--text-muted)] font-medium">Required Stake:</span>
              <span className="font-mono font-black text-[#6366F1]">
                {duel.stake} PTS each
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--text-muted)] font-medium">Status:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {duel.status === 'WAITING' ? 'Open for Challenger' : duel.status}
            </span>
          </div>
        </div>

        {/* Acceptance CTAs */}
        <div className="space-y-2.5">
          <Link
            href={`/faceoff?duel=${duel.inviteCode}`}
            className="w-full py-4 px-6 rounded-full bg-[#140826] hover:bg-[#251040] text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg border border-purple-400/30 transition-all active:scale-95"
          >
            <Swords className="w-4 h-4 text-white" />
            <span>Accept Duel & Enter Arena</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>

          <Link
            href="/faceoff"
            className="w-full py-3 px-6 rounded-full bg-black/5 dark:bg-white/10 text-[var(--text-main)] text-xs font-semibold flex items-center justify-center transition-colors hover:bg-black/10 dark:hover:bg-white/15"
          >
            Browse Other Duels
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center text-[10px] text-[var(--text-muted)]">
        Face card never declines • Arena Duels
      </footer>
    </div>
  );
}
