/**
 * GET /api/cron/causal-update
 * Fires 06:30 UTC daily. Bumps indicator timestamps, runs adversarial debates
 * for key markets, stores them so /intelligence is never empty.
 */

import { NextRequest } from 'next/server';
import { runCausalUpdate } from '@/lib/causal-engine';

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await runCausalUpdate();
  return Response.json({
    agent: 'Causal Engine',
    ran_at: new Date().toISOString(),
    ...result,
  });
}

export const POST = GET;
