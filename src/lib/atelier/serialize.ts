import { NextResponse } from 'next/server';

/**
 * Recursively converts BigInt and Decimal-like values into JSON-safe types
 * so NextResponse.json() never throws on Cloudflare Workers / Node.
 */
export function toJsonSafe<T>(value: T): unknown {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map((item) => toJsonSafe(item));
  }
  if (value !== null && typeof value === 'object') {
    // Handle Prisma Decimal without importing runtime Decimal class
    if (typeof (value as { toFixed?: unknown }).toFixed === 'function' && 'd' in (value as object)) {
      return String(value);
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = toJsonSafe(v);
    }
    return out;
  }
  return value;
}

export function jsonResponse(data: unknown, status = 200): NextResponse {
  return NextResponse.json(toJsonSafe(data), { status });
}

export function formatNgnMinor(minor: bigint | number): string {
  const naira = Number(minor) / 100;
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(naira);
}
