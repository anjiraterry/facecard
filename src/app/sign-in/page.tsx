'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mail, ArrowRight, Lock, AlertCircle, KeyRound, AtSign } from 'lucide-react';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { useAuth } from '@/hooks/useAuth';

export default function SignInPage() {
  const router = useRouter();
  const { sendOtp, loginWithPin } = useAuth();

  const [authMethod, setAuthMethod] = useState<'pin' | 'email'>('pin');
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = identifier.replace(/^@/, '').trim();
    if (!cleanId) {
      setError('Please enter your @username or Face Card number');
      return;
    }
    if (!/^\d{4,6}$/.test(pin.trim())) {
      setError('Please enter your 4 to 6 digit security PIN');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await loginWithPin(cleanId, pin.trim());
      router.push('/home');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    const disposableDomains = ['tempmail.com', '10minutemail.com', 'guerrillamail.com', 'mailinator.com'];
    const domain = email.split('@')[1]?.toLowerCase();
    if (disposableDomains.includes(domain)) {
      setError('Disposable email addresses are not permitted.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await sendOtp(email);
      sessionStorage.setItem('fc_auth_email', email);
      router.push(`/verify?email=${encodeURIComponent(email)}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] font-sans antialiased pb-20">
      <main className="relative z-10 max-w-md mx-auto px-5 pt-6 space-y-6">
        <header className="flex items-center justify-between h-10 px-1">
          <Link
            href="/"
            aria-label="Back to landing page"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-main)] hover:bg-[var(--bg-surface-warm)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5 stroke-[1.8]" />
          </Link>

          <span className="font-sans text-lg font-extrabold tracking-[-0.03em] lowercase text-[var(--text-main)]">
            facecard
          </span>

          <ThemeToggle />
        </header>

        <div className="space-y-1.5 text-center pt-2">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--text-main)]">
            Access Your Card
          </h1>
          <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto leading-relaxed">
            Enter your handle and security PIN, or recover access via your linked email.
          </p>
        </div>

        <SurfaceCard variant="default" padding="md" className="space-y-5">
          <div className="flex p-1 rounded-full bg-[var(--bg-surface-warm)] border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => { setAuthMethod('pin'); setError(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-full transition-colors cursor-pointer ${
                authMethod === 'pin'
                  ? 'bg-[var(--accent-primary)] text-[var(--bg-page)] shadow-[var(--shadow-sm)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              PIN Unlock
            </button>
            <button
              type="button"
              onClick={() => { setAuthMethod('email'); setError(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-full transition-colors cursor-pointer ${
                authMethod === 'email'
                  ? 'bg-[var(--accent-primary)] text-[var(--bg-page)] shadow-[var(--shadow-sm)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Email Recovery
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="p-3 rounded-2xl bg-[var(--status-danger-bg)] text-[var(--status-danger)] text-xs font-medium flex items-center gap-2 border border-[var(--status-danger)]/25"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {authMethod === 'pin' ? (
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <Input
                label="Username or Card Number"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="@username or FC-1234-2026"
                required
                leftIcon={<AtSign className="w-4 h-4" />}
              />

              <Input
                label="Security PIN"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                required
                className="tracking-widest"
                leftIcon={<KeyRound className="w-4 h-4" />}
              />

              <Button type="submit" variant="primary" size="lg" fullWidth isLoading={isLoading}>
                Unlock Face Card
              </Button>
            </form>
          ) : (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <Input
                label="Your Linked Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                leftIcon={<Mail className="w-4 h-4" />}
              />

              <Button type="submit" variant="primary" size="lg" fullWidth isLoading={isLoading}>
                Send Login Code
              </Button>
            </form>
          )}

          <div className="pt-3 text-center border-t border-[var(--border-subtle)]">
            <span className="text-xs text-[var(--text-muted)]">
              New to Face Card?{' '}
              <Link href="/" className="font-semibold text-[var(--text-main)] underline underline-offset-4 hover:text-[var(--accent-brand)]">
                Claim one in seconds
              </Link>
            </span>
          </div>
        </SurfaceCard>

        <SurfaceCard variant="warm" padding="sm" className="text-center space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)]">
            <Lock className="w-4 h-4 text-[var(--status-success)]" />
            <span>NDPA Privacy Protected</span>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
            Selfies are evaluated in ephemeral memory and never retained on disk.
          </p>
        </SurfaceCard>
      </main>
    </div>
  );
}
