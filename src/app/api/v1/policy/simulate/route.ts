/**
 * POST /api/v1/policy/simulate
 *
 * Run a Precision Policy Engine scenario.
 * Body: { lever, country, region?, fb_share_min?, magnitude, timeframe_m }
 * Returns: ScenarioOutput with signature + methodology citations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { simulateScenario, type ScenarioInput, type PolicyLever } from '@/lib/policy-engine';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'X-Avena-Layer': 'policy-engine',
  'X-Avena-License': 'CC-BY-4.0',
  'X-Avena-Methodology': 'https://avenaterminal.com/sovereign-briefing/cross-validating-official-statistics-2026',
  'Cache-Control': 'no-store',
};

const VALID_LEVERS: PolicyLever[] = ['ltv_cap', 'dsti_cap', 'capital_req', 'ccyb', 'sectoral_rw', 'fb_levy'];

export async function POST(req: NextRequest) {
  let body: Partial<ScenarioInput>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: 'invalid JSON' }, { status: 400, headers: HEADERS }); }

  if (!body.lever || !VALID_LEVERS.includes(body.lever as PolicyLever)) {
    return NextResponse.json({ ok: false, error: `lever must be one of: ${VALID_LEVERS.join(', ')}` }, { status: 400, headers: HEADERS });
  }
  if (!body.country) return NextResponse.json({ ok: false, error: 'country required (ISO 3166-1 alpha-2)' }, { status: 400, headers: HEADERS });
  if (typeof body.magnitude !== 'number') return NextResponse.json({ ok: false, error: 'magnitude required (number)' }, { status: 400, headers: HEADERS });
  if (typeof body.timeframe_m !== 'number' || body.timeframe_m < 1 || body.timeframe_m > 36) {
    return NextResponse.json({ ok: false, error: 'timeframe_m must be 1..36' }, { status: 400, headers: HEADERS });
  }

  try {
    const out = await simulateScenario({
      lever: body.lever as PolicyLever,
      country: body.country.toUpperCase(),
      region: body.region,
      fb_share_min: body.fb_share_min,
      magnitude: body.magnitude,
      timeframe_m: body.timeframe_m,
    });
    return NextResponse.json({ ok: true, ...out }, { headers: HEADERS });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500, headers: HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { ...HEADERS, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' },
  });
}
