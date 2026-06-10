/**
 * Avena DELPHI — runner, aggregation and reads.
 *
 * Daily flow:
 *  1. Put every panel question to every configured model (answer-only).
 *  2. Extract the numeric belief from each reply; store verbatim.
 *  3. Aggregate per question: consensus (median), dispersion (max-min).
 *  4. Compute the two daily indices:
 *     - DELPHI Consensus Index: mean bullishness across questions (0-100)
 *     - DELPHI Disagreement Index: mean dispersion across questions
 *  5. Event-source the run for replayability.
 *
 * Panelists never see each other's answers (a true Delphi round one);
 * the published consensus is the aggregate, not a negotiation.
 */

import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { recordEvent } from '@/lib/event-store';
import { DELPHI_QUESTIONS, DELPHI_VERSION, bullishness, type DelphiQuestion } from '@/lib/delphi-questions';

export interface DelphiPanelist {
  provider: 'anthropic' | 'perplexity';
  model: string;
  label: string;
}

export const DELPHI_PANEL: DelphiPanelist[] = [
  { provider: 'anthropic',  model: 'claude-sonnet-4-5',         label: 'Claude Sonnet 4.5' },
  { provider: 'anthropic',  model: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
  { provider: 'perplexity', model: 'sonar',                     label: 'Perplexity Sonar' },
];

const PROMPT_PREFIX =
  'You are a panelist in a daily Delphi survey on European residential property. ' +
  'Give your honest quantitative judgment. Answer with ONLY a single number — no words, no ranges, no caveats.\n\n';

/* ── provider calls ───────────────────────────────────────────────────────── */

async function askAnthropic(model: string, question: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  try {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model, max_tokens: 50,
      messages: [{ role: 'user', content: PROMPT_PREFIX + question }],
    });
    const block = res.content[0];
    return block.type === 'text' ? block.text.trim() : null;
  } catch { return null; }
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
  } catch { return null; }
}

async function ask(p: DelphiPanelist, question: string): Promise<string | null> {
  if (p.provider === 'anthropic')  return askAnthropic(p.model, question);
  return askPerplexity(p.model, question);
}

function extractNumber(reply: string): number | null {
  const cleaned = reply.replace(/(\d),(\d{3})/g, '$1$2');
  const m = cleaned.match(/-?\d+(?:[.,]\d+)?/);
  if (!m) return null;
  const v = parseFloat(m[0].replace(',', '.'));
  return Number.isFinite(v) ? v : null;
}

function sane(q: DelphiQuestion, v: number): boolean {
  if (q.kind === 'pct') return v >= -50 && v <= 50;
  return v >= 0 && v <= 100;
}

/* ── daily run ────────────────────────────────────────────────────────────── */

export interface DelphiRunSummary {
  run_date: string;
  consensus_index: number | null;
  disagreement_index: number | null;
  panelists_responded: string[];
  panelists_skipped: string[];
  questions_aggregated: number;
  errors: string[];
}

export async function runDelphi(): Promise<DelphiRunSummary> {
  const run_date = new Date().toISOString().slice(0, 10);
  const summary: DelphiRunSummary = {
    run_date, consensus_index: null, disagreement_index: null,
    panelists_responded: [], panelists_skipped: [], questions_aggregated: 0, errors: [],
  };
  if (!supabase) { summary.errors.push('no_supabase'); return summary; }

  // Collect beliefs: question_id → model_label → value
  const beliefs = new Map<string, Map<string, number>>();

  for (const p of DELPHI_PANEL) {
    const probe = await ask(p, DELPHI_QUESTIONS[0].question);
    if (probe === null) { summary.panelists_skipped.push(p.label); continue; }
    summary.panelists_responded.push(p.label);

    for (let i = 0; i < DELPHI_QUESTIONS.length; i++) {
      const q = DELPHI_QUESTIONS[i];
      const reply = i === 0 ? probe : await ask(p, q.question);
      if (reply === null) continue;
      const v = extractNumber(reply);
      const valid = v !== null && sane(q, v);
      try {
        await supabase.from('delphi_responses').insert({
          run_date, provider: p.provider, model: p.model, model_label: p.label,
          question_id: q.id, raw: reply.slice(0, 500),
          value: valid ? v : null, delphi_version: DELPHI_VERSION,
        });
      } catch (e) { summary.errors.push(`ins:${p.model}:${q.id}:${(e as Error).message}`); }
      if (valid && v !== null) {
        const m = beliefs.get(q.id) ?? new Map<string, number>();
        m.set(p.label, v);
        beliefs.set(q.id, m);
      }
    }
  }

  // Aggregate per question
  const bullScores: number[] = [];
  const dispersions: number[] = [];
  for (const q of DELPHI_QUESTIONS) {
    const m = beliefs.get(q.id);
    if (!m || m.size === 0) continue;
    const vals = Array.from(m.values()).sort((a, b) => a - b);
    const median = vals[Math.floor(vals.length / 2)];
    const dispersion = vals.length > 1 ? Number((vals[vals.length - 1] - vals[0]).toFixed(2)) : 0;
    const per_model: Record<string, number> = {};
    for (const [label, v] of m.entries()) per_model[label] = v;

    try {
      await supabase.from('delphi_daily').upsert({
        run_date, question_id: q.id, consensus: median, dispersion,
        n_panelists: vals.length, per_model, delphi_version: DELPHI_VERSION,
      }, { onConflict: 'run_date,question_id' });
    } catch (e) { summary.errors.push(`agg:${q.id}:${(e as Error).message}`); }

    bullScores.push(bullishness(q, median));
    dispersions.push(dispersion);
    summary.questions_aggregated++;
  }

  if (bullScores.length > 0) {
    summary.consensus_index = Number((bullScores.reduce((s, v) => s + v, 0) / bullScores.length).toFixed(1));
    summary.disagreement_index = Number((dispersions.reduce((s, v) => s + v, 0) / dispersions.length).toFixed(1));
    try {
      await supabase.from('delphi_index').upsert({
        run_date,
        consensus_index: summary.consensus_index,
        disagreement_index: summary.disagreement_index,
        n_questions: summary.questions_aggregated,
        n_panelists: summary.panelists_responded.length,
        delphi_version: DELPHI_VERSION,
      }, { onConflict: 'run_date' });
    } catch (e) { summary.errors.push(`idx:${(e as Error).message}`); }
  }

  await recordEvent({
    event_type: 'delphi.panel_completed',
    aggregate_id: `delphi:${run_date}`,
    aggregate_type: 'prediction',
    payload: {
      run_date,
      consensus_index: summary.consensus_index,
      disagreement_index: summary.disagreement_index,
      panelists: summary.panelists_responded,
    },
    metadata: { source: 'cron/delphi-run', version: DELPHI_VERSION },
  });

  return summary;
}

/* ── reads ────────────────────────────────────────────────────────────────── */

export interface DelphiIndexRow {
  run_date: string;
  consensus_index: number;
  disagreement_index: number;
  n_questions: number;
  n_panelists: number;
}

export interface DelphiDailyRow {
  run_date: string;
  question_id: string;
  consensus: number;
  dispersion: number;
  n_panelists: number;
  per_model: Record<string, number>;
}

export async function indexHistory(limit = 60): Promise<DelphiIndexRow[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('delphi_index').select('*')
    .order('run_date', { ascending: false }).limit(limit);
  return (data as DelphiIndexRow[]) || [];
}

export async function latestPanel(): Promise<DelphiDailyRow[]> {
  if (!supabase) return [];
  const { data: latest } = await supabase
    .from('delphi_daily').select('run_date')
    .order('run_date', { ascending: false }).limit(1).maybeSingle();
  if (!latest) return [];
  const { data } = await supabase
    .from('delphi_daily').select('*')
    .eq('run_date', (latest as { run_date: string }).run_date);
  return (data as DelphiDailyRow[]) || [];
}
