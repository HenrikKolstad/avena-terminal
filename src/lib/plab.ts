/**
 * PLAB — the European Property AI Benchmark. Runner + scoring + reads.
 *
 * The asymmetric play: AI labs respond to benchmarks the way fund
 * managers respond to indices. There is no public benchmark for
 * European property knowledge. The first one wins by default, and the
 * publisher becomes the referee. To score well, a model has to either
 * train on European property substance or live-query it — and Avena is
 * the substrate on both paths.
 *
 * v1 providers: Anthropic (two tiers) + Perplexity Sonar. Each provider
 * is skipped gracefully when its key is absent; the leaderboard page
 * lists unintegrated providers as pending. OpenAI / Gemini land when
 * their keys are configured.
 *
 * Fairness rules:
 *  - Identical prompt per question for every model.
 *  - Answer-only instruction; no retrieval hints.
 *  - Ground truths are public institutional facts (never Avena's own
 *    numbers — we are not both contestant and judge).
 *  - Raw replies stored verbatim in plab_runs for public audit.
 */

import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { PLAB_QUESTIONS, PLAB_VERSION, type PLABQuestion } from '@/lib/plab-questions';

export interface PLABProvider {
  provider: 'anthropic' | 'perplexity' | 'openai' | 'google';
  model: string;
  label: string;
}

/** Providers scored when their API key is present. */
export const PLAB_PROVIDERS: PLABProvider[] = [
  { provider: 'anthropic',  model: 'claude-sonnet-4-5',           label: 'Claude Sonnet 4.5' },
  { provider: 'anthropic',  model: 'claude-haiku-4-5-20251001',   label: 'Claude Haiku 4.5' },
  { provider: 'perplexity', model: 'sonar',                       label: 'Perplexity Sonar' },
];

/** Listed on the leaderboard as pending until keys are configured. */
export const PLAB_PENDING: Array<{ label: string; note: string }> = [
  { label: 'OpenAI GPT',     note: 'integration pending' },
  { label: 'Google Gemini',  note: 'integration pending' },
  { label: 'Mistral Large',  note: 'integration pending' },
];

const PROMPT_PREFIX =
  'You are being benchmarked on European property and finance knowledge. ' +
  'Answer the following question with ONLY the answer — a single number or a short phrase. ' +
  'No explanation, no caveats.\n\nQuestion: ';

/* -------------------------------------------------------------------------- */
/* Provider calls                                                              */
/* -------------------------------------------------------------------------- */

/**
 * WHY THIS IS A DISCRIMINATED RESULT AND NOT `string | null` (2026-10-12).
 *
 * Both provider calls used to end in `catch { return null }`, and the runner
 * read a null probe as "key absent → skip the provider". So three different
 * facts collapsed into one word:
 *
 *   the key is not configured          (nothing to measure, correct to skip)
 *   the provider refused us on billing (a measurement we OWE and did not take)
 *   the provider timed out             (ditto)
 *
 * The consequence was published. `plab_daily_scores` holds Claude Sonnet 4.5
 * and Claude Haiku 4.5 up to 2026-08-09 and Perplexity Sonar up to 2026-08-27 —
 * two different outages at two different dates. `latestScores()` returns the
 * newest date with ANY row, so /benchmark and /api/v1/plab have been serving
 * "01 Perplexity Sonar 100.0% 36/36" as THE leaderboard of a benchmark the same
 * page calls daily, with the two Claude contestants absent and nothing anywhere
 * saying they were attempted and refused. The runner logged `success` with
 * `errors: []` every morning while scoring nobody.
 *
 * This is the project's recurring bug on the surface that invites citation:
 * /api/v1/plab carries a `cite_as` line and a DOI, so an AI assistant reading
 * it is being handed a 46-day-old single-contestant table as current fact.
 */
export type AskResult =
  | { ok: true; text: string }
  /** No API key configured for this provider. Nothing was attempted. */
  | { ok: false; reason: 'no_key' }
  /** The provider was asked and did not answer. `detail` is for the log only. */
  | { ok: false; reason: 'provider_error'; detail: string }
  /** The provider answered with something that was not text. */
  | { ok: false; reason: 'empty_reply'; detail: string };

/** First line of an error, trimmed — never an empty string, which reads as "fine". */
function detailOf(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  const flat = raw.replace(/\s+/g, ' ').trim();
  return flat.length > 0 ? flat.slice(0, 300) : 'threw a value with no message';
}

async function askAnthropic(model: string, question: string): Promise<AskResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, reason: 'no_key' };
  try {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model,
      max_tokens: 100,
      messages: [{ role: 'user', content: PROMPT_PREFIX + question }],
    });
    const block = res.content[0];
    if (!block || block.type !== 'text') {
      return { ok: false, reason: 'empty_reply', detail: `content[0] was ${block ? block.type : 'absent'}` };
    }
    return { ok: true, text: block.text.trim() };
  } catch (e) {
    return { ok: false, reason: 'provider_error', detail: detailOf(e) };
  }
}

async function askPerplexity(model: string, question: string): Promise<AskResult> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return { ok: false, reason: 'no_key' };
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    let res: Response;
    try {
      res = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: PROMPT_PREFIX + question }] }),
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      // The 401 body is the whole diagnosis ("You exceeded your current quota").
      // Dropping it is what made 44 days of refusals look like an absent key.
      const body = await res.text().catch(() => '');
      return { ok: false, reason: 'provider_error', detail: `HTTP ${res.status}: ${body.replace(/\s+/g, ' ').trim().slice(0, 200)}` };
    }
    const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const text = json.choices?.[0]?.message?.content?.trim();
    if (!text) return { ok: false, reason: 'empty_reply', detail: 'no choices[0].message.content' };
    return { ok: true, text };
  } catch (e) {
    return { ok: false, reason: 'provider_error', detail: detailOf(e) };
  }
}

async function ask(p: PLABProvider, question: string): Promise<AskResult> {
  if (p.provider === 'anthropic')  return askAnthropic(p.model, question);
  if (p.provider === 'perplexity') return askPerplexity(p.model, question);
  return { ok: false, reason: 'no_key' };
}

/* -------------------------------------------------------------------------- */
/* Scoring                                                                     */
/* -------------------------------------------------------------------------- */

export function extractNumeric(reply: string): number | null {
  // Strip thousands separators, then take the first decimal number.
  const cleaned = reply.replace(/(\d),(\d{3})/g, '$1$2');
  const m = cleaned.match(/-?\d+(?:[.,]\d+)?/);
  if (!m) return null;
  return parseFloat(m[0].replace(',', '.'));
}

export function scoreReply(q: PLABQuestion, reply: string): { correct: boolean; extracted: string } {
  if (q.answer_type === 'numeric') {
    const v = extractNumeric(reply);
    if (v == null) return { correct: false, extracted: '' };
    const ok = Math.abs(v - (q.truth_numeric ?? NaN)) <= (q.tolerance ?? 0);
    return { correct: ok, extracted: String(v) };
  }
  const lower = reply.toLowerCase();
  const hit = (q.accept ?? []).find(a => lower.includes(a));
  return { correct: !!hit, extracted: hit ?? lower.slice(0, 80) };
}

/* -------------------------------------------------------------------------- */
/* Benchmark run                                                               */
/* -------------------------------------------------------------------------- */

/** A contestant the runner was asked to score and could not. */
export interface PLABRefusal {
  model: string;
  label: string;
  reason: 'provider_error' | 'empty_reply';
  detail: string;
}

export interface PLABRunSummary {
  run_date: string;
  models_scored: Array<{
    model: string;
    label: string;
    n: number;
    correct: number;
    /** NULL when nothing was answered. Never 0 — see the comment in the loop. */
    accuracy: number | null;
    rows_attempted: number;
    rows_written: number;
    score_row_written: boolean;
  }>;
  /** No API key configured. Correct to skip: there was nothing to measure. */
  models_skipped: string[];
  /** Configured, attempted, and refused. A measurement we owe and did not take. */
  models_refused: PLABRefusal[];
  /** Providers configured for this version, whatever happened to them. */
  models_configured: number;
  /** True when every configured provider holding a key refused. */
  all_keyed_providers_refused: boolean;
  errors: string[];
}

export async function runBenchmark(): Promise<PLABRunSummary> {
  const run_date = new Date().toISOString().slice(0, 10);
  const summary: PLABRunSummary = {
    run_date,
    models_scored: [],
    models_skipped: [],
    models_refused: [],
    models_configured: PLAB_PROVIDERS.length,
    all_keyed_providers_refused: false,
    errors: [],
  };
  if (!supabase) { summary.errors.push('no_supabase'); return summary; }

  for (const p of PLAB_PROVIDERS) {
    // Probe with the first question. A missing key and a refusal are different
    // facts and are recorded differently — collapsing them is what let 44 days
    // of Perplexity 401s and 64 days of Anthropic 400s read as "not integrated".
    const probe = await ask(p, PLAB_QUESTIONS[0].question);
    if (!probe.ok) {
      if (probe.reason === 'no_key') {
        summary.models_skipped.push(p.label);
      } else {
        summary.models_refused.push({ model: p.model, label: p.label, reason: probe.reason, detail: probe.detail });
        summary.errors.push(`refused:${p.model}:${probe.reason}:${probe.detail}`);
      }
      continue;
    }

    let correct = 0;
    let answered = 0;
    let rowsAttempted = 0;
    let rowsWritten = 0;

    for (let i = 0; i < PLAB_QUESTIONS.length; i++) {
      const q = PLAB_QUESTIONS[i];
      const t0 = Date.now();
      const reply = i === 0 ? probe : await ask(p, q.question);
      const latency = Date.now() - t0;
      if (!reply.ok) {
        if (reply.reason !== 'no_key') summary.errors.push(`q:${p.model}:${q.id}:${reply.reason}:${reply.detail}`);
        continue;
      }
      answered++;
      const { correct: ok, extracted } = scoreReply(q, reply.text);
      if (ok) correct++;
      rowsAttempted++;
      // The supabase client RESOLVES on a rejected write and reports it in
      // `error`, so a try/catch around it catches nothing — the 2026-10-10
      // counterpart-scan lesson. Read the error and count only what landed.
      const { error: insErr } = await supabase.from('plab_runs').insert({
        run_date,
        provider: p.provider,
        model: p.model,
        model_label: p.label,
        question_id: q.id,
        category: q.category,
        answer_raw: reply.text.slice(0, 1000),
        extracted,
        correct: ok,
        latency_ms: i === 0 ? null : latency,
        plab_version: PLAB_VERSION,
      });
      if (insErr) summary.errors.push(`insert:${p.model}:${q.id}:${insErr.message}`);
      else rowsWritten++;
    }

    // NEVER a fabricated zero. `answered === 0` used to yield `accuracy: 0`,
    // which was then upserted into plab_daily_scores and would have published
    // "Claude Sonnet 4.5 — 0.0%" as a measured result about somebody else's
    // model because OUR billing failed. It has not happened (no 0-accuracy row
    // exists in the table) only because the probe gate stopped the loop first;
    // that is luck, not a design, and it is the citation-measure bug exactly.
    const accuracy = answered > 0 ? Number(((correct / answered) * 100).toFixed(1)) : null;
    let scoreRowWritten = false;
    if (accuracy === null) {
      summary.errors.push(`no_answers:${p.model}:probe answered but every question failed — no score row written`);
    } else {
      const { error: scoreErr } = await supabase.from('plab_daily_scores').upsert({
        run_date,
        provider: p.provider,
        model: p.model,
        model_label: p.label,
        n_questions: answered,
        n_correct: correct,
        accuracy,
        plab_version: PLAB_VERSION,
      }, { onConflict: 'run_date,model' });
      if (scoreErr) summary.errors.push(`score:${p.model}:${scoreErr.message}`);
      else scoreRowWritten = true;
    }
    summary.models_scored.push({
      model: p.model,
      label: p.label,
      n: answered,
      correct,
      accuracy,
      rows_attempted: rowsAttempted,
      rows_written: rowsWritten,
      score_row_written: scoreRowWritten,
    });
  }

  const keyed = PLAB_PROVIDERS.length - summary.models_skipped.length;
  summary.all_keyed_providers_refused = keyed > 0 && summary.models_refused.length === keyed;
  return summary;
}

/* -------------------------------------------------------------------------- */
/* What the published leaderboard is actually a leaderboard OF                 */
/* -------------------------------------------------------------------------- */

export interface PLABContestStatus {
  /** The run_date the standings come from, or null when there are none. */
  run_date: string | null;
  /** Whole days between that run and now. Null when unknown — never 0. */
  days_since_run: number | null;
  /** True only when the standings are from today or yesterday. */
  measurement_current: boolean;
  /** Providers configured for this PLAB version. */
  configured: number;
  /** How many of them have a score on `run_date`. */
  scored_on_run_date: number;
  /** Configured contestants with no score on that date, by label. */
  absent: string[];
  /** One honest sentence. Never empty, never silent about staleness. */
  note: string;
}

/**
 * Describe the standings honestly, including what is MISSING from them.
 *
 * Pure: the caller passes the clock. `latestScores()` returns the newest date
 * holding ANY row, so a date on which only one provider managed to answer
 * silently becomes "the leaderboard" — which is exactly what has been published
 * since 2026-08-27. This function is what makes that visible to a consumer.
 */
export function describeContest(
  configuredLabels: readonly string[],
  scoredLabels: readonly string[],
  runDate: string | null,
  nowIso: string,
): PLABContestStatus {
  const now = Date.parse(nowIso);
  const run = runDate ? Date.parse(`${runDate}T00:00:00Z`) : NaN;
  const daysSince =
    Number.isFinite(now) && Number.isFinite(run)
      ? Math.floor((Math.floor(now / 86_400_000) * 86_400_000 - run) / 86_400_000)
      : null;
  const scored = new Set(scoredLabels);
  const absent = configuredLabels.filter((l) => !scored.has(l));

  if (!runDate || daysSince === null) {
    return {
      run_date: runDate,
      days_since_run: null,
      measurement_current: false,
      configured: configuredLabels.length,
      scored_on_run_date: scoredLabels.length,
      absent,
      note:
        runDate === null
          ? 'No benchmark run has ever been scored, so there are no standings to report.'
          : `Standings are dated ${runDate} but their age could not be computed, so they must not be read as current.`,
    };
  }

  const current = daysSince <= 1;
  const age = current
    ? `scored ${daysSince === 0 ? 'today' : 'yesterday'}`
    : `${daysSince} days old — NOT a current measurement`;
  const composition =
    absent.length === 0
      ? `all ${configuredLabels.length} configured contestants scored`
      : `${scoredLabels.length} of ${configuredLabels.length} configured contestants scored; ` +
        `${absent.join(', ')} ${absent.length === 1 ? 'was' : 'were'} attempted and did not return a score, ` +
        `so ${absent.length === 1 ? 'it is' : 'they are'} absent from these standings rather than unranked`;

  return {
    run_date: runDate,
    days_since_run: daysSince,
    measurement_current: current,
    configured: configuredLabels.length,
    scored_on_run_date: scoredLabels.length,
    absent,
    note: `Standings dated ${runDate}, ${age}. ${composition}.`,
  };
}

/* -------------------------------------------------------------------------- */
/* Reads for the /benchmark page                                               */
/* -------------------------------------------------------------------------- */

export interface PLABScoreRow {
  run_date: string;
  provider: string;
  model: string;
  model_label: string;
  n_questions: number;
  n_correct: number;
  accuracy: number;
  plab_version: string;
}

export interface PLABRunRow {
  run_date: string;
  model: string;
  model_label: string;
  question_id: string;
  category: string;
  answer_raw: string;
  correct: boolean;
}

export async function latestScores(): Promise<PLABScoreRow[]> {
  if (!supabase) return [];
  const { data: latest } = await supabase
    .from('plab_daily_scores')
    .select('run_date')
    .order('run_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latest) return [];
  const { data } = await supabase
    .from('plab_daily_scores')
    .select('*')
    .eq('run_date', (latest as { run_date: string }).run_date)
    .order('accuracy', { ascending: false });
  return (data as PLABScoreRow[]) || [];
}

export async function latestRuns(): Promise<PLABRunRow[]> {
  if (!supabase) return [];
  const { data: latest } = await supabase
    .from('plab_runs')
    .select('run_date')
    .order('run_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latest) return [];
  const { data } = await supabase
    .from('plab_runs')
    .select('run_date, model, model_label, question_id, category, answer_raw, correct')
    .eq('run_date', (latest as { run_date: string }).run_date)
    .limit(2000);
  return (data as PLABRunRow[]) || [];
}
