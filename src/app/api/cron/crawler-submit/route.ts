import { NextRequest, NextResponse } from 'next/server';
import { runCrawlerSubmit } from '@/lib/crawler-submit';
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

  const handle = await startCronLog('janus', '/api/cron/crawler-submit');
  try {
    const result = await runCrawlerSubmit();
    await finishCronLog(handle, 'success', {
      internet_archive: result.internet_archive,
      internet_archive_failed: result.internet_archive_failed,
      indexnow_ok: result.indexnow.ok,
      google_sitemap_ok: result.google_sitemap.ok,
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
