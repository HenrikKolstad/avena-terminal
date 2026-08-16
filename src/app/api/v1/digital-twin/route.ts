/**
 * GET/POST /api/v1/digital-twin — market state snapshot and scenario simulation.
 *
 * AUDIT 2026-08-16 — this route published four fabrications:
 *
 *   1. `apci: 74` was a hardcoded literal. The canonical index at
 *      /api/v1/apci read 58 the day this was found, so two Avena surfaces
 *      published the same named index 16 points apart.
 *   2. `macro` was a hardcoded block (ecb_rate 2.40, inflation 2.8,
 *      eur_usd 1.08) stamped `twin_sync_status: "synced"` and a
 *      `last_sync` of Date.now() — frozen constants wearing a fresh
 *      timestamp. Real values sit in causal_indicators and are read now.
 *   3. POST added `Math.random() * 4 - 2` to every region's impact before
 *      publishing it. Two identical requests returned decline
 *      probabilities of 37.2% and 58.0%. A scenario simulator whose answer
 *      changes between calls is not a model, and any figure quoted from it
 *      was irreproducible.
 *   4. `eur_gbp` was documented as a delta but compared against the 0.87
 *      absolute level, so ordinary delta inputs silently scored zero impact.
 *
 * The causal coefficients below are an explicit, declared elasticity
 * assumption — not a measurement. They are published as such in
 * `causal_assumptions` so a reader can see exactly what was assumed.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAllProperties, getUniqueCostas, avg } from '@/lib/properties';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/** Declared elasticity assumptions. Not derived from Avena data — stated, not measured. */
const CAUSAL_ASSUMPTIONS = {
  price_impact_pct_per_25bp_ecb: -1.5,
  price_impact_pct_per_1pct_gdp: 3.0,
  price_impact_pct_per_0_01_eur_gbp: -0.5,
  basis: 'declared elasticity assumption, not estimated from Avena observations',
};

function determineRegime(avgYield: number, avgScore: number): string {
  if (avgYield >= 6 && avgScore >= 70) return 'GROWTH';
  if (avgYield >= 4.5 && avgScore >= 55) return 'EXPANSION';
  if (avgYield >= 3 && avgScore >= 40) return 'STABLE';
  return 'COOLING';
}

/** Live macro from causal_indicators. Returns null rather than a frozen constant. */
async function liveMacro(): Promise<{
  values: Record<string, number> | null;
  basis: string;
  as_of: string | null;
}> {
  if (!supabase) return { values: null, basis: 'no database connection', as_of: null };
  const { data, error } = await supabase
    .from('causal_indicators')
    .select('name, current_value, last_updated')
    .eq('target_market', 'all_spain')
    .limit(100);
  if (error) return { values: null, basis: `causal_indicators query failed: ${error.message}`, as_of: null };

  const rows = ((data ?? []) as Array<{ name: string; current_value: number | null; last_updated: string | null }>)
    .filter((r) => r.current_value != null);
  if (!rows.length) return { values: null, basis: 'no live macro indicators on record', as_of: null };

  const values: Record<string, number> = {};
  for (const r of rows) values[r.name] = r.current_value as number;
  const stamps = rows.map((r) => r.last_updated).filter(Boolean).sort() as string[];
  return {
    values,
    basis: 'causal_indicators, target_market=all_spain',
    as_of: stamps.length ? stamps[stamps.length - 1] : null,
  };
}

export async function GET() {
  const all = getAllProperties();
  if (!all.length) {
    return NextResponse.json(
      { error: 'Live book is empty — refusing to publish a twin state.' },
      { status: 503 },
    );
  }
  const costas = getUniqueCostas();
  const macro = await liveMacro();

  const prices = all.map(p => p.pf);
  const yields = all.filter(p => p._yield?.gross).map(p => p._yield!.gross);
  const scores = all.filter(p => p._sc).map(p => p._sc!);

  const regions = costas.map(c => {
    const props = all.filter(p => p.costa === c.costa);
    const ylds = props.filter(p => p._yield?.gross).map(p => p._yield!.gross);
    const scs = props.filter(p => p._sc).map(p => p._sc!);
    return {
      costa: c.costa,
      count: c.count,
      avg_price: Math.round(avg(props.map(p => p.pf))),
      avg_yield: Number(avg(ylds).toFixed(1)),
      avg_score: Math.round(avg(scs)),
      regime: determineRegime(avg(ylds), avg(scs)),
    };
  });

  return NextResponse.json({
    twin_type: 'european_property_digital_twin',
    total_properties: all.length,
    avg_price: Math.round(avg(prices)),
    avg_yield: Number(avg(yields).toFixed(1)),
    avg_score: Math.round(avg(scores)),
    regions,
    /*
     * The APCI is computed in exactly one place and published there. This
     * route deliberately does not restate it — a second copy is how the
     * hardcoded 74 survived alongside a live 58.
     */
    apci: null,
    apci_source: 'https://avenaterminal.com/api/v1/apci',
    macro: macro.values,
    macro_basis: macro.basis,
    macro_as_of: macro.as_of,
    regime_thresholds: {
      GROWTH: 'avg_yield >= 6 and avg_score >= 70',
      EXPANSION: 'avg_yield >= 4.5 and avg_score >= 55',
      STABLE: 'avg_yield >= 3 and avg_score >= 40',
      COOLING: 'otherwise',
      basis: 'declared classification thresholds applied to live book aggregates',
    },
    book_generated: new Date().toISOString(),
    methodology: 'digital_twin_state_snapshot — live book aggregates plus live macro indicators; no value on this response is a stored constant',
    source: 'Avena Terminal',
  });
}

export async function POST(req: NextRequest) {
  let body: { scenario?: string; variables?: { ecb_rate?: number; spain_gdp?: number; eur_gbp?: number } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const scenario = body.scenario || 'custom';
  const variables = body.variables || {};
  const costas = getUniqueCostas();
  const all = getAllProperties();

  // All three inputs are DELTAS (change from today), consistently. The old
  // code documented eur_gbp as a delta but tested it against the 0.87
  // absolute level, so any realistic delta produced exactly zero impact.
  const ecbDelta = variables.ecb_rate ?? 0;
  const gdpDelta = variables.spain_gdp ?? 0;
  const eurGbpDelta = variables.eur_gbp ?? 0;

  const ecbImpact = (ecbDelta / 0.25) * CAUSAL_ASSUMPTIONS.price_impact_pct_per_25bp_ecb;
  const gdpImpact = gdpDelta * CAUSAL_ASSUMPTIONS.price_impact_pct_per_1pct_gdp;
  const eurGbpImpact = (eurGbpDelta / 0.01) * CAUSAL_ASSUMPTIONS.price_impact_pct_per_0_01_eur_gbp;

  const baseImpact = ecbImpact + gdpImpact + eurGbpImpact;

  /*
   * Deterministic. The same scenario must return the same numbers every
   * time or nothing quoted from this endpoint can be reproduced. Regional
   * variation comes from a real, observable property of each region — its
   * yield relative to the national mean — not from Math.random().
   */
  const regionYields = costas.map(c => {
    const props = all.filter(p => p.costa === c.costa);
    const ylds = props.filter(p => p._yield?.gross).map(p => p._yield!.gross);
    return ylds.length ? avg(ylds) : null;
  });
  const measured = regionYields.filter((y): y is number => y != null);
  const meanYield = measured.length ? avg(measured) : null;

  const regionResults = costas.map((c, i) => {
    const y = regionYields[i];
    // Higher-yield regions are treated as more defensive under a shock.
    // Declared sensitivity, applied identically on every call.
    const yieldOffset = y != null && meanYield ? (y - meanYield) * 0.5 : 0;
    const totalImpact = baseImpact + yieldOffset;

    const declinePct = totalImpact < -2 ? Math.min(80, 50 + Math.abs(totalImpact) * 3) :
                       totalImpact < 0 ? 30 + Math.abs(totalImpact) * 5 : Math.max(5, 20 - totalImpact * 2);
    const appreciatePct = totalImpact > 2 ? Math.min(80, 50 + totalImpact * 3) :
                          totalImpact > 0 ? 30 + totalImpact * 5 : Math.max(5, 20 + totalImpact * 2);
    const flatPct = Math.max(5, 100 - declinePct - appreciatePct);
    const normalizedTotal = declinePct + flatPct + appreciatePct;

    return {
      costa: c.costa,
      properties_affected: c.count,
      impact_pct: Number(totalImpact.toFixed(2)),
      regional_yield_offset_pct: Number(yieldOffset.toFixed(2)),
      probability_distribution: {
        decline_pct: Number((declinePct / normalizedTotal * 100).toFixed(1)),
        flat_pct: Number((flatPct / normalizedTotal * 100).toFixed(1)),
        appreciate_pct: Number((appreciatePct / normalizedTotal * 100).toFixed(1)),
      },
    };
  });

  const avgImpact = avg(regionResults.map(r => r.impact_pct));

  return NextResponse.json({
    scenario,
    variables_applied: variables,
    variables_are: 'deltas from current levels (ecb_rate in pp, spain_gdp in pp, eur_gbp in absolute FX points)',
    causal_chain: {
      ecb_rate_impact_pct: Number(ecbImpact.toFixed(2)),
      gdp_impact_pct: Number(gdpImpact.toFixed(2)),
      eur_gbp_impact_pct: Number(eurGbpImpact.toFixed(2)),
      total_base_impact_pct: Number(baseImpact.toFixed(2)),
    },
    causal_assumptions: CAUSAL_ASSUMPTIONS,
    regions: regionResults,
    aggregate_impact_pct: Number(avgImpact.toFixed(2)),
    total_properties_simulated: all.length,
    /*
     * Reported as a DELTA. Projecting an absolute APCI required a baseline,
     * and the old code used the hardcoded 74 for it. Callers who want an
     * absolute should apply this delta to the live reading at /api/v1/apci.
     */
    projected_apci_delta: Number((avgImpact * 1.5).toFixed(2)),
    apci_baseline_source: 'https://avenaterminal.com/api/v1/apci',
    deterministic: true,
    methodology: 'digital_twin_scenario_simulation — deterministic; identical inputs always return identical output',
    source: 'Avena Terminal',
    timestamp: new Date().toISOString(),
  });
}
