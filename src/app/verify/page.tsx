'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, RefreshCw, AlertCircle, Lock } from 'lucide-react';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { useAuth } from '@/hooks/useAuth';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyOtp, sendOtp } = useAuth();

  const emailParam = searchParams.get('email') || '';
  const [email] = useState(() => emailParam || (typeof window !== 'undefined' ? sessionStorage.getItem('fc_auth_email') || '' : ''));
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleDigitChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;

    const newDigits = [...digits];
    newDigits[index] = val.slice(-1);
    setDigits(newDigits);

    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    const fullCode = newDigits.join('');
    if (fullCode.length === 6) {
      submitCode(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasted)) {
      const newDigits = pasted.split('');
      setDigits(newDigits);
      inputRefs.current[5]?.focus();
      submitCode(pasted);
    }
  };

  const submitCode = async (code: string) => {
    if (!email) {
      setError('Email address is missing. Please start from sign-in.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await verifyOtp(email, code);
      if (res.isNewUser) {
        router.push('/onboarding');
      } else {
        router.push('/home');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid 6-digit code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !email) return;
    setIsLoading(true);
    setError(null);
    try {
      await sendOtp(email);
      setResendCooldown(60);
    } catch {
      setError('Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] font-sans antialiased pb-20">
      <main className="relative z-10 max-w-md mx-auto px-5 pt-6 space-y-6">
        <header className="flex items-center justify-between h-10 px-1">
          <Link
            href="/sign-in"
            aria-label="Back to sign in"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-main)] hover:bg-[var(--bg-surface-warm)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5 stroke-[1.8]" />
          </Link>

          <span className="font-display text-xl font-semibold tracking-tight text-[var(--text-main)]">
            Verify
          </span>

          <ThemeToggle />
        </header>

        <div className="space-y-1.5 text-center pt-2">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--text-main)]">
            Check your inbox
          </h1>
          <p className="text-xs text-[var(--text-muted)]">
            We sent a 6-digit verification code to{' '}
            <span className="font-semibold text-[var(--text-main)]">{email || 'your email'}</span>
          </p>
        </div>

        <SurfaceCard variant="default" padding="md" className="space-y-5">
          {error && (
            <div
              role="alert"
              className="p-3 rounded-2xl bg-[var(--status-danger-bg)] text-[var(--status-danger)] text-xs font-medium flex items-center gap-2 border border-[var(--status-danger)]/25"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-between gap-2" onPaste={handlePaste}>
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => { inputRefs.current[idx] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                aria-label={`Verification digit ${idx + 1}`}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-12 h-14 rounded-2xl bg-[var(--bg-surface-warm)] border border-[var(--border-card)] text-center text-xl font-bold tabular-nums text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-brand)] focus:bg-[var(--bg-surface)] transition-colors"
              />
            ))}
          </div>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
            disabled={digits.join('').length < 6}
            onClick={() => submitCode(digits.join(''))}
          >
            <span>{isLoading ? 'Verifying Code...' : 'Verify & Enter'}</span>
          </Button>

          <div className="flex items-center justify-between text-xs px-1 text-[var(--text-muted)]">
            <span>Didn&apos;t receive a code?</span>
            {resendCooldown > 0 ? (
              <span className="text-[11px] font-semibold tabular-nums">Resend in {resendCooldown}s</span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={isLoading}
                className="font-semibold text-[var(--text-main)] underline underline-offset-4 hover:text-[var(--accent-brand)] flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Resend Now</span>
              </button>
            )}
          </div>
        </SurfaceCard>

        <div className="flex items-center justify-center gap-1.5 text-xs text-[var(--text-muted)] pt-2">
          <Lock className="w-4 h-4 text-[var(--status-success)]" />
          <span>Encrypted Session · Zero Photo Retention</span>
        </div>
      </main>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg-page)]" />}>
      <VerifyContent />
    </Suspense>
  );
}
