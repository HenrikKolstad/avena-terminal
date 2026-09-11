/**
 * Honest public status for scheduled agents.
 *
 * WHY THIS FILE EXISTS — read before "simplifying" any of it.
 *
 * `/api/citation-agent/status` and `/api/prometheus/status` are public,
 * advertised in `/api/index` for AI agents to read. Audited 2026-09-11, both
 * published this shape:
 *
 *     status:  'active'            // a string literal, always
 *     cadence: 'daily 03:00 UTC'   // a string literal, and false
 *     ...four reads, each wrapped in `catch { /* ignore *\/ }`
 *
 * Every part of that was wrong at once:
 *
 *   - `status: 'active'` was a constant. Atlas had failed every run for 12
 *     days on a Perplexity 401 and had not produced a measurement since
 *     2026-08-28; Prometheus had failed every run for weeks on an Anthropic
 *     credit error. Both endpoints said "active" throughout. The citation
 *     endpoint served `status: active` directly above `last_run: 2026-08-28`
 *     — it held the refuting evidence in the same payload.
 *   - `cadence` was false on both. Atlas is `0,10,20 3 * * 1,3,5` (Mon/Wed/Fri,
 *     three attempts) and claimed "daily 03:00 UTC". Prometheus fires four
 *     times a day (02/08/14/20 UTC) and claimed "daily 04:00 UTC".
 *   - The silent catches turned a failed read into `0`, so a broken query and
 *     a genuinely quiet day were byte-identical — and `delta_vs_yesterday`
 *     subtracted one from the other, so a single failed read could publish a
 *     fabricated non-zero delta.
 *
 * THE RULES THIS FILE ENFORCES:
 *
 *   1. A value that could not be read is `null` with a recorded error. It is
 *      never a 0, and a `null` never enters arithmetic — see `difference()`.
 *   2. `status` is DERIVED from `cron_logs`, the same table the runs actually
 *      write. A read that fails yields 'unknown', never 'active'.
 *   3. `cadence` is DERIVED from `vercel.json`, the file the platform actually
 *      schedules from, so it cannot drift from the deployment.
 *   4. A cron expression this parser does not fully understand THROWS rather
 *      than being described approximately. An upstream that is misdescribed
 *      confidently is worse than one that is refused (the CBS lesson,
 *      2026-09-10: a silently-ignored `$orderby` produced healthy-looking
 *      rows from the wrong end of the series).
 */

/** One `crons` entry from vercel.json. */
export interface CronEntry {
  path: string;
  schedule: string;
}

export interface ParsedCron {
  /** Minutes past the hour this entry fires. */
  minutes: number[];
  /** Hour (UTC) this entry fires. */
  hour: number;
  /** Days of week (0 = Sunday) or null for every day. */
  daysOfWeek: number[] | null;
}

export interface Cadence {
  /** The raw expressions, exactly as deployed. Quote these, not the prose. */
  schedules: string[];
  /** Human sentence derived from those expressions. */
  human: string;
  /** Longest gap, in ms, between two consecutive expected fires over a week. */
  maxExpectedGapMs: number;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MINUTE_MS = 60_000;
const WEEK_MS = 7 * 24 * 60 * MINUTE_MS;

/**
 * Parse the cron shapes Vercel actually schedules here: a comma list of
 * minutes, a single hour, `*` for day-of-month and month, and `*` or a comma
 * list for day-of-week. Anything else throws — see rule 4 above.
 */
export function parseCronExpression(expr: string): ParsedCron {
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) {
    throw new Error(`unsupported cron "${expr}": expected 5 fields, got ${fields.length}`);
  }
  const [min, hour, dom, month, dow] = fields;

  if (dom !== '*' || month !== '*') {
    throw new Error(`unsupported cron "${expr}": day-of-month/month must be "*"`);
  }

  const minutes = parseIntList(min, 0, 59, expr, 'minute');
  const hours = parseIntList(hour, 0, 23, expr, 'hour');
  if (hours.length !== 1) {
    throw new Error(`unsupported cron "${expr}": expected a single hour, got ${hours.length}`);
  }
  const daysOfWeek = dow === '*' ? null : parseIntList(dow, 0, 6, expr, 'day-of-week');

  return { minutes, hour: hours[0], daysOfWeek };
}

function parseIntList(field: string, lo: number, hi: number, expr: string, label: string): number[] {
  if (!/^\d+(,\d+)*$/.test(field)) {
    throw new Error(`unsupported cron "${expr}": ${label} field "${field}" is not a comma list of integers`);
  }
  const out = field.split(',').map((s) => Number(s));
  for (const n of out) {
    if (n < lo || n > hi) {
      throw new Error(`unsupported cron "${expr}": ${label} ${n} out of range ${lo}-${hi}`);
    }
  }
  return Array.from(new Set(out)).sort((a, b) => a - b);
}

/**
 * Describe every schedule vercel.json holds for `path`.
 *
 * Returns null when the path is not scheduled at all — the caller must then
 * say so rather than inventing a cadence.
 */
export function describeCadence(path: string, crons: CronEntry[]): Cadence | null {
  const schedules = crons.filter((c) => c.path === path).map((c) => c.schedule);
  if (schedules.length === 0) return null;

  const parsed = schedules.map(parseCronExpression);

  // Every fire time in a week, as ms offsets from Sunday 00:00 UTC.
  const fires: number[] = [];
  for (const p of parsed) {
    const days = p.daysOfWeek ?? [0, 1, 2, 3, 4, 5, 6];
    for (const d of days) {
      for (const m of p.minutes) {
        fires.push(((d * 24 + p.hour) * 60 + m) * MINUTE_MS);
      }
    }
  }
  const sorted = Array.from(new Set(fires)).sort((a, b) => a - b);

  let maxExpectedGapMs = 0;
  for (let i = 0; i < sorted.length; i++) {
    const next = i + 1 < sorted.length ? sorted[i + 1] : sorted[0] + WEEK_MS;
    maxExpectedGapMs = Math.max(maxExpectedGapMs, next - sorted[i]);
  }

  return { schedules, human: humanise(parsed), maxExpectedGapMs };
}

function humanise(parsed: ParsedCron[]): string {
  const parts = parsed.map((p) => {
    const times = p.minutes.map((m) => `${pad(p.hour)}:${pad(m)}`).join(', ');
    const when = p.daysOfWeek === null
      ? 'daily'
      : p.daysOfWeek.map((d) => DAY_NAMES[d]).join('/');
    const attempts = p.minutes.length > 1 ? ` (${p.minutes.length} attempts)` : '';
    return `${when} ${times} UTC${attempts}`;
  });
  return Array.from(new Set(parts)).join('; ');
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/* ------------------------------------------------------------------ */
/* Health                                                              */
/* ------------------------------------------------------------------ */

export type AgentState = 'active' | 'failing' | 'stale' | 'never_run' | 'unknown';

/** One `cron_logs` row, narrowed to the fields the verdict depends on. */
export interface AgentRunRow {
  status: string | null;
  started_at: string | null;
  error: string | null;
}

export interface AgentHealth {
  state: AgentState;
  reason: string;
  last_run_at: string | null;
  last_success_at: string | null;
  /** Runs that errored since the last success. null when unknown. */
  consecutive_failures: number | null;
  last_error: string | null;
}

/**
 * Derive an agent's health from its own run log.
 *
 * `rows` MUST be null when the read failed — that is the whole point. An
 * empty array means "read fine, no runs"; null means "we do not know", and
 * the two produce different verdicts. Rows are newest-first.
 */
export function deriveAgentHealth(opts: {
  rows: AgentRunRow[] | null;
  readError?: string | null;
  cadence: Cadence | null;
  now: Date;
}): AgentHealth {
  const { rows, readError, cadence, now } = opts;

  const unknown = (reason: string): AgentHealth => ({
    state: 'unknown',
    reason,
    last_run_at: null,
    last_success_at: null,
    consecutive_failures: null,
    last_error: null,
  });

  if (rows === null) {
    return unknown(`could not read cron_logs: ${readError || 'no reason recorded'}`);
  }
  if (rows.length === 0) {
    return {
      state: 'never_run',
      reason: 'cron_logs holds no runs for this agent',
      last_run_at: null,
      last_success_at: null,
      consecutive_failures: 0,
      last_error: null,
    };
  }

  const latest = rows[0];
  const lastRunAt = latest.started_at;
  const succeeded = (r: AgentRunRow) => r.status === 'success' || r.status === 'skipped';
  const lastSuccess = rows.find(succeeded) ?? null;

  let consecutiveFailures = 0;
  for (const r of rows) {
    if (succeeded(r)) break;
    if (r.status === 'error') consecutiveFailures++;
    else break; // 'started' / unknown status: stop counting rather than guess
  }

  if (latest.status === 'error') {
    return {
      state: 'failing',
      reason: `the last run errored${consecutiveFailures > 1 ? ` (${consecutiveFailures} consecutive failures)` : ''}`,
      last_run_at: lastRunAt,
      last_success_at: lastSuccess?.started_at ?? null,
      consecutive_failures: consecutiveFailures,
      last_error: latest.error,
    };
  }

  // Not failing. Is it running on time?
  if (lastRunAt && cadence) {
    const age = now.getTime() - new Date(lastRunAt).getTime();
    // One missed fire is a blip; two consecutive missed fires is a stall.
    const tolerance = cadence.maxExpectedGapMs * 2;
    if (age > tolerance) {
      return {
        state: 'stale',
        reason: `no run in ${Math.floor(age / 3_600_000)}h; the schedule expects one at least every ${Math.floor(cadence.maxExpectedGapMs / 3_600_000)}h`,
        last_run_at: lastRunAt,
        last_success_at: lastSuccess?.started_at ?? null,
        consecutive_failures: consecutiveFailures,
        last_error: latest.error,
      };
    }
  }

  if (!cadence) {
    return {
      state: 'unknown',
      reason: 'no schedule found in vercel.json for this path, so "on time" is undefined',
      last_run_at: lastRunAt,
      last_success_at: lastSuccess?.started_at ?? null,
      consecutive_failures: consecutiveFailures,
      last_error: latest.error,
    };
  }

  return {
    state: 'active',
    reason: 'the last run completed without error and arrived on schedule',
    last_run_at: lastRunAt,
    last_success_at: lastSuccess?.started_at ?? null,
    consecutive_failures: 0,
    last_error: null,
  };
}

/* ------------------------------------------------------------------ */
/* Measured reads                                                      */
/* ------------------------------------------------------------------ */

/**
 * A value that was read, or an explanation of why it was not. There is no
 * third state, and in particular there is no "0 because the read threw".
 */
export interface Measured<T> {
  value: T | null;
  error: string | null;
}

/**
 * Run a read and capture its failure instead of swallowing it.
 *
 * The `label` is prefixed onto the error so a caller collecting several of
 * these can tell which read failed — the 08-27 dvf-ingest lesson, where a
 * shared error sample made two different losses indistinguishable.
 */
export async function measure<T>(label: string, fn: () => Promise<T>): Promise<Measured<T>> {
  try {
    return { value: await fn(), error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { value: null, error: `${label}: ${msg}`.slice(0, 500) };
  }
}

/** Collect the non-null errors from a set of measured reads. */
export function collectErrors(...measured: Measured<unknown>[]): string[] {
  return measured.map((m) => m.error).filter((e): e is string => e !== null);
}

/**
 * Subtract two measured numbers. If either side is unknown the difference is
 * unknown — it is NOT the other side, and it is NOT zero.
 *
 * This is the function whose absence let `delta_vs_yesterday` publish a
 * fabricated figure whenever exactly one of its two reads failed.
 */
export function difference(a: Measured<number>, b: Measured<number>): number | null {
  if (a.value === null || b.value === null) return null;
  return a.value - b.value;
}

/** Whole days between two ISO dates, or null if either is missing. */
export function ageInDays(from: string | null, now: Date): number | null {
  if (!from) return null;
  const t = new Date(from).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.floor((now.getTime() - t) / 86_400_000);
}
