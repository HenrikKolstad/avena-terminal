/**
 * GET /api/cron/compile-limitations
 * Daily at 02:30 UTC. Walks system telemetry and writes/refreshes/resolves
 * rows in system_limitations. Powers /limitations.
 */

import { NextRequest } from 'next/server';
import { compileLimitations } from '@/lib/limitations';

export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await compileLimitations();
  return Response.json({
    agent: 'Limitations Compiler',
    ran_at: new Date().toISOString(),
    ...result,
  });
}

export const POST = GET;
