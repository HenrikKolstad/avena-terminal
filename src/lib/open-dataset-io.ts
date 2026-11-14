/**
 * Fetch side of the open dataset — paginated reads shared by the cron route
 * (supabaseAdmin) and the CI script (its own env-built client).
 *
 * Paginated for the same reason pricing-history paginates: PostgREST caps a
 * response at its max-rows setting, and a silently truncated snapshot set
 * would publish an artifact claiming fewer observations than we hold.
 * Throws on error — a failed read must never become an empty dataset.
 *
 * Nightly feed-refresh run 42221001665 (2026-11-07) died here and only here:
 * `fetchSnapshots` ordered the whole of `price_snapshots` by `snapshot_date`
 * and applied the ledger epoch in JavaScript afterwards. That is an ordered
 * scan of the pre-epoch rows as well as the live series (~2k refs × ~95 days).
 * Postgres cancelled it with `statement timeout`. The feed commit and the
 * scribe had already succeeded.
 *
 * The read is now the shape pricing-history uses for the same table: one
 * `snapshot_date` at a time (that column is indexed), with the epoch bound
 * in the query before `range`. A day is ~2 pages. MAX_PAGES stays the
 * refuse-to-truncate guard on each of those queries; the corpus can grow
 * past 200 pages because no single query holds it.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SnapshotRow, SoldRow } from '@/lib/open-dataset';

export const PAGE = 1000;
export const MAX_PAGES = 200;

const SNAPSHOT_COLUMNS = 'ref, snapshot_date, price, pm2, town, region, type, move_status';
const SOLD_COLUMNS = 'ref, town, region, type, beds, built_m2, last_price, last_pm2, last_seen_date';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

interface Bound {
  gte?: [string, string];
  eq?: [string, string];
}

function assertIsoDate(value: string, label: string): void {
  if (!ISO_DATE.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new Error(`open-dataset: ${label} is not a YYYY-MM-DD date`);
  }
}

function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}

function boundLabel(bound: Bound): string {
  const parts: string[] = [];
  if (bound.gte) parts.push(`${bound.gte[0]} >= ${bound.gte[1]}`);
  if (bound.eq) parts.push(`${bound.eq[0]} = ${bound.eq[1]}`);
  return parts.join(', ');
}

async function fetchBounded<T>(
  db: SupabaseClient,
  table: string,
  columns: string,
  bound: Bound,
  orderCols: string[],
): Promise<T[]> {
  const out: T[] = [];
  const where = boundLabel(bound);
  for (let page = 0; page < MAX_PAGES; page++) {
    let query = db.from(table).select(columns);
    if (bound.gte) query = query.gte(bound.gte[0], bound.gte[1]);
    if (bound.eq) query = query.eq(bound.eq[0], bound.eq[1]);
    for (const column of orderCols) query = query.order(column, { ascending: true });
    const { data, error } = await query.range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) {
      throw new Error(`open-dataset: ${table} read failed${where ? ` (${where})` : ''}: ${error.message}`);
    }
    if (!data?.length) return out;
    out.push(...(data as T[]));
    if (data.length < PAGE) return out;
  }
  // Falling out of the loop means page MAX_PAGES-1 came back FULL, so there is
  // more data the caller never saw. Reads are ordered ascending, so a silent
  // truncation here would drop the newest rows of this chunk and publish a
  // corpus that quietly stopped growing. Raise the cap; never let this pass.
  throw new Error(
    `open-dataset: ${table} exceeded ${MAX_PAGES} pages (${MAX_PAGES * PAGE} rows)` +
    `${where ? ` for ${where}` : ''} — refusing to publish a truncated dataset. Raise MAX_PAGES.`,
  );
}

export interface FetchSnapshotOptions {
  /** Last calendar day to read, inclusive. Defaults to today (UTC). */
  until?: string;
}

/**
 * Every price_snapshots row on or after `sinceDate`, one calendar day at a
 * time. The epoch filter is in each query, before pagination. Days with no
 * capture (including the 14–20 October 2026 gap) come back empty and are
 * not filled in.
 */
export async function fetchSnapshots(
  db: SupabaseClient,
  sinceDate: string,
  options?: FetchSnapshotOptions,
): Promise<SnapshotRow[]> {
  assertIsoDate(sinceDate, 'sinceDate');
  const until = options?.until ?? new Date().toISOString().slice(0, 10);
  assertIsoDate(until, 'until');
  if (until < sinceDate) return [];

  const out: SnapshotRow[] = [];
  for (let day = sinceDate, guard = 0; day <= until; day = addDays(day, 1), guard++) {
    if (guard > 4000) throw new Error('open-dataset: snapshot date walk exceeded 4000 days');
    const rows = await fetchBounded<SnapshotRow>(
      db,
      'price_snapshots',
      SNAPSHOT_COLUMNS,
      {
        gte: ['snapshot_date', sinceDate],
        eq: ['snapshot_date', day],
      },
      ['snapshot_date', 'ref'],
    );
    for (const row of rows) {
      if (row.snapshot_date >= sinceDate) out.push(row);
    }
  }
  return out;
}

/**
 * Delisting ledger on or after `sinceDate`.
 *
 * `sold_properties` is one row per reference, not a daily panel (hundreds of
 * rows, indexed on `last_seen_date`). A single filtered read is the whole
 * table we are willing to publish. The epoch bound is still applied before
 * pagination, and a full final page still throws rather than truncating.
 */
export async function fetchSold(db: SupabaseClient, sinceDate: string): Promise<SoldRow[]> {
  assertIsoDate(sinceDate, 'sinceDate');
  const rows = await fetchBounded<SoldRow>(
    db,
    'sold_properties',
    SOLD_COLUMNS,
    { gte: ['last_seen_date', sinceDate] },
    ['last_seen_date', 'ref'],
  );
  return rows.filter((row) => (row.last_seen_date ?? '') >= sinceDate);
}

/** First honest day of the ledger — the day pricing-history was repointed at the live feed. */
export const LEDGER_EPOCH = '2026-08-05';
