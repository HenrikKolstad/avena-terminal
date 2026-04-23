import { NextRequest, NextResponse } from 'next/server';
import { runArgus } from '@/lib/comp-sanity';
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

  const handle = await startCronLog('argus', '/api/cron/argus');
  try {
    const result = await runArgus();
    await finishCronLog(handle, 'success', {
      scanned: result.scanned,
      flagged: result.flagged,
    });
    return NextResponse.json({ ok: true, ...result, at: new Date().toISOString() });
  } catch (e) {
    await finishCronLog(handle, 'error', null, e);
    throw e;
  }
}
