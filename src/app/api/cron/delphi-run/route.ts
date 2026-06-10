/**
 * GET /api/cron/delphi-run
 * Daily 06:00 UTC. Runs the DELPHI AI panel — every configured model
 * answers the fixed forward-judgment question set; aggregates into the
 * daily Consensus + Disagreement indices. Powers /delphi.
 */

import { isAuthorizedCron } from '@/lib/cron-auth';
import { NextRequest } from 'next/server';
import { runDelphi } from '@/lib/delphi';

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await runDelphi();
  return Response.json({ agent: 'DELPHI Panel', ran_at: new Date().toISOString(), ...result });
}

export const POST = GET;
