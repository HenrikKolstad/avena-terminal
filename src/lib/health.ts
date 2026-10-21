/**
 * Engine health — one honest answer to "is the engine actually running?".
 *
 * WHY (2026-10-21). From 2026-10-14 to 2026-10-21 the nightly feed failed
 * every run (FEED_URL unset) and Supabase was paused, while /engine kept
 * showing a green "Operational" badge, because that badge was a literal. Eight
 * days of unbackfillable history were lost with nothing on the page or in the
 * inbox saying so. This module replaces the literal with measured checks.
 *
 * Shape: the collectors gather raw facts (timestamps, booleans, counts) and
 * NEVER decide anything. `evaluateHealth` is a pure function from those facts
 * to a verdict, so the decision rule is unit-tested in scripts/test-health.ts
 * without a network.
 *
 * Failure direction: a collector that cannot reach its source reports
 * `unknown`, never `ok`. Unknown on a critical check degrades the verdict;
 * it never silently passes.
 */

export type CheckStatus = 'ok' | 'degraded' | 'down' | 'unknown';
export type HealthStatus = 'operational' | 'degraded' | 'down';

export interface HealthCheck {
  name: string;
  status: CheckStatus;
  critical: boolean;
  detail: string;
  observed?: string | number | null;
}

export interface HealthReport {
  status: HealthStatus;
  checked_at: string;
  checks: HealthCheck[];
}

/** Raw facts gathered by the collectors. Every field may be missing. */
export interface HealthFacts {
  /** feed-meta.json generated_at of the deployed book. */
  feedGeneratedAt?: string | null;
  /** Was Supabase reachable at all? null = not configured / not attempted. */
  supabaseReachable?: boolean | null;
  supabaseError?: string | null;
  /** Latest price_snapshots.snapshot_date (YYYY-MM-DD). */
  latestSnapshotDate?: string | null;
  /** Latest commit touching market/ in the public avena-data repo. */
  marketCommittedAt?: string | null;
  /** Latest completed conclusion per watched workflow file. */
  workflows?: Record<string, string | null>;
  /** cron_logs in the last 24h. */
  cronRuns24h?: number | null;
  cronErrors24h?: number | null;
}

const HOUR = 3_600_000;

/** Thresholds, in hours. The nightly lands 01:37–06:45 UTC, so 30h is one missed night. */
export const THRESHOLDS = {
  feedDegradedH: 30,
  feedDownH: 54,
  /** snapshot_date is a calendar date (midnight UTC), so its age runs ~a day ahead of the feed's. */
  snapshotDegradedH: 36,
  snapshotDownH: 60,
  marketDegradedH: 54,
  /** Fraction of cron runs in 24h that errored before the check degrades. */
  cronErrorRatio: 0.25,
  /** Minimum runs before the ratio means anything. */
  cronMinRuns: 4,
};

function ageHours(iso: string | null | undefined, now: Date): number | null {
  if (!iso) return null;
  const t = Date.parse(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  if (!Number.isFinite(t)) return null;
  return (now.getTime() - t) / HOUR;
}

const fmtH = (h: number) => (h < 48 ? `${Math.round(h)}h` : `${Math.round(h / 24)}d`);

function ageCheck(
  name: string,
  iso: string | null | undefined,
  now: Date,
  degradedH: number,
  downH: number | null,
  critical: boolean,
  what: string,
): HealthCheck {
  const h = ageHours(iso, now);
  if (h == null) return { name, status: 'unknown', critical, detail: `${what}: no timestamp available`, observed: null };
  const status: CheckStatus = downH != null && h >= downH ? 'down' : h >= degradedH ? 'degraded' : 'ok';
  return { name, status, critical, detail: `${what} is ${fmtH(Math.max(0, h))} old`, observed: iso ?? null };
}

export function evaluateHealth(f: HealthFacts, now: Date = new Date()): HealthReport {
  const checks: HealthCheck[] = [];

  checks.push(ageCheck('feed', f.feedGeneratedAt, now, THRESHOLDS.feedDegradedH, THRESHOLDS.feedDownH, true, 'Deployed feed (data.json)'));

  if (f.supabaseReachable === false) {
    checks.push({ name: 'supabase', status: 'down', critical: true, detail: `Database unreachable${f.supabaseError ? `: ${f.supabaseError.slice(0, 120)}` : ''}` });
  } else if (f.supabaseReachable == null) {
    checks.push({ name: 'supabase', status: 'unknown', critical: true, detail: 'Database not configured in this environment' });
  } else {
    checks.push({ name: 'supabase', status: 'ok', critical: true, detail: 'Database reachable' });
  }

  if (f.supabaseReachable) {
    checks.push(ageCheck('price_snapshots', f.latestSnapshotDate, now, THRESHOLDS.snapshotDegradedH, THRESHOLDS.snapshotDownH, true, 'Latest price snapshot'));
  }

  checks.push(ageCheck('avena_data_market', f.marketCommittedAt, now, THRESHOLDS.marketDegradedH, null, false, 'Open dataset market/ commit'));

  for (const [wf, conclusion] of Object.entries(f.workflows ?? {})) {
    const status: CheckStatus =
      conclusion == null ? 'unknown' : conclusion === 'success' || conclusion === 'skipped' ? 'ok' : 'degraded';
    checks.push({ name: `workflow:${wf}`, status, critical: false, detail: `Latest completed run: ${conclusion ?? 'unknown'}`, observed: conclusion ?? null });
  }

  if (f.cronRuns24h == null || f.cronErrors24h == null) {
    if (f.supabaseReachable) checks.push({ name: 'vercel_crons', status: 'unknown', critical: false, detail: 'cron_logs not readable' });
  } else if (f.cronRuns24h < THRESHOLDS.cronMinRuns) {
    checks.push({ name: 'vercel_crons', status: 'degraded', critical: false, detail: `Only ${f.cronRuns24h} cron run(s) logged in 24h`, observed: f.cronRuns24h });
  } else {
    const ratio = f.cronErrors24h / f.cronRuns24h;
    checks.push({
      name: 'vercel_crons',
      status: ratio > THRESHOLDS.cronErrorRatio ? 'degraded' : 'ok',
      critical: false,
      detail: `${f.cronErrors24h}/${f.cronRuns24h} cron runs errored in 24h`,
      observed: Math.round(ratio * 1000) / 1000,
    });
  }

  return { status: verdict(checks), checked_at: now.toISOString(), checks };
}

/**
 * Down: any CRITICAL check is down. Degraded: anything else not ok (including
 * unknown — an unmeasured engine is not an operational one). Operational only
 * when every check is ok.
 */
export function verdict(checks: HealthCheck[]): HealthStatus {
  if (checks.some((c) => c.critical && c.status === 'down')) return 'down';
  if (checks.some((c) => c.status !== 'ok')) return 'degraded';
  return 'operational';
}

export const HEALTH_LABEL: Record<HealthStatus, string> = {
  operational: 'Operational',
  degraded: 'Degraded',
  down: 'Down',
};
