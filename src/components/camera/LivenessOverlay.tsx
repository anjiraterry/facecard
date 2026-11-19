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
    <div className="w-full max-w-[360px] mx-auto mt-5 mb-2">
      {/* Hidden 64x64 canvas for optical tracker fallback */}
      <canvas ref={canvasHelperRef} className="hidden" />

      {!allVerified && currentChallenge ? (
        <div
          onClick={handleManualActionPass}
          className={`w-full p-3 rounded-2xl border shadow-sm flex items-center gap-3 transition-all cursor-pointer ${
            stepSuccess
              ? 'bg-[#251E24] border-[#78B894] text-[#FAF7F4]'
              : 'bg-[var(--surface)] border-[var(--border)] text-[var(--foreground)]'
          }`}
          title="Perform action in front of camera (or tap to simulate)"
        >
          <div className="relative w-10 h-10 rounded-xl bg-[#251E24] flex items-center justify-center shrink-0 overflow-hidden">
            {stepSuccess ? (
              <CheckCircle2 className="w-5 h-5 text-[#78B894]" />
            ) : (
              renderActionIcon(currentChallenge.cueIcon)
            )}
            {!stepSuccess && detectionProgress > 0 && (
              <div
                className="absolute bottom-0 inset-x-0 bg-[#78B894]/40 transition-all duration-150"
                style={{ height: `${detectionProgress}%` }}
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-semibold tracking-[0.06em] uppercase text-[var(--foreground-muted)] block">
              {stepSuccess
                ? 'Motion Confirmed'
                : `Liveness ${currentStepIndex + 1}/${sequence.length} · ${isMediaPipeActive ? 'AI' : 'Optical'}`}
            </span>
            <p className="text-xs font-bold leading-snug truncate">
              {stepSuccess ? 'Preparing next step...' : currentChallenge.prompt}
            </p>
            {stepSecondsElapsed >= 6 && !stepSuccess && (
              <span className="text-[10px] text-[#96788D] block">
                Ensure good light or tap Skip
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              (onSkip || handleManualActionPass)();
            }}
            className="px-2.5 py-1 rounded-full bg-[var(--surface-secondary)] hover:bg-[var(--border)] text-[10px] font-semibold text-[var(--foreground)] shrink-0 cursor-pointer"
          >
            Skip
          </button>
        </div>
      ) : allVerified ? (
        <div className="w-full px-4 py-2.5 rounded-2xl bg-[#251E24] text-[#FAF7F4] border border-[#78B894]/40 flex items-center justify-center gap-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-[#78B894] shrink-0" />
          <span className="text-xs font-semibold">Verified · Pose &amp; tap Shutter when ready</span>
        </div>
      ) : null}
    </div>
  );
}
