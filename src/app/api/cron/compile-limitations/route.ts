/**
 * GET /api/cron/compile-limitations
 * Daily at 02:30 UTC. Walks system telemetry and writes/refreshes/resolves
 * rows in system_limitations. Powers /limitations.
 */

import { isAuthorizedCron } from '@/lib/cron-auth';
import { withCronLog } from '@/lib/cron-log';
import { compileLimitations } from '@/lib/limitations';

export const maxDuration = 120;

export const GET = withCronLog('compile-limitations', '/api/cron/compile-limitations', isAuthorizedCron, async () => {
  const result = await compileLimitations();
  return Response.json({
    agent: 'Limitations Compiler',
    ran_at: new Date().toISOString(),
    ...result,
  });
});

export const POST = GET;
