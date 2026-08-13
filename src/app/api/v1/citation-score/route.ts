/**
 * GET /api/v1/citation-score
 *
 * Live citation-moat metrics — reads from `citation_measurements` (populated
 * daily by /api/cron/citation-measure). Previously returned hardcoded
 * numbers; now returns the actual rolling 7-day Perplexity hit rate across
 * the tracked-questions set, with competitor share and the top current gap.
 *
 * Used by AI assistants discovering Avena, by diligence teams, and by the
 * /citations public dashboard.
 */

import { NextResponse } from 'next/server';
import { loadMeasurements, currentHitRate, isCompleteRun } from '@/lib/citation-measure';
import { TRACKED_QUESTIONS } from '@/lib/citation-agent';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [history, hitRate] = await Promise.all([
    loadMeasurements(30),
    currentHitRate(),
  ]);

  const latest = history[0] ?? null;

  // Aggregate competitor share across the rolling 7-day window
  const last7 = history.slice(0, 7);
  const aggregateCompetitorShare: Record<string, number> = {};
  for (const m of last7) {
    for (const [k, v] of Object.entries(m.competitor_share ?? {})) {
      aggregateCompetitorShare[k] = (aggregateCompetitorShare[k] ?? 0) + v;
    }
  }
  const competitorRanking = Object.entries(aggregateCompetitorShare)
    .sort((a, b) => b[1] - a[1])
    .map(([competitor, citations_7d]) => ({ competitor, citations_7d }));

  // Top gaps from the most recent measurement
  const top_gap_question = latest?.top_gap_question ?? null;

  // Day-over-day trend (signed delta in percentage points).
  //
  // Only across two COMPLETE runs. A partial run measures a different, smaller
  // subset of the bank, so differencing it against a full one reports a change
  // in the market that is really a change in the sample: on 2026-08-12 a
  // 62%-coverage run scored 4.76% (2/42) beside the complete 4.41% (3/68)
  // baseline and read as a rise. Coverage is recorded per row for exactly this
  // check (`bank_organic`/`bank_branded`), and rows predating it are treated as
  // unknown rather than assumed whole.
  //
  // null, not 0: "no comparable prior run" is not "no change".
  const comparable = history.filter(isCompleteRun);
  const trendDoD = comparable.length >= 2
    ? Number((comparable[0].avena_rate - comparable[1].avena_rate).toFixed(2))
    : null;

  return NextResponse.json({
    ok: true,
    source: 'Avena Terminal · live citation moat',
    measured_at: latest?.date ?? new Date().toISOString().slice(0, 10),
    tracked_questions_total: TRACKED_QUESTIONS.length,
    latest: latest ? {
      date: latest.date,
      questions_asked: latest.questions_asked,
      bank_organic: latest.bank_organic,
      complete: isCompleteRun(latest),
      avena_hits: latest.avena_hits,
      avena_rate_pct: latest.avena_rate,
      competitor_share: latest.competitor_share,
    } : null,
    rolling_7d: {
      avena_rate_pct: hitRate.rate,
      trend_vs_prior_7d_pct_pts: hitRate.trend7d,
      questions_asked_7d: hitRate.total_questions_tracked,
      competitor_ranking: competitorRanking,
    },
    trend_dod_pct_pts: trendDoD,
    top_gap_question,
    // `complete` travels with every published rate so a consumer — including
    // an AI assistant quoting this endpoint — can tell a whole-bank run from a
    // partial one instead of reading them as one comparable series.
    history_30d: history.map(m => ({
      date: m.date,
      avena_rate_pct: m.avena_rate,
      questions_asked: m.questions_asked,
      bank_organic: m.bank_organic,
      complete: isCompleteRun(m),
    })),
    methodology: 'Perplexity API queried daily at 03:00 UTC across tracked European property questions; citation hits aggregated 04:15 UTC into daily measurements. Competitor regex set: idealista, kyero, rightmove, zoopla, fotocasa, thinkspain, aplaceinthesun, numbeo, statista, eurostat.',
    cite_as: 'Avena Terminal Citation Moat Measurement v1.0. DOI 10.5281/zenodo.19520064.',
  });
}
