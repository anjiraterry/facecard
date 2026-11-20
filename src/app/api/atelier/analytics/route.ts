import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { jsonResponse } from '@/lib/atelier/serialize';

const ALLOWED_EVENTS = new Set([
  'IMPRESSION',
  'CLICK',
  'VIEW_PDP',
  'ADD_WISHLIST',
  'ADD_BAG',
  'PURCHASE',
  'ROUTINE_ADD',
  'DISMISS',
  'ADVERSE_REACTION',
]);

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser().catch(() => null);
    const body = await req.json().catch(() => ({}));
    const eventType = typeof body.eventType === 'string' ? body.eventType.toUpperCase() : '';

    if (!ALLOWED_EVENTS.has(eventType)) {
      return jsonResponse({ error: 'Invalid recommendation interaction eventType' }, 400);
    }

    const interaction = await db.recommendationInteraction.create({
      data: {
        userId: user?.id ?? null,
        sessionId: typeof body.sessionId === 'string' ? body.sessionId : null,
        productId: typeof body.productId === 'string' ? body.productId : null,
        eventType,
        metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : undefined,
      },
    });

    return jsonResponse({ success: true, interaction }, 201);
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to record analytics event', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}
