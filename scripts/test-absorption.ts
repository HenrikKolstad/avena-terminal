/**
 * Public absorption snapshot.
 *
 * The groups are the Sell-Through Monitor's GroupStats, unchanged.
 * The public file has no project rows, no listing references and no watchlist.
 *
 * Run: npx tsx scripts/test-absorption.ts
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  ABSORPTION_PLAIN,
  GROUP_COLUMNS,
  csvForLevel,
  findForbiddenKey,
  forLevel,
  publicFromMonitor,
  readAbsorption,
  weekOverlapsKnownGap,
} from '../src/lib/absorption';
import { KNOWN_GAPS, SERIES_START, computeMonitor, type RefMeta, type RefSeries } from '../src/lib/sellthrough';

let pass = 0;
let fail = 0;
const ok = (cond: boolean, label: string) => {
  if (cond) { pass++; console.log(`  ok  ${label}`); }
  else { fail++; console.error(`  FAIL ${label}`); }
};

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const S = (ref: string, town: string, region: string, type: string, first: string, last: string, pts: Array<[string, number]>): RefSeries =>
  ({ ref, town, region, type, firstSeen: first, lastSeen: last, points: pts });

const series: RefSeries[] = [
  S('N7397', 'Estepona', 'costa-del-sol', 'Apartment', '2026-08-05', '2026-10-21', [['2026-08-05', 514000], ['2026-09-04', 519000], ['2026-09-24', 507000], ['2026-10-21', 489000]]),
  S('N7398', 'Estepona', 'costa-del-sol', 'Apartment', '2026-08-05', '2026-10-21', [['2026-08-05', 449000], ['2026-09-24', 414000], ['2026-10-21', 379000]]),
  S('N7399', 'Estepona', 'costa-del-sol', 'Apartment', '2026-08-05', '2026-10-21', [['2026-08-05', 575000], ['2026-09-24', 534000], ['2026-10-21', 488000]]),
  S('N7401', 'Estepona', 'costa-del-sol', 'Penthouse', '2026-08-05', '2026-10-21', [['2026-08-05', 774000], ['2026-10-21', 752000]]),
  S('N10025', 'Guardamar del Segura', 'cb-south', 'Penthouse', '2026-09-26', '2026-10-13', [['2026-09-26', 339500], ['2026-10-13', 339500]]),
  S('N6962', 'Torre Pacheco', 'costa-calida', 'Villa', '2026-08-05', '2026-10-13', [['2026-08-05', 674500], ['2026-10-13', 674500]]),
  S('N10000', 'El Campello', 'cb-north', 'Townhouse', '2026-09-13', '2026-09-25', [['2026-09-13', 1054000], ['2026-09-25', 1054000]]),
];
const m = (dev: string, m2: number, first: string, delivery = '2028-Q2'): RefMeta => ({ dev, status: 'under-construction', delivery, beds: 2, m2, first });
const meta: Record<string, RefMeta> = {
  N7397: m('P01007', 102, '2026-04-08'), N7398: m('P01007', 81, '2026-04-08'), N7399: m('P01007', 103, '2026-04-08'), N7401: m('P01007', 108, '2026-08-04'),
  N10025: m('PX1', 80, '2026-09-26', '2026-Q4'), N6962: m('PX2', 200, '2026-03-31'), N10000: m('PX3', 150, '2026-09-13'),
};

console.log('public aggregate matches computeMonitor');
const monitor = computeMonitor(series, meta, { asOf: '2026-10-21', windowDays: 30 });
const pub = publicFromMonitor(monitor);
ok(pub.seriesStart === SERIES_START && pub.seriesStart === '2026-08-05', 'series starts 2026-08-05');
ok(JSON.stringify(pub.knownGaps) === JSON.stringify(KNOWN_GAPS.map((gap) => ({ from: gap.from, to: gap.to }))), 'known gap is 2026-10-14 to 2026-10-20');
ok(JSON.stringify(pub.coast) === JSON.stringify(monitor.market), 'coast is the monitor market group, field for field');
ok(JSON.stringify(pub.regions) === JSON.stringify(monitor.regions), 'regions are the monitor regions');
ok(JSON.stringify(pub.towns) === JSON.stringify(monitor.towns), 'towns are the monitor towns');
ok(JSON.stringify(pub.weekly) === JSON.stringify(monitor.weekly), 'weekly flow is the monitor weekly flow');
ok(pub.coverage.developments === monitor.coverage.projects && pub.coverage.live === 4 && pub.coverage.exitsSinceStart === 3, 'coverage keeps the counts and renames the project count');
ok(pub.coast.live === 4 && pub.coast.exitsWindow === 3, 'coast live and window exits match the fixture');
ok(pub.towns.some((town) => town.label === 'Estepona' && town.live === 4), 'Estepona town row is present');
ok(pub.methodology.some((line) => line.includes('not a confirmed sale')) && pub.methodology.some((line) => line.includes('not called sales')), 'methodology refuses to call an exit a sale');
ok(ABSORPTION_PLAIN.days.toLowerCase().includes('days to sell are not estimated'), 'days to sell are explicitly not estimated');

console.log('no project payload');
const serial = JSON.stringify(pub);
ok(findForbiddenKey(pub) === null, 'no project, ref or watchlist key');
ok(!serial.includes('"projects"') && !serial.includes('"recentCuts"') && !serial.includes('"recentExits"'), 'serialised file has no project arrays');
ok(!serial.includes('P01007') && !serial.includes('N7397') && !serial.includes('PX1'), 'fixture project ids and listing refs are not in the public file');
const coastOnly = forLevel(pub, 'coast');
const regionOnly = forLevel(pub, 'region');
const townOnly = forLevel(pub, 'town');
ok(!('regions' in coastOnly) && !('towns' in coastOnly) && 'coast' in coastOnly, 'level=coast keeps the coast group only');
ok(!('coast' in regionOnly) && !('towns' in regionOnly) && 'regions' in regionOnly, 'level=region keeps region rows only');
ok(!('coast' in townOnly) && !('regions' in townOnly) && 'towns' in townOnly, 'level=town keeps town rows only');
let threw = false;
try { forLevel(pub, 'project'); } catch { threw = true; }
ok(threw, 'level=project is rejected');
const csv = csvForLevel(pub, null);
ok(csv.filename.includes('town') && csv.body.split('\n')[0] === GROUP_COLUMNS.join(','), 'CSV defaults to town rows and the GroupStats header');
ok(csv.body.includes('Estepona') && !csv.body.includes('P01007') && !csv.body.includes('N7397'), 'town CSV has the town and not the project');
ok(weekOverlapsKnownGap('2026-10-12') && weekOverlapsKnownGap('2026-10-19') && !weekOverlapsKnownGap('2026-10-05'), 'gap weeks are the weeks that touch 14–20 October');

console.log('published file');
const file = readAbsorption();
ok(file.coverage.listingsObserved >= 500 && file.coverage.live >= 500, 'published book is the full capture, not the seven-row fixture');
ok(file.coast.live + file.coast.exitsSinceStart === file.coverage.listingsObserved, 'coast live plus exits equals listings observed');
ok(file.towns.length >= 8 && file.regions.length >= 1, 'published file has towns and regions');
ok(file.towns.every((town) => GROUP_COLUMNS.every((column) => column in town)), 'every town row has the GroupStats fields');
ok(findForbiddenKey(file) === null && !JSON.stringify(file).includes('"projects"'), 'published file has no project key');
ok(file.asOf >= '2026-10-21' && file.seriesStart === '2026-08-05', 'published as-of is after the outage and the series start is the epoch');
ok(file.methodology.includes(ABSORPTION_PLAIN.exit) && file.methodology.includes(ABSORPTION_PLAIN.gap), 'published methodology carries the exit and gap sentences');

console.log('surfaces');
const page = read('src/app/data/absorption/page.tsx');
const route = read('src/app/api/v1/absorption/route.ts');
const workflow = read('.github/workflows/absorption-refresh.yml');
const builder = read('scripts/build-absorption.ts');
const lender = read('src/app/api/v1/lender/monitor/route.ts');
const report = read('src/app/lender/report/route.ts');
ok(page.includes('ABSORPTION_PLAIN.exit') && page.includes('ABSORPTION_PLAIN.days') && page.includes('ABSORPTION_PLAIN.gap'), 'page renders the exit, days-to-sell refusal and the gap');
ok(page.includes('href="/api/v1/absorption"') && page.includes('format=csv') && page.includes('/data/price-index') && page.includes('/spain/short-let-rules'), 'page links JSON, CSV, the price index and short-let rules');
ok(route.includes('csvForLevel') && route.includes('text/csv') && !route.includes('x-avena-key') && !route.includes('checkLenderKey'), 'public API serves CSV and does not ask for a lender key');
ok(builder.includes('computeMonitor') && builder.includes('loadMonitorInputs') && builder.includes('publicFromMonitor'), 'rebuild uses the monitor, the snapshot loader and the public cut');
ok(workflow.includes('scripts/build-absorption.ts') && workflow.includes('data/absorption.json') && workflow.includes('SUPABASE_SERVICE_ROLE_KEY'), 'morning workflow rebuilds the file from Supabase');
ok(!read('.github/workflows/vintages-freeze.yml').includes('build-absorption'), 'the vintage freeze does not build absorption');
ok(lender.includes('checkLenderKey') && lender.includes('x-avena-key') && lender.includes('status: 401'), 'lender monitor still requires the key');
ok(report.includes('checkLenderKey') && report.includes('x-avena-key'), 'lender report still requires the key');
const surface = [page, route, read('src/lib/absorption.ts'), read('src/components/v2/Footer.tsx')].join('\n');
ok(!/RICS/i.test(page + route), 'no RICS claim on the absorption surfaces');
ok(!/€\s?79|\/\s?month|per month|subscription/i.test(surface), 'no plan price on the absorption surfaces or the footer');
ok(read('src/components/v2/Footer.tsx').includes("href: '/data/absorption'"), 'footer links the page');
ok(read('src/app/official/page.tsx').includes('href="/data/absorption"'), 'official hub links the page');
ok(read('src/app/data/price-index/page.tsx').includes('href="/data/absorption"'), 'price index links the page');
ok(read('src/app/due-diligence/page.tsx').includes('href="/data/absorption"'), 'due diligence links the page');
ok(read('src/app/methodology/page.tsx').includes('href="/data/absorption"'), 'methodology links the page');
ok(read('src/app/sitemap.ts').includes("'/data/absorption'"), 'sitemap lists the page');

console.log(fail ? `FAILED — ${pass} passed, ${fail} failed` : `ALL PASS — ${pass} passed, 0 failed`);
if (fail) process.exit(1);
