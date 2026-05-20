/**
 * Counterpart Scan cron — daily 04:00 UTC.
 * SCAFFOLD: rolls forward developer scores using existing signals; real
 * implementation will query company registries (Spain Registro Mercantil,
 * BORME) and update scores + emit stress alerts on regression.
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
  const log = await startCronLog('counterpart-scan', '/api/cron/counterpart-scan');
  await finishCronLog(log, 'success', { developers_scanned: 0, note: 'Scaffold — pending registry integrations.' });
  return NextResponse.json({ ok: true, scanned: 0, note: 'Scaffold' });
}
