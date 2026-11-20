import { NextResponse } from 'next/server';
import { requireStaffPermission, StaffAuthError } from '@/lib/admin/auth';
import { defaultIntelligenceGateway } from '@/lib/intelligence/gateway';
import { LOCAL_MODEL_VERSION } from '@/lib/vision/localIntelligence';
import { PIXEL_QUALITY_VERSION, QUALITY_THRESHOLDS } from '@/lib/vision/pixelQuality';
import { INSIGHT_KB_VERSION } from '@/lib/insights/localInsightEngine';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireStaffPermission('economy.read');
    return NextResponse.json({
      success: true,
      localIntelligence: {
        modelVersion: LOCAL_MODEL_VERSION,
        qualityEngineVersion: PIXEL_QUALITY_VERSION,
        scoringVersion: 'v1.2-local',
        knowledgeBaseVersion: INSIGHT_KB_VERSION,
        cloudAiEnabled: process.env.ENABLE_CLOUD_AI === 'true',
        graduatedDecisions: ['PASS', 'PASS_WITH_LIMITATIONS', 'RETAKE_REQUIRED'],
        qualityThresholds: QUALITY_THRESHOLDS,
      },
      providers: defaultIntelligenceGateway.listProviders(),
    });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to inspect intelligence status' }, { status: 500 });
  }
}
