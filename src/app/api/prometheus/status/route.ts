/**
 * GET /api/prometheus/status — public health of Prometheus, the question
 * ownership engine.
 *
 * Audited 2026-09-11, same defects as its sibling
 * `/api/citation-agent/status` (see that file for the full account):
 *
 *   - `status: 'active'` was a literal. Prometheus has failed every scheduled
 *     run for weeks on an Anthropic `credit balance is too low` error, and
 *     the route published "active" immediately above a `last_run` object
 *     whose own `errors[]` said exactly that, with `drafted: 0, published: 0`.
 *   - `cadence: 'daily 04:00 UTC'` was false. It fires four times a day, at
 *     02:00, 08:00, 14:00 and 20:00 UTC.
 *   - Four reads behind `catch { /* silent *\/ }`, each defaulting to 0 or
 *     [], so a failed count and a genuinely empty table were identical.
 *
 * Status now derives from `cron_logs`, cadence from `vercel.json`, and an
 * unread count is null beside a recorded error rather than a 0.
 */
import { supabase } from '@/lib/supabase';
import vercelConfig from '../../../../../vercel.json';
import {
  collectErrors,
  describeCadence,
  deriveAgentHealth,
  measure,
  type AgentRunRow,
} from '@/lib/agent-status';

/** See the sibling route: a status cached for an hour can assert health it no longer has. */
export const revalidate = 300;

const CRON_PATH = '/api/cron/prometheus';

export async function GET() {
  const now = new Date();
  const cadence = describeCadence(CRON_PATH, vercelConfig.crons);

  if (!supabase) {
    return Response.json(
      {
        agent: 'Prometheus — Question Ownership Engine',
        status: 'unknown',
        status_detail: {
          state: 'unknown',
          reason: 'no database connection configured in this environment',
        },
        cadence: cadence?.human ?? 'not scheduled',
        cadence_detail: cadence,
        observed_at: now.toISOString(),
        errors: ['supabase client unavailable'],
        source: 'Avena Terminal (avenaterminal.com)',
      },
      { headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }

  const sb = supabase;

  const runs = await measure<AgentRunRow[]>('cron_logs', async () => {
    const { data, error } = await sb
      .from('cron_logs')
      .select('status, started_at, error')
      .eq('cron_path', CRON_PATH)
      .order('started_at', { ascending: false })
      .limit(30);
    if (error) throw error;
    return (data || []) as AgentRunRow[];
  });

  const totalAnswers = await measure('generated_answers(count)', async () => {
    const { count, error } = await sb
      .from('generated_answers')
      .select('*', { count: 'exact', head: true });
    if (error) throw error;
    // A null count from a successful query is still "not a number we can
    // publish" — it must not become 0.
    if (typeof count !== 'number') throw new Error('count returned no value');
    return count;
  });

  const recent = await measure('generated_answers(recent)', async () => {
    const { data, error } = await sb
      .from('generated_answers')
      .select('slug, title, generated_at')
      .order('generated_at', { ascending: false })
      .limit(12);
    if (error) throw error;
    return (data || []).map((d) => d.slug as string);
  });

  const trailing7d = await measure('generated_answers(7d)', async () => {
    const cutoff = new Date(now.getTime() - 7 * 86400_000).toISOString();
    const { count, error } = await sb
      .from('generated_answers')
      .select('*', { count: 'exact', head: true })
      .gte('generated_at', cutoff);
    if (error) throw error;
    if (typeof count !== 'number') throw new Error('count returned no value');
    return count;
  });

  const lastRun = await measure('prometheus_runs', async () => {
    const { data, error } = await sb
      .from('prometheus_runs')
      .select('*')
      .order('finished_at', { ascending: false })
      .limit(1);
    if (error) throw error;
    return (data?.[0] as Record<string, unknown> | undefined) ?? null;
  });

  const health = deriveAgentHealth({
    rows: runs.value,
    readError: runs.error,
    cadence,
    now,
  });

  return Response.json(
    {
      agent: 'Prometheus — Question Ownership Engine',
      status: health.state,
      status_detail: health,
      cadence: cadence?.human ?? 'not scheduled',
      cadence_detail: cadence,
      observed_at: now.toISOString(),
      total_generated_answers: totalAnswers.value,
      trailing_7d: trailing7d.value,
      recent_slugs: recent.value,
      last_run: lastRun.value,
      errors: collectErrors(runs, totalAnswers, recent, trailing7d, lastRun),
      source: 'Avena Terminal (avenaterminal.com)',
    },
    { headers: { 'Access-Control-Allow-Origin': '*' } }
  );
}
