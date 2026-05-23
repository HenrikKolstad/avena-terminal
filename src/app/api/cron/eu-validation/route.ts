/**
 * EU Cross-Validation Cron — daily snapshot of Avena vs official series.
 * Writes to eu_validation_snapshots. Runs daily 05:30 UTC after the
 * eu-stats-ingest at 04:15 UTC has refreshed the official side.
 */

import { NextResponse } from 'next/server';
import { startCronLog, finishCronLog } from '@/lib/cron-log';
import { generateSnapshots, persistSnapshots } from '@/lib/eu-validation';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET() {
  const log = await startCronLog('eu-validation', '/api/cron/eu-validation');
  try {
    const snaps = await generateSnapshots();
    const written = await persistSnapshots(snaps);
    await finishCronLog(log, 'success', { generated: snaps.length, written });
    return NextResponse.json({ ok: true, generated: snaps.length, written, snapshots: snaps });
  } catch (e) {
    await finishCronLog(log, 'error', null, e as Error);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
