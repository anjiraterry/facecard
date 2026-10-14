import { NextResponse } from 'next/server';
import { db } from '@/lib/db';


export async function GET() {
  const start = Date.now();
  let dbStatus = 'healthy';
  let dbLatencyMs = 0;

  try {
    const dbStart = Date.now();
    // Test database connection with a fast raw query or user count
    await db.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
  } catch (error) {
    dbStatus = 'degraded_or_simulated';
    dbLatencyMs = Date.now() - start;
  }

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
    },
    version: '0.1.0',
    services: {
      ratingEngine: 'ready',
      pointsLedger: 'active',
      arenaPvP: 'operational',
    },
  });
}
