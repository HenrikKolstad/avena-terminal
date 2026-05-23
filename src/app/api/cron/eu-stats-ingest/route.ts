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

export async function GET() {
  const log = await startCronLog('eu-stats-ingest', '/api/cron/eu-stats-ingest');
  const summary: Record<string, IngestResult> = {};

  // Eurostat
  {
    const runId = await logRun('eurostat');
    try {
      const r = await ingestEurostat();
      summary.eurostat = r;
      await finishRun(runId, r, r.errors.length === 0 ? 'success' : 'partial');
    } catch (e) {
      const empty: IngestResult = { source: 'eurostat', indicators_attempted: 0, rows_upserted: 0, countries: new Set(), errors: [(e as Error).message] };
      summary.eurostat = empty;
      await finishRun(runId, empty, 'error', (e as Error).message);
    }
  }

  // ECB SDW
  {
    const runId = await logRun('ecb_sdw');
    try {
      const r = await ingestECB();
      summary.ecb_sdw = r;
      await finishRun(runId, r, r.errors.length === 0 ? 'success' : 'partial');
    } catch (e) {
      const empty: IngestResult = { source: 'ecb_sdw', indicators_attempted: 0, rows_upserted: 0, countries: new Set(), errors: [(e as Error).message] };
      summary.ecb_sdw = empty;
      await finishRun(runId, empty, 'error', (e as Error).message);
    }
  }

  // INE Spain
  {
    const runId = await logRun('ine_es');
    try {
      const r = await ingestINESpain();
      summary.ine_es = r;
      await finishRun(runId, r, r.errors.length === 0 ? 'success' : 'partial');
    } catch (e) {
      const empty: IngestResult = { source: 'ine_es', indicators_attempted: 0, rows_upserted: 0, countries: new Set(), errors: [(e as Error).message] };
      summary.ine_es = empty;
      await finishRun(runId, empty, 'error', (e as Error).message);
    }
  }

  // ISTAT Italy
  {
    const runId = await logRun('istat');
    try {
      const r = await ingestISTAT();
      summary.istat = r;
      await finishRun(runId, r, r.errors.length === 0 ? 'success' : 'partial');
    } catch (e) {
      const empty: IngestResult = { source: 'istat', indicators_attempted: 0, rows_upserted: 0, countries: new Set(), errors: [(e as Error).message] };
      summary.istat = empty;
      await finishRun(runId, empty, 'error', (e as Error).message);
    }
  }

  // CBS Netherlands
  {
    const runId = await logRun('cbs');
    try {
      const r = await ingestCBS();
      summary.cbs = r;
      await finishRun(runId, r, r.errors.length === 0 ? 'success' : 'partial');
    } catch (e) {
      const empty: IngestResult = { source: 'cbs', indicators_attempted: 0, rows_upserted: 0, countries: new Set(), errors: [(e as Error).message] };
      summary.cbs = empty;
      await finishRun(runId, empty, 'error', (e as Error).message);
    }
  }

  // BIS — cross-country residential property prices
  {
    const runId = await logRun('bis');
    try {
      const r = await ingestBIS();
      summary.bis = r;
      await finishRun(runId, r, r.errors.length === 0 ? 'success' : 'partial');
    } catch (e) {
      const empty: IngestResult = { source: 'bis', indicators_attempted: 0, rows_upserted: 0, countries: new Set(), errors: [(e as Error).message] };
      summary.bis = empty;
      await finishRun(runId, empty, 'error', (e as Error).message);
    }
  }

  const totalRows = Object.values(summary).reduce((acc, s) => acc + s.rows_upserted, 0);
  const totalAttempts = Object.values(summary).reduce((acc, s) => acc + s.indicators_attempted, 0);
  const totalErrors = Object.values(summary).reduce((acc, s) => acc + s.errors.length, 0);

  await finishCronLog(log, totalErrors === 0 ? 'success' : 'error', {
    rows_upserted: totalRows,
    indicators_attempted: totalAttempts,
    errors: totalErrors,
  });

  return NextResponse.json({
    ok: true,
    summary: Object.fromEntries(
      Object.entries(summary).map(([k, v]) => [k, {
        indicators_attempted: v.indicators_attempted,
        rows_upserted: v.rows_upserted,
        countries_covered: v.countries.size,
        errors: v.errors,
      }])
    ),
    total_rows_upserted: totalRows,
  });
}
