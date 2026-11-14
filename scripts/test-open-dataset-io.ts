/**
 * Open-dataset read path.
 *
 * The 2026-11-07 feed refresh failed because fetchSnapshots ordered every
 * price_snapshots row and only then dropped dates before the ledger epoch.
 * These checks pin the query shape: the epoch bound is on the request before
 * range(), each snapshot day is its own read, and a full last page still throws.
 *
 * Run: npx tsx scripts/test-open-dataset-io.ts
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  MAX_PAGES,
  PAGE,
  fetchSnapshots,
  fetchSold,
} from '../src/lib/open-dataset-io';

let failures = 0;
function check(name: string, cond: boolean, detail = '') {
  if (!cond) { failures++; console.error(`  ✗ ${name} ${detail}`); }
  else console.log(`  ✓ ${name}`);
}

interface Call {
  table: string;
  gte: Array<[string, string]>;
  eq: Array<[string, string]>;
  orders: string[];
  range: [number, number] | null;
}

function client(handler: (call: Call) => { data: unknown[] | null; error: { message: string } | null }) {
  const calls: Call[] = [];
  const db = {
    from(table: string) {
      const call: Call = { table, gte: [], eq: [], orders: [], range: null };
      const query = {
        select() { return query; },
        gte(column: string, value: string) { call.gte.push([column, value]); return query; },
        eq(column: string, value: string) { call.eq.push([column, value]); return query; },
        lte() { return query; },
        order(column: string) { call.orders.push(column); return query; },
        async range(from: number, to: number) {
          call.range = [from, to];
          calls.push(call);
          return handler(call);
        },
      };
      return query;
    },
  };
  return { db: db as unknown as SupabaseClient, calls };
}

const row = (date: string, ref = 'N1') => ({
  ref, snapshot_date: date, price: 100_000, pm2: 1000, town: 'Estepona', region: 'costa-del-sol', type: 'Apartment',
});

async function main() {
console.log('snapshot reads');
{
  const { db, calls } = client(() => ({ data: [], error: null }));
  const rows = await fetchSnapshots(db, '2026-08-05', { until: '2026-08-07' });
  check('three calendar days, one query each, when every day is empty', calls.length === 3 && rows.length === 0);
  check('every snapshot query bounds snapshot_date to the epoch before the page',
    calls.every((call) => call.table === 'price_snapshots'
      && call.gte.some(([column, value]) => column === 'snapshot_date' && value === '2026-08-05')
      && call.range?.[0] === 0));
  check('each day is an equality read, and no day is before the epoch',
    calls.map((call) => call.eq.find(([column]) => column === 'snapshot_date')?.[1]).join(',') === '2026-08-05,2026-08-06,2026-08-07');
  check('pages are ordered by snapshot_date then ref',
    calls.every((call) => call.orders.join(',') === 'snapshot_date,ref'));
}

{
  const { db, calls } = client((call) => {
    const start = call.range?.[0] ?? 0;
    if (start === 0) return { data: Array.from({ length: PAGE }, (_, i) => row('2026-08-05', `A${i}`)), error: null };
    if (start === PAGE) {
      return {
        data: [row('2026-08-05', 'TAIL'), row('2026-04-08', 'PRE')],
        error: null,
      };
    }
    return { data: [], error: null };
  });
  const rows = await fetchSnapshots(db, '2026-08-05', { until: '2026-08-05' });
  check('a short second page completes pagination', calls.length === 2 && calls[1].range?.[0] === PAGE);
  check('a pre-epoch row returned by the server is still dropped',
    rows.length === PAGE + 1 && rows.every((r) => r.snapshot_date >= '2026-08-05') && !rows.some((r) => r.ref === 'PRE'));
}

{
  const { db, calls } = client(() => ({ data: Array.from({ length: PAGE }, () => row('2026-08-05')), error: null }));
  let message = '';
  try {
    await fetchSnapshots(db, '2026-08-05', { until: '2026-08-07' });
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  check('a full final page throws instead of truncating',
    message.includes(`exceeded ${MAX_PAGES} pages`) && message.includes('refusing to publish a truncated dataset'));
  check('the truncated read had already applied the epoch bound',
    calls.length === MAX_PAGES
    && calls.every((call) => call.gte.some(([, value]) => value === '2026-08-05'))
    && calls.every((call) => call.eq.some(([, value]) => value === '2026-08-05')));
  check('truncation stops on that day instead of walking the rest of the window',
    calls.every((call) => !call.eq.some(([, value]) => value > '2026-08-05')));
}

{
  const { db, calls } = client(() => ({ data: [], error: null }));
  const rows = await fetchSnapshots(db, '2026-11-08', { until: '2026-11-07' });
  check('an until date before the epoch issues no query', calls.length === 0 && rows.length === 0);
}

console.log('delisting reads');
{
  const { db, calls } = client(() => ({ data: [], error: null }));
  await fetchSold(db, '2026-08-05');
  check('sold_properties bounds last_seen_date before the page',
    calls.length === 1
    && calls[0].table === 'sold_properties'
    && calls[0].gte.some(([column, value]) => column === 'last_seen_date' && value === '2026-08-05')
    && calls[0].orders.join(',') === 'last_seen_date,ref'
    && calls[0].range?.[0] === 0
    && calls[0].eq.length === 0);
}

{
  const { db } = client(() => ({
    data: [
      { ref: 'KEEP', town: 'Estepona', region: 'costa-del-sol', type: 'Apartment', beds: 2, built_m2: 90, last_price: 1, last_pm2: 1, last_seen_date: '2026-09-01' },
      { ref: 'DROP', town: 'Estepona', region: 'costa-del-sol', type: 'Apartment', beds: 2, built_m2: 90, last_price: 1, last_pm2: 1, last_seen_date: '2026-04-08' },
      { ref: 'NULL', town: 'Estepona', region: 'costa-del-sol', type: 'Apartment', beds: 2, built_m2: 90, last_price: 1, last_pm2: 1, last_seen_date: null },
    ],
    error: null,
  }));
  const rows = await fetchSold(db, '2026-08-05');
  check('a pre-epoch or null last_seen_date does not survive the read',
    rows.length === 1 && rows[0].ref === 'KEEP');
}

{
  const { db, calls } = client(() => ({ data: Array.from({ length: PAGE }, () => ({ ref: 'X', last_seen_date: '2026-09-01' })), error: null }));
  let threw = false;
  try { await fetchSold(db, '2026-08-05'); } catch { threw = true; }
  check('sold_properties truncation throws', threw && calls.length === MAX_PAGES);
}

{
  const { db } = client(() => ({ data: null, error: { message: 'canceling statement due to statement timeout' } }));
  let message = '';
  try { await fetchSnapshots(db, '2026-08-05', { until: '2026-08-05' }); } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  check('a statement timeout is still thrown, with the epoch bound named',
    message.includes('price_snapshots read failed')
    && message.includes('snapshot_date >= 2026-08-05')
    && message.includes('statement timeout'));
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
}

main();
