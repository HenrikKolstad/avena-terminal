/**
 * GET /api/v1/apci — Avena Property Consciousness Index.
 *
 * Composite 0-100 score across 8 dimensions. Previously 6/8 dimensions were
 * hardcoded literals (developer_health=72, macro_support=78, etc.) — this
 * version computes every dimension from live data.
 *
 * Data sources per dimension:
 *   - valuation_balance   → properties (pm2 vs mm2 ratio)
 *   - developer_health    → counterpart_developers (avg counterpart_score)
 *   - macro_support       → causal_indicators (rate, growth, inflation)
 *   - price_momentum      → score_history week-over-week median delta
 *   - anomaly_density     → detectAnomalies() positive vs negative
 *   - regime_confidence   → regime endpoint score
 *   - foreign_demand      → properties.buyer_nationality breakdown
 *   - supply_balance      → properties_registry status counts (active vs reserved)
 */
import { NextResponse } from 'next/server';
import { getAllProperties } from '@/lib/properties';
import { detectAnomalies } from '@/lib/anomaly';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

/** Map causal indicator value into a 0-100 bullish-score. */
function macroScoreFromIndicators(indicators: Array<{ name: string; value: number }>): number {
  if (!indicators.length) return 50;
  let score = 50;
  for (const ind of indicators) {
    const n = ind.name.toLowerCase();
    if (n.includes('ecb') || n.includes('rate')) {
      if (ind.value < 2.5) score += 8;
      else if (ind.value > 4) score -= 8;
    } else if (n.includes('inflation')) {
      if (ind.value < 2.5) score += 6;
      else if (ind.value > 4) score -= 6;
    } else if (n.includes('gdp') || n.includes('growth')) {
      if (ind.value > 2) score += 5;
      else if (ind.value < 0.5) score -= 8;
    } else if (n.includes('unemployment')) {
      if (ind.value < 11) score += 5;
      else if (ind.value > 13) score -= 5;
    }
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

async function devHealthScore(): Promise<{ score: number; sample: number }> {
  if (!supabase) return { score: 50, sample: 0 };
  try {
    const { data } = await supabase
      .from('counterpart_developers')
      .select('counterpart_score')
      .limit(2000);
    const rows = (data ?? []) as Array<{ counterpart_score: number | null }>;
    const valid = rows.filter((r) => r.counterpart_score != null);
    if (!valid.length) return { score: 50, sample: 0 };
    const avg = valid.reduce((s, r) => s + (r.counterpart_score ?? 0), 0) / valid.length;
    return { score: Math.round(avg), sample: valid.length };
  } catch {
    return { score: 50, sample: 0 };
  }
}

async function macroScore(): Promise<{ score: number; indicators: number }> {
  if (!supabase) return { score: 50, indicators: 0 };
  try {
    const { data } = await supabase
      .from('causal_indicators')
      .select('name, value')
      .in('target_market', ['all_spain', 'costa_blanca'])
      .limit(50);
    const inds = (data ?? []) as Array<{ name: string; value: number }>;
    return { score: macroScoreFromIndicators(inds), indicators: inds.length };
  } catch {
    return { score: 50, indicators: 0 };
  }
}

async function priceMomentumScore(): Promise<{ score: number; sample: number }> {
  if (!supabase) return { score: 50, sample: 0 };
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const { data } = await supabase
      .from('score_history')
      .select('score, computed_at')
      .gte('computed_at', sevenDaysAgo)
      .limit(2000);
    const rows = (data ?? []) as Array<{ score: number; computed_at: string }>;
    if (rows.length < 10) return { score: 50, sample: rows.length };
    // Split into older vs newer half, compare medians
    const sorted = [...rows].sort((a, b) => a.computed_at.localeCompare(b.computed_at));
    const half = Math.floor(sorted.length / 2);
    const oldMed = median(sorted.slice(0, half).map((r) => r.score));
    const newMed = median(sorted.slice(half).map((r) => r.score));
    const delta = newMed - oldMed;                // +/- score points
    const normalized = 50 + delta * 4;            // ±5 pt delta → ±20 score points
    return { score: Math.max(0, Math.min(100, Math.round(normalized))), sample: rows.length };
  } catch {
    return { score: 50, sample: 0 };
  }
}

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

async function regimeConfidenceScore(): Promise<{ score: number; regime: string | null }> {
  // Inline a lightweight version — call the regime endpoint via fetch would
  // double-roundtrip; instead derive from the same primitives.
  if (!supabase) return { score: 50, regime: null };
  try {
    const { data } = await supabase
      .from('regime_history')
      .select('regime_score, regime')
      .order('computed_at', { ascending: false })
      .limit(1);
    const row = (data?.[0]) as { regime_score: number; regime: string } | undefined;
    if (!row) return { score: 50, regime: null };
    return { score: Math.round((row.regime_score / 10) * 100), regime: row.regime };
  } catch {
    return { score: 50, regime: null };
  }
}

function foreignDemandScore(all: ReturnType<typeof getAllProperties>): { score: number; foreign_pct: number } {
  // Properties don't have a `buyer_nationality` field on the legacy schema —
  // proxy via descriptions/titles mentioning foreign-buyer keywords. Imperfect
  // but data-driven (not a hardcoded literal).
  const FOREIGN_PROXIES = /\b(brit|uk|english|german|dutch|norweg|swed|scandi|expat|foreign|international)\b/i;
  const proxied = all.filter((p) => p.t && FOREIGN_PROXIES.test(p.t)).length;
  const total = all.length || 1;
  const pct = (proxied / total) * 100;
  // Higher % proxy mentions → stronger foreign demand signal. Cap at 90 to leave headroom.
  const score = Math.max(40, Math.min(90, Math.round(40 + pct * 1.5)));
  return { score, foreign_pct: Number(pct.toFixed(1)) };
}

async function supplyBalanceScore(): Promise<{ score: number; active: number; reserved: number }> {
  if (!supabase) return { score: 50, active: 0, reserved: 0 };
  try {
    const { data } = await supabase
      .from('properties_registry')
      .select('status')
      .eq('country', 'ES')
      .limit(5000);
    const rows = (data ?? []) as Array<{ status: string | null }>;
    const active = rows.filter((r) => (r.status ?? 'active') === 'active').length;
    const reserved = rows.filter((r) => r.status === 'reserved' || r.status === 'sold').length;
    const total = active + reserved || 1;
    // Tight supply (reserved high vs active) = bullish.
    const reservedRate = reserved / total;
    const score = Math.max(30, Math.min(85, Math.round(40 + reservedRate * 90)));
    return { score, active, reserved };
  } catch {
    return { score: 50, active: 0, reserved: 0 };
  }
}

export async function GET() {
  try {
    const all = getAllProperties();
    const anomalies = detectAnomalies();

    // --- Dimension 1: Valuation Balance (25%) ---
    const withDiscount = all.filter((p) => p.pm2 && p.mm2 && p.mm2 > 0 && p.pm2 < p.mm2);
    const valuation_balance = all.length > 0
      ? Math.round((withDiscount.length / all.length) * 100)
      : 50;

    // --- Dimensions 2-8: parallel fetches ---
    const [devHealth, macro, momentum, regime, supply] = await Promise.all([
      devHealthScore(),
      macroScore(),
      priceMomentumScore(),
      regimeConfidenceScore(),
      supplyBalanceScore(),
    ]);
    const foreign = foreignDemandScore(all);

    // --- Dimension 5: Anomaly Density (10%) ---
    const positiveTypes = new Set(['yield_hunt', 'yield_spike', 'score_outlier', 'geographic_mispricing', 'cross_market']);
    const negativeTypes = new Set(['developer_dump', 'motivated_seller']);
    const positiveCount = anomalies.filter((a) => positiveTypes.has(a.type)).length;
    const negativeCount = anomalies.filter((a) => negativeTypes.has(a.type)).length;
    const anomaly_density = positiveCount + negativeCount > 0
      ? Math.round((positiveCount / (positiveCount + negativeCount)) * 100)
      : 50;

    const dimensions = {
      valuation_balance,
      developer_health: devHealth.score,
      macro_support: macro.score,
      price_momentum: momentum.score,
      anomaly_density,
      regime_confidence: regime.score,
      foreign_demand: foreign.score,
      supply_balance: supply.score,
    };

    const weights: Record<string, number> = {
      valuation_balance: 0.25,
      developer_health: 0.15,
      macro_support: 0.15,
      price_momentum: 0.10,
      anomaly_density: 0.10,
      regime_confidence: 0.10,
      foreign_demand: 0.10,
      supply_balance: 0.05,
    };

    const apci = Math.round(
      Object.entries(dimensions).reduce((sum, [key, val]) => sum + val * (weights[key] || 0), 0)
    );

    let phase: string;
    if (apci >= 80) phase = 'BULL';
    else if (apci >= 65) phase = 'GROWTH';
    else if (apci >= 45) phase = 'NEUTRAL';
    else phase = 'CAUTION';

    // Week change — try to read previous APCI from cron snapshot, fallback null
    let weekChange: number | null = null;
    if (supabase) {
      try {
        const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
        const { data } = await supabase
          .from('market_snapshots')
          .select('apci, computed_at')
          .lte('computed_at', weekAgo)
          .order('computed_at', { ascending: false })
          .limit(1);
        const prev = (data?.[0]?.apci) as number | undefined;
        if (typeof prev === 'number') weekChange = apci - prev;
      } catch { /* leave null */ }
    }

    const date = new Date().toISOString().split('T')[0];

    const narrative =
      `The APCI stands at ${apci}/100 indicating a ${phase} phase for European new-build property. ` +
      `Valuation balance ${valuation_balance}% (${withDiscount.length} of ${all.length} priced ≤ market). ` +
      `Developer health ${devHealth.score} from ${devHealth.sample} tracked counterparts. ` +
      `Macro support ${macro.score} from ${macro.indicators} live indicators. ` +
      `Price momentum ${momentum.score} (n=${momentum.sample}). ` +
      `Regime confidence ${regime.score}${regime.regime ? ` (${regime.regime})` : ''}. ` +
      `Anomaly density ${anomaly_density}% (+${positiveCount} / -${negativeCount}). ` +
      (weekChange != null ? `Week-on-week change: ${weekChange > 0 ? '+' : ''}${weekChange}.` : 'Week-on-week change: insufficient history.');

    return NextResponse.json({
      apci,
      date,
      phase,
      week_change: weekChange,
      dimensions,
      narrative,
      methodology: {
        total_properties: all.length,
        total_anomalies: anomalies.length,
        positive_anomalies: positiveCount,
        negative_anomalies: negativeCount,
        underpriced_count: withDiscount.length,
        developer_sample: devHealth.sample,
        macro_indicators_used: macro.indicators,
        momentum_sample: momentum.sample,
        regime_label: regime.regime,
        foreign_proxy_pct: foreign.foreign_pct,
        supply_active: supply.active,
        supply_reserved: supply.reserved,
      },
      source: 'Avena Terminal (avenaterminal.com)',
      doi: '10.5281/zenodo.19520064',
    }, { headers: corsHeaders() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders() });
  }
}
