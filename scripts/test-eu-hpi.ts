/**
 * Tests for the Eurostat house price layer behind /europe/official.
 *
 * The parser must throw when prc_hpi_q stops meaning what we think it means.
 * A blank cell stays null. The asking tape does not invent a median for a
 * country with too few priced listings, and a short run inside a quarter is
 * not published as a quarterly rate. The committed data/eu-hpi.json is
 * checked for real Eurostat figures and a Spain-only asking tape.
 *
 *   npx tsx scripts/test-eu-hpi.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  MIN_PRICED_LISTINGS,
  MIN_QUARTER_CAPTURE_DAYS,
  SINCE_PERIOD,
  askingChangeInsideQuarter,
  askingDayFromListings,
  calendarGaps,
  countryCode,
  eurostatHpiUrl,
  mergeAskingDays,
  parseEurostatHpi,
  type AskingDay,
  type EuHpiLayer,
} from '../src/lib/data-sources/eu-hpi';
import { buildEuHpiView } from '../src/lib/eu-hpi-view';

let pass = 0;
let fail = 0;
function check(name: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}\n        got  ${g}\n        want ${w}`); }
}
function throws(name: string, fn: () => unknown, mustMention?: string) {
  try { fn(); fail++; console.log(`  FAIL  ${name}\n        returned normally; wanted a throw`); }
  catch (e) {
    const msg = (e as Error).message;
    if (mustMention && !msg.includes(mustMention)) { fail++; console.log(`  FAIL  ${name}\n        threw "${msg}", wanted mention of "${mustMention}"`); }
    else { pass++; console.log(`  PASS  ${name}`); }
  }
}

const GEOS = ['ES', 'PT', 'EU27_2020', 'EA20'];
const TIMES: string[] = [];
for (let i = 0; i < 20; i++) TIMES.push(`${2015 + Math.floor(i / 4)}-Q${(i % 4) + 1}`);

function fixture(mutate?: (payload: Record<string, unknown>) => void) {
  const size = [1, 2, 2, 4, TIMES.length];
  const off = (coords: number[]) => coords.reduce((idx, c, k) => idx * size[k] + c, 0);
  const value: Record<string, number> = {};
  ['TOTAL', 'DW_NEW'].forEach((_, pi) => ['I15_Q', 'RCH_A'].forEach((unit, ui) => GEOS.forEach((_, gi) => TIMES.forEach((_, ti) => {
    value[String(off([0, pi, ui, gi, ti]))] = unit === 'I15_Q' ? 100 + ti + gi : 1.2 + pi;
  }))));
  const payload: Record<string, unknown> = {
    version: '2.0',
    class: 'dataset',
    label: 'House price index - quarterly data',
    source: 'ESTAT',
    updated: '2026-10-01T11:00:00+0200',
    value,
    status: { [String(off([0, 1, 1, 0, TIMES.length - 1]))]: 'p' },
    id: ['freq', 'purchase', 'unit', 'geo', 'time'],
    size,
    dimension: {
      freq: { category: { index: { Q: 0 }, label: { Q: 'Quarterly' } } },
      purchase: { category: { index: { TOTAL: 0, DW_NEW: 1 }, label: { TOTAL: 'Total', DW_NEW: 'Purchases of newly built dwellings' } } },
      unit: { category: { index: { I15_Q: 0, RCH_A: 1 }, label: { I15_Q: 'Quarterly index, 2015=100', RCH_A: 'Annual rate of change' } } },
      geo: { category: { index: Object.fromEntries(GEOS.map((g, i) => [g, i])), label: { ES: 'Spain', PT: 'Portugal', EU27_2020: 'European Union - 27 countries (from 2020)', EA20: 'Euro area' } } },
      time: { category: { index: Object.fromEntries(TIMES.map((t, i) => [t, i])), label: Object.fromEntries(TIMES.map((t) => [t, t])) } },
    },
    extension: { id: 'PRC_HPI_Q', annotation: [{ title: 'doi 10.2908/PRC_HPI_Q' }] },
  };
  mutate?.(payload);
  return payload;
}

const parsed = parseEurostatHpi(fixture()).parsed;
const es = parsed.geos.find((g) => g.code === 'ES')!;
check('starts at the index base quarter', es.quarters[0].period, SINCE_PERIOD);
check('twenty quarters', es.quarters.length, 20);
check('Spain new index at the last fixture quarter', es.quarters.at(-1)?.new_index, 119);
check('provisional flag kept on the Spain new annual rate', es.quarters.at(-1)?.new_yoy_status, 'p');
check('Portugal label is Eurostat\'s', parsed.geos.find((g) => g.code === 'PT')?.name, 'Portugal');

const holed = fixture((payload) => {
  const value = payload.value as Record<string, number>;
  const size = payload.size as number[];
  const off = (coords: number[]) => coords.reduce((idx, c, k) => idx * size[k] + c, 0);
  delete value[String(off([0, 1, 0, 0, 3]))];
});
const holedEs = parseEurostatHpi(holed).parsed.geos.find((g) => g.code === 'ES')!;
check('a missing cell stays null', holedEs.quarters[3].new_index, null);
check('a missing cell is not stored as zero', holedEs.quarters[3].new_index === 0, false);

throws('wrong dataset id', () => parseEurostatHpi(fixture((p) => { (p.extension as { id: string }).id = 'OTHER'; })), 'PRC_HPI_Q');
throws('missing DOI', () => parseEurostatHpi(fixture((p) => { (p.extension as { annotation: unknown }).annotation = []; })), 'DOI');
throws('non-numeric value', () => parseEurostatHpi(fixture((p) => { (p.value as Record<string, unknown>)['0'] = 'x'; })), 'not a finite number');
throws('non-positive index', () => parseEurostatHpi(fixture((p) => { (p.value as Record<string, number>)['0'] = 0; })), 'not positive');
throws('short history', () => parseEurostatHpi(fixture((p) => {
  const time = (((p.dimension as Record<string, { category: { index: Record<string, number>; label: Record<string, string> } }>).time));
  time.category.index = { '2015-Q1': 0, '2015-Q2': 1, '2015-Q3': 2, '2015-Q4': 3 };
  time.category.label = { '2015-Q1': '2015-Q1', '2015-Q2': '2015-Q2', '2015-Q3': '2015-Q3', '2015-Q4': '2015-Q4' };
  (p.size as number[])[4] = 4;
})), 'quarters');
throws('latest Spain cell missing', () => parseEurostatHpi(fixture((p) => {
  const value = p.value as Record<string, number>;
  const size = p.size as number[];
  const off = (coords: number[]) => coords.reduce((idx, c, k) => idx * size[k] + c, 0);
  delete value[String(off([0, 1, 0, 0, TIMES.length - 1]))];
})), 'missing');
throws('not an object', () => parseEurostatHpi(null), 'object');
check('optional geo absent is an omission', parseEurostatHpi(fixture(), ['FR']).missingGeos, ['FR']);
check('query asks for the four required geos', ['ES', 'PT', 'EU27_2020', 'EA20'].every((g) => eurostatHpiUrl([]).includes(`geo=${g}`)), true);

function book(date: string, n: number, price: number, location = 'Marbella, Málaga', country?: string): AskingDay {
  return askingDayFromListings(date, Array.from({ length: n }, () => ({ location, country: country ?? null, askingEurM2: price })));
}

check('country from a Spanish location', countryCode('Marbella, Málaga', null), 'ES');
check('unmapped location stays unmapped', countryCode('Paris', null), null);
check('Greece uses Eurostat EL', countryCode('Athens', 'GR'), 'EL');
check('explicit PT is not rewritten as Spain', countryCode('Marbella, Málaga', 'PT'), 'PT');
const priced = book('2026-08-05', MIN_PRICED_LISTINGS, 4000);
check('thirty priced listings publish a median', priced.countries[0], { code: 'ES', listings: 30, priced_listings: 30, median_asking_eur_m2: 4000 });
check('twenty-nine priced listings publish no median', book('2026-08-05', MIN_PRICED_LISTINGS - 1, 4000).countries[0].median_asking_eur_m2, null);
check('even count averages the two middle prices', askingDayFromListings('2026-08-05', [
  ...Array.from({ length: 15 }, () => ({ location: 'X, Málaga', askingEurM2: 1000 })),
  ...Array.from({ length: 15 }, () => ({ location: 'X, Málaga', askingEurM2: 2000 })),
]).countries[0].median_asking_eur_m2, 1500);
const gapDay = book('2026-10-14', 30, 4000);
check('declared capture gap is flagged', gapDay.during_declared_capture_gap, true);
check('a row with no province is unmapped', askingDayFromListings('2026-08-05', [
  ...Array.from({ length: 30 }, () => ({ location: 'X, Málaga', askingEurM2: 3000 })),
  { location: 'Paris', askingEurM2: 9000 },
]).unmapped_listings, 1);

const older = [book('2026-08-01', 30, 5000), book('2026-08-02', 30, 5100), book('2026-08-03', 30, 5200)];
const kept = mergeAskingDays(older, [book('2026-10-28', 30, 100)], book('2026-10-28', 30, 5600));
check('a one-day rebuild does not wipe the stored tape', kept.map((d) => d.date), ['2026-08-01', '2026-08-02', '2026-08-03', '2026-10-28']);
check('the current book replaces the same day', kept.at(-1)?.countries[0].median_asking_eur_m2, 5600);
const full = [book('2026-08-01', 30, 5000), book('2026-08-02', 30, 5001), book('2026-08-03', 30, 5002), book('2026-08-04', 30, 5003)];
check('a full rebuild that reaches the start replaces the tape', mergeAskingDays(older, full, book('2026-08-04', 30, 5003)).length, 4);
throws('no Spain median refuses to publish', () => mergeAskingDays(older, null, askingDayFromListings('2026-10-28', [{ location: 'Paris', askingEurM2: 1 }])), 'Spain');

const q2 = [book('2026-04-07', 30, 4713), book('2026-04-08', 30, 5368)];
check('two days inside a quarter are not a rate', askingChangeInsideQuarter(q2, 'ES', '2026-Q2'), null);
const q3: AskingDay[] = [];
for (let i = 0; i < MIN_QUARTER_CAPTURE_DAYS; i++) q3.push(book(`2026-08-${String(1 + i * 4).padStart(2, '0')}`, 30, 5000 + i * 10));
const q3change = askingChangeInsideQuarter(q3, 'ES', '2026-Q3');
check('eight days across 28 days publish a change', q3change && { days: q3change.capture_days, from: q3change.first_median, to: q3change.last_median }, { days: 8, from: 5000, to: 5070 });
check('calendar holes are listed and not filled', calendarGaps(['2026-04-08', '2026-08-04']).some((g) => g.start === '2026-04-09' && g.end === '2026-08-03' && g.missing_days === 117), true);

const committed = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'eu-hpi.json'), 'utf8')) as EuHpiLayer;
check('committed layer is ready', committed.status, 'ready');
check('committed series starts at 2015-Q1', committed.source.first_period, '2015-Q1');
check('committed latest quarter is a quarter', /^\d{4}-Q[1-4]$/.test(committed.source.latest_period), true);
check('committed DOI', committed.source.doi, '10.2908/PRC_HPI_Q');
check('committed licence names the dataset', committed.source.licence_note.includes('prc_hpi_q') && committed.source.licence_note.includes('Eurostat'), true);
check('four required geos', committed.geos.map((g) => g.code), ['ES', 'PT', 'EU27_2020', 'EA20']);
for (const geo of committed.geos) {
  const last = geo.quarters[geo.quarters.length - 1];
  check(`${geo.code} latest quarter matches the file`, last.period, committed.source.latest_period);
  check(`${geo.code} latest new index is positive`, last.new_index != null && last.new_index > 50 && last.new_index < 1000, true);
  check(`${geo.code} latest new annual change is a finite rate`, last.new_yoy_pct != null && last.new_yoy_pct > -40 && last.new_yoy_pct < 40, true);
  check(`${geo.code} latest total index is positive`, last.total_index != null && last.total_index > 50, true);
  check(`${geo.code} has no non-positive index`, geo.quarters.every((q) => (q.new_index == null || q.new_index > 0) && (q.total_index == null || q.total_index > 0)), true);
}
const medians = new Set<string>();
for (const day of committed.avena.days) {
  for (const c of day.countries) if (c.median_asking_eur_m2 != null) medians.add(c.code);
  check(`${day.date} median is null or from enough priced listings`, day.countries.every((c) => c.median_asking_eur_m2 == null ? c.priced_listings < MIN_PRICED_LISTINGS : c.priced_listings >= MIN_PRICED_LISTINGS && c.median_asking_eur_m2 > 0), true);
}
check('committed asking medians are Spain only', [...medians], ['ES']);
const lastEs = committed.avena.days.at(-1)!.countries.find((c) => c.code === 'ES')!;
check('latest Spain asking median is in a plausible band', lastEs.median_asking_eur_m2 != null && lastEs.median_asking_eur_m2 > 1000 && lastEs.median_asking_eur_m2 < 20000, true);
check('latest tape day maps every listing', committed.avena.days.at(-1)!.unmapped_listings, 0);
check('the spring-to-summer hole is recorded', calendarGaps(committed.avena.days.map((d) => d.date)).some((g) => g.start === '2026-04-09' && g.end === '2026-08-03'), true);
check('latest Eurostat quarter does not get a made-up asking rate', askingChangeInsideQuarter(committed.avena.days, 'ES', committed.source.latest_period), null);

const page = readFileSync(join(__dirname, '..', 'src', 'app', 'europe', 'official', 'page.tsx'), 'utf8');
check('page cites the dataset and the DOI', page.includes('prc_hpi_q') && page.includes('10.2908/PRC_HPI_Q'), true);
check('page links the JSON route', page.includes('/api/v1/eu-hpi'), true);
check('page does not use the gold gradient', page.includes('--av-gradient-gold'), false);
const workflow = readFileSync(join(__dirname, '..', '.github', 'workflows', 'eu-hpi-refresh.yml'), 'utf8');
check('weekly job reads full history and fails closed', workflow.includes('fetch-depth: 0') && workflow.includes('npx tsx scripts/ingest-eu-hpi.ts') && !workflow.includes('ingest-eu-hpi.ts || true'), true);

const view = buildEuHpiView(committed, [{ location: 'Marbella, Málaga', askingEurM2: 4000 }], '2026-10-28');
check('view keeps the committed Eurostat quarter', view.source.latest_period, committed.source.latest_period);
check('a one-listing book does not invent a current median', view.current_book.countries.find((c) => c.code === 'ES')?.median_asking_eur_m2 ?? null, null);

if (fail) {
  console.log(`\nFAILED — ${pass} passed, ${fail} failed`);
  process.exit(1);
}
console.log(`\nALL PASS — ${pass}`);
