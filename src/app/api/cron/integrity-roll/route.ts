/**
 * GET /api/cron/integrity-roll
 * Daily at 03:30 UTC. Computes the day's Merkle root over all unrolled
 * integrity fingerprints and stores it. (Zenodo deposit is a manual
 * follow-on step until the Zenodo API key is wired.)
 */

import { isAuthorizedCron } from '@/lib/cron-auth';
import { NextRequest } from 'next/server';
import { rollDailyRoot } from '@/lib/integrity';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await rollDailyRoot();
  return Response.json({
    agent: 'Integrity Roll',
    ran_at: new Date().toISOString(),
    result,
  });
}

export const POST = GET;
