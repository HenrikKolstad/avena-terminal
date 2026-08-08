/**
 * Fetch side of the open dataset — paginated reads shared by the cron route
 * (supabaseAdmin) and the CI script (its own env-built client).
 *
 * Paginated for the same reason pricing-history paginates: PostgREST caps a
 * response at its max-rows setting, and a silently truncated snapshot set
 * would publish an artifact claiming fewer observations than we hold.
 * Throws on error — a failed read must never become an empty dataset.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SnapshotRow, SoldRow } from '@/lib/open-dataset';

const PAGE = 1000;
const MAX_PAGES = 200;

async function fetchAll<T>(
  db: SupabaseClient,
  table: string,
  columns: string,
  orderCol: string,
): Promise<T[]> {
  const out: T[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await db
      .from(table)
      .select(columns)
      .order(orderCol, { ascending: true })
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) throw new Error(`open-dataset: ${table} read failed: ${error.message}`);
    if (!data?.length) break;
    out.push(...(data as T[]));
    if (data.length < PAGE) break;
  }
  return out;
}

export async function fetchSnapshots(db: SupabaseClient, sinceDate: string): Promise<SnapshotRow[]> {
  const rows = await fetchAll<SnapshotRow>(
    db,
    'price_snapshots',
    'ref, snapshot_date, price, pm2, town, region, type',
    'snapshot_date',
  );
  // The genuine observation ledger begins 2026-08-05; anything earlier is the
  // frozen-registry era (see CLAUDE.md audit notes) and must not be published.
  return rows.filter((r) => r.snapshot_date >= sinceDate);
}

export async function fetchSold(db: SupabaseClient, sinceDate: string): Promise<SoldRow[]> {
  const rows = await fetchAll<SoldRow>(
    db,
    'sold_properties',
    'ref, town, region, type, beds, built_m2, last_price, last_pm2, last_seen_date',
    'ref',
  );
  return rows.filter((r) => (r.last_seen_date ?? '') >= sinceDate);
}

/** First honest day of the ledger — the day pricing-history was repointed at the live feed. */
export const LEDGER_EPOCH = '2026-08-05';
