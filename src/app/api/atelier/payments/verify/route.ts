import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { AtelierOrderError, finalizePaidOrder } from '@/lib/atelier/orders';
import { jsonResponse } from '@/lib/atelier/serialize';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const reference = typeof body.reference === 'string' ? body.reference.trim() : '';
    if (!reference) return jsonResponse({ error: 'reference is required' }, 400);

    const txRecord = await db.paymentTransaction.findUnique({
      where: { reference },
      include: { order: { select: { userId: true } } },
    });
    if (!txRecord || txRecord.order.userId !== user.id) {
      return jsonResponse({ error: 'Payment transaction not found' }, 404);
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY || '';
    if (!secretKey) {
      return jsonResponse({ error: 'Paystack verification is not configured on server' }, 503);
    }

    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    if (!verifyRes.ok) {
      return jsonResponse({ error: `Paystack verify returned ${verifyRes.status}` }, 502);
    }

    const payload = (await verifyRes.json()) as {
      data?: { id?: number | string; status?: string; amount?: number; currency?: string };
    };
    if (payload.data?.status !== 'success') {
      return jsonResponse({ success: false, status: payload.data?.status || 'failed' }, 402);
    }

    const result = await finalizePaidOrder({
      reference,
      paidAmountMinor: BigInt(payload.data.amount ?? 0),
      currency: String(payload.data.currency || 'NGN'),
      providerTransactionId: payload.data.id != null ? String(payload.data.id) : undefined,
    });

    return jsonResponse({ success: true, ...result });
  } catch (error) {
    if (error instanceof AtelierOrderError) {
      return jsonResponse({ error: error.message }, error.status);
    }
    return jsonResponse(
      { error: 'Payment verification failed', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}
