import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { jsonResponse } from '@/lib/atelier/serialize';
import { TimeOfDay } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const routines = await db.skincareRoutine.findMany({
      where: { userId: user.id, isActive: true },
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
      orderBy: { createdAt: 'desc' },
    });

    return jsonResponse({ success: true, routines });
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to fetch routines', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 80) : 'My Daily Ritual';

    const defaultSteps = [
      { timeOfDay: TimeOfDay.AM, stepNumber: 1, stepTitle: 'Gentle Cleanse', guidance: 'Botanical cleanser' },
      { timeOfDay: TimeOfDay.AM, stepNumber: 2, stepTitle: 'Hydrating Serum', guidance: 'Barrier & radiance support' },
      { timeOfDay: TimeOfDay.AM, stepNumber: 3, stepTitle: 'Broad-Spectrum Protection', guidance: 'Daily UV shield' },
      { timeOfDay: TimeOfDay.PM, stepNumber: 1, stepTitle: 'Evening Cleanse', guidance: 'Remove sunscreen & buildup' },
      { timeOfDay: TimeOfDay.PM, stepNumber: 2, stepTitle: 'Restorative Treatment', guidance: 'Targeted night serum' },
      { timeOfDay: TimeOfDay.PM, stepNumber: 3, stepTitle: 'Barrier Cream', guidance: 'Overnight moisture seal' },
    ];

    const routine = await db.skincareRoutine.create({
      data: {
        userId: user.id,
        name,
        steps: { create: defaultSteps },
      },
      include: { steps: { orderBy: [{ timeOfDay: 'asc' }, { stepNumber: 'asc' }] } },
    });

    return jsonResponse({ success: true, routine }, 201);
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to create routine', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}
