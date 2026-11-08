/**
 * Tests for the official-statistics summary behind /official.
 *
 * The gap maths is tested on fixtures: a missing side stays null, a true zero
 * stays zero, and widening is flagged only when an earlier snapshot of that
 * same gap is passed in. The live summary is checked against the existing
 * views, not against a frozen euro value.
 *
 *   npx tsx scripts/test-official-summary.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import type { AskingDay } from '../src/lib/data-sources/eu-hpi';
import { askingVsAppraisalPct } from '../src/lib/data-sources/ine-es';
import { getEsBenchmark } from '../src/lib/es-official-view';
import { getEsRents } from '../src/lib/es-rents-view';
import { getEsTownGap } from '../src/lib/es-town-gap-view';
import {
  LAYER_REFRESH,
  buildOfficialSummary,
  compareToPrevious,
  laterAskingRuns,
  medianRounded,
  yieldSpreadPp,
  type OfficialSummaryInput,
} from '../src/lib/official-summary';
import { getOfficialSummary } from '../src/lib/official-summary-view';
import { getPtOfficial } from '../src/lib/pt-official-view';

let pass = 0;
let fail = 0;
function check(name: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}\n        got  ${g}\n        want ${w}`); }
}
function checkTrue(name: string, ok: boolean) {
  check(name, ok, true);
}

function day(date: string, median: number): AskingDay {
  return {
    date,
    during_declared_capture_gap: false,
    unmapped_listings: 0,
    countries: [{ code: 'ES', listings: 40, priced_listings: 40, median_asking_eur_m2: median }],
  };
}

function base(): OfficialSummaryInput {
  return {
    generated_at: ['2026-10-28T00:00:00.000Z'],
    book_date: '2026-11-01',
    priors: [],
    spain: {
      source: 'Ministry',
      source_url: 'https://example.test/appraisal',
      latest_period: '2026-Q2',
      retrieved_at: '2026-10-28',
      omissions: [],
      provinces: [],
    },
    notary: {
      source: 'CIEN',
      source_url: 'https://example.test/cien',
      latest_period: '2026-08',
      retrieved_at: '2026-10-30',
      provinces: [],
    },
    municipal: {
      source: 'Ministry sheet',
      source_url: null,
      period: '2026-Q2',
      retrieved_at: '2026-10-30',
      min_priced_listings: 8,
      towns: [],
    },
    rents: {
      source: 'SERPAVI',
      source_url: null,
      year: 2024,
      retrieved_at: '2026-10-31',
      provinces: [],
    },
    supply: {
      source: 'Ministry supply',
      source_url: null,
      starts_period: '2026-06',
      sales_period: '2026-08',
      retrieved_at: '2026-10-27',
    },
    eurostat: {
      source: 'Eurostat',
      source_url: null,
      latest_period: '2026-Q2',
      retrieved_at: '2026-10-29',
      spain_new_yoy_pct: 7.3,
      portugal_new_yoy_pct: 12.3,
      tape_date: '2026-10-28',
      tape_spain_asking_eur_m2: 5000,
      book_date: '2026-11-01',
      book_spain_asking_eur_m2: 5100,
      book_note: 'book note',
      asking_days: [],
    },
    portugal: {
      source: 'INE Portugal',
      source_url: null,
      latest_period: '2026-09',
      retrieved_at: '2026-11-01',
      portuguese_listings: 0,
      listing_book: 10,
      regions: [],
    },
  };
}

console.log('gap maths');
check('level gap matches the Spain formula', askingVsAppraisalPct(110, 100), 10);
check('a blank appraisal is null, not zero', askingVsAppraisalPct(100, null), null);
check('a zero appraisal is null, not a gap', askingVsAppraisalPct(100, 0), null);
check('a true zero gap stays zero', askingVsAppraisalPct(100, 100), 0);
check('yield spread', yieldSpreadPp(5.2, 1.5), 3.7);
check('yield spread stays null when Avena is missing', yieldSpreadPp(null, 1.5), null);
check('median of two', medianRounded([10, 30]), 20);
check('median of three', medianRounded([10, 20, 40]), 20);
check('widened when the absolute gap grows', compareToPrevious(40, 10).direction, 'widened');
check('narrowed when the absolute gap shrinks', compareToPrevious(-10, -30).direction, 'narrowed');
check('unchanged when the gap is the same', compareToPrevious(10, 10).direction, 'unchanged');
check('a sign change that grows still widened', compareToPrevious(-30, 10).direction, 'widened');

const input = base();
input.spain.provinces = [
  { name: 'Alpha', slug: 'alpha', listings: 10, avena_eur_m2: 150, official_eur_m2: 100, official_period: '2026-Q2', ine_new_yoy_pct: 4, ine_new_yoy_period: '2026-Q2', ine_territory_equals_province: false },
  { name: 'Beta', slug: 'beta', listings: 4, avena_eur_m2: 80, official_eur_m2: null, official_period: null, ine_new_yoy_pct: null, ine_new_yoy_period: null, ine_territory_equals_province: true },
  { name: 'Gamma', slug: 'gamma', listings: 8, avena_eur_m2: 100, official_eur_m2: 100, official_period: '2026-Q2', ine_new_yoy_pct: null, ine_new_yoy_period: null, ine_territory_equals_province: true },
];
input.municipal.towns = [
  { town: 'One', province: 'Alpha', province_key: 'alpha', listings: 12, priced_listings: 12, status: 'gap', avena_eur_m2: 200, official_eur_m2: 100, gap_pct: 100, all_ages_gap_pct: 50, all_ages_official_eur_m2: 120 },
  { town: 'Two', province: 'Alpha', province_key: 'alpha', listings: 9, priced_listings: 9, status: 'gap', avena_eur_m2: 130, official_eur_m2: 100, gap_pct: 30, all_ages_gap_pct: null, all_ages_official_eur_m2: null },
  { town: 'Three', province: 'Beta', province_key: 'beta', listings: 3, priced_listings: 3, status: 'insufficient', avena_eur_m2: null, official_eur_m2: null, gap_pct: null, all_ages_gap_pct: null, all_ages_official_eur_m2: null },
  { town: 'Four', province: 'Beta', province_key: 'beta', listings: 20, priced_listings: 20, status: 'all_ages_only', avena_eur_m2: 140, official_eur_m2: null, gap_pct: null, all_ages_gap_pct: 40, all_ages_official_eur_m2: 100 },
];
input.rents.provinces = [
  { name: 'Alpha', slug: 'alpha', listings: 10, avena_asking_eur_m2: 150, avena_gross_yield_pct: 5.2, official_rent_eur_m2_month: 6.2, official_period: '2024', implied_flat_gross_yield_pct: 1.5, implied_house_gross_yield_pct: 1.1 },
  { name: 'Beta', slug: 'beta', listings: 4, avena_asking_eur_m2: 80, avena_gross_yield_pct: null, official_rent_eur_m2_month: 5, official_period: '2024', implied_flat_gross_yield_pct: 1.4, implied_house_gross_yield_pct: null },
];
input.portugal.regions = [
  { name: 'Algarve', slug: 'algarve', appraisal_eur_m2: 2953, appraisal_period: '2026-09', sales_new_eur_m2: 3668, sales_period: '2026-Q2' },
];
input.priors = [{ id: 'es-official:alpha', gap: 10, as_of: '2026-Q1' }];

const built = buildOfficialSummary(input);
const alpha = built.price_gaps.find((r) => r.slug === 'alpha');
const beta = built.price_gaps.find((r) => r.slug === 'beta');
const gamma = built.price_gaps.find((r) => r.slug === 'gamma');
check('alpha gap is the formula', alpha?.gap_pct, 50);
check('beta stays missing', beta?.status === 'missing' && beta.gap_pct === null, true);
check('gamma zero is compared', gamma?.status === 'compared' && gamma.gap_pct === 0, true);
check('ranked widest first', built.price_gaps.map((r) => r.slug), ['alpha', 'gamma', 'beta']);
check('headline is the median of the two real gaps', built.layers.find((l) => l.id === 'es-official')?.headline.value, 25);
check('headline leaves the missing province out', built.layers.find((l) => l.id === 'es-official')?.headline.places, 2);
check('alpha widened against the snapshot', alpha?.previous?.direction, 'widened');
check('beta prior does not exist, so no widening flag', beta?.previous, null);
check('history is partial', built.history.status, 'partial');
check('one widened row', built.history.rows_widened, 1);

const alphaProvince = built.municipal_provinces.find((r) => r.province_key === 'alpha');
const betaProvince = built.municipal_provinces.find((r) => r.province_key === 'beta');
check('municipal province median', alphaProvince?.gap_pct, 65);
check('province with no up-to-five gap is missing', betaProvince?.status === 'missing' && betaProvince.gap_pct === null, true);
check('all-ages town is not in the up-to-five list', built.municipalities.map((t) => t.name), ['One', 'Two']);
check('all-ages gap is kept apart', built.municipal_all_ages_only.map((t) => t.gap_pct), [40]);
check('municipal headline uses towns, not the all-ages row', built.layers.find((l) => l.id === 'es-town-gap')?.headline.value, 65);
check('beta yield spread is missing', built.yields.find((r) => r.slug === 'beta')?.spread_pp, null);
check('alpha yield spread', built.yields.find((r) => r.slug === 'alpha')?.spread_pp, 3.7);
check('Portugal asking and gap stay null', built.portugal[0].avena_eur_m2 === null && built.portugal[0].gap_pct === null, true);
check('supply headline is not a number', built.layers.find((l) => l.id === 'es-supply')?.headline.available, false);
check('eurostat headline is not a number', built.layers.find((l) => l.id === 'eu-hpi')?.headline.value, null);
check('no prior means the municipal rows are not widened', alphaProvince?.previous, null);

const runs = base();
const q3: AskingDay[] = [];
for (let i = 0; i < 8; i++) {
  const dayNum = String(1 + i * 4).padStart(2, '0');
  q3.push(day(`2026-08-${dayNum}`, 1000 + i * 10));
}
runs.eurostat.asking_days = [day('2026-04-07', 900), day('2026-04-08', 910), ...q3];
const ran = buildOfficialSummary(runs);
check('two April days are not an asking change', ran.eurostat.asking_change_inside_latest_quarter, null);
checkTrue('a later quarter with a real run is reported and not turned into a price gap', ran.eurostat.later_asking_runs.length === 1 && ran.eurostat.later_asking_runs[0].period === '2026-Q3' && ran.price_gaps.length === 0);
check('later runs helper agrees', laterAskingRuns(runs.eurostat.asking_days, '2026-Q2', 'ES').map((r) => r.period), ['2026-Q3']);
check('empty priors accumulate', ran.history.status, 'accumulating');

console.log('live summary');
const live = getOfficialSummary();
const bench = getEsBenchmark();
const towns = getEsTownGap();
const rents = getEsRents();
check('live history is accumulating', live.history.status, 'accumulating');
check('live widening count is zero', live.history.rows_widened, 0);
check('live previous snapshots are zero', live.history.rows_with_previous_snapshot, 0);
checkTrue('every live price gap matches the Spain view and the formula', live.price_gaps.every((row) => {
  const src = bench.provinces.find((p) => p.slug === row.slug);
  if (!src) return false;
  return row.gap_pct === src.asking_vs_appraisal_pct
    && row.gap_pct === askingVsAppraisalPct(src.avena_median_asking_eur_m2, src.appraisal?.value ?? null)
    && row.avena_eur_m2 === src.avena_median_asking_eur_m2
    && row.official_eur_m2 === (src.appraisal?.value ?? null);
}));
check('live price headline is the median of those gaps', live.layers.find((l) => l.id === 'es-official')?.headline.value, medianRounded(live.price_gaps.flatMap((r) => r.gap_pct == null ? [] : [r.gap_pct])));
checkTrue('no live price row fills a missing gap with zero', live.price_gaps.every((r) => r.gap_pct !== 0 || (r.avena_eur_m2 != null && r.official_eur_m2 != null && r.avena_eur_m2 === r.official_eur_m2)));
check('municipal coverage matches the town view', live.municipal_coverage.with_up_to_five_year_gap, towns.summary.with_up_to_five_year_gap);
check('municipal all-ages count matches', live.municipal_coverage.all_ages_only, towns.summary.all_ages_only);
check('municipal not-in-table count matches', live.municipal_coverage.not_in_ministry_table, towns.summary.not_in_ministry_table);
check('municipal floor count matches', live.municipal_coverage.insufficient_listings, towns.summary.insufficient_listings);
checkTrue('every published town gap is the view gap', live.municipalities.every((row) => {
  const src = towns.towns.find((t) => t.town === row.name && t.province_key === row.province_key);
  return src?.asking_vs_up_to_five_years_pct?.value === row.gap_pct;
}));
checkTrue('all-ages-only towns are not in the up-to-five ranking', towns.towns.filter((t) => t.status === 'all_ages_only').every((t) => !live.municipalities.some((row) => row.name === t.town && row.province_key === t.province_key)));
checkTrue('yield spreads match the rents view', live.yields.every((row) => {
  const src = rents.provinces.find((p) => p.slug === row.slug);
  return !!src && row.spread_pp === yieldSpreadPp(src.avena_gross_yield_pct, src.implied_flat_gross_yield_pct) && row.implied_flat_gross_yield_pct === src.implied_flat_gross_yield_pct;
}));
checkTrue('Portugal rows keep the official price and a null gap', live.portugal.length > 0 && live.portugal.every((r) => r.gap_pct === null && r.avena_eur_m2 === null && r.appraisal_eur_m2 != null));
check('Portugal listings match the Portugal view', live.portugal_listings, getPtOfficial().portuguese_listings);
check('supply is not a price gap', live.layers.find((l) => l.id === 'es-supply')?.headline.available, false);
check('eurostat is not a price gap', live.layers.find((l) => l.id === 'eu-hpi')?.headline.available, false);
check('Portugal headline is not a price gap', live.layers.find((l) => l.id === 'pt-official')?.headline.available, false);
check('notary headline is the median of the notary gaps', live.layers.find((l) => l.id === 'es-notary')?.headline.value, medianRounded(live.notary_gaps.flatMap((r) => r.gap_pct == null ? [] : [r.gap_pct])));
checkTrue('unavailable headlines are null', live.layers.filter((l) => !l.headline.available).every((l) => l.headline.value === null));
checkTrue('live data gaps say history is accumulating', live.data_gaps.some((g) => /accumulating/i.test(g)));
checkTrue('seven layers', live.layers.length === 7);
checkTrue('notary layer is on the hub', live.layers.some((l) => l.id === 'es-notary' && l.href === '/spain/notary'));

console.log('wiring');
const root = join(__dirname, '..');
const read = (file: string) => readFileSync(join(root, file), 'utf8');
const page = read('src/app/official/page.tsx');
checkTrue('page links the JSON route', page.includes('/api/v1/official-summary'));
checkTrue('page does not use the gold gradient', !page.includes('--av-gradient-gold'));
checkTrue('page has no subscription price', !/€\s?79|\/\s?month|per month/.test(page));
checkTrue('page does not add a RICS claim', !/RICS/i.test(page));
checkTrue('footer links the hub', read('src/components/v2/Footer.tsx').includes("href: '/official'"));
checkTrue('sitemap lists the hub', read('src/app/sitemap.ts').includes("'/official'"));
for (const file of [
  'src/app/spain/official/page.tsx',
  'src/app/spain/rents/page.tsx',
  'src/app/spain/supply/page.tsx',
  'src/app/spain/towns/page.tsx',
  'src/app/europe/official/page.tsx',
  'src/app/portugal/official/page.tsx',
  'src/app/portugal/page.tsx',
  'src/app/methodology/page.tsx',
  'src/app/due-diligence/page.tsx',
]) {
  checkTrue(`${file} links the hub`, read(file).includes('href="/official"'));
}
for (const [id, spec] of Object.entries(LAYER_REFRESH)) {
  checkTrue(`${id} cadence is the workflow cron`, read(spec.workflow).includes(spec.cron));
}
const route = read('src/app/api/v1/official-summary/route.ts');
checkTrue('route is public JSON like the other official routes', route.includes('Access-Control-Allow-Origin') && route.includes('getOfficialSummary'));

console.log(fail ? `\n${fail} FAILED` : `\nALL PASS`);
process.exit(fail ? 1 : 0);
