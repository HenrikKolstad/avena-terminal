/**
 * Daily macro anomaly scan over eu_official_stats.
 * Schedule: 06:00 UTC (after eu-validation at 05:30).
 */

import { NextResponse } from 'next/server';
import { startCronLog, finishCronLog } from '@/lib/cron-log';
import { detectAnomalies, persistAnomalies } from '@/lib/eu-anomalies';

export const dynamic = 'force-dynamic';
export const maxDuration = 180;

export async function GET() {
  const log = await startCronLog('eu-anomalies', '/api/cron/eu-anomalies');
  try {
    const rows = await detectAnomalies();
    const written = await persistAnomalies(rows);
    const bySev: Record<string, number> = {};
    for (const r of rows) bySev[r.severity] = (bySev[r.severity] ?? 0) + 1;
    await finishCronLog(log, 'success', { detected: rows.length, written, by_severity: bySev });
    return NextResponse.json({ ok: true, detected: rows.length, written, by_severity: bySev, sample: rows.slice(0, 10) });
  } catch (e) {
    await finishCronLog(log, 'error', null, e as Error);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
