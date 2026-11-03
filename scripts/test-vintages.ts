/**
 * Weekly vintage freeze: no overwrite, stable hash, gap handling.
 * Run: npx tsx scripts/test-vintages.ts
 */
import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { LEDGER_EPOCH } from '../src/lib/open-dataset-io';
import { KNOWN_GAPS } from '../src/lib/sellthrough';
import {
  SERIES_START,
  TOWN_MIN_LISTINGS,
  VINTAGE_GUARANTEE,
  assertFullHistory,
  buildVintageFile,
  canonicalManifestJson,
  canonicalVintageJson,
  decideFreeze,
  isoWeek,
  listingsFromBook,
  planClosedWeeks,
  readVintageManifest,
  sha256Hex,
  shareOf,
  writeFreeze,
  type DatedCommit,
  type PlannedWeek,
  type VintageFile,
  type VintageListing,
} from '../src/lib/vintages';

let failures = 0;
function check(name: string, cond: boolean, detail = '') {
  if (!cond) {
    failures++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    console.log(`  ✓ ${name}`);
  }
}

const sha = (char: string) => char.repeat(40);
const SHA_A = sha('a');
const SHA_B = sha('b');
const SHA_C = sha('c');

function listing(ref: string, town: string, provinceKey: string | null, provinceName: string | null, price: number, pm2: number | null): VintageListing {
  return { ref, town, provinceKey, provinceName, costa: 'Costa del Sol', priceEur: price, askingEurM2: pm2 };
}

function townListings(prefix: string, town: string, n: number, price: number, pm2: number): VintageListing[] {
  return Array.from({ length: n }, (_, i) => listing(`${prefix}${i}`, town, 'malaga', 'Málaga', price, pm2));
}

console.log('dates and history');
check('series start is the ledger epoch', SERIES_START === LEDGER_EPOCH && SERIES_START === '2026-08-05');
check('known gap is 14-20 October 2026', JSON.stringify(KNOWN_GAPS) === JSON.stringify([{ from: '2026-10-14', to: '2026-10-20' }]));
check('5 August 2026 is week 32 starting 3 August', isoWeek('2026-08-05').iso_week === '2026-W32' && isoWeek('2026-08-05').week_start === '2026-08-03' && isoWeek('2026-08-05').week_end === '2026-08-09');
check('a history that starts after the series is refused', (() => {
  try { assertFullHistory('2026-08-06'); return false; } catch { return true; }
})());
check('a history that starts before the series is accepted', (() => {
  try { assertFullHistory('2026-03-31'); return true; } catch { return false; }
})());

console.log('shares and parsing');
check('one third rounds half up to 4 places', shareOf(1, 3) === '0.3333', String(shareOf(1, 3)));
check('two thirds rounds half up to 4 places', shareOf(2, 3) === '0.6667', String(shareOf(2, 3)));
check('a zero denominator is not a zero share', shareOf(0, 0) === null);
check('an observed zero share stays zero', shareOf(0, 4) === '0.0000', String(shareOf(0, 4)));
const parsed = listingsFromBook([
  { ref: 'A', l: 'Estepona, Málaga', pf: 250000, pm2: 4000, costa: 'Costa del Sol' },
]);
check('a listing keeps its ref, town and province', parsed[0].ref === 'A' && parsed[0].town === 'Estepona' && parsed[0].provinceKey === 'malaga' && parsed[0].askingEurM2 === 4000);
check('an empty book is refused', (() => { try { listingsFromBook([]); return false; } catch { return true; } })());
check('a duplicate ref is refused', (() => {
  try {
    listingsFromBook([
      { ref: 'A', l: 'Estepona, Málaga', pf: 1, pm2: 1 },
      { ref: 'A', l: 'Estepona, Málaga', pf: 2, pm2: 2 },
    ]);
    return false;
  } catch (err) {
    return err instanceof Error && /duplicate ref/.test(err.message);
  }
})());

console.log('gap handling');
const gapPlans = planClosedWeeks({
  commits: [
    { date: '2026-10-14', commit: SHA_A },
    { date: '2026-10-16', commit: SHA_B },
    { date: '2026-10-20', commit: SHA_C },
  ],
  asOf: '2026-10-26',
});
check('no vintage date falls inside the declared gap', gapPlans.every((plan) => plan.vintage_date == null || plan.vintage_date < '2026-10-14' || plan.vintage_date > '2026-10-20'));
const gapWeek = gapPlans.find((plan) => plan.iso_week === '2026-W42');
check('the week of 12 October is a gap when its only commits are inside the outage', gapWeek?.status === 'gap' && gapWeek.vintage_date === null && gapWeek.reason != null);
check('that gap week lists 14-18 October and does not invent rows', !!gapWeek && gapWeek.gap_dates_in_week.includes('2026-10-14') && gapWeek.gap_dates_in_week.includes('2026-10-18') && gapWeek.capture_dates_in_week.length === 0);
const gapDecision = decideFreeze({
  plans: gapPlans,
  files: new Map(),
  existingFiles: new Map(),
  existingManifest: null,
  existingManifestBody: null,
});
check('a gap-only plan writes no dated vintage file', gapDecision.errors.length === 0 && gapDecision.writes.every((write) => write.path === 'data/vintages/manifest.json'));
check('the manifest names the October gap and leaves the file hash empty', gapDecision.manifest.missing_capture_dates.includes('2026-10-14') && gapDecision.manifest.missing_capture_dates.includes('2026-10-20') && gapDecision.manifest.vintages.every((row) => row.status !== 'frozen' || (row.sha256 != null && row.vintage_date != null && (row.vintage_date < '2026-10-14' || row.vintage_date > '2026-10-20'))));

const beside = planClosedWeeks({
  commits: [
    { date: '2026-08-04', commit: sha('d') },
    { date: '2026-10-13', commit: SHA_A },
    { date: '2026-10-16', commit: SHA_B },
    { date: '2026-10-21', commit: SHA_C },
  ],
  asOf: '2026-10-26',
});
const beforeGap = beside.find((plan) => plan.iso_week === '2026-W42');
const afterGap = beside.find((plan) => plan.iso_week === '2026-W43');
check('13 October is frozen and the 16 October commit inside the gap is ignored', beforeGap?.status === 'frozen' && beforeGap.vintage_date === '2026-10-13' && beforeGap.capture_commit === SHA_A);
check('the frozen week still lists the outage days', !!beforeGap && ['2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18'].every((day) => beforeGap.gap_dates_in_week.includes(day)));
check('a pre-series commit is not the vintage', beside.every((plan) => plan.vintage_date !== '2026-08-04'));
check('the next capture is 21 October and the comparison crosses the gap', Boolean(
  afterGap
  && afterGap.vintage_date === '2026-10-21'
  && afterGap.compared_to === '2026-10-13'
  && afterGap.missing_days_since_compared_to?.includes('2026-10-14')
  && afterGap.missing_days_since_compared_to.includes('2026-10-20')
  && !afterGap.missing_days_since_compared_to.includes('2026-10-21'),
));
check('an open week is not frozen', !planClosedWeeks({ commits: [{ date: '2026-11-02', commit: SHA_A }], asOf: '2026-11-03' }).some((plan) => plan.vintage_date === '2026-11-02'));

console.log('freeze, hash, overwrite');
function weekOf(plans: PlannedWeek[], date: string): PlannedWeek {
  const plan = plans.find((row) => row.vintage_date === date);
  if (!plan) throw new Error(`missing plan ${date}`);
  return plan;
}

const firstPlans = planClosedWeeks({
  commits: [{ date: '2026-08-09', commit: SHA_A }],
  asOf: '2026-08-10',
});
const firstBook = [
  ...townListings('a', 'Estepona', 5, 100_000, 0).map((row, i) => ({ ...row, askingEurM2: 1000 * (i + 1) })),
  ...townListings('b', 'Tiny', 4, 50_000, 9000),
];
const firstFileA = buildVintageFile(weekOf(firstPlans, '2026-08-09'), firstBook, null);
const firstFileB = buildVintageFile(weekOf(firstPlans, '2026-08-09'), firstBook, null);
const bodyA = canonicalVintageJson(firstFileA);
const hashA = sha256Hex(bodyA);
check('the same book freezes to the same bytes and hash', bodyA === canonicalVintageJson(firstFileB) && hashA === sha256Hex(canonicalVintageJson(firstFileB)) && hashA.length === 64);
check('the first vintage does not invent flow counts', firstFileA.book.price_cuts === null && firstFileA.book.new_listings === null && firstFileA.book.removed_listings === null && firstFileA.book.price_cut_share === null);
const estepona = firstFileA.rows.find((row) => row.level === 'town' && row.key === 'Estepona');
const tiny = firstFileA.rows.find((row) => row.key === 'Tiny');
const malaga = firstFileA.rows.find((row) => row.level === 'province' && row.key === 'malaga');
check('a town of five priced listings publishes the median', estepona?.live_listings === 5 && estepona.median_asking_eur_m2 === 3000);
check('a town below the floor is omitted', tiny == null && firstFileA.book.towns_omitted === 1 && firstFileA.book.towns_published === 1);
check('the province still counts the omitted town', malaga?.live_listings === 9 && (malaga.priced_listings ?? 0) === 9 && malaga.median_asking_eur_m2 != null);
check('town floor matches the published constant', TOWN_MIN_LISTINGS === 5 && firstFileA.town_min_listings === 5);

const half = buildVintageFile(
  weekOf(firstPlans, '2026-08-09'),
  [
    listing('p1', 'Tiny', 'malaga', 'Málaga', 10, 1001),
    listing('p2', 'Tiny', 'malaga', 'Málaga', 10, 1002),
  ],
  null,
);
check('a province median rounds half up', half.rows.find((row) => row.level === 'province')?.median_asking_eur_m2 === 1002);
check('that thin town publishes no median', half.rows.every((row) => row.level !== 'town'));

const files = new Map<string, VintageFile>([['2026-08-09', firstFileA]]);
const created = decideFreeze({
  plans: firstPlans,
  files,
  existingFiles: new Map(),
  existingManifest: null,
  existingManifestBody: null,
});
check('the first freeze writes the file and the manifest', created.errors.length === 0 && created.writes.some((write) => write.path === 'data/vintages/2026-08-09.json' && write.body === bodyA));
const manifestBody = canonicalManifestJson(created.manifest);
check('the manifest hash is the file hash', created.manifest.vintages[0]?.sha256 === hashA && manifestBody.includes(hashA));
const again = decideFreeze({
  plans: firstPlans,
  files,
  existingFiles: new Map([['2026-08-09', bodyA]]),
  existingManifest: created.manifest,
  existingManifestBody: manifestBody,
});
check('a second identical freeze writes nothing', again.errors.length === 0 && again.writes.length === 0);
const overwritten = decideFreeze({
  plans: firstPlans,
  files,
  existingFiles: new Map([['2026-08-09', `${bodyA}\n`]]),
  existingManifest: created.manifest,
  existingManifestBody: manifestBody,
});
check('a different body is refused and nothing is written', overwritten.errors.some((error) => error.includes('refusing to overwrite data/vintages/2026-08-09.json')) && overwritten.writes.length === 0);

const dir = mkdtempSync(path.join(tmpdir(), 'avena-vintages-'));
try {
  writeFreeze(dir, created);
  const stored = readFileSync(path.join(dir, 'data/vintages/2026-08-09.json'), 'utf8');
  check('the file on disk is the canonical body', stored === bodyA);
  writeFreeze(dir, { ...created, writes: [] });
  let refused = false;
  try {
    writeFreeze(dir, { writes: [{ path: 'data/vintages/2026-08-09.json', body: '{"replaced":true}\n' }], errors: [], manifest: created.manifest });
  } catch (err) {
    refused = err instanceof Error && /refusing to overwrite/.test(err.message);
  }
  check('the disk write refuses to replace a frozen file', refused);
  check('the frozen bytes are unchanged after the refusal', readFileSync(path.join(dir, 'data/vintages/2026-08-09.json'), 'utf8') === stored);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log('week-to-week counts');
const week1 = townListings('t', 'Estepona', 6, 100, 2000).map((row, i) => ({ ...row, ref: `t${i}` }));
const week2 = [
  { ...week1[0], priceEur: 90 },
  { ...week1[1], priceEur: 110 },
  week1[2],
  week1[4],
  listing('new', 'Estepona', 'malaga', 'Málaga', 100, 2000),
  { ...week1[5], town: 'Mijas' },
  ...townListings('m', 'Mijas', 4, 100, 2000),
];
const secondPlans = planClosedWeeks({
  commits: [
    { date: '2026-08-09', commit: SHA_A },
    { date: '2026-08-10', commit: sha('1') },
    { date: '2026-08-11', commit: sha('2') },
    { date: '2026-08-12', commit: sha('3') },
    { date: '2026-08-13', commit: sha('4') },
    { date: '2026-08-14', commit: sha('5') },
    { date: '2026-08-15', commit: sha('6') },
    { date: '2026-08-16', commit: SHA_B },
  ],
  asOf: '2026-08-17',
});
const second = buildVintageFile(weekOf(secondPlans, '2026-08-16'), week2, week1);
const row = second.rows.find((item) => item.level === 'town' && item.key === 'Estepona');
check('cuts, rises, new and removed are counted from the previous vintage', row?.price_cuts === 1 && row.price_rises === 1 && row.new_listings === 1 && row.removed_listings === 1 && row.comparable_listings === 4 && row.price_cut_share === '0.2500' && row.reassigned_out === 1);
check('a ref that changed town is not a new listing', second.rows.find((item) => item.key === 'Mijas')?.new_listings === 4 && second.rows.find((item) => item.key === 'Mijas')?.reassigned_in === 1);
check('the comparison week records no invented gap inside two clean captures', second.missing_days_since_compared_to?.length === 0);

console.log('committed vintages');
const manifest = readVintageManifest();
check('the committed guarantee is the point-in-time text', manifest.point_in_time === VINTAGE_GUARANTEE);
check('the committed series starts at the ledger epoch', manifest.series_start === SERIES_START);
check('14-20 October 2026 are missing capture dates', ['2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20'].every((day) => manifest.missing_capture_dates.includes(day)));
const frozen = manifest.vintages.filter((row) => row.status === 'frozen');
check('at least one vintage was frozen from a real capture', frozen.length > 0 && frozen[0]?.vintage_date === '2026-08-09');
check('no committed vintage is dated inside the declared gap', frozen.every((row) => row.vintage_date != null && (row.vintage_date < '2026-10-14' || row.vintage_date > '2026-10-20')));
check('committed weeks stay in order', manifest.vintages.every((row, i) => i === 0 || row.week_start >= manifest.vintages[i - 1].week_start));
for (const row of frozen) {
  const filePath = path.join('data', 'vintages', `${row.vintage_date}.json`);
  const body = readFileSync(filePath, 'utf8');
  const file = JSON.parse(body) as VintageFile;
  check(`${row.vintage_date} hash and row count match the file`, sha256Hex(body) === row.sha256 && file.rows.length === row.row_count && file.vintage_date === row.vintage_date);
}
const firstCommitted = JSON.parse(readFileSync('data/vintages/2026-08-09.json', 'utf8')) as VintageFile;
check('the first committed vintage has no previous-week flows', firstCommitted.book.price_cuts === null && firstCommitted.book.new_listings === null && firstCommitted.compared_to === null);

console.log('surfaces');
const root = process.cwd();
const read = (rel: string) => readFileSync(path.join(root, rel), 'utf8');
check('the page links the manifest and a download', read('src/app/data/vintages/page.tsx').includes('href="/api/v1/vintages"') && read('src/app/data/vintages/page.tsx').includes('/api/v1/vintages/'));
check('due diligence links the vintages', read('src/app/due-diligence/page.tsx').includes('href="/data/vintages"'));
check('the Monday job is scheduled after the week closes', read('.github/workflows/vintages-freeze.yml').includes("cron: '20 6 * * 1'") && read('.github/workflows/vintages-freeze.yml').includes('fetch-depth: 0'));
check('the sitemap lists the page', read('src/app/sitemap.ts').includes("'/data/vintages'"));
const surfaced = [
  'src/lib/vintages.ts',
  'src/app/data/vintages/page.tsx',
  'src/app/api/v1/vintages/route.ts',
  'src/app/api/v1/vintages/[date]/route.ts',
  'src/lib/due-diligence.ts',
].map(read).join('\n');
check('no subscription price on the vintage surfaces', !/€\s?79|\/\s?month|per month/i.test(surfaced));
check('no RICS claim on the vintage surfaces', !/RICS/i.test(read('src/app/data/vintages/page.tsx') + read('src/lib/vintages.ts') + read('src/app/api/v1/vintages/route.ts')));
check('no upstream vendor name on the vintage surfaces', !/\bred\s?sp\b/i.test(read('src/lib/vintages.ts') + read('src/app/data/vintages/page.tsx')));

const commits: DatedCommit[] = [{ date: '2026-08-09', commit: SHA_A }];
check('duplicate commit dates are refused', (() => {
  try { planClosedWeeks({ commits: [...commits, { date: '2026-08-09', commit: SHA_B }], asOf: '2026-08-10' }); return false; } catch { return true; }
})());

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
