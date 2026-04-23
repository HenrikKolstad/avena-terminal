import { NextRequest } from 'next/server';
import { runCitationAgent } from '@/lib/citation-agent';
import { startCronLog, finishCronLog } from '@/lib/cron-log';

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const handle = await startCronLog('atlas', '/api/cron/citation-agent');
  try {
    const summary = await runCitationAgent();
    await finishCronLog(handle, 'success', summary as unknown as Record<string, unknown>);
    return Response.json({
      agent: 'Atlas',
      ...summary,
      source: 'Avena Terminal (avenaterminal.com)',
    });
  } catch (e) {
    await finishCronLog(handle, 'error', null, e);
    throw e;
  }
}
