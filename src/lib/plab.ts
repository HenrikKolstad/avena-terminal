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

async function askAnthropic(model: string, question: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  try {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model,
      max_tokens: 100,
      messages: [{ role: 'user', content: PROMPT_PREFIX + question }],
    });
    const block = res.content[0];
    return block.type === 'text' ? block.text.trim() : null;
  } catch {
    return null;
  }
}

async function askPerplexity(model: string, question: string): Promise<string | null> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: PROMPT_PREFIX + question }] }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    return json.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

async function ask(p: PLABProvider, question: string): Promise<string | null> {
  if (p.provider === 'anthropic')  return askAnthropic(p.model, question);
  if (p.provider === 'perplexity') return askPerplexity(p.model, question);
  return null;
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

export interface PLABRunSummary {
  run_date: string;
  models_scored: Array<{ model: string; label: string; n: number; correct: number; accuracy: number }>;
  models_skipped: string[];
  errors: string[];
}

export async function runBenchmark(): Promise<PLABRunSummary> {
  const run_date = new Date().toISOString().slice(0, 10);
  const summary: PLABRunSummary = { run_date, models_scored: [], models_skipped: [], errors: [] };
  if (!supabase) { summary.errors.push('no_supabase'); return summary; }

  for (const p of PLAB_PROVIDERS) {
    // Probe with the first question; skip provider entirely if the key is absent.
    const probe = await ask(p, PLAB_QUESTIONS[0].question);
    if (probe === null) { summary.models_skipped.push(p.label); continue; }

    let correct = 0;
    let answered = 0;

    for (let i = 0; i < PLAB_QUESTIONS.length; i++) {
      const q = PLAB_QUESTIONS[i];
      const t0 = Date.now();
      const reply = i === 0 ? probe : await ask(p, q.question);
      const latency = Date.now() - t0;
      if (reply === null) continue;
      answered++;
      const { correct: ok, extracted } = scoreReply(q, reply);
      if (ok) correct++;
      try {
        await supabase.from('plab_runs').insert({
          run_date,
          provider: p.provider,
          model: p.model,
          model_label: p.label,
          question_id: q.id,
          category: q.category,
          answer_raw: reply.slice(0, 1000),
          extracted,
          correct: ok,
          latency_ms: i === 0 ? null : latency,
          plab_version: PLAB_VERSION,
        });
      } catch (e) {
        summary.errors.push(`insert:${p.model}:${q.id}:${(e as Error).message}`);
      }
    }

    const accuracy = answered > 0 ? Number(((correct / answered) * 100).toFixed(1)) : 0;
    try {
      await supabase.from('plab_daily_scores').upsert({
        run_date,
        provider: p.provider,
        model: p.model,
        model_label: p.label,
        n_questions: answered,
        n_correct: correct,
        accuracy,
        plab_version: PLAB_VERSION,
      }, { onConflict: 'run_date,model' });
    } catch (e) {
      summary.errors.push(`score:${p.model}:${(e as Error).message}`);
    }
    summary.models_scored.push({ model: p.model, label: p.label, n: answered, correct, accuracy });
  }

  return summary;
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
