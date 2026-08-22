/**
 * Agent Arbiter — daily outcome verifier.
 * Fires 08:00 UTC. Finds predictions with verify_at <= now, computes
 * accuracy, writes prediction_outcomes, updates leaderboard.
 */

import { bearerCronAuth, withCronLog } from '@/lib/cron-log';
import { verifyDue } from '@/lib/predictions';

export const maxDuration = 120;

export const GET = withCronLog('predictions-verify', '/api/cron/predictions/verify', bearerCronAuth, async () => {
  const result = await verifyDue();
  return Response.json({
    agent: 'Arbiter',
    ran_at: new Date().toISOString(),
    ...result,
  });
});

export const POST = GET;
