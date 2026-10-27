/**
 * Buyer due-diligence pack.
 * Run: npx tsx scripts/test-due-diligence.ts
 *
 * The pack is allowed to say "not available". It is not allowed to invent a
 * coverage number, drop a published column, or describe a field the routes
 * do not return.
 */

import { readFileSync } from 'fs';
import path from 'path';
import { getAllProperties } from '../src/lib/properties';
import { toAPIP } from '../src/lib/apip';
import { KNOWN_GAPS } from '../src/lib/sellthrough';
import { findMissingRanges } from '../src/lib/fund-report';
import { LEDGER_EPOCH } from '../src/lib/open-dataset-io';
import {
  MOVE_STATUS_SINCE,
  NOT_AVAILABLE,
  SAMPLE_MOVE_ROWS,
  assembleDueDiligence,
  buildPipeline,
  coverageFromFeed,
  priceHistoryFromQuery,
  readPublishedDataset,
  readSampleCsv,
  sampleMovesCsv,
} from '../src/lib/due-diligence';
import type { HealthReport } from '../src/lib/health';

let failures = 0;
function check(name: string, cond: boolean, detail = '') {
  if (!cond) {
    failures++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    console.log(`  ✓ ${name}`);
  }
}

const root = process.cwd();
const read = (rel: string) => readFileSync(path.join(root, rel), 'utf8');

console.log('coverage');
const props = getAllProperties();
const feed = coverageFromFeed(props, '2026-10-25T00:00:00.000Z');
check('listing count is the book', feed.listings === props.length, String(feed.listings));
check('promoter names are not available', feed.promoter_names === NOT_AVAILABLE);
check('promoter reason does not pretend the source label is a company', /not a promoter/i.test(feed.promoter_names_reason));
check('source labels sum to the book', feed.source_labels.reduce((s, r) => s + r.listings, 0) === props.length);
check('every mapped province is in the province list', feed.provinces.every((p) => ['malaga', 'alicante', 'murcia', 'almeria', 'granada', 'cadiz', 'valencia', 'castellon'].includes(p.key)));
check('province listings sum with unmapped to the book',
  feed.provinces.reduce((s, p) => s + p.listings, 0) + feed.towns.filter((t) => !t.province).reduce((s, t) => s + t.listings, 0) === props.length);
check('development refs are a count, not a name list', Number.isInteger(feed.development_refs) && feed.development_refs > 0);
check('town rows cover every listing', feed.towns.reduce((s, t) => s + t.listings, 0) === props.length);

console.log('price history');
const missingClient = priceHistoryFromQuery({ client: false, min: null, max: null, error: null, ledgerDates: null });
check('no database client is not available', missingClient.first_date === NOT_AVAILABLE && missingClient.latest_date === NOT_AVAILABLE && missingClient.observed_days === NOT_AVAILABLE);
check('no database client explains why', /not configured/i.test(missingClient.reason ?? ''));
const matched = priceHistoryFromQuery({
  client: true, min: '2026-08-05', max: '2026-08-07', error: null,
  ledgerDates: ['2026-08-05', '2026-08-07'],
});
check('matching ledger endpoints publish the day count', matched.observed_days === 2 && matched.first_date === '2026-08-05');
const unmatched = priceHistoryFromQuery({
  client: true, min: '2026-08-05', max: '2026-08-09', error: null,
  ledgerDates: ['2026-08-05', '2026-08-07'],
});
check('a ledger that does not share both endpoints does not invent a day count', unmatched.observed_days === NOT_AVAILABLE && unmatched.first_date === '2026-08-05' && unmatched.latest_date === '2026-08-09');
const failed = priceHistoryFromQuery({ client: true, min: null, max: null, error: 'price_snapshots min: permission', ledgerDates: null });
check('a failed read is not a zero', failed.source === NOT_AVAILABLE && failed.reason === 'price_snapshots min: permission');

console.log('published ledger');
const dates = JSON.parse(read('public/open-data/movement-ledger.json')) as Array<{ date: string }>;
const gaps = findMissingRanges(dates.map((d) => d.date));
check('published ledger still shows the October capture gap', gaps.some((g) => g.start === '2026-10-14' && g.end === '2026-10-20' && g.missingDays === 7), JSON.stringify(gaps));

console.log('sample');
const sample = readSampleCsv();
const sampleLines = sample.trim().split('\n');
const full = read('public/open-data/moves.csv').trim().split('\n');
check('sample keeps the published header', sampleLines[0] === full[0]);
check('sample is a prefix of the published file', sampleLines.length === SAMPLE_MOVE_ROWS + 1 && sampleLines[1] === full[1] && sampleLines[SAMPLE_MOVE_ROWS] === full[SAMPLE_MOVE_ROWS]);
check('sampleMovesCsv does not pad a short file', sampleMovesCsv('a,b\n1,2\n').trim().split('\n').length === 2);

console.log('dictionary vs files and routes');
const published = readPublishedDataset();
const pack = assembleDueDiligence({
  now: new Date('2026-10-26T00:00:00.000Z'),
  props,
  feedGeneratedAt: '2026-10-25T09:45:17.417Z',
  published,
  manifest: JSON.parse(read('public/open-data/dataset.json')),
  ledgerDates: dates.map((d) => d.date),
  officialGeneratedAt: null,
  supplyGeneratedAt: null,
  health: null,
  snapshot: { client: false, min: null, max: null, error: null },
});
function fieldsFor(recordPrefix: string): string[] {
  return pack.dictionary.filter((f) => f.record.startsWith(recordPrefix)).map((f) => f.field);
}
for (const [file, prefix] of [
  ['public/open-data/towns.csv', 'towns'],
  ['public/open-data/movement-ledger.csv', 'movement-ledger'],
  ['public/open-data/moves.csv', 'moves'],
  ['public/open-data/tombstones.csv', 'tombstones'],
] as const) {
  const header = read(file).split(/\r?\n/)[0].split(',');
  const got = fieldsFor(prefix);
  check(`${file} columns are the dictionary`, header.join(',') === got.join(','), `file ${header.join(',')} vs dict ${got.join(',')}`);
}
check('manifest version example is the file, not a typed constant', pack.dictionary.find((f) => f.field === 'version' && f.record === 'dataset.json')?.example === published.version);

const propertiesSrc = read('src/app/api/v1/properties/route.ts');
const returnAt = propertiesSrc.indexOf('return {\n      ref:');
const returnEnd = propertiesSrc.indexOf('};', returnAt);
const propertyKeys = [...propertiesSrc.slice(returnAt, returnEnd).matchAll(/^ {6}([A-Za-z0-9_]+):/gm)].map((m) => m[1]);
const dictListing = pack.dictionary.filter((f) => f.surface.startsWith('GET /api/v1/properties') && f.record === 'properties[]').map((f) => f.field);
check('properties API keys were found in the route', propertyKeys.length > 20, propertyKeys.join(','));
check('dictionary lists every properties API key', propertyKeys.every((k) => dictListing.includes(k)) && dictListing.every((k) => propertyKeys.includes(k)), `route ${propertyKeys.join(',')} vs dict ${dictListing.join(',')}`);

const exportSrc = read('src/app/api/v1/dataset-export/route.ts');
const exportBlock = exportSrc.match(/interface ExportRow \{([\s\S]*?)\n\}/);
const exportKeys = [...(exportBlock?.[1] ?? '').matchAll(/\n\s+(\w+)\??:/g)].map((m) => m[1]);
const dictExport = pack.dictionary.filter((f) => f.surface === 'GET /api/v1/dataset-export').map((f) => f.field);
check('dataset-export keys match the dictionary', exportKeys.join(',') === dictExport.join(','), `route ${exportKeys.join(',')} vs dict ${dictExport.join(',')}`);

const flat: Record<string, unknown> = {};
function flatten(value: unknown, prefix: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    if (prefix) flat[prefix] = value;
    return;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (child === undefined) continue;
    flatten(child, prefix ? `${prefix}.${key}` : key);
  }
}
flatten(toAPIP(props[0]).property, '');
const apipDict = new Set(pack.dictionary.filter((f) => f.surface.includes('format=apip')).map((f) => f.field));
const missingApip = Object.keys(flat).filter((k) => !apipDict.has(k));
check('every emitted APIP path is in the dictionary', missingApip.length === 0, missingApip.join(','));
for (const omitted of ['developer_rating', 'market_regime', 'liquidity_score', 'apci_at_listing']) {
  check(`APIP ${omitted} is documented and not emitted`, apipDict.has(omitted) && !(omitted in flat));
}

const openSrc = read('src/app/api/v1/open-dataset/route.ts');
check('aggregate dictionary follows the route formula', openSrc.includes('avg_price: Math.round(avg(prices))') && openSrc.includes('apci_composite'));
check('aggregate town example is computed', typeof pack.dictionary.find((f) => f.record === 'data.town_statistics[]' && f.field === 'avg_price')?.example === 'number');

console.log('policy pins');
check('history start is the ledger epoch', pack.quality.history_starts === LEDGER_EPOCH);
check('declared gaps are the sell-through constant', JSON.stringify(pack.quality.declared_capture_gaps) === JSON.stringify(KNOWN_GAPS));
check('move_status date is the one recorded in unit-identity', read('src/lib/unit-identity.ts').includes(MOVE_STATUS_SINCE));
const pricing = read('src/app/api/cron/pricing-history/route.ts');
check('same-day snapshot upsert still replaces the row', pricing.includes("from('price_snapshots')") && pricing.includes('ignoreDuplicates: false'));
check('point-in-time text still says a same-day capture replaces that day', /same UTC day/.test(pack.point_in_time.asking_prices));
check('scribe still ignores existing score rows', read('src/app/api/cron/scribe/route.ts').includes('ignoreDuplicates: true'));
check('backfill text refuses to invent a missed day', /not backfilled/i.test(pack.point_in_time.backfill));
for (const [file, cron] of [
  ['.github/workflows/feed-refresh.yml', '37 1 * * *'],
  ['.github/workflows/feed-refresh.yml', '10 5 * * *'],
  ['.github/workflows/capture-backstop.yml', '0 7 * * *'],
  ['.github/workflows/capture-backstop.yml', '0 9 * * *'],
  ['.github/workflows/es-official-refresh.yml', '40 4 * * 3'],
  ['.github/workflows/es-supply-refresh.yml', '15 4 * * 4'],
  ['vercel.json', '"path": "/api/cron/pricing-history", "schedule": "20 2 * * *"'],
  ['vercel.json', '"path": "/api/cron/pricing-history", "schedule": "30 14 * * *"'],
  ['vercel.json', '"path": "/api/cron/scribe",  "schedule": "5 3 * * *"'],
] as const) {
  check(`${file} still has ${cron}`, read(file).includes(cron));
}
check('cadence text cites those clocks', /01:37 UTC/.test(pack.pipeline[0].cadence) && /02:20 UTC/.test(pack.pipeline[1].cadence) && /07:00 UTC/.test(pack.pipeline[2].cadence) && /04:40 UTC/.test(pack.pipeline[3].cadence) && /04:15 UTC/.test(pack.pipeline[4].cadence));

console.log('links and claims');
check('methodology links the pack', read('src/app/methodology/page.tsx').includes('href="/due-diligence"'));
check('footer links the pack', read('src/components/v2/Footer.tsx').includes("href: '/due-diligence'"));
check('API page links the pack', read('src/app/api/page.tsx').includes('href="/due-diligence"'));
const surfaced = ['src/lib/due-diligence.ts', 'src/app/due-diligence/page.tsx', 'src/app/api/v1/due-diligence/route.ts', 'src/app/api/v1/due-diligence/sample/route.ts'].map(read).join('\n');
check('no subscription price', !/€\s?79|\/\s?month|per month|subscription/i.test(surfaced));
check('no RICS claim', !/RICS/i.test(surfaced));
check('no upstream vendor name', !/\bred\s?sp\b/i.test(surfaced));
check('commercial terms point at access', pack.licensing.access_href === '/access' && /Pricing on request/.test(pack.licensing.listings_api));
check('a missing health report does not invent run times', pack.health_checked_at === NOT_AVAILABLE && pack.pipeline.find((s) => s.id === 'feed-refresh')?.last_observed === NOT_AVAILABLE);
check('the feed artifact time still comes from feed-meta when health is down', pack.coverage.feed.feed_generated_at === '2026-10-25T09:45:17.417Z');
check('backstop clock time is not available without health', pack.pipeline.find((s) => s.id === 'capture-backstop')?.last_observed === NOT_AVAILABLE);
const withHealth: HealthReport = {
  status: 'operational',
  label: 'Operational',
  checked_at: '2026-10-26T00:00:00.000Z',
  checks: [
    { id: 'feed', label: 'Feed', status: 'ok', critical: true, detail: 'deployed feed is 1h old', observed: '2026-10-25T09:45:17.417Z' },
    { id: 'capture', label: 'Capture', status: 'unknown', critical: true, detail: 'capture could not be read', observed: null },
    { id: 'database', label: 'Database', status: 'unknown', critical: true, detail: 'no client' },
    { id: 'dataset', label: 'Dataset', status: 'ok', critical: false, detail: 'site 2026-10-25 · avena-data 2026-10-25' },
    { id: 'workflows', label: 'Pipelines', status: 'ok', critical: false, detail: 'feed-refresh: success, capture-backstop: success, tests: success', observed: null },
  ],
};
const piped = buildPipeline(withHealth, '2026-10-24T23:22:40.336Z', '2026-10-27T00:00:00.000Z');
const backstop = piped.find((s) => s.id === 'capture-backstop');
check('backstop detail is the workflows check, and still has no run clock', backstop?.last_observed === NOT_AVAILABLE && /feed-refresh: success/.test(backstop?.health_detail ?? '') && /tests: success/.test(backstop?.health_detail ?? '') && /together/.test(backstop?.health_detail ?? ''));
const official = piped.find((s) => s.id === 'es-official');
check('official artifact time is the file and its health status stays unavailable', official?.last_observed === '2026-10-24T23:22:40.336Z' && official.health_status === NOT_AVAILABLE);
const supply = piped.find((s) => s.id === 'es-supply');
check('supply artifact time is the file and its health status stays unavailable', supply?.last_observed === '2026-10-27T00:00:00.000Z' && supply.health_status === NOT_AVAILABLE);
check('not-available rollup names the missing database read', pack.not_available.some((n) => n.field === 'coverage.price_history.first_date' && /not configured/i.test(n.reason)));
check('pack has a dictionary entry for every open-data move column', fieldsFor('moves').length === 8);

console.log(failures ? `\n${failures} FAILED` : `\nALL PASS`);
process.exit(failures ? 1 : 0);
