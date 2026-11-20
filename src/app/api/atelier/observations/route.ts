import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { jsonResponse } from '@/lib/atelier/serialize';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const observations = await db.skinObservation.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    return jsonResponse({ success: true, observations });
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to load skin observations', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const observationKey = typeof body.observationKey === 'string' ? body.observationKey.trim() : '';
    if (!observationKey) {
      return jsonResponse({ error: 'observationKey is required' }, 400);
    }

    const confirmed = body.confirmed === true;
    const dismissed = body.dismissed === true;

    const saved = await db.skinObservation.create({
      data: {
        userId: user.id,
        scanId: typeof body.scanId === 'string' ? body.scanId : null,
        observationKey,
        method: typeof body.method === 'string' ? body.method : 'Photographic observation',
        measuredValue: typeof body.measuredValue === 'number' ? body.measuredValue : null,
        confidence: typeof body.confidence === 'number' ? body.confidence : 0.6,
        availability: body.availability === 'UNAVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE',
        region: typeof body.region === 'string' ? body.region : 'face',
        limitations: Array.isArray(body.limitations) ? body.limitations : [],
        algorithmVersion: typeof body.algorithmVersion === 'string' ? body.algorithmVersion : 'v2.1-observation',
        concernCandidates: Array.isArray(body.concernCandidates) ? body.concernCandidates : [],
        userConfirmed: dismissed ? false : confirmed,
        dismissed,
      },
    });

    return jsonResponse({ success: true, observation: saved }, 201);
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to save skin observation', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}
