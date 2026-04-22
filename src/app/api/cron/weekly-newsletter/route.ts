import { NextRequest, NextResponse } from 'next/server';
import { runWeekly } from '@/lib/newsletter';

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
  const dryRun = req.nextUrl.searchParams.get('dry') === '1';
  const result = await runWeekly({ dryRun });
  return NextResponse.json({
    ok: true,
    result,
    at: new Date().toISOString(),
  });
}
