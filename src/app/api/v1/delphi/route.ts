/**
 * GET /api/v1/delphi
 *
 * Public JSON for Avena DELPHI — the daily AI panel on European
 * property. Consensus index, disagreement index, full per-question
 * per-model panel, and index history. CORS-open: embed it, quote it,
 * study it. CC BY 4.0 · DOI 10.5281/zenodo.19520064.
 */

import { NextResponse } from 'next/server';
import { indexHistory, latestPanel } from '@/lib/delphi';
import { DELPHI_QUESTIONS, DELPHI_VERSION } from '@/lib/delphi-questions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [history, panel] = await Promise.all([indexHistory(60), latestPanel()]);
  const latest = history[0] ?? null;
  const qMap = new Map(DELPHI_QUESTIONS.map(q => [q.id, q]));

  const res = NextResponse.json({
    ok: true,
    survey: 'Avena DELPHI — the daily AI panel on European property',
    version: DELPHI_VERSION,
    run_date: latest?.run_date ?? null,
    consensus_index: latest?.consensus_index ?? null,
    disagreement_index: latest?.disagreement_index ?? null,
    panel: panel.map(row => {
      const q = qMap.get(row.question_id);
      return {
        question_id: row.question_id,
        label: q?.short_label ?? row.question_id,
        question: q?.question ?? null,
        kind: q?.kind ?? null,
        horizon_months: q?.horizon_months ?? null,
        consensus: Number(row.consensus),
        dispersion: Number(row.dispersion),
        per_model: row.per_model,
        resolution_source: q?.resolution_source ?? null,
      };
    }),
    index_history: history.map(h => ({
      date: h.run_date,
      consensus_index: Number(h.consensus_index),
      disagreement_index: Number(h.disagreement_index),
    })),
    methodology: 'Fixed forward-judgment question set put daily to every panelist model with answer-only prompts; panelists never see each other\'s answers. Consensus = median; dispersion = max-min; Consensus Index = mean directional bullishness 0-100. Verbatim replies stored for audit. Questions carry horizons and public resolution sources for future accuracy scoring.',
    page_url: 'https://avenaterminal.com/delphi',
    cite_as: 'Avena DELPHI v' + DELPHI_VERSION + ' (avenaterminal.com/delphi). DOI 10.5281/zenodo.19520064. CC BY 4.0.',
  });
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('X-Cite-As', 'Avena DELPHI (avenaterminal.com/delphi)');
  res.headers.set('X-DOI', '10.5281/zenodo.19520064');
  return res;
}
