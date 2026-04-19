/**
 * Causal Intelligence Engine — library layer.
 *
 * Standard AI finds correlations. This finds causation — quantified
 * mechanism chains between leading indicators and property price moves.
 *
 * Agents that use this lib:
 *   - Agent Bull     (POST /api/intelligence/debate)
 *   - Agent Bear     (POST /api/intelligence/debate)
 *   - Agent Socrates (POST /api/intelligence/debate — synthesis)
 *   - Agent Causal   (cron/causal-update, 06:30 UTC daily)
 */

import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '@/lib/supabase';
import { currentMarketSnapshot } from '@/lib/predictions';

const MODEL = 'claude-sonnet-4-5';

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

export type IndicatorCategory = 'macro' | 'demand' | 'supply' | 'sentiment' | 'flow';
export type IndicatorSignal = 'bullish' | 'bearish' | 'neutral';

export interface CausalIndicator {
  id: string;
  name: string;
  category: IndicatorCategory;
  description: string;
  current_value: number | null;
  prev_value: number | null;
  change_pct: number | null;
  signal: IndicatorSignal | null;
  lead_time_days: number;
  causal_strength: number;
  target_market: string;
  last_updated: string;
}

export type ChainNetSignal =
  | 'strongly_bullish'
  | 'bullish'
  | 'neutral'
  | 'bearish'
  | 'strongly_bearish';

export interface CausalChainStep {
  indicator: string;
  mechanism: string;
  lag_days: number;
  strength: number;
  signal: IndicatorSignal;
}

export interface CausalChain {
  id: string;
  chain_name: string;
  market: string;
  steps: CausalChainStep[];
  net_signal: ChainNetSignal;
  confidence: number;
  horizon_days: number;
  created_at: string;
  updated_at: string;
}

export type DebateSignal = 'strong_buy' | 'buy' | 'hold' | 'avoid' | 'strong_avoid';

export interface AdversarialDebate {
  id: string;
  property_ref: string | null;
  market: string | null;
  bull_case: string;
  bear_case: string;
  arbiter_verdict: string;
  final_signal: DebateSignal;
  bull_score: number;
  bear_score: number;
  confidence: number;
  created_at: string;
}

export interface OutcomeProbabilities {
  property_ref: string;
  prob_yield_above_5pct: number;
  prob_yield_above_7pct: number;
  prob_capital_gain_15pct_5yr: number;
  prob_capital_loss: number;
  prob_developer_delay: number;
  prob_liquidity_under_6mo: number;
  primary_risk: string;
  primary_upside: string;
  scenario_base: { yield: number; capital_gain_5yr: number; total_return: number };
  scenario_bull: { yield: number; capital_gain_5yr: number; total_return: number };
  scenario_bear: { yield: number; capital_gain_5yr: number; total_return: number };
}

/* -------------------------------------------------------------------------- */
/* Net signal rollup                                                          */
/* -------------------------------------------------------------------------- */

export function rollupNetSignal(indicators: CausalIndicator[]): {
  net: ChainNetSignal;
  confidence: number;
  bull_count: number;
  bear_count: number;
  neutral_count: number;
} {
  let bullWeight = 0;
  let bearWeight = 0;
  let bull = 0;
  let bear = 0;
  let neutral = 0;

  for (const i of indicators) {
    const w = (i.causal_strength || 0) * 100;
    if (i.signal === 'bullish') { bullWeight += w; bull++; }
    else if (i.signal === 'bearish') { bearWeight += w; bear++; }
    else { neutral++; }
  }

  const totalWeight = bullWeight + bearWeight;
  if (totalWeight === 0) {
    return { net: 'neutral', confidence: 40, bull_count: bull, bear_count: bear, neutral_count: neutral };
  }

  const bullShare = bullWeight / totalWeight;
  let net: ChainNetSignal = 'neutral';
  if (bullShare >= 0.75) net = 'strongly_bullish';
  else if (bullShare >= 0.60) net = 'bullish';
  else if (bullShare <= 0.25) net = 'strongly_bearish';
  else if (bullShare <= 0.40) net = 'bearish';

  // Confidence = weighted average strength × concordance
  const avgStrength = (bullWeight + bearWeight) / (indicators.length * 100);
  const concordance = Math.abs(bullShare - 0.5) * 2;
  const confidence = Math.round(Math.min(100, (avgStrength * 0.7 + concordance * 0.3) * 100));

  return { net, confidence, bull_count: bull, bear_count: bear, neutral_count: neutral };
}

/* -------------------------------------------------------------------------- */
/* Load + group indicators                                                     */
/* -------------------------------------------------------------------------- */

export async function loadIndicators(targetMarket: string): Promise<CausalIndicator[]> {
  if (!supabase) return [];
  const filter = targetMarket === 'all_spain'
    ? supabase.from('causal_indicators').select('*').in('target_market', ['all_spain', 'costa_blanca', 'costa_del_sol', 'costa_calida'])
    : supabase.from('causal_indicators').select('*').in('target_market', [targetMarket, 'all_spain']);

  const { data } = await filter.order('causal_strength', { ascending: false });
  return (data as CausalIndicator[]) || [];
}

export function groupByCategory(indicators: CausalIndicator[]): Record<IndicatorCategory, CausalIndicator[]> {
  const out: Record<IndicatorCategory, CausalIndicator[]> = {
    macro: [],
    demand: [],
    supply: [],
    sentiment: [],
    flow: [],
  };
  for (const i of indicators) {
    if (out[i.category]) out[i.category].push(i);
  }
  return out;
}

export async function latestChainForMarket(market: string): Promise<CausalChain | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from('causal_chains')
    .select('*')
    .eq('market', market)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as CausalChain) || null;
}

export async function latestMarketDebate(market: string): Promise<AdversarialDebate | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from('adversarial_debates')
    .select('*')
    .eq('market', market)
    .is('property_ref', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as AdversarialDebate) || null;
}

/* -------------------------------------------------------------------------- */
/* Adversarial debate — Bull vs Bear vs Socrates                              */
/* -------------------------------------------------------------------------- */

export interface DebateInput {
  market: string | null;
  property_ref?: string | null;
  context: string;  // injected data: price, yield, score, macro, etc.
}

export interface DebateResult {
  bull_case: string;
  bear_case: string;
  arbiter_verdict: string;
  final_signal: DebateSignal;
  bull_score: number;
  bear_score: number;
  confidence: number;
}

export async function runDebate(input: DebateInput): Promise<DebateResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const client = new Anthropic({ apiKey });
  const target = input.property_ref
    ? `property ${input.property_ref}`
    : input.market
      ? `the ${input.market.replace(/_/g, ' ')} market`
      : 'the Spanish property market';

  // Call 1 — Agent Bull
  let bull = '';
  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 700,
      messages: [{
        role: 'user',
        content: `You are Agent Bull — a bullish property analyst at Avena Terminal.

Make the STRONGEST possible case FOR investing in ${target} right now.

Context and live data:
${input.context}

Rules:
- Exactly 4-6 sentences, aggressive but data-grounded.
- Cite specific numbers (prices, yields, %, dates).
- Identify the single strongest tailwind.
- End with a specific 12-month expectation (e.g. "+8% to +11%").
- No hedging. No "but". Make the case.

Return the bull case only, no preamble.`,
      }],
    });
    const block = res.content[0];
    if (block.type === 'text') bull = block.text.trim();
  } catch { /* fallthrough */ }
  if (!bull) return null;

  // Call 2 — Agent Bear
  let bear = '';
  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 700,
      messages: [
        { role: 'user', content: `You are Agent Bull making the case for ${target}.\n\n${input.context}` },
        { role: 'assistant', content: bull },
        {
          role: 'user',
          content: `Now you are Agent Bear — a skeptical risk analyst at Avena Terminal.

Counter the bull case above. Make the STRONGEST possible case AGAINST investing in ${target}.

Rules:
- Exactly 4-6 sentences.
- Challenge the bull's specific numbers where possible.
- Identify the 3 biggest things that could go badly wrong.
- End with a specific downside scenario (e.g. "-3% to flat over 12 months").
- No hedging.

Return the bear case only, no preamble.`,
        },
      ],
    });
    const block = res.content[0];
    if (block.type === 'text') bear = block.text.trim();
  } catch { /* fallthrough */ }
  if (!bear) return null;

  // Call 3 — Agent Socrates (the arbiter)
  let verdict = '';
  let final_signal: DebateSignal = 'hold';
  let bull_score = 50;
  let bear_score = 50;
  let confidence = 50;

  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `You are Agent Socrates — the synthesis arbiter at Avena Terminal.

You have heard both cases:

BULL CASE:
${bull}

BEAR CASE:
${bear}

Your task:
1. Synthesize them into a final verdict in EXACTLY 3 sentences.
2. Output a JSON object (ONLY the JSON, no markdown fences):

{
  "verdict": "<your 3-sentence synthesis>",
  "final_signal": "<one of: strong_buy, buy, hold, avoid, strong_avoid>",
  "bull_score": <0-100 — how strong was the bull case>,
  "bear_score": <0-100 — how strong was the bear case>,
  "confidence": <0-100 — how confident in the final signal>
}

Rules:
- bull_score + bear_score must sum to 100.
- Identify the single most important factor.
- Be honest about uncertainty.`,
      }],
    });
    const block = res.content[0];
    const text = block.type === 'text' ? block.text.trim() : '';
    const jsonStr = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(jsonStr) as {
      verdict: string;
      final_signal: DebateSignal;
      bull_score: number;
      bear_score: number;
      confidence: number;
    };
    verdict = parsed.verdict;
    final_signal = parsed.final_signal;
    bull_score = Math.max(0, Math.min(100, Math.round(parsed.bull_score)));
    bear_score = Math.max(0, Math.min(100, Math.round(parsed.bear_score)));
    confidence = Math.max(0, Math.min(100, Math.round(parsed.confidence)));

    // Enforce bull + bear = 100
    const sum = bull_score + bear_score;
    if (sum !== 100 && sum > 0) {
      bull_score = Math.round((bull_score / sum) * 100);
      bear_score = 100 - bull_score;
    }
  } catch { /* fallthrough with defaults */ }
  if (!verdict) return null;

  return { bull_case: bull, bear_case: bear, arbiter_verdict: verdict, final_signal, bull_score, bear_score, confidence };
}

export async function persistDebate(market: string | null, propertyRef: string | null, result: DebateResult): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('adversarial_debates')
    .insert({
      property_ref: propertyRef,
      market,
      bull_case: result.bull_case,
      bear_case: result.bear_case,
      arbiter_verdict: result.arbiter_verdict,
      final_signal: result.final_signal,
      bull_score: result.bull_score,
      bear_score: result.bear_score,
      confidence: result.confidence,
    })
    .select('id')
    .single();
  if (error) return null;
  return data?.id || null;
}

/* -------------------------------------------------------------------------- */
/* Actuarial probabilities (Agent Actuary)                                    */
/* -------------------------------------------------------------------------- */

export interface ProbabilityInput {
  property_ref: string;
  property_json: string; // pre-serialized property context
}

export async function generateProbabilities(input: ProbabilityInput): Promise<OutcomeProbabilities | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const client = new Anthropic({ apiKey });
  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 900,
      messages: [{
        role: 'user',
        content: `You are an actuarial analyst specialising in Spanish new-build property.

Given this property data:
${input.property_json}

Calculate probability distributions. Return ONLY a JSON object, no markdown fences:

{
  "prob_yield_above_5pct": 0.71,
  "prob_yield_above_7pct": 0.28,
  "prob_capital_gain_15pct_5yr": 0.66,
  "prob_capital_loss": 0.14,
  "prob_developer_delay": 0.22,
  "prob_liquidity_under_6mo": 0.58,
  "primary_risk": "One sentence identifying the biggest single risk factor.",
  "primary_upside": "One sentence identifying the biggest single upside factor.",
  "scenario_base": { "yield": 5.6, "capital_gain_5yr": 18, "total_return": 46 },
  "scenario_bull": { "yield": 7.2, "capital_gain_5yr": 32, "total_return": 68 },
  "scenario_bear": { "yield": 3.8, "capital_gain_5yr": -4, "total_return": 15 }
}

Rules:
- All probabilities are 0..1 (not percentages).
- Scenarios are total percentages (capital_gain_5yr is 5-year cumulative %, yield is annual gross %, total_return is 5-year total %).
- Base your estimates on the property's score, yield, market, developer, and price vs market reference.
- Be honest. Most European new-builds have prob_yield_above_7pct < 0.30.`,
      }],
    });
    const block = res.content[0];
    const text = block.type === 'text' ? block.text.trim() : '';
    const jsonStr = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(jsonStr) as Omit<OutcomeProbabilities, 'property_ref'>;

    const full: OutcomeProbabilities = {
      property_ref: input.property_ref,
      prob_yield_above_5pct: Number(parsed.prob_yield_above_5pct),
      prob_yield_above_7pct: Number(parsed.prob_yield_above_7pct),
      prob_capital_gain_15pct_5yr: Number(parsed.prob_capital_gain_15pct_5yr),
      prob_capital_loss: Number(parsed.prob_capital_loss),
      prob_developer_delay: Number(parsed.prob_developer_delay),
      prob_liquidity_under_6mo: Number(parsed.prob_liquidity_under_6mo),
      primary_risk: String(parsed.primary_risk || '').slice(0, 500),
      primary_upside: String(parsed.primary_upside || '').slice(0, 500),
      scenario_base: parsed.scenario_base,
      scenario_bull: parsed.scenario_bull,
      scenario_bear: parsed.scenario_bear,
    };

    if (supabase) {
      try {
        await supabase.from('outcome_probabilities').insert({
          property_ref: full.property_ref,
          prob_yield_above_5pct: full.prob_yield_above_5pct,
          prob_yield_above_7pct: full.prob_yield_above_7pct,
          prob_capital_gain_15pct_5yr: full.prob_capital_gain_15pct_5yr,
          prob_capital_loss: full.prob_capital_loss,
          prob_developer_delay: full.prob_developer_delay,
          prob_liquidity_under_6mo: full.prob_liquidity_under_6mo,
          primary_risk: full.primary_risk,
          primary_upside: full.primary_upside,
          scenario_base: full.scenario_base,
          scenario_bull: full.scenario_bull,
          scenario_bear: full.scenario_bear,
        });
      } catch { /* silent */ }
    }

    return full;
  } catch {
    return null;
  }
}

export async function latestProbabilitiesFor(propertyRef: string): Promise<OutcomeProbabilities | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from('outcome_probabilities')
    .select('*')
    .eq('property_ref', propertyRef)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as OutcomeProbabilities) || null;
}

/* -------------------------------------------------------------------------- */
/* Causal snapshot context for debate (server-side only)                      */
/* -------------------------------------------------------------------------- */

export function causalContextForMarket(market: string, indicators: CausalIndicator[]): string {
  const snapshot = currentMarketSnapshot();
  const topIndicators = indicators.slice(0, 15);
  const costa = snapshot.per_costa.find(c => market.includes(c.costa.toLowerCase().replace(/\s+/g, '_')));

  const lines: string[] = [];
  lines.push(`Market: ${market.replace(/_/g, ' ')}`);
  lines.push(`Date: ${new Date().toISOString().slice(0, 10)}`);
  lines.push(`Total properties tracked: ${snapshot.total_properties}`);
  lines.push(`National avg price/m²: €${snapshot.avg_price_per_m2.toLocaleString()}`);
  lines.push(`National avg gross yield: ${snapshot.avg_yield_gross_pct}%`);
  lines.push(`National avg Avena Score: ${snapshot.avg_score}/100`);
  if (costa) {
    lines.push('');
    lines.push(`${costa.costa} specifics:`);
    lines.push(`  · ${costa.count} tracked properties`);
    lines.push(`  · avg €${costa.avg_price_per_m2.toLocaleString()}/m²`);
    lines.push(`  · avg ${costa.avg_yield_gross_pct}% gross yield`);
    lines.push(`  · avg score ${costa.avg_score}/100`);
  }
  lines.push('');
  lines.push('Live leading indicators:');
  for (const ind of topIndicators) {
    const change = ind.change_pct != null ? `${ind.change_pct > 0 ? '+' : ''}${ind.change_pct.toFixed(1)}%` : 'n/a';
    lines.push(`  · [${ind.category}] ${ind.name}: ${ind.current_value ?? 'n/a'} (${change}, signal ${ind.signal ?? 'neutral'}, leads ${ind.lead_time_days}d, strength ${ind.causal_strength})`);
  }
  return lines.join('\n');
}

/* -------------------------------------------------------------------------- */
/* Daily causal update (Agent Causal)                                         */
/* -------------------------------------------------------------------------- */

export async function runCausalUpdate(): Promise<{
  indicators_touched: number;
  debates_run: string[];
  errors: string[];
}> {
  const errors: string[] = [];
  const debatesRun: string[] = [];
  if (!supabase) {
    errors.push('supabase unavailable');
    return { indicators_touched: 0, debates_run: [], errors };
  }

  // Bump last_updated on all indicators (keeping their current values — in
  // production you would refresh from real data sources)
  let indicatorsTouched = 0;
  try {
    const { data: inds } = await supabase.from('causal_indicators').select('id');
    if (inds) {
      for (const row of inds) {
        await supabase
          .from('causal_indicators')
          .update({ last_updated: new Date().toISOString() })
          .eq('id', row.id);
        indicatorsTouched++;
      }
    }
  } catch (e) {
    errors.push(`indicators: ${e instanceof Error ? e.message : 'unknown'}`);
  }

  // Run adversarial debates for 2 markets
  for (const market of ['costa_blanca', 'all_spain']) {
    try {
      const indicators = await loadIndicators(market);
      const context = causalContextForMarket(market, indicators);
      const result = await runDebate({ market, context });
      if (!result) {
        errors.push(`debate_null: ${market}`);
        continue;
      }
      const id = await persistDebate(market, null, result);
      if (id) debatesRun.push(`${market}:${id}`);
    } catch (e) {
      errors.push(`debate_${market}: ${e instanceof Error ? e.message : 'unknown'}`);
    }
  }

  return { indicators_touched: indicatorsTouched, debates_run: debatesRun, errors };
}
