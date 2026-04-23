/**
 * Cron: daily citation measurement rollup.
 * Logs its run honestly to cron_logs.
 */
import { NextRequest, NextResponse } from 'next/server';
import { rollupDay, persistMeasurement } from '@/lib/citation-measure';
import { startCronLog, finishCronLog } from '@/lib/cron-log';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authOk(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const handle = await startCronLog('cassandra', '/api/cron/citation-measure');

  try {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

    const results: Array<{ date: string; ok: boolean; measurement: unknown }> = [];
    for (const date of [yesterday, today]) {
      const m = await rollupDay(date);
      if (!m) {
        results.push({ date, ok: false, measurement: null });
        continue;
      }
      const ok = await persistMeasurement(m);
      results.push({ date, ok, measurement: m });
    }

    const persisted = results.filter((r) => r.ok).length;
    await finishCronLog(handle, 'success', { runs: results, persisted });

    return NextResponse.json({
      ok: true,
      runs: results,
      at: new Date().toISOString(),
    });
  } catch (e) {
    await finishCronLog(handle, 'error', null, e);
    throw e;
  }
}
