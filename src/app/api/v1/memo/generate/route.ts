/**
 * POST /api/v1/memo/generate
 *
 * Body: { thesis: string, organisation?: string }
 *
 * Generates a 10-section institutional investment memo. Cached by thesis hash
 * for 24h. Returns the memo body + short_id for sharing/PDF download.
 */
import { NextRequest, NextResponse } from 'next/server';
import { generateMemo } from '@/lib/memo-engine';

export const dynamic = 'force-dynamic';
export const maxDuration = 90;

export async function POST(req: NextRequest) {
  let body: { thesis?: string; organisation?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 }); }

  const thesis = (body.thesis ?? '').trim();
  if (thesis.length < 8 || thesis.length > 1000) {
    return NextResponse.json({ ok: false, error: 'thesis must be between 8 and 1000 characters' }, { status: 400 });
  }

  try {
    const memo = await generateMemo(thesis, body.organisation);
    return NextResponse.json({ ok: true, memo });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
