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
// Default to a rolling week, not a single day. Search Console's lag is not a
// fixed 2 days — on 2026-08-10 the run asked for 2026-08-08 alone, got nothing
// and exited 1. The hole was permanent: the next night asks for 08-09, so
// 08-08 would never have been requested again. A window re-requests every
// recent day nightly, and because the writes are upserts keyed on date, a day
// that arrives late simply fills itself in. Google also restates recent days,
// which the same re-fetch picks up.
const BACKFILL_DAYS = backfillArg > -1 ? Number(process.argv[backfillArg + 1]) : 7;

async function main() {
  const end = latestUsableDate();
  const start = daysBefore(end, BACKFILL_DAYS - 1);

  // ── Daily totals ────────────────────────────────────────────────────────
  const daily = await searchAnalytics({ startDate: start, endDate: end, dimensions: ['date'] });
  if (!daily.length) {
    // An empty WINDOW is unambiguous: a single missing day is ordinary lag,
    // but a whole week of nothing means auth, property or quota — a real
    // failure. Still never a zero row: refusing to write beats inventing.
    console.error(`gsc-snapshot: no rows in the whole ${BACKFILL_DAYS}-day window ` +
      `${start}..${end}. That is not Search Console lag — check the service ` +
      'account, the property URL and quota. Refusing to write a zero.');
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

  // ── Per-page, for the most recent day Google ACTUALLY has ───────────────
  // Page-level for a 90-day backfill would be a huge write for little value;
  // the daily series is what experiments read out against.
  //
  // This query used `end` — latestUsableDate(), an ASSUMED lag — as a single
  // day. That is the same bug the window above was introduced to fix, left
  // unfixed on this half: Search Console's lag is not a fixed 2 days, so on
  // most nights `end` is a day Google has not published and the page query
  // returned nothing. The result was a silent, plausible-looking "0 pages"
  // rather than an error. `gsc_pages` accumulated exactly TWO dates in its
  // lifetime (2026-08-07 and 2026-08-12) — the rare nights the assumed date
  // happened to be real — while every other night reported success.
  //
  // Ask for the latest date the daily query actually returned instead. Take
  // the max explicitly rather than trusting row order.
  const latestActual = dailyRows.reduce((a, r) => (r.date > a ? r.date : a), dailyRows[0].date);
  const pages = await searchAnalytics({
    startDate: latestActual, endDate: latestActual, dimensions: ['page'], rowLimit: 5000,
  });
  const pageRows = pages.map((r) => ({
    date: latestActual,
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
  } else {
    // A day that has daily totals but no page rows is not normal. Say so
    // loudly rather than letting "0 pages" read as a measurement.
    console.error(
      `gsc-snapshot: WARNING — ${latestActual} has daily totals but returned ZERO ` +
      'page rows. That is not ordinary lag (the date came from Google\'s own ' +
      'response). Check the page-dimension quota and the property URL form.',
    );
  }

  // ── Per-query, same day ─────────────────────────────────────────────────
  // ADDED 2026-10-06, and the reason is a question this capture could not
  // answer. Weekly impressions have fallen six weeks running (953 → 647 →
  // 635 → 497 → 322) from a pre-change band of 427–758. Decomposed from
  // gsc_pages, BOTH factors fell — pages with an impression 221 → 150,
  // impressions per page 4.31 → 2.15 — while average position IMPROVED,
  // 24.7 → 17.8.
  //
  // Fewer impressions at BETTER positions is not the signature of a
  // demotion; it is the signature of matching fewer queries. But "matched to
  // fewer queries" and "same queries, less demand" are different diagnoses
  // with opposite responses, and neither gsc_daily nor gsc_pages can tell
  // them apart, because the query dimension was never captured. Search
  // Console keeps 16 months, so every night without it is a night lost.
  //
  // Deliberately AFTER the two upserts above: if this half fails, the daily
  // and page rows are already banked and only the query capture is missing.
  // It still throws — a failure here must show a red run, never a quiet
  // green one — but it fails having lost nothing.
  // Asked as ['date', 'query'] over the SAME window as the daily series, not
  // as ['query'] for one day: one call returns per-day-per-query rows, so the
  // nightly run re-fetches a rolling week and a late or restated day fills
  // itself in — the identical self-healing contract as gsc_daily. It also
  // means `--backfill 90` backfills the query dimension too, in one request.
  const queries = await searchAnalytics({
    startDate: start, endDate: end, dimensions: ['date', 'query'], rowLimit: 25000,
  });
  const queryRows = queries.map((r) => ({
    date: r.keys[0],
    query: r.keys[1],
    clicks: Math.round(r.clicks),
    impressions: Math.round(r.impressions),
    avg_position: Number(r.position.toFixed(2)),
  }));
  if (queryRows.length) {
    for (let i = 0; i < queryRows.length; i += 500) {
      const { error } = await db
        .from('gsc_queries')
        .upsert(queryRows.slice(i, i + 500), { onConflict: 'date,query' });
      if (error) throw new Error(`gsc_queries upsert failed: ${error.message}`);
    }
  } else {
    // Google withholds low-volume queries for privacy, so a day can
    // legitimately return fewer query rows than page rows — but not zero
    // alongside real daily totals. Say so rather than letting it pass as a
    // measurement of nothing.
    console.error(
      `gsc-snapshot: WARNING — ${latestActual} has daily totals but returned ZERO ` +
      'query rows. Anonymised-query filtering thins this dimension, it does not ' +
      'empty it. Check the query-dimension quota and the property URL form.',
    );
  }

  const last = dailyRows.find((r) => r.date === latestActual)!;
  console.log(
    `gsc-snapshot: ${dailyRows.length} day(s) ${start}..${end} · latest ${last.date}: ` +
    `${last.clicks} clicks, ${last.impressions} impressions, pos ${last.avg_position} · ` +
    `${pageRows.length} pages for ${latestActual}, ${queryRows.length} query-days over ${start}..${end}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
