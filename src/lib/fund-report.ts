/**
 * Pure aggregates for the sample fund report.
 *
 * Every published figure is computed from rows the caller already holds
 * (the live book, price_snapshots, sold_properties). An empty input returns
 * null, never a zero that could be read as a measured market.
 */

import { LEDGER_EPOCH } from '@/lib/open-dataset-io';

export { LEDGER_EPOCH };

/** Towns below this count are omitted from the town table and counted instead. */
export const MIN_TOWN_N = 5;
/** Absorption by town is omitted below this starting book. Region rows stay. */
export const MIN_TOWN_ABSORPTION = 30;
/** A paired asking-price change inside this band is "flat", not a cut or a rise. */
export const MATERIAL_MOVE = 0.01;

export interface LiveListing {
  ref: string | null;
  town: string;
  costa: string;
  region: string;
  price: number | null;
  pm2: number | null;
  mm2: number | null;
  score: number | null;
  yieldGross: number | null;
  /** Attribution string from the yield model. Null when no yield was computed. */
  yieldSource: string | null;
}

export interface SnapListing {
  ref: string;
  date: string;
  price: number | null;
  pm2: number | null;
  town: string | null;
  region: string | null;
}

export interface SoldListing {
  ref: string;
  town: string | null;
  region: string | null;
  lastPrice: number | null;
  lastSeen: string | null;
}

export interface Bucket {
  label: string;
  n: number;
}

export interface GroupRow {
  key: string;
  label: string;
  /** Most common costa when the row is a town. Null for costa rows. */
  detail: string | null;
  n: number;
  priced: number;
  medianPrice: number | null;
  medianPm2: number | null;
  p25Pm2: number | null;
  p75Pm2: number | null;
  medianScore: number | null;
  medianYield: number | null;
}

export interface BookOverview {
  n: number;
  priced: number;
  scored: number;
  withYield: number;
  towns: number;
  townsReported: number;
  townsOmitted: number;
  costas: number;
  medianPrice: number | null;
  medianPm2: number | null;
  medianScore: number | null;
  medianYield: number | null;
  /** Share of listings with both asking and benchmark €/m² whose asking price is below the benchmark. */
  shareBelowBenchmark: number | null;
  benchmarkCompared: number;
  yieldTownCard: number;
  yieldEstimated: number;
  byCosta: GroupRow[];
  byTown: GroupRow[];
  scoreBuckets: Bucket[];
  yieldBuckets: Bucket[];
}

export interface DayLevel {
  date: string;
  n: number;
  priced: number;
  medianPrice: number | null;
  medianPm2: number | null;
}

export interface PairedSlice {
  key: string;
  label: string;
  paired: number;
  medianChange: number | null;
}

export interface PriceHistory {
  firstDate: string;
  lastDate: string;
  spanDays: number;
  observedDays: number;
  missing: MissingRange[];
  longestMissingDays: number;
  /** Cross-section of the book on sampled days. Mix changes as listings enter and leave. */
  samples: DayLevel[];
  /** Same ref on the first and latest day. This is the paired asking-price change. */
  paired: number;
  medianPairedChange: number | null;
  byRegion: PairedSlice[];
  byTown: PairedSlice[];
  townsOmitted: number;
}

export interface MissingRange {
  start: string;
  end: string;
  missingDays: number;
}

export interface AbsorptionRow {
  key: string;
  label: string;
  startBook: number;
  latestBook: number;
  /** In the start book, absent from the latest day, and present in sold_properties. */
  recordedExits: number;
  /** In the start book and absent from the latest day, with no sold_properties row. */
  unrecordedExits: number;
  /** In sold_properties and still present on the latest day. */
  relisted: number;
  exitRate: number | null;
}

export interface Absorption {
  startDate: string;
  endDate: string;
  startBook: number;
  latestBook: number;
  recordedExits: number;
  unrecordedExits: number;
  relisted: number;
  exitRate: number | null;
  soldRows: number;
  soldOutsideStartBook: number;
  byRegion: AbsorptionRow[];
  byTown: AbsorptionRow[];
  townsOmitted: number;
}

export function quantile(sorted: number[], q: number): number | null {
  if (!sorted.length || q < 0 || q > 1 || !Number.isFinite(q)) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  const w = pos - lo;
  return sorted[lo] * (1 - w) + sorted[hi] * w;
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return quantile(sorted, 0.5);
}

export function rate(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return null;
  return numerator / denominator;
}

function positives(values: Array<number | null | undefined>): number[] {
  const out: number[] = [];
  for (const v of values) {
    if (v == null || !Number.isFinite(v) || v <= 0) continue;
    out.push(v);
  }
  return out;
}

function finite(values: Array<number | null | undefined>): number[] {
  const out: number[] = [];
  for (const v of values) {
    if (v == null || !Number.isFinite(v)) continue;
    out.push(v);
  }
  return out;
}

export function isoAddDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function daysBetween(earlier: string, later: string): number {
  const ms = Date.parse(`${later}T00:00:00Z`) - Date.parse(`${earlier}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

export function calendarDays(from: string, to: string): string[] {
  if (to < from) return [];
  const out: string[] = [];
  for (let d = from; d <= to; d = isoAddDays(d, 1)) out.push(d);
  return out;
}

/** Unique YYYY-MM-DD values, ascending. Invalid entries are dropped. */
export function uniqueDates(dates: string[]): string[] {
  const set = new Set<string>();
  for (const d of dates) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) set.add(d);
  }
  return [...set].sort();
}

export function findMissingRanges(observed: string[]): MissingRange[] {
  const dates = uniqueDates(observed);
  const out: MissingRange[] = [];
  for (let i = 1; i < dates.length; i++) {
    const gap = daysBetween(dates[i - 1], dates[i]);
    if (gap > 1) {
      out.push({
        start: isoAddDays(dates[i - 1], 1),
        end: isoAddDays(dates[i], -1),
        missingDays: gap - 1,
      });
    }
  }
  return out;
}

/**
 * First day, then every 7th observed day, then the last day if the stride missed it.
 * Sampled observation days, not a filled calendar.
 */
export function selectTrendDates(observed: string[]): string[] {
  const dates = uniqueDates(observed);
  if (dates.length <= 2) return dates;
  const out: string[] = [];
  for (let i = 0; i < dates.length; i += 7) out.push(dates[i]);
  const last = dates[dates.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

/**
 * Use the published movement-ledger dates only when both endpoints match the
 * live price_snapshots bounds. A ledger that has drifted is not a calendar.
 */
export function reconcileObservedDates(
  liveMin: string | null,
  liveMax: string | null,
  ledgerDates: string[] | null,
): { dates: string[]; source: 'ledger' | 'unresolved' } {
  if (!liveMin || !liveMax || liveMax < liveMin) return { dates: [], source: 'unresolved' };
  if (!ledgerDates?.length) return { dates: [], source: 'unresolved' };
  const dates = uniqueDates(ledgerDates.filter((d) => d >= LEDGER_EPOCH));
  if (!dates.length) return { dates: [], source: 'unresolved' };
  if (dates[0] !== liveMin || dates[dates.length - 1] !== liveMax) {
    return { dates: [], source: 'unresolved' };
  }
  return { dates, source: 'ledger' };
}

const SCORE_BUCKETS: { label: string; min: number; max: number }[] = [
  { label: 'Under 40', min: -Infinity, max: 40 },
  { label: '40–49', min: 40, max: 50 },
  { label: '50–59', min: 50, max: 60 },
  { label: '60–69', min: 60, max: 70 },
  { label: '70–79', min: 70, max: 80 },
  { label: '80 and above', min: 80, max: Infinity },
];

const YIELD_BUCKETS: { label: string; min: number; max: number }[] = [
  { label: 'Under 4%', min: -Infinity, max: 4 },
  { label: '4% to under 6%', min: 4, max: 6 },
  { label: '6% to under 8%', min: 6, max: 8 },
  { label: '8% and above', min: 8, max: Infinity },
];

function buckets(values: number[], spec: { label: string; min: number; max: number }[]): Bucket[] {
  return spec.map((b) => ({
    label: b.label,
    n: values.filter((v) => v >= b.min && v < b.max).length,
  }));
}

function modeCosta(list: LiveListing[]): string | null {
  const counts = new Map<string, number>();
  for (const row of list) {
    const costa = row.costa.trim();
    if (!costa) continue;
    counts.set(costa, (counts.get(costa) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  return top ? top[0] : null;
}

function groupRows(
  listings: LiveListing[],
  keyOf: (row: LiveListing) => string,
  minN: number,
  withDetail: boolean,
): { rows: GroupRow[]; omitted: number } {
  const map = new Map<string, LiveListing[]>();
  for (const row of listings) {
    const key = keyOf(row).trim();
    if (!key) continue;
    const list = map.get(key);
    if (list) list.push(row);
    else map.set(key, [row]);
  }
  const rows: GroupRow[] = [];
  let omitted = 0;
  for (const [key, list] of map) {
    if (list.length < minN) {
      omitted += 1;
      continue;
    }
    const pm2 = positives(list.map((r) => r.pm2));
    const pm2Sorted = [...pm2].sort((a, b) => a - b);
    rows.push({
      key,
      label: key,
      detail: withDetail ? modeCosta(list) : null,
      n: list.length,
      priced: positives(list.map((r) => r.price)).length,
      medianPrice: median(positives(list.map((r) => r.price))),
      medianPm2: median(pm2),
      p25Pm2: quantile(pm2Sorted, 0.25),
      p75Pm2: quantile(pm2Sorted, 0.75),
      medianScore: median(finite(list.map((r) => r.score))),
      medianYield: median(finite(list.map((r) => r.yieldGross))),
    });
  }
  rows.sort((a, b) => b.n - a.n || a.label.localeCompare(b.label));
  return { rows, omitted };
}

export function buildBookOverview(listings: LiveListing[]): BookOverview {
  const prices = positives(listings.map((r) => r.price));
  const pm2s = positives(listings.map((r) => r.pm2));
  const scores = finite(listings.map((r) => r.score));
  const yields = finite(listings.map((r) => r.yieldGross));
  let below = 0;
  let compared = 0;
  let townCard = 0;
  let estimated = 0;
  for (const row of listings) {
    if (row.pm2 != null && row.pm2 > 0 && row.mm2 != null && row.mm2 > 0) {
      compared += 1;
      if (row.pm2 < row.mm2) below += 1;
    }
    if (row.yieldGross == null || !Number.isFinite(row.yieldGross)) continue;
    if (row.yieldSource && /estimated/i.test(row.yieldSource)) estimated += 1;
    else if (row.yieldSource) townCard += 1;
    else estimated += 1;
  }
  const towns = groupRows(listings, (r) => r.town, MIN_TOWN_N, true);
  const costas = groupRows(listings, (r) => r.costa, 1, false);
  const townNames = new Set(listings.map((r) => r.town.trim()).filter(Boolean));
  const costaNames = new Set(listings.map((r) => r.costa.trim()).filter(Boolean));
  return {
    n: listings.length,
    priced: prices.length,
    scored: scores.length,
    withYield: yields.length,
    towns: townNames.size,
    townsReported: towns.rows.length,
    townsOmitted: towns.omitted,
    costas: costaNames.size,
    medianPrice: median(prices),
    medianPm2: median(pm2s),
    medianScore: median(scores),
    medianYield: median(yields),
    shareBelowBenchmark: rate(below, compared),
    benchmarkCompared: compared,
    yieldTownCard: townCard,
    yieldEstimated: estimated,
    byCosta: costas.rows,
    byTown: towns.rows,
    scoreBuckets: buckets(scores, SCORE_BUCKETS),
    yieldBuckets: buckets(yields, YIELD_BUCKETS),
  };
}

/** Most common costa name on the live book for each region code. Unknown codes stay as codes. */
export function regionLabels(listings: { region: string; costa: string }[]): Map<string, string> {
  const counts = new Map<string, Map<string, number>>();
  for (const row of listings) {
    const region = row.region.trim();
    const costa = row.costa.trim();
    if (!region || !costa) continue;
    let inner = counts.get(region);
    if (!inner) {
      inner = new Map();
      counts.set(region, inner);
    }
    inner.set(costa, (inner.get(costa) ?? 0) + 1);
  }
  const out = new Map<string, string>();
  for (const [region, inner] of counts) {
    const top = [...inner.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    if (top) out.set(region, top[0]);
  }
  return out;
}

export function labelFor(labels: Map<string, string>, key: string | null): string {
  if (!key) return 'Unspecified';
  return labels.get(key) ?? key;
}

function dayLevel(date: string, rows: SnapListing[]): DayLevel {
  const prices = positives(rows.map((r) => r.price));
  const pm2s = positives(rows.map((r) => r.pm2));
  return {
    date,
    n: rows.length,
    priced: prices.length,
    medianPrice: median(prices),
    medianPm2: median(pm2s),
  };
}

function pairedChange(entry: number, exit: number): number | null {
  if (!Number.isFinite(entry) || !Number.isFinite(exit) || entry <= 0 || exit <= 0) return null;
  return (exit - entry) / entry;
}

export function buildPriceHistory(
  byDate: Map<string, SnapListing[]>,
  observedAsc: string[],
  labels: Map<string, string>,
): PriceHistory | null {
  const observed = uniqueDates(observedAsc);
  if (observed.length < 2) return null;
  const firstDate = observed[0];
  const lastDate = observed[observed.length - 1];
  const first = byDate.get(firstDate) ?? [];
  const last = byDate.get(lastDate) ?? [];
  if (!first.length || !last.length) return null;

  const samples: DayLevel[] = [];
  for (const date of selectTrendDates(observed)) {
    const rows = byDate.get(date);
    if (!rows?.length) continue;
    samples.push(dayLevel(date, rows));
  }

  const lastByRef = new Map<string, SnapListing>();
  for (const row of last) {
    if (row.price != null && row.price > 0) lastByRef.set(row.ref, row);
  }

  const changes: number[] = [];
  const byRegion = new Map<string, number[]>();
  const byTown = new Map<string, number[]>();
  const pairedRefs = new Set<string>();
  for (const row of first) {
    if (row.price == null || row.price <= 0) continue;
    const exit = lastByRef.get(row.ref);
    if (!exit || exit.price == null) continue;
    const change = pairedChange(row.price, exit.price);
    if (change == null) continue;
    pairedRefs.add(row.ref);
    changes.push(change);
    const region = row.region?.trim() || 'Unspecified';
    const town = row.town?.trim() || '';
    const regionList = byRegion.get(region);
    if (regionList) regionList.push(change);
    else byRegion.set(region, [change]);
    if (town) {
      const townList = byTown.get(town);
      if (townList) townList.push(change);
      else byTown.set(town, [change]);
    }
  }

  const regionRows: PairedSlice[] = [...byRegion.entries()]
    .map(([key, list]) => ({
      key,
      label: labelFor(labels, key),
      paired: list.length,
      medianChange: median(list),
    }))
    .sort((a, b) => b.paired - a.paired || a.label.localeCompare(b.label));

  let townsOmitted = 0;
  const townRows: PairedSlice[] = [];
  for (const [key, list] of byTown) {
    if (list.length < MIN_TOWN_ABSORPTION) {
      townsOmitted += 1;
      continue;
    }
    townRows.push({ key, label: key, paired: list.length, medianChange: median(list) });
  }
  townRows.sort((a, b) => b.paired - a.paired || a.label.localeCompare(b.label));

  const missing = findMissingRanges(observed);
  return {
    firstDate,
    lastDate,
    spanDays: daysBetween(firstDate, lastDate),
    observedDays: observed.length,
    missing,
    longestMissingDays: missing.reduce((m, g) => Math.max(m, g.missingDays), 0),
    samples,
    paired: pairedRefs.size,
    medianPairedChange: median(changes),
    byRegion: regionRows,
    byTown: townRows,
    townsOmitted,
  };
}

export function buildAbsorption(
  start: SnapListing[],
  latest: SnapListing[],
  sold: SoldListing[],
  startDate: string,
  endDate: string,
  labels: Map<string, string>,
): Absorption | null {
  if (!start.length || !latest.length) return null;
  const latestRefs = new Set(latest.map((r) => r.ref));
  const startRefs = new Set(start.map((r) => r.ref));
  const soldRefs = new Set(sold.map((r) => r.ref));

  const regionStart = new Map<string, Set<string>>();
  const townStart = new Map<string, Set<string>>();
  for (const row of start) {
    const region = row.region?.trim() || 'Unspecified';
    let set = regionStart.get(region);
    if (!set) {
      set = new Set();
      regionStart.set(region, set);
    }
    set.add(row.ref);
    const town = row.town?.trim();
    if (town) {
      let towns = townStart.get(town);
      if (!towns) {
        towns = new Set();
        townStart.set(town, towns);
      }
      towns.add(row.ref);
    }
  }
  const regionLatest = new Map<string, number>();
  const townLatest = new Map<string, number>();
  for (const row of latest) {
    const region = row.region?.trim() || 'Unspecified';
    regionLatest.set(region, (regionLatest.get(region) ?? 0) + 1);
    const town = row.town?.trim();
    if (town) townLatest.set(town, (townLatest.get(town) ?? 0) + 1);
  }

  function summarise(refs: Set<string>, latestCount: number, key: string, label: string): AbsorptionRow {
    let recordedExits = 0;
    let unrecordedExits = 0;
    let relisted = 0;
    for (const ref of refs) {
      const still = latestRefs.has(ref);
      const inSold = soldRefs.has(ref);
      if (!still && inSold) recordedExits += 1;
      else if (!still && !inSold) unrecordedExits += 1;
      else if (still && inSold) relisted += 1;
    }
    const exits = recordedExits + unrecordedExits;
    return {
      key,
      label,
      startBook: refs.size,
      latestBook: latestCount,
      recordedExits,
      unrecordedExits,
      relisted,
      exitRate: rate(exits, refs.size),
    };
  }

  const book = summarise(startRefs, latest.length, 'book', 'Whole book');
  const byRegion = [...regionStart.entries()]
    .map(([key, refs]) => summarise(refs, regionLatest.get(key) ?? 0, key, labelFor(labels, key)))
    .sort((a, b) => b.startBook - a.startBook || a.label.localeCompare(b.label));

  let townsOmitted = 0;
  const byTown: AbsorptionRow[] = [];
  for (const [key, refs] of townStart) {
    if (refs.size < MIN_TOWN_ABSORPTION) {
      townsOmitted += 1;
      continue;
    }
    byTown.push(summarise(refs, townLatest.get(key) ?? 0, key, key));
  }
  byTown.sort((a, b) => b.startBook - a.startBook || a.label.localeCompare(b.label));

  let soldOutside = 0;
  for (const ref of soldRefs) {
    if (!startRefs.has(ref)) soldOutside += 1;
  }

  return {
    startDate,
    endDate,
    startBook: book.startBook,
    latestBook: book.latestBook,
    recordedExits: book.recordedExits,
    unrecordedExits: book.unrecordedExits,
    relisted: book.relisted,
    exitRate: book.exitRate,
    soldRows: sold.length,
    soldOutsideStartBook: soldOutside,
    byRegion,
    byTown,
    townsOmitted,
  };
}
