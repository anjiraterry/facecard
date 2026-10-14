import crypto from 'node:crypto';

export interface PaystackInitializeParams {
  email: string;
  amountInKobo: number;
  reference: string;
  callbackUrl?: string;
  metadata?: {
    userId: string;
    itemType: 'COSMETIC' | 'PRACTICE_SCANS' | 'MEMBERSHIP';
    itemSlug: string;
  };
}

export interface PaystackInitResponse {
  success: boolean;
  authorizationUrl?: string;
  accessCode?: string;
  reference: string;
  error?: string;
}

/**
 * Initializes a transaction with the Paystack API via native fetch.
 * Compatible with Cloudflare Workers execution.
 */
export async function initializePaystackTransaction(
  params: PaystackInitializeParams,
  secretKey = process.env.PAYSTACK_SECRET_KEY || ''
): Promise<PaystackInitResponse> {
  const { email, amountInKobo, reference, callbackUrl, metadata } = params;

  // Strict PRD §14 rule: Never allow direct point purchases
  if (metadata?.itemType === ('POINTS' as unknown)) {
    throw new Error('Violation of economy rules: Points cannot be purchased directly with fiat.');
  }

  if (!secretKey) {
    // Development / mock mode
    return {
      success: true,
      authorizationUrl: `https://checkout.paystack.com/mock-${reference}`,
      accessCode: `mock-acc-${Date.now()}`,
      reference,
    };
  }

  try {
    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amountInKobo,
        reference,
        callback_url: callbackUrl,
        metadata,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, reference, error: `Paystack API error ${res.status}: ${errText}` };
    }

    const data = (await res.json()) as {
      status: boolean;
      data: {
        authorization_url: string;
        access_code: string;
        reference: string;
      };
    };

    return {
      success: true,
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
      reference: data.data.reference,
    };
  } catch (err) {
    return {
      success: false,
      reference,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Validates Paystack webhook HMAC SHA512 signatures.
 */
export function verifyPaystackWebhookSignature(
  rawBody: string,
  signature: string,
  secretKey = process.env.PAYSTACK_SECRET_KEY || ''
): boolean {
  if (!secretKey) return true; // dev bypass
  const hash = crypto.createHmac('sha512', secretKey).update(rawBody).digest('hex');
  return hash === signature;
}
