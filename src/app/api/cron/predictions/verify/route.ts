/**
 * Agent Arbiter — daily outcome verifier.
 * Fires 08:00 UTC. Finds predictions with verify_at <= now, computes
 * accuracy, writes prediction_outcomes, updates leaderboard.
 */

import { NextRequest } from 'next/server';
import { verifyDue } from '@/lib/predictions';

export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await verifyDue();
  return Response.json({
    agent: 'Arbiter',
    ran_at: new Date().toISOString(),
    ...result,
  });
}

export const POST = GET;
