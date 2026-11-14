/**
 * Public listing-duration snapshot.
 *
 * Gap exits stop on the last snapshot. A delisting is not a sale.
 * Coast, region and town only.
 *
 * Run: npx tsx scripts/test-listing-duration.ts
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  DURATION_COLUMNS,
  DURATION_PLAIN,
  MIN_FOR_MEDIAN,
  REFRESH_CRON,
  REFRESH_NOTE,
  csvForLevel,
  exitDuration,
  findForbiddenKey,
  foldSnapshotSpans,
  forLevel,
  aggregateListingDuration,
  readListingDuration,
} from '../src/lib/listing-duration';
import { KNOWN_GAPS, SERIES_START, daysBetween } from '../src/lib/sellthrough';

let pass = 0;
let fail = 0;
const ok = (cond: boolean, label: string) => {
  if (cond) { pass++; console.log(`  ok  ${label}`); }
  else { fail++; console.error(`  FAIL ${label}`); }
};
const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

console.log('gap handling');
const gap = exitDuration({ firstSnapshot: '2026-08-05', lastSnapshot: '2026-10-13', delistedOn: '2026-10-21' });
ok(gap.inGap && gap.end === '2026-10-13', 'a ledger date after the October gap ends on the last snapshot');
ok(gap.days === daysBetween('2026-08-05', '2026-10-13'), 'gap days are not added to the duration');
ok(gap.days !== daysBetween('2026-08-05', '2026-10-21'), 'the post-gap stamp is not the end date');
const ordinary = exitDuration({ firstSnapshot: '2026-08-05', lastSnapshot: '2026-09-01', delistedOn: '2026-09-02' });
ok(!ordinary.inGap && ordinary.end === '2026-09-02' && ordinary.days === daysBetween('2026-08-05', '2026-09-02'), 'outside the gap the ledger date is the end, including the day after the last snapshot');
const unmeasured = exitDuration({ firstSnapshot: null, lastSnapshot: null, delistedOn: '2026-09-02' });
ok(unmeasured.days === null && unmeasured.end === null, 'an exit with no snapshot has no duration');
const inside = exitDuration({ firstSnapshot: '2026-08-05', lastSnapshot: '2026-10-13', delistedOn: '2026-10-16' });
ok(inside.inGap && inside.end === '2026-10-13', 'a ledger date inside the gap is pulled back to the last snapshot');

console.log('aggregate');
const asOf = '2026-11-06';
const day = (days: number) => {
  const t = Date.parse(`${asOf}T00:00:00Z`) - days * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
};
const spans = [
  { ref: 'LIVE1', town: 'Estepona', region: 'costa-del-sol', firstSeen: SERIES_START, lastSeen: asOf },
  { ref: 'LIVE2', town: 'Estepona', region: 'costa-del-sol', firstSeen: day(10), lastSeen: asOf },
  { ref: 'LIVE3', town: 'Estepona', region: 'costa-del-sol', firstSeen: day(20), lastSeen: asOf },
  { ref: 'LIVE4', town: 'Estepona', region: 'costa-del-sol', firstSeen: day(30), lastSeen: asOf },
  { ref: 'LIVE5', town: 'Estepona', region: 'costa-del-sol', firstSeen: day(40), lastSeen: asOf },
  { ref: 'THIN', town: 'Marbella', region: 'costa-del-sol', firstSeen: day(7), lastSeen: asOf },
  { ref: 'GAP1', town: 'Estepona', region: 'costa-del-sol', firstSeen: '2026-08-10', lastSeen: '2026-10-13' },
  { ref: 'BACK', town: 'Estepona', region: 'costa-del-sol', firstSeen: SERIES_START, lastSeen: asOf },
  { ref: 'GONE', town: 'Guardamar del Segura', region: 'cb-south', firstSeen: '2026-08-20', lastSeen: '2026-09-01' },
  { ref: 'E2', town: 'Estepona', region: 'costa-del-sol', firstSeen: '2026-08-12', lastSeen: '2026-08-20' },
  { ref: 'E3', town: 'Estepona', region: 'costa-del-sol', firstSeen: '2026-08-12', lastSeen: '2026-08-22' },
  { ref: 'E4', town: 'Estepona', region: 'costa-del-sol', firstSeen: '2026-08-12', lastSeen: '2026-08-24' },
];
const delistings = [
  { ref: 'GAP1', town: 'Estepona', region: 'costa-del-sol', lastSeenDate: '2026-10-21' },
  { ref: 'BACK', town: 'Estepona', region: 'costa-del-sol', lastSeenDate: '2026-08-14' },
  { ref: 'GONE', town: 'Guardamar del Segura', region: 'cb-south', lastSeenDate: '2026-09-02' },
  { ref: 'NOSNAP', town: 'Estepona', region: 'costa-del-sol', lastSeenDate: '2026-09-15' },
  { ref: 'E2', town: 'Estepona', region: 'costa-del-sol', lastSeenDate: '2026-08-21' },
  { ref: 'E3', town: 'Estepona', region: 'costa-del-sol', lastSeenDate: '2026-08-23' },
  { ref: 'E4', town: 'Estepona', region: 'costa-del-sol', lastSeenDate: '2026-08-25' },
];
const file = aggregateListingDuration({
  asOf,
  spans,
  delistings,
  addedOnly: [{ ref: 'ADDED', town: 'Marbella', region: 'costa-del-sol', added: '2026-11-01' }],
});
ok(file.seriesStart === '2026-08-05' && JSON.stringify(file.knownGaps) === JSON.stringify(KNOWN_GAPS.map((gap) => ({ from: gap.from, to: gap.to }))), 'series start and the October gap are the shared constants');
ok(file.coverage.live === 8 && file.coverage.liveFromAddedOnly === 1, 'live count includes the _added-only reference and not the exits that stayed gone');
ok(file.coverage.exitsInGap === 1 && file.coast.exitsInGap === 1, 'the gap exit is counted once, on the coast');
ok(file.coverage.exitsStillListed === 1, 'a reference back in the latest snapshot is still an exit and still listed');
ok(file.coverage.exitsUnmeasured === 1, 'a delisting with no snapshot is counted and not given a duration');
const estepona = file.towns.find((town) => town.label === 'Estepona');
const marbella = file.towns.find((town) => town.label === 'Marbella');
const esteponaExitDays = [
  daysBetween('2026-08-10', '2026-10-13'),
  daysBetween(SERIES_START, '2026-08-14'),
  daysBetween('2026-08-12', '2026-08-21'),
  daysBetween('2026-08-12', '2026-08-23'),
  daysBetween('2026-08-12', '2026-08-25'),
].sort((a, b) => a - b);
ok(estepona != null && estepona.exitsInGap === 1 && estepona.exitsMeasured === 5 && estepona.medianExitDays === esteponaExitDays[2], 'Estepona exit median uses the last snapshot for the gap exit');
ok(marbella != null && marbella.live === 2 && marbella.medianDaysListed === null && marbella.live < MIN_FOR_MEDIAN, 'a town under 5 measured listings keeps the count and blanks the median');
ok(file.coast.medianDaysListed != null && file.coast.liveLeftCensored >= 1, 'the coast median is published and names the left-censored count');
ok(estepona!.medianExitDays !== daysBetween('2026-08-10', '2026-10-21'), 'the town exit median is not the gap-crossing span');
ok(findForbiddenKey(file) === null && !JSON.stringify(file).includes('LIVE1') && !JSON.stringify(file).includes('GAP1') && !JSON.stringify(file).includes('"project"'), 'fixture references and project keys are not in the public file');
const joined = file.methodology.join(' ').toLowerCase();
ok(joined.includes('days to sell are not estimated') && joined.includes('never observes a confirmed sale'), 'methodology refuses a sale');
ok(!/time to sale|time-to-sale|days to sale/.test(joined), 'methodology has no time-to-sale phrase');
ok(DURATION_PLAIN.gap.includes('14 October 2026') && DURATION_PLAIN.gap.includes('20 October 2026') && DURATION_PLAIN.gap.includes('not added'), 'the gap sentence names the missing days and says they are not added');
const coastOnly = forLevel(file, 'coast');
const regionOnly = forLevel(file, 'region');
const townOnly = forLevel(file, 'town');
ok(!('regions' in coastOnly) && !('towns' in coastOnly) && 'coast' in coastOnly, 'level=coast keeps the coast group only');
ok(!('coast' in regionOnly) && !('towns' in regionOnly) && 'regions' in regionOnly, 'level=region keeps region rows only');
ok(!('coast' in townOnly) && !('regions' in townOnly) && 'towns' in townOnly, 'level=town keeps town rows only');
let threw = false;
try { forLevel(file, 'project'); } catch { threw = true; }
ok(threw, 'level=project is rejected');
const csv = csvForLevel(file, null);
ok(csv.filename.includes('town') && csv.body.split('\n')[0] === DURATION_COLUMNS.join(','), 'CSV defaults to town rows');
ok(csv.body.includes('Estepona') && !csv.body.includes('LIVE1') && !csv.body.includes('GAP1'), 'town CSV has the town and not the reference');
ok(foldSnapshotSpans([
  { ref: 'A', snapshot_date: '2026-08-06', town: 'Estepona', region: 'costa-del-sol' },
  { ref: 'A', snapshot_date: '2026-04-08', town: 'Old', region: 'old' },
  { ref: 'A', snapshot_date: '2026-09-01', town: 'Marbella', region: 'costa-del-sol' },
]).map((span) => `${span.firstSeen}|${span.lastSeen}|${span.town}`).join(',') === '2026-08-06|2026-09-01|Marbella', 'folding keeps the epoch, the first day, and the latest town');

console.log('published file');
const published = readListingDuration();
ok(published.coverage.live >= 500 && published.coverage.refsInLedger >= 500, 'published book is the full capture, not the fixture');
ok(published.asOf >= '2026-11-06' && published.seriesStart === '2026-08-05', 'published as-of is the current ledger and the series starts at the epoch');
ok(published.coverage.exitsInGap > 0 && published.coast.exitsInGap === published.coverage.exitsInGap, 'the published file marks October-gap exits');
ok(published.coverage.liveLeftCensored > 0, 'the published file records left-censored live listings');
ok(published.towns.length >= 8 && published.regions.length >= 1, 'published file has towns and regions');
ok(published.regions.reduce((sum, row) => sum + row.live, 0) === published.coast.live, 'region live counts add up to the coast');
ok(published.towns.reduce((sum, row) => sum + row.live, 0) === published.coast.live, 'town live counts add up to the coast');
ok(published.towns.reduce((sum, row) => sum + row.exits, 0) === published.coast.exits, 'town exit counts add up to the coast');
ok(published.towns.some((town) => town.live > 0 && town.live < MIN_FOR_MEDIAN && town.medianDaysListed === null), 'a thin published town blanks its median');
ok(findForbiddenKey(published) === null, 'published file has no reference or project key');
ok(published.methodology.includes(DURATION_PLAIN.exit) && published.methodology.includes(DURATION_PLAIN.gap), 'published methodology carries the exit and gap sentences');
ok(published.refresh === REFRESH_NOTE, 'published file names the 06:55 UTC refresh');

console.log('surfaces');
const page = read('src/app/data/listing-duration/page.tsx');
const route = read('src/app/api/v1/listing-duration/route.ts');
const workflow = read('.github/workflows/listing-duration-refresh.yml');
const builder = read('scripts/build-listing-duration.ts');
ok(page.includes('DURATION_PLAIN.exit') && page.includes('DURATION_PLAIN.gap') && page.includes('DURATION_PLAIN.censored'), 'page renders the exit, the gap and the censoring');
ok(page.includes('Not days to sell') && page.includes('href="/data/absorption"') && page.includes('format=csv') && page.includes('/api/v1/liquidity'), 'page links absorption, CSV and the liquidity observations');
ok(page.includes('PrintButton') && page.includes('print-root'), 'page is printable');
ok(route.includes('csvForLevel') && route.includes('text/csv') && !route.includes('x-avena-key') && !route.includes('checkLenderKey'), 'public API serves CSV and does not ask for a lender key');
ok(builder.includes('fetchSnapshots') && builder.includes('fetchSold') && builder.includes('aggregateListingDuration'), 'rebuild uses the ledger reads and the public aggregate');
ok(workflow.includes(REFRESH_CRON) && workflow.includes('scripts/build-listing-duration.ts') && workflow.includes('data/listing-duration.json') && workflow.includes('SUPABASE_SERVICE_ROLE_KEY'), 'morning workflow rebuilds the file from Supabase at 06:55 UTC');
ok(!read('.github/workflows/absorption-refresh.yml').includes('build-listing-duration'), 'absorption refresh does not build this file');
ok(!read('.github/workflows/vintages-freeze.yml').includes('build-listing-duration'), 'the vintage freeze does not build this file');
const lender = read('src/app/api/v1/lender/monitor/route.ts');
ok(lender.includes('checkLenderKey') && lender.includes('x-avena-key'), 'lender monitor still requires the key');
const surface = [page, route, read('src/lib/listing-duration.ts'), read('src/components/v2/Footer.tsx')].join('\n');
ok(!/RICS/i.test(page + route), 'no RICS claim on the duration surfaces');
ok(!/€\s?79|\/\s?month|per month|subscription/i.test(surface), 'no plan price on the duration surfaces or the footer');
ok(read('src/components/v2/Footer.tsx').includes("href: '/data/listing-duration'"), 'footer links the page');
ok(read('src/app/official/page.tsx').includes('href="/data/listing-duration"'), 'official hub links the page');
ok(read('src/app/due-diligence/page.tsx').includes('href="/data/listing-duration"'), 'due diligence links the page');
ok(read('src/app/methodology/page.tsx').includes('href="/data/listing-duration"'), 'methodology links the page');
ok(read('src/app/data/absorption/page.tsx').includes('href="/data/listing-duration"'), 'absorption links the page');
ok(read('src/app/sitemap.ts').includes("'/data/listing-duration'"), 'sitemap lists the page');

console.log(fail ? `FAILED — ${pass} passed, ${fail} failed` : `ALL PASS — ${pass} passed, 0 failed`);
if (fail) process.exit(1);
