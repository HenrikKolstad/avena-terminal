/**
 * Weekly same-unit asking-price index.
 *
 * Built from the closed-week captures of public/data.json (the same calendar
 * as the vintages). A listing ref contributes to a change only when Market
 * Pulse would call it the same unit: src/lib/unit-identity.ts. A different
 * size, bedroom count or type is a different apartment on the same ref and
 * is excluded. A move of LARGE_MOVE or more is held back unless that check
 * verifies it.
 *
 * The published number is a chain of unweighted geometric means of
 * asking-price relatives. Base 100 on the first eligible capture. A week
 * with no capture is a gap row. Nothing is interpolated. A cell under its
 * matched-pair minimum is published as counts only: the index and the
 * breadth shares stay blank.
 *
 * This is not the AVENA composite (/avena-index, /api/v1/indices) and it is
 * not an official transaction-price index. Asking prices only.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { ES_PROVINCE_DEFS, provinceFromLocation } from '@/lib/data-sources/ine-es';
import { unitSpecOf } from '@/lib/unit-spec';
import { LARGE_MOVE, RECUR_DAYS, SIZE_TOL, moveVerdict, specChangeNote, type SnapSide } from '@/lib/unit-identity';
import {
  KNOWN_GAPS,
  SERIES_START,
  addDays,
  inKnownGap,
  shareOf,
  type PlannedWeek,
} from '@/lib/vintages';

export { KNOWN_GAPS, SERIES_START };

export const PRICE_INDEX_BASE = 100;

/** Below this many matched pairs the index and the breadth shares are blank. */
export const MIN_MATCHED_PAIRS = {
  coast: 30,
  province: 15,
  town: 8,
} as const;

export type PriceIndexLevel = 'coast' | 'province' | 'town';
export type PriceIndexStatus = 'base' | 'observed' | 'suppressed' | 'gap';

const GAP_WEEK_REASON =
  'No eligible capture in this closed week. No index value is published. The week is not interpolated.';

export const PRICE_INDEX_METHOD =
  `Weekly chain of same-unit asking-price changes in the committed listing book. An eligible capture is the last commit of public/data.json in a closed ISO week, Monday to Sunday UTC, on or after ${SERIES_START}, excluding days inside a declared capture gap. The base is ${PRICE_INDEX_BASE} on the first eligible capture. Each later published value is the previous value multiplied by the unweighted geometric mean of asking-price relatives for refs that are the same unit in the same place. The same-unit rule is the Market Pulse unit-identity check: property type, bedrooms and bathrooms equal, and built and plot size within ${Math.round(SIZE_TOL * 100)}%. A specification change is excluded. A change of ${Math.round(LARGE_MOVE * 100)}% or more is held back unless that check verifies it: full specs on both sides, the same photo set, a new EUR/m² within the area-benchmark band, and a price that does not return exactly to an earlier asking price of that ref on this weekly series within ${RECUR_DAYS} days. Unchanged asking prices of the same unit stay in the mean. A closed week with no eligible capture is a gap row with no index value. A step whose comparison dates cover a declared capture gap is the change between the two captures that exist. It is not split into the missing days, and those days are not filled in. A cell with fewer matched pairs than its minimum has no index and no breadth share. The pair counts are still published. Figures are asking prices. This is not a transaction price, not the Eurostat house price index, and not the AVENA composite.`;

export const PRICE_INDEX_CAVEATS = [
  'Asking prices of new-build listings. A ref that leaves the book is not a recorded sale.',
  'A ref is a feed reference. On a new-build it is often one unit type in a development, not one dwelling. The match holds the advertised specification fixed. It does not prove a single dwelling.',
  'Each matched ref has equal weight. A higher asking price does not count for more.',
  `A change below ${Math.round(LARGE_MOVE * 100)}% is accepted when a specification field is absent on one side. A change of ${Math.round(LARGE_MOVE * 100)}% or more is held back when a required spec is missing.`,
  `A return to an earlier asking price is judged on earlier captures in this weekly series, within ${RECUR_DAYS} days. It is not a read of every daily snapshot.`,
  `The series starts on ${SERIES_START}, a Wednesday. The base week is not seven days of captures.`,
  'Dates inside a declared capture gap have no index value. No week on this series is interpolated.',
  'The published index is the unrounded chain, rounded half away from zero to 2 decimal places. The published weekly change is that week\'s geometric mean, not the gap between the rounded levels.',
] as const;

export const PRICE_INDEX_DEFINITIONS = {
  index: `Chain of same-unit asking-price relatives. ${PRICE_INDEX_BASE} on the segment base date. Blank when the cell is under its matched-pair minimum, or when the week has no capture.`,
  change_pct: 'Unweighted geometric mean of this capture\'s asking price divided by the previous capture\'s asking price, minus one, in percent, for matched pairs. Blank on the base week, on a gap week, and when the cell is suppressed. Not a daily rate, and not split across missing days.',
  matched_pairs: 'Refs with a positive single asking price on both captures, in the same place for this row, that pass the same-unit check. Includes unchanged prices. Blank on the base week and on a gap week.',
  priced_listings: 'Listings in this cell on the capture date with one positive asking price. A from-to range is not one price.',
  cuts: 'Matched pairs whose asking price fell by at least EUR 1.',
  rises: 'Matched pairs whose asking price rose by at least EUR 1.',
  unchanged: 'Matched pairs whose asking price moved by less than EUR 1.',
  cut_share: 'Cuts divided by matched pairs, half-up to 4 decimal places. Blank when the cell is suppressed or there is no comparison.',
  rise_share: 'Rises divided by matched pairs, on the same terms as the cut share.',
  unchanged_share: 'Unchanged divided by matched pairs, on the same terms as the cut share.',
  excluded_spec_change: 'Refs in both captures, in this place, whose type, bedrooms, bathrooms, built size or plot size disagree. Excluded whether or not the asking price changed. Not a price move.',
  held_back_large_move: `Refs in both captures, in this place, whose asking price moved by ${Math.round(LARGE_MOVE * 100)}% or more and which the unit-identity check could not verify. Excluded.`,
  reassigned: 'Coast rows only. Refs present in both captures whose town or province changed. Not a price move.',
  excluded_unpriced: 'Refs in both captures, in this place, with no positive asking price on at least one side.',
  excluded_price_range: 'Refs in both captures, in this place, where either capture advertises a from-to range rather than one asking price.',
  spans_declared_capture_gap: 'True when the days between the two captures include a declared capture gap. The index steps once, by the observed matched-pair change. The missing days have no value.',
  suppressed: 'True when matched pairs are under the minimum for this level. The index and the shares are blank. The counts are the counted pairs.',
} as const;

export interface IndexListing {
  ref: string;
  town: string;
  provinceKey: string | null;
  provinceName: string | null;
  priceEur: number;
  ranged: boolean;
  type: string | null;
  builtM2: number | null;
  plotM2: number | null;
  beds: number | null;
  baths: number | null;
  pm2: number | null;
  mm2: number | null;
  imgSig: string | null;
}

export interface PriceIndexRow {
  level: PriceIndexLevel;
  key: string;
  name: string;
  province: string | null;
  iso_week: string;
  week_start: string;
  week_end: string;
  status: PriceIndexStatus;
  capture_date: string | null;
  compared_to: string | null;
  index: number | null;
  change_pct: number | null;
  matched_pairs: number | null;
  priced_listings: number | null;
  cuts: number | null;
  rises: number | null;
  unchanged: number | null;
  cut_share: string | null;
  rise_share: string | null;
  unchanged_share: string | null;
  excluded_spec_change: number | null;
  held_back_large_move: number | null;
  reassigned: number | null;
  excluded_unpriced: number | null;
  excluded_price_range: number | null;
  suppressed: boolean;
  new_segment: boolean;
  segment_base_date: string | null;
  spans_declared_capture_gap: boolean;
  gap_dates: string[];
  missing_days: string[];
  week_gap_dates: string[];
  reason: string | null;
}

export interface PriceIndexLatest {
  capture_date: string;
  iso_week: string;
  compared_to: string | null;
  index: number | null;
  change_pct: number | null;
  matched_pairs: number | null;
  priced_listings: number | null;
  cuts: number | null;
  rises: number | null;
  unchanged: number | null;
  cut_share: string | null;
  rise_share: string | null;
  unchanged_share: string | null;
  excluded_spec_change: number | null;
  held_back_large_move: number | null;
  spans_declared_capture_gap: boolean;
  gap_dates: string[];
  status: PriceIndexStatus;
}

export interface PriceIndexFile {
  schema_version: 1;
  methodology_version: '1.0';
  name: 'Avena same-unit asking-price index';
  base: number;
  series_start: string;
  data_as_of: string | null;
  min_matched_pairs: { coast: number; province: number; town: number };
  known_gaps: Array<{ from: string; to: string; note: string }>;
  method: string;
  caveats: readonly string[];
  definitions: typeof PRICE_INDEX_DEFINITIONS;
  towns_published: number;
  towns_omitted: number;
  latest: PriceIndexLatest | null;
  rows: PriceIndexRow[];
}

export interface PriceIndexMins {
  coast: number;
  province: number;
  town: number;
}

interface Bucket {
  ratios: number[];
  cuts: number;
  rises: number;
  unchanged: number;
  spec: number;
  held: number;
  unpriced: number;
  ranged: number;
  reassigned: number;
  priced: number;
}

interface CellRef {
  level: PriceIndexLevel;
  key: string;
  name: string;
  province: string | null;
}

const COAST_KEY = 'coast';

export function roundHalfAway(value: number, places: number): number {
  if (!Number.isFinite(value)) throw new Error('cannot round a non-finite index value');
  const factor = 10 ** places;
  const sign = value < 0 ? -1 : 1;
  const nudged = Math.abs(value) * factor + 1e-8;
  const base = Math.floor(nudged);
  const frac = nudged - base;
  const whole = frac >= 0.5 ? base + 1 : base;
  return (sign * whole) / factor;
}

export function geometricMean(ratios: number[]): number {
  if (!ratios.length) throw new Error('geometric mean of no pairs');
  let sum = 0;
  for (const ratio of ratios) {
    if (!(ratio > 0) || !Number.isFinite(ratio)) throw new Error('price relative is not a positive number');
    sum += Math.log(ratio);
  }
  return Math.exp(sum / ratios.length);
}

/** Same-unit class for a pair of captures. `matched` includes an unchanged price. */
export function classifyPair(
  prev: SnapSide,
  cur: SnapSide,
  mm2?: number | null,
  priceRecurs = false,
): 'matched' | 'spec_change' | 'held_back' | 'skip' {
  const pp = Number(prev.price);
  const cp = Number(cur.price);
  if (!(pp > 0) || !(cp > 0)) return 'skip';
  if (specChangeNote(prev, cur)) return 'spec_change';
  if (Math.abs(cp - pp) < 1) return 'matched';
  const verdict = moveVerdict(prev, cur, mm2, priceRecurs);
  if (!verdict || verdict.status === 'verified') return 'matched';
  if (verdict.status === 'unit_changed') return 'spec_change';
  return 'held_back';
}

function emptyBucket(): Bucket {
  return { ratios: [], cuts: 0, rises: 0, unchanged: 0, spec: 0, held: 0, unpriced: 0, ranged: 0, reassigned: 0, priced: 0 };
}

function sideOf(row: IndexListing): SnapSide {
  return {
    price: row.priceEur,
    pm2: row.pm2,
    type: row.type,
    built_m2: row.builtM2,
    plot_m2: row.plotM2,
    beds: row.beds,
    baths: row.baths,
    img_sig: row.imgSig,
  };
}

function cellId(level: PriceIndexLevel, key: string): string {
  return `${level}:${key}`;
}

function provinceName(key: string, fallback: string | null): string {
  return ES_PROVINCE_DEFS.find((p) => p.key === key)?.name ?? fallback ?? key;
}

export function indexListingsFromBook(raw: unknown): IndexListing[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('listing book is not a non-empty array — refusing to build an index from an empty book');
  }
  const out: IndexListing[] = [];
  const seen = new Set<string>();
  const townProvinces = new Map<string, Set<string>>();
  for (const row of raw) {
    if (!row || typeof row !== 'object') throw new Error('listing book row is not an object');
    const rec = row as Record<string, unknown>;
    if (typeof rec.ref !== 'string' || !rec.ref.trim()) throw new Error('listing book row has no ref');
    const ref = rec.ref.trim();
    if (seen.has(ref)) throw new Error(`duplicate ref in listing book: ${ref}`);
    seen.add(ref);
    if (typeof rec.l !== 'string' || !rec.l.trim()) throw new Error(`listing ${ref} has no location`);
    const town = rec.l.split(',')[0]?.trim() ?? '';
    if (!town) throw new Error(`listing ${ref} has no town`);
    const province = provinceFromLocation(rec.l);
    const pf = typeof rec.pf === 'number' && Number.isFinite(rec.pf) ? rec.pf : 0;
    const pt = typeof rec.pt === 'number' && Number.isFinite(rec.pt) ? rec.pt : pf;
    const ranged = pf > 0 && pt > 0 && pf !== pt;
    const priceEur = !ranged && pf > 0 ? pf : 0;
    const imgs = Array.isArray(rec.imgs) ? rec.imgs.filter((url): url is string => typeof url === 'string' && url.length > 0) : [];
    const spec = unitSpecOf({ bm: rec.bm, pl: rec.pl, bd: rec.bd, ba: rec.ba, imgs });
    const type = typeof rec.t === 'string' && rec.t.trim() ? rec.t.trim() : null;
    const pm2 = typeof rec.pm2 === 'number' && Number.isFinite(rec.pm2) && rec.pm2 > 0 ? rec.pm2 : null;
    const mm2 = typeof rec.mm2 === 'number' && Number.isFinite(rec.mm2) && rec.mm2 > 0 ? rec.mm2 : null;
    const provinceLabel = province?.key ?? '';
    const known = townProvinces.get(town);
    if (known) known.add(provinceLabel);
    else townProvinces.set(town, new Set([provinceLabel]));
    out.push({
      ref,
      town,
      provinceKey: province?.key ?? null,
      provinceName: province?.name ?? null,
      priceEur,
      ranged,
      type,
      builtM2: spec.built_m2,
      plotM2: spec.plot_m2,
      beds: spec.beds,
      baths: spec.baths,
      pm2,
      mm2,
      imgSig: spec.img_sig,
    });
  }
  for (const [town, provinces] of townProvinces) {
    if (provinces.size > 1) {
      throw new Error(`town ${town} is in more than one province in one capture — refusing to blend those listings`);
    }
  }
  return out;
}

function daysBetween(fromExclusive: string, toExclusive: string): string[] {
  if (!(fromExclusive < toExclusive)) return [];
  const out: string[] = [];
  for (let day = addDays(fromExclusive, 1); day < toExclusive; day = addDays(day, 1)) out.push(day);
  return out;
}

function declaredGapDates(days: string[]): string[] {
  return days.filter((day) => inKnownGap(day));
}

function indexBook(rows: IndexListing[]): Map<string, IndexListing> {
  const map = new Map<string, IndexListing>();
  for (const row of rows) {
    if (map.has(row.ref)) throw new Error(`duplicate ref in listing book: ${row.ref}`);
    map.set(row.ref, row);
  }
  return map;
}

function priceRecurs(
  history: Map<string, Array<{ date: string; price: number }>>,
  ref: string,
  price: number,
  comparedTo: string,
  captureDate: string,
): boolean {
  const windowStart = addDays(captureDate, -RECUR_DAYS);
  const rows = history.get(ref) ?? [];
  return rows.some((row) => row.date < comparedTo && row.date >= windowStart && Math.abs(row.price - price) < 1);
}

function remember(history: Map<string, Array<{ date: string; price: number }>>, book: IndexListing[], date: string): void {
  for (const row of book) {
    if (!(row.priceEur > 0)) continue;
    const list = history.get(row.ref);
    if (list) list.push({ date, price: row.priceEur });
    else history.set(row.ref, [{ date, price: row.priceEur }]);
  }
}

function addMatched(bucket: Bucket, prev: number, cur: number): void {
  bucket.ratios.push(cur / prev);
  if (cur <= prev - 1) bucket.cuts += 1;
  else if (cur >= prev + 1) bucket.rises += 1;
  else bucket.unchanged += 1;
}

interface WeekStats {
  buckets: Map<string, Bucket>;
  cells: Map<string, CellRef>;
}

function compareBooks(
  previous: IndexListing[],
  current: IndexListing[],
  comparedTo: string,
  captureDate: string,
  history: Map<string, Array<{ date: string; price: number }>>,
): WeekStats {
  const prevByRef = indexBook(previous);
  const buckets = new Map<string, Bucket>();
  const cells = new Map<string, CellRef>();
  const ensure = (cell: CellRef): Bucket => {
    const id = cellId(cell.level, cell.key);
    cells.set(id, cell);
    const found = buckets.get(id);
    if (found) return found;
    const bucket = emptyBucket();
    buckets.set(id, bucket);
    return bucket;
  };
  const coast = ensure({ level: 'coast', key: COAST_KEY, name: 'Spanish coast', province: null });

  for (const row of current) {
    if (row.priceEur > 0) {
      coast.priced += 1;
      if (row.provinceKey) {
        ensure({
          level: 'province',
          key: row.provinceKey,
          name: provinceName(row.provinceKey, row.provinceName),
          province: null,
        }).priced += 1;
      }
      ensure({ level: 'town', key: row.town, name: row.town, province: row.provinceName }).priced += 1;
    }
    const prev = prevByRef.get(row.ref);
    if (!prev) continue;
    const sameTown = prev.town === row.town;
    const sameProvince = prev.provinceKey != null && prev.provinceKey === row.provinceKey;
    const samePlace = sameTown && prev.provinceKey === row.provinceKey;
    if (!samePlace) coast.reassigned += 1;

    const targets: Bucket[] = [];
    if (samePlace) targets.push(coast);
    if (sameProvince && row.provinceKey) {
      targets.push(ensure({
        level: 'province',
        key: row.provinceKey,
        name: provinceName(row.provinceKey, row.provinceName),
        province: null,
      }));
    }
    if (sameTown) targets.push(ensure({ level: 'town', key: row.town, name: row.town, province: row.provinceName }));
    if (!targets.length) continue;
    if (prev.ranged || row.ranged) {
      for (const bucket of targets) bucket.ranged += 1;
      continue;
    }
    if (!(prev.priceEur > 0) || !(row.priceEur > 0)) {
      for (const bucket of targets) bucket.unpriced += 1;
      continue;
    }
    const large = Math.abs(row.priceEur - prev.priceEur) / prev.priceEur >= LARGE_MOVE;
    const recurs = large && priceRecurs(history, row.ref, row.priceEur, comparedTo, captureDate);
    const klass = classifyPair(sideOf(prev), sideOf(row), row.mm2, recurs);
    for (const bucket of targets) {
      if (klass === 'matched') addMatched(bucket, prev.priceEur, row.priceEur);
      else if (klass === 'spec_change') bucket.spec += 1;
      else if (klass === 'held_back') bucket.held += 1;
      else bucket.unpriced += 1;
    }
  }
  return { buckets, cells };
}

function blankCounts(): Pick<
  PriceIndexRow,
  'matched_pairs' | 'cuts' | 'rises' | 'unchanged' | 'cut_share' | 'rise_share' | 'unchanged_share' |
  'excluded_spec_change' | 'held_back_large_move' | 'reassigned' | 'excluded_unpriced' | 'excluded_price_range'
> {
  return {
    matched_pairs: null,
    cuts: null,
    rises: null,
    unchanged: null,
    cut_share: null,
    rise_share: null,
    unchanged_share: null,
    excluded_spec_change: null,
    held_back_large_move: null,
    reassigned: null,
    excluded_unpriced: null,
    excluded_price_range: null,
  };
}

function comparisonCounts(bucket: Bucket, level: PriceIndexLevel, suppressed: boolean): ReturnType<typeof blankCounts> {
  const matched = bucket.ratios.length;
  return {
    matched_pairs: matched,
    cuts: bucket.cuts,
    rises: bucket.rises,
    unchanged: bucket.unchanged,
    cut_share: suppressed ? null : shareOf(bucket.cuts, matched),
    rise_share: suppressed ? null : shareOf(bucket.rises, matched),
    unchanged_share: suppressed ? null : shareOf(bucket.unchanged, matched),
    excluded_spec_change: bucket.spec,
    held_back_large_move: bucket.held,
    reassigned: level === 'coast' ? bucket.reassigned : null,
    excluded_unpriced: bucket.unpriced,
    excluded_price_range: bucket.ranged,
  };
}

function shell(cell: CellRef, plan: PlannedWeek, extra: Partial<PriceIndexRow>): PriceIndexRow {
  return {
    level: cell.level,
    key: cell.key,
    name: cell.name,
    province: cell.province,
    iso_week: plan.iso_week,
    week_start: plan.week_start,
    week_end: plan.week_end,
    status: 'gap',
    capture_date: null,
    compared_to: null,
    index: null,
    change_pct: null,
    priced_listings: null,
    suppressed: false,
    new_segment: false,
    segment_base_date: null,
    spans_declared_capture_gap: false,
    gap_dates: [],
    missing_days: [],
    week_gap_dates: [...plan.gap_dates_in_week],
    reason: null,
    ...blankCounts(),
    ...extra,
  };
}

export function buildPriceIndex(args: {
  plans: PlannedWeek[];
  books: Map<string, IndexListing[]>;
  mins?: PriceIndexMins;
}): PriceIndexFile {
  const mins = args.mins ?? MIN_MATCHED_PAIRS;
  for (const key of ['coast', 'province', 'town'] as const) {
    if (!Number.isInteger(mins[key]) || mins[key] < 1) throw new Error(`minimum matched pairs for ${key} must be a positive integer`);
  }
  const plans = [...args.plans].sort((a, b) => a.week_start.localeCompare(b.week_start));
  const seenWeeks = new Set<string>();
  for (const plan of plans) {
    if (seenWeeks.has(plan.iso_week)) throw new Error(`duplicate iso week ${plan.iso_week}`);
    seenWeeks.add(plan.iso_week);
    if (plan.vintage_date && inKnownGap(plan.vintage_date)) {
      throw new Error(`capture ${plan.vintage_date} is inside a declared gap — refusing to use it as an index point`);
    }
  }

  const history = new Map<string, Array<{ date: string; price: number }>>();
  const weekStats = new Map<string, WeekStats>();
  const allCells = new Map<string, CellRef>();
  allCells.set(cellId('coast', COAST_KEY), { level: 'coast', key: COAST_KEY, name: 'Spanish coast', province: null });

  for (const plan of plans) {
    if (plan.status !== 'frozen' || !plan.vintage_date) continue;
    const book = args.books.get(plan.vintage_date);
    if (!book) throw new Error(`missing listing book for ${plan.vintage_date}`);
    if (plan.compared_to) {
      const previous = args.books.get(plan.compared_to);
      if (!previous) throw new Error(`missing comparison book for ${plan.compared_to}`);
      const stats = compareBooks(previous, book, plan.compared_to, plan.vintage_date, history);
      weekStats.set(plan.iso_week, stats);
      for (const cell of stats.cells.values()) allCells.set(cellId(cell.level, cell.key), cell);
    } else {
      const buckets = new Map<string, Bucket>();
      const cells = new Map<string, CellRef>();
      const coast = emptyBucket();
      buckets.set(cellId('coast', COAST_KEY), coast);
      cells.set(cellId('coast', COAST_KEY), allCells.get(cellId('coast', COAST_KEY))!);
      for (const row of book) {
        if (!(row.priceEur > 0)) continue;
        coast.priced += 1;
        if (row.provinceKey) {
          const id = cellId('province', row.provinceKey);
          const cell = { level: 'province' as const, key: row.provinceKey, name: provinceName(row.provinceKey, row.provinceName), province: null };
          cells.set(id, cell);
          allCells.set(id, cell);
          const bucket = buckets.get(id) ?? emptyBucket();
          bucket.priced += 1;
          buckets.set(id, bucket);
        }
        const townId = cellId('town', row.town);
        const townCell = { level: 'town' as const, key: row.town, name: row.town, province: row.provinceName };
        cells.set(townId, townCell);
        allCells.set(townId, townCell);
        const townBucket = buckets.get(townId) ?? emptyBucket();
        townBucket.priced += 1;
        buckets.set(townId, townBucket);
      }
      weekStats.set(plan.iso_week, { buckets, cells });
    }
    remember(history, book, plan.vintage_date);
  }

  const publishedTowns = new Set<string>();
  const seenTowns = new Set<string>();
  for (const cell of allCells.values()) {
    if (cell.level !== 'town') continue;
    seenTowns.add(cell.key);
    for (const stats of weekStats.values()) {
      const bucket = stats.buckets.get(cellId('town', cell.key));
      if (!bucket) continue;
      if (bucket.priced >= mins.town || bucket.ratios.length >= mins.town) publishedTowns.add(cell.key);
    }
  }

  const cells: CellRef[] = [
    allCells.get(cellId('coast', COAST_KEY))!,
    ...[...allCells.values()].filter((cell) => cell.level === 'province').sort((a, b) => a.name.localeCompare(b.name, 'en') || a.key.localeCompare(b.key, 'en')),
    ...[...allCells.values()].filter((cell) => cell.level === 'town' && publishedTowns.has(cell.key)).sort((a, b) => a.name.localeCompare(b.name, 'en') || a.key.localeCompare(b.key, 'en')),
  ];

  const rows: PriceIndexRow[] = [];
  let dataAsOf: string | null = null;

  for (const cell of cells) {
    const min = mins[cell.level];
    const id = cellId(cell.level, cell.key);
    let level: number | null = null;
    let segmentBase: string | null = null;
    let started = false;

    for (const plan of plans) {
      const weekGap = declaredGapDates(plan.gap_dates_in_week);
      if (plan.status === 'gap') {
        if (!started) continue;
        rows.push(shell(cell, plan, {
          status: 'gap',
          spans_declared_capture_gap: weekGap.length > 0,
          gap_dates: weekGap,
          missing_days: [...plan.gap_dates_in_week],
          reason: GAP_WEEK_REASON,
        }));
        continue;
      }
      if (!plan.vintage_date) throw new Error(`frozen week ${plan.iso_week} has no capture date`);
      const stats = weekStats.get(plan.iso_week);
      const bucket = stats?.buckets.get(id) ?? emptyBucket();
      const interval = plan.compared_to ? daysBetween(plan.compared_to, plan.vintage_date) : [];
      const gapDates = declaredGapDates(interval);
      const missing = plan.missing_days_since_compared_to ? [...plan.missing_days_since_compared_to] : interval;
      const spans = gapDates.length > 0;
      const spanReason = spans
        ? `Change between ${plan.compared_to} and ${plan.vintage_date}. Includes declared capture gap ${gapDates.join(', ')}. No index value is published for those days, and this change is not split across them.`
        : null;

      if (!started) {
        if (bucket.priced <= 0 && bucket.ratios.length === 0) continue;
        started = true;
        // A first week that already has enough matched pairs is a change, not
        // a silent base. The base is only the first capture with enough stock
        // and no qualifying comparison behind it.
        if (bucket.ratios.length < min && bucket.priced >= min) {
          level = PRICE_INDEX_BASE;
          segmentBase = plan.vintage_date;
          if (cell.level === 'coast') dataAsOf = plan.vintage_date;
          rows.push(shell(cell, plan, {
            status: 'base',
            capture_date: plan.vintage_date,
            index: PRICE_INDEX_BASE,
            priced_listings: bucket.priced,
            new_segment: true,
            segment_base_date: segmentBase,
            week_gap_dates: [...plan.gap_dates_in_week],
            missing_days: [...plan.gap_dates_in_week],
            reason: `Base ${PRICE_INDEX_BASE}. No earlier eligible capture for this cell.`,
          }));
          continue;
        }
        if (bucket.ratios.length < min) {
          level = null;
          segmentBase = null;
          if (cell.level === 'coast') dataAsOf = plan.vintage_date;
          const comparable = plan.compared_to != null;
          rows.push(shell(cell, plan, {
            status: 'suppressed',
            capture_date: plan.vintage_date,
            compared_to: plan.compared_to,
            priced_listings: bucket.priced,
            suppressed: true,
            spans_declared_capture_gap: spans,
            gap_dates: gapDates,
            missing_days: missing,
            ...(comparable ? comparisonCounts(bucket, cell.level, true) : {}),
            reason: comparable
              ? `Priced listings (${bucket.priced}) and matched pairs (${bucket.ratios.length}) are under the minimum of ${min}. No index is published.`
              : `Priced listings (${bucket.priced}) are under the minimum of ${min}. No earlier capture, so there are no matched pairs. No index is published.`,
          }));
          continue;
        }
      }

      const matched = bucket.ratios.length;
      if (matched < min) {
        level = null;
        segmentBase = null;
        if (cell.level === 'coast') dataAsOf = plan.vintage_date;
        rows.push(shell(cell, plan, {
          status: 'suppressed',
          capture_date: plan.vintage_date,
          compared_to: plan.compared_to,
          priced_listings: bucket.priced,
          suppressed: true,
          spans_declared_capture_gap: spans,
          gap_dates: gapDates,
          missing_days: missing,
          ...comparisonCounts(bucket, cell.level, true),
          reason: spanReason ?? `Matched pairs (${matched}) are under the minimum of ${min}. No index and no breadth share.`,
        }));
        continue;
      }

      const change = geometricMean(bucket.ratios);
      const newSegment = level == null;
      level = (level == null ? PRICE_INDEX_BASE : level) * change;
      if (newSegment) segmentBase = plan.compared_to;
      if (cell.level === 'coast') dataAsOf = plan.vintage_date;
      const changePct = roundHalfAway((change - 1) * 100, 2);
      rows.push(shell(cell, plan, {
        status: 'observed',
        capture_date: plan.vintage_date,
        compared_to: plan.compared_to,
        index: roundHalfAway(level, 2),
        change_pct: changePct,
        priced_listings: bucket.priced,
        new_segment: newSegment,
        segment_base_date: segmentBase,
        spans_declared_capture_gap: spans,
        gap_dates: gapDates,
        missing_days: missing,
        ...comparisonCounts(bucket, cell.level, false),
        reason: spanReason,
      }));
    }
  }

  const coastRows = rows.filter((row) => row.level === 'coast' && row.capture_date);
  const latestRow = coastRows.length ? coastRows[coastRows.length - 1] : null;
  const latest: PriceIndexLatest | null = latestRow && latestRow.capture_date ? {
    capture_date: latestRow.capture_date,
    iso_week: latestRow.iso_week,
    compared_to: latestRow.compared_to,
    index: latestRow.index,
    change_pct: latestRow.change_pct,
    matched_pairs: latestRow.matched_pairs,
    priced_listings: latestRow.priced_listings,
    cuts: latestRow.cuts,
    rises: latestRow.rises,
    unchanged: latestRow.unchanged,
    cut_share: latestRow.cut_share,
    rise_share: latestRow.rise_share,
    unchanged_share: latestRow.unchanged_share,
    excluded_spec_change: latestRow.excluded_spec_change,
    held_back_large_move: latestRow.held_back_large_move,
    spans_declared_capture_gap: latestRow.spans_declared_capture_gap,
    gap_dates: latestRow.gap_dates,
    status: latestRow.status,
  } : null;

  return {
    schema_version: 1,
    methodology_version: '1.0',
    name: 'Avena same-unit asking-price index',
    base: PRICE_INDEX_BASE,
    series_start: SERIES_START,
    data_as_of: dataAsOf,
    min_matched_pairs: { coast: mins.coast, province: mins.province, town: mins.town },
    known_gaps: KNOWN_GAPS.map((gap) => ({
      from: gap.from,
      to: gap.to,
      note: `Declared capture gap ${gap.from} to ${gap.to}. No capture. No index value is published for these days, and no weekly change is filled in for them.`,
    })),
    method: PRICE_INDEX_METHOD,
    caveats: PRICE_INDEX_CAVEATS,
    definitions: PRICE_INDEX_DEFINITIONS,
    towns_published: publishedTowns.size,
    towns_omitted: seenTowns.size - publishedTowns.size,
    latest,
    rows,
  };
}

export function canonicalPriceIndexJson(file: PriceIndexFile): string {
  return `${JSON.stringify(file, null, 2)}\n`;
}

const CSV_COLUMNS = [
  'level', 'key', 'name', 'province', 'iso_week', 'week_start', 'week_end', 'status',
  'capture_date', 'compared_to', 'index', 'change_pct', 'matched_pairs', 'priced_listings',
  'cuts', 'rises', 'unchanged', 'cut_share', 'rise_share', 'unchanged_share',
  'excluded_spec_change', 'held_back_large_move', 'reassigned', 'excluded_unpriced', 'excluded_price_range',
  'suppressed', 'new_segment', 'segment_base_date', 'spans_declared_capture_gap',
  'gap_dates', 'missing_days', 'week_gap_dates', 'reason',
] as const;

function csvCell(value: unknown): string {
  if (value == null) return '';
  const text = Array.isArray(value) ? value.join(' ') : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function priceIndexToCsv(rows: PriceIndexRow[]): string {
  const lines = [CSV_COLUMNS.join(',')];
  for (const row of rows) {
    const record = row as unknown as Record<string, unknown>;
    lines.push(CSV_COLUMNS.map((column) => {
      const value = record[column];
      if ((column === 'index' || column === 'change_pct') && typeof value === 'number') return value.toFixed(2);
      return csvCell(value);
    }).join(','));
  }
  return `${lines.join('\n')}\n`;
}

export function priceIndexPath(): string {
  return join(process.cwd(), 'data', 'price-index.json');
}

export function readPriceIndex(path = priceIndexPath()): PriceIndexFile {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as PriceIndexFile;
  if (!raw || raw.schema_version !== 1 || !Array.isArray(raw.rows)) {
    throw new Error('data/price-index.json is not a same-unit price index file');
  }
  return raw;
}

export function rowsForLevel(file: PriceIndexFile, level: string | null): PriceIndexRow[] {
  if (!level) return file.rows;
  if (level !== 'coast' && level !== 'province' && level !== 'town') {
    throw new Error('level must be coast, province or town');
  }
  return file.rows.filter((row) => row.level === level);
}
