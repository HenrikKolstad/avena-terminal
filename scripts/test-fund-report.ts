/**
 * Aggregates behind the sample fund report and the score track record.
 *
 * The pages must not invent a market. These tests pin the rules that keep a
 * missing input null, a short window from being called a result, and a
 * relisting from being counted as a sale.
 *
 * Run: npx tsx scripts/test-fund-report.ts
 */

import { readFileSync } from 'fs';
import path from 'path';
import {
  MIN_TOWN_N,
  buildAbsorption,
  buildBookOverview,
  buildLedgerTape,
  buildPriceHistory,
  buildSupplyPipeline,
  findMissingRanges,
  median,
  quantile,
  rate,
  reconcileObservedDates,
  selectTrendDates,
  type LiveListing,
  type SnapListing,
} from '../src/lib/fund-report';
import { getAllProperties } from '../src/lib/properties';
import {
  buildTrackRecord,
  claimLevel,
  comparisonSentence,
} from '../src/lib/track-record';
import { fmtEur, fmtPct, fmtSignedPct } from '../src/lib/report-format';

let passed = 0;
let failed = 0;

function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function live(partial: Partial<LiveListing> & Pick<LiveListing, 'town'>): LiveListing {
  return {
    ref: partial.ref ?? null,
    town: partial.town,
    costa: partial.costa ?? 'Costa Blanca South',
    region: partial.region ?? 'cb-south',
    price: partial.price === undefined ? 100_000 : partial.price,
    pm2: partial.pm2 === undefined ? 2_000 : partial.pm2,
    mm2: partial.mm2 === undefined ? 2_200 : partial.mm2,
    score: partial.score === undefined ? 50 : partial.score,
    yieldGross: partial.yieldGross === undefined ? 5 : partial.yieldGross,
    yieldSource: partial.yieldSource === undefined ? 'AirDNA' : partial.yieldSource,
    status: partial.status ?? null,
    completion: partial.completion ?? null,
    project: partial.project ?? null,
  };
}

function snap(ref: string, price: number, region = 'cb-south', town = 'Town'): SnapListing {
  return { ref, date: '2026-08-05', price, pm2: price / 80, town, region };
}

console.log('medians and rates — empty is null, never zero');

check('median of nothing is null', median([]) === null);
check('median of [1,2,3] is 2', median([1, 2, 3]) === 2);
check('median of [1,2,3,4] is 2.5', median([1, 2, 3, 4]) === 2.5);
check('a zero denominator is null', rate(3, 0) === null);
check('formatters do not turn null into zero', fmtEur(null) === '—' && fmtPct(null) === '—' && fmtSignedPct(null) === '—');
check('a real zero change formats as 0.00%', fmtSignedPct(0) === '0.00%');

console.log('book overview — thresholds and missing yields');

{
  const rows = [
    live({ town: 'A', price: 100, yieldGross: null, yieldSource: null, score: 10 }),
    live({ town: 'A', price: 300, yieldGross: 8, yieldSource: 'Estimated', score: 70 }),
    live({ town: 'B', price: 200 }),
    live({ town: 'B', price: 200 }),
    live({ town: 'B', price: 200 }),
    live({ town: 'B', price: 200 }),
    live({ town: 'B', price: 400, pm2: 1000, mm2: 2000 }),
  ];
  const book = buildBookOverview(rows);
  check('towns under the floor are omitted', book.townsReported === 1 && book.townsOmitted === 1, JSON.stringify({ reported: book.townsReported, omitted: book.townsOmitted }));
  check('the reported town is the one at the floor', book.byTown[0]?.label === 'B' && book.byTown[0]?.n === MIN_TOWN_N);
  check('a missing yield is not a zero in the median', book.medianYield === 5, String(book.medianYield));
  check('estimated cards are counted apart from town cards', book.yieldEstimated === 1 && book.yieldTownCard === 5);
  check('asking below the benchmark is a share, not a count dressed as a price', book.shareBelowBenchmark === 1 && book.benchmarkCompared === 7);
  const bucketSum = book.scoreBuckets.reduce((s, b) => s + b.n, 0);
  check('score buckets cover every scored listing', bucketSum === book.scored);
}

console.log('calendar — gaps and the ledger reconciliation');

{
  const gaps = findMissingRanges(['2026-10-21', '2026-10-13']);
  check('an 8-day jump is 7 missing days', gaps.length === 1 && gaps[0].missingDays === 7 && gaps[0].start === '2026-10-14' && gaps[0].end === '2026-10-20', JSON.stringify(gaps));
  check('consecutive days are not a gap', findMissingRanges(['2026-08-05', '2026-08-06']).length === 0);
  const stride = selectTrendDates(['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07', '2026-08-08', '2026-08-09']);
  check('the trend sample keeps the first, the stride, and the last day', stride.join(',') === '2026-08-01,2026-08-08,2026-08-09', stride.join(','));
  const matched = reconcileObservedDates('2026-08-05', '2026-10-21', ['2026-08-05', '2026-09-01', '2026-10-21']);
  check('a ledger whose endpoints match is usable', matched.source === 'ledger' && matched.dates.length === 3);
  const drifted = reconcileObservedDates('2026-08-05', '2026-10-21', ['2026-08-05', '2026-10-13']);
  check('a ledger that stops early is not a calendar', drifted.source === 'unresolved' && drifted.dates.length === 0);
  check('pre-epoch ledger dates are dropped', reconcileObservedDates('2026-08-05', '2026-08-06', ['2026-04-08', '2026-08-05', '2026-08-06']).source === 'ledger');
}

console.log('paired prices and exits');

{
  const first = [snap('A', 100), snap('B', 200, 'costa-del-sol', 'Estepona'), snap('C', 100), snap('D', 100)];
  const last = [snap('A', 100), snap('B', 220, 'costa-del-sol', 'Estepona'), snap('C', 100)];
  const byDate = new Map<string, SnapListing[]>([
    ['2026-08-05', first],
    ['2026-08-12', first],
    ['2026-10-21', last],
  ]);
  const labels = new Map([['cb-south', 'Costa Blanca South'], ['costa-del-sol', 'Costa del Sol']]);
  const history = buildPriceHistory(byDate, ['2026-08-05', '2026-08-12', '2026-10-21'], labels);
  check('history needs both ends', history != null);
  check('a ref that left is not in the paired median', history?.paired === 3, String(history?.paired));
  check('the region label comes from the book, not a hardcoded coast list', history?.byRegion.find((r) => r.key === 'costa-del-sol')?.label === 'Costa del Sol');
  const still = [snap('A', 100), snap('B', 220, 'costa-del-sol', 'Estepona')];
  const absorption = buildAbsorption(first, still, [
    { ref: 'C', town: 'Town', region: 'cb-south', lastPrice: 100, lastSeen: '2026-09-01' },
    { ref: 'B', town: 'Estepona', region: 'costa-del-sol', lastPrice: 200, lastSeen: '2026-09-01' },
  ], '2026-08-05', '2026-10-21', labels);
  check('a relisting is not an exit', absorption?.relisted === 1 && absorption?.recordedExits === 1, JSON.stringify({ relisted: absorption?.relisted, recorded: absorption?.recordedExits, unrecorded: absorption?.unrecordedExits }));
  check('a departure with no delisting row is counted separately', absorption?.unrecordedExits === 1);
  check('the exit rate uses the start book', absorption?.exitRate === 0.5, String(absorption?.exitRate));
  check('one day of snapshots is not a trend', buildPriceHistory(byDate, ['2026-08-05'], labels) === null);
}

console.log('score split — fixed threshold, no stronger claim than illustrative');

{
  const scores = [10, 20, 30, 64, 64, 64, 70].map((score, i) => ({ ref: `S${i}`, score }));
  const sorted = [...scores.map((s) => s.score)].sort((a, b) => a - b);
  const expected = quantile(sorted, 0.75);
  check('p75 of the fixture is 64', expected === 64, String(expected));
  const record = buildTrackRecord({
    cohortDate: '2026-08-05',
    outcomeDate: '2026-08-15',
    scores,
    entryPrices: scores.map((s) => ({ ref: s.ref, price: 100 })),
    exitPrices: scores.map((s) => ({ ref: s.ref, price: s.score < 64 ? 90 : 100 })),
    soldRefs: ['S0'],
    longestMissingDays: 0,
    scoreMayLagOneDay: true,
  });
  check('ties at the threshold stay in the flagged group', record?.flagged.n === 4 && record.rest.n === 3, JSON.stringify({ f: record?.flagged.n, r: record?.rest.n }));
  check('unchanged flagged prices have a zero median, not null', record?.flagged.medianChange === 0);
  check('a 10% cut is material', record?.rest.materialCuts === 3 && record.rest.materialCutRate === 1);
  check('ten days is too thin even with prices attached', record?.claim === 'too_thin');
  check('the scribe seam is mentioned when the cohort predates it', record?.reasons.some((r) => r.includes('2026-08-21')) === true);

  const wide = buildTrackRecord({
    cohortDate: '2026-08-05',
    outcomeDate: '2026-10-21',
    scores: Array.from({ length: 250 }, (_, i) => ({ ref: `F${i}`, score: i < 150 ? 80 : 40 })),
    entryPrices: Array.from({ length: 250 }, (_, i) => ({ ref: `F${i}`, price: 100 })),
    exitPrices: Array.from({ length: 250 }, (_, i) => ({ ref: `F${i}`, price: 100 })),
    soldRefs: [],
    longestMissingDays: 7,
    scoreMayLagOneDay: false,
  });
  check('a 77-day flat book is illustrative, not a validation', wide?.claim === 'illustrative' && wide.flagged.medianChange === 0 && wide.rest.medianChange === 0);
  check('both medians at zero are said out loud', comparisonSentence(wide!)?.includes('at least half') === true);
  check('the gap length is part of the caveat', wide?.reasons.some((r) => r.includes('7 calendar days')) === true);

  const flat = buildTrackRecord({
    cohortDate: '2026-08-05',
    outcomeDate: '2026-10-21',
    scores: [{ ref: 'a', score: 5 }, { ref: 'b', score: 5 }, { ref: 'c', score: 5 }],
    entryPrices: [],
    exitPrices: [],
    soldRefs: [],
    longestMissingDays: 0,
    scoreMayLagOneDay: false,
  });
  check('a split with an empty side publishes no comparison', flat?.claim === 'unavailable');
  check('claimLevel has no path that returns a stronger word', claimLevel({ spanDays: 400, flagged: 500, rest: 500, pairedFlagged: 500, pairedRest: 500 }) === 'illustrative');
  check('a null span is unavailable', claimLevel({ spanDays: null, flagged: 10, rest: 10, pairedFlagged: 10, pairedRest: 10 }) === 'unavailable');
}

console.log('supply pipeline — omit when the book has no stage, keep unknown labels');

{
  check('a book with no status and no quarter is not a pipeline', buildSupplyPipeline([live({ town: 'A' })]) === null);
  const rows = [
    live({ town: 'A', status: 'ready', completion: '2026-Q4', project: 'P1', price: 100, pm2: 1000 }),
    live({ town: 'B', status: 'off-plan', completion: '2027-Q1', project: 'P1', price: 300, pm2: 3000 }),
    live({ town: 'C', status: 'under-construction', completion: 'soon', project: 'P2', price: 0, pm2: null }),
    live({ town: 'D', status: '  ', completion: '2026-Q4', project: 'P3', price: 200, pm2: 2000 }),
    live({ town: 'E', status: 'custom-stage', completion: '2026-Q2', project: 'P3', price: 200, pm2: 2000 }),
  ];
  const pipeline = buildSupplyPipeline(rows);
  check('known statuses stay in delivery order', pipeline?.byStatus.map((r) => r.key).join(',') === 'off-plan,under-construction,ready,custom-stage', pipeline?.byStatus.map((r) => r.key).join(','));
  check('an unknown status keeps the stored label', pipeline?.byStatus.find((r) => r.key === 'custom-stage')?.label === 'custom-stage');
  check('a blank status is unspecified, not a row', pipeline?.statusUnspecified === 1 && !pipeline.byStatus.some((r) => r.key === ''));
  check('a free-text completion is not forced into a quarter', pipeline?.quarterUnspecified === 1 && pipeline.byQuarter.map((r) => r.key).join(',') === '2026-Q2,2026-Q4,2027-Q1');
  check('quarters are chronological', pipeline?.byQuarter[0]?.key === '2026-Q2' && pipeline.byQuarter[pipeline.byQuarter.length - 1]?.key === '2027-Q1');
  check('a project shared by two statuses is counted once in the book and once in each row', pipeline?.projects === 3 && pipeline.byStatus.find((r) => r.key === 'off-plan')?.projects === 1 && pipeline.byQuarter.find((r) => r.key === '2026-Q4')?.projects === 2);
  check('a non-positive price is left out of the pipeline median', pipeline?.byStatus.find((r) => r.key === 'under-construction')?.medianPrice === null);
  const statusSum = (pipeline?.byStatus.reduce((s, r) => s + r.n, 0) ?? 0) + (pipeline?.statusUnspecified ?? 0);
  const quarterSum = (pipeline?.byQuarter.reduce((s, r) => s + r.n, 0) ?? 0) + (pipeline?.quarterUnspecified ?? 0);
  check('status and quarter rows account for every listing', statusSum === rows.length && quarterSum === rows.length);

  const liveBook = getAllProperties().map((p): LiveListing => ({
    ref: p.ref ?? null,
    town: (p.l || '').split(',')[0].trim(),
    costa: (p.costa || '').trim(),
    region: (p.r || '').trim(),
    price: p.pf > 0 ? p.pf : null,
    pm2: p.pm2 != null && p.pm2 > 0 ? p.pm2 : null,
    mm2: p.mm2 > 0 ? p.mm2 : null,
    score: null,
    yieldGross: null,
    yieldSource: null,
    status: (p.s || '').trim() || null,
    completion: (p.c || '').trim() || null,
    project: (p.dev_ref || '').trim() || null,
  }));
  const fromBook = buildSupplyPipeline(liveBook);
  const statusN = (fromBook?.byStatus.reduce((s, r) => s + r.n, 0) ?? 0) + (fromBook?.statusUnspecified ?? -1);
  const quarterN = (fromBook?.byQuarter.reduce((s, r) => s + r.n, 0) ?? 0) + (fromBook?.quarterUnspecified ?? -1);
  check('the current book produces a pipeline that covers every listing', fromBook != null && fromBook.listings === liveBook.length && statusN === liveBook.length && quarterN === liveBook.length);
  check('every published quarter is a real YYYY-Q value', fromBook?.byQuarter.every((r) => /^\d{4}-Q[1-4]$/.test(r.key)) === true);
}

console.log('movement ledger — a bad row rejects the tape');

{
  const ok = (date: string, listings = 10, increases = 1, reductions = 0, delistings = 0, relistings = 0, move: number | null = 1) => ({
    date,
    listings_observed: listings,
    price_increases: increases,
    price_reductions: reductions,
    median_abs_move_pct: move,
    delistings,
    relistings,
  });
  const tape = buildLedgerTape([
    ok('2026-08-05', 10, 0, 0, 0, 0, null),
    ok('2026-08-06', 11, 2, 1, 1, 0, 4.07),
    ok('2026-08-14', 12, 3, 0, 0, 1, 2),
  ]);
  check('three days sum without dropping the quiet day', tape?.increases === 5 && tape.reductions === 1 && tape.delistings === 1 && tape.relistings === 1 && tape.observedDays === 3);
  check('the ledger gap is the days between observations', tape?.missing.length === 1 && tape.missing[0].missingDays === 7 && tape.missing[0].start === '2026-08-07');
  check('a negative count rejects the tape', buildLedgerTape([ok('2026-08-05'), { ...ok('2026-08-06'), price_reductions: -1 }]) === null);
  check('a pre-epoch day rejects the tape', buildLedgerTape([ok('2026-04-08'), ok('2026-08-05')]) === null);
  check('one day is not a tape', buildLedgerTape([ok('2026-08-05')]) === null);
  const published = JSON.parse(readFileSync(path.join(process.cwd(), 'public', 'open-data', 'movement-ledger.json'), 'utf8')) as Array<Record<string, number>>;
  const publishedTape = buildLedgerTape(published);
  const sum = (key: string) => published.reduce((total, row) => total + Number(row[key]), 0);
  check('the published ledger builds a complete tape', publishedTape != null && publishedTape.observedDays === published.length && publishedTape.increases === sum('price_increases') && publishedTape.reductions === sum('price_reductions') && publishedTape.delistings === sum('delistings') && publishedTape.relistings === sum('relistings'));
}

console.log('published copy does not carry a hardcoded market figure');

{
  const files = [
    'src/lib/fund-report.ts',
    'src/lib/track-record.ts',
    'src/lib/institutional-load.ts',
    'src/lib/report-format.ts',
    'src/components/reports/FundReportView.tsx',
    'src/components/reports/TrackRecordView.tsx',
    'src/app/reports/sample/page.tsx',
    'src/app/reports/sample/print/page.tsx',
    'src/app/track-record/page.tsx',
    'src/app/track-record/print/page.tsx',
  ];
  const banned = /479925|670000|15\.82|€\s*\d/;
  for (const file of files) {
    const text = readFileSync(path.join(process.cwd(), file), 'utf8');
    check(`${file} has no baked-in price or error figure`, !banned.test(text));
    check(`${file} does not name an upstream feed vendor`, !/\bred\s?sp\b/i.test(text));
  }
  const view = readFileSync(path.join(process.cwd(), 'src', 'components', 'reports', 'FundReportView.tsx'), 'utf8');
  check('the specimen links the score track record', view.includes('href="/track-record"'));
  check('the specimen links the homebuilder stock test', view.includes('href="/research/builder-stock-signal"'));
  check('access is pricing on request', view.includes('Pricing on request') && view.includes('href="/access"') && !/€\s*\d|per month|€79|€49/i.test(view));
  const config = readFileSync(path.join(process.cwd(), 'next.config.ts'), 'utf8');
  check('/sample-report aliases the existing specimen', config.includes("source: '/sample-report'") && config.includes("destination: '/reports/sample'"));
}

console.log(`\n${failed === 0 ? 'ALL PASS' : 'FAILURES'} — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
