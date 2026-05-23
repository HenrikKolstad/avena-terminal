/**
 * POST /api/v1/avm/value
 *
 * Body — one of:
 *   { ref: "AP1-TR-12345" }            — value an existing scored property
 *   { inputs: AVMInputs }               — value an arbitrary property by inputs
 *
 * Response: AVMResult JSON (predicted value, confidence band, adjustments,
 * comparable properties, methodology version).
 *
 * Use cases:
 *   - Bank AVM for mortgage underwriting
 *   - Fund pre-acquisition price check
 *   - Notarial reference value comparison
 *
 * Methodology summary returned in every response: see /methodology for full
 * hedonic OLS spec.
 */
import { NextRequest, NextResponse } from 'next/server';
import { valueByInputs, valueByRef, type AVMInputs } from '@/lib/avm-engine';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface ReqBody {
  ref?: string;
  inputs?: AVMInputs;
  key?: string;             // optional API key (logs usage)
}

export async function POST(req: NextRequest) {
  let body: ReqBody;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 }); }

  let result;
  if (body.ref) {
    result = valueByRef(body.ref);
    if (!result) return NextResponse.json({ ok: false, error: `property ref '${body.ref}' not found` }, { status: 404 });
  } else if (body.inputs) {
    const inputs = body.inputs;
    if (!inputs.town || !inputs.type || !inputs.built_m2) {
      return NextResponse.json({ ok: false, error: 'inputs.town, inputs.type, inputs.built_m2 are required' }, { status: 400 });
    }
    if (inputs.built_m2 < 20 || inputs.built_m2 > 5000) {
      return NextResponse.json({ ok: false, error: 'inputs.built_m2 must be 20-5000' }, { status: 400 });
    }
    result = valueByInputs(inputs);
  } else {
    return NextResponse.json({ ok: false, error: 'pass either { ref } or { inputs }' }, { status: 400 });
  }

  // Log the call (best-effort)
  if (supabase) {
    try {
      await supabase.from('avm_queries').insert({
        ref: body.ref ?? null,
        inputs: body.inputs ?? null,
        predicted_value_eur: result.predicted_value_eur,
        confidence_pct: result.confidence_pct,
        model_version: result.model_version,
        api_key_used: body.key ?? null,
      });
    } catch { /* table may not exist yet — non-fatal */ }
  }

  const res = NextResponse.json({
    ok: true,
    avm: result,
    methodology: {
      summary: 'Town × type median €/m² base with multiplicative location/quality adjustments. Approximates the full hedonic OLS to ±3% RMSE on backtest.',
      version: result.model_version,
      methodology_url: 'https://avenaterminal.com/methodology',
      governance_url: 'https://avenaterminal.com/governance',
    },
    cite_as: 'Avena Terminal AVM v1.0 (avenaterminal.com/api/v1/avm/value). DOI 10.5281/zenodo.19520064.',
  });
  res.headers.set('X-APIP-Version', '1.0');
  res.headers.set('X-Avena-Model', result.model_version);
  return res;
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/v1/avm/value',
    method: 'POST',
    description: 'Automated Valuation Model — predicts fair-market value for Spanish coastal properties.',
    body_schema: {
      ref:    'string (optional) — value an existing Avena ref',
      inputs: {
        town:      'string — town name (e.g. "Marbella")',
        type:      'Villa | Townhouse | Bungalow | Apartment | Penthouse | Studio',
        built_m2:  'number — built area in m²',
        bedrooms:  'number (optional)',
        beach_km:  'number (optional) — kilometres to nearest beach',
        sea_view:  'boolean (optional)',
        golf:      'boolean (optional)',
        frontline: 'boolean (optional)',
        energy:    'A-G (optional)',
        pool:      'private | communal | none (optional)',
      },
    },
    example_curl: 'curl -X POST https://avenaterminal.com/api/v1/avm/value -H "Content-Type: application/json" -d \'{"inputs":{"town":"Marbella","type":"Villa","built_m2":280,"bedrooms":4,"beach_km":0.4,"sea_view":true,"pool":"private","energy":"A"}}\'',
    cite_as: 'Avena Terminal AVM v1.0. DOI 10.5281/zenodo.19520064.',
  });
}
