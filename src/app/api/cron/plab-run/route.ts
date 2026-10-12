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
  // A run that scored nobody is not a success. Before 2026-10-12 this route
  // returned `success` with `errors: []` every morning while all three
  // providers refused on billing — `cron_logs` showed `models_scored: []`,
  // `models_skipped: [all three]` and nothing to tell "no key configured" from
  // "the provider refused us", so 44 days of Perplexity 401s and 64 days of
  // Anthropic 400s were invisible in the one place a failure is looked for.
  const scored = result.models_scored.length;
  const ok = scored > 0 && result.models_refused.length === 0 && result.errors.length === 0;
  return Response.json({
    ok,
    agent: 'PLAB Runner',
    ran_at: new Date().toISOString(),
    keys: {
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      perplexity: !!process.env.PERPLEXITY_API_KEY,
    },
    scored_count: scored,
    note:
      scored === 0
        ? result.models_refused.length > 0
          ? 'No model was scored: every keyed provider refused. The published standings are therefore unchanged and older than today.'
          : 'No model was scored and no provider was refused — check whether any API key is configured at all.'
        : null,
    ...result,
  });
});

export const POST = GET;
