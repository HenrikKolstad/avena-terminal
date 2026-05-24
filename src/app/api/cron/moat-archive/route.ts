/**
 * Nightly moat archive — snapshots every institutional table to Vercel Blob
 * with SHA-256 hash chaining. Runs 03:00 UTC, before the daily ingest crons
 * so we capture the previous day's complete state.
 */

import { NextResponse } from 'next/server';
import { startCronLog, finishCronLog } from '@/lib/cron-log';
import { runMoatArchive } from '@/lib/moat-archive';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET() {
  const log = await startCronLog('moat-archive', '/api/cron/moat-archive');
  try {
    const result = await runMoatArchive();
    const ok = result.outcomes.filter((o) => !o.error && o.blob_url).length;
    const failed = result.outcomes.filter((o) => o.error).length;
    const totalRows = result.outcomes.reduce((a, o) => a + o.row_count, 0);
    const totalBytes = result.outcomes.reduce((a, o) => a + o.file_bytes, 0);
    await finishCronLog(log, failed === 0 ? 'success' : 'error', {
      tables_ok: ok,
      tables_failed: failed,
      rows_archived: totalRows,
      bytes_archived: totalBytes,
    });
    return NextResponse.json({
      ok: true,
      run_date: result.run_date,
      tables_ok: ok,
      tables_failed: failed,
      rows_archived: totalRows,
      bytes_archived: totalBytes,
      outcomes: result.outcomes,
    });
  } catch (e) {
    await finishCronLog(log, 'error', null, e as Error);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
