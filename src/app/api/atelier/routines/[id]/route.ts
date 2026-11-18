import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { jsonResponse } from '@/lib/atelier/serialize';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const { id } = await params;
    const routine = await db.skincareRoutine.findFirst({
      where: { id, userId: user.id },
      include: {
        steps: {
          orderBy: [{ timeOfDay: 'asc' }, { stepNumber: 'asc' }],
          include: {
            products: {
              include: {
                product: { select: { id: true, slug: true, name: true, ritualStep: true } },
              },
            },
          },
        },
      },
    });

    if (!routine) return jsonResponse({ error: 'Routine not found' }, 404);
    return jsonResponse({ success: true, routine });
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to fetch routine', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const existing = await db.skincareRoutine.findFirst({ where: { id, userId: user.id } });
    if (!existing) return jsonResponse({ error: 'Routine not found' }, 404);

    const updated = await db.skincareRoutine.update({
      where: { id },
      data: {
        name: typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 80) : existing.name,
        isActive: typeof body.isActive === 'boolean' ? body.isActive : existing.isActive,
      },
    });

    return jsonResponse({ success: true, routine: updated });
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to update routine', message: error instanceof Error ? error.message : 'Error' },
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
    const deleted = await db.skincareRoutine.updateMany({
      where: { id, userId: user.id },
      data: { isActive: false },
    });
    if (deleted.count === 0) return jsonResponse({ error: 'Routine not found' }, 404);

    return jsonResponse({ success: true, message: 'Routine archived' });
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to archive routine', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}
