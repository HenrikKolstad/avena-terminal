/**
 * Agent Curator — daily AVENA Index close writer.
 *
 * Computes the AVENA composite and persists one row per UTC day to
 * avena_history. Idempotent per day via unique constraint on snapshot_date.
 *
 * Schedule: 23:50 UTC (end of trading day).
 */

import { NextResponse } from 'next/server';
import { startCronLog, finishCronLog } from '@/lib/cron-log';
import { supabase } from '@/lib/supabase';
import { computeAvena } from '@/lib/avena-index';

export const dynamic = 'force-dynamic';

export async function GET() {
  const log = await startCronLog('curator', '/api/cron/curator');
  const snap = computeAvena();

  if (!supabase) {
    await finishCronLog(log, 'skipped', { reason: 'no supabase', value: snap.value });
    return NextResponse.json({ ok: false, reason: 'no supabase', snapshot: snap });
  }

  try {
    const { error } = await supabase.from('avena_history').upsert(
      {
        snapshot_date: snap.date,
        value: snap.value,
        median_pm2: snap.median_pm2,
        mean_score: snap.mean_score,
        count: snap.count,
        value_index: snap.value_index,
        score_index: snap.score_index,
        depth_index: snap.depth_index,
        methodology: 'v1.0',
      },
      { onConflict: 'snapshot_date', ignoreDuplicates: false }
    );
    if (error) {
      await finishCronLog(log, 'error', null, error.message);
      return NextResponse.json({ ok: false, error: error.message });
    }
  } catch (e) {
    await finishCronLog(log, 'error', null, e);
    return NextResponse.json({ ok: false, error: String(e) });
  }

  await finishCronLog(log, 'success', snap);
  return NextResponse.json({ ok: true, snapshot: snap });
}
