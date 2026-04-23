/**
 * Agent Scribe — daily score snapshotter.
 * Inserts one row per scored property per day into score_history.
 * Powers score-delta displays ("+2 this week") and watchlist change alerts.
 *
 * Schedule: 02:00 UTC daily.
 */

import { NextResponse } from 'next/server';
import { startCronLog, finishCronLog } from '@/lib/cron-log';
import { supabase } from '@/lib/supabase';
import { getAllProperties } from '@/lib/properties';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET() {
  const log = await startCronLog('scribe', '/api/cron/scribe');
  if (!supabase) {
    await finishCronLog(log, 'skipped', { reason: 'no supabase' });
    return NextResponse.json({ ok: false, reason: 'no supabase' });
  }

  const all = getAllProperties().filter((p) => p.ref && p._sc != null);
  const today = new Date().toISOString().slice(0, 10);

  // Batch insert (on conflict do nothing — idempotent per day)
  const rows = all.map((p) => ({
    property_ref: p.ref,
    snapshot_date: today,
    avena_score: Math.round(p._sc ?? 0),
    price_eur: Math.round(p.pf),
    pm2_eur: p.bm > 0 ? Math.round(p.pf / p.bm) : null,
    mm2_eur: p.mm2 ? Math.round(p.mm2) : null,
    yield_gross: p._yield?.gross ?? null,
  }));

  let inserted = 0;
  // Chunk to avoid giant single insert
  const CHUNK = 200;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    try {
      const { error } = await supabase.from('score_history').upsert(slice, {
        onConflict: 'property_ref,snapshot_date',
        ignoreDuplicates: true,
      });
      if (!error) inserted += slice.length;
    } catch {
      /* continue */
    }
  }

  await finishCronLog(log, 'success', { total: all.length, snapshots_attempted: inserted, date: today });
  return NextResponse.json({ ok: true, date: today, snapshots: inserted, total: all.length });
}
