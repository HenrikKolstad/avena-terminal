/**
 * GET /api/cron/delphi-run
 * Daily 06:00 UTC. Runs the DELPHI AI panel — every configured model
 * answers the fixed forward-judgment question set; aggregates into the
 * daily Consensus + Disagreement indices. Powers /delphi.
 */

import { isAuthorizedCron } from '@/lib/cron-auth';
import { withCronLog } from '@/lib/cron-log';
import { runDelphi } from '@/lib/delphi';

export const maxDuration = 300;

export const GET = withCronLog('delphi-run', '/api/cron/delphi-run', isAuthorizedCron, async () => {
  const result = await runDelphi();
  return Response.json({ agent: 'DELPHI Panel', ran_at: new Date().toISOString(), ...result });
});

export const POST = GET;
