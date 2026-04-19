import { NextRequest } from 'next/server';
import { runCitationAgent } from '@/lib/citation-agent';

export const maxDuration = 300; // 5 minutes max for 50 Perplexity calls

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const summary = await runCitationAgent();
  return Response.json({
    agent: 'Atlas',
    ...summary,
    source: 'Avena Terminal (avenaterminal.com)',
  });
}
