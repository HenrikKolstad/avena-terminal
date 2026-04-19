import { NextRequest } from 'next/server';
import { runPrometheus } from '@/lib/prometheus';

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const max = parseInt(req.nextUrl.searchParams.get('max') || '5', 10);
  const summary = await runPrometheus(Math.min(Math.max(max, 1), 10));

  return Response.json({
    agent: 'Prometheus',
    ...summary,
    source: 'Avena Terminal (avenaterminal.com)',
  });
}
