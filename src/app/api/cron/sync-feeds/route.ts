/**
 * GET /api/cron/sync-feeds — daily 03:00 UTC.
 *
 * Iterates feed_configs (Supabase) where active=true and runs the universal
 * EU parser for each. Writes per-country JSON files, upserts sold/snapshot
 * data, and logs every run to feed_sync_log.
 *
 * Runs in Vercel's Node runtime (parse-feed-eu.js is CommonJS). Per-feed
 * timeout: 90s. Total cron budget: 300s (vercel.json maxDuration).
 *
 * When a country first goes live (status transitions from no-data → ≥10
 * properties), this also fires an /api/auto-post webhook to celebrate.
 */
import { NextRequest, NextResponse } from 'next/server';
import { startCronLog, finishCronLog } from '@/lib/cron-log';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

interface FeedConfig {
  id: string;
  country_code: string;
  country_name: string | null;
  portal_name: string | null;
  feed_url: string | null;
  feed_type: 'xml' | 'json' | 'scrape';
  field_map: Record<string, string> | null;
  active: boolean;
  last_sync: string | null;
  sync_interval_hours: number | null;
}

// Tell TypeScript these are CommonJS dynamic imports
type ProcessCountryFn = (cfg: unknown) => Promise<{
  country: string;
  country_name?: string;
  portal?: string;
  status: string;
  total: number;
  added?: number;
  removed?: number;
  updated?: number;
  hedonic_r2?: number | null;
  error?: string;
  ms?: number;
}>;

async function loadEuParser(): Promise<{ processCountry: ProcessCountryFn; mergeAllCountries: () => unknown } | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../../../../../parse-feed-eu.js') as { processCountry: ProcessCountryFn; mergeAllCountries: () => unknown };
    return mod;
  } catch (e) {
    console.error('parse-feed-eu load failed', e);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const log = await startCronLog('sync-feeds', '/api/cron/sync-feeds');

  if (!supabase) {
    await finishCronLog(log, 'error', null, new Error('Supabase not configured'));
    return NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 503 });
  }

  // Load active feed configs
  const { data: configs, error: cfgErr } = await supabase
    .from('feed_configs')
    .select('id, country_code, country_name, portal_name, feed_url, feed_type, field_map, active, last_sync, sync_interval_hours')
    .eq('active', true);
  if (cfgErr) {
    await finishCronLog(log, 'error', null, cfgErr);
    return NextResponse.json({ ok: false, error: cfgErr.message }, { status: 500 });
  }
  const active = (configs ?? []) as FeedConfig[];
  if (active.length === 0) {
    await finishCronLog(log, 'skipped', { reason: 'no_active_configs' });
    return NextResponse.json({ ok: true, processed: 0, note: 'No active feed configs' });
  }

  // Filter by sync_interval — only run if last_sync older than interval
  const due = active.filter((c) => {
    const h = c.sync_interval_hours ?? 24;
    if (!c.last_sync) return true;
    const ageH = (Date.now() - new Date(c.last_sync).getTime()) / 3_600_000;
    return ageH >= h;
  });
  console.log(`sync-feeds: ${active.length} active configs, ${due.length} due now`);

  const mod = await loadEuParser();
  if (!mod) {
    await finishCronLog(log, 'error', null, new Error('parse-feed-eu unavailable'));
    return NextResponse.json({ ok: false, error: 'parser_unavailable' }, { status: 500 });
  }

  const results: Awaited<ReturnType<ProcessCountryFn>>[] = [];
  for (const cfg of due) {
    const startedAt = new Date().toISOString();
    try {
      const cfgPayload = {
        country: cfg.country_code,
        country_name: cfg.country_name,
        portal: cfg.portal_name,
        feed_url: cfg.feed_url,
        feed_type: cfg.feed_type,
        field_map: cfg.field_map ?? {},
        status: cfg.feed_url ? 'live' : 'stub',
        currency: 'EUR',         // overridden per row below if needed (config may carry currency in field_map.__currency)
      };
      const r = await mod.processCountry(cfgPayload);
      results.push(r);

      // Persist sync log row + update last_sync
      await supabase.from('feed_sync_log').insert({
        country_code: r.country,
        portal_name: r.portal ?? cfg.portal_name,
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        properties_total: r.total ?? 0,
        properties_added: r.added ?? 0,
        properties_removed: r.removed ?? 0,
        properties_updated: r.updated ?? 0,
        error: r.error ?? null,
        status: r.status,
      });
      await supabase
        .from('feed_configs')
        .update({ last_sync: new Date().toISOString() })
        .eq('id', cfg.id);

      // First-time-live broadcast: if this country has zero prior successful
      // sync_log rows AND now has ≥10 properties → ping auto-post.
      if (r.status === 'success' && (r.total ?? 0) >= 10) {
        const { count: priorSuccesses } = await supabase
          .from('feed_sync_log')
          .select('*', { count: 'exact', head: true })
          .eq('country_code', cfg.country_code)
          .eq('status', 'success')
          .lt('started_at', startedAt);
        if ((priorSuccesses ?? 0) === 0) {
          try {
            await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://avenaterminal.com'}/api/auto-post`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.CRON_SECRET ?? ''}` },
              body: JSON.stringify({
                topic: 'eu_expansion',
                text: `${cfg.country_name ?? cfg.country_code} is now live on Avena Terminal. ${r.total} properties indexed via ${cfg.portal_name}, queryable through one APIP-standard API. https://avenaterminal.com/eu-coverage`,
              }),
            });
          } catch { /* non-fatal */ }
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ country: cfg.country_code, status: 'fatal', total: 0, error: msg });
      await supabase.from('feed_sync_log').insert({
        country_code: cfg.country_code,
        portal_name: cfg.portal_name,
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        properties_total: 0,
        error: msg,
        status: 'fatal',
      });
    }
  }

  // Merge all country JSON files → data-eu.json
  let mergeSummary: unknown = null;
  try {
    mergeSummary = mod.mergeAllCountries();
  } catch (e) {
    console.error('merge failed', e);
  }

  const summary = {
    configs_active: active.length,
    configs_due: due.length,
    results,
    merge_summary: mergeSummary,
  };
  await finishCronLog(log, 'success', summary);
  return NextResponse.json({ ok: true, ...summary });
}
