'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mail, ArrowRight, ShieldCheck, AlertCircle, KeyRound, AtSign, Sparkles } from 'lucide-react';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';

export default function SignInPage() {
  const router = useRouter();
  const { sendOtp, loginWithPin } = useAuth();
  
  const [authMethod, setAuthMethod] = useState<'pin' | 'email'>('pin');

  // PIN Login state
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');

  // Email OTP state
  const [email, setEmail] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = identifier.replace(/^@/, '').trim();
    if (!cleanId) {
      setError('Please enter your @username or Facecard number');
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
      {/* Ambient background */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-75 dark:opacity-25"
        style={{
          background: `
            radial-gradient(ellipse at 50% -10%, rgba(244, 114, 182, 0.08) 0%, transparent 55%),
            radial-gradient(ellipse at 85% 35%, rgba(251, 146, 60, 0.06) 0%, transparent 45%),
            radial-gradient(ellipse at 15% 70%, rgba(99, 102, 241, 0.06) 0%, transparent 50%)
          `
        }}
      />

      <main className="relative z-10 max-w-md mx-auto px-5 pt-6 space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between h-10 px-1">
          <Link
            href="/"
            className="w-9 h-9 flex items-center justify-center text-[var(--text-main)] transition-transform active:scale-95"
            title="Back to Landing"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2]" />
          </Link>

          <span className="text-xl font-black tracking-widest uppercase text-[var(--text-main)]">
            FACECARD
          </span>

          <ThemeToggle />
        </header>

        {/* Pitch / Title */}
        <div className="space-y-1.5 text-center pt-2">
          <h1 className="text-2xl font-black tracking-tight text-[var(--text-main)]">
            Access Your Facecard
          </h1>
          <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto leading-relaxed">
            Enter your handle and security PIN to unlock your card.
          </p>
        </div>

        {/* Sign In Card */}
        <div className="p-6 rounded-[28px] bg-white/85 dark:bg-[#140826]/80 backdrop-blur-2xl border border-white/95 dark:border-white/10 shadow-sm space-y-5">
          {/* Method Selector Tabs */}
          <div className="flex p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
            <button
              type="button"
              onClick={() => { setAuthMethod('pin'); setError(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                authMethod === 'pin'
                  ? 'bg-white dark:bg-purple-600 text-[var(--text-main)] dark:text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              PIN Unlock
            </button>
            <button
              type="button"
              onClick={() => { setAuthMethod('email'); setError(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                authMethod === 'email'
                  ? 'bg-white dark:bg-purple-600 text-[var(--text-main)] dark:text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Email Backup
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 border border-rose-200/50">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {authMethod === 'pin' ? (
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block px-1">
                  Username or Card Number
                </label>
                <div className="relative">
                  <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="@username or FC-1234-2026"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/10 text-xs font-semibold text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block px-1">
                  Security PIN
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/10 text-xs font-semibold tracking-widest text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-full bg-[#140826] hover:bg-[#241040] dark:bg-purple-600 dark:hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-[0_8px_24px_rgba(20,8,38,0.3)] disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Unlock Facecard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block px-1">
                  Your Linked Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/10 text-xs font-semibold text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-full bg-[#140826] hover:bg-[#241040] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-[0_8px_24px_rgba(20,8,38,0.3)] disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Send Login Code</span>
                    <ArrowRight className="w-4 h-4 text-white" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="pt-2 text-center border-t border-black/5 dark:border-white/5">
            <span className="text-xs text-[var(--text-muted)]">
              Don&apos;t have a Facecard yet?{' '}
              <Link href="/" className="font-bold text-purple-600 dark:text-purple-400 hover:underline">
                Claim one in 10 seconds →
              </Link>
            </span>
          </div>
        </div>

        {/* Security & NDPA Footnote */}
        <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/5 space-y-1 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[var(--text-muted)]">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>NDPA Biometric Protected</span>
          </div>
          <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
            Your selfies are scored in volatile memory and never retained on any server or disk.
          </p>
        </div>
      </main>
    </div>
  );
}
