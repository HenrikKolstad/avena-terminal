/**
 * POST /api/intelligence/probabilities
 * Body: { property_ref: string }
 * Returns actuarial probability distribution for a single property.
 *
 * GET /api/intelligence/probabilities?ref=XXX
 * Returns latest cached probability record for a property.
 */

import { NextRequest } from 'next/server';
import { getAllProperties } from '@/lib/properties';
import { generateProbabilities, latestProbabilitiesFor } from '@/lib/causal-engine';

export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get('ref');
  if (!ref) return Response.json({ error: 'ref query param required' }, { status: 400 });
  const latest = await latestProbabilitiesFor(ref);
  return Response.json({ probabilities: latest }, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ref = String(body.property_ref || '').trim();
    if (!ref) return Response.json({ error: 'property_ref required' }, { status: 400 });

    // Resolve property from local dataset for Claude context
    const prop = getAllProperties().find(p => p.ref === ref);
    if (!prop) return Response.json({ error: `property ${ref} not found in dataset` }, { status: 404 });

    const ctx = {
      ref: prop.ref,
      town: prop.l,
      costa: prop.costa,
      type: prop.t,
      beds: prop.bd,
      baths: prop.ba,
      built_m2: prop.bm,
      price_eur: prop.pf,
      price_per_m2: prop.pm2,
      market_price_per_m2: prop.mm2,
      discount_vs_market_pct: prop.mm2 && prop.pm2 ? ((prop.mm2 - prop.pm2) / prop.mm2) * 100 : null,
      avena_score: prop._sc,
      score_components: prop._scores,
      yield_gross_pct: prop._yield?.gross,
      developer: prop.d,
      developer_years_active: prop.dy,
      status: prop.s,
      completion: prop.c,
      beach_km: prop.bk,
    };

    const result = await generateProbabilities({
      property_ref: ref,
      property_json: JSON.stringify(ctx, null, 2),
    });
    if (!result) {
      return Response.json(
        { error: 'probability generation failed — check ANTHROPIC_API_KEY' },
        { status: 500 }
      );
    }

    return Response.json({ ok: true, probabilities: result }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'unknown' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
