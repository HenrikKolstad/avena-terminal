import { NextRequest, NextResponse } from 'next/server';
import { getAllProperties, avg } from '@/lib/properties';

export const dynamic = 'force-dynamic';

interface ScenarioVariables {
  ecb_rate?: number;
  spain_gdp?: number;
  eur_gbp?: number;
}

interface ScenarioRequest {
  scenario: string;
  variables: ScenarioVariables;
}

const BASELINE = {
  ecb_rate: 2.5,
  spain_gdp: 2.3,
  eur_gbp: 0.86,
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-store',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(req: NextRequest) {
  try {
    const body: ScenarioRequest = await req.json();
    const { scenario, variables } = body;

    if (!scenario || !variables) {
      return NextResponse.json(
        { error: 'Required: { scenario: string, variables: { ecb_rate?, spain_gdp?, eur_gbp? } }' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const all = getAllProperties();

    // Compute deterministic price pressure from variable changes
    let basePressure = 0;

    const ecbRate = variables.ecb_rate ?? BASELINE.ecb_rate;
    const ecbDelta = ecbRate - BASELINE.ecb_rate;
    // Each +0.25% rate = -1.5% price pressure
    basePressure += (ecbDelta / 0.25) * -1.5;

    const gdp = variables.spain_gdp ?? BASELINE.spain_gdp;
    const gdpDelta = gdp - BASELINE.spain_gdp;
    // Each -1% GDP = -3% price pressure
    basePressure += gdpDelta * 3;

    const eurGbp = variables.eur_gbp ?? BASELINE.eur_gbp;
    // Each +0.01 above 0.87 = -0.5% UK demand pressure
    if (eurGbp > 0.87) {
      const fxDelta = (eurGbp - 0.87) / 0.01;
      basePressure += fxDelta * -0.5;
    }

    // Monte Carlo: 100 simulations with +/-2% random noise
    const outcomes: number[] = [];
    for (let i = 0; i < 100; i++) {
      const noise = (Math.random() - 0.5) * 4; // -2% to +2%
      outcomes.push(basePressure + noise);
    }

    const declineCount = outcomes.filter(o => o < -1).length;
    const flatCount = outcomes.filter(o => o >= -1 && o <= 1).length;
    const appreciateCount = outcomes.filter(o => o > 1).length;

    const probability_decline = Math.round(declineCount);
    const probability_flat = Math.round(flatCount);
    const probability_appreciate = Math.round(appreciateCount);

    // Projected APCI under scenario
    const avgOutcome = avg(outcomes);
    const baselineApci = 74;
    const apciShift = Math.round(avgOutcome * 2); // price pressure amplified
    const apci_projected = Math.max(0, Math.min(100, baselineApci + apciShift));

    // Most resilient: high score + key-ready + low beach distance
    const scored = all
      .filter(p => p._sc && p.pf > 0)
      .map(p => ({
        ref: p.ref || '',
        name: p.p || `${p.t} in ${p.l}`,
        town: p.l,
        region: p.costa || p.r || '',
        price: p.pf,
        score: p._sc || 0,
        status: p.s,
        beach_km: p.bk ?? 99,
        developer: p.d || '',
        developer_years: p.dy || 0,
        resilience_score: 0,
        vulnerability_score: 0,
      }));

    for (const s of scored) {
      // Resilience: high score, key-ready, close to beach, established developer
      s.resilience_score =
        (s.score / 100) * 40 +
        (s.status === 'key-ready' || s.status === 'ready' ? 25 : 0) +
        (s.beach_km < 2 ? 20 : s.beach_km < 5 ? 10 : 0) +
        (s.developer_years >= 10 ? 15 : s.developer_years >= 5 ? 8 : 0);

      // Vulnerability: off-plan, new developer, high price
      s.vulnerability_score =
        (s.status === 'off-plan' ? 30 : 0) +
        (s.developer_years < 3 ? 25 : s.developer_years < 5 ? 15 : 0) +
        (s.price > 500000 ? 20 : s.price > 300000 ? 10 : 0) +
        ((100 - s.score) / 100) * 25;
    }

    const most_resilient = [...scored]
      .sort((a, b) => b.resilience_score - a.resilience_score)
      .slice(0, 3)
      .map(({ resilience_score, vulnerability_score, ...rest }) => ({ ...rest, resilience_score: Math.round(resilience_score) }));

    const most_vulnerable = [...scored]
      .sort((a, b) => b.vulnerability_score - a.vulnerability_score)
      .slice(0, 3)
      .map(({ resilience_score, vulnerability_score, ...rest }) => ({ ...rest, vulnerability_score: Math.round(vulnerability_score) }));

    return NextResponse.json({
      scenario,
      variables: {
        ecb_rate: ecbRate,
        spain_gdp: gdp,
        eur_gbp: eurGbp,
      },
      baseline: BASELINE,
      market_outcome: {
        avg_price_impact_pct: Number(avgOutcome.toFixed(2)),
        probability_decline,
        probability_flat,
        probability_appreciate,
        simulations: 100,
      },
      apci_projected,
      most_resilient,
      most_vulnerable,
      source: 'Avena Terminal (avenaterminal.com)',
    }, { headers: corsHeaders() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders() });
  }
}
