import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@/lib/db';
import { Swords, ArrowLeft, ArrowRight, Trophy } from 'lucide-react';
import { FaceCard } from '@/components/card/FaceCard';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { Tier, Band } from '@/types';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const duel = await db.faceOff.findUnique({
    where: { inviteCode: code.toUpperCase() },
    include: { challenger: true },
  });

  if (!duel) {
    return {
      title: 'Duel Not Found | Face Card Arena',
      description: 'Duel challenge not found or expired.',
    };
  }

  return {
    title: `Challenge from ${duel.challenger.displayName} | Face Card Arena`,
    description: `You have been invited to a ${duel.mode === 'STAKED' ? `${duel.stake} PTS Staked` : 'Friendly'} portrait duel.`,
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
      <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] flex flex-col items-center justify-center p-6 text-center">
        <SurfaceCard variant="default" padding="lg" className="max-w-md w-full space-y-4">
          <Swords className="w-10 h-10 text-[var(--accent-brand)] mx-auto" />
          <h1 className="font-display text-2xl font-semibold">Duel Challenge Expired</h1>
          <p className="text-xs text-[var(--text-muted)]">
            This invite link is no longer valid or has already been completed.
          </p>
          <Link
            href="/faceoff"
            className="block w-full py-3 rounded-full bg-[var(--accent-primary)] text-[var(--bg-page)] font-semibold text-xs hover:bg-[var(--accent-primary-hover)] transition-colors"
          >
            Enter Arena
          </Link>
        </SurfaceCard>
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
    cardholderName: challenger.displayName,
    title:
      challenger.tier === 'BLACK'
        ? 'Velvet Matte'
        : challenger.tier === 'PLATINUM'
        ? 'Pearlescent'
        : 'Brushed Gold',
    score,
    band,
    streakDays,
    multiplier: 1.25,
  };

  return (
    <div className="relative min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] font-sans antialiased flex flex-col justify-between p-5 pb-12">
      <header className="relative z-10 max-w-md w-full mx-auto flex items-center justify-between pt-2">
        <Link href="/faceoff" className="text-xs font-semibold flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-main)]">
          <ArrowLeft className="w-4 h-4" />
          <span>Arena</span>
        </Link>
        <span className="text-xs font-semibold uppercase tracking-[0.1em] px-3 py-1 rounded-full bg-[var(--bg-surface-warm)] text-[var(--text-main)] border border-[var(--border-card)] tabular-nums">
          Code: {duel.inviteCode}
        </span>
      </header>

      <main className="relative z-10 max-w-md w-full mx-auto my-auto space-y-6 py-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[var(--bg-surface-warm)] border border-[var(--border-card)] text-[var(--accent-brand)] mx-auto flex items-center justify-center">
            <Swords className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-brand)] block">
            Arena Duel Invitation
          </span>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--text-main)]">
            {challenger.displayName} Invited You
          </h1>
          <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto leading-relaxed">
            {duel.mode === 'STAKED'
              ? `Staked match with ${duel.stake} PTS on the line. Winner takes the ${duel.stake * 2} PTS pot.`
              : 'Friendly exhibition match — zero stakes, pure portrait craft.'}
          </p>
        </div>

        <FaceCard card={cardData} interactive={true} />

        <SurfaceCard variant="default" padding="sm" className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--text-muted)]">Match Mode</span>
            <span className="font-semibold text-[var(--text-main)] flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-[var(--accent-brand)]" />
              {duel.mode === 'STAKED' ? 'Staked Arena Match' : 'Friendly Duel'}
            </span>
          </div>

          {duel.mode === 'STAKED' && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--text-muted)]">Entry Stake</span>
              <span className="font-bold text-[var(--text-main)] tabular-nums">{duel.stake} PTS each</span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--text-muted)]">Status</span>
            <span className="font-semibold text-[var(--status-success)]">
              {duel.status === 'WAITING' ? 'Open for Challenger' : duel.status}
            </span>
          </div>
        </SurfaceCard>

        <div className="space-y-2.5">
          <Link
            href={`/faceoff?duel=${duel.inviteCode}`}
            className="w-full py-3.5 px-6 rounded-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--bg-page)] text-xs font-semibold flex items-center justify-center gap-2 shadow-[var(--shadow-sm)] transition-colors"
          >
            <Swords className="w-4 h-4" />
            <span>Accept Duel &amp; Enter Arena</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/faceoff"
            className="w-full py-3 px-6 rounded-full bg-[var(--bg-surface-warm)] text-[var(--text-main)] border border-[var(--border-card)] text-xs font-semibold flex items-center justify-center hover:bg-[var(--bg-secondary)] transition-colors"
          >
            Browse Other Duels
          </Link>
        </div>
      </main>

      <footer className="relative z-10 text-center text-[11px] text-[var(--text-muted)]">
        Face card never declines · Arena Duels
      </footer>
    </div>
  );
}
