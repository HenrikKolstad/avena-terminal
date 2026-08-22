/**
 * GET /api/cron/integrity-roll
 * Daily at 03:30 UTC. Computes the day's Merkle root over all unrolled
 * integrity fingerprints and stores it. (Zenodo deposit is a manual
 * follow-on step until the Zenodo API key is wired.)
 */

import { isAuthorizedCron } from '@/lib/cron-auth';
import { withCronLog } from '@/lib/cron-log';
import { rollDailyRoot } from '@/lib/integrity';

export const maxDuration = 60;

export const GET = withCronLog('integrity-roll', '/api/cron/integrity-roll', isAuthorizedCron, async () => {
  const result = await rollDailyRoot();
  return Response.json({
    agent: 'Integrity Roll',
    ran_at: new Date().toISOString(),
    result,
  });
});

export const POST = GET;
