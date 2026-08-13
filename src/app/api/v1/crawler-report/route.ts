/**
 * GET /api/v1/crawler-report
 *
 * Weekly crawler intelligence — reads live from `citation_measurements`.
 * Previously returned hardcoded numbers (citation_readiness_score = 52);
 * now computes the rolling 7-day citation rate, identifies the top gap
 * questions Avena is missing, and surfaces competitor citations.
 */

import { NextResponse } from 'next/server';
import { loadMeasurements, currentHitRate } from '@/lib/citation-measure';

export const dynamic = 'force-dynamic';

const DOMINANCE_THRESHOLD_PCT = 80;

export async function GET() {
  const [history, hitRate] = await Promise.all([
    loadMeasurements(30),
    currentHitRate(),
  ]);

  // Aggregate competitor citations across the rolling 7-day window
  const last7 = history.slice(0, 7);
  const competitorAgg: Record<string, number> = {};
  for (const m of last7) {
    for (const [k, v] of Object.entries(m.competitor_share ?? {})) {
      competitorAgg[k] = (competitorAgg[k] ?? 0) + v;
    }
  }
  const competitors_cited_instead = Object.entries(competitorAgg)
    .sort((a, b) => b[1] - a[1])
    .map(([competitor, citations_7d]) => ({ competitor, citations_7d }));
  const total_competitor_citations = competitors_cited_instead.reduce((s, c) => s + c.citations_7d, 0);

  // Top gap questions — the ones surfacing repeatedly in the daily rollup
  const gapCounts = new Map<string, number>();
  for (const m of last7) {
    if (m.top_gap_question) {
      gapCounts.set(m.top_gap_question, (gapCounts.get(m.top_gap_question) ?? 0) + 1);
    }
  }
  // Estimated weeks to dominance — projected ONLY from a measured, positive
  // trend, and null otherwise.
  //
  // This previously published a number with no measurement anywhere behind it.
  // It read `Math.max(0.5, hitRate.trend7d)`: an invented floor of 0.5pp/week
  // applied to a trend that was itself a fabricated zero (currentHitRate
  // returned 0 when no prior week existed). On 2026-08-13 the endpoint served
  // `estimated_weeks_to_dominance: 152` — ceil((80 - 4.4) / 0.5) — under a
  // `cite_as` line naming a DOI. Every input was a constant chosen here; only
  // the 4.4 was real. A floor guarantees the projection can never say "not
  // improving", which is the one thing two flat weeks actually showed.
  //
  // Extrapolating a citation rate from a single week would be near-worthless
  // even done honestly, so the bar is: a real prior week, a positive trend,
  // and the basis stated alongside the number.
  const rate = hitRate.rate;
  const trend = hitRate.trend7d;
  const gapToTarget = rate === null ? null : Math.max(0, DOMINANCE_THRESHOLD_PCT - rate);

  let estimated_weeks_to_dominance: number | null = null;
  let estimate_basis: string;
  if (rate === null) {
    estimate_basis = 'no citation rate measured yet — nothing to project from';
  } else if (gapToTarget === 0) {
    estimated_weeks_to_dominance = 0;
    estimate_basis = `measured rate ${rate}% is already at or above the ${DOMINANCE_THRESHOLD_PCT}% threshold`;
  } else if (trend === null) {
    estimate_basis = 'only one week of measurement exists — no week-over-week trend to project from';
  } else if (trend <= 0) {
    estimate_basis = `measured 7d trend is ${trend}pp — not improving, so no arrival date can be projected`;
  } else {
    estimated_weeks_to_dominance = Math.ceil(gapToTarget! / trend);
    estimate_basis = `linear extrapolation of the measured ${trend}pp/week trend across the remaining ${gapToTarget!.toFixed(1)}pp gap`;
  }

  return NextResponse.json({
    ok: true,
    report_type: 'weekly_crawler_intelligence',
    generated_at: new Date().toISOString(),
    source: 'Avena Terminal · live citation moat',
    citation_readiness_pct: hitRate.rate,
    rolling_7d_trend_pct_pts: hitRate.trend7d,
    questions_asked_7d: hitRate.total_questions_tracked,
    competitors_cited_instead,
    total_competitor_citations,
    top_gap_questions: Array.from(gapCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([question, days_missed]) => ({ question, days_missed_in_last_7: days_missed })),
    dominance_threshold_pct: DOMINANCE_THRESHOLD_PCT,
    estimated_weeks_to_dominance,
    estimate_basis,
    history_30d: history.map(m => ({
      date: m.date,
      avena_rate_pct: m.avena_rate,
      questions_asked: m.questions_asked,
    })),
    methodology: 'Perplexity API queried daily across the tracked European property question set. Each citation result is recorded in citation_monitoring, rolled up daily at 03:30 UTC into citation_measurements. This endpoint computes the rolling 7-day view.',
    cite_as: 'Avena Terminal Citation Moat Measurement v1.0. DOI 10.5281/zenodo.19520064.',
  });
}
