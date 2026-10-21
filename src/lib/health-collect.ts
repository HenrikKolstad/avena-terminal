import { readFileSync } from 'fs';
import path from 'path';
import { supabaseAdmin } from './supabase-admin';
import { evaluateHealth, type HealthFacts, type HealthReport } from './health';

/**
 * Server-only collectors for src/lib/health.ts. Each one swallows its own
 * failure into a missing fact (→ `unknown`), so one dead source can never
 * take the health endpoint itself down.
 */

const REPO = 'HenrikKolstad/avena-terminal';
const DATA_REPO = 'HenrikKolstad/avena-data';
export const WATCHED_WORKFLOWS = ['feed-refresh.yml', 'capture-backstop.yml'];
const TIMEOUT_MS = 6000;

function ghHeaders(): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/vnd.github+json', 'User-Agent': 'avena-health' };
  const token = process.env.GITHUB_HEALTH_TOKEN || process.env.GITHUB_TOKEN;
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function gh<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { headers: ghHeaders(), signal: AbortSignal.timeout(TIMEOUT_MS), next: { revalidate: 900 } });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

function readFeedGeneratedAt(): string | null {
  try {
    const raw = readFileSync(path.join(process.cwd(), 'public', 'feed-meta.json'), 'utf8');
    const t = (JSON.parse(raw) as { generated_at?: unknown }).generated_at;
    return typeof t === 'string' ? t : null;
  } catch {
    return null;
  }
}

async function collectSupabase(f: HealthFacts) {
  if (!supabaseAdmin) { f.supabaseReachable = null; return; }
  try {
    const { data, error } = await supabaseAdmin
      .from('price_snapshots')
      .select('snapshot_date')
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .abortSignal(AbortSignal.timeout(TIMEOUT_MS));
    if (error) { f.supabaseReachable = false; f.supabaseError = error.message; return; }
    f.supabaseReachable = true;
    f.latestSnapshotDate = (data?.[0] as { snapshot_date?: string } | undefined)?.snapshot_date ?? null;
  } catch (e) {
    f.supabaseReachable = false;
    f.supabaseError = e instanceof Error ? e.message : String(e);
    return;
  }
  try {
    const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
    const [all, errs] = await Promise.all([
      supabaseAdmin.from('cron_logs').select('id', { count: 'exact', head: true }).gte('started_at', since).in('status', ['success', 'error']),
      supabaseAdmin.from('cron_logs').select('id', { count: 'exact', head: true }).gte('started_at', since).eq('status', 'error'),
    ]);
    if (!all.error && !errs.error) { f.cronRuns24h = all.count ?? 0; f.cronErrors24h = errs.count ?? 0; }
  } catch { /* stays unknown */ }
}

async function collectWorkflows(f: HealthFacts) {
  const out: Record<string, string | null> = {};
  await Promise.all(WATCHED_WORKFLOWS.map(async (wf) => {
    const j = await gh<{ workflow_runs?: Array<{ conclusion: string | null }> }>(
      `https://api.github.com/repos/${REPO}/actions/workflows/${wf}/runs?branch=main&status=completed&per_page=1`,
    );
    out[wf] = j?.workflow_runs?.[0]?.conclusion ?? null;
  }));
  f.workflows = out;
}

async function collectMarket(f: HealthFacts) {
  const j = await gh<Array<{ commit?: { committer?: { date?: string } } }>>(
    `https://api.github.com/repos/${DATA_REPO}/commits?path=market&per_page=1`,
  );
  f.marketCommittedAt = j?.[0]?.commit?.committer?.date ?? null;
}

export async function getHealth(now: Date = new Date()): Promise<HealthReport> {
  const f: HealthFacts = { feedGeneratedAt: readFeedGeneratedAt() };
  await Promise.all([collectSupabase(f), collectWorkflows(f), collectMarket(f)]);
  return evaluateHealth(f, now);
}
