'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Check, RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyOtp, sendOtp } = useAuth();

  const emailParam = searchParams.get('email') || '';
  const [email, setEmail] = useState(emailParam);
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email && typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('fc_auth_email');
      if (stored) setEmail(stored);
    }
  }, [email]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Handle digit typing & auto-advance
  const handleDigitChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;

    const newDigits = [...digits];
    newDigits[index] = val.slice(-1);
    setDigits(newDigits);

    // Auto-advance
    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
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

  // Clipboard paste support
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
    } catch (err: unknown) {
      setError('Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] font-sans antialiased pb-20">
      <main className="relative z-10 max-w-md mx-auto px-5 pt-6 space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between h-10 px-1">
          <Link
            href="/sign-in"
            className="w-9 h-9 flex items-center justify-center text-[var(--text-main)] transition-transform active:scale-95"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2]" />
          </Link>

          <span className="text-xl font-bold tracking-tight text-[var(--text-main)]">
            verify
          </span>

          <ThemeToggle />
        </header>

        {/* Title */}
        <div className="space-y-1.5 text-center pt-3">
          <h1 className="text-2xl font-black tracking-tight text-[var(--text-main)]">
            Check your inbox
          </h1>
          <p className="text-xs text-[var(--text-muted)]">
            We sent a 6-digit verification code to <span className="font-bold text-[var(--text-main)]">{email || 'your email'}</span>
          </p>
        </div>

        {/* 6-Digit Form */}
        <div className="p-5 rounded-[28px] bg-white/85 dark:bg-[#140826]/80 backdrop-blur-2xl border border-white/95 dark:border-white/10 shadow-sm space-y-5">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 border border-rose-200/50">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Digits row */}
          <div className="flex justify-between gap-2" onPaste={handlePaste}>
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => { inputRefs.current[idx] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-12 h-14 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/10 text-center font-mono text-xl font-bold text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
              />
            ))}
          </div>

          <button
            onClick={() => submitCode(digits.join(''))}
            disabled={isLoading || digits.join('').length < 6}
            className="w-full py-3.5 rounded-full bg-[#140826] hover:bg-[#241040] text-white text-xs font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-[0_8px_24px_rgba(20,8,38,0.3)] disabled:opacity-50"
          >
            <span>{isLoading ? 'Verifying Code...' : 'Verify & Enter'}</span>
          </button>

          <div className="flex items-center justify-between text-xs px-1 text-[var(--text-muted)]">
            <span>Didn't receive code?</span>
            {resendCooldown > 0 ? (
              <span className="font-mono text-[11px] font-bold">Resend in {resendCooldown}s</span>
            ) : (
              <button
                onClick={handleResend}
                disabled={isLoading}
                className="font-bold text-[#7C3AED] hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Resend Now</span>
              </button>
            )}
          </div>
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-[var(--text-muted)] pt-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Encrypted Session • Zero Data Retention</span>
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
