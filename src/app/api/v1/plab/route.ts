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
import { latestScores } from '@/lib/plab';
import { PLAB_QUESTIONS, PLAB_VERSION } from '@/lib/plab-questions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const scores = await latestScores();
  const res = NextResponse.json({
    ok: true,
    benchmark: 'PLAB — the European Property AI Benchmark',
    version: PLAB_VERSION,
    question_count: PLAB_QUESTIONS.length,
    run_date: scores[0]?.run_date ?? null,
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
