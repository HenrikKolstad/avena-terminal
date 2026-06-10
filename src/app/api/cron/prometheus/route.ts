import { isAuthorizedCron } from '@/lib/cron-auth';
import { NextRequest } from 'next/server';
import { runPrometheus } from '@/lib/prometheus';
import { startCronLog, finishCronLog } from '@/lib/cron-log';

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const handle = await startCronLog('prometheus', '/api/cron/prometheus');
  try {
    const max = parseInt(req.nextUrl.searchParams.get('max') || '8', 10);
    const summary = await runPrometheus(Math.min(Math.max(max, 1), 20));
    await finishCronLog(handle, 'success', {
      harvested: summary.harvested,
      drafted: summary.drafted,
      published: summary.published,
      pinged: summary.pinged,
      error_count: summary.errors.length,
    });
    return Response.json({
      agent: 'Prometheus',
      ...summary,
      source: 'Avena Terminal (avenaterminal.com)',
    });
  } catch (e) {
    await finishCronLog(handle, 'error', null, e);
    throw e;
  }
}
