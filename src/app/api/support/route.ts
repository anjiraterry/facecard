import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

const CreateTicketSchema = z.object({
  subject: z.string().trim().min(3, 'Subject must be at least 3 characters').max(120),
  category: z.enum(['GENERAL', 'SCAN_SCORING', 'ARENA_DUEL', 'ATELIER_ORDER', 'ACCOUNT_PRIVACY']).default('GENERAL'),
  message: z.string().trim().min(10, 'Please describe your issue (min 10 characters)').max(2000),
});

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tickets = await db.supportTicket.findMany({
      where: { userId: sessionUser.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 5,
        },
      },
    });

    return NextResponse.json({
      success: true,
      tickets: tickets.map((t) => ({
        id: t.id,
        subject: t.subject,
        category: t.category,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
        messages: t.messages.map((m) => ({
          id: m.id,
          senderType: m.senderType,
          body: m.body,
          createdAt: m.createdAt.toISOString(),
        })),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load support tickets', message: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = CreateTicketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid support request' },
        { status: 400 }
      );
    }

    const ticket = await db.supportTicket.create({
      data: {
        userId: sessionUser.id,
        email: sessionUser.email ?? null,
        subject: parsed.data.subject,
        category: parsed.data.category,
        status: 'OPEN',
        messages: {
          create: {
            senderType: 'USER',
            senderId: sessionUser.id,
            body: parsed.data.message,
          },
        },
      },
      include: {
        messages: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        ticket: {
          id: ticket.id,
          subject: ticket.subject,
          category: ticket.category,
          status: ticket.status,
          createdAt: ticket.createdAt.toISOString(),
          messages: ticket.messages.map((m) => ({
            id: m.id,
            senderType: m.senderType,
            body: m.body,
            createdAt: m.createdAt.toISOString(),
          })),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to submit support ticket', message: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    );
  }
}
