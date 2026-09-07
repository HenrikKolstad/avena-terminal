/**
 * EU Official Stats Ingest — daily cron.
 *
 * Pulls fresh observations from Eurostat, ECB SDW, and INE Spain into
 * `eu_official_stats`. Idempotent via the (source, indicator_code,
 * country_code, period) unique constraint — running twice in the same
 * day just refreshes the values.
 *
 * Schedule: daily 04:15 UTC via vercel.json
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { startCronLog, finishCronLog } from '@/lib/cron-log';
import { ingestEurostat, ingestECB, ingestINESpain, ingestISTAT, ingestCBS, ingestBIS, type IngestResult } from '@/lib/eu-stats-feeds';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

async function logRun(source: string): Promise<number | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase
      .from('eu_stats_ingest_runs')
      .insert({ source, status: 'running' })
      .select('id')
      .single();
    return (data as { id: number } | null)?.id ?? null;
  } catch {
    return null;
  }
}

async function finishRun(id: number | null, result: IngestResult, status: 'success' | 'partial' | 'error', errOverride?: string) {
  if (!supabase || id == null) return;
  try {
    await supabase
      .from('eu_stats_ingest_runs')
      .update({
        finished_at: new Date().toISOString(),
        status,
        indicators_attempted: result.indicators_attempted,
        rows_upserted: result.rows_upserted,
        countries_covered: result.countries.size,
        error: errOverride ?? (result.errors.length > 0 ? result.errors.slice(0, 5).join(' | ') : null),
      })
      .eq('id', id);
  } catch {
    /* non-fatal */
  }
}

/**
 * Wall-clock HTTP budget per source, in ms.
 *
 * The six adapters run SEQUENTIALLY inside one function capped at
 * `maxDuration = 300`. Before 2026-09-07 no request had a timeout at all, so a
 * single hung upstream could burn the entire budget and take every adapter
 * behind it down with it — reported as nothing at all, because the function is
 * killed before it can log. Retries (added the same day, after a transient
 * "fetch failed" cost INE its whole daily load) make that risk strictly worse
 * unless the time is bounded, so the two ship together.
 *
 * Sized by fetch count: eurostat and ecb make 8 requests each, the rest one.
 * The sum (260s) plus write and logging headroom stays inside maxDuration.
 */
const SOURCE_BUDGET_MS: Record<string, number> = {
  eurostat: 70_000,
  ecb_sdw: 70_000,
  ine_es: 45_000,
  istat: 25_000,
  cbs: 25_000,
  bis: 25_000,
};

/** Leaves ~35s of the 300s function budget for writes, logging and the response. */
const GLOBAL_HTTP_DEADLINE_MS = 265_000;

export async function GET() {
  const log = await startCronLog('eu-stats-ingest', '/api/cron/eu-stats-ingest');
  const summary: Record<string, IngestResult> = {};
  const runStarted = Date.now();
  const globalDeadlineAt = runStarted + GLOBAL_HTTP_DEADLINE_MS;

  /**
   * An adapter gets its own slice, but never past the global wall. If an
   * earlier source overran, this lands in the past and the adapter fails
   * immediately with a named "budget exhausted" error — which is the point:
   * an honest, attributable failure instead of the whole function being killed
   * with nothing written to cron_logs.
   */
  const budgetFor = (source: string) => ({
    deadlineAt: Math.min(Date.now() + (SOURCE_BUDGET_MS[source] ?? 25_000), globalDeadlineAt),
  });

  // Eurostat
  {
    const runId = await logRun('eurostat');
    try {
      const r = await ingestEurostat(budgetFor('eurostat'));
      summary.eurostat = r;
      await finishRun(runId, r, r.errors.length === 0 ? 'success' : 'partial');
    } catch (e) {
      const empty: IngestResult = { source: 'eurostat', indicators_attempted: 0, rows_upserted: 0, rows_lost: 0, write_chunks_failed: 0, rows_duplicate_excluded: 0, rows_duplicate_collapsed: 0, rows_undecodable: 0, countries: new Set(), errors: [(e as Error).message] };
      summary.eurostat = empty;
      await finishRun(runId, empty, 'error', (e as Error).message);
    }
  }

  // ECB SDW
  {
    const runId = await logRun('ecb_sdw');
    try {
      const r = await ingestECB(budgetFor('ecb_sdw'));
      summary.ecb_sdw = r;
      await finishRun(runId, r, r.errors.length === 0 ? 'success' : 'partial');
    } catch (e) {
      const empty: IngestResult = { source: 'ecb_sdw', indicators_attempted: 0, rows_upserted: 0, rows_lost: 0, write_chunks_failed: 0, rows_duplicate_excluded: 0, rows_duplicate_collapsed: 0, rows_undecodable: 0, countries: new Set(), errors: [(e as Error).message] };
      summary.ecb_sdw = empty;
      await finishRun(runId, empty, 'error', (e as Error).message);
    }
  }

  // INE Spain
  {
    const runId = await logRun('ine_es');
    try {
      const r = await ingestINESpain(budgetFor('ine_es'));
      summary.ine_es = r;
      await finishRun(runId, r, r.errors.length === 0 ? 'success' : 'partial');
    } catch (e) {
      const empty: IngestResult = { source: 'ine_es', indicators_attempted: 0, rows_upserted: 0, rows_lost: 0, write_chunks_failed: 0, rows_duplicate_excluded: 0, rows_duplicate_collapsed: 0, rows_undecodable: 0, countries: new Set(), errors: [(e as Error).message] };
      summary.ine_es = empty;
      await finishRun(runId, empty, 'error', (e as Error).message);
    }
  }

  // ISTAT Italy
  {
    const runId = await logRun('istat');
    try {
      const r = await ingestISTAT(budgetFor('istat'));
      summary.istat = r;
      await finishRun(runId, r, r.errors.length === 0 ? 'success' : 'partial');
    } catch (e) {
      const empty: IngestResult = { source: 'istat', indicators_attempted: 0, rows_upserted: 0, rows_lost: 0, write_chunks_failed: 0, rows_duplicate_excluded: 0, rows_duplicate_collapsed: 0, rows_undecodable: 0, countries: new Set(), errors: [(e as Error).message] };
      summary.istat = empty;
      await finishRun(runId, empty, 'error', (e as Error).message);
    }
  }

  // CBS Netherlands
  {
    const runId = await logRun('cbs');
    try {
      const r = await ingestCBS(budgetFor('cbs'));
      summary.cbs = r;
      await finishRun(runId, r, r.errors.length === 0 ? 'success' : 'partial');
    } catch (e) {
      const empty: IngestResult = { source: 'cbs', indicators_attempted: 0, rows_upserted: 0, rows_lost: 0, write_chunks_failed: 0, rows_duplicate_excluded: 0, rows_duplicate_collapsed: 0, rows_undecodable: 0, countries: new Set(), errors: [(e as Error).message] };
      summary.cbs = empty;
      await finishRun(runId, empty, 'error', (e as Error).message);
    }
  }

  // BIS — cross-country residential property prices
  {
    const runId = await logRun('bis');
    try {
      const r = await ingestBIS(budgetFor('bis'));
      summary.bis = r;
      await finishRun(runId, r, r.errors.length === 0 ? 'success' : 'partial');
    } catch (e) {
      const empty: IngestResult = { source: 'bis', indicators_attempted: 0, rows_upserted: 0, rows_lost: 0, write_chunks_failed: 0, rows_duplicate_excluded: 0, rows_duplicate_collapsed: 0, rows_undecodable: 0, countries: new Set(), errors: [(e as Error).message] };
      summary.bis = empty;
      await finishRun(runId, empty, 'error', (e as Error).message);
    }
  }

  const totalRows = Object.values(summary).reduce((acc, s) => acc + s.rows_upserted, 0);
  // rows_upserted counted only successful chunks, so a total write failure was
  // reported as rows_upserted: 0 — the same shape as a source with no new data.
  const totalLost = Object.values(summary).reduce((acc, s) => acc + s.rows_lost, 0);
  const totalChunksFailed = Object.values(summary).reduce((acc, s) => acc + s.write_chunks_failed, 0);
  const totalAttempts = Object.values(summary).reduce((acc, s) => acc + s.indicators_attempted, 0);
  // Rows we refused to write, and why. Excluded-conflicting and undecodable are
  // REAL losses (a row that should exist and does not); collapsed-identical is
  // lossless but is still reported, because a source that suddenly starts
  // repeating itself is a change worth seeing.
  const totalDupExcluded = Object.values(summary).reduce((acc, s) => acc + s.rows_duplicate_excluded, 0);
  const totalDupCollapsed = Object.values(summary).reduce((acc, s) => acc + s.rows_duplicate_collapsed, 0);
  const totalUndecodable = Object.values(summary).reduce((acc, s) => acc + s.rows_undecodable, 0);
  const totalErrors = Object.values(summary).reduce((acc, s) => acc + s.errors.length, 0);

  // The per-source error strings are already collected above; passing them on
  // is the difference between a diagnosable failure and a bare 'error' row.
  // Without this the route logged status='error' with error=NULL on 91 of its
  // 92 runs — a job failing daily with nothing recorded about why.
  const failureDetail = Object.entries(summary)
    .filter(([, s]) => s.errors.length > 0)
    .map(([src, s]) => `${src}: ${s.errors.slice(0, 3).join('; ')}`)
    .join(' | ');

  await finishCronLog(
    log,
    totalErrors === 0 && totalLost === 0 && totalDupExcluded === 0 && totalUndecodable === 0
      ? 'success'
      : 'error',
    {
      rows_upserted: totalRows,
      rows_lost: totalLost,
      rows_duplicate_excluded: totalDupExcluded,
      rows_duplicate_collapsed: totalDupCollapsed,
      rows_undecodable: totalUndecodable,
      write_chunks_failed: totalChunksFailed,
      indicators_attempted: totalAttempts,
      errors: totalErrors,
    },
    failureDetail || null,
  );

  return NextResponse.json({
    ok: true,
    summary: Object.fromEntries(
      Object.entries(summary).map(([k, v]) => [k, {
        indicators_attempted: v.indicators_attempted,
        rows_upserted: v.rows_upserted,
        rows_lost: v.rows_lost,
        rows_duplicate_excluded: v.rows_duplicate_excluded,
        rows_duplicate_collapsed: v.rows_duplicate_collapsed,
        rows_undecodable: v.rows_undecodable,
        write_chunks_failed: v.write_chunks_failed,
        countries_covered: v.countries.size,
        errors: v.errors,
      }])
    ),
    total_rows_upserted: totalRows,
    total_rows_lost: totalLost,
    total_rows_duplicate_excluded: totalDupExcluded,
    total_rows_duplicate_collapsed: totalDupCollapsed,
    total_rows_undecodable: totalUndecodable,
  });
}
