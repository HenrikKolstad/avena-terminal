/**
 * POST /api/v1/counterpart/scan — scan a developer for new signals.
 * SCAFFOLD: real implementation pulls company registry, court records,
 * planning data; computes new score. For now this is a no-op stub.
 */
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth && process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ ok: true, scanned: 0, note: 'Scaffold — full registry scan integration pending.' });
}
