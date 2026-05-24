/**
 * GET /api/cron/sync-regulatory-signals
 * Daily at 04:30 UTC. Pulls regulatory feeds, classifies via Claude,
 * persists to regulatory_signals + regulatory_property_impact.
 * Powers /regulatory-radar.
 */

import { NextRequest } from 'next/server';
import { ingestAllRegulatoryFeeds } from '@/lib/regulatory-intent';

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await ingestAllRegulatoryFeeds();
  return Response.json({
    agent: 'Regulatory Radar',
    ran_at: new Date().toISOString(),
    ...result,
  });
}

export const POST = GET;
