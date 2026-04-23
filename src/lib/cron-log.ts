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

import { supabase } from '@/lib/supabase';

export interface CronLogHandle {
  id: number | null;
  startedAt: number;
  agentId: string;
}

export async function startCronLog(
  agentId: string,
  cronPath?: string
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
      })
      .select('id')
      .single();
    return { id: data?.id ?? null, startedAt, agentId };
  } catch {
    return { id: null, startedAt, agentId };
  }
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
        error: error
          ? error instanceof Error
            ? error.message.slice(0, 1000)
            : String(error).slice(0, 1000)
          : null,
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
