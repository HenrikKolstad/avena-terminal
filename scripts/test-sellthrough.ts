/**
 * Tests for src/lib/sellthrough.ts, sellthrough-data.ts (compressRows),
 * sellthrough-format.ts and lender-access.ts.
 *
 * Fixture series are REAL price_snapshots rows read from Supabase on
 * 2026-10-22 (project P01007 in Estepona: six listings, cut twice), plus
 * two listings that left inside the 2026-10-14..20 outage.
 *
 * Run: npx tsx scripts/test-sellthrough.ts
 */
import { computeMonitor, movesOf, inKnownGap, type RefSeries, type RefMeta } from '../src/lib/sellthrough';
import { compressRows } from '../src/lib/sellthrough-data';
import { projectsToCsv } from '../src/lib/sellthrough-format';
import { checkLenderKey, parseKeys } from '../src/lib/lender-access';
import { renderReportHtml } from '../src/lib/sellthrough-report';

let pass = 0;
let fail = 0;
const ok = (cond: boolean, label: string) => {
  if (cond) { pass++; console.log(`  ok  ${label}`); } else { fail++; console.error(`  FAIL ${label}`); }
};

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

console.log('movesOf');
const mv = movesOf(series[0]);
ok(mv.length === 3, 'N7397 has 3 moves (one rise, two cuts)');
ok(mv[0].pct > 0 && mv[1].pct < 0 && mv[2].pct < 0, 'signs: +, -, -');
ok(movesOf(series[4]).length === 0, 'unchanged price yields no move');

console.log('gap handling');
ok(inKnownGap('2026-10-13'), 'last seen 10-13 is an exit inside the outage');
ok(!inKnownGap('2026-09-25'), 'last seen 09-25 is not');

console.log('computeMonitor');
const r = computeMonitor(series, meta, { asOf: '2026-10-21', windowDays: 30 });
ok(r.coverage.live === 4, '4 live listings');
ok(r.coverage.exitsSinceStart === 3, '3 exits');
ok(r.coverage.exitsInGap === 2, '2 exits inside gap');
ok(r.market.exitsWindow === 3, 'all 3 exits fall in the 30-day window');
const p = r.projects.find((x) => x.project === 'P01007')!;
ok(!!p && p.live === 4 && p.exitsSinceStart === 0, 'P01007: 4 live, 0 exits');
ok(p.cutsSinceStart === 7 && p.risesSinceStart === 1, 'P01007 (4 of its 6 listings): 7 cuts, 1 rise');
ok(p.cutsWindow === 7, 'P01007: all 7 cuts inside the 30-day window (09-24 and 10-21)');
ok(p.flags.includes('REPEAT_CUTS'), 'P01007 flagged REPEAT_CUTS');
ok(!p.flags.includes('SOLD_OUT'), 'P01007 not SOLD_OUT');
ok(p.netPriceChangePct !== null && p.netPriceChangePct < -9 && p.netPriceChangePct > -12, `P01007 median net change ~ -10% (got ${p.netPriceChangePct})`);
const px1 = r.projects.find((x) => x.project === 'PX1')!;
ok(px1.flags.includes('SOLD_OUT') && px1.flags.includes('EXIT_IN_GAP'), 'PX1 SOLD_OUT + EXIT_IN_GAP');
ok(r.recentCuts.every((c) => c.pct < 0), 'recentCuts are all cuts');
ok(r.recentCuts.length === 7, '7 cuts in window');
ok(r.weekly.length > 10 && r.weekly.reduce((n, w) => n + w.exits, 0) === 3, 'weekly exits sum to total exits');
const gapWeek = r.weekly.find((w) => w.week === '2026-10-12')!;
ok(gapWeek && gapWeek.daysObserved === 2, 'week of 10-12 has 2 observed days (12th, 13th)');
ok(r.methodology.some((l) => l.includes('not called sales')), 'methodology states exits are not sales');

console.log('filters');
const w = computeMonitor(series, meta, { asOf: '2026-10-21', projects: ['p01007'] });
ok(w.coverage.listingsObserved === 4 && w.projects.length === 1, 'project watchlist is case-insensitive and exclusive');
const t = computeMonitor(series, meta, { asOf: '2026-10-21', towns: ['estepona'] });
ok(t.towns.length === 1 && t.towns[0].label === 'Estepona', 'town filter');
const g = computeMonitor(series, meta, { asOf: '2026-10-21', region: 'cb-south' });
ok(g.coverage.listingsObserved === 1, 'region filter');

console.log('compressRows');
const c = compressRows([
  { ref: 'A', snapshot_date: '2026-08-05', price: '100', town: 'X', region: 'r', type: 'T' },
  { ref: 'A', snapshot_date: '2026-08-06', price: '100', town: 'X', region: 'r', type: 'T' },
  { ref: 'A', snapshot_date: '2026-08-07', price: '90', town: 'X', region: 'r', type: 'T' },
  { ref: 'A', snapshot_date: '2026-08-08', price: null, town: 'X', region: 'r', type: 'T' },
]);
ok(c.length === 1 && c[0].points.length === 2 && c[0].lastSeen === '2026-08-07', 'keeps change points, skips null price');

console.log('csv + report');
const csv = projectsToCsv(r.projects);
ok(csv.split('\n')[0].startsWith('project,town,region'), 'csv header');
ok(csv.includes('REPEAT_CUTS'), 'csv carries flags');
const html = renderReportHtml(r);
ok(html.includes('noindex') && html.includes('P01007') && !html.includes('undefined') && !html.includes('NaN'), 'report renders, noindex, no undefined/NaN');

console.log('lender access');
const K = 'lender-test-key-0123456789abcdef';
ok(checkLenderKey(K, `acme:${K}`).ok, 'valid labelled key');
ok(checkLenderKey(K, `acme:${K}`).label === 'acme', 'label returned');
ok(!checkLenderKey('wrong', `acme:${K}`).ok, 'wrong key refused');
ok(!checkLenderKey(K, undefined).ok, 'no env, no access');
ok(!checkLenderKey(null, K).ok, 'missing key refused');
ok(parseKeys('short').length === 0, 'short keys are ignored');

console.log(fail ? `\nFAILED — ${pass} passed, ${fail} failed` : `\nALL PASS — ${pass} passed, 0 failed`);
if (fail) process.exit(1);
