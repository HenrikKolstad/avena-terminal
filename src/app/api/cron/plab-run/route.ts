/**
 * GET /api/cron/plab-run
 * Daily 05:30 UTC. Runs the PLAB benchmark across all configured
 * providers and persists per-question runs + daily scores.
 * Powers /benchmark.
 */

import { isAuthorizedCron } from '@/lib/cron-auth';
import { NextRequest } from 'next/server';
import { runBenchmark } from '@/lib/plab';

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await runBenchmark();
  return Response.json({ agent: 'PLAB Runner', ran_at: new Date().toISOString(), ...result });
}

export const POST = GET;
