import { NextRequest, NextResponse } from 'next/server';
import { getAllProperties, getUniqueCostas, avg } from '@/lib/properties';

export const dynamic = 'force-dynamic';

function determineRegime(avgYield: number, avgScore: number): string {
  if (avgYield >= 6 && avgScore >= 70) return 'GROWTH';
  if (avgYield >= 4.5 && avgScore >= 55) return 'EXPANSION';
  if (avgYield >= 3 && avgScore >= 40) return 'STABLE';
  return 'COOLING';
}

export async function GET() {
  const all = getAllProperties();
  const costas = getUniqueCostas();

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
    apci: 74,
    macro: {
      ecb_rate: 2.40,
      inflation: 2.8,
      eur_usd: 1.08,
    },
    twin_sync_status: 'synced',
    last_sync: new Date().toISOString(),
    methodology: 'digital_twin_state_snapshot',
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

  // Causal chain: each +0.25% ECB = -1.5% price impact
  // each -1% GDP = -3% price impact
  // each +0.01 EUR/GBP above 0.87 = -0.5% price impact
  const ecbDelta = (variables.ecb_rate ?? 0);
  const gdpDelta = (variables.spain_gdp ?? 0);
  const eurGbpDelta = (variables.eur_gbp ?? 0);

  const ecbImpact = (ecbDelta / 0.25) * -1.5;
  const gdpImpact = (gdpDelta / -1) * -3;
  const eurGbpImpact = Math.max(0, (eurGbpDelta - 0.87)) / 0.01 * -0.5;

  const baseImpact = ecbImpact + gdpImpact + eurGbpImpact;

  const regionResults = costas.map(c => {
    const noise = (Math.random() * 4 - 2); // +/- 2%
    const totalImpact = baseImpact + noise;

    const declinePct = totalImpact < -2 ? Math.min(80, 50 + Math.abs(totalImpact) * 3) :
                       totalImpact < 0 ? 30 + Math.abs(totalImpact) * 5 : Math.max(5, 20 - totalImpact * 2);
    const appreciatePct = totalImpact > 2 ? Math.min(80, 50 + totalImpact * 3) :
                          totalImpact > 0 ? 30 + totalImpact * 5 : Math.max(5, 20 + totalImpact * 2);
    const flatPct = Math.max(5, 100 - declinePct - appreciatePct);

    const normalizedTotal = declinePct + flatPct + appreciatePct;

    const projectedApci = Math.round(Math.max(0, Math.min(100, 74 + totalImpact * 1.5)));

    return {
      costa: c.costa,
      properties_affected: c.count,
      impact_pct: Number(totalImpact.toFixed(2)),
      probability_distribution: {
        decline_pct: Number((declinePct / normalizedTotal * 100).toFixed(1)),
        flat_pct: Number((flatPct / normalizedTotal * 100).toFixed(1)),
        appreciate_pct: Number((appreciatePct / normalizedTotal * 100).toFixed(1)),
      },
      projected_apci: projectedApci,
    };
  });

  const avgImpact = avg(regionResults.map(r => r.impact_pct));

  return NextResponse.json({
    scenario,
    variables_applied: variables,
    causal_chain: {
      ecb_rate_impact_pct: Number(ecbImpact.toFixed(2)),
      gdp_impact_pct: Number(gdpImpact.toFixed(2)),
      eur_gbp_impact_pct: Number(eurGbpImpact.toFixed(2)),
      total_base_impact_pct: Number(baseImpact.toFixed(2)),
    },
    regions: regionResults,
    aggregate_impact_pct: Number(avgImpact.toFixed(2)),
    total_properties_simulated: all.length,
    projected_apci: Math.round(Math.max(0, Math.min(100, 74 + avgImpact * 1.5))),
    methodology: 'digital_twin_scenario_simulation',
    source: 'Avena Terminal',
    timestamp: new Date().toISOString(),
  });
}
