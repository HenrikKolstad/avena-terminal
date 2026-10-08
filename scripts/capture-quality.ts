/**
 * The daily capture-quality read, as committed code rather than ad-hoc SQL.
 *
 * WHY: two judgements that go into every morning brief were being made by hand
 * and were not reproducible.
 *
 *  1. "Is today's stored day ONE book, or a union of several?" On 2026-10-07 I
 *     declared the day a single write and quotable at 08:29. It was not: three
 *     further runs wrote to that date (11:43 and 14:30), one of them holding a
 *     STALE book, and the day ended as a union of up to four books. `created_at`
 *     is set on INSERT only, so an upsert that rewrites a row leaves it
 *     untouched — the spread of created_at understates the number of writes,
 *     and reading it as "one write" is wrong. cron_logs is the honest source
 *     for how many runs wrote, so this script reads BOTH and says so.
 *
 *  2. "How many real moves have no logged event?" Hand-derived on three
 *     mornings it gave 568 / 632 / 609, because each query gated the window
 *     differently. src/lib/move-reconciliation.ts now owns that definition and
 *     reports the two populations separately; this script is its I/O shell.
 *
 * Emits no zeros it cannot stand behind: missing credentials or a failed read
 * exits non-zero rather than printing a confident 0, per capability-stats.ts.
 *
 * Run: npx tsx scripts/capture-quality.ts [--since YYYY-MM-DD] [--json]
 */
import { createClient } from '@supabase/supabase-js';
import { judgeDayBook } from '../src/lib/capture-integrity';
import {
  deriveMoves,
  reconcileMoves,
  EVENT_LOG_START,
  type SnapshotRow,
  type MoveEventRow,
} from '../src/lib/move-reconciliation';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Supabase credentials missing (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).');
  console.error('Refusing to print a capture-quality report with no data — an empty');
  console.error('report here reads as "the capture is fine" and would be false.');
  process.exit(1);
}
const db = createClient(url, key);

const argSince = (() => {
  const i = process.argv.indexOf('--since');
  return i > -1 ? process.argv[i + 1] : EVENT_LOG_START;
})();
const asJson = process.argv.includes('--json');

/** Paginated select — PostgREST caps a response, and a truncated page would under-report. */
async function selectAll<T>(table: string, cols: string, gteCol: string, gte: string): Promise<T[]> {
  const PAGE = 1000;
  const out: T[] = [];
  for (let page = 0; ; page++) {
    if (page > 400) throw new Error(`${table}: pagination runaway guard tripped`);
    const { data, error } = await db
      .from(table)
      .select(cols)
      .gte(gteCol, gte)
      .order(gteCol, { ascending: true })
      .order('id', { ascending: true })
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data?.length) break;
    out.push(...(data as T[]));
    if (data.length < PAGE) break;
  }
  return out;
}

async function main() {
  // ── the move reconciliation ─────────────────────────────────────────────
  const snaps = await selectAll<SnapshotRow>('price_snapshots', 'id, ref, snapshot_date, price', 'snapshot_date', argSince);
  if (!snaps.length) throw new Error(`price_snapshots returned 0 rows since ${argSince} — refusing to report that as a healthy capture`);

  const rawEvents = await selectAll<{ avn_prop_id: string; recorded_at: string; status: string }>(
    'property_pricing_history', 'id, avn_prop_id, recorded_at, status', 'recorded_at', `${argSince}T00:00:00Z`
  );
  const events: MoveEventRow[] = rawEvents
    .filter((e) => e.status === 'reduced' || e.status === 'increased')
    .map((e) => ({ ref: e.avn_prop_id, date: new Date(e.recorded_at).toISOString().slice(0, 10) }));

  const { moves, rowsSkippedNullPrice } = deriveMoves(snaps);
  const report = reconcileMoves(moves, events, rowsSkippedNullPrice);

  // ── is the latest day one book? ─────────────────────────────────────────
  const latest = snaps.reduce((a, r) => (r.snapshot_date > a ? r.snapshot_date : a), snaps[0].snapshot_date);
  const latestRows = snaps.filter((r) => r.snapshot_date === latest);

  // created_at is INSERT-only, so this is a FLOOR on the number of writes.
  const batchRows = await db
    .from('price_snapshots')
    .select('created_at')
    .eq('snapshot_date', latest);
  if (batchRows.error) throw new Error(`price_snapshots created_at: ${batchRows.error.message}`);
  const batches = new Map<string, number>();
  for (const r of (batchRows.data ?? []) as Array<{ created_at: string | null }>) {
    const k = (r.created_at ?? 'unknown').slice(0, 19);
    batches.set(k, (batches.get(k) ?? 0) + 1);
  }

  // cron_logs is the honest count of runs that wrote to this date.
  const runs = await db
    .from('cron_logs')
    .select('started_at, status, output_summary')
    .eq('cron_path', '/api/cron/pricing-history')
    .gte('started_at', `${latest}T00:00:00Z`)
    .lte('started_at', `${latest}T23:59:59Z`)
    .order('started_at', { ascending: true });
  if (runs.error) throw new Error(`cron_logs: ${runs.error.message}`);
  const writingRuns = (runs.data ?? []).filter((r) => r.status === 'success');
  // The verdict is NOT the run count — see judgeDayBook for the two ways I got
  // this wrong. An idempotent re-run of the same book is not a union.
  const verdict = judgeDayBook(
    writingRuns.map((r) => {
      const o = (r.output_summary ?? {}) as Record<string, unknown>;
      return {
        bookDate: (o.feed_generated_date as string | undefined) ?? null,
        supersededRefs: Number(o.snapshot_superseded ?? 0),
        staleOverwrites: Number(o.snapshot_superseded_stale ?? 0),
      };
    })
  );

  const out = {
    window: { since: argSince, latest },
    latest_day: {
      rows: latestRows.length,
      distinct_refs: new Set(latestRows.map((r) => r.ref)).size,
      insert_batches: [...batches.entries()].sort().map(([at, n]) => ({ at, rows: n })),
      writing_runs: verdict.writingRuns,
      distinct_books: verdict.distinctBooks,
      single_book: verdict.oneBook,
      stale_overwrites: verdict.staleOverwrites,
      quotable_as_a_listing_count: verdict.quotable,
      verdict: verdict.reason,
    },
    moves: {
      event_log_start: report.eventLogStart,
      consecutive: {
        total: report.consecutive.total,
        logged: report.consecutive.logged,
        unlogged_live: report.consecutive.unloggedLive,
        unlogged_pre_log: report.consecutive.unloggedPreLog,
      },
      relisting: {
        total: report.relisting.total,
        logged: report.relisting.logged,
        unlogged_live: report.relisting.unloggedLive,
        unlogged_pre_log: report.relisting.unloggedPreLog,
        worst: report.relisting.unloggedLiveMoves.slice(0, 5).map((m) => `${m.ref} ${m.pct > 0 ? '+' : ''}${m.pct}% on ${m.date} (away ${m.gapDays}d)`),
      },
      orphan_events: report.orphanEvents.map((e) => `${e.ref} ${e.date}`),
      rows_skipped_null_price: report.rowsSkippedNullPrice,
    },
  };

  if (asJson) {
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  console.log(`capture quality — window ${argSince} .. ${latest}\n`);
  console.log(`LATEST DAY ${latest}`);
  console.log(`  rows ${out.latest_day.rows} / distinct refs ${out.latest_day.distinct_refs}`);
  console.log(`  pricing-history runs that wrote: ${out.latest_day.writing_runs}`);
  console.log(`  insert batches (created_at, a FLOOR — upserts do not bump it):`);
  for (const b of out.latest_day.insert_batches) console.log(`    ${b.at}  ${b.rows} rows`);
  console.log(`  stale-book overwrites reported: ${out.latest_day.stale_overwrites}`);
  console.log(`  ONE BOOK: ${out.latest_day.single_book ? 'yes' : 'NO — this day is a union'}`);
  console.log(`  quotable as a listing count: ${out.latest_day.quotable_as_a_listing_count ? 'yes' : 'NO'}`);
  console.log(`  verdict: ${out.latest_day.verdict}`);
  console.log(`\nMOVES (event log began ${report.eventLogStart}; the two classes are never summed)`);
  console.log(`  consecutive (<=2d gap, what deltas.ts reads):`);
  console.log(`    ${report.consecutive.total} derived · ${report.consecutive.logged} logged · ${report.consecutive.unloggedLive} unlogged LIVE · ${report.consecutive.unloggedPreLog} unlogged pre-log`);
  console.log(`  relisting (>2d gap, invisible to deltas.ts by construction):`);
  console.log(`    ${report.relisting.total} derived · ${report.relisting.logged} logged · ${report.relisting.unloggedLive} unlogged LIVE · ${report.relisting.unloggedPreLog} unlogged pre-log`);
  for (const w of out.moves.relisting.worst) console.log(`      ${w}`);
  console.log(`  orphan events (logged, but the snapshot holds no such move): ${report.orphanEvents.length}`);
  for (const o of out.moves.orphan_events.slice(0, 10)) console.log(`      ${o}`);
  console.log(`  rows skipped for null price: ${report.rowsSkippedNullPrice}`);
}

main().catch((e) => {
  console.error(`capture-quality FAILED: ${e instanceof Error ? e.message : String(e)}`);
  console.error('Reporting the failure rather than a zero. Do not treat this as a clean capture.');
  process.exit(1);
});
