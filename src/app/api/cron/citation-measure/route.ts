/**
 * Cron: daily citation measurement rollup.
 * Logs its run honestly to cron_logs.
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  rollupDay,
  persistMeasurement,
  ROLLUP_FAILURE_REASONS,
  type RollupReason,
} from '@/lib/citation-measure';
import { startCronLog, finishCronLog } from '@/lib/cron-log';
import { isAuthorizedCron } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const handle = await startCronLog('cassandra', '/api/cron/citation-measure');

  try {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

    const results: Array<{
      date: string;
      ok: boolean;
      reason: RollupReason | 'persist_failed';
      error?: string;
      measurement: unknown;
    }> = [];
    for (const date of [yesterday, today]) {
      const { measurement, reason, error } = await rollupDay(date);
      if (!measurement) {
        results.push({ date, ok: false, reason, ...(error ? { error } : {}), measurement: null });
        continue;
      }
      const persist = await persistMeasurement(measurement);
      results.push({
        date,
        ok: persist.ok,
        reason: persist.ok ? reason : 'persist_failed',
        ...(persist.error ? { error: persist.error } : {}),
        measurement,
      });
    }

    const persisted = results.filter((r) => r.ok).length;
    // A day the engine was never scheduled to run is not a failure and must not
    // colour the run — that would be a false-alarm generator four days a week,
    // and an alarm that fires on healthy days is one nobody reads. A day it WAS
    // asked to run and produced nothing is a real failure and now says so.
    const failures = results.filter(
      (r) => r.reason === 'persist_failed' || ROLLUP_FAILURE_REASONS.has(r.reason as RollupReason)
    );
    await finishCronLog(
      handle,
      failures.length ? 'error' : 'success',
      { runs: results, persisted, failures: failures.map((f) => `${f.date}: ${f.reason}`) },
      failures.length
        ? new Error(
            `citation rollup produced no measurement on ${failures.length} day(s): ` +
              failures.map((f) => `${f.date} ${f.reason}${f.error ? ` (${f.error})` : ''}`).join('; ')
          )
        : undefined
    );

    return NextResponse.json({
      ok: failures.length === 0,
      runs: results,
      at: new Date().toISOString(),
    });
  } catch (e) {
    await finishCronLog(handle, 'error', null, e);
    throw e;
  }
}
