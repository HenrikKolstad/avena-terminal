/**
 * Agent Scribe — daily score snapshotter.
 * Inserts one row per scored property per day into score_history.
 * Powers score-delta displays ("+2 this week"), the /api/v1/property/[ref]/history
 * surface, and APCI's price_momentum component.
 *
 * DATING (fixed 2026-08-21). This route reads the DEPLOYED public/data.json.
 * It used to stamp rows with `new Date()`, on the assumption that the book on
 * disk was today's — true when the feed refresh ran at 01:37 UTC and scribe at
 * 02:00. The feed workflow later moved to 02:47 and scribe never followed, so
 * for months every row dated D actually held the book from D-1.
 *
 * Measured 2026-08-21 across 2026-08-14..08-21: on all 8 days, 100% of
 * score_history rows dated D matched the price_snapshots row for D-1, and on
 * the 73 cases where the price genuinely moved between D-1 and D the stored
 * value was always the D-1 one. Nothing about the output looked wrong — the
 * series was complete, every day present, ~2,000 rows each. That is the
 * failure mode this codebase keeps meeting: a broken thing that looks like a
 * working thing with nothing to report.
 *
 * The date is now taken from the book itself (feed-meta.json), so it names the
 * day the observation was actually made. pricing-history was given the same
 * treatment in 1f0a130; its header noted "score_history (scribe) ... deliberately
 * untouched", which is how scribe kept the bug that route was fixed for.
 *
 * Historical rows are NOT rewritten: the upsert stays ignoreDuplicates, so no
 * existing row is ever modified. The series therefore carries a one-day seam
 * at the changeover, recorded in ODYSSEY-STATE.md rather than papered over.
 *
 * Schedule: 03:00 UTC daily (after the ~02:47 feed refresh), plus an explicit
 * trigger from the feed workflow once the new book is confirmed deployed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedCron } from '@/lib/cron-auth';
import { startCronLog, finishCronLog, describeError } from '@/lib/cron-log';
import { supabase } from '@/lib/supabase';
import { getAllProperties } from '@/lib/properties';
import { getFeedGeneratedDate } from '@/lib/feed-meta';
import { resolveSnapshotDate, deriveStatus, deriveWriteCounts, type WriteTally } from '@/lib/scribe-logic';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const MAX_REPORTED_ERRORS = 5;

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const log = await startCronLog('scribe', '/api/cron/scribe');
  if (!supabase) {
    await finishCronLog(log, 'skipped', { reason: 'no supabase' });
    return NextResponse.json({ ok: false, reason: 'no supabase' });
  }

  const wallClock = new Date().toISOString().slice(0, 10);
  const { date: snapshotDate, source: dateSource, lagDays } = resolveSnapshotDate(
    getFeedGeneratedDate(),
    wallClock
  );

  const all = getAllProperties().filter((p) => p.ref && p._sc != null);

  // How many rows already exist for this date, measured BEFORE writing. The
  // upsert ignores duplicates, so without this a collision (two runs, or the
  // schedule change landing on a day the old schedule already wrote) would be
  // silently absorbed and read as a clean capture.
  let preExisting: number | null = null;
  try {
    const { count, error } = await supabase
      .from('score_history')
      .select('*', { count: 'exact', head: true })
      .eq('snapshot_date', snapshotDate);
    if (!error) preExisting = count ?? null;
  } catch {
    preExisting = null; // reported as unknown, never as zero
  }

  const rows = all.map((p) => ({
    property_ref: p.ref,
    snapshot_date: snapshotDate,
    avena_score: Math.round(p._sc ?? 0),
    price_eur: Math.round(p.pf),
    pm2_eur: p.bm > 0 ? Math.round(p.pf / p.bm) : null,
    mm2_eur: p.mm2 ? Math.round(p.mm2) : null,
    yield_gross: p._yield?.gross ?? null,
  }));

  const tally: WriteTally = { rowsSent: rows.length, rowsFailed: 0, errors: [] };

  const CHUNK = 200;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const note = (e: unknown) => {
      tally.rowsFailed += slice.length;
      if (tally.errors.length < MAX_REPORTED_ERRORS) {
        tally.errors.push(`rows ${i}-${i + slice.length - 1}: ${describeError(e) ?? 'unknown error'}`);
      }
    };
    try {
      const { error } = await supabase.from('score_history').upsert(slice, {
        onConflict: 'property_ref,snapshot_date',
        ignoreDuplicates: true,
      });
      if (error) note(error);
    } catch (e) {
      note(e);
    }
  }

  // How many rows the date actually holds AFTER the write.
  //
  // WHY (2026-10-11). `rows_accepted` below is `rowsSent - rowsFailed`, a
  // COMPUTED number, and with `ignoreDuplicates: true` it is indistinguishable
  // from the truth on a run that wrote nothing at all. 2026-10-05 12:14:10
  // logged `rows_sent: 2030, rows_accepted: 2030, rows_failed: 0` and inserted
  // ZERO rows: the 07:40 run had already banked that date, so every row was
  // ignored. It also logged `rows_pre_existing: null`, because the pre-count
  // read failed — honest, but it left the log with no way at all to tell a
  // banked book from a complete no-op.
  //
  // That mattered the same day. The 07:40 book still carried the previous day's
  // prices for twelve refs (N10009, N7520, N8076, N8461, N9462, N9482, SP0817,
  // SP0887, SP0888, SP0890, SP0891, SP1876); the 12:13 book carried the real
  // moves, which persisted into 10-06. price_snapshots rewrites and holds the
  // corrected prices; score_history ignored the correction and still holds the
  // stale ones. All twelve disagree, and nothing in either log said so.
  //
  // So this counts instead of computing. `rows_inserted` is a MEASUREMENT
  // (after - before) and is null — never 0 — when either count is unavailable,
  // because "we could not count" and "nothing was written" are different facts
  // and collapsing them is the bug this whole file keeps re-learning.
  //
  // Read-only: two count queries. The write path above is untouched, and
  // `ignoreDuplicates` stays — not rewriting a banked observation is deliberate
  // (see the header). What was missing was saying so out loud.
  let postExisting: number | null = null;
  try {
    const { count, error } = await supabase
      .from('score_history')
      .select('*', { count: 'exact', head: true })
      .eq('snapshot_date', snapshotDate);
    if (!error) postExisting = count ?? null;
  } catch {
    postExisting = null;
  }

  const { rowsAccepted, rowsInserted, rowsIgnored, noOp } = deriveWriteCounts(
    tally.rowsSent,
    tally.rowsFailed,
    preExisting,
    postExisting,
  );

  const { status, reason } = deriveStatus(tally);

  const summary = {
    date: snapshotDate,
    date_source: dateSource,
    wall_clock_date: wallClock,
    book_lag_days: lagDays,
    total: all.length,
    rows_sent: tally.rowsSent,
    // Computed: rows the database did not reject. Kept because the series is
    // long and comparable, but it is NOT evidence that anything was written.
    rows_accepted: rowsAccepted,
    rows_failed: tally.rowsFailed,
    rows_pre_existing: preExisting,
    // Measured: what the date held after the write, and the difference.
    rows_post_existing: postExisting,
    rows_inserted: rowsInserted,
    // Rows this run sent that the date already held, so `ignoreDuplicates`
    // dropped them. A full-book value here means the run changed NOTHING, and
    // any price this book corrected is still stale in score_history.
    rows_ignored: rowsIgnored,
    no_op: noOp,
    errors: tally.errors.length ? tally.errors : null,
    reason,
  };

  await finishCronLog(log, status, summary, tally.errors.length ? tally.errors.join(' ;; ') : reason);

  return NextResponse.json({ ok: status === 'success', ...summary }, { status: status === 'error' ? 500 : 200 });
}
