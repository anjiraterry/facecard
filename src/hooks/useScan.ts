'use client';

import { useState } from 'react';
import { scanService, ScanResultResponse } from '@/services/scanService';
import { ToneMode } from '@/types';

export function useScan() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingStep, setAnalyzingStep] = useState(0);
  const [result, setResult] = useState<ScanResultResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeSteps = [
    'Calibrating photo craft & lighting...',
    'Measuring facial geometry & symmetry...',
    'Evaluating expression, clarity & aura...',
    'Issuing verified Face Card...',
  ];

  const submitScan = async (imageBase64: string, toneMode: ToneMode = 'HYPE') => {
    setIsAnalyzing(true);
    setAnalyzingStep(0);
    setError(null);

    // Step animation interval
    let step = 0;
    const interval = setInterval(() => {
      step += 1;
      if (step < analyzeSteps.length) {
        setAnalyzingStep(step);
      }
    }, 700);

    try {
      const scanRes = await scanService.submitScan(imageBase64, toneMode);
      clearInterval(interval);
      setResult(scanRes);
      return scanRes;
    } catch (err: unknown) {
      clearInterval(interval);
      const msg = err instanceof Error ? err.message : 'Failed to analyze photo';
      setError(msg);
      throw err;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetScan = () => {
    setResult(null);
    setError(null);
    setIsAnalyzing(false);
    setAnalyzingStep(0);
  };

  return {
    isAnalyzing,
    analyzingStep,
    analyzeSteps,
    result,
    error,
    submitScan,
    resetScan,
  };
}
