/**
 * POST /api/v1/precursor/signals/generate — Claude generates new signals.
 * SCAFFOLD: returns "no new signals" until Claude integration is wired.
 * Real implementation will scan recent regulatory/infrastructure/demographic
 * data and produce signals with confidence scores.
 */
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth && process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  // TODO: Claude integration — scan recent data, generate signals
  // For now: stub returning the architecture is in place
  return NextResponse.json({
    ok: true,
    generated: 0,
    note: 'Scaffold — Claude signal generation integration pending. Seed data present in precursor_signals table.',
  });
}
