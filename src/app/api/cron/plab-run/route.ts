/**
 * GET /api/cron/plab-run
 * Daily 05:30 UTC. Runs the PLAB benchmark across all configured
 * providers and persists per-question runs + daily scores.
 * Powers /benchmark.
 */

import { isAuthorizedCron } from '@/lib/cron-auth';
import { withCronLog } from '@/lib/cron-log';
import { runBenchmark } from '@/lib/plab';

export const maxDuration = 300;

export const GET = withCronLog('plab-run', '/api/cron/plab-run', isAuthorizedCron, async () => {
  const result = await runBenchmark();
  return Response.json({
    agent: 'PLAB Runner',
    ran_at: new Date().toISOString(),
    keys: {
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      perplexity: !!process.env.PERPLEXITY_API_KEY,
    },
    ...result,
  });
});

export const POST = GET;
