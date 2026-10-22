/**
 * Engine health — one honest answer to "is Avena working right now?".
 *
 * WHY THIS EXISTS (2026-10-21)
 * From 2026-10-14 to 2026-10-21 the nightly feed failed every run (the
 * FEED_URL secret was never set), the open dataset froze at v2026-10-13, and
 * on 10-19 the Supabase project was paused over billing. Eight days of
 * listing history were lost. Through all of it /engine said "Operational" in
 * green, because the badge was a string literal. Nothing failed loudly; the
 * page simply kept claiming health it did not have.
 *
 * This module grades a handful of independent signals and the badge, the
 * public /api/health endpoint and the 6-6-hourly /api/cron/health job all read
 * the same answer.
 *
 * THE RULES
 *  - Every check is pure-graded by `gradeHealth` from plain inputs, so the
 *    thresholds are unit-tested (scripts/test-health.ts) without credentials.
 *  - A read that could not be made is `unknown`, never `ok`. On a CRITICAL
 *    check (feed, capture, database) unknown degrades the overall status;
 *    on an advisory check (dataset, workflows) it is reported but does not.
 *  - `down` means the moat is not being written: the database is unreachable
 *    or no capture for two or more days. Everything short of that is
 *    `degraded`.
 */

import { readFileSync } from 'fs';
import path from 'path';

export type CheckStatus = 'ok' | 'degraded' | 'down' | 'unknown';
export type OverallStatus = 'operational' | 'degraded' | 'down';

export interface HealthCheck {
  id: 'feed' | 'capture' | 'database' | 'dataset' | 'workflows';
  label: string;
  status: CheckStatus;
  critical: boolean;
  detail: string;
  observed?: string | null;
}

export interface HealthReport {
  status: OverallStatus;
  label: 'Operational' | 'Degraded' | 'Down';
  checked_at: string;
  checks: HealthCheck[];
}

/** Raw inputs. Every field may be null = "could not be read". */
export interface HealthInputs {
  now: Date;
  /** feed-meta.json generated_at of the DEPLOYED build. */
  feedGeneratedAt: string | null;
  /** Did a trivial database read succeed? null = not attempted / no client. */
  dbReachable: boolean | null;
  dbError?: string | null;
  /** Latest price_snapshots.snapshot_date (YYYY-MM-DD). */
  latestSnapshotDate: string | null;
  /** Open dataset latest observation date: deployed and avena-data mirror. */
  datasetLatestDate: string | null;
  mirrorLatestDate: string | null;
  /** Latest completed run conclusion per workflow file, null = unreadable. */
  workflows: Record<string, string | null> | null;
}

// Thresholds. The nightly is scheduled 05:10 UTC and has landed as late as
// ~10:35 UTC via the capture backstop, so a 30h-old feed is a normal morning
// and anything past 54h means at least one full night was missed.
export const FEED_DEGRADED_HOURS = 30;
export const FEED_DOWN_HOURS = 54;
/** UTC hour by which today's capture is expected (backstop's second check + slack). */
export const CAPTURE_DUE_UTC_HOUR = 12;
export const DATASET_DEGRADED_DAYS = 2;

/** Workflows whose latest completed run is surfaced. */
export const WATCHED_WORKFLOWS = ['feed-refresh.yml', 'capture-backstop.yml', 'tests.yml'] as const;

const DAY = 86_400_000;

function utcDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysBetween(fromYmd: string, toYmd: string): number {
  return Math.round((Date.parse(`${toYmd}T00:00:00Z`) - Date.parse(`${fromYmd}T00:00:00Z`)) / DAY);
}

const isYmd = (s: string | null | undefined): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

export function gradeFeed(now: Date, generatedAt: string | null): HealthCheck {
  const base = { id: 'feed' as const, label: 'Listing feed', critical: true, observed: generatedAt };
  const t = generatedAt ? Date.parse(generatedAt) : NaN;
  if (!Number.isFinite(t)) return { ...base, status: 'unknown', detail: 'feed-meta.json missing or unreadable' };
  const hours = (now.getTime() - t) / 3_600_000;
  const age = `${Math.round(hours)}h old`;
  if (hours > FEED_DOWN_HOURS) return { ...base, status: 'down', detail: `deployed feed is ${age} — at least two nightly runs missed` };
  if (hours > FEED_DEGRADED_HOURS) return { ...base, status: 'degraded', detail: `deployed feed is ${age} — last night's run is missing` };
  return { ...base, status: 'ok', detail: `deployed feed is ${age}` };
}

export function gradeDatabase(reachable: boolean | null, error?: string | null): HealthCheck {
  const base = { id: 'database' as const, label: 'Database', critical: true, observed: null };
  if (reachable === null) return { ...base, status: 'unknown', detail: 'database client not configured' };
  if (!reachable) return { ...base, status: 'down', detail: `database unreachable${error ? `: ${error.slice(0, 160)}` : ''}` };
  return { ...base, status: 'ok', detail: 'database reachable' };
}

export function gradeCapture(now: Date, latest: string | null, dbReachable: boolean | null): HealthCheck {
  const base = { id: 'capture' as const, label: 'Daily price capture', critical: true, observed: latest };
  if (!isYmd(latest)) {
    return { ...base, status: dbReachable ? 'down' : 'unknown', detail: dbReachable ? 'no price snapshots found' : 'capture could not be read' };
  }
  const behind = daysBetween(latest, utcDay(now));
  if (behind <= 0) return { ...base, status: 'ok', detail: `today's capture (${latest}) is in` };
  if (behind === 1 && now.getUTCHours() < CAPTURE_DUE_UTC_HOUR) {
    return { ...base, status: 'ok', detail: `latest capture ${latest}; today's is due by ${CAPTURE_DUE_UTC_HOUR}:00 UTC` };
  }
  if (behind === 1) return { ...base, status: 'degraded', detail: `today's capture is missing (latest ${latest})` };
  return { ...base, status: 'down', detail: `no capture for ${behind} days (latest ${latest}) — history is being lost` };
}

export function gradeDataset(now: Date, deployed: string | null, mirror: string | null): HealthCheck {
  const base = { id: 'dataset' as const, label: 'Open dataset', critical: false };
  const dates = [deployed, mirror].filter(isYmd);
  if (dates.length === 0) return { ...base, status: 'unknown', observed: null, detail: 'dataset version could not be read' };
  // Grade on the OLDER of the two surfaces: a fresh site with a stale mirror
  // still means the public corpus is stale.
  const oldest = dates.sort()[0];
  const behind = daysBetween(oldest, utcDay(now));
  const detail = `site ${deployed ?? 'unknown'} · avena-data ${mirror ?? 'unknown'}`;
  if (behind > DATASET_DEGRADED_DAYS) return { ...base, status: 'degraded', observed: oldest, detail: `open dataset is ${behind} days behind (${detail})` };
  return { ...base, status: 'ok', observed: oldest, detail };
}

export function gradeWorkflows(workflows: Record<string, string | null> | null): HealthCheck {
  const base = { id: 'workflows' as const, label: 'Pipelines (GitHub Actions)', critical: false, observed: null };
  if (!workflows) return { ...base, status: 'unknown', detail: 'GitHub Actions status could not be read' };
  const entries = Object.entries(workflows);
  const failing = entries.filter(([, c]) => c != null && c !== 'success' && c !== 'skipped' && c !== 'neutral');
  const unread = entries.filter(([, c]) => c == null);
  const summary = entries.map(([w, c]) => `${w.replace(/\.ya?ml$/, '')}: ${c ?? 'unknown'}`).join(', ');
  if (failing.length) return { ...base, status: 'degraded', detail: summary };
  if (unread.length === entries.length) return { ...base, status: 'unknown', detail: summary };
  return { ...base, status: 'ok', detail: summary };
}

export function gradeHealth(inputs: HealthInputs): HealthReport {
  const checks: HealthCheck[] = [
    gradeFeed(inputs.now, inputs.feedGeneratedAt),
    gradeCapture(inputs.now, inputs.latestSnapshotDate, inputs.dbReachable),
    gradeDatabase(inputs.dbReachable, inputs.dbError),
    gradeDataset(inputs.now, inputs.datasetLatestDate, inputs.mirrorLatestDate),
    gradeWorkflows(inputs.workflows),
  ];
  let status: OverallStatus = 'operational';
  for (const c of checks) {
    if (c.status === 'down' && c.critical) { status = 'down'; break; }
    if (c.status === 'down' || c.status === 'degraded' || (c.status === 'unknown' && c.critical)) status = 'degraded';
  }
  const label = status === 'operational' ? 'Operational' : status === 'degraded' ? 'Degraded' : 'Down';
  return { status, label, checked_at: inputs.now.toISOString(), checks };
}

// ── I/O ──────────────────────────────────────────────────────────────────────

const REPO = 'HenrikKolstad/avena-terminal';
const MIRROR_DATASET_URL = 'https://raw.githubusercontent.com/HenrikKolstad/avena-data/main/market/dataset.json';
const TIMEOUT_MS = 4000;

function readPublicJson(rel: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(readFileSync(path.join(process.cwd(), 'public', rel), 'utf8'));
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function ledgerLatest(ds: Record<string, unknown> | null): string | null {
  const ledger = ds?.observation_ledger as { latest_date?: unknown } | undefined;
  const d = ledger?.latest_date;
  return typeof d === 'string' && isYmd(d) ? d : null;
}

async function fetchJson(url: string, headers: Record<string, string> = {}): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // Shared across /engine, /api/health and the cron: GitHub's
      // unauthenticated API allows 60 requests/hour per IP.
      next: { revalidate: 600 },
    } as RequestInit);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function readWorkflows(): Promise<Record<string, string | null> | null> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
  const token = process.env.GITHUB_STATUS_TOKEN || process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  const out: Record<string, string | null> = {};
  let any = false;
  await Promise.all(WATCHED_WORKFLOWS.map(async (wf) => {
    const body = await fetchJson(
      `https://api.github.com/repos/${REPO}/actions/workflows/${wf}/runs?branch=main&status=completed&per_page=1`,
      headers,
    ) as { workflow_runs?: Array<{ conclusion?: string | null }> } | null;
    const c = body?.workflow_runs?.[0]?.conclusion ?? null;
    if (body) any = true;
    out[wf] = c;
  }));
  return any ? out : null;
}

async function readDatabase(): Promise<{ reachable: boolean | null; error: string | null; latest: string | null }> {
  // Imported lazily so the pure graders above stay importable by the
  // credential-free test suite without constructing a client.
  const { supabaseAdmin } = await import('./supabase-admin');
  const { supabase } = await import('./supabase');
  const client = supabaseAdmin ?? supabase;
  if (!client) return { reachable: null, error: null, latest: null };
  try {
    const { data, error } = await client
      .from('price_snapshots')
      .select('snapshot_date')
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .abortSignal(AbortSignal.timeout(TIMEOUT_MS));
    if (error) return { reachable: false, error: error.message, latest: null };
    const d = data?.[0]?.snapshot_date;
    return { reachable: true, error: null, latest: d ? String(d) : null };
  } catch (e) {
    return { reachable: false, error: e instanceof Error ? e.message : String(e), latest: null };
  }
}

export async function collectHealth(now = new Date()): Promise<HealthReport> {
  const feedMeta = readPublicJson('feed-meta.json');
  const feedGeneratedAt = typeof feedMeta?.generated_at === 'string' ? feedMeta.generated_at : null;
  const datasetLatestDate = ledgerLatest(readPublicJson('open-data/dataset.json'));

  const [db, mirror, workflows] = await Promise.all([
    readDatabase(),
    fetchJson(MIRROR_DATASET_URL) as Promise<Record<string, unknown> | null>,
    readWorkflows(),
  ]);

  return gradeHealth({
    now,
    feedGeneratedAt,
    dbReachable: db.reachable,
    dbError: db.error,
    latestSnapshotDate: db.latest,
    datasetLatestDate,
    mirrorLatestDate: ledgerLatest(mirror),
    workflows,
  });
}
