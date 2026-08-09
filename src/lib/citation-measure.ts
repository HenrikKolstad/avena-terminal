/**
 * Citation Moat Measurement
 *
 * The KPI that matters most for Avena: how often do AI answer engines
 * (Perplexity first, Google AI Overviews + ChatGPT Search later) cite
 * avenaterminal.com when asked about European property?
 *
 * This module runs a rollup over `citation_monitoring` (raw per-question
 * results populated by citation-agent) and produces `citation_measurements`
 * (daily aggregated stats) that the dashboard + ticker consume.
 *
 * Everything no-ops if Supabase / PERPLEXITY_API_KEY missing.
 */

import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { isBranded, BENCHMARK_EPOCH } from '@/lib/citation-agent';

export interface DailyMeasurement {
  date: string;
  /** ORGANIC only — the branded control is excluded, as /citation-moat states. */
  questions_asked: number;
  avena_hits: number;
  avena_rate: number; // 0-100, organic
  /** The control group, reported separately and never blended into the headline. */
  branded_questions: number;
  branded_hits: number;
  branded_rate: number | null; // null when the control was not asked
  competitor_share: Record<string, number>;
  top_gap_question: string | null;
}

const COMPETITOR_PATTERNS: Record<string, RegExp> = {
  idealista: /idealista\.com/i,
  kyero: /kyero\.com/i,
  rightmove: /rightmove\.co\.uk/i,
  zoopla: /zoopla\.co\.uk/i,
  fotocasa: /fotocasa\.es/i,
  thinkspain: /thinkspain\.com/i,
  aplaceinthesun: /aplaceinthesun\.com/i,
  numbeo: /numbeo\.com/i,
  statista: /statista\.com/i,
  eurostat: /eurostat|ec\.europa\.eu/i,
};

/** Compute yesterday's (or given day's) rollup from raw citation_monitoring rows. */
export async function rollupDay(dateStr?: string): Promise<DailyMeasurement | null> {
  if (!supabase) return null;
  const date = dateStr ?? new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('citation_monitoring')
    .select('question, cited_sources, avena_cited, competitor_cited')
    .eq('date', date);

  if (error || !data) return null;

  // NOT MEASURED is not MEASURED ZERO. Agent Atlas runs Mon/Wed/Fri, so four
  // days a week there are no raw rows for the date. Returning a 0.00% row here
  // persisted a fabricated measurement and dragged the published rate down —
  // the same shape as the 401-stored-as-zero bug of 2026-08 (293a372).
  if (data.length === 0) return null;

  const organic = data.filter((r) => !isBranded(r.question as string));
  const brandedRows = data.filter((r) => isBranded(r.question as string));

  // The headline is organic-only. A rate carried by "Avena Terminal what is it"
  // is not a moat, and /citation-moat already tells the reader the control is
  // excluded — this makes the number match that claim.
  const questions_asked = organic.length;
  if (questions_asked === 0) return null;

  const avena_hits = organic.filter((r) => r.avena_cited).length;
  const avena_rate = Number(((avena_hits / questions_asked) * 100).toFixed(2));

  const branded_questions = brandedRows.length;
  const branded_hits = brandedRows.filter((r) => r.avena_cited).length;
  const branded_rate = branded_questions
    ? Number(((branded_hits / branded_questions) * 100).toFixed(2))
    : null;

  // Competitor share and gaps are organic-only too: a branded query is a
  // pipeline health check, not a market the competitors are competing in.
  const competitor_share: Record<string, number> = {};
  for (const row of organic) {
    const sources: unknown = row.cited_sources;
    if (!Array.isArray(sources)) continue;
    for (const s of sources as string[]) {
      if (typeof s !== 'string') continue;
      for (const [name, pat] of Object.entries(COMPETITOR_PATTERNS)) {
        if (pat.test(s)) {
          competitor_share[name] = (competitor_share[name] ?? 0) + 1;
        }
      }
    }
  }

  // Top gap = question with most competitor citations AND Avena NOT cited
  const gaps = organic
    .filter((r) => !r.avena_cited)
    .map((r) => {
      const compCount = Array.isArray(r.competitor_cited) ? r.competitor_cited.length : 0;
      return { question: r.question as string, compCount };
    })
    .sort((a, b) => b.compCount - a.compCount);

  const top_gap_question = gaps[0]?.question ?? null;

  return {
    date,
    questions_asked,
    avena_hits,
    avena_rate,
    branded_questions,
    branded_hits,
    branded_rate,
    competitor_share,
    top_gap_question,
  };
}

/** Persist a daily measurement via upsert on (date). */
export async function persistMeasurement(m: DailyMeasurement): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('citation_measurements')
      .upsert(
        {
          date: m.date,
          questions_asked: m.questions_asked,
          avena_hits: m.avena_hits,
          avena_rate: m.avena_rate,
          branded_questions: m.branded_questions,
          branded_hits: m.branded_hits,
          branded_rate: m.branded_rate,
          competitor_share: m.competitor_share,
          top_gap_question: m.top_gap_question,
        },
        { onConflict: 'date' }
      );
    if (error) return false;
    return true;
  } catch {
    return false;
  }
}

export async function loadMeasurements(limit = 30): Promise<DailyMeasurement[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('citation_measurements')
      .select('*')
      // Days the engine did not run were historically banked as 0-question,
      // 0.00% rows. They are not measurements and must never reach a chart,
      // an average or the published headline.
      .gt('questions_asked', 0)
      // qb-v1 rates are a different ruler; splicing them onto the qb-v2 series
      // would make a change of measuring stick look like a change in the market.
      .gte('date', BENCHMARK_EPOCH)
      .order('date', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map((r) => ({
      date: r.date,
      questions_asked: r.questions_asked ?? 0,
      avena_hits: r.avena_hits ?? 0,
      avena_rate: Number(r.avena_rate ?? 0),
      branded_questions: r.branded_questions ?? 0,
      branded_hits: r.branded_hits ?? 0,
      branded_rate: r.branded_rate === null || r.branded_rate === undefined
        ? null
        : Number(r.branded_rate),
      competitor_share: (r.competitor_share as Record<string, number>) ?? {},
      top_gap_question: r.top_gap_question ?? null,
    }));
  } catch {
    return [];
  }
}

export async function currentHitRate(): Promise<{
  rate: number;
  trend7d: number; // percentage points change vs prior week
  total_questions_tracked: number;
}> {
  const all = await loadMeasurements(14);
  if (all.length === 0) return { rate: 0, trend7d: 0, total_questions_tracked: 0 };

  const last7 = all.slice(0, 7);
  const prior7 = all.slice(7, 14);

  // Pool hits over questions rather than averaging daily rates. Run sizes
  // differ by 5x between benchmark versions (87 vs 435 questions/day), and an
  // unweighted mean of ratios lets a small day outvote a large one.
  const pooled = (ms: DailyMeasurement[]): number => {
    const q = ms.reduce((s, m) => s + m.questions_asked, 0);
    if (q === 0) return 0;
    return (ms.reduce((s, m) => s + m.avena_hits, 0) / q) * 100;
  };

  const rate = pooled(last7);
  const priorRate = pooled(prior7);
  const total_questions_tracked = last7.reduce((s, m) => s + m.questions_asked, 0);

  return {
    rate: Number(rate.toFixed(1)),
    // No prior week measured yet is not a trend of zero.
    trend7d: prior7.length === 0 ? 0 : Number((rate - priorRate).toFixed(1)),
    total_questions_tracked,
  };
}
