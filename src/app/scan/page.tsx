'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Camera, 
  RefreshCw, 
  Zap, 
  Swords, 
  CheckCircle2, 
  AlertCircle,
  Upload,
  ArrowRight,
  ArrowLeft,
  Share2
} from 'lucide-react';
import { FaceCard } from '@/components/card/FaceCard';
import { ShareCardModal } from '@/components/card/ShareCardModal';
import { BottomNav } from '@/components/navigation/BottomNav';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Tier, FaceCardData, CategoryBreakdown } from '@/types';
import { scanService } from '@/services/scanService';

type ScanPhase = 'CAMERA' | 'CAPTURED' | 'ANALYZING' | 'RESULT';

export default function ScanPage() {
  const [phase, setPhase] = useState<ScanPhase>('CAMERA');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analyzingStep, setAnalyzingStep] = useState(0);

  // Result state from real backend API
  const [resultCard, setResultCard] = useState<FaceCardData | null>(null);
  const [breakdown, setBreakdown] = useState<CategoryBreakdown | null>(null);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [verdictLine, setVerdictLine] = useState('');
  const [tips, setTips] = useState<string[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize camera
  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startCamera() {
      if (phase !== 'CAMERA') return;
      try {
        setCameraError(null);
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
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
        setCameraError('Camera access unavailable. You can upload a selfie directly.');
        setStreamActive(false);
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [phase]);

  // Capture frame
  const capturePhoto = () => {
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
    setPhase('CAPTURED');
  };

  // Fallback file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setCapturedImage(event.target.result);
        setPhase('CAPTURED');
      }
    };
    reader.readAsDataURL(file);
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
      const res = await scanService.submitScan(capturedImage, 'HYPE');
      clearInterval(interval);

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
    setPhase('CAMERA');
  };

  return (
    <div className={`relative ${phase === 'RESULT' ? 'min-h-screen pb-32' : 'h-[100dvh] overflow-hidden'} bg-[var(--bg-page)] text-[var(--text-main)] font-sans antialiased transition-colors duration-200`}>
      {/* Subtle Ethereal Ambient Background */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-70 dark:opacity-30"
        style={{
          background: `
            radial-gradient(ellipse at 50% -10%, rgba(244, 114, 182, 0.08) 0%, transparent 55%),
            radial-gradient(ellipse at 85% 35%, rgba(251, 146, 60, 0.06) 0%, transparent 45%),
            radial-gradient(ellipse at 15% 70%, rgba(99, 102, 241, 0.06) 0%, transparent 50%)
          `
        }}
      />

      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Main Container */}
      <main className={`relative z-10 max-w-md mx-auto px-4 sm:px-5 ${phase === 'RESULT' ? 'pt-5 space-y-6' : 'h-full flex flex-col justify-between pt-3 pb-3'}`}>
        {/* Top Header (Clean Transparent, Centered Title) */}
        <header className="relative flex items-center justify-between h-10 px-1 shrink-0">
          <Link
            href="/home"
            className="w-9 h-9 flex items-center justify-center text-[var(--text-main)] transition-transform active:scale-95"
            title="Back to Feed"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2]" />
          </Link>
          <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none">
            <span className="text-base sm:text-lg font-bold tracking-tight text-[var(--text-main)] whitespace-nowrap">
              selfie camera
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <div className="flex items-center gap-1 text-[11px] font-bold text-[var(--text-main)] px-2 py-1 rounded-full bg-black/5 dark:bg-white/10 border border-black/5 dark:border-white/10">
              <Zap className="w-3.5 h-3.5 text-[#6366F1]" />
              <span>3 Free</span>
            </div>
          </div>
        </header>

        {/* Phase: Camera HUD View */}
        {phase === 'CAMERA' && (
          <div className="flex-1 flex flex-col justify-between min-h-0 pt-2 pb-24 sm:pb-28">
            {/* Camera Viewport (Enlarged Selfie Taking Area, Constrained to Viewport) */}
            <div className="relative my-auto flex items-center justify-center min-h-0 max-h-[58vh] sm:max-h-[62vh] aspect-[3/4] w-full max-w-[360px] mx-auto rounded-[32px] overflow-hidden bg-black shadow-2xl border border-white/10">
              {streamActive ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover -scale-x-100"
                />
              ) : (
                <div className="p-6 text-center text-white/80 space-y-3">
                  <AlertCircle className="w-9 h-9 mx-auto text-[#6366F1]" />
                  <p className="text-xs max-w-[220px] mx-auto text-zinc-300">
                    {cameraError || 'Initializing camera stream...'}
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-bold backdrop-blur-md transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Photo Instead
                  </button>
                </div>
              )}

              {/* Framing Silhouette Overlay */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="w-[76%] aspect-[1/1.3] rounded-[90px] border-2 border-dashed border-white/40 shadow-[0_0_40px_rgba(0,0,0,0.5)]" />
              </div>

              {/* Quality Hint Pill (Checkmark removed) */}
              <div className="absolute top-4 inset-x-0 flex justify-center pointer-events-none">
                <span className="px-3.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-medium text-white shadow-sm">
                  Center face inside oval
                </span>
              </div>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            {/* Capture Controls (Pure White Circle Snap Shutter Button) */}
            <div className="shrink-0 pt-3 flex items-center justify-center gap-8">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-12 h-12 rounded-full border border-black/10 dark:border-white/15 bg-white/80 dark:bg-white/10 backdrop-blur-md flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:scale-105 active:scale-95 transition-all shadow-sm"
                title="Upload Photo"
              >
                <Upload className="w-5 h-5 text-[var(--text-main)]" />
              </button>

              {/* Shutter Button: Clean White Circle with Outer Ring */}
              <button
                type="button"
                onClick={streamActive ? capturePhoto : () => fileInputRef.current?.click()}
                style={{ width: '76px', height: '76px', border: '3px solid rgba(255, 255, 255, 0.9)' }}
                className="rounded-full flex items-center justify-center p-1.5 shadow-[0_0_24px_rgba(255,255,255,0.4)] hover:scale-105 active:scale-95 transition-transform bg-transparent"
                title="Take Selfie"
              >
                <div 
                  style={{ width: '100%', height: '100%', backgroundColor: '#FFFFFF' }}
                  className="rounded-full shadow-md active:scale-90 transition-transform" 
                />
              </button>

              {/* Spacer to keep camera button centered */}
              <div className="w-12 h-12 pointer-events-none" />
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
            </div>

            {apiError && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 border border-rose-200/50 max-w-[340px] mx-auto w-full">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
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
                className="flex-2 py-3 px-6 rounded-full text-xs font-bold bg-[#140826] hover:bg-[#241040] text-white shadow-[0_8px_24px_rgba(20,8,38,0.3)] border border-purple-400/20 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-transform"
              >
                <span>Score Lethality</span>
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
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/30 backdrop-blur-md" />
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
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#6366F1]/10 border border-[#6366F1]/20">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-[#6366F1]" />
                <span className="text-xs font-bold text-[var(--text-main)]">
                  Face Card Issued Successfully
                </span>
              </div>
              <span className="text-xs font-black text-[#6366F1]">
                +{pointsEarned} PTS
              </span>
            </div>

            {/* Issued Face Card */}
            <FaceCard card={resultCard} interactive={false} />

            {/* AI Verdict Line & Feedback Tip */}
            {verdictLine && (
              <div className="p-4 rounded-2xl bg-white/80 dark:bg-[#140826]/75 backdrop-blur-xl border border-white/90 dark:border-white/10 text-center space-y-1 shadow-xs">
                <p className="text-xs font-bold text-[var(--text-main)] italic">
                  "{verdictLine}"
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
              <div className="p-5 rounded-[28px] bg-white/75 dark:bg-[#140826]/70 backdrop-blur-xl border border-black/5 dark:border-white/10 shadow-sm space-y-3">
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
                    <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                      <div className="h-full bg-[#0EA5E9] rounded-full" style={{ width: `${breakdown.photoCraft}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-[var(--text-main)]">
                      <span>Facial Harmony & Balance</span>
                      <span className="font-mono font-bold">{breakdown.harmony}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                      <div className="h-full bg-[#A855F7] rounded-full" style={{ width: `${breakdown.harmony}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-[var(--text-main)]">
                      <span>Skin Clarity & Glow</span>
                      <span className="font-mono font-bold">{breakdown.skinClarity}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                      <div className="h-full bg-[#38BDF8] rounded-full" style={{ width: `${breakdown.skinClarity}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-[var(--text-main)]">
                      <span>Expression & Eye Contact</span>
                      <span className="font-mono font-bold">{breakdown.expression}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                      <div className="h-full bg-[#6366F1] rounded-full" style={{ width: `${breakdown.expression}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-[var(--text-main)]">
                      <span>Aura & Presence</span>
                      <span className="font-mono font-bold">{breakdown.aura}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
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
                className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-full text-xs font-bold shadow-md bg-[#140826] hover:bg-[#251040] text-white border border-purple-400/30 transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                <Share2 className="w-4 h-4 text-white" />
                <span>Share Face Card to Story</span>
              </button>

              <Link
                href="/faceoff"
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-full text-xs font-bold shadow-xs border border-[#DDD6FE] dark:border-purple-500/30 transition-all bg-[#EDE9FE] dark:bg-[#6366F1]/20 hover:bg-[#DDD6FE] text-[#140826] dark:text-purple-200 hover:scale-[1.01] active:scale-[0.99]"
              >
                <Swords className="w-4 h-4 text-[#140826] dark:text-purple-200" />
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

      <BottomNav />
    </div>
  );
}
