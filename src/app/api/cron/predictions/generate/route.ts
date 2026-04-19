/**
 * Agent Nostradamus — daily prediction generator.
 * Fires 07:00 UTC. Generates 10 Claude-authored predictions, inserts into
 * Supabase, updates leaderboard totals.
 */

import { NextRequest } from 'next/server';
import { generateDaily } from '@/lib/predictions';

export const maxDuration = 180;

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await generateDaily();
  return Response.json({
    agent: 'Nostradamus',
    ran_at: new Date().toISOString(),
    ...result,
  });
}

// Manual trigger support (same auth)
export const POST = GET;
