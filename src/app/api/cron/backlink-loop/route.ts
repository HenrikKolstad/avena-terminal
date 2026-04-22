import { NextRequest, NextResponse } from 'next/server';
import { runBacklinkLoop } from '@/lib/backlink-loop';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

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
  const result = await runBacklinkLoop();
  return NextResponse.json({
    ok: true,
    result,
    at: new Date().toISOString(),
  });
}
