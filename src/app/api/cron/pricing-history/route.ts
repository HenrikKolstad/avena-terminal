/**
 * Pricing History cron — detects price changes, builds the institutional
 * time-series banks and funds care about.
 *
 * Strategy: every cycle, compare each property's current price_eur in
 * properties_registry against its most recent property_pricing_history
 * entry. If different (or no entry yet), log a new row.
 *
 * Schedule: 4×/day via vercel.json (overlap-safe).
 *
 * Output: property_pricing_history fills with every observed price-state
 * transition. Powers the Pricing History chart on the data sheet, plus
 * institutional "show me price-reduced properties" queries.
 */

import { NextRequest, NextResponse } from 'next/server';
import { startCronLog, finishCronLog } from '@/lib/cron-log';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface CurrentRow {
  avn_prop_id: string;
  price_eur: number | null;
  source_portal: string | null;
  status: string | null;
  withdrawn_at: string | null;
}

interface LastHistRow {
  avn_prop_id: string;
  price_eur: number | null;
  status: string | null;
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth && process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const log = await startCronLog('pricing-history', '/api/cron/pricing-history');

  if (!supabase) {
    await finishCronLog(log, 'error', null, new Error('Supabase not configured'));
    return NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 503 });
  }

  // Pull current state (price_eur not null, listings only)
  const { data: current, error: currErr } = await supabase
    .from('properties_registry')
    .select('avn_prop_id, price_eur, source_portal, status, withdrawn_at')
    .eq('is_for_sale', true)
    .not('price_eur', 'is', null)
    .limit(5000);

  if (currErr) {
    await finishCronLog(log, 'error', null, currErr);
    return NextResponse.json({ ok: false, error: currErr.message }, { status: 500 });
  }

  const rows = (current ?? []) as CurrentRow[];
  if (rows.length === 0) {
    await finishCronLog(log, 'success', { compared: 0, logged: 0 });
    return NextResponse.json({ ok: true, compared: 0, logged: 0 });
  }

  // Pull last-observed pricing per AVN_PROP_ID
  // Best-effort: a single batch lookup using IN. Limit to top 1000 IDs per
  // tick to bound work.
  const sample = rows.slice(0, 1000);
  const ids = sample.map((r) => r.avn_prop_id);

  const { data: lastHistData } = await supabase
    .from('property_pricing_history')
    .select('avn_prop_id, price_eur, status')
    .in('avn_prop_id', ids)
    .order('recorded_at', { ascending: false })
    .limit(5000);

  // Reduce to most-recent per id
  const lastByid = new Map<string, LastHistRow>();
  for (const r of (lastHistData ?? []) as LastHistRow[]) {
    if (!lastByid.has(r.avn_prop_id)) lastByid.set(r.avn_prop_id, r);
  }

  // Diff: log if price OR status changed, or if no history yet
  const inserts: Array<{
    avn_prop_id: string;
    price_eur: number;
    source_portal: string | null;
    status: string;
  }> = [];

  for (const r of sample) {
    if (r.price_eur == null) continue;
    const last = lastByid.get(r.avn_prop_id);

    let newStatus = 'listed';
    if (r.withdrawn_at) newStatus = 'withdrawn';
    else if (last?.price_eur != null && r.price_eur < last.price_eur) newStatus = 'reduced';
    else if (last?.price_eur != null && r.price_eur > last.price_eur) newStatus = 'increased';

    const changed =
      !last ||
      Math.abs((last.price_eur ?? 0) - r.price_eur) > 0.5 ||
      (last.status ?? null) !== newStatus;

    if (changed) {
      inserts.push({
        avn_prop_id: r.avn_prop_id,
        price_eur: r.price_eur,
        source_portal: r.source_portal,
        status: newStatus,
      });
    }
  }

  let logged = 0;
  if (inserts.length > 0) {
    const CHUNK = 500;
    for (let i = 0; i < inserts.length; i += CHUNK) {
      try {
        const { error } = await supabase
          .from('property_pricing_history')
          .insert(inserts.slice(i, i + CHUNK));
        if (!error) logged += Math.min(CHUNK, inserts.length - i);
      } catch { /* silent */ }
    }
  }

  const summary = { compared: sample.length, logged, deltas: inserts.length };
  await finishCronLog(log, 'success', summary);
  return NextResponse.json({ ok: true, ...summary });
}
