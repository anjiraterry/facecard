'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Camera, 
  RefreshCw, 
  Zap, 
  Swords, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Share2,
  Layers
} from 'lucide-react';
import { FaceCard } from '@/components/card/FaceCard';
import { ShareCardModal } from '@/components/card/ShareCardModal';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Tier, FaceCardData, CategoryBreakdown } from '@/types';
import { scanService } from '@/services/scanService';
import { faceoffService } from '@/services/faceoffService';
import { useToast } from '@/components/common/ToastProvider';
import { LivenessOverlay } from '@/components/camera/LivenessOverlay';
import { LivenessActionType } from '@/lib/vision/liveness';
import { PageHeader } from '@/components/ui/PageHeader';

type ScanPhase = 'CAMERA' | 'CAPTURED' | 'ANALYZING' | 'RESULT';

function ScanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const duelId = searchParams.get('duelId') || searchParams.get('faceOffId');
  const [duelStatus, setDuelStatus] = useState<string | null>(null);

  useEffect(() => {
    if (duelId) {
      faceoffService.getDuelById(duelId)
        .then((res) => {
          if (res.success && res.duel) {
            setDuelStatus(res.duel.status);
          }
        })
        .catch(() => {});
    }
  }, [duelId]);

  const [phase, setPhase] = useState<ScanPhase>('CAMERA');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analyzingStep, setAnalyzingStep] = useState(0);

  // Result state from real backend API
  const [resultCard, setResultCard] = useState<FaceCardData | null>(null);
  const [breakdown, setBreakdown] = useState<CategoryBreakdown | null>(null);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [verdictLine, setVerdictLine] = useState('');
  const [tips, setTips] = useState<string[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [livenessData, setLivenessData] = useState<{ passed: boolean; actionsCompleted: string[] } | null>(null);
  const [livenessResult, setLivenessResult] = useState<{ verified: boolean; actions: string[] } | null>(null);
  const [duelResult, setDuelResult] = useState<{
    duelId: string;
    attemptNumber: number;
    attemptsRemaining: number;
    status: string;
    outcome?: 'WIN' | 'LOSS' | 'TIE' | 'PENDING';
    payout?: number;
    winnerId?: string | null;
    isWinner?: boolean;
    challengerScore?: number;
    opponentScore?: number;
  } | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSettingAvatar, setIsSettingAvatar] = useState(false);
  const [avatarSaved, setAvatarSaved] = useState(false);
  const { showToast } = useToast();

  const handleSetAsAvatar = async () => {
    if (!capturedImage) return;
    try {
      setIsSettingAvatar(true);
      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: capturedImage }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update avatar');
      }
      setAvatarSaved(true);
      showToast('Selfie set as your official Facecard portrait!', 'success');
      if (resultCard) {
        setResultCard({ ...resultCard, avatarUrl: capturedImage });
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to update portrait', 'error');
    } finally {
      setIsSettingAvatar(false);
    }
  };

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const startCamera = async (targetFacingMode?: 'user' | 'environment') => {
    if (phase !== 'CAMERA') return;
    try {
      setCameraError(null);
      const modeToUse = targetFacingMode || facingMode;

      // Stop existing stream before re-requesting
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks?.().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: modeToUse,
          width: { ideal: 1080 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setStreamActive(true);
        };
      }
    } catch (err) {
      console.warn('Camera access denied or unavailable:', err);
      setCameraError('Live camera access is required to issue your verified Face Card. Please enable camera permissions.');
      setStreamActive(false);
    }
  };

  const flipCamera = async () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    await startCamera(nextMode);
  };

  // Initialize camera
  useEffect(() => {
    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks?.().forEach((track) => track.stop());
      }
    };
  }, [phase]);

  const startSyntheticCamera = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 640;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw stylized selfie avatar
    ctx.fillStyle = '#0f051d';
    ctx.fillRect(0, 0, 640, 640);
    ctx.beginPath();
    ctx.arc(320, 320, 180, 0, Math.PI * 2);
    ctx.fillStyle = '#fbcfe8';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(260, 280, 16, 0, Math.PI * 2);
    ctx.arc(380, 280, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#1e1b4b';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(320, 350, 60, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.strokeStyle = '#1e1b4b';
    ctx.lineWidth = 8;
    ctx.stroke();

    const stream = (canvas as any).captureStream ? (canvas as any).captureStream(30) : null;
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
      setStreamActive(true);
      setCameraError(null);
    }
  };

  // Capture frame
  const capturePhoto = (liveness?: { passed: boolean; actionsCompleted: string[] }) => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 640;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    if (liveness) {
      setLivenessData(liveness);
    }
    setPhase('CAPTURED');
  };

  // Run AI analysis via backend API
  const startAnalysis = async () => {
    if (!capturedImage) return;
    setPhase('ANALYZING');
    setAnalyzingStep(0);
    setApiError(null);

    const steps = [
      'Calibrating photo craft & lighting...',
      'Measuring facial geometry & symmetry...',
      'Evaluating expression, clarity & aura...',
      'Issuing verified Face Card...',
    ];

    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      if (current < steps.length) {
        setAnalyzingStep(current);
      }
    }, 700);

    try {
      const res = await scanService.submitScan(
        capturedImage, 
        'HYPE',
        livenessData ? { passed: livenessData.passed, actionsCompleted: livenessData.actionsCompleted } : undefined,
        duelId || undefined
      );
      clearInterval(interval);
      if (res.liveness) {
        setLivenessResult(res.liveness);
      }
      if (res.duel) {
        setDuelResult(res.duel);
      }
      if (res.freezeConsumed) {
        showToast('Streak Freeze consumed! Your streak was saved from resetting.', 'success');
      }

      let userName = 'CHIDINMA OKON';
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('facecard_user');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.handle) userName = parsed.handle.toUpperCase();
            else if (parsed.displayName) userName = parsed.displayName.toUpperCase();
          }
        } catch (e) {
          console.error(e);
        }
      }

      const newCard: FaceCardData = {
        id: `card-${Date.now()}`,
        tier: res.tier,
        cardholderName: userName,
        title: res.score >= 90 ? 'Lethal Weapon' : res.score >= 75 ? 'Golden Standard' : 'Certified Classic',
        score: res.score,
        band: res.band,
        streakDays: res.newStreak,
        multiplier: res.multiplier,
      };

      setResultCard(newCard);
      setBreakdown(res.categoryBreakdown);
      setPointsEarned(res.pointsEarned);
      setVerdictLine(res.verdictLine);
      setTips(res.tips);
      setPhase('RESULT');
    } catch (err: unknown) {
      clearInterval(interval);
      const msg = err instanceof Error ? err.message : 'Failed to evaluate selfie';
      setApiError(msg);
      setPhase('CAPTURED');
    }
  };

  const retakeScan = () => {
    setCapturedImage(null);
    setResultCard(null);
    setBreakdown(null);
    setLivenessData(null);
    setLivenessResult(null);
    setDuelResult(null);
    setPhase('CAMERA');
  };

  return (
    <div className="relative min-h-screen pb-28 bg-[var(--background)] text-[var(--foreground)] font-sans antialiased transition-colors duration-200 md:pl-16 lg:pl-52">
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Main Container */}
      <main className="relative z-10 max-w-6xl xl:max-w-7xl mx-auto px-5 sm:px-8 pt-5 space-y-5">
        <PageHeader
          title={duelId ? 'Arena Match Scan' : 'Portrait Scan'}
          backHref="/home"
          backLabel="Back to home"
          showQuickActions={false}
          rightSlot={
            <span className="text-[11px] font-semibold text-[var(--foreground)] px-2.5 py-1 rounded-full bg-[var(--surface-secondary)] border border-[var(--border)]">
              {duelId ? 'Arena' : '3 Free'}
            </span>
          }
        />

        {/* Duel Indicator Banner */}
        {duelId && (
          duelStatus === 'WAITING' ? (
            <div className="p-3.5 rounded-2xl bg-[var(--warning-surface)] border border-[var(--warning)]/25 text-xs shadow-xs shrink-0 space-y-2 animate-fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[var(--warning)] shrink-0" />
                <span className="font-bold text-[var(--text-main)]">
                  Match Awaiting Confirmation
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                This challenge has not been accepted yet. You can submit your match scan as soon as your opponent accepts!
              </p>
              <Link
                href="/faceoff"
                className="inline-flex py-1 px-3 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-foreground)] text-[11px] font-bold shadow-xs transition-colors"
              >
                Return to Arena
              </Link>
            </div>
          ) : (
            <div className="p-2.5 rounded-2xl bg-[var(--surface-accent)] border border-[var(--border-card)] flex items-center justify-between text-xs shadow-xs shrink-0 animate-fade-in">
              <div className="flex items-center gap-2">
                <Swords className="w-4 h-4 text-[var(--accent-brand)] animate-pulse" />
                <span className="font-bold text-[var(--text-main)]">
                  Confirmed Arena Clash
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-[var(--accent-brand)] bg-[var(--bg-surface-warm)] px-2 py-0.5 rounded-full">
                Score locks immediately
              </span>
            </div>
          )
        )}

        {/* Phase: Camera HUD View */}
        {phase === 'CAMERA' && (
          <div className="flex-1 flex flex-col justify-between min-h-0 pt-2 pb-24 sm:pb-28">
            {/* Camera Viewport (Enlarged Selfie Taking Area, Constrained to Viewport) */}
            <div className="relative my-auto flex items-center justify-center min-h-0 max-h-[58vh] sm:max-h-[62vh] aspect-[3/4] w-full max-w-[360px] mx-auto rounded-[32px] overflow-hidden bg-black shadow-2xl border border-white/10">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''} ${streamActive ? 'block' : 'hidden'}`}
              />

              {streamActive ? (
                <LivenessOverlay
                  videoRef={videoRef}
                  isActive={streamActive}
                  onLivenessComplete={(details) => {
                    capturePhoto({
                      passed: details.livenessVerified,
                      actionsCompleted: details.actions,
                    });
                  }}
                  onSkip={() => {
                    capturePhoto();
                  }}
                />
              ) : (
                <div className="p-6 text-center text-white/80 space-y-3">
                  <AlertCircle className="w-9 h-9 mx-auto text-[var(--accent-brand)]" />
                  <p className="text-xs max-w-[240px] mx-auto text-zinc-300">
                    {cameraError || 'Initializing camera stream...'}
                  </p>
                  <div className="flex flex-col gap-2 pt-1 items-center">
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FAF7F4]/15 hover:bg-[#FAF7F4]/25 text-[#FAF7F4] text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Allow / Retry Camera
                    </button>
                    <button
                      type="button"
                      onClick={startSyntheticCamera}
                      className="inline-flex items-center px-4 py-2 rounded-full bg-[#EBDCD5] hover:bg-[#D2B8C9] text-[#251E24] text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Test Live Camera Simulator
                    </button>
                  </div>
                </div>
              )}

              {/* Framing Silhouette Overlay */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="w-[76%] aspect-[1/1.3] rounded-[90px] border-2 border border-[var(--border)] shadow-[0_0_40px_rgba(0,0,0,0.5)]" />
              </div>

              {/* Quality Hint Pill (Checkmark removed) */}
              <div className="absolute top-4 inset-x-0 flex justify-center pointer-events-none">
                <span className="px-3.5 py-1 rounded-full bg-black/60 border border-white/10 text-[11px] font-medium text-white shadow-sm">
                  Center face inside oval
                </span>
              </div>
            </div>

            {/* Capture Controls (High-contrast Shutter + Flip Toggle) */}
            <div className="shrink-0 pt-3 flex items-center justify-center gap-6">
              <div className="w-11 h-11" />

              {/* Shutter Button */}
              <button
                type="button"
                onClick={streamActive ? () => capturePhoto() : () => startCamera()}
                className="w-[72px] h-[72px] rounded-full flex items-center justify-center p-1.5 border-[3px] border-[var(--primary)] bg-transparent hover:scale-105 active:scale-95 transition-transform cursor-pointer shadow-[var(--shadow-md)]"
                title="Take Selfie"
                aria-label="Take Selfie"
              >
                <div className="w-full h-full rounded-full bg-[var(--primary)] active:scale-90 transition-transform" />
              </button>

              {/* Camera Flip Button */}
              <button
                type="button"
                onClick={flipCamera}
                className="w-11 h-11 rounded-full bg-[var(--surface)] hover:bg-[var(--surface-secondary)] border border-[var(--border-strong)] flex items-center justify-center text-[var(--foreground)] transition-all active:scale-90 cursor-pointer shadow-[var(--shadow-sm)]"
                title="Flip Camera (Front/Back)"
                aria-label="Flip Camera"
              >
                <RefreshCw className="w-5 h-5 stroke-[1.75]" />
              </button>
            </div>
          </div>
        )}

        {/* Phase: Captured Preview */}
        {phase === 'CAPTURED' && capturedImage && (
          <div className="flex-1 flex flex-col justify-between min-h-0 pt-1 pb-24 sm:pb-28">
            <div className="text-center shrink-0 py-1">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--text-main)]">
                Confirm Selfie
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Make sure your face is clearly visible and sharp.
              </p>
              {livenessData?.passed && (
                <div className="mt-1.5 inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full bg-[var(--success-surface)] border border-[var(--success)]/25 text-[var(--success)] text-[10px] font-bold">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Live Anti-Spoof Passed (2 Actions)</span>
                </div>
              )}
            </div>

            {apiError && (
              <div className="p-3 rounded-2xl bg-[var(--error-surface)] text-[var(--error)] text-xs flex items-center gap-2 border border-[var(--error)]/25 max-w-[340px] mx-auto w-full">
                <AlertCircle className="w-4 h-4 shrink-0 text-[var(--error)]" />
                <span>{apiError}</span>
              </div>
            )}

            <div className="relative my-auto flex items-center justify-center min-h-0 max-h-[44vh] sm:max-h-[46vh] aspect-[3/4] w-full max-w-[340px] mx-auto rounded-[28px] sm:rounded-[32px] overflow-hidden bg-black shadow-xl border border-white/10">
              <img
                src={capturedImage}
                alt="Captured selfie"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="shrink-0 pt-2 flex gap-3 max-w-[340px] mx-auto w-full">
              <button
                onClick={retakeScan}
                className="flex-1 py-3 px-4 rounded-full border border-black/10 dark:border-white/15 bg-white/70 dark:bg-white/10 text-xs font-bold text-[var(--text-main)] flex items-center justify-center gap-1.5 shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-transform"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retake</span>
              </button>

              <button
                onClick={startAnalysis}
                className="flex-2 py-3 px-6 rounded-full text-xs font-bold bg-[#251E24] hover:bg-[#3A2F38] text-white shadow-[0_8px_24px_rgba(20,8,38,0.3)] border border-[var(--border-card)] flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-transform"
              >
                <span>{apiError ? 'Retry Scoring / Upload' : 'Score Lethality'}</span>
                <ArrowRight className="w-4 h-4 ml-1 opacity-70" />
              </button>
            </div>
          </div>
        )}

        {/* Phase: Analyzing with Sleek Specular Orb */}
        {phase === 'ANALYZING' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 pb-24">
            <motion.div
              animate={{
                scale: [1, 1.12, 1],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full shadow-[0_0_50px_rgba(99,102,241,0.35),0_0_80px_rgba(139,92,246,0.2)] flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%)',
              }}
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/30" />
            </motion.div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-[var(--text-main)]">
                Evaluating Face Card
              </h2>
              <p className="text-xs text-[var(--text-muted)] max-w-xs animate-pulse">
                {analyzingStep === 0 && 'Calibrating photo craft & lighting...'}
                {analyzingStep === 1 && 'Measuring facial geometry & symmetry...'}
                {analyzingStep === 2 && 'Evaluating expression, clarity & aura...'}
                {analyzingStep === 3 && 'Issuing verified Face Card...'}
              </p>
            </div>
          </div>
        )}

        {/* Phase: Final Result Card & Breakdown */}
        {phase === 'RESULT' && resultCard && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            {/* Success Banner */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--accent-primary)] border border-[var(--accent-brand)]/20">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-[var(--accent-brand)]" />
                <div>
                  <span className="text-xs font-bold text-[var(--text-main)] block">
                    Face Card Issued Successfully
                  </span>
                  {livenessResult?.verified && (
                    <span className="text-[10px] text-[var(--success)] font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Live Anti-Spoof Authenticated
                    </span>
                  )}
                </div>
              </div>
              <span className="text-xs font-black text-[var(--accent-brand)]">
                +{pointsEarned} PTS
              </span>
            </div>

            {/* Duel Outcome Banner if scanned in an Arena Clash */}
            {duelResult && (
              <div className="p-4 rounded-2xl bg-[#251E24] text-white border border-[var(--border-strong)] shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Swords className="w-5 h-5 text-[#D2B8C9]" />
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider text-[#D2B8C9] block">
                        Arena Clash Registered
                      </span>
                      <span className="text-sm font-bold text-white block">
                        {duelResult.outcome === 'WIN' 
                          ? `Victory! Pot Won: +${duelResult.payout} PTS` 
                          : duelResult.outcome === 'LOSS'
                          ? 'Defeat in this clash'
                          : duelResult.outcome === 'TIE'
                          ? 'Sudden Death Tie!'
                          : `Locked: ${resultCard.score} PTS for this Duel`}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-white/10 text-purple-200">
                    Attempt {duelResult.attemptNumber}/2
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                  <div className="text-left">
                    <span className="text-[10px] text-white/60 block">Your Best Score</span>
                    <span className="text-base font-black text-white">★ {resultCard.score}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-white/60 block">Match Status</span>
                    <span className="text-xs font-bold text-[#D2B8C9] uppercase">
                      {duelResult.status === 'COMPLETED' ? 'Resolved' : 'Awaiting Opponent'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  {duelResult.attemptsRemaining > 0 && duelResult.status !== 'COMPLETED' && (
                    <button
                      onClick={retakeScan}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-white/15 hover:bg-white/20 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Take 2nd Attempt</span>
                    </button>
                  )}
                  <Link
                    href="/faceoff"
                    className="flex-1 py-2.5 px-3 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-xs font-bold text-white text-center flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Back to Arena</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}

            {/* Issued Face Card */}
            <FaceCard card={resultCard} variant="personal" interactive={true} reveal={true} />

            {/* AI Verdict Line & Feedback Tip */}
            {verdictLine && (
              <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border-card)] text-center space-y-1 shadow-xs">
                <p className="text-xs font-bold text-[var(--text-main)] italic">
                  &ldquo;{verdictLine}&rdquo;
                </p>
                {tips && tips.length > 0 && (
                  <p className="text-[10px] text-[var(--text-muted)]">
                    Pro tip: {tips[0]}
                  </p>
                )}
              </div>
            )}

            {/* Detailed Category Breakdown */}
            {breakdown && (
              <div className="p-5 rounded-[28px] bg-[var(--surface)] border border-[var(--border-card)] shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Diagnostic Sub-Scores
                  </h3>
                  <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                    Score: {resultCard.score}/100
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-[var(--text-main)]">
                      <span>Photo Craft (Lighting & Framing)</span>
                      <span className="font-mono font-bold">{breakdown.photoCraft}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--bg-surface-warm)] overflow-hidden">
                      <div className="h-full bg-[#0EA5E9] rounded-full" style={{ width: `${breakdown.photoCraft}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-[var(--text-main)]">
                      <span>Facial Harmony & Balance</span>
                      <span className="font-mono font-bold">{breakdown.harmony}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--bg-surface-warm)] overflow-hidden">
                      <div className="h-full bg-[#A855F7] rounded-full" style={{ width: `${breakdown.harmony}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-[var(--text-main)]">
                      <span>Skin Clarity & Glow</span>
                      <span className="font-mono font-bold">{breakdown.skinClarity}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--bg-surface-warm)] overflow-hidden">
                      <div className="h-full bg-[#38BDF8] rounded-full" style={{ width: `${breakdown.skinClarity}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-[var(--text-main)]">
                      <span>Expression & Eye Contact</span>
                      <span className="font-mono font-bold">{breakdown.expression}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--bg-surface-warm)] overflow-hidden">
                      <div className="h-full bg-[var(--accent-primary)] rounded-full" style={{ width: `${breakdown.expression}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-[var(--text-main)]">
                      <span>Aura & Presence</span>
                      <span className="font-mono font-bold">{breakdown.aura}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--bg-surface-warm)] overflow-hidden">
                      <div className="h-full bg-[#EC4899] rounded-full" style={{ width: `${breakdown.aura}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-full text-xs font-bold shadow-md bg-[#251E24] hover:bg-[#3A2F38] text-white border border-[var(--border-strong)] transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                <Share2 className="w-4 h-4 text-white" />
                <span>Share Face Card to Story</span>
              </button>

              {capturedImage && (
                <button
                  type="button"
                  disabled={isSettingAvatar || avatarSaved}
                  onClick={handleSetAsAvatar}
                  className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-full text-xs font-bold border border-emerald-500/30 bg-[var(--success-surface)] text-[var(--success)] hover:bg-emerald-500/20 transition-all cursor-pointer disabled:opacity-60"
                >
                  {avatarSaved ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
                      <span>Facecard Portrait Saved!</span>
                    </>
                  ) : isSettingAvatar ? (
                    <span>Saving Portrait...</span>
                  ) : (
                    <>
                      <Layers className="w-4 h-4 text-[var(--success)]" />
                      <span>Set Selfie as Facecard Portrait</span>
                    </>
                  )}
                </button>
              )}

              <Link
                href="/faceoff"
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-full text-xs font-bold shadow-xs border border-[#D2B8C9] dark:border-[var(--border-card)] transition-all bg-[var(--bg-surface-warm)] dark:bg-[var(--accent-primary)] hover:bg-[#EBDCD5] text-[#251E24] dark:text-purple-200 hover:scale-[1.01] active:scale-[0.99]"
              >
                <Swords className="w-4 h-4 text-[#251E24] dark:text-purple-200" />
                <span>Challenge a Friend with This Card</span>
              </Link>

              <button
                onClick={retakeScan}
                className="w-full py-3 px-6 rounded-full text-xs font-semibold border border-black/10 dark:border-white/15 bg-white/70 dark:bg-white/10 text-[var(--text-main)] hover:bg-white dark:hover:bg-white/15 transition-colors"
              >
                Take Another Selfie
              </button>
            </div>
          </motion.div>
        )}
      </main>

      {resultCard && (
        <ShareCardModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          card={resultCard}
        />
      )}
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg-page)]" />}>
      <ScanContent />
    </Suspense>
  );
}
