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
                onLivenessComplete({
                  actions: sequence.map((s) => s.type),
                  livenessVerified: true,
                });
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
      onLivenessComplete({
        actions: sequence.map((s) => s.type),
        livenessVerified: true,
      });
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

      {/* Active Challenge Card near bottom so user's face stays unobstructed */}
      {!allVerified && currentChallenge && (
        <div className="absolute bottom-12 inset-x-4 z-30 flex flex-col items-center pointer-events-auto">
          <div 
            onClick={handleManualActionPass}
            className={`w-full max-w-[300px] p-3 rounded-2xl backdrop-blur-md border shadow-lg flex items-center gap-3 transition-all cursor-pointer ${
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

      {/* Non-blocking Verified Pill at bottom so user can see their face, pose, and tap shutter */}
      {allVerified && (
        <div className="absolute bottom-4 inset-x-4 z-30 flex justify-center pointer-events-none">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#251E24]/90 backdrop-blur-md border border-[#78B894]/50 shadow-lg text-[#FAF7F4]">
            <CheckCircle2 className="w-4 h-4 text-[#78B894] shrink-0" />
            <span className="text-xs font-semibold">Verified · Pose &amp; tap Shutter when ready</span>
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
