/**
 * One summary of the official-statistics layers.
 *
 * Every gap is computed from numbers the caller passes in. A missing side
 * stays null. Nothing is filled with zero. A gap is marked as widening only
 * when the caller also passes an earlier snapshot of that same gap. The live
 * adapter passes none: the committed files do not store an earlier Avena
 * asking median beside an earlier official benchmark for the same place.
 */

import { GAP_METHOD, askingVsAppraisalPct } from './data-sources/ine-es';
import {
  askingChangeInsideQuarter,
  askingDaysInQuarter,
  quarterSortKey,
  type AskingDay,
} from './data-sources/eu-hpi';

export const LAYER_REFRESH = {
  'es-official': {
    cadence: 'Weekly, Wednesdays 04:40 UTC',
    workflow: '.github/workflows/es-official-refresh.yml',
    cron: '40 4 * * 3',
  },
  'es-town-gap': {
    cadence: 'Weekly, Fridays 04:25 UTC',
    workflow: '.github/workflows/es-town-gap-refresh.yml',
    cron: '25 4 * * 5',
  },
  'es-supply': {
    cadence: 'Weekly, Thursdays 04:15 UTC',
    workflow: '.github/workflows/es-supply-refresh.yml',
    cron: '15 4 * * 4',
  },
  'eu-hpi': {
    cadence: 'Weekly, Mondays 04:50 UTC',
    workflow: '.github/workflows/eu-hpi-refresh.yml',
    cron: '50 4 * * 1',
  },
  'es-rents': {
    cadence: 'Weekly, Tuesdays 04:35 UTC',
    workflow: '.github/workflows/es-rents-refresh.yml',
    cron: '35 4 * * 2',
  },
  'pt-official': {
    cadence: 'Weekly, Sundays 04:30 UTC',
    workflow: '.github/workflows/pt-ine-benchmark-refresh.yml',
    cron: '30 4 * * 0',
  },
} as const;

export const YIELD_SPREAD_METHOD =
  'yield_spread_pp = Avena median gross yield minus the implied flat gross yield, in percentage points, rounded to 0.1. ' +
  'The implied yield is (SERPAVI median monthly rent per m2 times 12) / Avena median asking per m2, times 100. ' +
  'A blank Avena yield or a blank implied yield leaves the spread blank. ' +
  'The Avena yield is the short-stay estimate on the listings. The implied yield lays a habitual-residence rent on a new-build asking price.';

export const HEADLINE_METHOD =
  'The headline is the median of the gaps that exist for that layer. ' +
  'An even count uses the mean of the two central values, rounded to 0.1. ' +
  'A place with a missing side is left out of the median and shown as missing. The median is not weighted by listings.';

export const WIDENING_METHOD =
  'A gap widened when the absolute value of the current gap is larger than the previous snapshot of the same gap. ' +
  'A snapshot counts only when an earlier gap for that place is passed in. ' +
  'The committed official files do not store an earlier Avena asking median beside an earlier official benchmark, so the live summary passes none and marks nothing as widening.';

export const HISTORY_ACCUMULATING =
  'No earlier snapshot of an Avena-versus-official gap is stored for these places. The history is accumulating. No region is marked as widening.';

export interface PriorGap {
  id: string;
  /** Earlier gap, in the same unit as the current gap (percent or percentage points). */
  gap: number;
  as_of: string;
}

export interface GapChange {
  previous: number;
  as_of: string;
  /** Current minus previous, rounded to 0.1. */
  change: number;
  direction: 'widened' | 'narrowed' | 'unchanged';
}

export interface Headline {
  available: boolean;
  value: number | null;
  unit: 'pct' | 'pp' | null;
  label: string;
  places: number;
  missing_places: number;
  widest_name: string | null;
  widest_value: number | null;
  reason: string | null;
}

export interface LayerCard {
  id: keyof typeof LAYER_REFRESH;
  title: string;
  href: string;
  api: string;
  source: string;
  source_url: string | null;
  geography: string;
  latest_period: string | null;
  retrieved_at: string | null;
  refresh_cadence: string;
  refresh_workflow: string;
  headline: Headline;
}

export interface PriceRow {
  id: string;
  layer_id: 'es-official';
  name: string;
  slug: string;
  href: string;
  listings: number;
  avena_eur_m2: number | null;
  official_eur_m2: number | null;
  official_period: string | null;
  official_label: string;
  gap_pct: number | null;
  ine_new_yoy_pct: number | null;
  ine_new_yoy_period: string | null;
  ine_territory_equals_province: boolean;
  status: 'compared' | 'missing';
  missing: string | null;
  previous: GapChange | null;
}

export interface MunicipalTownRow {
  id: string;
  name: string;
  province: string;
  province_key: string;
  href: string;
  listings: number;
  priced_listings: number;
  avena_eur_m2: number | null;
  official_eur_m2: number | null;
  gap_pct: number | null;
  basis: 'up_to_five_years';
  status: 'compared' | 'missing';
  missing: string | null;
  previous: GapChange | null;
}

export interface MunicipalAllAgesRow {
  id: string;
  name: string;
  province: string;
  listings: number;
  avena_eur_m2: number | null;
  official_eur_m2: number | null;
  gap_pct: number | null;
  basis: 'all_ages';
  note: string;
}

export interface MunicipalProvinceRow {
  id: string;
  name: string;
  province_key: string;
  href: string;
  towns: number;
  compared: number;
  all_ages_only: number;
  insufficient_listings: number;
  not_in_ministry_table: number;
  withheld: number;
  gap_pct: number | null;
  status: 'compared' | 'missing';
  missing: string | null;
  previous: GapChange | null;
}

export interface YieldRow {
  id: string;
  name: string;
  slug: string;
  href: string;
  listings: number;
  avena_asking_eur_m2: number | null;
  avena_gross_yield_pct: number | null;
  official_rent_eur_m2_month: number | null;
  official_period: string | null;
  implied_flat_gross_yield_pct: number | null;
  implied_house_gross_yield_pct: number | null;
  spread_pp: number | null;
  status: 'compared' | 'missing';
  missing: string | null;
  previous: GapChange | null;
}

export interface PortugalRow {
  id: string;
  name: string;
  slug: string;
  href: string;
  appraisal_eur_m2: number | null;
  appraisal_period: string | null;
  sales_new_eur_m2: number | null;
  sales_period: string | null;
  avena_eur_m2: null;
  gap_pct: null;
  status: 'missing';
  missing: string;
}

export interface LaterAskingRun {
  period: string;
  capture_days: number;
  first_date: string;
  last_date: string;
  change_pct: number;
}

export interface EurostatContext {
  latest_period: string | null;
  spain_new_yoy_pct: number | null;
  portugal_new_yoy_pct: number | null;
  tape_date: string | null;
  tape_spain_asking_eur_m2: number | null;
  book_date: string | null;
  book_spain_asking_eur_m2: number | null;
  book_note: string;
  asking_days_inside_latest_quarter: number;
  asking_change_inside_latest_quarter: LaterAskingRun | null;
  later_asking_runs: LaterAskingRun[];
  portugal_asking: 'missing';
}

export interface OfficialSummary {
  ok: true;
  generated_at: string | null;
  history: {
    status: 'accumulating' | 'partial' | 'compared';
    rows_with_a_gap: number;
    rows_with_previous_snapshot: number;
    rows_widened: number;
    note: string;
  };
  method: {
    price_gap: string;
    yield_spread: string;
    headline: string;
    widening: string;
  };
  caveats: string[];
  layers: LayerCard[];
  price_gaps: PriceRow[];
  municipal_provinces: MunicipalProvinceRow[];
  municipalities: MunicipalTownRow[];
  municipal_all_ages_only: MunicipalAllAgesRow[];
  municipal_coverage: {
    towns: number;
    with_up_to_five_year_gap: number;
    all_ages_only: number;
    withheld: number;
    insufficient_listings: number;
    not_in_ministry_table: number;
    min_priced_listings: number;
  };
  yields: YieldRow[];
  portugal: PortugalRow[];
  portugal_listings: number;
  listing_book: number;
  eurostat: EurostatContext;
  supply: {
    starts_period: string | null;
    sales_period: string | null;
    note: string;
  };
  data_gaps: string[];
}

export interface SpainProvinceInput {
  name: string;
  slug: string;
  listings: number;
  avena_eur_m2: number | null;
  official_eur_m2: number | null;
  official_period: string | null;
  ine_new_yoy_pct: number | null;
  ine_new_yoy_period: string | null;
  ine_territory_equals_province: boolean;
}

export interface MunicipalTownInput {
  town: string;
  province: string;
  province_key: string;
  listings: number;
  priced_listings: number;
  status: 'gap' | 'all_ages_only' | 'withheld' | 'insufficient' | 'not_in_table';
  avena_eur_m2: number | null;
  official_eur_m2: number | null;
  gap_pct: number | null;
  all_ages_gap_pct: number | null;
  all_ages_official_eur_m2: number | null;
}

export interface YieldProvinceInput {
  name: string;
  slug: string;
  listings: number;
  avena_asking_eur_m2: number | null;
  avena_gross_yield_pct: number | null;
  official_rent_eur_m2_month: number | null;
  official_period: string | null;
  implied_flat_gross_yield_pct: number | null;
  implied_house_gross_yield_pct: number | null;
}

export interface PortugalRegionInput {
  name: string;
  slug: string;
  appraisal_eur_m2: number | null;
  appraisal_period: string | null;
  sales_new_eur_m2: number | null;
  sales_period: string | null;
}

export interface OfficialSummaryInput {
  generated_at: Array<string | null>;
  book_date: string | null;
  priors: PriorGap[];
  spain: {
    source: string;
    source_url: string | null;
    latest_period: string | null;
    retrieved_at: string | null;
    provinces: SpainProvinceInput[];
    omissions: string[];
  };
  municipal: {
    source: string;
    source_url: string | null;
    period: string | null;
    retrieved_at: string | null;
    min_priced_listings: number;
    towns: MunicipalTownInput[];
  };
  rents: {
    source: string;
    source_url: string | null;
    year: number | null;
    retrieved_at: string | null;
    provinces: YieldProvinceInput[];
  };
  supply: {
    source: string;
    source_url: string | null;
    starts_period: string | null;
    sales_period: string | null;
    retrieved_at: string | null;
  };
  eurostat: {
    source: string;
    source_url: string | null;
    latest_period: string | null;
    retrieved_at: string | null;
    spain_new_yoy_pct: number | null;
    portugal_new_yoy_pct: number | null;
    tape_date: string | null;
    tape_spain_asking_eur_m2: number | null;
    book_date: string | null;
    book_spain_asking_eur_m2: number | null;
    book_note: string;
    asking_days: AskingDay[];
  };
  portugal: {
    source: string;
    source_url: string | null;
    latest_period: string | null;
    retrieved_at: string | null;
    portuguese_listings: number;
    listing_book: number;
    regions: PortugalRegionInput[];
  };
}

export const SUMMARY_CAVEATS = [
  'A positive asking-versus-appraisal figure means the Avena median asking price per m2 sits above the official benchmark. It is derived here. It is not a statistic published by INE, the housing ministry, or Statistics Portugal.',
  'Avena\'s figure is the median asking price per m2 of coastal new-build listings in the current book. It is not a price at which a home sold.',
  'The Spanish provincial benchmark is the ministry mean appraised value per m2 of free-market housing of all ages, for the whole province. It is not limited to new builds and not limited to the coast.',
  'The municipal gap uses the published appraisal for free-market dwellings up to five years old, and only a town with at least 8 priced listings. An all-ages appraisal is a different column and is not copied into that gap.',
  'The rent spread is Avena\'s short-stay gross-yield estimate minus the yield implied by the ministry habitual-residence rent per m2. The rent year and the asking book are not the same period. The dwellings are not the same stock.',
  'Eurostat\'s house price index is an index, not a euro price. It is not subtracted from an asking price. The supply file counts dwellings started, finished and sold. A listing count is not one of those counts.',
  'Statistics Portugal publishes bank appraisals and sale prices for Portugal. This book has no Portuguese asking median, so those regions are shown with the Avena side missing.',
  'No committed file stores an earlier Avena asking median beside an earlier official benchmark for the same place. Where that pair is absent, the gap is not marked as widening.',
];

export function medianRounded(values: readonly number[]): number | null {
  const xs = values.filter((v) => Number.isFinite(v)).slice().sort((a, b) => a - b);
  if (xs.length === 0) return null;
  const mid = Math.floor(xs.length / 2);
  const raw = xs.length % 2 === 1 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
  return Math.round(raw * 10) / 10;
}

export function yieldSpreadPp(avena: number | null, implied: number | null): number | null {
  if (avena == null || implied == null) return null;
  if (!Number.isFinite(avena) || !Number.isFinite(implied)) return null;
  return Math.round((avena - implied) * 10) / 10;
}

export function compareToPrevious(current: number, previous: number): Omit<GapChange, 'as_of'> {
  const change = Math.round((current - previous) * 10) / 10;
  const absNow = Math.abs(current);
  const absPrev = Math.abs(previous);
  const direction = absNow > absPrev ? 'widened' : absNow < absPrev ? 'narrowed' : 'unchanged';
  return { previous, change, direction };
}

export function quartersFromTo(firstDay: string, lastDay: string): string[] {
  const start = quarterOfDay(firstDay);
  const end = quarterOfDay(lastDay);
  const out: string[] = [];
  let y = start.year;
  let q = start.quarter;
  while (y < end.year || (y === end.year && q <= end.quarter)) {
    out.push(`${y}-Q${q}`);
    q += 1;
    if (q === 5) { q = 1; y += 1; }
    if (out.length > 80) break;
  }
  return out;
}

function quarterOfDay(day: string): { year: number; quarter: number } {
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(day);
  if (!m) return { year: 1970, quarter: 1 };
  const month = Number(m[2]);
  return { year: Number(m[1]), quarter: Math.floor((month - 1) / 3) + 1 };
}

/** Asking-tape changes inside quarters after Eurostat's latest published quarter. Not a euro gap. */
export function laterAskingRuns(days: readonly AskingDay[], latestOfficialPeriod: string | null, code: string): LaterAskingRun[] {
  if (!latestOfficialPeriod || days.length === 0) return [];
  const dates = days.map((d) => d.date).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  if (dates.length === 0) return [];
  let latestKey: number;
  try { latestKey = quarterSortKey(latestOfficialPeriod); } catch { return []; }
  const out: LaterAskingRun[] = [];
  for (const period of quartersFromTo(dates[0], dates[dates.length - 1])) {
    let key: number;
    try { key = quarterSortKey(period); } catch { continue; }
    if (key <= latestKey) continue;
    const change = askingChangeInsideQuarter(days as AskingDay[], code, period);
    if (!change) continue;
    out.push({
      period,
      capture_days: change.capture_days,
      first_date: change.first_date,
      last_date: change.last_date,
      change_pct: change.change_pct,
    });
  }
  return out;
}

function askingInsideLatest(days: readonly AskingDay[], period: string | null, code: string): { days: number; change: LaterAskingRun | null } {
  if (!period) return { days: 0, change: null };
  let inside: AskingDay[] = [];
  try { inside = askingDaysInQuarter(days as AskingDay[], code, period); } catch { inside = []; }
  let change = null;
  try { change = askingChangeInsideQuarter(days as AskingDay[], code, period); } catch { change = null; }
  return {
    days: inside.length,
    change: change
      ? {
          period: change.period,
          capture_days: change.capture_days,
          first_date: change.first_date,
          last_date: change.last_date,
          change_pct: change.change_pct,
        }
      : null,
  };
}

function card(id: keyof typeof LAYER_REFRESH, fields: Omit<LayerCard, 'id' | 'refresh_cadence' | 'refresh_workflow'>): LayerCard {
  const refresh = LAYER_REFRESH[id];
  return { id, refresh_cadence: refresh.cadence, refresh_workflow: refresh.workflow, ...fields };
}

function emptyHeadline(label: string, reason: string, missingPlaces: number): Headline {
  return {
    available: false,
    value: null,
    unit: null,
    label,
    places: 0,
    missing_places: missingPlaces,
    widest_name: null,
    widest_value: null,
    reason,
  };
}

function headlineFrom(
  values: Array<{ name: string; value: number }>,
  unit: 'pct' | 'pp',
  label: string,
  missingPlaces: number,
  emptyReason: string,
): Headline {
  if (values.length === 0) return emptyHeadline(label, emptyReason, missingPlaces);
  const med = medianRounded(values.map((v) => v.value));
  const widest = values.slice().sort((a, b) => Math.abs(b.value) - Math.abs(a.value) || a.name.localeCompare(b.name, 'en'))[0];
  return {
    available: med != null,
    value: med,
    unit,
    label,
    places: values.length,
    missing_places: missingPlaces,
    widest_name: widest.name,
    widest_value: widest.value,
    reason: null,
  };
}

function priorMap(priors: readonly PriorGap[]): Map<string, PriorGap> {
  const map = new Map<string, PriorGap>();
  for (const prior of priors) {
    if (!prior || typeof prior.id !== 'string' || !Number.isFinite(prior.gap)) continue;
    map.set(prior.id, prior);
  }
  return map;
}

function previousFor(id: string, gap: number | null, priors: Map<string, PriorGap>): GapChange | null {
  const prior = priors.get(id);
  if (!prior || gap == null) return null;
  return { ...compareToPrevious(gap, prior.gap), as_of: prior.as_of };
}

function byAbs<T extends { name: string }>(rows: T[], gapOf: (row: T) => number | null): T[] {
  return rows.slice().sort((a, b) => {
    const ag = gapOf(a);
    const bg = gapOf(b);
    const av = ag == null ? -1 : Math.abs(ag);
    const bv = bg == null ? -1 : Math.abs(bg);
    if (bv !== av) return bv - av;
    return a.name.localeCompare(b.name, 'en');
  });
}

function newestIso(values: Array<string | null>): string | null {
  const ok = values.filter((v): v is string => typeof v === 'string' && v.length > 0);
  if (ok.length === 0) return null;
  return ok.slice().sort()[ok.length - 1];
}

function priceMissing(row: SpainProvinceInput): string | null {
  if (row.avena_eur_m2 == null && row.official_eur_m2 == null) return 'No Avena asking median and no official appraisal.';
  if (row.avena_eur_m2 == null) return 'No Avena asking median for this province.';
  if (row.official_eur_m2 == null) return 'No official appraisal in this refresh.';
  return null;
}

function townMissing(town: MunicipalTownInput): string | null {
  if (town.gap_pct != null) return null;
  if (town.status === 'insufficient') return `Fewer than the publication floor of priced listings.`;
  if (town.status === 'not_in_table') return 'This place is not a municipality on the ministry sheet.';
  if (town.status === 'withheld') return 'The sheet does not publish an up-to-five-year price or an all-ages price for this municipality.';
  if (town.status === 'all_ages_only') return 'The up-to-five-year appraisal is not published. The all-ages figure is kept separate.';
  if (town.avena_eur_m2 == null) return 'No Avena asking median.';
  if (town.official_eur_m2 == null) return 'No published up-to-five-year appraisal.';
  return 'No up-to-five-year gap.';
}

export function buildOfficialSummary(input: OfficialSummaryInput): OfficialSummary {
  const priors = priorMap(input.priors);

  const price_gaps = byAbs(input.spain.provinces.map((p): PriceRow => {
    const id = `es-official:${p.slug}`;
    const gap = askingVsAppraisalPct(p.avena_eur_m2, p.official_eur_m2);
    const missing = priceMissing(p);
    return {
      id,
      layer_id: 'es-official',
      name: p.name,
      slug: p.slug,
      href: '/spain/official',
      listings: p.listings,
      avena_eur_m2: p.avena_eur_m2,
      official_eur_m2: p.official_eur_m2,
      official_period: p.official_period,
      official_label: 'Ministry appraisal, free-market housing, all ages',
      gap_pct: gap,
      ine_new_yoy_pct: p.ine_new_yoy_pct,
      ine_new_yoy_period: p.ine_new_yoy_period,
      ine_territory_equals_province: p.ine_territory_equals_province,
      status: gap == null ? 'missing' : 'compared',
      missing,
      previous: previousFor(id, gap, priors),
    };
  }), (row) => row.gap_pct);

  const municipalTowns = input.municipal.towns.map((t): MunicipalTownRow => {
    const id = `es-town-gap:${t.province_key}:${t.town}`;
    const gap = t.gap_pct;
    return {
      id,
      name: t.town,
      province: t.province,
      province_key: t.province_key,
      href: '/spain/towns',
      listings: t.listings,
      priced_listings: t.priced_listings,
      avena_eur_m2: t.avena_eur_m2,
      official_eur_m2: t.official_eur_m2,
      gap_pct: gap,
      basis: 'up_to_five_years',
      status: gap == null ? 'missing' : 'compared',
      missing: townMissing(t),
      previous: previousFor(id, gap, priors),
    };
  });
  const municipalities = byAbs(municipalTowns.filter((t) => t.gap_pct != null), (row) => row.gap_pct);

  const municipal_all_ages_only: MunicipalAllAgesRow[] = input.municipal.towns
    .filter((t) => t.status === 'all_ages_only' && t.all_ages_gap_pct != null)
    .map((t) => ({
      id: `es-town-gap-all-ages:${t.province_key}:${t.town}`,
      name: t.town,
      province: t.province,
      listings: t.listings,
      avena_eur_m2: t.avena_eur_m2,
      official_eur_m2: t.all_ages_official_eur_m2,
      gap_pct: t.all_ages_gap_pct,
      basis: 'all_ages' as const,
      note: 'All-ages appraisal only. Not included in the up-to-five-year median.',
    }))
    .sort((a, b) => Math.abs(b.gap_pct ?? 0) - Math.abs(a.gap_pct ?? 0) || a.name.localeCompare(b.name, 'en'));

  const byProvince = new Map<string, { name: string; key: string; towns: MunicipalTownInput[] }>();
  for (const town of input.municipal.towns) {
    const hit = byProvince.get(town.province_key) ?? { name: town.province, key: town.province_key, towns: [] };
    hit.towns.push(town);
    byProvince.set(town.province_key, hit);
  }
  const municipal_provinces = byAbs([...byProvince.values()].map((group): MunicipalProvinceRow => {
    const id = `es-town-gap:${group.key}`;
    const compared = group.towns.filter((t) => t.gap_pct != null);
    const gap = medianRounded(compared.map((t) => t.gap_pct as number));
    const counts = {
      all_ages_only: group.towns.filter((t) => t.status === 'all_ages_only').length,
      insufficient_listings: group.towns.filter((t) => t.status === 'insufficient').length,
      not_in_ministry_table: group.towns.filter((t) => t.status === 'not_in_table').length,
      withheld: group.towns.filter((t) => t.status === 'withheld').length,
    };
    const missing = gap == null
      ? 'No municipality in this province has both an Avena asking median and a published up-to-five-year appraisal.'
      : null;
    return {
      id,
      name: group.name,
      province_key: group.key,
      href: '/spain/towns',
      towns: group.towns.length,
      compared: compared.length,
      ...counts,
      gap_pct: gap,
      status: gap == null ? 'missing' : 'compared',
      missing,
      previous: previousFor(id, gap, priors),
    };
  }), (row) => row.gap_pct);

  const coverage = {
    towns: input.municipal.towns.length,
    with_up_to_five_year_gap: input.municipal.towns.filter((t) => t.status === 'gap').length,
    all_ages_only: input.municipal.towns.filter((t) => t.status === 'all_ages_only').length,
    withheld: input.municipal.towns.filter((t) => t.status === 'withheld').length,
    insufficient_listings: input.municipal.towns.filter((t) => t.status === 'insufficient').length,
    not_in_ministry_table: input.municipal.towns.filter((t) => t.status === 'not_in_table').length,
    min_priced_listings: input.municipal.min_priced_listings,
  };

  const yields = byAbs(input.rents.provinces.map((p): YieldRow => {
    const id = `es-rents:${p.slug}`;
    const spread = yieldSpreadPp(p.avena_gross_yield_pct, p.implied_flat_gross_yield_pct);
    let missing: string | null = null;
    if (spread == null) {
      if (p.implied_flat_gross_yield_pct == null && p.avena_gross_yield_pct == null) missing = 'No Avena gross yield and no implied habitual-rent yield.';
      else if (p.avena_gross_yield_pct == null) missing = 'No Avena gross yield, so the spread against the implied habitual-rent yield is not computed.';
      else missing = 'No implied habitual-rent yield. The official rent or the asking median is missing.';
    }
    return {
      id,
      name: p.name,
      slug: p.slug,
      href: '/spain/rents',
      listings: p.listings,
      avena_asking_eur_m2: p.avena_asking_eur_m2,
      avena_gross_yield_pct: p.avena_gross_yield_pct,
      official_rent_eur_m2_month: p.official_rent_eur_m2_month,
      official_period: p.official_period,
      implied_flat_gross_yield_pct: p.implied_flat_gross_yield_pct,
      implied_house_gross_yield_pct: p.implied_house_gross_yield_pct,
      spread_pp: spread,
      status: spread == null ? 'missing' : 'compared',
      missing,
      previous: previousFor(id, spread, priors),
    };
  }), (row) => row.spread_pp);

  const portugal: PortugalRow[] = input.portugal.regions
    .map((r) => ({
      id: `pt-official:${r.slug}`,
      name: r.name,
      slug: r.slug,
      href: '/portugal/official',
      appraisal_eur_m2: r.appraisal_eur_m2,
      appraisal_period: r.appraisal_period,
      sales_new_eur_m2: r.sales_new_eur_m2,
      sales_period: r.sales_period,
      avena_eur_m2: null as null,
      gap_pct: null as null,
      status: 'missing' as const,
      missing: 'Avena does not compute a Portugal asking median. The official figure is shown and the gap is left blank.',
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en'));

  const inside = askingInsideLatest(input.eurostat.asking_days, input.eurostat.latest_period, 'ES');
  const later = laterAskingRuns(input.eurostat.asking_days, input.eurostat.latest_period, 'ES');
  const eurostat: EurostatContext = {
    latest_period: input.eurostat.latest_period,
    spain_new_yoy_pct: input.eurostat.spain_new_yoy_pct,
    portugal_new_yoy_pct: input.eurostat.portugal_new_yoy_pct,
    tape_date: input.eurostat.tape_date,
    tape_spain_asking_eur_m2: input.eurostat.tape_spain_asking_eur_m2,
    book_date: input.eurostat.book_date,
    book_spain_asking_eur_m2: input.eurostat.book_spain_asking_eur_m2,
    book_note: input.eurostat.book_note,
    asking_days_inside_latest_quarter: inside.days,
    asking_change_inside_latest_quarter: inside.change,
    later_asking_runs: later,
    portugal_asking: 'missing',
  };

  const priceValues = price_gaps.filter((r) => r.gap_pct != null).map((r) => ({ name: r.name, value: r.gap_pct as number }));
  const townValues = municipalities.filter((r) => r.gap_pct != null).map((r) => ({ name: r.name, value: r.gap_pct as number }));
  const yieldValues = yields.filter((r) => r.spread_pp != null).map((r) => ({ name: r.name, value: r.spread_pp as number }));

  const layers: LayerCard[] = [
    card('es-official', {
      title: 'Spain official benchmark',
      href: '/spain/official',
      api: '/api/v1/es-official',
      source: input.spain.source,
      source_url: input.spain.source_url,
      geography: 'Spain, provinces in the Avena book',
      latest_period: input.spain.latest_period,
      retrieved_at: input.spain.retrieved_at,
      headline: headlineFrom(
        priceValues,
        'pct',
        'Median provincial asking-versus-appraisal gap',
        price_gaps.length - priceValues.length,
        'No province has both an Avena asking median and a ministry appraisal.',
      ),
    }),
    card('es-town-gap', {
      title: 'Spain municipal appraisal',
      href: '/spain/towns',
      api: '/api/v1/es-town-gap',
      source: input.municipal.source,
      source_url: input.municipal.source_url,
      geography: 'Spain, municipalities on the ministry sheet joined to Avena towns',
      latest_period: input.municipal.period,
      retrieved_at: input.municipal.retrieved_at,
      headline: headlineFrom(
        townValues,
        'pct',
        'Median municipal asking-versus-appraisal gap, dwellings up to five years',
        coverage.towns - coverage.with_up_to_five_year_gap,
        'No municipality has both an Avena asking median and a published up-to-five-year appraisal.',
      ),
    }),
    card('es-rents', {
      title: 'Spain rent benchmark',
      href: '/spain/rents',
      api: '/api/v1/es-rents',
      source: input.rents.source,
      source_url: input.rents.source_url,
      geography: 'Spain, provinces in the Avena book',
      latest_period: input.rents.year == null ? null : String(input.rents.year),
      retrieved_at: input.rents.retrieved_at,
      headline: headlineFrom(
        yieldValues,
        'pp',
        'Median provincial spread, Avena short-stay yield minus implied habitual-rent yield',
        yields.length - yieldValues.length,
        'No province has both an Avena gross yield and an implied habitual-rent yield.',
      ),
    }),
    card('es-supply', {
      title: 'Spain supply pipeline',
      href: '/spain/supply',
      api: '/api/v1/es-supply',
      source: input.supply.source,
      source_url: input.supply.source_url,
      geography: 'Spain, provinces in the Avena book',
      latest_period: input.supply.starts_period,
      retrieved_at: input.supply.retrieved_at,
      headline: emptyHeadline(
        'No asking-versus-official euro gap',
        'This layer counts dwellings started, finished and sold, beside a stock of listings. The units are not euros per m2, so no price gap is computed.',
        0,
      ),
    }),
    card('eu-hpi', {
      title: 'Eurostat house price index',
      href: '/europe/official',
      api: '/api/v1/eu-hpi',
      source: input.eurostat.source,
      source_url: input.eurostat.source_url,
      geography: 'Spain, Portugal, the EU and the euro area',
      latest_period: input.eurostat.latest_period,
      retrieved_at: input.eurostat.retrieved_at,
      headline: emptyHeadline(
        'No asking-versus-official euro gap',
        'Eurostat publishes an index and an annual rate of change, not a euro price. The asking median is shown beside it and is not subtracted from the index.',
        0,
      ),
    }),
    card('pt-official', {
      title: 'Portugal official benchmark',
      href: '/portugal/official',
      api: '/api/v1/pt-official',
      source: input.portugal.source,
      source_url: input.portugal.source_url,
      geography: 'Portugal, NUTS regions',
      latest_period: input.portugal.latest_period,
      retrieved_at: input.portugal.retrieved_at,
      headline: emptyHeadline(
        'No Avena asking median for Portugal',
        input.portugal.portuguese_listings === 0
          ? `The listing book has ${input.portugal.listing_book.toLocaleString('en-GB')} listings and none with a Portugal place name. Official appraisals and sale prices are shown. No asking gap is computed.`
          : `The listing book has ${input.portugal.portuguese_listings.toLocaleString('en-GB')} Portugal place names. This summary still does not compute a Portugal asking median from them. The Portugal page does not either.`,
        input.portugal.regions.length,
      ),
    }),
  ];

  const comparable = [
    ...price_gaps.filter((r) => r.gap_pct != null),
    ...municipal_provinces.filter((r) => r.gap_pct != null),
    ...municipalities.filter((r) => r.gap_pct != null),
    ...yields.filter((r) => r.spread_pp != null),
  ];
  const matched = comparable.filter((r) => r.previous != null);
  const widened = matched.filter((r) => r.previous?.direction === 'widened');
  let historyStatus: OfficialSummary['history']['status'] = 'accumulating';
  let historyNote = HISTORY_ACCUMULATING;
  if (matched.length > 0 && matched.length < comparable.length) {
    historyStatus = 'partial';
    historyNote = `${matched.length} of ${comparable.length} compared places have an earlier snapshot. ${widened.length} of those widened. The others have no earlier snapshot, so they are not marked.`;
  } else if (matched.length > 0 && matched.length === comparable.length) {
    historyStatus = 'compared';
    historyNote = `Every compared place has an earlier snapshot. ${widened.length} widened.`;
  }

  const summary: OfficialSummary = {
    ok: true,
    generated_at: newestIso(input.generated_at),
    history: {
      status: historyStatus,
      rows_with_a_gap: comparable.length,
      rows_with_previous_snapshot: matched.length,
      rows_widened: widened.length,
      note: historyNote,
    },
    method: {
      price_gap: GAP_METHOD,
      yield_spread: YIELD_SPREAD_METHOD,
      headline: HEADLINE_METHOD,
      widening: WIDENING_METHOD,
    },
    caveats: SUMMARY_CAVEATS,
    layers,
    price_gaps,
    municipal_provinces,
    municipalities,
    municipal_all_ages_only,
    municipal_coverage: coverage,
    yields,
    portugal,
    portugal_listings: input.portugal.portuguese_listings,
    listing_book: input.portugal.listing_book,
    eurostat,
    supply: {
      starts_period: input.supply.starts_period,
      sales_period: input.supply.sales_period,
      note: 'Ministry starts and completions, and INE registered sales of new dwellings, sit beside Avena listing counts on /spain/supply. This summary does not turn those counts into a price gap.',
    },
    data_gaps: [],
  };
  summary.data_gaps = dataGaps(input, summary);
  return summary;
}

function dataGaps(input: OfficialSummaryInput, summary: OfficialSummary): string[] {
  const gaps: string[] = [];
  if (summary.history.status === 'accumulating') gaps.push(summary.history.note);
  const priceMissing = summary.price_gaps.filter((r) => r.status === 'missing');
  if (priceMissing.length > 0) {
    gaps.push(`Spain provincial appraisal: ${priceMissing.map((r) => `${r.name} (${r.missing})`).join(' ')}`);
  }
  const cov = summary.municipal_coverage;
  if (cov.all_ages_only || cov.insufficient_listings || cov.not_in_ministry_table || cov.withheld) {
    gaps.push(
      `Municipal up-to-five-year gap: ${cov.with_up_to_five_year_gap} of ${cov.towns} towns compared. ` +
      `${cov.all_ages_only} have only an all-ages appraisal, ${cov.insufficient_listings} are below ${cov.min_priced_listings} priced listings, ` +
      `${cov.not_in_ministry_table} are not on the ministry sheet, ${cov.withheld} are withheld. Those are not given an up-to-five-year gap.`,
    );
  }
  const yieldMissing = summary.yields.filter((r) => r.status === 'missing');
  if (yieldMissing.length > 0) {
    gaps.push(`Spain rent spread: ${yieldMissing.map((r) => `${r.name} (${r.missing})`).join(' ')}`);
  }
  if (input.rents.year != null && input.book_date && !input.book_date.startsWith(String(input.rents.year))) {
    gaps.push(`SERPAVI habitual rents are for ${input.rents.year}. The asking book on this deployment is dated ${input.book_date}. The implied yield joins those two periods.`);
  }
  if (input.spain.omissions.length > 0) {
    gaps.push(`Not in the Spain price file: ${input.spain.omissions.join('; ')}.`);
  }
  gaps.push(summary.supply.note);
  if (summary.eurostat.asking_change_inside_latest_quarter == null) {
    const period = summary.eurostat.latest_period ?? 'the latest official quarter';
    gaps.push(
      `Eurostat's latest quarter in this file is ${period}. The asking tape has ${summary.eurostat.asking_days_inside_latest_quarter} capture day${summary.eurostat.asking_days_inside_latest_quarter === 1 ? '' : 's'} inside it, which is not enough for a published asking change. No euro gap is computed from the index.`,
    );
  }
  if (summary.eurostat.later_asking_runs.length > 0) {
    const runs = summary.eurostat.later_asking_runs
      .map((r) => `${r.period} (${r.change_pct > 0 ? '+' : ''}${r.change_pct}% across ${r.capture_days} days, ${r.first_date} to ${r.last_date})`)
      .join('; ');
    gaps.push(`The asking tape has a published change inside ${runs}. That quarter is later than Eurostat's latest quarter in this file, so the change is not paired with an index and is not a gap.`);
  }
  gaps.push('Portugal has a Eurostat index and no Avena asking median on this book.');
  if (input.portugal.portuguese_listings === 0) {
    gaps.push(summary.layers.find((l) => l.id === 'pt-official')?.headline.reason ?? 'No Portugal asking median.');
  }
  gaps.push('data/pt-official.json is the /portugal market layer (sales, licensing, Banco de Portugal) and is a different file from data/pt-ine-benchmark.json. It is not a second asking gap.');
  return gaps;
}
