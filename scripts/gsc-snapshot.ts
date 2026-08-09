/**
 * Daily Search Console snapshot → Supabase `gsc_daily` + `gsc_pages`.
 *
 * Two reasons this persists rather than querying live:
 *  1. Search Console only retains 16 months. Anything we want to compare
 *     against in 2028 has to be captured now — the same logic as the price
 *     ledger, applied to our own visibility.
 *  2. An experiment read-out 21 days after a change needs the numbers as they
 *     were, not as Google restates them.
 *
 * Writes are upserts keyed on date, so re-running is safe and a late-arriving
 * day self-corrects.
 *
 * Run: npx tsx scripts/gsc-snapshot.ts [--backfill 90]
 */
import { createClient } from '@supabase/supabase-js';
import { searchAnalytics, latestUsableDate, daysBefore } from '../src/lib/search-console';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('gsc-snapshot: Supabase credentials missing — refusing to run.');
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const backfillArg = process.argv.indexOf('--backfill');
const BACKFILL_DAYS = backfillArg > -1 ? Number(process.argv[backfillArg + 1]) : 1;

async function main() {
  const end = latestUsableDate();
  const start = daysBefore(end, BACKFILL_DAYS - 1);

  // ── Daily totals ────────────────────────────────────────────────────────
  const daily = await searchAnalytics({ startDate: start, endDate: end, dimensions: ['date'] });
  if (!daily.length) {
    console.error(`gsc-snapshot: no rows for ${start}..${end}. Search Console lags ~2 days; ` +
      'if this persists for more than 3 days, treat it as a real failure, not a quiet zero.');
    process.exit(1);
  }
  const dailyRows = daily.map((r) => ({
    date: r.keys[0],
    clicks: Math.round(r.clicks),
    impressions: Math.round(r.impressions),
    ctr_pct: Number((r.ctr * 100).toFixed(3)),
    avg_position: Number(r.position.toFixed(2)),
  }));
  const { error: e1 } = await db.from('gsc_daily').upsert(dailyRows, { onConflict: 'date' });
  if (e1) throw new Error(`gsc_daily upsert failed: ${e1.message}`);

  // ── Per-page, for the most recent day only ──────────────────────────────
  // Page-level for a 90-day backfill would be a huge write for little value;
  // the daily series is what experiments read out against.
  const pages = await searchAnalytics({
    startDate: end, endDate: end, dimensions: ['page'], rowLimit: 5000,
  });
  const pageRows = pages.map((r) => ({
    date: end,
    page: r.keys[0],
    clicks: Math.round(r.clicks),
    impressions: Math.round(r.impressions),
    avg_position: Number(r.position.toFixed(2)),
  }));
  if (pageRows.length) {
    for (let i = 0; i < pageRows.length; i += 500) {
      const { error } = await db
        .from('gsc_pages')
        .upsert(pageRows.slice(i, i + 500), { onConflict: 'date,page' });
      if (error) throw new Error(`gsc_pages upsert failed: ${error.message}`);
    }
  }

  const last = dailyRows[dailyRows.length - 1];
  console.log(
    `gsc-snapshot: ${dailyRows.length} day(s) ${start}..${end} · latest ${last.date}: ` +
    `${last.clicks} clicks, ${last.impressions} impressions, pos ${last.avg_position} · ` +
    `${pageRows.length} pages`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
