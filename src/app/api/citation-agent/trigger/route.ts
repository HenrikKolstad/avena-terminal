import { NextRequest } from 'next/server';
import { runCitationAgent } from '@/lib/citation-agent';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized — manual trigger requires CRON_SECRET' }, { status: 401 });
  }
  const summary = await runCitationAgent();
  return Response.json({
    triggered: 'manual',
    agent: 'Atlas',
    ...summary,
  });
}
