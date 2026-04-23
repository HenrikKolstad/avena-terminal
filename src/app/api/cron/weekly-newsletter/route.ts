import { NextRequest, NextResponse } from 'next/server';
import { runWeekly } from '@/lib/newsletter';
import { startCronLog, finishCronLog } from '@/lib/cron-log';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

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

  const handle = await startCronLog('pythia', '/api/cron/weekly-newsletter');
  try {
    const dryRun = req.nextUrl.searchParams.get('dry') === '1';
    const result = await runWeekly({ dryRun });
    await finishCronLog(handle, 'success', {
      issue_number: result.issue_number,
      subscribers: result.subscribers,
      sent: result.sent,
      dry_run: result.dry_run,
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
