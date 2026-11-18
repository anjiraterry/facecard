import { NextRequest, NextResponse } from 'next/server';
import { SupportTicketStatus } from '@prisma/client';
import { db } from '@/lib/db';
import {
  recordStaffAuditLog,
  requireStaffPermission,
  StaffAuthError,
} from '@/lib/admin/auth';
import { getClientIp } from '@/lib/auth/rateLimit';

export async function GET() {
  try {
    await requireStaffPermission('support.read');
    const tickets = await db.supportTicket.findMany({
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      take: 50,
      include: {
        user: { select: { id: true, displayName: true, handle: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    return NextResponse.json({ success: true, tickets });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to load support tickets' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const staff = await requireStaffPermission('support.reply');
    const { ticketId, body, nextStatus } = (await req.json().catch(() => ({}))) as {
      ticketId?: string;
      body?: string;
      nextStatus?: SupportTicketStatus;
    };

    if (!ticketId || !body || !body.trim()) {
      return NextResponse.json({ error: 'ticketId and message body are required' }, { status: 400 });
    }

    const message = await db.$transaction(async (tx) => {
      const msg = await tx.supportMessage.create({
        data: {
          ticketId,
          senderType: 'STAFF',
          senderId: staff.id,
          body: body.trim(),
        },
      });
      if (nextStatus) {
        await tx.supportTicket.update({
          where: { id: ticketId },
          data: { status: nextStatus },
        });
      }
      return msg;
    });

    await recordStaffAuditLog({
      staffUserId: staff.id,
      action: 'SUPPORT_TICKET_REPLIED',
      targetType: 'SUPPORT_TICKET',
      targetId: ticketId,
      detail: { nextStatus: nextStatus ?? null },
      ip: getClientIp(req),
    });

    return NextResponse.json({ success: true, message });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to reply to support ticket' }, { status: 500 });
  }
}
