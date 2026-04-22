import { NextRequest, NextResponse } from 'next/server';
import { runCrawlerSubmit } from '@/lib/crawler-submit';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // up to 5 min — Internet Archive respects rate limits

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
  const result = await runCrawlerSubmit();
  return NextResponse.json({
    ok: true,
    result,
    at: new Date().toISOString(),
  });
}
