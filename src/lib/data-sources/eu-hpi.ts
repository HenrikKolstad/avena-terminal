/**
 * Eurostat house price index (prc_hpi_q) joined to Avena's asking-price tape.
 *
 * Eurostat dissemination API, JSON-stat 2.0, no key:
 *   https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hpi_q
 * Dataset DOI 10.2908/PRC_HPI_Q. Reuse is free provided the source is
 * acknowledged (https://ec.europa.eu/eurostat/about-us/policies/copyright).
 *
 * Two purchase series, two measures, for Spain, Portugal, the EU aggregate
 * and the euro area:
 *   DW_NEW  purchases of newly built dwellings
 *   TOTAL   total purchases
 *   I15_Q   quarterly index, 2015=100
 *   RCH_A   annual rate of change
 *
 * The asking tape is not Eurostat. It is the median asking EUR/m² of the
 * committed listing book on each capture day. A missing country field counts
 * as Spain only when the location maps to a province in the Spain official
 * benchmark. Anything else stays unmapped. A country with fewer than
 * MIN_PRICED_LISTINGS priced listings has no median: a handful of rows is
 * not published as a national asking price.
 *
 * Every parser throws when the payload stops meaning what we think it means.
 * An empty table that renders as "no data" is indistinguishable from a dead
 * source. A zero written in place of a blank cell is a fabricated index.
 *
 * Network I/O lives in scripts/ingest-eu-hpi.ts. Nothing here fetches.
 */

import { provinceFromLocation } from './ine-es';
import { KNOWN_GAPS } from '@/lib/sellthrough';

export const DATASET = 'prc_hpi_q';
export const EUROSTAT_API =
  'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hpi_q';
export const EUROSTAT_BROWSER =
  'https://ec.europa.eu/eurostat/databrowser/view/prc_hpi_q/default/table?lang=en';
export const EUROSTAT_METADATA =
  'https://ec.europa.eu/eurostat/cache/metadata/en/prc_hpi_inx_esms.htm';
export const EUROSTAT_COPYRIGHT =
  'https://ec.europa.eu/eurostat/about-us/policies/copyright';
export const EUROSTAT_DOI = '10.2908/PRC_HPI_Q';
export const SINCE_PERIOD = '2015-Q1';
export const MIN_QUARTERS = 20;
export const MIN_PRICED_LISTINGS = 30;
/** A two-day blip inside a quarter is not a quarterly asking change. */
export const MIN_QUARTER_CAPTURE_DAYS = 8;
export const MIN_QUARTER_SPAN_DAYS = 28;

export const REQUIRED_GEOS = ['ES', 'PT', 'EU27_2020', 'EA20'] as const;
export type RequiredGeo = (typeof REQUIRED_GEOS)[number];

const AGGREGATES = new Set<string>(['EU27_2020', 'EA20']);

export const LICENCE_NOTE =
  'Source: Eurostat, dataset prc_hpi_q, DOI 10.2908/PRC_HPI_Q. Eurostat data may be reused free of charge provided the source is acknowledged. Avena Terminal selected purchases of newly built dwellings (DW_NEW) and total purchases (TOTAL), the quarterly index 2015=100 (I15_Q) and the annual rate of change (RCH_A), for Spain, Portugal, the EU aggregate EU27_2020 and the euro area EA20, plus any further country present in the Avena listing book. The asking-price tape is Avena\'s, not Eurostat\'s.';

export interface HpiQuarter {
  period: string;
  new_index: number | null;
  new_index_status: string | null;
  new_yoy_pct: number | null;
  new_yoy_status: string | null;
  total_index: number | null;
  total_index_status: string | null;
  total_yoy_pct: number | null;
  total_yoy_status: string | null;
}

export type GeoRole = 'aggregate' | 'avena_book' | 'eurostat_only';

export interface HpiGeo {
  code: string;
  /** Eurostat's own label for the geo. */
  name: string;
  role: GeoRole;
  quarters: HpiQuarter[];
}

export interface AskingCountryDay {
  code: string;
  listings: number;
  priced_listings: number;
  median_asking_eur_m2: number | null;
}

export interface AskingDay {
  date: string;
  /** True when this calendar day sits inside the declared price-snapshot capture gap. The book commit exists; the ledger does not treat the day as captured. */
  during_declared_capture_gap: boolean;
  unmapped_listings: number;
  countries: AskingCountryDay[];
}

export interface BelowThreshold {
  code: string;
  listings: number;
  priced_listings: number;
  note: string;
}

export interface EuHpiLayer {
  generated_at: string;
  status: 'ready';
  source: {
    agency: 'Eurostat';
    dataset: typeof DATASET;
    label: string;
    doi: string;
    updated: string;
    latest_period: string;
    first_period: string;
    retrieved_at: string;
    api_url: string;
    browser_url: string;
    metadata_url: string;
    copyright_url: string;
    licence_note: string;
    series: Array<{ purchase: 'DW_NEW' | 'TOTAL'; unit: 'I15_Q' | 'RCH_A'; label: string }>;
  };
  geos: HpiGeo[];
  /** Optional geos requested because the book has listings, and absent from the Eurostat response. */
  omissions: Array<{ geo: string; reason: string }>;
  avena: {
    what: string;
    min_priced_listings: number;
    first_date: string;
    latest_date: string;
    observation_days: number;
    days: AskingDay[];
    below_threshold: BelowThreshold[];
    coverage_note: string;
  };
  caveats: string[];
}

export interface ParsedHpi {
  label: string;
  updated: string;
  doi: string;
  geos: Array<{ code: string; name: string; quarters: HpiQuarter[] }>;
  seriesLabels: { new_index: string; new_yoy: string; total_index: string; total_yoy: string };
}

interface Category {
  index?: Record<string, number> | string[];
  label?: Record<string, string>;
}

function fail(message: string): never {
  throw new Error(message);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

export function quarterSortKey(period: string): number {
  const m = /^(\d{4})-Q([1-4])$/.exec(period);
  if (!m) fail(`period is not a quarter: ${period}`);
  return Number(m[1]) * 4 + Number(m[2]);
}

export function quarterBounds(period: string): { start: string; end: string } {
  const m = /^(\d{4})-Q([1-4])$/.exec(period);
  if (!m) fail(`period is not a quarter: ${period}`);
  const year = Number(m[1]);
  const q = Number(m[2]);
  const startMonth = (q - 1) * 3;
  const start = new Date(Date.UTC(year, startMonth, 1)).toISOString().slice(0, 10);
  const end = new Date(Date.UTC(year, startMonth + 3, 0)).toISOString().slice(0, 10);
  return { start, end };
}

export function addDays(iso: string, n: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) fail(`date is not a day: ${iso}`);
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + n));
  return dt.toISOString().slice(0, 10);
}

export function eurostatHpiUrl(extraGeos: string[]): string {
  const geos: string[] = [...REQUIRED_GEOS];
  for (const geo of extraGeos) {
    if (!geos.includes(geo)) geos.push(geo);
  }
  const params = new URLSearchParams();
  params.set('format', 'JSON');
  params.set('lang', 'EN');
  params.append('freq', 'Q');
  params.append('purchase', 'DW_NEW');
  params.append('purchase', 'TOTAL');
  params.append('unit', 'I15_Q');
  params.append('unit', 'RCH_A');
  for (const geo of geos) params.append('geo', geo);
  params.set('sinceTimePeriod', SINCE_PERIOD);
  return `${EUROSTAT_API}?${params.toString()}`;
}

function categoryPositions(cat: Category, dim: string): Map<string, number> {
  if (!cat.index) fail(`Eurostat dimension ${dim} has no category index`);
  const map = new Map<string, number>();
  if (Array.isArray(cat.index)) {
    cat.index.forEach((code, i) => map.set(String(code), i));
  } else {
    for (const [code, i] of Object.entries(cat.index)) {
      if (!Number.isInteger(i)) fail(`Eurostat index for ${dim}:${code} is not an integer`);
      map.set(code, i);
    }
  }
  if (map.size === 0) fail(`Eurostat dimension ${dim} is empty`);
  return map;
}

function offsetOf(size: number[], coords: number[]): number {
  if (coords.length !== size.length) fail('Eurostat coordinate rank mismatch');
  let idx = 0;
  for (let i = 0; i < size.length; i++) {
    if (!Number.isInteger(coords[i]) || coords[i] < 0 || coords[i] >= size[i]) {
      fail(`Eurostat coordinate ${coords[i]} is outside size ${size[i]}`);
    }
    idx = idx * size[i] + coords[i];
  }
  return idx;
}

function readCell(value: unknown, status: unknown, offset: number, where: string): { value: number | null; status: string | null } {
  let raw: unknown;
  let present = false;
  if (Array.isArray(value)) {
    present = offset < value.length && value[offset] != null;
    raw = present ? value[offset] : null;
  } else if (isRecord(value)) {
    const key = String(offset);
    present = Object.prototype.hasOwnProperty.call(value, key) && value[key] != null;
    raw = present ? value[key] : null;
  } else {
    fail('Eurostat value is not a JSON-stat array or map');
  }
  if (!present) return { value: null, status: readStatus(status, offset) };
  if (typeof raw !== 'number' || !Number.isFinite(raw)) fail(`Eurostat value at ${where} is not a finite number`);
  return { value: raw, status: readStatus(status, offset) };
}

function readStatus(status: unknown, offset: number): string | null {
  if (status == null) return null;
  let raw: unknown;
  if (Array.isArray(status)) raw = offset < status.length ? status[offset] : null;
  else if (isRecord(status)) raw = Object.prototype.hasOwnProperty.call(status, String(offset)) ? status[String(offset)] : null;
  else fail('Eurostat status is not a JSON-stat array or map');
  if (raw == null || raw === '') return null;
  if (typeof raw !== 'string') fail(`Eurostat status at offset ${offset} is not a string`);
  return raw;
}

/**
 * Parse one prc_hpi_q JSON-stat response.
 * `optionalGeos` are requested when the listing book has another country.
 * A missing optional geo is returned in `missingGeos`. A missing required geo throws.
 */
export function parseEurostatHpi(payload: unknown, optionalGeos: string[] = []): { parsed: ParsedHpi; missingGeos: string[] } {
  if (!isRecord(payload)) fail('Eurostat payload is not an object');
  if (payload.class !== 'dataset') fail('Eurostat payload is not a dataset');
  if (typeof payload.version !== 'string' || !payload.version.startsWith('2')) fail('Eurostat payload is not JSON-stat 2.0');
  const extension = isRecord(payload.extension) ? payload.extension : fail('Eurostat payload has no extension');
  if (extension.id !== 'PRC_HPI_Q') fail(`Eurostat dataset id is ${String(extension.id)}, expected PRC_HPI_Q`);
  const doiBlob = JSON.stringify(extension.annotation ?? '');
  if (!doiBlob.includes(EUROSTAT_DOI)) fail(`Eurostat response has no DOI ${EUROSTAT_DOI}`);
  if (typeof payload.label !== 'string' || payload.label.trim() === '') fail('Eurostat dataset has no label');
  if (typeof payload.updated !== 'string' || payload.updated.trim() === '') fail('Eurostat dataset has no updated timestamp');
  if (!Array.isArray(payload.id) || !Array.isArray(payload.size)) fail('Eurostat payload has no id/size');
  const id = payload.id.map(String);
  const size = payload.size.map((n) => {
    if (!Number.isInteger(n) || (n as number) <= 0) fail('Eurostat size is not a positive integer list');
    return n as number;
  });
  if (id.length !== size.length) fail('Eurostat id/size length mismatch');
  if (!isRecord(payload.dimension)) fail('Eurostat payload has no dimension');

  const need = ['freq', 'purchase', 'unit', 'geo', 'time'];
  for (const dim of need) {
    if (!id.includes(dim)) fail(`Eurostat response has no ${dim} dimension`);
  }

  const positions = new Map<string, Map<string, number>>();
  const labels = new Map<string, Map<string, string>>();
  for (const dim of id) {
    const block = payload.dimension[dim];
    if (!isRecord(block) || !isRecord(block.category)) fail(`Eurostat dimension ${dim} has no category`);
    const cat = block.category as Category;
    positions.set(dim, categoryPositions(cat, dim));
    const lab = new Map<string, string>();
    if (cat.label) {
      for (const [code, text] of Object.entries(cat.label)) {
        if (typeof text !== 'string' || text.trim() === '') fail(`Eurostat label for ${dim}:${code} is empty`);
        lab.set(code, text);
      }
    }
    labels.set(dim, lab);
  }

  const freq = positions.get('freq')!;
  if (!freq.has('Q')) fail('Eurostat frequency Q is missing');
  const purchase = positions.get('purchase')!;
  if (!purchase.has('DW_NEW') || !purchase.has('TOTAL')) fail('Eurostat purchase series DW_NEW or TOTAL is missing');
  const unit = positions.get('unit')!;
  if (!unit.has('I15_Q') || !unit.has('RCH_A')) fail('Eurostat unit I15_Q or RCH_A is missing');
  const geoPos = positions.get('geo')!;
  const timePos = positions.get('time')!;

  const missingGeos: string[] = [];
  for (const geo of REQUIRED_GEOS) {
    if (!geoPos.has(geo)) fail(`Eurostat geo ${geo} is missing`);
    if (!labels.get('geo')!.get(geo)) fail(`Eurostat geo ${geo} has no label`);
  }
  for (const geo of optionalGeos) {
    if (REQUIRED_GEOS.includes(geo as RequiredGeo)) continue;
    if (!geoPos.has(geo)) missingGeos.push(geo);
  }

  const times = [...timePos.keys()];
  for (const period of times) {
    if (!/^\d{4}-Q[1-4]$/.test(period)) fail(`Eurostat time code is not a quarter: ${period}`);
  }
  const periods = times.filter((p) => quarterSortKey(p) >= quarterSortKey(SINCE_PERIOD)).sort((a, b) => quarterSortKey(a) - quarterSortKey(b));
  if (periods.length < MIN_QUARTERS) fail(`Eurostat returned ${periods.length} quarters since ${SINCE_PERIOD}, wanted at least ${MIN_QUARTERS}`);
  if (periods[0] !== SINCE_PERIOD) fail(`Eurostat series does not start at ${SINCE_PERIOD} (got ${periods[0]})`);
  if (new Set(periods).size !== periods.length) fail('Eurostat time dimension repeats a quarter');

  const dimIndex = Object.fromEntries(id.map((dim, i) => [dim, i]));
  const coordsFor = (geo: string, purchaseCode: string, unitCode: string, period: string): number => {
    const coords = Array(id.length).fill(0);
    coords[dimIndex.freq] = freq.get('Q')!;
    coords[dimIndex.purchase] = purchase.get(purchaseCode)!;
    coords[dimIndex.unit] = unit.get(unitCode)!;
    coords[dimIndex.geo] = geoPos.get(geo)!;
    coords[dimIndex.time] = timePos.get(period)!;
    return offsetOf(size, coords);
  };

  const geosWanted = [
    ...REQUIRED_GEOS,
    ...optionalGeos.filter((g) => geoPos.has(g) && !REQUIRED_GEOS.includes(g as RequiredGeo)),
  ];

  const geos = geosWanted.map((geo) => {
    const quarters: HpiQuarter[] = periods.map((period) => {
      const cell = (purchaseCode: 'DW_NEW' | 'TOTAL', unitCode: 'I15_Q' | 'RCH_A') =>
        readCell(payload.value, payload.status, coordsFor(geo, purchaseCode, unitCode, period), `${geo} ${purchaseCode} ${unitCode} ${period}`);
      const ni = cell('DW_NEW', 'I15_Q');
      const ny = cell('DW_NEW', 'RCH_A');
      const ti = cell('TOTAL', 'I15_Q');
      const ty = cell('TOTAL', 'RCH_A');
      for (const [name, c] of [['new index', ni], ['total index', ti]] as const) {
        if (c.value != null && c.value <= 0) fail(`Eurostat ${name} for ${geo} ${period} is not positive`);
      }
      return {
        period,
        new_index: ni.value,
        new_index_status: ni.status,
        new_yoy_pct: ny.value,
        new_yoy_status: ny.status,
        total_index: ti.value,
        total_index_status: ti.status,
        total_yoy_pct: ty.value,
        total_yoy_status: ty.status,
      };
    });
    const latest = quarters[quarters.length - 1];
    if (REQUIRED_GEOS.includes(geo as RequiredGeo)) {
      const required: Array<[string, number | null]> = [
        ['new index', latest.new_index],
        ['new annual change', latest.new_yoy_pct],
        ['total index', latest.total_index],
        ['total annual change', latest.total_yoy_pct],
      ];
      for (const [name, value] of required) {
        if (value == null) fail(`Eurostat ${name} for ${geo} ${latest.period} is missing`);
      }
    }
    const name = labels.get('geo')!.get(geo);
    if (!name) fail(`Eurostat geo ${geo} has no label`);
    return { code: geo, name, quarters };
  });

  const purchaseLabels = labels.get('purchase')!;
  const unitLabels = labels.get('unit')!;
  return {
    parsed: {
      label: payload.label.trim(),
      updated: payload.updated,
      doi: EUROSTAT_DOI,
      geos,
      seriesLabels: {
        new_index: `${purchaseLabels.get('DW_NEW') ?? 'DW_NEW'} · ${unitLabels.get('I15_Q') ?? 'I15_Q'}`,
        new_yoy: `${purchaseLabels.get('DW_NEW') ?? 'DW_NEW'} · ${unitLabels.get('RCH_A') ?? 'RCH_A'}`,
        total_index: `${purchaseLabels.get('TOTAL') ?? 'TOTAL'} · ${unitLabels.get('I15_Q') ?? 'I15_Q'}`,
        total_yoy: `${purchaseLabels.get('TOTAL') ?? 'TOTAL'} · ${unitLabels.get('RCH_A') ?? 'RCH_A'}`,
      },
    },
    missingGeos,
  };
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const raw = sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return Math.round(raw * 10) / 10;
}

export interface RawListing {
  location: string;
  country?: string | null;
  askingEurM2: number | null;
}

/** ISO code when the row carries one (GR is Eurostat's EL). Otherwise Spain, only via the province map. */
export function countryCode(location: string, country: string | null | undefined): string | null {
  if (typeof country === 'string' && country.trim()) {
    const code = country.trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(code)) return code === 'GR' ? 'EL' : code;
  }
  if (provinceFromLocation(location || '')) return 'ES';
  return null;
}

export function askingDayFromListings(date: string, listings: RawListing[], gaps: ReadonlyArray<{ from: string; to: string }> = KNOWN_GAPS): AskingDay {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(`asking date is not a day: ${date}`);
  const buckets = new Map<string, { listings: number; prices: number[] }>();
  let unmapped = 0;
  for (const row of listings) {
    const code = countryCode(row.location, row.country);
    if (!code) {
      unmapped += 1;
      continue;
    }
    let bucket = buckets.get(code);
    if (!bucket) {
      bucket = { listings: 0, prices: [] };
      buckets.set(code, bucket);
    }
    bucket.listings += 1;
    if (typeof row.askingEurM2 === 'number' && Number.isFinite(row.askingEurM2) && row.askingEurM2 > 0) {
      bucket.prices.push(row.askingEurM2);
    }
  }
  const countries: AskingCountryDay[] = [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([code, bucket]) => ({
      code,
      listings: bucket.listings,
      priced_listings: bucket.prices.length,
      median_asking_eur_m2: bucket.prices.length >= MIN_PRICED_LISTINGS ? median(bucket.prices) : null,
    }));
  return {
    date,
    during_declared_capture_gap: gaps.some((g) => date >= g.from && date <= g.to),
    unmapped_listings: unmapped,
    countries,
  };
}

/**
 * A full git rebuild replaces the stored tape only when it reaches back at
 * least as far as the stored tape and is not shorter. A shallow checkout
 * returns one commit; using that as the tape would delete every earlier day.
 * The current book is always upserted, so the latest capture is kept even
 * when history cannot be re-read.
 */
export function mergeAskingDays(previous: AskingDay[], rebuilt: AskingDay[] | null, current: AskingDay): AskingDay[] {
  const es = current.countries.find((c) => c.code === 'ES');
  if (!es || es.median_asking_eur_m2 == null || es.priced_listings < MIN_PRICED_LISTINGS) {
    fail('current Spain asking median is missing — refusing to publish');
  }
  const rebuiltDates = rebuilt ? new Set(rebuilt.map((d) => d.date)) : new Set<string>();
  const prevFirst = previous.length ? [...previous].sort((a, b) => a.date.localeCompare(b.date))[0].date : null;
  const rebuiltSorted = rebuilt ? [...rebuilt].sort((a, b) => a.date.localeCompare(b.date)) : [];
  const rebuildOk = rebuiltSorted.length >= 2
    && rebuiltDates.size === rebuiltSorted.length
    && (previous.length === 0 || (rebuiltSorted.length >= previous.length && rebuiltSorted[0].date <= (prevFirst ?? rebuiltSorted[0].date)));
  const base = rebuildOk && rebuilt ? rebuilt : previous;
  const by = new Map<string, AskingDay>();
  for (const day of base) {
    if (by.has(day.date)) fail(`duplicate asking day ${day.date}`);
    by.set(day.date, day);
  }
  by.set(current.date, current);
  const days = [...by.values()].sort((a, b) => a.date.localeCompare(b.date));
  if (days.length < 2) fail('asking tape has fewer than 2 days — refusing to publish');
  return days;
}

export interface AskingQuarterChange {
  period: string;
  first_date: string;
  last_date: string;
  first_median: number;
  last_median: number;
  capture_days: number;
  change_pct: number;
}

export function daySpan(start: string, end: string): number {
  const a = Date.parse(`${start}T00:00:00Z`);
  const b = Date.parse(`${end}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) fail(`date span is not two days: ${start} ${end}`);
  return Math.round((b - a) / 86_400_000);
}

/** Capture days with a published asking median for `code` inside a Eurostat quarter, excluding declared capture-gap days. */
export function askingDaysInQuarter(days: AskingDay[], code: string, period: string): AskingDay[] {
  const { start, end } = quarterBounds(period);
  return days.filter((d) => {
    if (d.date < start || d.date > end || d.during_declared_capture_gap) return false;
    return d.countries.some((c) => c.code === code && c.median_asking_eur_m2 != null);
  }).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Change in the asking median between the first and last non-gap capture day
 * inside a Eurostat quarter. Returns null unless the quarter actually has a
 * run of observations: at least MIN_QUARTER_CAPTURE_DAYS days, spanning at
 * least MIN_QUARTER_SPAN_DAYS. Two April days and then silence is not a rate.
 */
export function askingChangeInsideQuarter(days: AskingDay[], code: string, period: string): AskingQuarterChange | null {
  const inside = askingDaysInQuarter(days, code, period);
  if (inside.length < MIN_QUARTER_CAPTURE_DAYS) return null;
  if (daySpan(inside[0].date, inside[inside.length - 1].date) < MIN_QUARTER_SPAN_DAYS) return null;
  const first = inside[0].countries.find((c) => c.code === code)!;
  const last = inside[inside.length - 1].countries.find((c) => c.code === code)!;
  if (first.median_asking_eur_m2 == null || last.median_asking_eur_m2 == null || first.median_asking_eur_m2 === 0) return null;
  const change = ((last.median_asking_eur_m2 - first.median_asking_eur_m2) / first.median_asking_eur_m2) * 100;
  return {
    period,
    first_date: inside[0].date,
    last_date: inside[inside.length - 1].date,
    first_median: first.median_asking_eur_m2,
    last_median: last.median_asking_eur_m2,
    capture_days: inside.length,
    change_pct: Math.round(change * 10) / 10,
  };
}

export interface CalendarGap {
  start: string;
  end: string;
  missing_days: number;
}

export function calendarGaps(dates: string[]): CalendarGap[] {
  const unique = [...new Set(dates)].sort();
  if (unique.length < 2) return [];
  const set = new Set(unique);
  const gaps: CalendarGap[] = [];
  let cursor = addDays(unique[0], 1);
  const last = unique[unique.length - 1];
  let runStart: string | null = null;
  let run = 0;
  while (cursor <= last) {
    if (!set.has(cursor)) {
      if (!runStart) runStart = cursor;
      run += 1;
    } else if (runStart) {
      gaps.push({ start: runStart, end: addDays(cursor, -1), missing_days: run });
      runStart = null;
      run = 0;
    }
    cursor = addDays(cursor, 1);
  }
  return gaps;
}

function roleFor(code: string, days: AskingDay[]): GeoRole {
  if (AGGREGATES.has(code)) return 'aggregate';
  const published = days.some((d) => d.countries.some((c) => c.code === code && c.median_asking_eur_m2 != null));
  return published ? 'avena_book' : 'eurostat_only';
}

function countryOn(day: AskingDay | undefined, code: string): AskingCountryDay | null {
  return day?.countries.find((c) => c.code === code) ?? null;
}

export function buildEuHpiLayer(args: {
  parsed: ParsedHpi;
  missingGeos: string[];
  days: AskingDay[];
  apiUrl: string;
  retrievedAt: string;
  generatedAt: string;
}): EuHpiLayer {
  const days = [...args.days].sort((a, b) => a.date.localeCompare(b.date));
  if (days.length < 2) fail('asking tape has fewer than 2 days — refusing to publish');
  const latestDay = days[days.length - 1];
  const es = countryOn(latestDay, 'ES');
  if (!es || es.median_asking_eur_m2 == null) fail('Spain asking median is missing from the tape — refusing to publish');

  const geos: HpiGeo[] = args.parsed.geos.map((geo) => ({
    code: geo.code,
    name: geo.name,
    role: roleFor(geo.code, days),
    quarters: geo.quarters,
  }));
  const latestPeriod = geos[0]?.quarters[geos[0].quarters.length - 1]?.period;
  const firstPeriod = geos[0]?.quarters[0]?.period;
  if (!latestPeriod || !firstPeriod) fail('Eurostat layer has no quarters');
  for (const geo of geos) {
    if (geo.quarters[0]?.period !== firstPeriod || geo.quarters[geo.quarters.length - 1]?.period !== latestPeriod) {
      fail(`Eurostat geo ${geo.code} does not share the quarter span`);
    }
  }

  const esDays = days.filter((d) => countryOn(d, 'ES')?.median_asking_eur_m2 != null);
  const gapText = KNOWN_GAPS.length
    ? KNOWN_GAPS.map((g) => `${g.from} to ${g.to}`).join('; ')
    : null;
  const ptPublished = days.some((d) => countryOn(d, 'PT')?.median_asking_eur_m2 != null);
  const below = latestDay.countries
    .filter((c) => c.median_asking_eur_m2 == null)
    .map((c) => ({
      code: c.code,
      listings: c.listings,
      priced_listings: c.priced_listings,
      note: `${c.priced_listings} priced listings on ${latestDay.date}, below ${MIN_PRICED_LISTINGS}. No median is published.`,
    }));

  const coverage = [
    `Avena asking prices are the median EUR/m² of the committed listing book on each capture day. They are asking prices, not transaction prices, and not a house price index.`,
    `A listing with no country code is counted as Spain only when its location maps to a province in the Spain official benchmark. Other rows are unmapped (${latestDay.unmapped_listings.toLocaleString('en-GB')} on ${latestDay.date}) and are not given a country.`,
    `Spain has ${esDays.length.toLocaleString('en-GB')} capture days with a median, from ${esDays[0]?.date ?? '–'} to ${esDays[esDays.length - 1]?.date ?? '–'}. Calendar days with no committed book are absent and are not filled.`,
    ptPublished
      ? 'Portugal has an asking median on at least one capture day, from listings whose country code is PT.'
      : 'The listing book has no Portuguese asking median. Eurostat still publishes Portugal.',
    `A median is published only when a country has at least ${MIN_PRICED_LISTINGS} listings with a positive asking EUR/m² that day.`,
    `A change in that median inside a Eurostat quarter is calculated only when the quarter has at least ${MIN_QUARTER_CAPTURE_DAYS} such days spanning at least ${MIN_QUARTER_SPAN_DAYS} days. A shorter run is listed and no rate is calculated.`,
  ].join(' ');

  const caveats = [
    'Eurostat prc_hpi_q measures price changes of residential properties purchased by households. It is a transaction-price index. It is not an asking price and it is not a price per square metre.',
    `The new-dwelling series is purchase code DW_NEW (${args.parsed.seriesLabels.new_index}). The total series is purchase code TOTAL. The index is unit I15_Q. The annual rate of change is unit RCH_A.`,
    'The EU figure is geo EU27_2020. The euro area figure is geo EA20. Eurostat\'s labels for both are stored on the row. Neither aggregate is an Avena listing book.',
    'A change in the Avena median can come from the mix of listings on the book, not only from a change in one asking price.',
    ...(gapText
      ? [`The price-snapshot ledger declares no capture for ${gapText}. Tape days inside that span are flagged. They are not treated as a continuous asking series.`]
      : []),
    `Eurostat's latest quarter in this file is ${latestPeriod}. The latest Avena capture day is ${latestDay.date}. Those are not the same period.`,
    'Where Eurostat leaves a cell empty, this file stores null. It does not store zero.',
  ];

  return {
    generated_at: args.generatedAt,
    status: 'ready',
    source: {
      agency: 'Eurostat',
      dataset: DATASET,
      label: args.parsed.label,
      doi: args.parsed.doi,
      updated: args.parsed.updated,
      latest_period: latestPeriod,
      first_period: firstPeriod,
      retrieved_at: args.retrievedAt,
      api_url: args.apiUrl,
      browser_url: EUROSTAT_BROWSER,
      metadata_url: EUROSTAT_METADATA,
      copyright_url: EUROSTAT_COPYRIGHT,
      licence_note: LICENCE_NOTE,
      series: [
        { purchase: 'DW_NEW', unit: 'I15_Q', label: args.parsed.seriesLabels.new_index },
        { purchase: 'DW_NEW', unit: 'RCH_A', label: args.parsed.seriesLabels.new_yoy },
        { purchase: 'TOTAL', unit: 'I15_Q', label: args.parsed.seriesLabels.total_index },
        { purchase: 'TOTAL', unit: 'RCH_A', label: args.parsed.seriesLabels.total_yoy },
      ],
    },
    geos,
    omissions: args.missingGeos.map((geo) => ({
      geo,
      reason: `Requested because the listing book has country ${geo}. Eurostat prc_hpi_q did not return that geo. No index is filled in.`,
    })),
    avena: {
      what: 'Median asking EUR per square metre of the committed new-build listing book, by country, on each capture day.',
      min_priced_listings: MIN_PRICED_LISTINGS,
      first_date: days[0].date,
      latest_date: latestDay.date,
      observation_days: days.length,
      days,
      below_threshold: below,
      coverage_note: coverage,
    },
    caveats,
  };
}

export function latestQuarter(geo: HpiGeo): HpiQuarter {
  const q = geo.quarters[geo.quarters.length - 1];
  if (!q) fail(`geo ${geo.code} has no quarters`);
  return q;
}
