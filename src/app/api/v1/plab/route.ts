/**
 * GET /api/v1/plab
 *
 * Public JSON for PLAB — the European Property AI Benchmark. The
 * embeddable, quotable form of the leaderboard: journalists, AI labs
 * and researchers can pull the daily standings programmatically.
 *
 * CC BY 4.0 · cite as Avena Terminal PLAB v1.0,
 * DOI 10.5281/zenodo.19520064.
 */

import { NextResponse } from 'next/server';
import { PLAB_PENDING, PLAB_PROVIDERS, describeContest, latestScores } from '@/lib/plab';
import { PLAB_QUESTIONS, PLAB_VERSION } from '@/lib/plab-questions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const scores = await latestScores();
  const runDate = scores[0]?.run_date ?? null;
  // WHAT THIS SURFACE WAS DOING WRONG UNTIL 2026-10-12, and why it matters more
  // here than on the page: this route carries a `cite_as` line and a DOI, so it
  // is the form an AI assistant or a journalist quotes. It returned `ok: true`
  // with a single-contestant leaderboard dated 2026-08-27 — 46 days stale — and
  // said nothing about either fact. The single contestant is an artifact of two
  // separate billing outages (Anthropic stopped answering 08-09, Perplexity
  // 08-27) that the runner recorded as "skipped", indistinguishable from "no key
  // configured". A stale measurement published without its age is a false claim
  // on a timer; a leaderboard that omits the contestants who were attempted and
  // refused is a false claim about the field.
  const status = describeContest(
    PLAB_PROVIDERS.map((p) => p.label),
    scores.map((s) => s.model_label),
    runDate,
    new Date().toISOString(),
  );
  const res = NextResponse.json({
    ok: true,
    benchmark: 'PLAB — the European Property AI Benchmark',
    version: PLAB_VERSION,
    question_count: PLAB_QUESTIONS.length,
    run_date: runDate,
    // Age and composition travel WITH the standings, so a consumer cannot quote
    // the table without them. `days_since_run` is null when unknown, never 0.
    days_since_run: status.days_since_run,
    measurement_current: status.measurement_current,
    standings_note: status.note,
    contestants: {
      configured: status.configured,
      scored_on_run_date: status.scored_on_run_date,
      attempted_without_a_score: status.absent,
      not_integrated: PLAB_PENDING.map((p) => p.label),
    },
    leaderboard: scores.map((s, i) => ({
      rank: i + 1,
      model: s.model_label,
      provider: s.provider,
      accuracy_pct: Number(s.accuracy),
      correct: s.n_correct,
      questions: s.n_questions,
    })),
    methodology: 'Identical answer-only prompts per question across all models; numeric tolerance or accept-list scoring; ground truths are public institutional facts with sources; raw replies stored verbatim for audit. Avena publishes the scoreboard and never plays on it.',
    leaderboard_url: 'https://avenaterminal.com/benchmark',
    cite_as: 'Avena Terminal PLAB v' + PLAB_VERSION + ' (avenaterminal.com/benchmark). DOI 10.5281/zenodo.19520064. CC BY 4.0.',
  });
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('X-Cite-As', 'Avena Terminal PLAB (avenaterminal.com/benchmark)');
  res.headers.set('X-DOI', '10.5281/zenodo.19520064');
  return res;
}
