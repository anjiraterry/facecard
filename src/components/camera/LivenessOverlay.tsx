'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  ArrowUp, 
  Eye, 
  Smile, 
  CheckCircle2, 
  ShieldCheck, 
  RefreshCw,
  Sparkles,
  Camera
} from 'lucide-react';
import { 
  LivenessChallenge, 
  LivenessActionType, 
  generateRandomLivenessSequence,
  initFaceLandmarker,
  evaluateLivenessFrame
} from '@/lib/vision/liveness';

interface LivenessOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onLivenessComplete: (details: { actions: LivenessActionType[]; livenessVerified: boolean }) => void;
  onSkip?: () => void;
  isActive: boolean;
}

export function LivenessOverlay({
  videoRef,
  onLivenessComplete,
  onSkip,
  isActive,
}: LivenessOverlayProps) {
  const [sequence, setSequence] = useState<LivenessChallenge[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepSuccess, setStepSuccess] = useState(false);
  const [allVerified, setAllVerified] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [detectionProgress, setDetectionProgress] = useState(0);
  const [isMediaPipeActive, setIsMediaPipeActive] = useState(false);
  const [stepSecondsElapsed, setStepSecondsElapsed] = useState(0);

  const landmarkerRef = useRef<any>(null);
  const canvasHelperRef = useRef<HTMLCanvasElement | null>(null);
  const prevLumRef = useRef<{ left: number; right: number; center: number } | null>(null);
  const reqAnimRef = useRef<number | null>(null);
  const holdCounterRef = useRef<number>(0);

  // Timer to coach users if challenge is taking too long (e.g. low light, glasses, facial hair)
  useEffect(() => {
    setStepSecondsElapsed(0);
    const interval = setInterval(() => {
      setStepSecondsElapsed((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [currentStepIndex, isActive]);

  // Initialize random challenge sequence
  useEffect(() => {
    const seq = generateRandomLivenessSequence(2);
    setSequence(seq);
    setCurrentStepIndex(0);
    setStepSuccess(false);
    setAllVerified(false);
    setDetectionProgress(0);
    holdCounterRef.current = 0;
  }, [isActive]);

  // Initialize MediaPipe FaceLandmarker
  useEffect(() => {
    let isMounted = true;
    initFaceLandmarker().then((landmarker) => {
      if (isMounted && landmarker) {
        landmarkerRef.current = landmarker;
        setIsMediaPipeActive(true);
      }
    });

    return () => {
      isMounted = false;
      if (reqAnimRef.current) {
        cancelAnimationFrame(reqAnimRef.current);
      }
    };
  }, []);

  // Continuous frame evaluation loop
  useEffect(() => {
    if (!isActive || allVerified || sequence.length === 0) return;

    const currentChallenge = sequence[currentStepIndex];
    if (!currentChallenge) return;

    let isRunning = true;

    const processFrame = () => {
      if (!isRunning) return;

      const video = videoRef.current;
      if (video && video.readyState >= 2) {
        const result = evaluateLivenessFrame(
          currentChallenge.type,
          video,
          landmarkerRef.current,
          canvasHelperRef.current,
          prevLumRef
        );

        if (result.detected) {
          holdCounterRef.current += 1;
          setDetectionProgress(Math.min(100, holdCounterRef.current * 25));

          // Require 4 consecutive positive frames for solid confirmation
          if (holdCounterRef.current >= 4) {
            setStepSuccess(true);
            setDetectionProgress(100);

            // Move to next step or finish
            setTimeout(() => {
              if (currentStepIndex + 1 < sequence.length) {
                setCurrentStepIndex((prev) => prev + 1);
                setStepSuccess(false);
                setDetectionProgress(0);
                holdCounterRef.current = 0;
              } else {
                setAllVerified(true);
                // Start auto-capture countdown: 3, 2, 1, Snap!
                setCountdown(2);
              }
            }, 750);
            return;
          }
        } else {
          holdCounterRef.current = Math.max(0, holdCounterRef.current - 1);
          setDetectionProgress((prev) => Math.max(0, prev - 10));
        }
      }

      reqAnimRef.current = requestAnimationFrame(processFrame);
    };

    reqAnimRef.current = requestAnimationFrame(processFrame);

    return () => {
      isRunning = false;
      if (reqAnimRef.current) {
        cancelAnimationFrame(reqAnimRef.current);
      }
    };
  }, [isActive, currentStepIndex, sequence, allVerified, videoRef]);

  // Countdown timer to auto-capture
  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 700);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      onLivenessComplete({
        actions: sequence.map((s) => s.type),
        livenessVerified: true,
      });
    }
  }, [countdown, onLivenessComplete, sequence]);

  const currentChallenge = sequence[currentStepIndex];

  const handleManualActionPass = () => {
    if (currentStepIndex + 1 < sequence.length) {
      setStepSuccess(true);
      setTimeout(() => {
        setCurrentStepIndex((prev) => prev + 1);
        setStepSuccess(false);
        setDetectionProgress(0);
        holdCounterRef.current = 0;
      }, 500);
    } else {
      setAllVerified(true);
      setCountdown(1);
    }
  };

  const renderActionIcon = (icon: string) => {
    switch (icon) {
      case 'arrow-left':
        return <ArrowLeft className="w-6 h-6 stroke-[3] animate-pulse text-indigo-400" />;
      case 'arrow-right':
        return <ArrowRight className="w-6 h-6 stroke-[3] animate-pulse text-indigo-400" />;
      case 'eye':
        return <Eye className="w-6 h-6 stroke-[2.5] animate-bounce text-emerald-400" />;
      case 'arrow-up':
        return <ArrowUp className="w-6 h-6 stroke-[3] animate-pulse text-indigo-400" />;
      case 'smile':
        return <Smile className="w-6 h-6 stroke-[2.5] text-amber-400" />;
      default:
        return <ShieldCheck className="w-6 h-6 text-purple-400" />;
    }
  };

  return (
    <>
      {/* Hidden 64x64 canvas for optical tracker fallback */}
      <canvas ref={canvasHelperRef} className="hidden" />

      {/* Top Liveness Progress Bar */}
      <div className="absolute top-3 inset-x-3 z-30 flex flex-col items-center gap-1.5 pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-white shadow-lg">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10px] font-black uppercase tracking-wider">
            Active Liveness Check
          </span>
          <span className="text-[10px] font-mono font-bold text-white/60">
            {allVerified ? '✓ Verified' : `Action ${currentStepIndex + 1} of ${sequence.length}`}
          </span>
        </div>

        {/* Action Step Pills */}
        <div className="flex items-center gap-1.5">
          {sequence.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx < currentStepIndex || allVerified
                  ? 'w-8 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                  : idx === currentStepIndex
                  ? 'w-8 bg-white'
                  : 'w-4 bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Active Challenge Card in Upper-Center of Viewport */}
      {!allVerified && currentChallenge && (
        <div className="absolute top-16 inset-x-4 z-30 flex flex-col items-center pointer-events-auto">
          <div 
            onClick={handleManualActionPass}
            className={`w-full max-w-[300px] p-3.5 rounded-2xl backdrop-blur-xl border shadow-xl flex items-center gap-3 transition-all cursor-pointer ${
              stepSuccess
                ? 'bg-emerald-950/80 border-emerald-400 text-white scale-105'
                : 'bg-black/75 border-white/20 text-white'
            }`}
            title="Perform action in front of camera (or tap to simulate)"
          >
            {/* Visual Icon with Progress Ring */}
            <div className="relative w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10 overflow-hidden">
              {stepSuccess ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400 animate-scale-in" />
              ) : (
                renderActionIcon(currentChallenge.cueIcon)
              )}

              {/* Live progress fill */}
              {!stepSuccess && detectionProgress > 0 && (
                <div 
                  className="absolute bottom-0 inset-x-0 bg-emerald-500/40 transition-all duration-150"
                  style={{ height: `${detectionProgress}%` }}
                />
              )}
            </div>

            {/* Instruction Text */}
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold tracking-wider uppercase text-purple-300 block">
                {stepSuccess ? 'Motion Confirmed!' : `Prompt ${currentStepIndex + 1}:`}
              </span>
              <p className="text-xs font-black text-white leading-snug">
                {stepSuccess ? 'Nice! Preparing next...' : currentChallenge.prompt}
              </p>
              <span className="text-[10px] text-white/60 block font-medium">
                {stepSuccess ? 'Keep facing camera' : currentChallenge.subPrompt}
              </span>
            </div>
          </div>

          {/* Coaching hint if taking > 6 seconds */}
          {stepSecondsElapsed >= 6 && !stepSuccess && (
            <div className="mt-2 py-1 px-3 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-[10px] text-amber-300 text-center animate-fade-in flex items-center gap-1.5 shadow-md pointer-events-none">
              <span>Trouble detecting? Ensure good light or tap &apos;Skip&apos; below.</span>
            </div>
          )}
        </div>
      )}

      {/* Verified Banner and Countdown Overlay */}
      {allVerified && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xs pointer-events-none">
          <div className="p-5 rounded-3xl bg-black/85 border border-emerald-400/40 shadow-2xl text-center space-y-2 text-white max-w-[260px] animate-scale-in">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-400/40 shadow-[0_0_24px_rgba(52,211,153,0.4)]">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-black text-white">Live Human Verified</h3>
            <p className="text-[11px] text-white/70">Anti-spoof passed. Capturing your verified portrait...</p>
            {countdown !== null && (
              <div className="text-3xl font-black text-emerald-400 pt-1 font-mono">
                {countdown > 0 ? countdown : '📸'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Sub-control: Skip / Manual Shutter hint */}
      {!allVerified && (
        <div className="absolute bottom-3 inset-x-4 z-30 flex items-center justify-between pointer-events-auto">
          <span className="text-[10px] text-white/50 bg-black/40 px-2.5 py-1 rounded-full backdrop-blur-sm">
            {isMediaPipeActive ? 'MediaPipe AI Active' : 'Optical Tracker Ready'}
          </span>

          <button
            onClick={onSkip || handleManualActionPass}
            className="text-[10px] font-bold text-white/70 hover:text-white bg-black/40 hover:bg-black/60 px-2.5 py-1 rounded-full border border-white/10 backdrop-blur-sm transition-colors"
          >
            Skip Action →
          </button>
        </div>
      )}
    </>
  );
}
