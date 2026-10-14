import { NextResponse } from 'next/server';
import { runFairnessAudit } from '@/lib/rating/fairness';


export async function GET() {
  const audit = await runFairnessAudit();

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    benchmark: 'Monk Skin Tone Scale 1-10 Demographic Calibration',
    fairnessPassed: audit.passed,
    disparityPercent: audit.disparityMaxPercent,
    cohorts: audit.cohortResults,
  });
}
