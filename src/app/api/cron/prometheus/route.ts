import { isAuthorizedCron } from '@/lib/cron-auth';
import { NextRequest } from 'next/server';
import { runPrometheus } from '@/lib/prometheus';
import { startCronLog, finishCronLog, finishCronLogDerived } from '@/lib/cron-log';

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const handle = await startCronLog('prometheus', '/api/cron/prometheus');
  try {
    const max = parseInt(req.nextUrl.searchParams.get('max') || '8', 10);
    const summary = await runPrometheus(Math.min(Math.max(max, 1), 20));
    await finishCronLogDerived(handle, {
      harvested: summary.harvested,
      drafted: summary.drafted,
      published: summary.published,
      pinged: summary.pinged,
      error_count: summary.errors.length,
      // `error_count` alone is a bare number and deriveStatusFromSummary does
      // not — and deliberately should not — guess at numeric fields. The array
      // is the marker it reads, so a run that fails every question now logs
      // `error` instead of `success`. Capped for size; `error_count` above is
      // the uncapped total, so the sample can never understate the failure.
      errors: summary.errors.slice(0, 10),
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
