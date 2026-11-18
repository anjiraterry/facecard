import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { jsonResponse } from '@/lib/atelier/serialize';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const version = typeof body.version === 'string' && body.version.trim() ? body.version.trim() : '1.0-ATELIER';

    const consent = await db.skinConsent.create({
      data: { userId: user.id, version },
    });

    return jsonResponse({ success: true, consent }, 201);
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to record skincare consent', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}

export async function DELETE() {
  try {
    const user = await getSessionUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    await db.$transaction([
      db.skinConsent.updateMany({
        where: { userId: user.id, withdrawnAt: null },
        data: { withdrawnAt: new Date() },
      }),
      db.skinProfile.deleteMany({ where: { userId: user.id } }),
    ]);

    return jsonResponse({ success: true, message: 'Skincare consent withdrawn and skin profile removed' });
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to withdraw skincare consent', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}
