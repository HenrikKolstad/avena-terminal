/**
 * POST /api/check
 *
 *   { url }                      → try to read the listing; if we have enough,
 *                                   return { ok:true, id }, else { ok:false,
 *                                   needs:[...], partial:{...} } so the front
 *                                   can ask for the missing fields.
 *   { inputs: CheckInputs }      → validate and return { ok:true, id }.
 *
 * The id is the result page: /r/{id}. Stateless, so no DB write here.
 */

import { NextRequest, NextResponse } from 'next/server';
import { normaliseInputs, runCheck, listTownsForClient } from '@/lib/check';
import { extractFromUrl } from '@/lib/listing-extract';

export const maxDuration = 45;

export async function GET() {
  return NextResponse.json({ towns: listTownsForClient() });
}

export async function POST(req: NextRequest) {
  let body: { url?: unknown; inputs?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'Bad JSON' }, { status: 400 }); }

  if (typeof body.url === 'string' && body.url.trim()) {
    const url = body.url.trim();
    if (!/^https?:\/\//i.test(url)) return NextResponse.json({ ok: false, error: 'Not a link' }, { status: 400 });
    const ex = await extractFromUrl(url);
    const norm = normaliseInputs({ ...ex.partial, source_url: url });
    if (norm.ok) {
      const r = runCheck(norm.inputs);
      return NextResponse.json({ ok: true, id: r.id });
    }
    return NextResponse.json({ ok: false, needs: norm.missing, partial: ex.partial, fetched: ex.fetched, route: ex.route, portal: ex.portal });
  }

  if (body.inputs && typeof body.inputs === 'object') {
    const norm = normaliseInputs(body.inputs as Record<string, unknown>);
    if (!norm.ok) return NextResponse.json({ ok: false, needs: norm.missing, error: norm.error }, { status: 422 });
    const r = runCheck(norm.inputs);
    return NextResponse.json({ ok: true, id: r.id });
  }

  return NextResponse.json({ ok: false, error: 'Send { url } or { inputs }' }, { status: 400 });
}
