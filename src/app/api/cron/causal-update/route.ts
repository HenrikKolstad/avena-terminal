/**
 * GET /api/cron/causal-update
 * Fires 06:30 UTC daily. Bumps indicator timestamps, runs adversarial debates
 * for key markets, stores them so /intelligence is never empty.
 */

import { isAuthorizedCron } from '@/lib/cron-auth';
import { withCronLog } from '@/lib/cron-log';
import { runCausalUpdate } from '@/lib/causal-engine';

export const maxDuration = 300;

export const GET = withCronLog('causal-update', '/api/cron/causal-update', isAuthorizedCron, async () => {
  const result = await runCausalUpdate();
  return Response.json({
    agent: 'Causal Engine',
    ran_at: new Date().toISOString(),
    ...result,
  });
});

export const POST = GET;
