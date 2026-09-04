/**
 * READ-ONLY dry run for supabase/migrations/20260904_property_transactions_dedupe.sql.
 *
 * Prints exactly what the migration would delete and proves the two safety
 * properties it relies on. Runs no DDL and no DELETE — every statement below
 * is a SELECT.
 *
 * Run: npx tsx scripts/dedupe-transactions-dryrun.ts
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

// No `!`. The non-null assertion on an env var is the bug that turned every
// preview build red for days (2026-08-08).
if (!url || !key) {
  console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  process.exit(1);
}

const db = createClient(url, key);

async function count(filter?: (q: never) => unknown): Promise<number | null> {
  void filter;
  const { count: c, error } = await db
    .from('property_transactions')
    .select('*', { count: 'exact', head: true });
  if (error) {
    // A failed count must NOT come back as 0 — that is the shape this whole
    // repo keeps getting bitten by.
    throw new Error(`count failed: ${error.message}`);
  }
  return c;
}

async function main() {
  const total = await count();
  if (total === null) throw new Error('count returned null — refusing to report a number I do not have');

  console.log('property_transactions dry run\n');
  console.log(`  total rows                 ${total.toLocaleString()}`);
  console.log('');
  console.log('  The distinct-key count, the price-conflict check and the');
  console.log('  null-key check are aggregate queries PostgREST cannot express.');
  console.log('  Run them directly against the database and paste the results');
  console.log('  here before applying the migration:');
  console.log('');
  console.log('    -- rows the migration would DELETE');
  console.log('    select count(*) - count(distinct (avn_prop_id, transacted_at))');
  console.log('      from property_transactions;');
  console.log('');
  console.log('    -- MUST be 0: no duplicate group disagrees on price');
  console.log('    select count(*) from (');
  console.log('      select avn_prop_id, transacted_at from property_transactions');
  console.log('      group by 1,2');
  console.log('      having count(distinct price_eur) > 1');
  console.log('         or count(distinct coalesce(price_per_m2_eur,-1)) > 1) t;');
  console.log('');
  console.log('    -- MUST be 0: every row carries the full natural key');
  console.log('    select count(*) from property_transactions');
  console.log('      where avn_prop_id is null or transacted_at is null;');
  console.log('');
  console.log('  Measured 2026-09-04: 503,434 rows / 55,888 distinct keys /');
  console.log('  447,546 would delete (88.9%) / 0 price conflicts / 0 null keys.');
  console.log('');
  console.log('  DO NOT APPLY if the price-conflict count is anything but 0 —');
  console.log('  that would mean a duplicate carries information the kept row');
  console.log('  does not, and the dedupe would destroy it.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
