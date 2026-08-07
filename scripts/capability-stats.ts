/**
 * Gathers the numbers behind the Avena data-capability report.
 *
 * Two halves, and the distinction matters more than any single figure:
 *   BREADTH — what we capture about each property, measured from the live book.
 *   DEPTH   — how many days of genuine observation we hold, measured from
 *             Supabase by counting DISTINCT PRICES per ref, not row counts.
 *
 * Row counts lie. On 2026-08-07 property_pricing_history held 394,000 rows
 * across 1,720 refs and exactly ZERO price changes — the same listed price
 * re-inserted ~229 times per property. score_history held 197,813 rows over
 * 102 days with zero price movement. Both looked like history and contained
 * one day of information. Any report built on row counts would have been a
 * lie told confidently, which is the one failure this project cannot afford.
 *
 * So: this script reports observation days as the number of distinct dates on
 * which a ref's price was actually re-read from the live feed, and it fails
 * loudly rather than emitting zeros.
 *
 * Run: npx tsx scripts/capability-stats.ts
 * Out: data/capability-stats.json  (input to scripts/render-capability-pdf.py)
 */
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { getAllProperties } from '../src/lib/properties';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Supabase credentials missing. Refusing to emit a report with zero depth —');
  console.error('an empty number here reads as "we have no data" and would be false.');
  process.exit(1);
}
const db = createClient(url, key);

async function main() {
  // ─── BREADTH ────────────────────────────────────────────────────────────
  const props = getAllProperties();
  const n = props.length;
  const filled = (pick: (p: (typeof props)[number]) => unknown) =>
    props.filter((p) => {
      const v = pick(p);
      return v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0);
    }).length;

  const breadth = {
    properties: n,
    towns: new Set(props.map((p) => (p.l || '').split(',')[0].trim())).size,
    projects: new Set(props.map((p) => p.p)).size,
    regions: new Set(props.map((p) => p.r)).size,
    coverage: {
      price: filled((p) => p.pf) / n,
      price_per_m2: filled((p) => p.pm2) / n,
      market_per_m2: filled((p) => p.mm2) / n,
      built_area: filled((p) => p.bm) / n,
      terrace_solarium: filled((p) => p.terrace) / n,
      beds_baths: filled((p) => p.bd) / n,
      beach_distance: filled((p) => p.bk) / n,
      gps: filled((p) => p.lat) / n,
      energy_rating: filled((p) => p.energy) / n,
      pool: filled((p) => p.pool) / n,
      parking: filled((p) => p.parking) / n,
      completion_status: filled((p) => p.c) / n,
      developer_track_record: filled((p) => p.dy) / n,
      images: filled((p) => p.imgs) / n,
      plot_size: filled((p) => p.pl) / n,
      views: filled((p) => p.views) / n,
    },
  };

  // ─── DEPTH ──────────────────────────────────────────────────────────────
  // Distinct snapshot dates on which the price was genuinely re-read.
  const { data: snaps, error: snapErr } = await db
    .from('price_snapshots')
    .select('ref, snapshot_date, price');
  if (snapErr) throw new Error(`price_snapshots read failed: ${snapErr.message}`);
  if (!snaps || snaps.length === 0) throw new Error('price_snapshots returned no rows — refusing to report zero depth as fact');

  const days = new Set(snaps.map((r) => r.snapshot_date));
  const byRef = new Map<string, Set<number>>();
  for (const r of snaps) {
    if (!byRef.has(r.ref)) byRef.set(r.ref, new Set());
    byRef.get(r.ref)!.add(Number(r.price));
  }
  const refsWithMove = [...byRef.values()].filter((s) => s.size > 1).length;

  const { count: soldCount, error: soldErr } = await db
    .from('sold_properties')
    .select('ref', { count: 'exact', head: true });
  if (soldErr) throw new Error(`sold_properties read failed: ${soldErr.message}`);

  const { count: dvfCount, error: dvfErr } = await db
    .from('property_transactions')
    .select('id', { count: 'exact', head: true });
  if (dvfErr) throw new Error(`property_transactions read failed: ${dvfErr.message}`);

  const sorted = [...days].sort();
  const depth = {
    observation_days: days.size,
    first_observation: sorted[0],
    latest_observation: sorted[sorted.length - 1],
    refs_observed: byRef.size,
    refs_with_recorded_price_move: refsWithMove,
    delistings_recorded: soldCount ?? 0,
    external_confirmed_transactions: dvfCount ?? 0,
    external_source: 'French DVF open data (2023–2024) — external comparator, not Spanish',
  };

  const out = {
    generated_at: new Date().toISOString(),
    breadth,
    depth,
    honesty_note:
      'Observation days counts distinct dates on which prices were re-read from the live feed. ' +
      'It deliberately ignores row counts: tables can hold hundreds of thousands of rows that ' +
      'repeat a single day of information.',
  };

  const dir = path.join(process.cwd(), 'data');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'capability-stats.json');
  fs.writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(`Breadth: ${n} properties, ${breadth.towns} towns, ${breadth.projects} projects`);
  console.log(`Depth:   ${depth.observation_days} observation days (${depth.first_observation} → ${depth.latest_observation}), ${depth.refs_with_recorded_price_move} refs with a recorded move`);
  console.log(`Wrote ${file}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
