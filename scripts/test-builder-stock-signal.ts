/**
 * Tests for the homebuilder-stock calculation.
 *
 * The arithmetic is hermetic. The last block recomputes the committed
 * result from the stored pairs, so a hand-edited number fails here.
 * It does not download prices.
 *
 * Run: npx tsx scripts/test-builder-stock-signal.ts
 */
import { readFileSync } from 'fs';
import path from 'path';
import { INGESTION_SWARM } from '../src/lib/ingestion-swarm';
import {
  MIN_N,
  TRAIN_FRACTION,
  addDays,
  annotateLedger,
  bootstrapPearsonCi,
  buildHeadline,
  chronologicalSplit,
  correlationBlock,
  correlationPValue,
  criticalAbsR,
  dailyFeatures,
  daysBetween,
  eventContrast,
  logGamma,
  mulberry32,
  pearson,
  quantile,
  regularizedIncompleteBeta,
  renderReport,
  runSignal,
  scanIssuerMentions,
  sessionLogReturns,
  studentTTwoSidedP,
  verdictOf,
  weekMonday,
  weeklyFeatures,
  type ClosePoint,
  type LedgerDay,
  type ResultRow,
  type SignalReport,
} from '../src/lib/builder-stock-signal';

let passed = 0;
const failures: string[] = [];

function ok(name: string, cond: boolean, detail?: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function near(name: string, actual: number | null, expected: number, tol: number) {
  const cond = actual !== null && Math.abs(actual - expected) <= tol;
  ok(name, cond, cond ? undefined : `got ${actual}, expected ${expected} ± ${tol}`);
}

console.log('A. distributions');
near('logGamma(6) = ln(120)', logGamma(6), Math.log(120), 1e-9);
near('logGamma(1/2) = ln(sqrt(pi))', logGamma(0.5), 0.5 * Math.log(Math.PI), 1e-9);
near('I_0.5(2, 2) = 0.5', regularizedIncompleteBeta(0.5, 2, 2), 0.5, 1e-9);
near('I_0(2, 2) = 0', regularizedIncompleteBeta(0, 2, 2), 0, 0);
near('I_1(2, 2) = 1', regularizedIncompleteBeta(1, 2, 2), 1, 0);
// Two-sided 5% critical value, df = 10, from a standard t table.
near('t = 2.228, df = 10, two-sided p ≈ 0.05', studentTTwoSidedP(2.228138851986, 10), 0.05, 0.001);
ok('t = 0 has p = 1', studentTTwoSidedP(0, 10) === 1);
ok('a non-finite t is not a p-value', studentTTwoSidedP(Number.NaN, 10) === null);

console.log('B. correlation');
near('perfect positive', pearson([1, 2, 3, 4], [2, 4, 6, 8]), 1, 1e-12);
near('perfect negative', pearson([1, 2, 3, 4], [8, 6, 4, 2]), -1, 1e-12);
ok('constant series is undefined, not zero', pearson([1, 2, 3, 4], [5, 5, 5, 5]) === null);
ok('n < 3 is undefined', pearson([1, 2], [3, 4]) === null);
ok('r = 0 has p = 1', correlationPValue(0, 30) === 1);
ok('|r| = 1 has p = 0', correlationPValue(1, 30) === 0 && correlationPValue(-1, 30) === 0);
ok('p is symmetric in r', correlationPValue(0.4, 20) === correlationPValue(-0.4, 20));
const rCrit = criticalAbsR(40);
ok('a sample of 40 can reject a moderate correlation and not a tiny one', rCrit !== null && rCrit > 0.25 && rCrit < 0.45, `got ${rCrit}`);
ok('n below the minimum has no detectable-r figure', criticalAbsR(MIN_N - 1) === null);

const xs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const ys = [1, 3, 2, 5, 4, 6, 8, 7, 10, 9];
const ciA = bootstrapPearsonCi(xs, ys, 400, 20260805);
const ciB = bootstrapPearsonCi(xs, ys, 400, 20260805);
ok('bootstrap interval is deterministic for a seed', ciA !== null && ciB !== null && ciA.lo === ciB.lo && ciA.hi === ciB.hi);
ok('bootstrap interval contains the point correlation', ciA !== null && pearson(xs, ys)! >= ciA.lo && pearson(xs, ys)! <= ciA.hi);
ok('n below the minimum has no interval', bootstrapPearsonCi(xs.slice(0, 5), ys.slice(0, 5), 400, 1) === null);
const block = correlationBlock(xs, ys, 7, 400);
ok('a powered block reports r, p and an interval', block.r !== null && block.p !== null && block.ciLow !== null && !block.underpowered);
const tiny = correlationBlock([1, 2, 3], [1, 2, 4], 7, 400);
ok('n = 3 is stored as a correlation and not given a p-value', tiny.r !== null && tiny.p === null && tiny.underpowered);

console.log('C. dates, gaps, panels');
ok('Wednesday 5 Aug 2026 belongs to Monday 3 Aug', weekMonday('2026-08-05') === '2026-08-03');
ok('Sunday 9 Aug belongs to the same week', weekMonday('2026-08-09') === '2026-08-03');
ok('Monday 10 Aug starts the next week', weekMonday('2026-08-10') === '2026-08-10');
ok('days between the known hole', daysBetween('2026-10-13', '2026-10-21') === 8);

const ledger: LedgerDay[] = [];
for (let i = 0; i < 14; i++) {
  const date = addDays('2026-08-03', i);
  ledger.push({
    date,
    listings_observed: 1000 + i,
    price_increases: i,
    price_reductions: i % 3,
    median_abs_move_pct: 1,
    delistings: i % 4,
    relistings: 0,
  });
}
// Punch a hole: drop 2026-08-10 through 2026-08-12 by rebuilding without them,
// and add 2026-08-13 as the next row so it is a catch-up.
const holed = ledger.filter((d) => d.date < '2026-08-10' || d.date > '2026-08-12');
const annotated = annotateLedger(holed);
const catchup = annotated.find((d) => d.date === '2026-08-13');
ok('the day after a hole is a catch-up', catchup?.catchup === true);
ok('a normal next day is not a catch-up', annotated.find((d) => d.date === '2026-08-04')?.catchup === false);
const weeks = weeklyFeatures(annotated, new Map());
const badWeek = weeks.find((w) => w.week === '2026-08-10');
ok('the week that contains the catch-up is not used', badWeek?.contaminated === true && badWeek.exitRate === null);
const goodWeek = weeks.find((w) => w.week === '2026-08-03');
ok('the week before the hole is used', goodWeek?.contaminated === false && goodWeek.exitRate !== null);

const sessions = ['2026-08-13', '2026-08-14'];
const feats = dailyFeatures(annotated, sessions, new Map([['2026-08-14', 3]]));
ok('a session whose span contains the catch-up is skipped', feats[0].skipped !== null && feats[0].exitRate === null);
ok('the next clean session keeps the rate and the new refs', feats[1].skipped === null && feats[1].exitRate !== null && feats[1].newRefs === 3);

const closes: ClosePoint[] = [
  { date: '2026-08-03', close: 100 },
  { date: '2026-08-04', close: 110 },
  { date: '2026-08-20', close: 90 },
];
const rets = sessionLogReturns(closes);
ok('a halt longer than a long weekend is not one return', rets.length === 1 && rets[0].date === '2026-08-04');
near('that return is a log return', rets[0].ret, Math.log(1.1), 1e-12);

const split = chronologicalSplit([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], TRAIN_FRACTION);
ok('a 60/40 split of 10 rows is 6 and 4', split.train.length === 6 && split.test.length === 4 && split.train[0] === 1 && split.test[0] === 7);
ok('quantile interpolates', quantile([1, 2, 3, 4], 0.75) === 3.25);

console.log('D. event contrast uses the fit window only');
const trainPairs = Array.from({ length: 12 }, (_, i) => ({ key: `t${i}`, x: i, y: i < 9 ? 0.01 : 0.02 }));
const testPairs = Array.from({ length: 12 }, (_, i) => ({ key: `h${i}`, x: i < 6 ? 0 : 100, y: i < 6 ? -0.01 : 0.03 }));
const ev = eventContrast(trainPairs, testPairs, 11, 300);
ok('threshold comes back finite', ev.threshold !== null && ev.threshold < 20, `threshold ${ev.threshold}`);
ok('a later huge x does not move the threshold into the test range', ev.threshold !== null && ev.threshold < 50);
ok('held-out groups are counted', ev.testEvents === 6 && ev.testOthers === 6);

const rng = mulberry32(1);
const a1 = rng();
const rng2 = mulberry32(1);
ok('the seeded generator repeats', a1 === rng2());

console.log('E. issuer scan');
const scan = scanIssuerMentions([
  { ref: 'A', text: 'Cédula de habitabilidad for this flat' },
  { ref: 'B', text: 'Promoted by Habitat Inmobiliaria' },
  { ref: 'C', text: 'Neinor Homes phase 2' },
]);
ok('habitabilidad is not Habitat', scan.counts.habitat === 1);
ok('Neinor is counted', scan.counts.neinor === 1);
ok('an example is kept', scan.examples.some((e) => e.ref === 'B' && e.id === 'habitat'));

console.log('F. a synthetic run does not invent a zero correlation');
function walk(start: string, n: number, seed: number): ClosePoint[] {
  const r = mulberry32(seed);
  const out: ClosePoint[] = [];
  let px = 100;
  for (let i = 0; i < n; i++) {
    const date = addDays(start, i);
    const dow = new Date(date + 'T00:00:00Z').getUTCDay();
    if (dow === 0 || dow === 6) continue;
    px *= Math.exp((r() - 0.48) * 0.01);
    out.push({ date, close: px, volume: 1000 });
  }
  return out;
}
const synthLedger: LedgerDay[] = [];
for (let i = 0; i < 40; i++) {
  const date = addDays('2026-08-05', i);
  synthLedger.push({
    date,
    listings_observed: 2000,
    price_increases: i % 5,
    price_reductions: (i * 2) % 5,
    median_abs_move_pct: null,
    delistings: i % 7 === 0 ? 4 : 0,
    relistings: 0,
  });
}
const synth = runSignal({
  ledger: synthLedger,
  arrivalsByDate: { '2026-08-06': 2 },
  stocks: [
    { id: 'H', name: 'Home', isin: 'X', ticker: 'HOME', role: 'primary', note: '', capitalisationEur: null, closes: walk('2026-01-01', 280, 3) },
    { id: 'M', name: 'Metro', isin: 'Y', ticker: 'MVC', role: 'primary', note: '', capitalisationEur: null, closes: walk('2026-01-01', 280, 9) },
  ],
  market: { name: 'IBEX 35', isin: 'ES0SI0000005', closes: walk('2026-01-01', 280, 5) },
  coverage: {
    listingsScanned: 2,
    agencyLabels: ['Example'],
    issuerMentions: scan,
    projectIdNote: 'project ids, not developer names',
    unmappedMoveTowns: 0,
    mappedMoveTowns: 0,
  },
  exploratory: [],
  priceSource: 'synthetic',
  fetchedAt: '2026-10-22T00:00:00.000Z',
  adjustmentNote: 'none',
});
ok('two primary names produce six claim rows', synth.rows.filter((r) => r.claim).length === 6);
for (const row of synth.rows.filter((r) => r.kind === 'correlation' && r.full && r.full.r !== null)) {
  const again = pearson(row.pairs.map((p) => p.x), row.pairs.map((p) => p.y));
  ok(`synthetic ${row.id} r matches the pairs`, again !== null && Math.abs(again - row.full!.r!) < 1e-12);
}
ok('headline is the same string the verdict function builds', synth.headline === buildHeadline(synth));
const synthMd = renderReport(synth);
ok('the write-up contains the headline', synthMd.includes(synth.headline));
ok('the write-up does not call an exit a sale', !/confirmed sale/.test(synthMd) || synthMd.includes('not a confirmed sale'));
ok('the write-up names the out-of-sample split', synthMd.includes('out-of-sample'));

console.log('G. verdict rules');
function claimCorr(overrides: Partial<ResultRow>): ResultRow {
  return {
    id: 'x',
    claim: true,
    kind: 'correlation',
    frequency: 'daily',
    stock: 'Neinor Homes',
    ticker: 'HOME',
    role: 'primary',
    feature: 'exit_rate',
    outcome: 'excess',
    lag: 'next BME session',
    pairs: [],
    trainN: 20,
    testN: 20,
    full: null,
    train: { n: 20, r: 0.2, p: 0.4, ciLow: -0.2, ciHigh: 0.5, underpowered: false, note: null },
    test: { n: 20, r: 0.1, p: 0.6, ciLow: -0.3, ciHigh: 0.4, underpowered: false, note: null },
    event: null,
    sameSign: true,
    oosCiExcludesZero: false,
    survives: false,
    ...overrides,
  };
}
ok('no clearing row is no evidence', verdictOf([claimCorr({})]).verdict === 'no-evidence');
ok('an interval excluding zero without surviving the bar is nominal', verdictOf([
  claimCorr({ oosCiExcludesZero: true, survives: false, sameSign: true }),
]).verdict === 'nominal');
ok('survives is the only clearing verdict', verdictOf([
  claimCorr({ survives: true, oosCiExcludesZero: true, sameSign: true }),
]).verdict === 'clears-bar');
const nominalReport = { ...synth, rows: [claimCorr({ oosCiExcludesZero: true, sameSign: true, survives: false })], familySize: 6, bonferroni: 0.05 / 6 };
ok('a nominal headline says it is not a finding', buildHeadline(nominalReport).includes('not a finding'));

console.log('H. cleanups that share this pull request');
ok('no ingestion agent lists immobiliare.it', INGESTION_SWARM.every((a) => !a.sources.some((s) => s.toLowerCase() === 'immobiliare.it')));
const followup = readFileSync(path.join('scripts', 'pulse', 'build_followups.py'), 'utf8');
ok('the follow-up draft does not name a monthly price', !/500\s*\/\s*month/i.test(followup) && !/EUR 500/.test(followup));
ok('the follow-up draft says pricing is on request', followup.includes('pricing is on request'));
ok('the follow-up draft does not point at a checkout', !followup.includes('buy.stripe.com'));
const page = readFileSync(path.join('src', 'app', 'research', 'builder-stock-signal', 'page.tsx'), 'utf8');
ok('the research page is noindex', /index:\s*false/.test(page) && /follow:\s*false/.test(page));
const sitemap = readFileSync(path.join('src', 'app', 'sitemap.ts'), 'utf8');
ok('the research page is not in the sitemap', !sitemap.includes('builder-stock-signal'));
const robots = readFileSync(path.join('src', 'app', 'robots.ts'), 'utf8');
ok('robots.txt disallow includes the research page', robots.includes('/research/builder-stock-signal'));

console.log('I. committed result matches the arithmetic');
const reportPath = path.join('research', 'builder-stock-signal.json');
const mdPath = path.join('research', 'builder-stock-signal.md');
const committed = JSON.parse(readFileSync(reportPath, 'utf8')) as SignalReport;
const md = readFileSync(mdPath, 'utf8');
ok('the markdown is the renderer applied to the json', md === renderReport(committed));
ok('the stored headline matches the verdict', committed.headline === buildHeadline(committed));
ok('the stored verdict matches the rows', committed.verdict === verdictOf(committed.rows).verdict);
ok('the write-up states the sample span', md.includes(committed.ledgerStart) && md.includes(String(committed.dailyPairsPrimary)));
ok('the write-up does not name the upstream feed vendor', !/\bred\s?sp\b/i.test(md));
ok('the write-up does not quote a subscription price', !/\/\s*month/i.test(md) && !/€\s*\d+\s*\/\s*mo/i.test(md));
let mismatched = 0;
for (const row of committed.rows) {
  if (row.kind !== 'correlation' || !row.full || row.full.r === null) continue;
  const again = pearson(row.pairs.map((p) => p.x), row.pairs.map((p) => p.y));
  if (again === null || Math.abs(again - row.full.r) > 1e-9) mismatched++;
  const { train, test } = chronologicalSplit(row.pairs);
  if (train.length !== row.trainN || test.length !== row.testN) mismatched++;
}
ok('every stored correlation matches its pairs and its split', mismatched === 0, `${mismatched} mismatched`);
ok('claim family is the two primary names times three specs', committed.rows.filter((r) => r.claim).length === committed.familySize);
const labels = committed.exploratoryLabels.join('\n');
ok('Costa Blanca South stays in the exploratory coasts', labels.includes('Costa Blanca South'));
ok('Costa del Sol stays in the exploratory coasts', labels.includes('Costa del Sol'));
ok('coasts below 100 current listings are omitted', !labels.includes('Cadiz') && !labels.includes('Tropical') && !labels.includes('Inland'));
ok('the write-up prints a non-zero interval bound as non-zero', !/\|\s+0\.00 to /.test(md) && !/ 0\.00 to /.test(md));

console.log(failures.length ? `\nFAILED ${failures.length}\n${failures.join('\n')}` : `\nALL PASS — ${passed} passed, 0 failed`);
process.exit(failures.length ? 1 : 0);
