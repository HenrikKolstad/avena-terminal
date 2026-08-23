/**
 * Honest cron logging. Every scheduled agent run writes a real row to
 * `cron_logs`. The /swarm page queries this table for the tasks-completed
 * counter — no more formula-based inflation.
 *
 * Usage pattern inside a cron route:
 *
 *   const log = await startCronLog('prometheus', '/api/cron/prometheus');
 *   try {
 *     const summary = await runPrometheus();
 *     await finishCronLog(log, 'success', summary);
 *   } catch (e) {
 *     await finishCronLog(log, 'error', null, e);
 *   }
 */

import type { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

export interface CronLogHandle {
  id: number | null;
  startedAt: number;
  agentId: string;
}

export async function startCronLog(
  agentId: string,
  cronPath?: string,
  invokedBy?: string | null
): Promise<CronLogHandle> {
  const startedAt = Date.now();
  if (!supabase) return { id: null, startedAt, agentId };

  try {
    const { data } = await supabase
      .from('cron_logs')
      .insert({
        agent_id: agentId,
        cron_path: cronPath ?? null,
        status: 'started',
        started_at: new Date(startedAt).toISOString(),
        invoked_by: invokedBy ?? null,
      })
      .select('id')
      .single();
    return { id: data?.id ?? null, startedAt, agentId };
  } catch {
    return { id: null, startedAt, agentId };
  }
}

/**
 * Turn any thrown/returned error value into text worth reading tomorrow.
 *
 * The previous version was `String(error)`, which renders every non-Error
 * object as "[object Object]". Supabase returns PostgrestError — a plain
 * object, not an Error — so /api/cron/counterpart-discover recorded
 * "[object Object]" on all 86 of its failures: a job that has never once
 * succeeded and never once said why.
 */
export function describeError(error: unknown): string | null {
  if (error == null) return null;
  if (typeof error === 'string') return error.slice(0, 1000) || null;
  if (error instanceof Error) return error.message.slice(0, 1000);

  // Supabase PostgrestError and similar shapes: keep the fields that identify
  // the failure rather than flattening the object to "[object Object]".
  if (typeof error === 'object') {
    const e = error as Record<string, unknown>;
    const parts = ['message', 'code', 'details', 'hint']
      .filter((k) => typeof e[k] === 'string' && (e[k] as string).length > 0)
      .map((k) => `${k}=${e[k] as string}`);
    if (parts.length) return parts.join(' | ').slice(0, 1000);
    try {
      const json = JSON.stringify(error);
      if (json && json !== '{}') return json.slice(0, 1000);
    } catch { /* circular — fall through */ }
  }

  const s = String(error);
  return s === '[object Object]' ? 'unserialisable error value' : s.slice(0, 1000);
}

export async function finishCronLog(
  handle: CronLogHandle,
  status: 'success' | 'error' | 'skipped',
  summary?: unknown,
  error?: unknown
): Promise<void> {
  if (!supabase || handle.id == null) return;
  const finishedAt = Date.now();
  try {
    await supabase
      .from('cron_logs')
      .update({
        status,
        finished_at: new Date(finishedAt).toISOString(),
        duration_ms: finishedAt - handle.startedAt,
        output_summary: summary ?? null,
        error: describeError(error),
      })
      .eq('id', handle.id);
  } catch {
    /* silent — logging failure must never break the cron */
  }
}

/** Fetch total + per-agent counts for the swarm page. Only counts 'success'. */
export async function loadAgentCounts(): Promise<{
  per_agent: Record<string, { runs: number; last_run: string | null; last_status: string | null }>;
  total: number;
}> {
  if (!supabase) return { per_agent: {}, total: 0 };
  try {
    const { data } = await supabase
      .from('cron_logs')
      .select('agent_id, status, started_at')
      .order('started_at', { ascending: false })
      .limit(5000);

    const per: Record<string, { runs: number; last_run: string | null; last_status: string | null }> = {};
    for (const row of data ?? []) {
      const a = row.agent_id as string;
      if (!per[a]) per[a] = { runs: 0, last_run: null, last_status: null };
      if (row.status === 'success') per[a].runs++;
      if (!per[a].last_run) {
        per[a].last_run = row.started_at as string;
        per[a].last_status = row.status as string;
      }
    }
    const total = Object.values(per).reduce((s, x) => s + x.runs, 0);
    return { per_agent: per, total };
  } catch {
    return { per_agent: {}, total: 0 };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// withCronLog — the wrapper that makes a scheduled route observable.
//
// WHY THIS EXISTS
// 24 of 64 scheduled crons wrote nothing to `cron_logs`. For those routes
// "no rows" was evidence of nothing, so seven of them had been dead for up
// to four months without a single signal: /api/detect-events last wrote on
// 2026-04-11, generate-briefs / weekly-alpha / digest on 2026-06-15, and
// predictions/generate and push-training-data have never written a row at
// all. Nothing surfaced any of it, because a job that cannot report is
// indistinguishable from a job with nothing to report.
//
// Hand-writing the same try/finally in 24 files is how transcription bugs
// get in. One wrapper, tested once, applied as a one-line change per route.
//
// THREE DECISIONS WORTH KNOWING
//
// 1. A REJECTED PLATFORM RUN IS A FAILED RUN, NOT SILENCE.
//    Only Vercel's scheduler sets `x-vercel-cron: 1`. If that header is
//    present and the route's own auth check still rejects the request, the
//    job was invoked and did not run — that is logged as an error. This is
//    exactly the state /api/detect-events has been in since April: it wants
//    an `x-cron-key` header the scheduler does not send, so it answers 401
//    to its own scheduler every night. An unauthenticated request WITHOUT
//    that header is ordinary internet noise and is not logged, so a public
//    endpoint cannot be used to fill the table.
//
// 2. THE 'started' ROW IS WRITTEN BEFORE THE HANDLER.
//    A route that exceeds maxDuration never returns, so the only trace it
//    can leave is a `started` row with a NULL `finished_at`. That is the
//    signal that caught the citation agent's timeout; it is worth the extra
//    round trip.
//
// 3. AUTH BEHAVIOUR IS COPIED, NEVER CHANGED.
//    Each route keeps the exact predicate it had. Fixing detect-events'
//    header mismatch would revive a cron that has been dead four months —
//    a behaviour change that does not belong in a logging commit. It is
//    logged loudly instead, and fixed on its own merits.

export type CronAuth = (req: NextRequest) => boolean;
export type CronHandler = (req: NextRequest) => Promise<Response>;

/** `Authorization: Bearer $CRON_SECRET` — the header Vercel attaches to
 *  scheduled invocations when CRON_SECRET is configured. */
export function bearerCronAuth(req: NextRequest): boolean {
  return req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`;
}

/** `x-cron-key: $CRON_SECRET` — a header the Vercel scheduler does NOT send.
 *  Preserved verbatim for the routes that already use it so that wiring up
 *  logging changes nothing about what runs. See decision 3 above. */
export function xCronKeyAuth(req: NextRequest): boolean {
  return req.headers.get('x-cron-key') === process.env.CRON_SECRET;
}

const MAX_STRING = 500;
const MAX_ARRAY = 40;
const MAX_KEYS = 60;

/**
 * Bound a response body so one chatty route cannot bloat `cron_logs`.
 * Truncation is always marked in the stored value — a silently shortened
 * summary would be the same class of lie this module exists to remove.
 */
export function boundSummary(value: unknown, depth = 0): unknown {
  if (value == null) return value ?? null;
  if (typeof value === 'string') {
    return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…[+${value.length - MAX_STRING} chars]` : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (depth >= 4) return '[depth limit]';

  if (Array.isArray(value)) {
    const head = value.slice(0, MAX_ARRAY).map((v) => boundSummary(v, depth + 1));
    return value.length > MAX_ARRAY ? [...head, `…[+${value.length - MAX_ARRAY} more]`] : head;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    const out: Record<string, unknown> = {};
    for (const [k, v] of entries.slice(0, MAX_KEYS)) out[k] = boundSummary(v, depth + 1);
    if (entries.length > MAX_KEYS) out['_truncated_keys'] = entries.length - MAX_KEYS;
    return out;
  }
  return String(value);
}

/**
 * Derive an honest run status from what the handler actually returned.
 *
 * A non-2xx response is an error — no exceptions, and in particular no
 * "it was already broken" allowance. A 2xx response is a success UNLESS the
 * body says otherwise via one of three documented markers:
 *
 *   1. `skipped: true` / `status: 'skipped'` — deliberately dormant because
 *      a credential is not configured. Distinct from failure on purpose.
 *   2. a NON-EMPTY `errors` array.
 *   3. a non-empty `error` string.
 *
 * WHY 2 AND 3 EXIST
 * A run that recorded its own failures and then returned HTTP 200
 * `{ success: true }` is the recurring bug of this project wearing a
 * different hat: the failure is right there in the body and the status still
 * says the job is fine. Measured instances on 2026-08-22 alone —
 *   predictions-generate  errors:["claude_parse: 400 … credit balance is too
 *                         low …"]                        -> logged 'success'
 *   causal-update         errors:["debate_null: costa_blanca", …]
 *                                                        -> logged 'success'
 *   dvf-ingest            two FK-violation chunks, ~935 of 3,504 rows dropped
 *                                                        -> logged 'success'
 * — none of which any query for failing crons could ever have surfaced.
 *
 * A run with errors is not a clean run. It may still have done useful work,
 * and the full body is kept in output_summary so that work stays visible;
 * what it does not get is a green light. Deliberately NOT introducing a
 * fourth 'partial' status: /swarm counts status='success' and an unknown
 * value would silently drop out of every existing reader.
 */
export function deriveCronStatus(
  res: Response,
  body: unknown,
): { status: 'success' | 'error' | 'skipped'; error: unknown } {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  if (b.skipped === true || b.status === 'skipped') {
    return { status: 'skipped', error: null };
  }
  if (!res.ok) {
    return { status: 'error', error: b.error ?? b.message ?? `HTTP ${res.status}` };
  }
  if (Array.isArray(b.errors) && b.errors.length > 0) {
    const first = describeError(b.errors[0]) ?? 'unspecified';
    return {
      status: 'error',
      error: `HTTP ${res.status} but the run reported ${b.errors.length} error(s); first: ${first}`,
    };
  }
  if (typeof b.error === 'string' && b.error.length > 0) {
    return { status: 'error', error: b.error };
  }
  return { status: 'success', error: null };
}

// ─────────────────────────────────────────────────────────────────────────────
// WHO INVOKED THIS RUN
//
// The wrapper only logs an auth-rejected run when it can tell that the
// PLATFORM made the call — otherwise a public endpoint could be used to fill
// the table with noise. Until today that test was `x-vercel-cron === '1'`
// alone, and it was never checked against a real scheduled invocation.
//
// It does not hold. /api/detect-events requires an `x-cron-key` header the
// scheduler does not send, so its 07:30 run is rejected every night. On
// 2026-08-22, with logging live and deployed since ~05:00, that 07:30 run
// wrote NO ROW AT ALL — while /api/cron/github-snapshot logged normally at
// 07:15 and four bearer-authenticated routes logged successes between 06:00
// and 08:03. So the scheduler fires, and it sends `Authorization: Bearer
// $CRON_SECRET`, but the rejected-run branch never triggered. The only
// auth_rejected_platform_run row in the table's whole history is a hand
// probe I sent myself at 05:52.
//
// That means the loud-failure design was decorative under the real
// scheduler: any route whose auth does not match what the platform sends
// goes silent in exactly the way this module exists to prevent — the missing
// header quietly becoming "not a platform run", and a failed job becoming no
// job at all.
//
// Two changes, and the second matters more than the first:
//   - Widen the test to any recognised scheduler signal. Vercel identifies
//     its cron requests with a `vercel-cron/…` user-agent as well as the
//     header, so either one now counts.
//   - RECORD WHICH SIGNAL FIRED, in cron_logs.invoked_by. Widening the test
//     on its own would just replace one unverified assumption with another.
//     Tomorrow the question "what does the scheduler actually send?" is a
//     GROUP BY over rows written by runs I did not touch, not a guess.
//
// A request carrying no recognised signal is ordinary internet noise and is
// still not logged when it fails auth.

export type InvokedBy = 'vercel-cron-header' | 'vercel-cron-ua' | 'direct';

export function classifyInvocation(req: NextRequest): InvokedBy {
  if (req.headers.get('x-vercel-cron') === '1') return 'vercel-cron-header';
  if (/vercel-cron/i.test(req.headers.get('user-agent') ?? '')) return 'vercel-cron-ua';
  return 'direct';
}

/** True when some recognised signal says Vercel's scheduler made this call. */
export function isPlatformRun(invokedBy: InvokedBy): boolean {
  return invokedBy !== 'direct';
}

/**
 * Wrap a scheduled route handler so every invocation leaves a real row.
 *
 * `cronPath` MUST be the path exactly as it appears in vercel.json —
 * scripts/test-cron-coverage.ts asserts that, because a drifted path makes
 * a job invisible to every query that looks for it by name, which is the
 * failure this whole module is here to prevent.
 */
export function withCronLog(
  agentId: string,
  cronPath: string,
  auth: CronAuth,
  handler: CronHandler,
): CronHandler {
  return async function wrapped(req: NextRequest): Promise<Response> {
    const invokedBy = classifyInvocation(req);

    if (!auth(req)) {
      if (isPlatformRun(invokedBy)) {
        // The scheduler called and was turned away. That is a failed run and
        // must be as loud as any other failure.
        const log = await startCronLog(agentId, cronPath, invokedBy);
        await finishCronLog(
          log,
          'error',
          { reason: 'auth_rejected_platform_run', cron_path: cronPath, invoked_by: invokedBy },
          'the Vercel scheduler invoked this route and its own auth check rejected the call — the job did not run',
        );
      }
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const log = await startCronLog(agentId, cronPath, invokedBy);
    let res: Response;
    try {
      res = await handler(req);
    } catch (err) {
      await finishCronLog(log, 'error', { threw: true, cron_path: cronPath }, err);
      throw err; // behaviour preserved: Next still renders its 500
    }

    // Read the body from a clone so the response returned to the caller is
    // untouched. A body that is not JSON is recorded as such rather than
    // quietly becoming an empty summary.
    let body: unknown = null;
    let parsed = false;
    try {
      body = await res.clone().json();
      parsed = true;
    } catch {
      parsed = false;
    }

    const { status, error } = parsed
      ? deriveCronStatus(res, body)
      : { status: res.ok ? ('success' as const) : ('error' as const), error: `HTTP ${res.status}` };

    const summary = parsed
      ? boundSummary(body)
      : { non_json_body: true, http_status: res.status };

    await finishCronLog(log, status, summary, error);
    return res;
  };
}
