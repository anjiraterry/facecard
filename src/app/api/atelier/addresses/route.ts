import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { jsonResponse } from '@/lib/atelier/serialize';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const addresses = await db.address.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return jsonResponse({ success: true, addresses });
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to load addresses', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const recipientName = String(body.recipientName || '').trim();
    const phone = String(body.phone || '').trim();
    const line1 = String(body.line1 || '').trim();
    const city = String(body.city || '').trim();
    const state = String(body.state || '').trim();
    const country = String(body.country || 'NG').trim();
    const isDefault = Boolean(body.isDefault);

    if (!recipientName || !phone || !line1 || !city || !state) {
      return jsonResponse({ error: 'recipientName, phone, line1, city, and state are required' }, 400);
    }

    const address = await db.$transaction(async (tx) => {
      if (isDefault) {
        await tx.address.updateMany({
          where: { userId: user.id, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.address.create({
        data: {
          userId: user.id,
          label: typeof body.label === 'string' ? body.label.trim() : null,
          recipientName,
          phone,
          line1,
          line2: typeof body.line2 === 'string' ? body.line2.trim() : null,
          city,
          state,
          country,
          postalCode: typeof body.postalCode === 'string' ? body.postalCode.trim() : null,
          isDefault,
        },
      });
    });

    return jsonResponse({ success: true, address }, 201);
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to save address', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}
