/**
 * POST /api/v1/genesis/run — create + execute scenario simulation.
 *
 * SCAFFOLD: returns deterministic mock outputs derived from input variables.
 * Real implementation will pass inputs + market data + causal relationships
 * to Claude for probabilistic simulation across 12/24/36 month horizons.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface ScenarioInput {
  title?: string;
  description?: string;
  ecb_rate_change_bps?: number;
  spain_regulatory_change?: string;
  german_migration_delta_pct?: number;
  uk_buyer_delta_pct?: number;
  construction_supply_delta_pct?: number;
  remote_work_adoption_delta_pct?: number;
  eu_gdp_growth_pct?: number;
  inflation_delta_pct?: number;
  target_markets?: string[];
  horizon_months?: number;
}

/** Deterministic mock simulator — derives outcomes from input deltas. */
function mockSimulate(input: ScenarioInput, market: string, horizon: number) {
  const r = input.ecb_rate_change_bps ?? 0;
  const ger = input.german_migration_delta_pct ?? 0;
  const uk = input.uk_buyer_delta_pct ?? 0;
  const sup = input.construction_supply_delta_pct ?? 0;
  const gdp = input.eu_gdp_growth_pct ?? 2.1;
  const inf = input.inflation_delta_pct ?? 0;

  // Base case: directionally consistent with macro inputs
  const monthFactor = horizon / 24;
  const ratePress = (r / -100) * 3.5 * monthFactor;            // 100bps cut = +3.5% price 24mo
  const demand = (ger * 0.04 + uk * 0.02) * monthFactor;       // migration tailwind
  const supply = -sup * 0.08 * monthFactor;                    // less supply = higher prices
  const macro = (gdp - 2.1) * 1.2 * monthFactor - inf * 0.4;

  const base = +(ratePress + demand + supply + macro).toFixed(1);
  const bear = +(base - 4 - Math.abs(base) * 0.3).toFixed(1);
  const bull = +(base + 4 + Math.abs(base) * 0.3).toFixed(1);

  const yieldChangeBase = +(-r * 0.4 - demand * 8).toFixed(0); // bps
  const regimeProbs = {
    correction:        base < -5 ? 0.55 : base < -2 ? 0.25 : 0.05,
    buyer_opportunity: base < 0  ? 0.35 : base < 3  ? 0.20 : 0.10,
    balanced:          base > -2 && base < 4 ? 0.55 : 0.35,
    seller_premium:    base > 4 ? 0.55 : base > 2 ? 0.30 : 0.05,
  };
  const regimeBase = (Object.entries(regimeProbs).sort((a, b) => b[1] - a[1])[0][0]);

  return {
    market, horizon_months: horizon,
    price_change_pct_bear: bear,
    price_change_pct_base: base,
    price_change_pct_bull: bull,
    price_change_probability_bear: 0.20,
    price_change_probability_base: 0.55,
    price_change_probability_bull: 0.25,
    yield_change_bps_bear: yieldChangeBase + 40,
    yield_change_bps_base: yieldChangeBase,
    yield_change_bps_bull: yieldChangeBase - 30,
    regime_base: regimeBase,
    regime_probability_buyer_opportunity: regimeProbs.buyer_opportunity,
    regime_probability_balanced: regimeProbs.balanced,
    regime_probability_seller_premium: regimeProbs.seller_premium,
    regime_probability_correction: regimeProbs.correction,
    liquidity_score_base: Math.max(20, Math.min(90, 64 + Math.round(base))),
    liquidity_score_low: Math.max(15, Math.min(90, 64 + Math.round(base) - 10)),
    liquidity_score_high: Math.max(25, Math.min(95, 64 + Math.round(base) + 10)),
    top_causal_factors: [
      { factor: 'ECB policy rate', contribution_pct: Math.abs(ratePress) > 0.5 ? 40 : 10 },
      { factor: 'Demand inflows (DE+UK)', contribution_pct: Math.abs(demand) > 0.5 ? 30 : 15 },
      { factor: 'Supply constraints', contribution_pct: Math.abs(supply) > 0.5 ? 20 : 10 },
      { factor: 'Macro (GDP + inflation)', contribution_pct: 15 },
    ],
    confidence_overall: 67 + (Math.abs(base) < 2 ? 8 : 0),
    claude_interpretation: `Base case for ${market} at ${horizon}-month horizon shows ${base >= 0 ? 'appreciation' : 'compression'} of ${base}%. Regime most likely ${regimeBase}. Primary driver: ${Math.abs(ratePress) > Math.abs(demand) ? 'monetary policy' : 'demographic inflows'}. Note: this is a SCAFFOLD output; production Claude simulation replaces this stub.`,
  };
}

export async function POST(req: NextRequest) {
  if (!supabase) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  try {
    const body: ScenarioInput = await req.json();
    const markets = (body.target_markets ?? ['Costa Blanca']).slice(0, 10);
    const horizon = body.horizon_months ?? 24;
    const scenario_id = `SCEN-${Date.now()}-${randomUUID().slice(0, 8)}`;

    const { error: insertErr } = await supabase.from('genesis_scenarios').insert({
      scenario_id,
      title: body.title ?? 'Custom scenario',
      description: body.description ?? null,
      ecb_rate_change_bps: body.ecb_rate_change_bps ?? 0,
      spain_regulatory_change: body.spain_regulatory_change ?? null,
      german_migration_delta_pct: body.german_migration_delta_pct ?? 0,
      uk_buyer_delta_pct: body.uk_buyer_delta_pct ?? 0,
      construction_supply_delta_pct: body.construction_supply_delta_pct ?? 0,
      remote_work_adoption_delta_pct: body.remote_work_adoption_delta_pct ?? 0,
      eu_gdp_growth_pct: body.eu_gdp_growth_pct ?? 2.1,
      inflation_delta_pct: body.inflation_delta_pct ?? 0,
      target_markets: markets,
      horizon_months: horizon,
      status: 'running',
    });
    if (insertErr) return NextResponse.json({ ok: false, error: insertErr.message }, { status: 500 });

    // Simulate every market at every horizon (12/24/36 if not specified)
    const horizons = [12, 24, 36];
    const outputs = [];
    for (const m of markets) {
      for (const h of horizons) {
        outputs.push({ scenario_id, ...mockSimulate(body, m, h) });
      }
    }
    await supabase.from('genesis_outputs').insert(outputs);
    await supabase.from('genesis_scenarios').update({ status: 'complete', completed_at: new Date().toISOString() }).eq('scenario_id', scenario_id);

    return NextResponse.json({
      ok: true,
      scenario_id,
      markets,
      horizons,
      outputs_count: outputs.length,
      outputs: outputs.filter((o) => o.horizon_months === 24),
      note: 'SCAFFOLD: mock simulation. Real Claude-driven causal simulation in next ship.',
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
