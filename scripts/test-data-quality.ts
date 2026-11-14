/**
 * Data quality report.
 *
 * Missing capture days stay blank. A same-unit failure is not counted as a
 * passed price change. The committed file is the real ledger, the real book
 * and the vintage chain.
 *
 * Run: npx tsx scripts/test-data-quality.ts
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  KNOWN_GAPS,
  SERIES_START,
  buildCaptureSeries,
  buildChurn,
  compareListingBooks,
  dataQualityToCsv,
  fieldCompleteness,
  gradeDataFreshness,
  placeCoverage,
  priceChanges,
  qualityListingFromBookRow,
  readDataQuality,
  rememberPrices,
  shareTo4,
  splitFeedFileGaps,
  type QualityListing,
} from '../src/lib/data-quality';
import type { IndexListing } from '../src/lib/price-index';
import { gradeCapture, gradeFeed } from '../src/lib/health';

let pass = 0;
let fail = 0;
const ok = (cond: boolean, label: string, detail = '') => {
  if (cond) { pass++; console.log(`  ok  ${label}`); }
  else { fail++; console.error(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`); }
};

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

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

console.log('capture series');
const series = buildCaptureSeries({
  observed: [
    { date: '2026-10-13', listings: 2039 },
    { date: '2026-10-21', listings: 2034 },
  ],
  from: '2026-10-13',
  to: '2026-10-21',
});
ok(series.days_missing === 7 && series.missing_dates.join() === '2026-10-14,2026-10-15,2026-10-16,2026-10-17,2026-10-18,2026-10-19,2026-10-20', 'the October outage is seven blank days');
ok(series.days.every((day) => day.listings == null || day.listings === 2039 || day.listings === 2034), 'no missing day is filled from a neighbour');
ok(series.days.filter((day) => !day.captured).every((day) => day.listings === null), 'a missing day has a null count');
ok(series.missing_outside_declared_gap.length === 0, 'those seven days are inside the declared gap');
let threw = false;
try { buildCaptureSeries({ observed: [{ date: '2026-10-13', listings: 0 }], from: '2026-10-13', to: '2026-10-13' }); } catch { threw = true; }
ok(threw, 'a zero count is refused');
threw = false;
try { buildCaptureSeries({ observed: [], from: SERIES_START, to: SERIES_START }); } catch { threw = true; }
ok(threw, 'an empty ledger is refused');

console.log('completeness and coverage');
const row = (extra: Partial<QualityListing> & Pick<QualityListing, 'ref'>): QualityListing => ({
  priceFrom: 100, priceTo: 100, builtM2: 80, plotM2: null, beds: 2, baths: 1, type: 'Apartment',
  town: 'Dénia', province: 'Alicante', lat: 38.8, lng: 0.1, imageCount: 1, developer: 'A', url: 'https://example.com/a',
  ...extra,
});
const rows = [
  row({ ref: 'A' }),
  row({ ref: 'B', priceFrom: 100, priceTo: 120, beds: 0, plotM2: 40, url: 'mailto:a@b.c', province: null, town: 'Somewhere' }),
  row({ ref: 'C', url: 'https://example.com/plan.pdf', lat: 0, lng: 0 }),
];
const fields = fieldCompleteness(rows);
const byId = (id: string) => fields.fields.find((field) => field.id === id);
ok(byId('asking_price')?.present === 2 && byId('asking_price')?.share === shareTo4(2, 3), 'a from-to range is not one asking price');
ok(byId('bedrooms')?.present === 3 && (byId('bedrooms')?.note.includes('1 listing has a count of 0') ?? false), 'a zero bedroom count is present');
ok(byId('brochure_pdf')?.present === 1, 'only an https URL ending in .pdf counts as a brochure');
ok(byId('listing_url')?.present === 2, 'a mailto address is not a page URL');
ok(byId('coordinates')?.present === 2, 'the pair 0, 0 is not a coordinate');
ok(byId('province')?.present === 2, 'an unmapped location is not a province');
ok(byId('plot_m2')?.present === 1, 'a missing plot is absent');
const places = placeCoverage(rows);
ok(places.provinces.reduce((sum, place) => sum + place.listings, 0) === 3, 'province counts add up to the book');
ok(places.towns.reduce((sum, place) => sum + place.listings, 0) === 3, 'town counts add up to the book');
ok(places.provinces.some((place) => place.name === 'Unmapped' && place.listings === 1), 'unmapped locations are their own row');
threw = false;
try { fieldCompleteness([]); } catch { threw = true; }
ok(threw, 'an empty book is refused');
const mapped = qualityListingFromBookRow(
  { ref: 'SP1', l: 'Dénia, Alicante', pf: 10, pt: 10, bm: 50, bd: 1, ba: 1, t: 'Apartment', d: 'Dev', u: 'https://example.com/a', lat: 1, lng: 2, imgs: ['a'] },
  () => 'Alicante',
);
ok(mapped.town === 'Dénia' && mapped.province === 'Alicante' && mapped.imageCount === 1, 'a feed row maps onto the completeness fields');

console.log('same-unit classes');
const history = new Map<string, Array<{ date: string; price: number }>>();
const plain = compareListingBooks({
  previous: [listing('A', 100000), listing('B', 100000, { beds: 2 }), listing('C', 200000, { type: null, beds: null, builtM2: null, baths: null, imgSig: null, pm2: null, mm2: null })],
  current: [
    listing('A', 110000),
    listing('B', 110000, { beds: 3 }),
    listing('C', 260000, { type: null, beds: null, builtM2: null, baths: null, imgSig: null, pm2: null, mm2: null }),
  ],
  comparedTo: '2026-08-09',
  captureDate: '2026-08-16',
  history,
});
ok(plain.passed === 1 && plain.passed_under_25 === 1, 'a 10% change with the same spec passes');
ok(plain.held_spec === 1 && plain.held_spec_under_25 === 1, 'a price change with a bedroom change is held for spec');
ok(plain.held_large === 1 && plain.held_large_25_to_50 === 1, 'a 30% jump without specs is held back');
ok(priceChanges(plain) === 3 && shareTo4(plain.passed, priceChanges(plain)) === '0.3333', 'the pass share ignores nothing that changed price');
const verified = compareListingBooks({
  previous: [listing('D', 100000)],
  current: [listing('D', 130000)],
  comparedTo: '2026-08-09',
  captureDate: '2026-08-16',
  history,
});
ok(verified.passed_25_to_50 === 1 && verified.held_large === 0, 'a 30% jump with the same type, beds, baths, size and photos passes');
const specOnly = compareListingBooks({
  previous: [listing('E', 100000)],
  current: [listing('E', 100000, { beds: 4 })],
  comparedTo: '2026-08-09',
  captureDate: '2026-08-16',
  history,
});
ok(specOnly.spec_only === 1 && priceChanges(specOnly) === 0, 'a spec change with the same price is not a price change');
const moved = compareListingBooks({
  previous: [listing('F', 100000, { town: 'Dénia' })],
  current: [listing('F', 50000, { town: 'Altea' })],
  comparedTo: '2026-08-09',
  captureDate: '2026-08-16',
  history,
});
ok(moved.reassigned === 1 && moved.passed === 0 && moved.held_large === 0, 'a town change is not a price change');
rememberPrices(history, [listing('G', 150000)], '2026-08-01');
const recurred = compareListingBooks({
  previous: [listing('G', 100000)],
  current: [listing('G', 150000)],
  comparedTo: '2026-08-09',
  captureDate: '2026-08-16',
  history,
});
ok(recurred.held_large === 1, 'a large move back to an earlier asking price is held back');
const half = compareListingBooks({
  previous: [listing('H', 100000, { type: null, beds: null, builtM2: null, baths: null, imgSig: null, pm2: null, mm2: null })],
  current: [listing('H', 160000, { type: null, beds: null, builtM2: null, baths: null, imgSig: null, pm2: null, mm2: null })],
  comparedTo: '2026-08-09',
  captureDate: '2026-08-16',
  history: new Map(),
});
ok(half.held_large_over_50 === 1 && half.passed === 0, 'a jump of 50% or more without specs is held in its own band');

console.log('churn and feed-file gaps');
const churn = buildChurn([
  { week: '2026-10-05', newListings: 22, exits: 24 },
  { week: '2026-10-12', newListings: 0, exits: 37 },
]);
ok(churn.weeks[1]?.overlaps_declared_gap === true && churn.weeks[0]?.overlaps_declared_gap === false, 'only the week that meets the October gap is marked');
ok(churn.new_listings === 22 && churn.delistings === 61, 'churn totals are the sum of the weeks');
const gaps = splitFeedFileGaps(['2026-10-13', '2026-10-14', '2026-11-20'], series);
ok(gaps.price_snapshot_present.join() === '2026-10-13' && gaps.no_price_snapshot.join() === '2026-10-14' && gaps.outside_snapshot_series.join() === '2026-11-20', 'a feed-file gap is split by whether a snapshot exists');

console.log('committed file');
const file = readDataQuality();
ok(file.series_start === SERIES_START && file.capture.from === SERIES_START, 'the series starts on the first trusted capture day');
const october = ['2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20'];
ok(october.every((date) => file.capture.missing_dates.includes(date)), 'the committed file lists the declared October outage');
ok(october.every((date) => file.capture.days.find((day) => day.date === date)?.listings === null), 'those outage days are blank, not interpolated');
ok(file.capture.days_captured > 0 && file.book.listings > 0 && file.same_unit.price_changes > 0, 'the file has real capture, book and price-change counts');
ok(file.completeness.fields.find((field) => field.id === 'brochure_pdf')?.present === 0, 'the current book has no PDF brochure link');
ok(file.feed_file_gaps.price_snapshot_present.includes('2026-08-17'), 'a day with a snapshot and no listing-file commit is disclosed');
const csv = dataQualityToCsv(file);
ok(csv.includes('2026-10-14') && csv.includes('No snapshot. Count left blank. Not interpolated.'), 'the CSV names a missing day and says the count is blank');
const octoberLine = csv.split('\n').find((line) => line.startsWith('capture,2026-10-14,'));
ok(!!octoberLine && octoberLine.split(',')[5] === '', 'the CSV leaves the October 14 listing count empty', octoberLine);
const graded = gradeDataFreshness(file, new Date('2026-11-11T18:00:00Z'));
const feed = gradeFeed(new Date('2026-11-11T18:00:00Z'), file.freshness.feed_generated_at);
const capture = gradeCapture(new Date('2026-11-11T18:00:00Z'), file.freshness.latest_capture_date, true);
ok(graded.feed.detail === feed.detail && graded.capture.detail === capture.detail, 'freshness uses the health grades');
ok(KNOWN_GAPS[0]?.from === '2026-10-14' && KNOWN_GAPS[0]?.to === '2026-10-20', 'the declared gap is still 14 to 20 October 2026');

console.log('public copy');
const page = read('src/app/data/quality/page.tsx');
const route = read('src/app/api/v1/data-quality/route.ts');
const lib = read('src/lib/data-quality.ts');
const builder = read('scripts/build-data-quality.ts');
const workflow = read('.github/workflows/data-quality-refresh.yml');
const json = read('data/data-quality.json');
const surfaces = [page, route, lib, json].join('\n');
ok(!/\bred\s?sp\b/i.test(surfaces), 'public copy does not name the upstream feed vendor');
ok(!/€\s?79|\/\s?month|per month/i.test(surfaces), 'no plan price on the quality surfaces');
ok(!/RICS/i.test(page + route + json), 'no RICS claim on the quality surfaces');
ok(page.includes('href="/api/v1/data-quality"') && page.includes('format=csv') && page.includes('href="/api/health"'), 'the page links JSON, CSV and live health');
ok(route.includes('text/csv') && route.includes('readDataQuality') && !route.includes("from('price_snapshots')"), 'the API serves the file and does not scan snapshots');
ok(builder.includes('movement-ledger.csv') && builder.includes('compareListingBooks'), 'the builder reads the ledger and the shared comparison');
ok(lib.includes('classifyPair'), 'the comparison uses the price-index same-unit check');
ok(!builder.includes("from('price_snapshots')") && !builder.includes('.from("price_snapshots")'), 'the builder does not query price snapshots');
ok(workflow.includes('fetch-depth: 0') && workflow.includes('scripts/build-data-quality.ts') && workflow.includes('data/data-quality.json'), 'the morning job rebuilds the file from git history');
ok(read('src/app/robots.ts').includes("'/data/quality'") && read('src/app/robots.ts').includes("'/api/v1/data-quality'"), 'robots allows the page and the API');
ok(read('src/app/api/page.tsx').includes('href="/data/quality"'), 'the API page links the report');

console.log(fail ? `FAILED — ${pass} passed, ${fail} failed` : `ALL PASS — ${pass} passed, 0 failed`);
if (fail) process.exit(1);
