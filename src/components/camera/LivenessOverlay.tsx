'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  ArrowUp, 
  Eye, 
  Smile, 
  CheckCircle2, 
  RefreshCw,
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
        return <ArrowLeft className="w-6 h-6 stroke-[2.5] animate-pulse text-[#EBDCD5]" />;
      case 'arrow-right':
        return <ArrowRight className="w-6 h-6 stroke-[2.5] animate-pulse text-[#EBDCD5]" />;
      case 'eye':
        return <Eye className="w-6 h-6 stroke-[2.2] animate-bounce text-[#78B894]" />;
      case 'arrow-up':
        return <ArrowUp className="w-6 h-6 stroke-[2.5] animate-pulse text-[#EBDCD5]" />;
      case 'smile':
        return <Smile className="w-6 h-6 stroke-[2.2] text-[#E5CA99]" />;
      default:
        return <CheckCircle2 className="w-6 h-6 text-[#D2B8C9]" />;
    }
  };

  return (
    <>
      {/* Hidden 64x64 canvas for optical tracker fallback */}
      <canvas ref={canvasHelperRef} className="hidden" />

      {/* Top Liveness Progress Bar */}
      <div className="absolute top-3 inset-x-3 z-30 flex flex-col items-center gap-1.5 pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#251E24]/85 backdrop-blur-md border border-[#EBDCD5]/20 text-[#FAF7F4] shadow-md">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#78B894]" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em]">
            Active Liveness Check
          </span>
          <span className="text-[10px] font-semibold tabular-nums text-[#EBDCD5]/80">
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
                  ? 'w-8 bg-[#78B894]'
                  : idx === currentStepIndex
                  ? 'w-8 bg-[#FAF7F4]'
                  : 'w-4 bg-[#FAF7F4]/30'
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
            className={`w-full max-w-[300px] p-3.5 rounded-2xl backdrop-blur-md border shadow-lg flex items-center gap-3 transition-all cursor-pointer ${
              stepSuccess
                ? 'bg-[#251E24]/90 border-[#78B894] text-[#FAF7F4] scale-[1.02]'
                : 'bg-[#251E24]/85 border-[#EBDCD5]/25 text-[#FAF7F4]'
            }`}
            title="Perform action in front of camera (or tap to simulate)"
          >
            {/* Visual Icon with Progress Ring */}
            <div className="relative w-11 h-11 rounded-xl bg-[#FAF7F4]/10 flex items-center justify-center shrink-0 border border-[#EBDCD5]/15 overflow-hidden">
              {stepSuccess ? (
                <CheckCircle2 className="w-6 h-6 text-[#78B894]" />
              ) : (
                renderActionIcon(currentChallenge.cueIcon)
              )}

              {/* Live progress fill */}
              {!stepSuccess && detectionProgress > 0 && (
                <div 
                  className="absolute bottom-0 inset-x-0 bg-[#78B894]/40 transition-all duration-150"
                  style={{ height: `${detectionProgress}%` }}
                />
              )}
            </div>

            {/* Instruction Text */}
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-semibold tracking-[0.08em] uppercase text-[#D2B8C9] block">
                {stepSuccess ? 'Motion Confirmed' : `Step ${currentStepIndex + 1}`}
              </span>
              <p className="text-xs font-bold text-[#FAF7F4] leading-snug">
                {stepSuccess ? 'Preparing next step...' : currentChallenge.prompt}
              </p>
              <span className="text-[10px] text-[#EBDCD5]/75 block font-medium">
                {stepSuccess ? 'Keep facing camera' : currentChallenge.subPrompt}
              </span>
            </div>
          </div>

          {/* Coaching hint if taking > 6 seconds */}
          {stepSecondsElapsed >= 6 && !stepSuccess && (
            <div className="mt-2 py-1 px-3 rounded-full bg-[#251E24]/85 backdrop-blur-md border border-[#EBDCD5]/15 text-[10px] text-[#DFB178] text-center flex items-center gap-1.5 shadow-md pointer-events-none">
              <span>Trouble detecting? Ensure good light or tap &apos;Skip&apos; below.</span>
            </div>
          )}
        </div>
      )}

      {/* Verified Banner and Countdown Overlay */}
      {allVerified && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#251E24]/50 backdrop-blur-xs pointer-events-none">
          <div className="p-5 rounded-3xl bg-[#251E24]/95 border border-[#EBDCD5]/25 shadow-2xl text-center space-y-2 text-[#FAF7F4] max-w-[260px]">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#78B894]/20 text-[#78B894] flex items-center justify-center border border-[#78B894]/40">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="font-display text-lg font-semibold text-[#FAF7F4]">Live Portrait Verified</h3>
            <p className="text-[11px] text-[#EBDCD5]/80">Capturing your verified portrait...</p>
            {countdown !== null && (
              <div className="text-3xl font-bold text-[#EBDCD5] pt-1 tabular-nums">
                {countdown > 0 ? countdown : 'Ready'}
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
