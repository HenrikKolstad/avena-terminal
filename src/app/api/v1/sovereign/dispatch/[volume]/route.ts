/**
 * POST /api/v1/sovereign/dispatch/{volume}
 *
 * Gated by Bearer ADMIN_TOKEN. Sends the requested published volume to
 * every active recipient via Resend. Pass ?dry=1 to preview without
 * actually firing.
 *
 * Distribution is intentionally manual — Avena editorial decision, not a cron.
 */

import { NextRequest, NextResponse } from 'next/server';
import { dispatchVolume } from '@/lib/sovereign-dispatch';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: NextRequest, { params }: { params: Promise<{ volume: string }> }) {
  const { volume: volStr } = await params;
  const volume = parseInt(volStr, 10);
  if (!Number.isFinite(volume) || volume <= 0) {
    return NextResponse.json({ ok: false, error: 'invalid volume' }, { status: 400 });
  }

  const auth = req.headers.get('authorization') ?? '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || token !== expected) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get('dry') === '1';
  const result = await dispatchVolume(volume, { dryRun });
  return NextResponse.json({ ok: true, dry: dryRun, ...result });
}
