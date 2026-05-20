/**
 * Precursor Scan cron — daily 05:00 UTC.
 * SCAFFOLD: Real implementation queues data sources + Claude for signal
 * generation. For now logs a run and returns no-op.
 */
import { NextRequest, NextResponse } from 'next/server';
import { startCronLog, finishCronLog } from '@/lib/cron-log';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth && process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const log = await startCronLog('precursor-scan', '/api/cron/precursor-scan');
  // TODO: real Claude scan + signal insert
  await finishCronLog(log, 'success', { signals_generated: 0, note: 'Scaffold — pending Claude integration' });
  return NextResponse.json({ ok: true, signals_generated: 0, note: 'Scaffold' });
}
