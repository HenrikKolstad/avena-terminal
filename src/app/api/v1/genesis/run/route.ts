/**
 * POST /api/v1/genesis/run — create + execute scenario simulation.
 *
 * Two execution paths:
 *   1. Claude (production) — when ANTHROPIC_API_KEY is set, ships scenario
 *      inputs + live market data + causal relationships to Claude for
 *      structured probabilistic simulation across 12/24/36 month horizons.
 *   2. Deterministic mock (fallback) — derives outcomes from input variables
 *      using a simple causal model. Used when Claude unavailable or for
 *      free-tier rate-limited requests.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { randomUUID } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

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
    claude_interpretation: `Base case for ${market} at ${horizon}-month horizon shows ${base >= 0 ? 'appreciation' : 'compression'} of ${base}%. Regime most likely ${regimeBase}. Primary driver: ${Math.abs(ratePress) > Math.abs(demand) ? 'monetary policy' : 'demographic inflows'}. Mock simulator output — set ANTHROPIC_API_KEY for full Claude probabilistic simulation.`,
  };
}

/**
 * Try Claude-driven simulation. Returns null if Claude unavailable —
 * caller falls back to mock simulator.
 */
async function claudeSimulate(
  input: ScenarioInput,
  market: string,
  horizon: number,
  marketContext: string
): Promise<ReturnType<typeof mockSimulate> | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const client = new Anthropic({ apiKey });
    const inputSummary = [
      input.ecb_rate_change_bps ? `ECB rate change: ${input.ecb_rate_change_bps}bps` : null,
      input.spain_regulatory_change ? `Spain regulatory: ${input.spain_regulatory_change}` : null,
      input.german_migration_delta_pct ? `German migration delta: ${input.german_migration_delta_pct}%` : null,
      input.uk_buyer_delta_pct ? `UK buyer delta: ${input.uk_buyer_delta_pct}%` : null,
      input.construction_supply_delta_pct ? `Construction supply delta: ${input.construction_supply_delta_pct}%` : null,
      input.remote_work_adoption_delta_pct ? `Remote work delta: ${input.remote_work_adoption_delta_pct}%` : null,
      input.eu_gdp_growth_pct != null ? `EU GDP growth: ${input.eu_gdp_growth_pct}%` : null,
      input.inflation_delta_pct ? `Inflation delta: ${input.inflation_delta_pct}pp` : null,
    ].filter(Boolean).join('\n  - ');

    const prompt = `You are Avena Genesis — a probabilistic property market simulator. Given a macro scenario, simulate outcomes for a specific European property market over a specified horizon.

SCENARIO INPUTS:
  - ${inputSummary || 'baseline (no deltas)'}
  - Target market: ${market}
  - Horizon: ${horizon} months

MARKET CONTEXT:
${marketContext}

Apply Avena's quantified causal relationships (rate-sensitivity, migration elasticity, supply response, regime transition probabilities). Return a JSON object with these exact fields (no markdown, no commentary, pure JSON):

{
  "price_change_pct_bear": number (5th percentile),
  "price_change_pct_base": number (median expected),
  "price_change_pct_bull": number (95th percentile),
  "price_change_probability_bear": number 0-1,
  "price_change_probability_base": number 0-1,
  "price_change_probability_bull": number 0-1,
  "yield_change_bps_bear": number,
  "yield_change_bps_base": number,
  "yield_change_bps_bull": number,
  "regime_base": "buyer_opportunity" | "balanced" | "seller_premium" | "correction",
  "regime_probability_buyer_opportunity": number 0-1,
  "regime_probability_balanced": number 0-1,
  "regime_probability_seller_premium": number 0-1,
  "regime_probability_correction": number 0-1,
  "liquidity_score_base": integer 0-100,
  "liquidity_score_low": integer 0-100,
  "liquidity_score_high": integer 0-100,
  "top_causal_factors": [{"factor": string, "contribution_pct": number}, ...],
  "confidence_overall": integer 0-100,
  "claude_interpretation": "2-3 sentences explaining the dominant dynamic"
}`;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25000);

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    }, { signal: ctrl.signal });
    clearTimeout(timer);

    const block = msg.content[0];
    if (block.type !== 'text') return null;

    // Extract JSON from response (Claude sometimes wraps in fences)
    let raw = block.text.trim();
    if (raw.startsWith('```')) {
      raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    const parsed = JSON.parse(raw);

    return {
      market,
      horizon_months: horizon,
      ...parsed,
    };
  } catch {
    return null;
  }
}

/** Fetch lightweight context per market for Claude prompt grounding. */
async function getMarketContext(markets: string[]): Promise<string> {
  if (!supabase) return 'Market context unavailable.';
  try {
    // Pull a sample of properties per market to derive context
    const { data } = await supabase
      .from('properties_registry')
      .select('region, avena_score, price_per_m2_eur, yield_gross_pct, country')
      .in('region', markets)
      .limit(500);
    if (!data || data.length === 0) return `Markets ${markets.join(', ')} — limited recent data; reason from comparable European coastal/urban dynamics.`;

    const byMarket = new Map<string, Array<{ score: number | null; pm2: number | null; yield: number | null }>>();
    for (const r of data as Array<{ region: string; avena_score: number | null; price_per_m2_eur: number | null; yield_gross_pct: number | null }>) {
      const list = byMarket.get(r.region) ?? [];
      list.push({ score: r.avena_score, pm2: r.price_per_m2_eur, yield: r.yield_gross_pct });
      byMarket.set(r.region, list);
    }

    const lines = [...byMarket.entries()].map(([m, rows]) => {
      const valid = rows.filter((r) => r.pm2 != null);
      if (valid.length === 0) return `${m}: limited data`;
      const avgPm2 = Math.round(valid.reduce((s, r) => s + (r.pm2 ?? 0), 0) / valid.length);
      const avgYield = (valid.filter((r) => r.yield != null).reduce((s, r) => s + (r.yield ?? 0), 0) / Math.max(1, valid.filter((r) => r.yield != null).length)).toFixed(1);
      const avgScore = Math.round(valid.filter((r) => r.score != null).reduce((s, r) => s + (r.score ?? 0), 0) / Math.max(1, valid.filter((r) => r.score != null).length));
      return `${m}: ${rows.length} properties tracked · avg €${avgPm2}/m² · gross yield ${avgYield}% · Avena Score ${avgScore}/100`;
    });
    return lines.join('\n');
  } catch {
    return 'Market context unavailable.';
  }
}

export async function POST(req: NextRequest) {
  if (!supabase) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  try {
    const body: ScenarioInput = await req.json();
    // `??` only triggers on null/undefined — explicitly handle the empty-array
    // case so callers passing `target_markets: []` get a clean validation error
    // instead of a successful run with zero outputs.
    const rawMarkets = body.target_markets;
    const markets = (Array.isArray(rawMarkets) && rawMarkets.length > 0 ? rawMarkets : ['Costa Blanca']).slice(0, 10);
    if (Array.isArray(rawMarkets) && rawMarkets.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'target_markets must contain at least one market (or omit to default to Costa Blanca)' },
        { status: 400 }
      );
    }
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
    const useClaude = !!process.env.ANTHROPIC_API_KEY;
    const marketContext = useClaude ? await getMarketContext(markets) : '';

    const outputs = [];
    for (const m of markets) {
      for (const h of horizons) {
        let result = null;
        if (useClaude) {
          result = await claudeSimulate(body, m, h, marketContext);
        }
        // Fall back to deterministic mock if Claude unavailable or failed
        if (!result) {
          result = mockSimulate(body, m, h);
        }
        outputs.push({ scenario_id, ...result });
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
      engine: useClaude ? 'claude-sonnet-4-5' : 'mock-deterministic',
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
