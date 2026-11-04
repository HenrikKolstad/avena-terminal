/**
 * Same-unit asking-price index.
 *
 * The matching rule is Market Pulse's unit-identity check. A spec change is
 * not a price move. A jump of 25% or more without a verified same-unit match
 * is held back. The chain is the unweighted geometric mean of the relatives
 * that remain. Gap weeks stay empty.
 *
 * Run: npx tsx scripts/test-price-index.ts
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { KNOWN_GAPS, inKnownGap, type PlannedWeek } from '../src/lib/vintages';
import {
  MIN_MATCHED_PAIRS,
  PRICE_INDEX_BASE,
  buildPriceIndex,
  classifyPair,
  geometricMean,
  readPriceIndex,
  roundHalfAway,
  type IndexListing,
  type PriceIndexFile,
  type PriceIndexRow,
} from '../src/lib/price-index';

let pass = 0;
let fail = 0;
const ok = (cond: boolean, label: string) => {
  if (cond) { pass++; console.log(`  ok  ${label}`); }
  else { fail++; console.error(`  FAIL ${label}`); }
};

function plan(partial: Partial<PlannedWeek> & Pick<PlannedWeek, 'iso_week' | 'week_start' | 'week_end' | 'status'>): PlannedWeek {
  return {
    vintage_date: null,
    capture_commit: null,
    capture_dates_in_week: [],
    gap_dates_in_week: [],
    overlaps_declared_capture_gap: false,
    compared_to: null,
    missing_days_since_compared_to: null,
    reason: null,
    ...partial,
  };
}

function listing(ref: string, price: number, extra: Partial<IndexListing> = {}): IndexListing {
  return {
    ref,
    town: 'Dénia',
    provinceKey: 'alicante',
    provinceName: 'Alicante',
    priceEur: price,
    ranged: false,
    type: 'Apartment',
    builtM2: 80,
    plotM2: null,
    beds: 2,
    baths: 2,
    pm2: price > 0 ? price / 80 : null,
    mm2: 2000,
    imgSig: 'aaaa',
    ...extra,
  };
}

const mins = { coast: 1, province: 1, town: 1 };

function run(books: Record<string, IndexListing[]>, plans: PlannedWeek[]) {
  return buildPriceIndex({ plans, books: new Map(Object.entries(books)), mins });
}

function coast(file: PriceIndexFile): PriceIndexRow[] {
  return file.rows.filter((row) => row.level === 'coast');
}

const w1 = plan({
  iso_week: '2026-W32', week_start: '2026-08-03', week_end: '2026-08-09', status: 'frozen', vintage_date: '2026-08-09',
});
const w2 = plan({
  iso_week: '2026-W33', week_start: '2026-08-10', week_end: '2026-08-16', status: 'frozen', vintage_date: '2026-08-16',
  compared_to: '2026-08-09', missing_days_since_compared_to: [],
});
const w3 = plan({
  iso_week: '2026-W34', week_start: '2026-08-17', week_end: '2026-08-23', status: 'frozen', vintage_date: '2026-08-23',
  compared_to: '2026-08-16', missing_days_since_compared_to: [],
});

const baseBook = [listing('A', 100000), listing('B', 200000)];

// Chaining: equal weight, geometric mean, base 100, then another link.
{
  const file = run({
    '2026-08-09': baseBook,
    '2026-08-16': [listing('A', 110000), listing('B', 200000)],
    '2026-08-23': [listing('A', 110000), listing('B', 220000)],
  }, [w1, w2, w3]);
  const rows = coast(file);
  ok(rows[0].status === 'base' && rows[0].index === PRICE_INDEX_BASE && rows[0].change_pct == null, 'first capture is base 100 with no change');
  const g2 = geometricMean([110000 / 100000, 200000 / 200000]);
  ok(Math.abs(g2 - Math.sqrt(1.1)) < 1e-12, 'second week is the geometric mean, not the arithmetic mean');
  ok(rows[1].status === 'observed' && rows[1].index === roundHalfAway(100 * g2, 2), 'second week chains onto 100');
  ok(rows[1].change_pct === roundHalfAway((g2 - 1) * 100, 2), 'published change is that week\'s geometric mean');
  ok(rows[1].cuts === 0 && rows[1].rises === 1 && rows[1].unchanged === 1 && rows[1].matched_pairs === 2, 'breadth counts the cut, the rise and the unchanged pair');
  const g3 = geometricMean([110000 / 110000, 220000 / 200000]);
  const chained = 100 * g2 * g3;
  ok(rows[2].index === roundHalfAway(chained, 2), 'third week multiplies the unrounded chain');
  ok(rows[2].matched_pairs === 2 && rows[2].rises === 1 && rows[2].unchanged === 1, 'third week breadth');
}

// Spec change is excluded, including when the asking price did not move.
{
  const file = run({
    '2026-08-09': baseBook,
    '2026-08-16': [listing('A', 110000), listing('B', 200000, { beds: 4, builtM2: 140 })],
  }, [w1, w2]);
  const row = coast(file)[1];
  ok(row.matched_pairs === 1 && row.excluded_spec_change === 1 && row.rises === 1, 'bedroom and size change is excluded from the matched pairs');
  ok(row.index === roundHalfAway(110, 2) && row.change_pct === 10, 'index uses only the unit whose spec held');
  const unchangedSpec = run({
    '2026-08-09': [listing('A', 100000), listing('B', 200000)],
    '2026-08-16': [listing('A', 100000, { type: 'Villa' }), listing('B', 200000)],
  }, [w1, w2]);
  const held = coast(unchangedSpec)[1];
  ok(held.excluded_spec_change === 1 && held.unchanged === 1 && held.matched_pairs === 1 && held.change_pct === 0, 'a type change at the same price is not an unchanged pair');
}

// Big jump without a same-unit match is held back. The same jump with a full match counts.
{
  const heldBack = run({
    '2026-08-09': [listing('A', 100000), listing('B', 200000)],
    '2026-08-16': [
      listing('A', 110000),
      listing('B', 260000, { type: null, beds: null, baths: null, builtM2: null, pm2: null, imgSig: null }),
    ],
  }, [w1, w2]);
  const held = coast(heldBack)[1];
  ok(held.held_back_large_move === 1 && held.matched_pairs === 1 && held.change_pct === 10, '30% jump without specs is held back and does not move the index');
  ok(classifyPair(
    { price: 200000 },
    { price: 260000 },
  ) === 'held_back', 'classifyPair holds a large jump with no specs');

  const accepted = run({
    '2026-08-09': [listing('A', 100000), listing('B', 200000)],
    '2026-08-16': [listing('A', 100000), listing('B', 260000)],
  }, [w1, w2]);
  const row = coast(accepted)[1];
  const g = geometricMean([1, 260000 / 200000]);
  ok(row.held_back_large_move === 0 && row.matched_pairs === 2 && row.index === roundHalfAway(100 * g, 2), '30% jump with the same type, beds, baths, size and photos counts');
}

// A 25% jump that returns to an earlier weekly asking price is held back.
{
  const file = run({
    '2026-08-09': [listing('A', 100000)],
    '2026-08-16': [listing('A', 140000)],
    '2026-08-23': [listing('A', 100000)],
  }, [w1, w2, w3]);
  const rows = coast(file);
  ok(rows[1].matched_pairs === 1 && rows[1].held_back_large_move === 0, 'first large jump, specs matching, is counted');
  ok(rows[2].held_back_large_move === 1 && rows[2].matched_pairs === 0 && rows[2].status === 'suppressed' && rows[2].index == null, 'return to an earlier asking price is held back, and the index is not filled with zero');
}

// Gap week: no invented value, and the next step is one change across the gap.
{
  const gap = plan({
    iso_week: '2026-W42', week_start: '2026-10-12', week_end: '2026-10-18', status: 'gap',
    gap_dates_in_week: ['2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18'],
    overlaps_declared_capture_gap: true,
    reason: 'gap',
  });
  const after = plan({
    iso_week: '2026-W43', week_start: '2026-10-19', week_end: '2026-10-25', status: 'frozen', vintage_date: '2026-10-25',
    compared_to: '2026-08-16',
    missing_days_since_compared_to: ['2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20'],
    gap_dates_in_week: ['2026-10-19', '2026-10-20'],
    overlaps_declared_capture_gap: true,
  });
  const file = run({
    '2026-08-09': [listing('A', 100000)],
    '2026-08-16': [listing('A', 110000)],
    '2026-10-25': [listing('A', 121000)],
  }, [w1, w2, gap, after]);
  const rows = coast(file);
  const gapRow = rows.find((row) => row.status === 'gap');
  const step = rows.find((row) => row.iso_week === '2026-W43');
  ok(!!gapRow && gapRow.index == null && gapRow.change_pct == null && gapRow.matched_pairs == null, 'gap week has no index, no change and no invented pairs');
  ok(gapRow?.spans_declared_capture_gap === true && gapRow.gap_dates.includes('2026-10-14'), 'gap week names the declared outage');
  ok(step?.status === 'observed' && step.compared_to === '2026-08-16' && step.change_pct === 10, 'the next capture is one 10% step against the last real capture, not a filled-in week');
  ok(step?.spans_declared_capture_gap === true && step.gap_dates.includes('2026-10-14') && step.gap_dates.includes('2026-10-20'), 'the step is marked as covering the outage');
  ok(!rows.some((row) => row.capture_date != null && inKnownGap(row.capture_date)), 'no capture inside the declared gap becomes an index point');
  ok(rows.filter((row) => row.status === 'observed').length === 2, 'the outage does not add an extra observed week');
}

// Minimum: counts stay, index and shares go blank.
{
  const file = buildPriceIndex({
    plans: [w1, w2],
    books: new Map([
      ['2026-08-09', [listing('A', 100000), listing('C', 150000), listing('B', 200000, { town: 'Altea' })]],
      ['2026-08-16', [listing('A', 90000), listing('B', 200000, { town: 'Altea' })]],
    ]),
    mins: { coast: 1, province: 1, town: 2 },
  });
  const town = file.rows.find((row) => row.level === 'town' && row.key === 'Dénia' && row.status !== 'base');
  ok(town?.status === 'suppressed' && town.index == null && town.change_pct == null && town.cut_share == null, 'a town under the minimum has no index and no share');
  ok(town?.matched_pairs === 1 && town.cuts === 1 && town.suppressed === true, 'the town still publishes the matched-pair count');
  const coastRow = coast(file)[1];
  ok(coastRow.status === 'observed' && coastRow.index != null && coastRow.cut_share != null, 'the coast, which clears its own minimum, is published');
}

ok(roundHalfAway(1.005, 2) === 1.01 && roundHalfAway(-1.225, 2) === -1.23 && roundHalfAway(110, 2) === 110, 'half-away rounding');

// The built file. Real captures only: structural checks, no expected level.
{
  const file = readPriceIndex();
  const rows = coast(file);
  const base = rows[0];
  ok(file.schema_version === 1 && file.base === 100 && file.series_start === '2026-08-05', 'published file is the versioned series from the capture epoch');
  ok(base?.status === 'base' && base.index === 100 && base.capture_date === '2026-08-09', 'published base is the first closed capture, 9 August 2026');
  ok(file.known_gaps.some((gap) => gap.from === '2026-10-14' && gap.to === '2026-10-20'), 'published file records the 14–20 October 2026 outage');
  ok(!rows.some((row) => row.capture_date != null && row.capture_date >= '2026-10-14' && row.capture_date <= '2026-10-20'), 'published series has no capture dated inside the outage');
  const spanning = rows.filter((row) => row.spans_declared_capture_gap && row.status === 'observed');
  ok(spanning.length === 1 && spanning[0].compared_to === '2026-10-13' && spanning[0].capture_date === '2026-10-25', 'the outage is one marked step from 13 October to 25 October, not a run of filled weeks');
  ok(rows.every((row) => row.status !== 'gap' || (row.index == null && row.change_pct == null && row.matched_pairs == null)), 'every gap row is empty');
  ok(rows.every((row) => {
    if (row.matched_pairs == null) return row.cuts == null && row.rises == null && row.unchanged == null;
    return row.cuts != null && row.rises != null && row.unchanged != null && row.cuts + row.rises + row.unchanged === row.matched_pairs;
  }), 'cuts, rises and unchanged add up to the matched pairs');
  const observed = rows.filter((row) => row.status === 'observed');
  ok(observed.length >= 8 && observed.every((row) => (row.matched_pairs ?? 0) >= MIN_MATCHED_PAIRS.coast && row.index != null && row.index > 50 && row.index < 150), 'coast observations clear the minimum and stay in a sane band');
  ok(file.latest != null && file.latest.capture_date === file.data_as_of && file.latest.index != null && (file.latest.matched_pairs ?? 0) >= MIN_MATCHED_PAIRS.coast, 'latest coast reading has an index and a matched-pair count');
  const thin = file.rows.filter((row) => row.suppressed);
  ok(thin.every((row) => row.index == null && row.change_pct == null && row.cut_share == null && (row.compared_to == null || row.matched_pairs != null)), 'suppressed cells blank the index and keep a pair count when a comparison exists');
  ok(/geometric mean/.test(file.method) && /same unit/.test(file.method) && /interpolat/i.test(file.caveats.join(' ')), 'method states the chain, the same-unit rule and the refusal to interpolate');
  ok(JSON.stringify(file.known_gaps.map((gap) => [gap.from, gap.to])) === JSON.stringify(KNOWN_GAPS.map((gap) => [gap.from, gap.to])), 'file gaps match the shared capture calendar');
}

{
  const page = readFileSync(join(process.cwd(), 'src/app/data/price-index/page.tsx'), 'utf8');
  const route = readFileSync(join(process.cwd(), 'src/app/api/v1/price-index/route.ts'), 'utf8');
  const workflow = readFileSync(join(process.cwd(), '.github/workflows/vintages-freeze.yml'), 'utf8');
  ok(page.includes('href="/api/v1/price-index"') && page.includes('format=csv') && page.includes('/data/vintages'), 'page links the JSON, the CSV and the vintages');
  ok(route.includes('priceIndexToCsv') && route.includes('text/csv'), 'API serves the CSV');
  ok(workflow.includes('scripts/build-price-index.ts') && workflow.includes('data/price-index.json'), 'Monday vintage workflow rebuilds the index');
  const surface = page + route;
  ok(!/RICS/i.test(surface), 'no RICS claim on the price-index surfaces');
  ok(!/€\s?\d/.test(page) && !/pricing/i.test(page), 'the page states no price and no plan');
}

console.log(fail ? `FAILED — ${pass} passed, ${fail} failed` : `ALL PASS — ${pass} passed, 0 failed`);
if (fail) process.exit(1);
