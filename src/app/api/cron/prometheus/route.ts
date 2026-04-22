import { NextRequest } from 'next/server';
import { runPrometheus } from '@/lib/prometheus';

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Each run ships up to 8 answers (was 5). With 4 scheduled runs/day that's
  // ~32 new AEO pages/day — compounds to ~11k/year. Enough to blanket the
  // European property long-tail on Google + AI answer engines.
  const max = parseInt(req.nextUrl.searchParams.get('max') || '8', 10);
  const summary = await runPrometheus(Math.min(Math.max(max, 1), 20));

  return Response.json({
    agent: 'Prometheus',
    ...summary,
    source: 'Avena Terminal (avenaterminal.com)',
  });
}
