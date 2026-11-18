import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { jsonResponse } from '@/lib/atelier/serialize';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const { id } = await params;
    const existing = await db.address.findFirst({ where: { id, userId: user.id } });
    if (!existing) return jsonResponse({ error: 'Address not found' }, 404);

    const body = await req.json().catch(() => ({}));
    const isDefault = typeof body.isDefault === 'boolean' ? body.isDefault : existing.isDefault;

    const updated = await db.$transaction(async (tx) => {
      if (isDefault) {
        await tx.address.updateMany({
          where: { userId: user.id, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.address.update({
        where: { id },
        data: {
          label: typeof body.label === 'string' ? body.label.trim() : existing.label,
          recipientName: typeof body.recipientName === 'string' && body.recipientName.trim() ? body.recipientName.trim() : existing.recipientName,
          phone: typeof body.phone === 'string' && body.phone.trim() ? body.phone.trim() : existing.phone,
          line1: typeof body.line1 === 'string' && body.line1.trim() ? body.line1.trim() : existing.line1,
          line2: typeof body.line2 === 'string' ? body.line2.trim() : existing.line2,
          city: typeof body.city === 'string' && body.city.trim() ? body.city.trim() : existing.city,
          state: typeof body.state === 'string' && body.state.trim() ? body.state.trim() : existing.state,
          postalCode: typeof body.postalCode === 'string' ? body.postalCode.trim() : existing.postalCode,
          isDefault,
        },
      });
    });

    return jsonResponse({ success: true, address: updated });
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to update address', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const { id } = await params;
    const deleted = await db.address.deleteMany({ where: { id, userId: user.id } });
    if (deleted.count === 0) return jsonResponse({ error: 'Address not found' }, 404);

    return jsonResponse({ success: true, message: 'Address deleted' });
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to delete address', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}
