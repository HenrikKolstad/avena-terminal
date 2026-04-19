/**
 * Avena Prediction Ledger — library layer.
 *
 * Central types, accuracy scoring, leaderboard recompute.
 *
 * Agent Nostradamus (cron/predictions/generate) calls generateDaily().
 * Agent Arbiter     (cron/predictions/verify)   calls verifyDue().
 */

import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '@/lib/supabase';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg } from '@/lib/properties';

export type PredictionType =
  | 'price_change'
  | 'yield_change'
  | 'time_to_sell'
  | 'volume_change'
  | 'market_call';

export interface Prediction {
  id: string;
  prediction_type: PredictionType;
  target: string;
  metric: string;
  current_value: number;
  predicted_value: number;
  predicted_change_pct: number;
  confidence: number;
  horizon_days: number;
  reasoning: string;
  submitter: string;
  submitter_type: 'avena' | 'ai_system' | 'analyst';
  status: 'active' | 'pending' | 'verified' | 'expired';
  published_at: string;
  verify_at: string;
  created_at: string;
}

export interface PredictionOutcome {
  id: string;
  prediction_id: string;
  actual_value: number;
  actual_change_pct: number;
  accuracy_score: number;
  within_tolerance: boolean;
  verified_at: string;
  notes: string | null;
}

export interface LeaderboardRow {
  submitter_name: string;
  submitter_type: string;
  total_predictions: number;
  verified_predictions: number;
  avg_accuracy: number;
  perfect_calls: number;
  close_calls: number;
  last_updated: string;
}

/* -------------------------------------------------------------------------- */
/* Accuracy scoring                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Accuracy score based on abs delta between predicted_value and actual_value
 * (as % of actual). Within-tolerance = 2% delta.
 *
 *  < 1%   → 100 (perfect)
 *  < 2%   → 85  (tolerant)
 *  < 5%   → 65  (close)
 *  < 10%  → 40  (directional)
 *  >= 10% → 10  (missed)
 */
export function scoreAccuracy(predictedValue: number, actualValue: number): {
  accuracy: number;
  within_tolerance: boolean;
  abs_delta_pct: number;
} {
  if (!actualValue || actualValue === 0) {
    return { accuracy: 0, within_tolerance: false, abs_delta_pct: 100 };
  }
  const absDeltaPct = Math.abs((predictedValue - actualValue) / actualValue) * 100;
  let accuracy = 10;
  if (absDeltaPct < 1) accuracy = 100;
  else if (absDeltaPct < 2) accuracy = 85;
  else if (absDeltaPct < 5) accuracy = 65;
  else if (absDeltaPct < 10) accuracy = 40;
  return {
    accuracy,
    within_tolerance: absDeltaPct < 2,
    abs_delta_pct: Number(absDeltaPct.toFixed(2)),
  };
}

/* -------------------------------------------------------------------------- */
/* Live market snapshot — feeds Claude with current state                     */
/* -------------------------------------------------------------------------- */

export interface MarketSnapshot {
  total_properties: number;
  avg_price_eur: number;
  avg_price_per_m2: number;
  avg_yield_gross_pct: number;
  avg_score: number;
  per_costa: Array<{
    costa: string;
    count: number;
    avg_price_per_m2: number;
    avg_yield_gross_pct: number;
    avg_score: number;
  }>;
  top_towns: Array<{
    town: string;
    count: number;
    avg_price_per_m2: number;
    avg_yield_gross_pct: number;
  }>;
}

export function currentMarketSnapshot(): MarketSnapshot {
  const all = getAllProperties();
  const costas = getUniqueCostas();
  const towns = getUniqueTowns();

  const avgPrice = Math.round(avg(all.map(p => p.pf)));
  const pm2s = all.filter(p => p.pm2).map(p => p.pm2!);
  const avgPm2 = Math.round(avg(pm2s));
  const yields = all.filter(p => p._yield?.gross).map(p => p._yield!.gross);
  const avgYield = Number(avg(yields).toFixed(2));
  const scores = all.filter(p => p._sc).map(p => p._sc!);
  const avgScore = Math.round(avg(scores));

  const perCosta = costas.map(c => {
    const cp = all.filter(p => p.costa === c.costa);
    return {
      costa: c.costa,
      count: cp.length,
      avg_price_per_m2: Math.round(avg(cp.filter(p => p.pm2).map(p => p.pm2!))),
      avg_yield_gross_pct: Number(avg(cp.filter(p => p._yield?.gross).map(p => p._yield!.gross)).toFixed(2)),
      avg_score: Math.round(avg(cp.filter(p => p._sc).map(p => p._sc!))),
    };
  });

  const topTowns = towns.slice(0, 20).map(t => ({
    town: t.town,
    count: t.count,
    avg_price_per_m2: 0,
    avg_yield_gross_pct: Number(t.avgYield),
  }));
  // Enrich with actual pm2 from data
  for (const tt of topTowns) {
    const tp = all.filter(p => p.l === tt.town);
    tt.avg_price_per_m2 = Math.round(avg(tp.filter(p => p.pm2).map(p => p.pm2!)));
  }

  return {
    total_properties: all.length,
    avg_price_eur: avgPrice,
    avg_price_per_m2: avgPm2,
    avg_yield_gross_pct: avgYield,
    avg_score: avgScore,
    per_costa: perCosta,
    top_towns: topTowns,
  };
}

/* -------------------------------------------------------------------------- */
/* Agent Nostradamus — generate 10 daily predictions via Claude               */
/* -------------------------------------------------------------------------- */

interface ClaudePrediction {
  prediction_type: PredictionType;
  target: string;
  metric: string;
  current_value: number;
  predicted_value: number;
  predicted_change_pct: number;
  confidence: number;
  reasoning: string;
}

export async function generateDaily(): Promise<{
  generated: number;
  inserted: number;
  errors: string[];
}> {
  const errors: string[] = [];
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    errors.push('missing ANTHROPIC_API_KEY');
    return { generated: 0, inserted: 0, errors };
  }
  if (!supabase) {
    errors.push('missing supabase');
    return { generated: 0, inserted: 0, errors };
  }

  const snapshot = currentMarketSnapshot();
  const client = new Anthropic({ apiKey });

  const prompt = `You are Avena's prediction engine — the world's first public property-AI accuracy benchmark.

CURRENT LIVE MARKET DATA (${new Date().toISOString().slice(0, 10)}):
- ${snapshot.total_properties} tracked new-build properties across Spain's coasts
- Avg price: €${snapshot.avg_price_eur.toLocaleString()}
- Avg price / m²: €${snapshot.avg_price_per_m2.toLocaleString()}
- Avg gross yield: ${snapshot.avg_yield_gross_pct}%
- Avg Avena Score: ${snapshot.avg_score}/100

Per costa:
${snapshot.per_costa.map(c => `  · ${c.costa}: ${c.count} properties, €${c.avg_price_per_m2}/m², ${c.avg_yield_gross_pct}% yield, score ${c.avg_score}`).join('\n')}

Top 10 towns by volume:
${snapshot.top_towns.slice(0, 10).map(t => `  · ${t.town}: ${t.count} properties, €${t.avg_price_per_m2}/m², ${t.avg_yield_gross_pct}% yield`).join('\n')}

TASK: Generate exactly 10 specific, falsifiable Spanish property market predictions for the next 365 days.

Requirements:
1. Each prediction MUST be measurable against future Avena data.
2. Mix prediction_type across: price_change, yield_change, time_to_sell, volume_change, market_call.
3. Mix targets across different costas + towns (not all Torrevieja).
4. Valid metrics: price_per_m2, yield_gross, days_to_sellout, inventory_count, apci, transaction_volume.
5. current_value must be a sensible number derived from the live data above.
6. predicted_change_pct must be realistic (typically -15% to +15% on 1-year horizon).
7. confidence 0-100 (be honest — rare calls can have high conviction, most should be 55-75).
8. reasoning: EXACTLY 2 sentences. Data-grounded. No hype.

Return ONLY valid JSON (no prose, no markdown fences):

{
  "predictions": [
    {
      "prediction_type": "price_change",
      "target": "Torrevieja new builds",
      "metric": "price_per_m2",
      "current_value": 2650,
      "predicted_value": 2870,
      "predicted_change_pct": 8.3,
      "confidence": 72,
      "reasoning": "First sentence establishing the causal thesis. Second sentence grounding in specific data."
    }
  ]
}`;

  let claudePredictions: ClaudePrediction[] = [];
  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 3500,
      messages: [{ role: 'user', content: prompt }],
    });
    const block = msg.content[0];
    const text = block.type === 'text' ? block.text : '';
    // Strip accidental code fences
    const jsonStr = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    const parsed: { predictions?: ClaudePrediction[] } = JSON.parse(jsonStr);
    claudePredictions = parsed.predictions || [];
  } catch (e) {
    errors.push(`claude_parse: ${e instanceof Error ? e.message : 'unknown'}`);
    return { generated: 0, inserted: 0, errors };
  }

  const verifyAt = new Date(Date.now() + 365 * 86400_000).toISOString();
  let inserted = 0;

  for (const p of claudePredictions.slice(0, 10)) {
    try {
      // Sanity filter — reject malformed rows
      if (!p.target || !p.metric || !Number.isFinite(p.current_value) || !Number.isFinite(p.predicted_value)) {
        errors.push(`malformed: ${JSON.stringify(p).slice(0, 100)}`);
        continue;
      }
      const { error } = await supabase.from('predictions').insert({
        prediction_type: p.prediction_type,
        target: p.target,
        metric: p.metric,
        current_value: p.current_value,
        predicted_value: p.predicted_value,
        predicted_change_pct: Number((p.predicted_change_pct || 0).toFixed(2)),
        confidence: Math.max(0, Math.min(100, Math.round(p.confidence || 60))),
        horizon_days: 365,
        reasoning: (p.reasoning || '').slice(0, 2000),
        submitter: 'avena',
        submitter_type: 'avena',
        status: 'active',
        verify_at: verifyAt,
      });
      if (error) {
        errors.push(`insert: ${error.message}`);
      } else {
        inserted++;
      }
    } catch (e) {
      errors.push(`row: ${e instanceof Error ? e.message : 'unknown'}`);
    }
  }

  // Upsert leaderboard totals for avena
  try {
    const { count } = await supabase
      .from('predictions')
      .select('*', { count: 'exact', head: true })
      .eq('submitter', 'avena');
    await supabase
      .from('prediction_leaderboard')
      .upsert(
        {
          submitter_name: 'avena',
          submitter_type: 'avena',
          total_predictions: count ?? 0,
          last_updated: new Date().toISOString(),
        },
        { onConflict: 'submitter_name' }
      );
  } catch (e) {
    errors.push(`leaderboard_upsert: ${e instanceof Error ? e.message : 'unknown'}`);
  }

  return { generated: claudePredictions.length, inserted, errors };
}

/* -------------------------------------------------------------------------- */
/* Agent Arbiter — verify due predictions                                      */
/* -------------------------------------------------------------------------- */

/**
 * For a prediction, find the current "actual" value in our live dataset.
 * Strategy: approximate by recomputing the same metric on the current
 * snapshot. For exotic metrics we fall back to the prediction's current_value
 * as the proxy (score 0).
 */
function actualValueFor(prediction: Prediction, snapshot: MarketSnapshot): number | null {
  const target = prediction.target.toLowerCase();
  const metric = prediction.metric;

  // Town match
  const town = snapshot.top_towns.find(t => target.includes(t.town.toLowerCase()));
  if (town) {
    if (metric === 'price_per_m2') return town.avg_price_per_m2;
    if (metric === 'yield_gross') return town.avg_yield_gross_pct;
  }

  // Costa match
  const costa = snapshot.per_costa.find(c =>
    target.includes(c.costa.toLowerCase()) || c.costa.toLowerCase().includes(target)
  );
  if (costa) {
    if (metric === 'price_per_m2') return costa.avg_price_per_m2;
    if (metric === 'yield_gross') return costa.avg_yield_gross_pct;
    if (metric === 'apci') return costa.avg_score;
  }

  // Fall through — national average
  if (metric === 'price_per_m2') return snapshot.avg_price_per_m2;
  if (metric === 'yield_gross') return snapshot.avg_yield_gross_pct;
  if (metric === 'apci') return snapshot.avg_score;

  return null;
}

export async function verifyDue(): Promise<{
  candidates: number;
  verified: number;
  errors: string[];
}> {
  const errors: string[] = [];
  if (!supabase) {
    errors.push('missing supabase');
    return { candidates: 0, verified: 0, errors };
  }

  // Find due and still active predictions
  let due: Prediction[] = [];
  try {
    const { data } = await supabase
      .from('predictions')
      .select('*')
      .eq('status', 'active')
      .lte('verify_at', new Date().toISOString())
      .limit(200);
    if (data) due = data as unknown as Prediction[];
  } catch (e) {
    errors.push(`fetch_due: ${e instanceof Error ? e.message : 'unknown'}`);
    return { candidates: 0, verified: 0, errors };
  }

  if (due.length === 0) {
    return { candidates: 0, verified: 0, errors };
  }

  const snapshot = currentMarketSnapshot();
  let verified = 0;
  const touchedSubmitters = new Set<string>();

  for (const p of due) {
    try {
      const actual = actualValueFor(p, snapshot);
      if (actual == null) {
        errors.push(`no_actual_for: ${p.id} ${p.target}/${p.metric}`);
        continue;
      }
      const { accuracy, within_tolerance } = scoreAccuracy(p.predicted_value, actual);
      const actualChangePct = p.current_value === 0 ? 0 : Number((((actual - p.current_value) / p.current_value) * 100).toFixed(2));

      const { error: outcomeErr } = await supabase.from('prediction_outcomes').upsert(
        {
          prediction_id: p.id,
          actual_value: actual,
          actual_change_pct: actualChangePct,
          accuracy_score: accuracy,
          within_tolerance,
          verified_at: new Date().toISOString(),
          notes: 'Auto-verified by Agent Arbiter against Avena live snapshot',
        },
        { onConflict: 'prediction_id' }
      );
      if (outcomeErr) {
        errors.push(`outcome: ${outcomeErr.message}`);
        continue;
      }

      await supabase.from('predictions').update({ status: 'verified' }).eq('id', p.id);
      verified++;
      touchedSubmitters.add(p.submitter);
    } catch (e) {
      errors.push(`verify_row: ${e instanceof Error ? e.message : 'unknown'}`);
    }
  }

  // Recompute leaderboard for every affected submitter
  for (const submitter of touchedSubmitters) {
    try {
      await recomputeLeaderboard(submitter);
    } catch (e) {
      errors.push(`leaderboard: ${submitter} ${e instanceof Error ? e.message : ''}`);
    }
  }

  return { candidates: due.length, verified, errors };
}

export async function recomputeLeaderboard(submitter: string): Promise<void> {
  if (!supabase) return;

  // Gather all verified predictions + outcomes for this submitter
  const { data: preds } = await supabase
    .from('predictions')
    .select('id, submitter_type, status')
    .eq('submitter', submitter);

  const submitterType = (preds && preds[0] && preds[0].submitter_type) || 'analyst';
  const totalPredictions = preds?.length ?? 0;
  const verifiedPreds = (preds ?? []).filter(p => p.status === 'verified');
  const verifiedIds = verifiedPreds.map(p => p.id);

  let outcomes: Array<{ accuracy_score: number; within_tolerance: boolean }> = [];
  if (verifiedIds.length > 0) {
    const { data: oc } = await supabase
      .from('prediction_outcomes')
      .select('accuracy_score, within_tolerance, prediction_id')
      .in('prediction_id', verifiedIds);
    outcomes = (oc as Array<{ accuracy_score: number; within_tolerance: boolean }>) ?? [];
  }

  const verifiedCount = outcomes.length;
  const avgAccuracy = verifiedCount === 0 ? 0 : Math.round((outcomes.reduce((s, o) => s + o.accuracy_score, 0) / verifiedCount) * 100) / 100;
  const perfectCalls = outcomes.filter(o => o.accuracy_score >= 100).length;
  const closeCalls = outcomes.filter(o => o.within_tolerance).length;

  await supabase.from('prediction_leaderboard').upsert(
    {
      submitter_name: submitter,
      submitter_type: submitterType,
      total_predictions: totalPredictions,
      verified_predictions: verifiedCount,
      avg_accuracy: avgAccuracy,
      perfect_calls: perfectCalls,
      close_calls: closeCalls,
      last_updated: new Date().toISOString(),
    },
    { onConflict: 'submitter_name' }
  );
}
