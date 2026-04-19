import { NextRequest } from 'next/server';
import { runPrometheus } from '@/lib/prometheus';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const max = Math.min(Math.max(Number(body.max) || 5, 1), 10);
  const summary = await runPrometheus(max);
  return Response.json({ triggered: 'manual', agent: 'Prometheus', ...summary });
}
