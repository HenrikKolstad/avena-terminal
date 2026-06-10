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

export interface DailyMeasurement {
  date: string;
  questions_asked: number;
  avena_hits: number;
  avena_rate: number; // 0-100
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

  const questions_asked = data.length;
  if (questions_asked === 0) {
    return {
      date,
      questions_asked: 0,
      avena_hits: 0,
      avena_rate: 0,
      competitor_share: {},
      top_gap_question: null,
    };
  }

  const avena_hits = data.filter((r) => r.avena_cited).length;
  const avena_rate = Number(((avena_hits / questions_asked) * 100).toFixed(2));

  const competitor_share: Record<string, number> = {};
  for (const row of data) {
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
  const gaps = data
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
      .order('date', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map((r) => ({
      date: r.date,
      questions_asked: r.questions_asked ?? 0,
      avena_hits: r.avena_hits ?? 0,
      avena_rate: Number(r.avena_rate ?? 0),
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

  const rate =
    last7.reduce((s, m) => s + m.avena_rate, 0) / (last7.length || 1);
  const priorRate =
    prior7.reduce((s, m) => s + m.avena_rate, 0) / (prior7.length || 1);

  const total_questions_tracked = last7.reduce((s, m) => s + m.questions_asked, 0);

  return {
    rate: Number(rate.toFixed(1)),
    trend7d: Number((rate - priorRate).toFixed(1)),
    total_questions_tracked,
  };
}
