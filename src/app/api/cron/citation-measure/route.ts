/**
 * Cron: daily citation measurement rollup.
 * Runs after citation-agent finishes polling Perplexity.
 *
 * Pipeline:
 *   1. Read today's raw rows from citation_monitoring
 *   2. Compute hit-rate + competitor share
 *   3. Upsert into citation_measurements (public read)
 */
import { NextRequest, NextResponse } from 'next/server';
import { rollupDay, persistMeasurement } from '@/lib/citation-measure';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authOk(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev mode — allow
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  const results: Array<{ date: string; ok: boolean; measurement: unknown }> = [];
  for (const date of [yesterday, today]) {
    const m = await rollupDay(date);
    if (!m) {
      results.push({ date, ok: false, measurement: null });
      continue;
    }
    const ok = await persistMeasurement(m);
    results.push({ date, ok, measurement: m });
  }

  return NextResponse.json({
    ok: true,
    runs: results,
    at: new Date().toISOString(),
  });
}
