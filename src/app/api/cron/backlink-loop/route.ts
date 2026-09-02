import { isAuthorizedCron } from '@/lib/cron-auth';
import { NextRequest, NextResponse } from 'next/server';
import { runBacklinkLoop } from '@/lib/backlink-loop';
import { startCronLog, finishCronLog, finishCronLogDerived } from '@/lib/cron-log';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function authOk(req: NextRequest): boolean {
  return isAuthorizedCron(req);
}

export async function GET(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const handle = await startCronLog('hermes', '/api/cron/backlink-loop');
  try {
    const result = await runBacklinkLoop();
    await finishCronLogDerived(handle, {
      drafted: result.drafted,
      logged: result.logged,
      emailed: result.emailed,
    });
    return NextResponse.json({
      ok: true,
      result,
      at: new Date().toISOString(),
    });
  } catch (e) {
    await finishCronLog(handle, 'error', null, e);
    throw e;
  }
}
