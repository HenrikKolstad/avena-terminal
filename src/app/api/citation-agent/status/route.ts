/**
 * GET /api/citation-agent/status — public health of Atlas, the citation agent.
 *
 * Audited 2026-09-11. This route published `status: "active"` and
 * `cadence: "daily 03:00 UTC"` as string literals, directly above a
 * `last_run: "2026-08-28"` it had read from the database — while Atlas had in
 * fact failed every scheduled run for twelve days on a Perplexity 401. The
 * payload carried its own refutation and asserted health anyway. The real
 * schedule is Mon/Wed/Fri, three attempts, not daily.
 *
 * Four reads were each wrapped in `catch { /* ignore *\/ }` and defaulted to
 * 0, so a broken query looked exactly like a quiet day — and because
 * `delta_vs_yesterday` subtracted one from the other, one failed read alone
 * could publish a fabricated non-zero delta.
 *
 * Now: status derives from `cron_logs`, cadence derives from `vercel.json`,
 * every unread value is null beside a recorded error, and the render is
 * DATED because a derived value in a cached document is a snapshot written
 * in the present tense (the /api/openapi.json lesson, 2026-09-10).
 *
 * Note that "last run" and "last measurement" are two different facts and
 * the old field conflated them: Atlas ran three times this morning and
 * measured nothing. Both are published separately now.
 */
import { supabase } from '@/lib/supabase';
import vercelConfig from '../../../../../vercel.json';
import {
  ageInDays,
  collectErrors,
  describeCadence,
  deriveAgentHealth,
  difference,
  measure,
  type AgentRunRow,
  type Measured,
} from '@/lib/agent-status';

/**
 * Five minutes, not an hour. This endpoint reports whether a thing is broken
 * right now; an hour-old "active" is the failure mode this file exists to
 * stop. `observed_at` states when the served reading was actually taken.
 */
export const revalidate = 300;

const CRON_PATH = '/api/cron/citation-agent';

export async function GET() {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 86400_000).toISOString().slice(0, 10);

  const cadence = describeCadence(CRON_PATH, vercelConfig.crons);

  if (!supabase) {
    return Response.json(
      {
        agent: 'Atlas — Citation Intelligence Agent',
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

  /** Throw on a Supabase error so `measure` records it. The old code let it pass as 0. */
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

  const todayRows = await measure('citation_monitoring(today)', async () => {
    const { data, error } = await sb
      .from('citation_monitoring')
      .select('avena_cited')
      .eq('date', today);
    if (error) throw error;
    return (data || []) as { avena_cited: boolean }[];
  });

  const yesterdayRows = await measure('citation_monitoring(yesterday)', async () => {
    const { data, error } = await sb
      .from('citation_monitoring')
      .select('avena_cited')
      .eq('date', yesterday);
    if (error) throw error;
    return (data || []) as { avena_cited: boolean }[];
  });

  const lastMeasurement = await measure('citation_monitoring(latest)', async () => {
    const { data, error } = await sb
      .from('citation_monitoring')
      .select('date')
      .order('date', { ascending: false })
      .limit(1);
    if (error) throw error;
    return (data?.[0]?.date as string | undefined) ?? null;
  });

  const gaps = await measure('citation_gaps', async () => {
    const { data, error } = await sb
      .from('citation_gaps')
      .select('*')
      .eq('date', today)
      .order('priority', { ascending: false })
      .limit(20);
    if (error) throw error;
    return (data || []) as unknown[];
  });

  const health = deriveAgentHealth({
    rows: runs.value,
    readError: runs.error,
    cadence,
    now,
  });

  const monitored: Measured<number> = {
    value: todayRows.value === null ? null : todayRows.value.length,
    error: todayRows.error,
  };
  const citedToday: Measured<number> = {
    value: todayRows.value === null ? null : todayRows.value.filter((m) => m.avena_cited).length,
    error: todayRows.error,
  };
  const citedYesterday: Measured<number> = {
    value: yesterdayRows.value === null ? null : yesterdayRows.value.filter((m) => m.avena_cited).length,
    error: yesterdayRows.error,
  };

  // A rate over zero questions is not 0% — it is undefined, and publishing a
  // measured-looking 0.00% on a day the engine never ran is precisely the
  // fabrication this project has already had to correct once (2026-08-09).
  const rate =
    monitored.value === null || citedToday.value === null
      ? null
      : monitored.value > 0
        ? Math.round((citedToday.value / monitored.value) * 100) + '%'
        : null;

  const measurementAge = ageInDays(lastMeasurement.value, now);

  return Response.json(
    {
      agent: 'Atlas — Citation Intelligence Agent',
      status: health.state,
      status_detail: health,
      cadence: cadence?.human ?? 'not scheduled',
      cadence_detail: cadence,
      observed_at: now.toISOString(),
      today: {
        date: today,
        questions_monitored: monitored.value,
        avena_cited: citedToday.value,
        citation_rate: rate,
        rate_basis:
          rate === null
            ? 'no measurement on this date — not a zero rate'
            : `${citedToday.value}/${monitored.value} questions`,
      },
      delta_vs_yesterday: difference(citedToday, citedYesterday),
      last_measurement_date: lastMeasurement.value,
      measurement_age_days: measurementAge,
      top_gaps_today: gaps.value,
      errors: collectErrors(runs, todayRows, yesterdayRows, lastMeasurement, gaps),
      source: 'Avena Terminal (avenaterminal.com)',
    },
    { headers: { 'Access-Control-Allow-Origin': '*' } }
  );
}
