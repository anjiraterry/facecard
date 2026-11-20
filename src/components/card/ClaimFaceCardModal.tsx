'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, KeyRound, User, AtSign, AlertCircle } from 'lucide-react';
import { FaceCard } from '@/components/card/FaceCard';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/common/ToastProvider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FaceCardData } from '@/types';

export interface ClaimFaceCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'claim' | 'login';
}

export function ClaimFaceCardModal({ isOpen, onClose, defaultMode = 'claim' }: ClaimFaceCardModalProps) {
  const router = useRouter();
  const { claimFacecard, loginWithPin } = useAuth();
  const { toast } = useToast();

  const [mode, setMode] = useState<'claim' | 'login'>(defaultMode);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(defaultMode);
      setError(null);
    }
  }, [isOpen, defaultMode]);

  const maxAdultDob = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d.toISOString().split('T')[0];
  })();

  // Claim fields
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [dob, setDob] = useState('');
  const [pin, setPin] = useState('');
  const [consentChecked, setConsentChecked] = useState(false);

  // Login fields
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPin, setLoginPin] = useState('');

  const cleanHandle = handle.replace(/^@/, '').toLowerCase().trim();
  const previewCard: FaceCardData = {
    id: 'claim-preview',
    tier: 'CLASSIC',
    cardholderName: displayName.trim() || 'Your Name',
    handle: cleanHandle || 'username',
    title: 'Classic Satin',
    score: 0,
    band: 'HARMLESS',
    streakDays: 1,
    multiplier: 1.0,
    cardNumber: 'FC •••• 2026',
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!displayName.trim() || displayName.trim().length < 2) {
      const msg = 'Please enter your full name (at least 2 characters).';
      setError(msg);
      toast.warning(msg);
      return;
    }

    if (!cleanHandle || !/^[a-z0-9_]{3,20}$/.test(cleanHandle)) {
      const msg = 'Username must be 3–20 letters, numbers, or underscores.';
      setError(msg);
      toast.warning(msg);
      return;
    }

    if (!/^\d{4,6}$/.test(pin.trim())) {
      const msg = 'Please set a 4 to 6 digit security PIN.';
      setError(msg);
      toast.warning(msg);
      return;
    }

    if (!dob) {
      const msg = 'Please enter your date of birth.';
      setError(msg);
      toast.warning(msg);
      return;
    }

    const birthDate = new Date(`${dob}T00:00:00Z`);
    const today = new Date();
    let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
    const monthDiff = today.getUTCMonth() - birthDate.getUTCMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < birthDate.getUTCDate())) {
      age -= 1;
    }
    if (Number.isNaN(age) || age < 18) {
      const msg = 'You must be at least 18 years old to use Face Card.';
      setError(msg);
      toast.warning(msg);
      return;
    }

    if (!consentChecked) {
      const msg = 'Please confirm 18+ age verification and biometric portrait consent.';
      setError(msg);
      toast.warning(msg);
      return;
    }

    setIsLoading(true);
    try {
      await claimFacecard({
        displayName: displayName.trim(),
        handle: cleanHandle,
        pin: pin.trim(),
        dob,
        ageConfirmed: true,
        termsAccepted: true,
        biometricConsent: true,
      });
      toast.success(`Face Card claimed! Welcome, @${cleanHandle}`);
      onClose();
      router.push('/home');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to claim Face Card';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanId = loginIdentifier.replace(/^@/, '').trim();
    if (!cleanId) {
      const msg = 'Enter your @username.';
      setError(msg);
      toast.warning(msg);
      return;
    }

    if (!/^\d{4,6}$/.test(loginPin.trim())) {
      const msg = 'Enter your 4 to 6 digit PIN.';
      setError(msg);
      toast.warning(msg);
      return;
    }

    setIsLoading(true);
    try {
      await loginWithPin(cleanId, loginPin.trim());
      toast.success('Signed in successfully. Welcome back.');
      onClose();
      router.push('/home');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'claim' ? 'Claim your Face Card' : 'Sign in with PIN'}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#251E24]/50 backdrop-blur-xs"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative z-10 w-full max-w-md bg-[var(--bg-surface)] text-[var(--text-main)] rounded-[28px] border border-[var(--border-card)] shadow-[var(--shadow-modal)] overflow-hidden my-auto"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[var(--bg-surface-warm)] hover:bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors z-20 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-5 sm:p-6 space-y-5">
            <div className="flex items-center gap-1.5 p-1 rounded-full bg-[var(--bg-surface-warm)] border border-[var(--border-subtle)] mr-10">
              <button
                type="button"
                onClick={() => { setMode('claim'); setError(null); }}
                className={`flex-1 py-2 text-xs font-semibold rounded-full transition-colors cursor-pointer ${
                  mode === 'claim'
                    ? 'bg-[var(--accent-primary)] text-[var(--bg-page)] shadow-[var(--shadow-sm)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                Claim Face Card
              </button>
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); }}
                className={`flex-1 py-2 text-xs font-semibold rounded-full transition-colors cursor-pointer ${
                  mode === 'login'
                    ? 'bg-[var(--accent-primary)] text-[var(--bg-page)] shadow-[var(--shadow-sm)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                Access with PIN
              </button>
            </div>

            {error && (
              <div
                role="alert"
                className="p-3.5 rounded-2xl bg-[var(--status-danger-bg)] border border-[var(--status-danger)]/25 text-[var(--status-danger)] text-xs font-medium flex items-center gap-2.5"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {mode === 'claim' ? (
              <div className="space-y-4">
                <div className="w-full">
                  <FaceCard card={previewCard} interactive={true} />
                </div>
                <div className="text-center">
                  <span className="text-xs font-semibold text-[var(--text-main)]">
                    Live Preview · {cleanHandle ? `@${cleanHandle}` : '@handle'}
                  </span>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    Includes 100 LP starter balance
                  </p>
                </div>

                <form onSubmit={handleClaimSubmit} className="space-y-3.5 w-full">
                  <Input
                    label="Full Name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Amara Okafor"
                    maxLength={40}
                    required
                    leftIcon={<User className="w-4 h-4" />}
                  />

                  <Input
                    label="Username"
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                    placeholder="username"
                    maxLength={20}
                    required
                    leftIcon={<AtSign className="w-4 h-4" />}
                  />

                  <Input
                    label="Date of Birth (18+)"
                    type="date"
                    max={maxAdultDob}
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    required
                  />

                  <Input
                    label="Security PIN (4–6 Digits)"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    required
                    className="tracking-widest"
                    helperText="Used to unlock your Face Card anytime."
                    leftIcon={<KeyRound className="w-4 h-4" />}
                  />

                  <label className="flex items-start gap-2.5 text-[11px] text-[var(--text-muted)] leading-relaxed cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consentChecked}
                      onChange={(e) => setConsentChecked(e.target.checked)}
                      className="mt-0.5 rounded border-[var(--border)]"
                      required
                    />
                    <span>
                      I confirm I am 18+ and consent to biometric portrait processing and the Face Card Terms &amp; Privacy Policy.
                    </span>
                  </label>

                  <Button type="submit" variant="primary" size="lg" fullWidth isLoading={isLoading}>
                    Claim Your Face Card
                  </Button>
                </form>
              </div>
            ) : (
              <form onSubmit={handleLoginSubmit} className="space-y-4 py-1">
                <Input
                  label="Username"
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="@username"
                  required
                  leftIcon={<AtSign className="w-4 h-4" />}
                />

                <Input
                  label="4–6 Digit Security PIN"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={loginPin}
                  onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  required
                  className="tracking-widest"
                  leftIcon={<KeyRound className="w-4 h-4" />}
                />

                <Button type="submit" variant="primary" size="lg" fullWidth isLoading={isLoading}>
                  Unlock Face Card
                </Button>
              </form>
            )}

            <p className="text-center text-[11px] text-[var(--text-muted)] pt-1">
              Email is optional · You can link an email anytime later for backup.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
