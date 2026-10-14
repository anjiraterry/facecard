import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Resolves the active connection string.
 * On Cloudflare Workers with Hyperdrive:
 * - Uses HYPERDRIVE.connectionString if available via Cloudflare runtime context
 * Otherwise falls back to DATABASE_URL / DIRECT_URL.
 */
export function getConnectionString(): string | undefined {
  try {
    // Attempt to access Cloudflare Workers Hyperdrive binding if running under OpenNext
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } = require('@opennextjs/cloudflare');
    const ctx = getCloudflareContext();
    if (ctx?.env?.HYPERDRIVE?.connectionString) {
      return ctx.env.HYPERDRIVE.connectionString;
    }
  } catch {
    // Not running inside Cloudflare runtime context or during build
  }

  return process.env.DATABASE_URL || process.env.DIRECT_URL;
}

export function createPrismaClient(connectionString?: string): PrismaClient {
  const conn = connectionString || getConnectionString() || 'postgresql://localhost:5432/facecard';

  const pool = new Pool({
    connectionString: conn,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

export default db;
