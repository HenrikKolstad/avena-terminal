/**
 * Agent Nostradamus — daily prediction generator.
 * Fires 07:00 UTC. Generates 10 Claude-authored predictions, inserts into
 * Supabase, updates leaderboard totals.
 */

import { bearerCronAuth, withCronLog } from '@/lib/cron-log';
import { generateDaily } from '@/lib/predictions';

export const maxDuration = 180;

export const GET = withCronLog('predictions-generate', '/api/cron/predictions/generate', bearerCronAuth, async () => {
  const result = await generateDaily();
  return Response.json({
    agent: 'Nostradamus',
    ran_at: new Date().toISOString(),
    ...result,
  });
});

// Manual trigger support (same auth)
export const POST = GET;
