import crypto from 'node:crypto';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { verifyPaystackWebhookSignature } from '@/lib/paystack';
import { finalizePaidOrder } from '@/lib/atelier/orders';
import { jsonResponse } from '@/lib/atelier/serialize';
import { isUniqueViolation } from '@/lib/ledger';
import { PaymentProvider, Prisma } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-paystack-signature') || '';

    if (!verifyPaystackWebhookSignature(rawBody, signature)) {
      return jsonResponse({ error: 'Invalid webhook signature' }, 401);
    }

    const payload = JSON.parse(rawBody) as {
      event?: string;
      data?: { id?: number | string; reference?: string; amount?: number; currency?: string };
    };
    const eventType = payload.event || 'unknown';
    const reference = payload.data?.reference;
    const eventId = `${eventType}:${payload.data?.id ?? crypto.createHash('sha256').update(rawBody).digest('hex')}`;

    try {
      await db.paymentWebhookEvent.create({
        data: {
          provider: PaymentProvider.PAYSTACK,
          eventId,
          eventType,
          reference: reference ?? null,
          payload: payload as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        return jsonResponse({ received: true, deduplicated: true });
      }
      throw err;
    }

    if (eventType === 'charge.success' && reference && payload.data?.amount != null) {
      await finalizePaidOrder({
        reference,
        paidAmountMinor: BigInt(payload.data.amount),
        currency: String(payload.data.currency || 'NGN'),
        providerTransactionId: payload.data.id != null ? String(payload.data.id) : undefined,
      }).catch((err) => {
        console.error('[ATELIER_WEBHOOK] finalizePaidOrder error:', err);
      });
    }

    await db.paymentWebhookEvent.update({
      where: { eventId },
      data: { processedAt: new Date() },
    });

    return jsonResponse({ received: true });
  } catch (error) {
    return jsonResponse(
      { error: 'Webhook processing failed', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}
