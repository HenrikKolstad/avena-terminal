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
import { isBranded, BENCHMARK_EPOCH, BENCHMARK_QUESTIONS } from '@/lib/citation-agent';

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
  /**
   * How many questions the bank INTENDED to ask, against which the counts above
   * are the achieved coverage. Null on rows written before this was recorded.
   *
   * citation-agent deliberately persists only successful lookups, so a failed
   * lookup never becomes a fabricated zero. The cost of that correct choice is
   * that the rollup reads citation_monitoring and cannot see what is missing:
   * on 2026-08-12, 29 of 74 lookups failed and the day stored questions_asked:42
   * — indistinguishable from a bank that simply has 42 questions. The rate was
   * then published as 4.76% next to a 4.41% (3/68) baseline measured on a
   * different, larger subset. Recording the intended size makes a partial run
   * self-describing, so no read path can mistake 62% coverage for a whole day.
   */
  bank_organic: number | null;
  bank_branded: number | null;
}

/**
 * A run is comparable to another only if it actually asked the whole bank.
 * Unknown coverage (pre-2026-08-12 rows) is NOT treated as complete — an
 * unproven claim of completeness is the thing this field exists to prevent.
 */
export function isCompleteRun(m: DailyMeasurement): boolean {
  if (m.bank_organic === null || m.bank_branded === null) return false;
  return m.questions_asked === m.bank_organic && m.branded_questions === m.bank_branded;
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

/**
 * Why a rollup produced no measurement. Until 2026-09-01 all of these returned
 * a bare `null` and the cron wrote an identical `{ok:false, measurement:null}`
 * row for every one of them, at status `success`.
 *
 * That collapse hid two opposite findings behind the same output. On Tuesday
 * 2026-09-01 cassandra logged `ok:false` for a Tuesday — a day Atlas is not
 * scheduled to run at all — in a row byte-identical in shape to Monday
 * 2026-08-31, when Atlas WAS scheduled, ran, and failed 74 of 74 lookups on a
 * Perplexity 401. "Nothing was asked" and "everything was asked and everything
 * failed" are not the same event and must not share a status.
 *
 * `query_failed` is the one this project has paid for repeatedly: a read error
 * silently becoming an empty result, so a broken thing looks like a quiet one.
 */
export type RollupReason =
  | 'measured'
  | 'supabase_not_configured'
  | 'query_failed'
  | 'no_run_scheduled'
  | 'raw_rows_absent_on_a_run_day'
  | 'branded_questions_only';

export interface RollupResult {
  measurement: DailyMeasurement | null;
  reason: RollupReason;
  /** Populated only for `query_failed`, so the cause is never guessed at. */
  error?: string;
}

/**
 * Reasons that mean something is actually WRONG, as opposed to a day on which
 * the engine was never asked to do anything. Only these should colour a run.
 */
export const ROLLUP_FAILURE_REASONS: ReadonlySet<RollupReason> = new Set<RollupReason>([
  'supabase_not_configured',
  'query_failed',
  'raw_rows_absent_on_a_run_day',
]);

/**
 * Agent Atlas is scheduled `0,10,20 3 * * 1,3,5` in vercel.json — three
 * staggered invocations on Monday, Wednesday and Friday, 03:00-03:20 UTC. This
 * rollup runs `15 4 * * *`, daily at 04:15, comfortably after the last of them,
 * so on a run day an empty raw table means the engine failed rather than "not
 * yet". KEEP THIS IN SYNC WITH vercel.json: it is the only thing separating
 * "not asked" from "asked and produced nothing".
 */
const ATLAS_RUN_WEEKDAYS_UTC: ReadonlySet<number> = new Set([1, 3, 5]);

export function isAtlasRunDay(date: string): boolean {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  return ATLAS_RUN_WEEKDAYS_UTC.has(d.getUTCDay());
}

/** Compute yesterday's (or given day's) rollup from raw citation_monitoring rows. */
export async function rollupDay(dateStr?: string): Promise<RollupResult> {
  const date = dateStr ?? new Date().toISOString().slice(0, 10);
  if (!supabase) return { measurement: null, reason: 'supabase_not_configured' };

  const { data: raw, error } = await supabase
    .from('citation_monitoring')
    .select('id, question, cited_sources, avena_cited, competitor_cited')
    .eq('date', date)
    .order('id', { ascending: true });

  // A failed read is NOT an empty day. Returning null for both is the exact
  // shape that turned a Perplexity 401 into a published 0.00% in 2026-08.
  if (error) return { measurement: null, reason: 'query_failed', error: error.message };
  if (!raw) {
    return { measurement: null, reason: 'query_failed', error: 'no rows object returned' };
  }

  // Idempotent against re-runs (2026-08-12): a recovery run after a partial
  // morning left the same question twice in the raw table, and a row count
  // silently became 110 asked from a 68-question bank. One row per question,
  // the LATEST lookup wins — re-measuring a day must converge, not compound.
  const byQuestion = new Map<string, (typeof raw)[number]>();
  for (const row of raw) byQuestion.set(row.question as string, row);
  const data = [...byQuestion.values()];

  // NOT MEASURED is not MEASURED ZERO. Agent Atlas runs Mon/Wed/Fri, so four
  // days a week there are no raw rows for the date. Returning a 0.00% row here
  // persisted a fabricated measurement and dragged the published rate down —
  // the same shape as the 401-stored-as-zero bug of 2026-08 (293a372).
  if (data.length === 0) {
    return {
      measurement: null,
      reason: isAtlasRunDay(date) ? 'raw_rows_absent_on_a_run_day' : 'no_run_scheduled',
    };
  }

  const organic = data.filter((r) => !isBranded(r.question as string));
  const brandedRows = data.filter((r) => isBranded(r.question as string));

  // The headline is organic-only. A rate carried by "Avena Terminal what is it"
  // is not a moat, and /citation-moat already tells the reader the control is
  // excluded — this makes the number match that claim.
  const questions_asked = organic.length;
  // Rows exist but every one is the branded control. The headline is
  // organic-only, so there is no rate to publish — but the engine plainly ran,
  // which makes this a different event from an empty table.
  if (questions_asked === 0) return { measurement: null, reason: 'branded_questions_only' };

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

  // Measured against what the bank was designed to ask, not against how many
  // rows happened to arrive. This is the only place both numbers are known.
  const bank_branded = BENCHMARK_QUESTIONS.filter((b) => isBranded(b.q)).length;
  const bank_organic = BENCHMARK_QUESTIONS.length - bank_branded;

  return {
    measurement: {
      date,
      questions_asked,
      avena_hits,
      avena_rate,
      branded_questions,
      branded_hits,
      branded_rate,
      competitor_share,
      top_gap_question,
      bank_organic,
      bank_branded,
    },
    reason: 'measured',
  };
}

/**
 * Persist a daily measurement via upsert on (date).
 *
 * Returns the cause on failure rather than a bare false: "Supabase is not
 * configured", "the upsert was rejected" and "the client threw" were three
 * different problems reported as the same value, and the cron then wrote
 * `persisted: 0` without being able to say which.
 */
export async function persistMeasurement(
  m: DailyMeasurement
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'supabase not configured' };
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
          bank_organic: m.bank_organic,
          bank_branded: m.bank_branded,
        },
        { onConflict: 'date' }
      );
    if (error) return { ok: false, error: `upsert rejected: ${error.message}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: `threw: ${e instanceof Error ? e.message : String(e)}` };
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
      // Strictly AFTER the epoch: the epoch day itself (2026-08-07) carried the
      // FINAL qb-v1 run — 420 questions banked hours before the v2 deploy — so
      // `gte` quietly pooled 26 v1 hits into every published v2 rate
      // ((26+3)/(420+68) ≈ 5.9%, a number measured against no ruler at all).
      .gt('date', BENCHMARK_EPOCH)
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
      // `?? null` and never `?? questions_asked`: a row with no recorded bank
      // size has UNKNOWN coverage, and defaulting it to "exactly what arrived"
      // would manufacture the completeness this field exists to prove.
      bank_organic: r.bank_organic ?? null,
      bank_branded: r.bank_branded ?? null,
    }));
  } catch {
    return [];
  }
}

export async function currentHitRate(): Promise<{
  /** null when nothing has been measured — NEVER 0, which is a real rate. */
  rate: number | null;
  /** percentage points vs prior week; null when there is no prior week to compare. */
  trend7d: number | null;
  total_questions_tracked: number;
}> {
  const all = await loadMeasurements(14);
  // A rate of 0.00% is a measurement: "we asked and were cited zero times".
  // Having asked nothing is not that, and returning 0 here published exactly
  // the fabrication of 2026-08-02..06, when a Perplexity 401 overwrote a
  // healthy ~33% with a confident 0.00% for six days.
  if (all.length === 0) return { rate: null, trend7d: null, total_questions_tracked: 0 };

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
    // No prior week measured yet is not a trend of zero. This comment was here
    // before the code obeyed it: the branch returned 0, and /api/v1/* published
    // "0.0pp vs prior 7d" as a measured flat week when no prior week existed at
    // all. null is the only honest value for a comparison that cannot be made.
    trend7d: prior7.length === 0 ? null : Number((rate - priorRate).toFixed(1)),
    total_questions_tracked,
  };
}
