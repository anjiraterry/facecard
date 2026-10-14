import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getConnectionString, createPrismaClient } from '@/lib/db';
import { PrismaClient } from '@prisma/client';

describe('Database & Hyperdrive Adapter Integration (Step 1.2)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should fall back to DATABASE_URL when outside Cloudflare worker context', () => {
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/facecard';
    const conn = getConnectionString();
    expect(conn).toBe('postgres://user:pass@localhost:5432/facecard');
  });

  it('should create PrismaClient instance with PrismaPg adapter', () => {
    const testUrl = 'postgres://user:pass@localhost:5432/facecard';
    const client = createPrismaClient(testUrl);
    expect(client).toBeDefined();
    expect(typeof client.$connect).toBe('function');
    expect(typeof client.$transaction).toBe('function');
  });

  it('should instantiate PrismaClient without error when no connection string is provided', () => {
    delete process.env.DATABASE_URL;
    delete process.env.DIRECT_URL;
    const client = createPrismaClient();
    expect(client).toBeDefined();
    expect(typeof client.$connect).toBe('function');
  });
});
