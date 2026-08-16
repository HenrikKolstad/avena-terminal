/**
 * GET /api/v1/apci — Avena Property Consciousness Index.
 *
 * Composite 0-100 score across 8 dimensions.
 *
 * HISTORY OF THIS FILE — read before "simplifying" any of it:
 *
 * v1 hardcoded 6 of 8 dimensions as literals. v2 replaced them with live
 * queries, but four of those queries were wrong and every one of them was
 * wrapped in a `catch` that returned a neutral 50. A broken query and a
 * genuinely neutral market produced byte-identical output, so the index
 * looked healthy while 40% of its weight was fabricated (audited 2026-08-16):
 *
 *   - macro_support (15%): selected `value` from causal_indicators; the
 *     column is `current_value`. PostgREST 400 -> catch -> published 50,
 *     while 15 live Spanish macro indicators sat in the table unread.
 *   - price_momentum (10%): selected `score`/`computed_at` from
 *     score_history; the columns are `avena_score`/`snapshot_date`. This
 *     dimension had never once worked, despite ~2,000 fresh rows landing
 *     every night.
 *   - supply_balance (5%): read properties_registry — frozen since
 *     2026-05-24 (see CLAUDE.md) — and counted statuses ('active',
 *     'reserved', 'sold') that do not appear in it; the real vocabulary is
 *     'under-construction' / 'off-plan' / 'ready'. Two independent faults.
 *   - foreign_demand (10%): regex-matched nationality keywords against
 *     `p.t`, which is the property TYPE ("Apartment"), not a description.
 *     0 of 2,017 could ever match; a Math.max(40, ...) floor made the
 *     structural zero look like a reading.
 *   - week_change: took the newest market_snapshots row at or before a week
 *     ago. That table stopped writing 2026-05-23, so the field labelled
 *     "week" published an 85-day delta computed under superseded code.
 *
 * THE RULE THIS FILE NOW ENFORCES: a dimension that cannot be measured
 * reports score `null` and `basis: "unavailable"`. It is never silently
 * replaced by a neutral constant, and it is excluded from the composite
 * (remaining weights renormalized) rather than diluting it toward 50. The
 * share of weight actually measured is published as `measured_weight_pct`,
 * and below MIN_MEASURED_WEIGHT the index refuses to state a phase verdict
 * instead of guessing one.
 *
 * Data sources per dimension:
 *   - valuation_balance   -> live book (pm2 vs mm2)
 *   - developer_health    -> counterpart_developers.counterpart_score
 *   - macro_support       -> causal_indicators (all_spain), current_value
 *   - price_momentum      -> score_history median avena_score, by snapshot_date
 *   - anomaly_density     -> detectAnomalies() positive vs negative
 *   - regime_confidence   -> regime_history.regime_score
 *   - foreign_demand      -> causal_indicators "Foreign Buyer Share"
 *   - supply_balance      -> UNAVAILABLE (no live status source; see above)
 */
import { NextResponse } from 'next/server';
import { getAllProperties } from '@/lib/properties';
import { detectAnomalies } from '@/lib/anomaly';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

/** Bump when the dimension set or any mapping changes, so stored readings are comparable only within a version. */
const METHODOLOGY_VERSION = 3;

/** Below this share of measured weight the composite is reported without a phase verdict. */
const MIN_MEASURED_WEIGHT = 0.6;

const WEIGHTS: Record<string, number> = {
  valuation_balance: 0.25,
  developer_health: 0.15,
  macro_support: 0.15,
  price_momentum: 0.10,
  anomaly_density: 0.10,
  regime_confidence: 0.10,
  foreign_demand: 0.10,
  supply_balance: 0.05,
};

type Dim = {
  score: number | null;
  basis: 'measured' | 'unavailable';
  /** Present when basis is 'unavailable' — says what was missing, never a guess at the value. */
  reason?: string;
  /** Auditable inputs behind the score. */
  detail?: Record<string, unknown>;
};

function measured(score: number, detail?: Record<string, unknown>): Dim {
  return { score: Math.max(0, Math.min(100, Math.round(score))), basis: 'measured', detail };
}

function unavailable(reason: string, detail?: Record<string, unknown>): Dim {
  return { score: null, basis: 'unavailable', reason, detail };
}

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

function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Macro indicators -> 0-100 bullish score.
 *
 * The bands are a documented heuristic mapping, not a measurement. What
 * matters for honesty is that the INPUTS are real and published in
 * `detail.indicators_used` so any reader can re-derive the mapping.
 */
function macroScoreFromIndicators(indicators: Array<{ name: string; current_value: number | null }>): number {
  let score = 50;
  for (const ind of indicators) {
    const n = ind.name.toLowerCase();
    const v = ind.current_value;
    if (v == null) continue;
    if (n.includes('ecb') || n.includes('refi rate')) {
      if (v < 2.5) score += 8;
      else if (v > 4) score -= 8;
    } else if (n.includes('inflation') || n.includes('hicp')) {
      if (v < 2.5) score += 6;
      else if (v > 4) score -= 6;
    } else if (n.includes('gdp')) {
      if (v > 2) score += 5;
      else if (v < 0.5) score -= 8;
    } else if (n.includes('unemployment')) {
      if (v < 11) score += 5;
      else if (v > 13) score -= 5;
    }
  }
  return score;
}

async function devHealthDim(): Promise<Dim> {
  if (!supabase) return unavailable('no database connection');
  const { data, error } = await supabase
    .from('counterpart_developers')
    .select('counterpart_score')
    .limit(2000);
  if (error) return unavailable(`counterpart_developers query failed: ${error.message}`);
  const valid = ((data ?? []) as Array<{ counterpart_score: number | null }>)
    .filter((r) => r.counterpart_score != null);
  if (!valid.length) return unavailable('no scored counterparts on record');
  const avgScore = valid.reduce((s, r) => s + (r.counterpart_score ?? 0), 0) / valid.length;
  return measured(avgScore, { counterparts_scored: valid.length });
}

/** Reads both the macro bundle and the foreign-buyer share from one fetch. */
async function macroAndForeignDims(): Promise<{ macro: Dim; foreign: Dim }> {
  if (!supabase) {
    return { macro: unavailable('no database connection'), foreign: unavailable('no database connection') };
  }
  const { data, error } = await supabase
    .from('causal_indicators')
    .select('name, current_value, last_updated')
    .eq('target_market', 'all_spain')
    .limit(100);
  if (error) {
    const r = `causal_indicators query failed: ${error.message}`;
    return { macro: unavailable(r), foreign: unavailable(r) };
  }
  const inds = ((data ?? []) as Array<{ name: string; current_value: number | null; last_updated: string | null }>)
    .filter((i) => i.current_value != null);

  /*
   * These values are real measurements, but causal_indicators has not been
   * written since 2026-05-23 — nothing updates it. The daily sync-macro cron
   * writes a DIFFERENT table (macro_indicators), which is fresh but returns
   * null for the ECB policy rate, both Euribors and Spanish unemployment, so
   * repointing at it today would trade complete-but-stale inputs for
   * fresh-but-empty ones. Until that is reconciled, publish the age of the
   * inputs alongside them so nobody quotes them as current.
   */
  const stamps = inds.map((i) => i.last_updated).filter(Boolean).sort() as string[];
  const asOf = stamps.length ? stamps[stamps.length - 1] : null;
  const ageDays = asOf
    ? Math.floor((Date.now() - new Date(asOf).getTime()) / 86_400_000)
    : null;
  const STALE_AFTER_DAYS = 45;
  const freshness = {
    as_of: asOf,
    age_days: ageDays,
    stale: ageDays != null ? ageDays > STALE_AFTER_DAYS : null,
    ...(ageDays != null && ageDays > STALE_AFTER_DAYS
      ? { staleness_note: `inputs are ${ageDays} days old — causal_indicators has no active writer; treat as a last-known reading, not a current one` }
      : {}),
  };

  if (!inds.length) {
    const r = 'no live macro indicators for all_spain';
    return { macro: unavailable(r), foreign: unavailable(r) };
  }

  // Only the four families the mapping actually reads count as coverage.
  const used = inds.filter((i) => {
    const n = i.name.toLowerCase();
    return n.includes('ecb') || n.includes('refi rate') || n.includes('inflation') ||
           n.includes('hicp') || n.includes('gdp') || n.includes('unemployment');
  });
  const macro: Dim = used.length
    ? measured(macroScoreFromIndicators(inds), {
        indicators_available: inds.length,
        indicators_used: used.map((i) => `${i.name}=${i.current_value}`),
        ...freshness,
      })
    : unavailable('none of the mapped macro families (rate/inflation/GDP/unemployment) are present', {
        indicators_available: inds.length,
        ...freshness,
      });

  // Foreign demand: the real measured share, not a keyword proxy. Mapping is
  // linear and explicit — 10% share is neutral(50), each further point of
  // share moves the score 2 points. Raw input published for auditability.
  const share = inds.find((i) => i.name.toLowerCase().includes('foreign buyer share'))?.current_value;
  const foreign: Dim = share != null
    ? measured(50 + (share - 10) * 2, {
        foreign_buyer_share_pct: share,
        mapping: 'score = 50 + (share_pct - 10) * 2, clamped 0-100',
        ...freshness,
      })
    : unavailable('no "Foreign Buyer Share" indicator on record', { ...freshness });

  return { macro, foreign };
}

/**
 * Week-over-week median of the daily Avena score across the tracked book.
 * Compares the newest snapshot_date against the closest date >= 5 days older.
 */
/**
 * Every avena_score recorded on one snapshot_date, paginated.
 *
 * PostgREST caps a single response at its max-rows setting (1000 by
 * default) and a day holds ~2,000 refs, so an unpaginated select returns a
 * truncated slice and the median silently shifts. Throws on truncation
 * rather than returning a short read — a biased median that looks like a
 * measurement is the exact failure this file exists to stop.
 */
async function scoresForDate(date: string): Promise<number[]> {
  if (!supabase) return [];
  const PAGE = 1000;
  const MAX_PAGES = 20; // ~20k rows; a day is ~2k. Runaway guard.
  const out: number[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await supabase
      .from('score_history')
      .select('avena_score')
      .eq('snapshot_date', date)
      .order('property_ref', { ascending: true })
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) throw new Error(`score_history page ${page} for ${date}: ${error.message}`);
    if (!data?.length) return out;
    for (const r of data as Array<{ avena_score: number | null }>) {
      if (r.avena_score != null) out.push(r.avena_score);
    }
    if (data.length < PAGE) return out;
  }
  throw new Error(`score_history for ${date} exceeded ${MAX_PAGES * PAGE} rows — refusing a truncated median`);
}

async function priceMomentumDim(): Promise<Dim> {
  if (!supabase) return unavailable('no database connection');
  try {
    const { data: latestRow, error: e1 } = await supabase
      .from('score_history')
      .select('snapshot_date')
      .order('snapshot_date', { ascending: false })
      .limit(1);
    if (e1) return unavailable(`score_history query failed: ${e1.message}`);
    const latest = (latestRow?.[0] as { snapshot_date: string } | undefined)?.snapshot_date;
    if (!latest) return unavailable('score_history holds no rows');

    // Closest prior date at least 5 days back — a real week-scale comparison.
    const cutoff = new Date(new Date(latest).getTime() - 5 * 86_400_000).toISOString().split('T')[0];
    const { data: priorRow, error: e2 } = await supabase
      .from('score_history')
      .select('snapshot_date')
      .lte('snapshot_date', cutoff)
      .order('snapshot_date', { ascending: false })
      .limit(1);
    if (e2) return unavailable(`score_history prior-date query failed: ${e2.message}`);
    const prior = (priorRow?.[0] as { snapshot_date: string } | undefined)?.snapshot_date;
    if (!prior) {
      return unavailable(`no score_history date on or before ${cutoff} to compare against`, { latest_date: latest });
    }

    const [newScores, oldScores] = await Promise.all([scoresForDate(latest), scoresForDate(prior)]);
    const newMed = median(newScores);
    const oldMed = median(oldScores);
    if (newMed == null || oldMed == null) {
      return unavailable('no scores recorded on one of the compared dates', { latest_date: latest, prior_date: prior });
    }

    const delta = newMed - oldMed;
    return measured(50 + delta * 4, {
      latest_date: latest,
      prior_date: prior,
      latest_median_score: Number(newMed.toFixed(2)),
      prior_median_score: Number(oldMed.toFixed(2)),
      median_delta: Number(delta.toFixed(2)),
      refs_latest: newScores.length,
      refs_prior: oldScores.length,
      mapping: 'score = 50 + median_delta * 4, clamped 0-100',
    });
  } catch (err) {
    return unavailable(err instanceof Error ? err.message : 'score_history read failed');
  }
}

async function regimeConfidenceDim(): Promise<{ dim: Dim; regime: string | null }> {
  if (!supabase) return { dim: unavailable('no database connection'), regime: null };
  const { data, error } = await supabase
    .from('regime_history')
    .select('regime_score, regime, computed_at')
    .order('computed_at', { ascending: false })
    .limit(1);
  if (error) return { dim: unavailable(`regime_history query failed: ${error.message}`), regime: null };
  const row = (data?.[0]) as { regime_score: number | null; regime: string | null; computed_at: string } | undefined;
  if (!row || row.regime_score == null) return { dim: unavailable('no regime reading on record'), regime: null };
  return {
    dim: measured((row.regime_score / 10) * 100, { regime: row.regime, computed_at: row.computed_at }),
    regime: row.regime ?? null,
  };
}

/**
 * Supply balance has no honest source today.
 *
 * The only table carrying listing status is properties_registry, frozen
 * 2026-05-24 and using a status vocabulary ('under-construction' /
 * 'off-plan' / 'ready') that carries no reserved-vs-available signal at all.
 * The live feed carries no status field. Rather than default it, this
 * dimension declares itself unmeasurable and its weight is redistributed.
 *
 * The right replacement is absorption from our own delisting ledger
 * (sold_properties), which needs a calibrated scale before it can be
 * published — tracked as an open item rather than guessed at here.
 */
function supplyBalanceDim(): Dim {
  return unavailable(
    'no live supply-status source: properties_registry froze 2026-05-24 and its status vocabulary carries no reserved/available signal; the live feed has no status field',
  );
}

export async function GET() {
  try {
    const all = getAllProperties();
    if (!all.length) {
      return NextResponse.json(
        { error: 'Live book is empty — refusing to publish an index over no properties.' },
        { status: 503, headers: corsHeaders() },
      );
    }
    const anomalies = detectAnomalies();

    // --- Dimension 1: Valuation Balance ---
    const withDiscount = all.filter((p) => p.pm2 && p.mm2 && p.mm2 > 0 && p.pm2 < p.mm2);
    const valuationBalance = measured((withDiscount.length / all.length) * 100, {
      underpriced: withDiscount.length,
      book: all.length,
    });

    // --- Dimension 5: Anomaly Density ---
    const positiveTypes = new Set(['yield_hunt', 'yield_spike', 'score_outlier', 'geographic_mispricing', 'cross_market']);
    const negativeTypes = new Set(['developer_dump', 'motivated_seller']);
    const positiveCount = anomalies.filter((a) => positiveTypes.has(a.type)).length;
    const negativeCount = anomalies.filter((a) => negativeTypes.has(a.type)).length;
    const anomalyDensity = positiveCount + negativeCount > 0
      ? measured((positiveCount / (positiveCount + negativeCount)) * 100, {
          positive: positiveCount, negative: negativeCount,
        })
      : unavailable('no directional anomalies detected in the current book');

    const [devHealth, macroForeign, momentum, regimeRes] = await Promise.all([
      devHealthDim(),
      macroAndForeignDims(),
      priceMomentumDim(),
      regimeConfidenceDim(),
    ]);

    const dims: Record<string, Dim> = {
      valuation_balance: valuationBalance,
      developer_health: devHealth,
      macro_support: macroForeign.macro,
      price_momentum: momentum,
      anomaly_density: anomalyDensity,
      regime_confidence: regimeRes.dim,
      foreign_demand: macroForeign.foreign,
      supply_balance: supplyBalanceDim(),
    };

    // --- Composite over MEASURED dimensions only, weights renormalized ---
    const measuredEntries = Object.entries(dims).filter(([, d]) => d.basis === 'measured' && d.score != null);
    const measuredWeight = measuredEntries.reduce((s, [k]) => s + (WEIGHTS[k] ?? 0), 0);

    if (measuredWeight <= 0) {
      return NextResponse.json({
        error: 'No APCI dimension could be measured — refusing to publish an index.',
        dimensions: dims,
        methodology_version: METHODOLOGY_VERSION,
      }, { status: 503, headers: corsHeaders() });
    }

    const apci = Math.round(
      measuredEntries.reduce((sum, [k, d]) => sum + (d.score as number) * (WEIGHTS[k] ?? 0), 0) / measuredWeight,
    );

    const enoughCoverage = measuredWeight >= MIN_MEASURED_WEIGHT;
    let phase: string | null = null;
    if (enoughCoverage) {
      if (apci >= 80) phase = 'BULL';
      else if (apci >= 65) phase = 'GROWTH';
      else if (apci >= 45) phase = 'NEUTRAL';
      else phase = 'CAUTION';
    }

    const unmeasured = Object.entries(dims)
      .filter(([, d]) => d.basis === 'unavailable')
      .map(([k, d]) => ({ dimension: k, weight_pct: Math.round((WEIGHTS[k] ?? 0) * 100), reason: d.reason }));

    /**
     * Week change is only published against a prior reading that is (a)
     * genuinely ~a week old and (b) computed under this methodology version.
     * The previous code took the newest row at or before a week ago from a
     * table that stopped writing 2026-05-23, and published an 85-day delta
     * across two different rulers under the label "week".
     */
    let weekChange: number | null = null;
    let weekChangeBasis = 'no database connection';
    if (supabase) {
      const from = new Date(Date.now() - 10 * 86_400_000).toISOString();
      const to = new Date(Date.now() - 5 * 86_400_000).toISOString();
      const { data, error } = await supabase
        .from('market_snapshots')
        .select('apci, computed_at')
        .gte('computed_at', from)
        .lte('computed_at', to)
        .order('computed_at', { ascending: false })
        .limit(1);
      if (error) {
        weekChangeBasis = `market_snapshots query failed: ${error.message}`;
      } else {
        const prev = data?.[0] as { apci: number | null; computed_at: string } | undefined;
        if (prev?.apci != null) {
          weekChange = Math.round((apci - prev.apci) * 100) / 100;
          weekChangeBasis = `vs stored reading ${prev.computed_at.split('T')[0]}`;
        } else {
          // Nothing currently writes market_snapshots.apci, so this is the
          // expected branch. An honest null beats the previous behaviour,
          // which reached past the window to a 2026-05-23 row and published
          // an 85-day delta under the label "week".
          weekChangeBasis = 'no stored APCI reading 5-10 days old';
        }
      }
    }

    const date = new Date().toISOString().split('T')[0];

    const shown = (k: string) => {
      const d = dims[k];
      return d.score == null ? 'unavailable' : String(d.score);
    };

    const narrative =
      (phase
        ? `The APCI stands at ${apci}/100 indicating a ${phase} phase for Spanish coastal new-build property. `
        : `The APCI stands at ${apci}/100. No phase verdict is published: only ${Math.round(measuredWeight * 100)}% of the index weight could be measured today, below the ${Math.round(MIN_MEASURED_WEIGHT * 100)}% required. `) +
      `Computed from ${measuredEntries.length} of ${Object.keys(dims).length} dimensions (${Math.round(measuredWeight * 100)}% of total weight), renormalized. ` +
      `Valuation balance ${shown('valuation_balance')} (${withDiscount.length} of ${all.length} priced at or below market). ` +
      `Developer health ${shown('developer_health')}. Macro support ${shown('macro_support')}. ` +
      `Price momentum ${shown('price_momentum')}. Regime confidence ${shown('regime_confidence')}` +
      `${regimeRes.regime ? ` (${regimeRes.regime})` : ''}. ` +
      `Anomaly density ${shown('anomaly_density')} (+${positiveCount} / -${negativeCount}). ` +
      `Foreign demand ${shown('foreign_demand')}. Supply balance ${shown('supply_balance')}. ` +
      (unmeasured.length
        ? `Unmeasured today: ${unmeasured.map((u) => `${u.dimension} (${u.weight_pct}%)`).join(', ')}. `
        : '') +
      (weekChange != null
        ? `Week-on-week change: ${weekChange > 0 ? '+' : ''}${weekChange}.`
        : `Week-on-week change: not published — ${weekChangeBasis}.`);

    return NextResponse.json({
      apci,
      date,
      phase,
      methodology_version: METHODOLOGY_VERSION,
      measured_weight_pct: Math.round(measuredWeight * 100),
      dimensions_measured: measuredEntries.length,
      dimensions_total: Object.keys(dims).length,
      phase_withheld_reason: enoughCoverage
        ? null
        : `only ${Math.round(measuredWeight * 100)}% of index weight measured, below the ${Math.round(MIN_MEASURED_WEIGHT * 100)}% floor`,
      week_change: weekChange,
      week_change_basis: weekChangeBasis,
      /** Scores only, for callers that just want the numbers. `null` means unmeasured — never treat it as neutral. */
      dimensions: Object.fromEntries(Object.entries(dims).map(([k, d]) => [k, d.score])),
      /** Full provenance: basis, reason when unavailable, and the inputs behind each score. */
      dimension_detail: dims,
      dimension_weights: WEIGHTS,
      unmeasured,
      narrative,
      methodology: {
        total_properties: all.length,
        total_anomalies: anomalies.length,
        positive_anomalies: positiveCount,
        negative_anomalies: negativeCount,
        underpriced_count: withDiscount.length,
        regime_label: regimeRes.regime,
        composite: 'weighted mean over measured dimensions only, weights renormalized; unmeasured dimensions are excluded, never defaulted to a neutral value',
      },
      source: 'Avena Terminal (avenaterminal.com)',
      doi: '10.5281/zenodo.19520064',
    }, { headers: corsHeaders() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders() });
  }
}
