/**
 * Public data-quality report.
 *
 * Daily listing counts come from the observation ledger, which counts price
 * snapshot rows per day. Completeness and place coverage are counted on the
 * current listing book. Weekly churn is the public absorption series. The
 * same-unit split reuses the Market Pulse check in src/lib/unit-identity.ts
 * and classifyPair in src/lib/price-index.ts, on the same closed-week listing
 * books as the asking-price index.
 *
 * A day with no snapshot is published with a blank count. Nothing is filled in
 * from the days on either side. A zero count is not written in place of a
 * failed read.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { gradeCapture, gradeFeed, type CheckStatus } from '@/lib/health';
import { classifyPair, type IndexListing } from '@/lib/price-index';
import { KNOWN_GAPS, SERIES_START, addDays } from '@/lib/sellthrough';
import { LARGE_MOVE, RECUR_DAYS, SIZE_TOL, specChangeNote, type SnapSide } from '@/lib/unit-identity';

export { KNOWN_GAPS, SERIES_START };

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export const DATA_QUALITY_NAME = 'Avena data quality';

export const DATA_QUALITY_METHOD =
  `Daily capture counts are the days in the observation ledger published with the open dataset. That ledger counts listing rows in Avena's price snapshots from ${SERIES_START}. A calendar day in that span with no row is missing. Its listing count is left blank. Nothing is interpolated. The declared capture gap is ${KNOWN_GAPS.map((gap) => `${gap.from} to ${gap.to}`).join('; ')}. Field completeness and coverage by province and town are counted on the current committed listing book, the book the site serves. Weekly new listings and delistings are the public absorption series from the same daily snapshots. A delisting is a listing reference that was seen and is absent from the latest snapshot. It is not a confirmed sale. Same-unit figures compare closed-week copies of the listing book, the same captures as the weekly vintages and the same-unit asking-price index. A price change counts only when that index's unit-identity check calls it the same unit: property type, bedrooms and bathrooms equal, and built and plot size within ${Math.round(SIZE_TOL * 100)}%. A change of ${Math.round(LARGE_MOVE * 100)}% or more also needs full specs on both sides, the same photo set, a new EUR per square metre inside the area band, and a price that does not return exactly to an earlier asking price of that reference on this weekly series within ${RECUR_DAYS} days. A specification change is excluded. A large change that fails the check is held back. A step that crosses the declared gap is the change between the two captures that exist. It is not split across the missing days. The listing record has no brochure or developer-PDF field. A PDF link is counted only when the listing URL itself is an http or https address ending in .pdf.`;

export const DATA_QUALITY_CAVEATS = [
  `The trusted daily series starts on ${SERIES_START}. Earlier stored rows repeated a frozen book and are not included. The history is short.`,
  'Figures are asking prices of listings. A listing reference on a new-build is often a unit type in a development, not one dwelling.',
  'A delisting means the reference left the captured feed. It may have sold or it may have been withdrawn. It is not a confirmed sale.',
  'Same-unit counts are weekly comparisons of closed-week listing files. They are not every daily price change. The open dataset moves file contains only changes that passed the same-unit check, so it cannot be the denominator of a pass share.',
  `A change below ${Math.round(LARGE_MOVE * 100)}% is accepted when a specification field is missing on one side. A change of ${Math.round(LARGE_MOVE * 100)}% or more is held back when a required spec is missing.`,
  'Days inside a declared capture gap have no listing count. No day is filled in from another day.',
  'Some days have a price snapshot and no commit of the listing file. Those days are listed under feed-file gaps. They are not missing snapshots.',
  'Plot size is often absent. A missing plot is absent, not zero square metres.',
  'The current week is not in the same-unit comparison until that week is closed and frozen.',
] as const;

export function shareTo4(numerator: number, denominator: number): string | null {
  if (!Number.isInteger(numerator) || !Number.isInteger(denominator) || denominator <= 0 || numerator < 0 || numerator > denominator) {
    return null;
  }
  const scaled = numerator * 10_000;
  let q = Math.floor(scaled / denominator);
  const rem = scaled % denominator;
  if (rem * 2 >= denominator) q += 1;
  if (q > 10_000) return null;
  const whole = Math.floor(q / 10_000);
  const frac = String(q % 10_000).padStart(4, '0');
  return `${whole}.${frac}`;
}

export function dateInDeclaredGap(date: string, gaps: ReadonlyArray<{ from: string; to: string }> = KNOWN_GAPS): boolean {
  return gaps.some((gap) => date >= gap.from && date <= gap.to);
}

export function calendarDays(from: string, to: string): string[] {
  if (!YMD.test(from) || !YMD.test(to) || from > to) throw new Error(`bad date span ${from} .. ${to}`);
  const out: string[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) {
    out.push(day);
    if (out.length > 4000) throw new Error('date span is too long');
  }
  return out;
}

export function spansDeclaredGap(from: string, to: string, gaps: ReadonlyArray<{ from: string; to: string }> = KNOWN_GAPS): boolean {
  if (!(from < to)) return false;
  for (let day = addDays(from, 1); day < to; day = addDays(day, 1)) {
    if (dateInDeclaredGap(day, gaps)) return true;
  }
  return false;
}

export function weekOverlapsDeclaredGap(weekStart: string, gaps: ReadonlyArray<{ from: string; to: string }> = KNOWN_GAPS): boolean {
  const weekEnd = addDays(weekStart, 6);
  return gaps.some((gap) => gap.from <= weekEnd && gap.to >= weekStart);
}

export interface CaptureDay {
  date: string;
  listings: number | null;
  captured: boolean;
  in_declared_gap: boolean;
}

export interface CaptureSeries {
  from: string;
  to: string;
  calendar_days: number;
  days_captured: number;
  days_missing: number;
  missing_dates: string[];
  missing_inside_declared_gap: string[];
  missing_outside_declared_gap: string[];
  min_listings: number;
  max_listings: number;
  days: CaptureDay[];
}

export function buildCaptureSeries(args: {
  observed: Array<{ date: string; listings: number }>;
  from: string;
  to: string;
  gaps?: ReadonlyArray<{ from: string; to: string }>;
}): CaptureSeries {
  const gaps = args.gaps ?? KNOWN_GAPS;
  if (!args.observed.length) throw new Error('no capture days — refusing to publish an empty ledger as full coverage');
  const byDate = new Map<string, number>();
  for (const row of args.observed) {
    if (!YMD.test(row.date)) throw new Error(`capture date is not a day: ${row.date}`);
    if (byDate.has(row.date)) throw new Error(`duplicate capture date ${row.date}`);
    if (!Number.isInteger(row.listings) || row.listings <= 0) {
      throw new Error(`capture ${row.date} has no positive listing count — refusing to publish zero as a captured day`);
    }
    if (row.date < args.from || row.date > args.to) throw new Error(`capture ${row.date} falls outside ${args.from} .. ${args.to}`);
    byDate.set(row.date, row.listings);
  }
  const days: CaptureDay[] = calendarDays(args.from, args.to).map((date) => {
    const listings = byDate.get(date);
    const captured = listings != null;
    return {
      date,
      listings: captured ? listings : null,
      captured,
      in_declared_gap: dateInDeclaredGap(date, gaps),
    };
  });
  const missing = days.filter((day) => !day.captured);
  const capturedDays = days.filter((day) => day.captured);
  const counts = capturedDays.map((day) => day.listings as number);
  return {
    from: args.from,
    to: args.to,
    calendar_days: days.length,
    days_captured: capturedDays.length,
    days_missing: missing.length,
    missing_dates: missing.map((day) => day.date),
    missing_inside_declared_gap: missing.filter((day) => day.in_declared_gap).map((day) => day.date),
    missing_outside_declared_gap: missing.filter((day) => !day.in_declared_gap).map((day) => day.date),
    min_listings: Math.min(...counts),
    max_listings: Math.max(...counts),
    days,
  };
}

export function splitFeedFileGaps(feedGapDates: string[], capture: CaptureSeries): {
  no_price_snapshot: string[];
  price_snapshot_present: string[];
  outside_snapshot_series: string[];
} {
  const byDate = new Map(capture.days.map((day) => [day.date, day]));
  const noSnapshot: string[] = [];
  const present: string[] = [];
  const outside: string[] = [];
  const seen = new Set<string>();
  for (const date of [...feedGapDates].sort()) {
    if (!YMD.test(date)) throw new Error(`feed-file gap is not a day: ${date}`);
    if (seen.has(date)) throw new Error(`duplicate feed-file gap ${date}`);
    seen.add(date);
    const day = byDate.get(date);
    if (!day) outside.push(date);
    else if (day.captured) present.push(date);
    else noSnapshot.push(date);
  }
  return { no_price_snapshot: noSnapshot, price_snapshot_present: present, outside_snapshot_series: outside };
}

export interface QualityListing {
  ref: string;
  priceFrom: number | null;
  priceTo: number | null;
  builtM2: number | null;
  plotM2: number | null;
  beds: number | null;
  baths: number | null;
  type: string | null;
  town: string | null;
  province: string | null;
  lat: number | null;
  lng: number | null;
  imageCount: number;
  developer: string | null;
  url: string | null;
}

const finite = (value: unknown): number | null => {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
};

const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null);

export function qualityListingFromBookRow(
  row: Record<string, unknown>,
  provinceOf: (location: string) => string | null,
): QualityListing {
  const ref = text(row.ref);
  if (!ref) throw new Error('listing book row has no ref');
  const location = text(row.l);
  const town = location ? location.split(',')[0]?.trim() || null : null;
  const images = Array.isArray(row.imgs) ? row.imgs.filter((url) => typeof url === 'string' && url.length > 0).length : 0;
  return {
    ref,
    priceFrom: finite(row.pf),
    priceTo: finite(row.pt),
    builtM2: finite(row.bm),
    plotM2: finite(row.pl),
    beds: finite(row.bd),
    baths: finite(row.ba),
    type: text(row.t),
    town,
    province: location ? provinceOf(location) : null,
    lat: finite(row.lat),
    lng: finite(row.lng),
    imageCount: images,
    developer: text(row.d),
    url: text(row.u),
  };
}

export interface FieldStat {
  id: string;
  label: string;
  present: number;
  listings: number;
  share: string;
  note: string;
}

function field(id: string, label: string, present: number, listings: number, note: string): FieldStat {
  if (!Number.isInteger(present) || present < 0 || present > listings) {
    throw new Error(`${id}: ${present} of ${listings} is not a possible count`);
  }
  const share = shareTo4(present, listings);
  if (!share) throw new Error(`${id}: share could not be computed`);
  return { id, label, present, listings, share, note };
}

const countWhere = (rows: QualityListing[], pred: (row: QualityListing) => boolean) => rows.filter(pred).length;

export function fieldCompleteness(rows: QualityListing[]): { listings: number; fields: FieldStat[] } {
  if (!rows.length) throw new Error('listing book is empty — refusing to publish 0% completeness');
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.ref)) throw new Error(`duplicate ref in listing book: ${row.ref}`);
    seen.add(row.ref);
  }
  const listings = rows.length;
  const ranged = countWhere(rows, (row) => (row.priceFrom ?? 0) > 0 && (row.priceTo ?? 0) > 0 && row.priceFrom !== row.priceTo);
  const zeroBeds = countWhere(rows, (row) => row.beds === 0);
  const unmapped = countWhere(rows, (row) => !row.province);
  const mailto = countWhere(rows, (row) => (row.url ?? '').toLowerCase().startsWith('mailto:'));
  const zeroBaths = countWhere(rows, (row) => row.baths === 0);
  const singlePrice = (row: QualityListing) => (row.priceFrom ?? 0) > 0 && row.priceFrom === row.priceTo;
  const httpsUrl = (row: QualityListing) => /^https?:\/\//i.test(row.url ?? '');
  const pdfUrl = (row: QualityListing) => httpsUrl(row) && /\.pdf(?:$|[?#])/i.test(row.url ?? '');
  const coordinates = (row: QualityListing) => {
    if (row.lat == null || row.lng == null) return false;
    if (row.lat === 0 && row.lng === 0) return false;
    return Number.isFinite(row.lat) && Number.isFinite(row.lng);
  };
  return {
    listings,
    fields: [
      field('asking_price', 'Asking price', countWhere(rows, singlePrice), listings,
        ranged ? `One positive asking price. ${ranged} listings advertise a from-to range and are not counted here.` : 'One positive asking price. A from-to range would not be counted.'),
      field('built_m2', 'Built size, m²', countWhere(rows, (row) => (row.builtM2 ?? 0) > 0), listings, 'Built area greater than zero.'),
      field('bedrooms', 'Bedrooms', countWhere(rows, (row) => row.beds != null && row.beds >= 0), listings,
        zeroBeds === 1
          ? 'A numeric bedroom count, including zero. 1 listing has a count of 0. Zero is present, not missing.'
          : `A numeric bedroom count, including zero. ${zeroBeds} listings have a count of 0. Zero is present, not missing.`),
      field('unit_type', 'Unit type', countWhere(rows, (row) => !!row.type), listings, 'A non-empty unit type.'),
      field('town', 'Town', countWhere(rows, (row) => !!row.town), listings, 'The first part of the location text, before the comma.'),
      field('province', 'Province', countWhere(rows, (row) => !!row.province), listings,
        unmapped ? `${unmapped} listings have a location that does not map to a covered province.` : 'Every listing location maps to a covered province.'),
      field('coordinates', 'Coordinates', countWhere(rows, coordinates), listings, 'Finite latitude and longitude, excluding the pair 0, 0.'),
      field('brochure_pdf', 'Developer PDF or brochure link', countWhere(rows, pdfUrl), listings,
        'The listing record has no brochure or developer-PDF field. Counted only when the listing URL is an http or https address ending in .pdf.'),
      field('listing_url', 'Listing page URL', countWhere(rows, httpsUrl), listings,
        `${mailto} listings have a mailto address and no page URL.`),
      field('bathrooms', 'Bathrooms', countWhere(rows, (row) => row.baths != null && row.baths >= 0), listings,
        zeroBaths ? `A numeric bathroom count, including zero. ${zeroBaths} listings have a count of 0.` : 'A numeric bathroom count, including zero.'),
      field('plot_m2', 'Plot size, m²', countWhere(rows, (row) => (row.plotM2 ?? 0) > 0), listings,
        'Plot area greater than zero. Apartments often have none. A missing plot is absent, not zero square metres.'),
      field('images', 'Images', countWhere(rows, (row) => row.imageCount > 0), listings, 'At least one image URL.'),
      field('developer_name', 'Developer name', countWhere(rows, (row) => !!row.developer), listings, 'A non-empty developer name on the listing.'),
    ],
  };
}

export interface PlaceStat {
  name: string;
  province: string | null;
  listings: number;
  share: string;
}

export function placeCoverage(rows: QualityListing[]): { provinces: PlaceStat[]; towns: PlaceStat[] } {
  if (!rows.length) throw new Error('listing book is empty — refusing to publish empty coverage');
  const provinces = new Map<string, number>();
  const towns = new Map<string, { province: string | null; listings: number }>();
  for (const row of rows) {
    const province = row.province ?? 'Unmapped';
    provinces.set(province, (provinces.get(province) ?? 0) + 1);
    const town = row.town ?? 'Unknown';
    const key = `${town}\t${province}`;
    const prev = towns.get(key);
    if (prev) prev.listings += 1;
    else towns.set(key, { province, listings: 1 });
  }
  const provinceRows = [...provinces.entries()]
    .map(([name, listings]) => ({ name, province: null, listings, share: shareTo4(listings, rows.length) as string }))
    .sort((a, b) => b.listings - a.listings || a.name.localeCompare(b.name));
  const townRows = [...towns.entries()]
    .map(([key, value]) => ({
      name: key.split('\t')[0] ?? 'Unknown',
      province: value.province,
      listings: value.listings,
      share: shareTo4(value.listings, rows.length) as string,
    }))
    .sort((a, b) => b.listings - a.listings || a.name.localeCompare(b.name));
  if (provinceRows.some((row) => !row.share) || townRows.some((row) => !row.share)) {
    throw new Error('place share could not be computed');
  }
  return { provinces: provinceRows, towns: townRows };
}

export interface ChurnWeek {
  week: string;
  week_end: string;
  new_listings: number;
  delistings: number;
  overlaps_declared_gap: boolean;
}

export function buildChurn(weeks: Array<{ week: string; newListings: number; exits: number }>, gaps: ReadonlyArray<{ from: string; to: string }> = KNOWN_GAPS): {
  weeks: ChurnWeek[];
  new_listings: number;
  delistings: number;
} {
  if (!weeks.length) throw new Error('no churn weeks — refusing to publish zero flow');
  const seen = new Set<string>();
  const out: ChurnWeek[] = [];
  for (const week of weeks) {
    if (!YMD.test(week.week)) throw new Error(`churn week is not a day: ${week.week}`);
    if (seen.has(week.week)) throw new Error(`duplicate churn week ${week.week}`);
    seen.add(week.week);
    if (!Number.isInteger(week.newListings) || week.newListings < 0 || !Number.isInteger(week.exits) || week.exits < 0) {
      throw new Error(`churn week ${week.week} has a negative count`);
    }
    out.push({
      week: week.week,
      week_end: addDays(week.week, 6),
      new_listings: week.newListings,
      delistings: week.exits,
      overlaps_declared_gap: weekOverlapsDeclaredGap(week.week, gaps),
    });
  }
  out.sort((a, b) => a.week.localeCompare(b.week));
  return {
    weeks: out,
    new_listings: out.reduce((sum, week) => sum + week.new_listings, 0),
    delistings: out.reduce((sum, week) => sum + week.delistings, 0),
  };
}

export type JumpBand = 'under_25' | 'from_25_to_50' | 'over_50';

export function jumpBand(absFraction: number): JumpBand {
  if (absFraction >= 0.5) return 'over_50';
  if (absFraction >= LARGE_MOVE) return 'from_25_to_50';
  return 'under_25';
}

export interface BookComparison {
  passed: number;
  passed_under_25: number;
  passed_25_to_50: number;
  passed_over_50: number;
  held_spec: number;
  held_spec_under_25: number;
  held_spec_25_to_50: number;
  held_spec_over_50: number;
  held_large: number;
  held_large_25_to_50: number;
  held_large_over_50: number;
  spec_only: number;
  unchanged: number;
  reassigned: number;
  excluded_price_range: number;
  excluded_unpriced: number;
}

export function emptyComparison(): BookComparison {
  return {
    passed: 0,
    passed_under_25: 0,
    passed_25_to_50: 0,
    passed_over_50: 0,
    held_spec: 0,
    held_spec_under_25: 0,
    held_spec_25_to_50: 0,
    held_spec_over_50: 0,
    held_large: 0,
    held_large_25_to_50: 0,
    held_large_over_50: 0,
    spec_only: 0,
    unchanged: 0,
    reassigned: 0,
    excluded_price_range: 0,
    excluded_unpriced: 0,
  };
}

export function addComparison(total: BookComparison, delta: BookComparison): void {
  (Object.keys(total) as Array<keyof BookComparison>).forEach((key) => {
    total[key] += delta[key];
  });
}

export function priceChanges(counts: BookComparison): number {
  return counts.passed + counts.held_spec + counts.held_large;
}

export type PriceHistory = Map<string, Array<{ date: string; price: number }>>;

export function rememberPrices(history: PriceHistory, book: IndexListing[], date: string): void {
  for (const row of book) {
    if (!(row.priceEur > 0)) continue;
    const list = history.get(row.ref);
    const point = { date, price: row.priceEur };
    if (list) list.push(point);
    else history.set(row.ref, [point]);
  }
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

function priceRecurs(history: PriceHistory, ref: string, price: number, comparedTo: string, captureDate: string): boolean {
  const windowStart = addDays(captureDate, -RECUR_DAYS);
  return (history.get(ref) ?? []).some((row) => row.date < comparedTo && row.date >= windowStart && Math.abs(row.price - price) < 1);
}

const BAND_FIELD: Record<JumpBand, string> = {
  under_25: 'under_25',
  from_25_to_50: '25_to_50',
  over_50: 'over_50',
};

function bump(counts: BookComparison, key: 'passed' | 'held_spec' | 'held_large', band: JumpBand): void {
  if (key === 'held_large' && band === 'under_25') {
    throw new Error('a held-back large move is under 25% — the same-unit rule does not do that');
  }
  counts[key] += 1;
  const bandKey = `${key}_${BAND_FIELD[band]}` as keyof BookComparison;
  if (typeof counts[bandKey] !== 'number') throw new Error(`no band counter ${bandKey}`);
  counts[bandKey] += 1;
}

/**
 * Coast-level pair classes for one step between two listing books.
 * Same-place rule matches the asking-price index: a reference that changed
 * town or province is reassigned, not a price change.
 */
export function compareListingBooks(args: {
  previous: IndexListing[];
  current: IndexListing[];
  comparedTo: string;
  captureDate: string;
  history: PriceHistory;
}): BookComparison {
  const counts = emptyComparison();
  const prevByRef = new Map<string, IndexListing>();
  for (const row of args.previous) {
    if (prevByRef.has(row.ref)) throw new Error(`duplicate ref in previous book: ${row.ref}`);
    prevByRef.set(row.ref, row);
  }
  const seen = new Set<string>();
  for (const row of args.current) {
    if (seen.has(row.ref)) throw new Error(`duplicate ref in current book: ${row.ref}`);
    seen.add(row.ref);
    const prev = prevByRef.get(row.ref);
    if (!prev) continue;
    const samePlace = prev.town === row.town && prev.provinceKey === row.provinceKey;
    if (!samePlace) {
      counts.reassigned += 1;
      continue;
    }
    if (prev.ranged || row.ranged) {
      counts.excluded_price_range += 1;
      continue;
    }
    if (!(prev.priceEur > 0) || !(row.priceEur > 0)) {
      counts.excluded_unpriced += 1;
      continue;
    }
    const spec = specChangeNote(sideOf(prev), sideOf(row));
    const priceChanged = Math.abs(row.priceEur - prev.priceEur) >= 1;
    const fraction = Math.abs(row.priceEur - prev.priceEur) / prev.priceEur;
    const band = jumpBand(fraction);
    if (spec && !priceChanged) {
      counts.spec_only += 1;
      continue;
    }
    if (spec && priceChanged) {
      bump(counts, 'held_spec', band);
      continue;
    }
    if (!priceChanged) {
      counts.unchanged += 1;
      continue;
    }
    const recurs = fraction >= LARGE_MOVE && priceRecurs(args.history, row.ref, row.priceEur, args.comparedTo, args.captureDate);
    const klass = classifyPair(sideOf(prev), sideOf(row), row.mm2, recurs);
    if (klass === 'held_back') bump(counts, 'held_large', band);
    else if (klass === 'matched') bump(counts, 'passed', band);
    else throw new Error(`pair ${row.ref} classified as ${klass} after the spec check`);
  }
  return counts;
}

export interface SameUnitWeek extends BookComparison {
  capture_date: string;
  compared_to: string;
  spans_declared_gap: boolean;
  note: string | null;
}

export interface PriceIndexCheck {
  cuts: number;
  rises: number;
  unchanged: number;
  held_back_large_move: number;
  excluded_spec_change: number;
  reassigned: number;
  excluded_unpriced: number;
  excluded_price_range: number;
}

export interface DataQualityFile {
  schema_version: 1;
  name: string;
  built_at: string;
  series_start: string;
  method: string;
  caveats: string[];
  known_gaps: Array<{ from: string; to: string; note: string }>;
  sources: {
    daily_capture: { file: string; dataset_version: string; as_of: string };
    current_book: { file: string; feed_generated_at: string; listings: number };
    feed_file_gaps: { file: string };
    churn: { file: string; as_of: string };
    same_unit: { listing_file: string; rule: string };
    daily_passed_moves: { file: string; rows: number; note: string };
  };
  book: {
    listings: number;
    feed_generated_at: string;
    feed_generated_date: string;
    feed_listings: number;
    content_sha256: string;
    agrees_with_feed_meta: boolean;
    latest_snapshot_date: string;
    latest_snapshot_listings: number;
    agrees_with_latest_snapshot: boolean;
  };
  capture: CaptureSeries;
  feed_file_gaps: {
    definition: string;
    dates: string[];
    no_price_snapshot: string[];
    price_snapshot_present: string[];
    outside_snapshot_series: string[];
  };
  completeness: { listings: number; fields: FieldStat[] };
  coverage: { provinces: PlaceStat[]; towns: PlaceStat[] };
  churn: {
    as_of: string;
    definition: string;
    weeks: ChurnWeek[];
    new_listings: number;
    delistings: number;
  };
  same_unit: {
    grain: string;
    through: string;
    price_index_as_of: string;
    reconciled: boolean;
    price_index_check: PriceIndexCheck;
    counts: BookComparison;
    price_changes: number;
    pass_share: string;
    weeks: SameUnitWeek[];
  };
  freshness: {
    feed_generated_at: string;
    latest_capture_date: string;
    capture_source: string;
    note: string;
  };
}

export interface FreshnessGrade {
  graded_at: string;
  feed: { status: CheckStatus; detail: string; observed: string | null };
  capture: { status: CheckStatus; detail: string; observed: string | null };
  capture_source: string;
  live_status_path: '/api/health';
}

export function gradeDataFreshness(file: DataQualityFile, now: Date): FreshnessGrade {
  const feed = gradeFeed(now, file.freshness.feed_generated_at);
  const capture = gradeCapture(now, file.freshness.latest_capture_date, true);
  return {
    graded_at: now.toISOString(),
    feed: { status: feed.status, detail: feed.detail, observed: feed.observed ?? null },
    capture: { status: capture.status, detail: capture.detail, observed: capture.observed ?? null },
    capture_source: file.freshness.capture_source,
    live_status_path: '/api/health',
  };
}

export function priceIndexDrift(file: DataQualityFile, indexAsOf: string | null): string | null {
  if (!indexAsOf || indexAsOf === file.same_unit.price_index_as_of) return null;
  return `The same-unit section was reconciled to the asking-price index as of ${file.same_unit.price_index_as_of}. The index file now says ${indexAsOf}.`;
}

function gapNote(gap: { from: string; to: string }): string {
  return `Declared capture gap ${gap.from} to ${gap.to}. No snapshot. No listing count is published for these days, and none is filled in.`;
}

export function knownGapRecords(gaps: ReadonlyArray<{ from: string; to: string }> = KNOWN_GAPS): DataQualityFile['known_gaps'] {
  return gaps.map((gap) => ({ from: gap.from, to: gap.to, note: gapNote(gap) }));
}

export function dataQualityPath(): string {
  return join(process.cwd(), 'data', 'data-quality.json');
}

function isShare(value: unknown): value is string {
  return typeof value === 'string' && /^\d+\.\d{4}$/.test(value);
}

export function validateDataQuality(file: DataQualityFile): void {
  if (file.schema_version !== 1 || file.name !== DATA_QUALITY_NAME) throw new Error('data quality file has the wrong header');
  if (file.series_start !== SERIES_START) throw new Error('data quality series start differs from the capture series');
  if (file.known_gaps.length !== KNOWN_GAPS.length || file.known_gaps.some((gap, i) => gap.from !== KNOWN_GAPS[i]?.from || gap.to !== KNOWN_GAPS[i]?.to)) {
    throw new Error('data quality known gaps differ from the declared capture gaps');
  }
  const capture = file.capture;
  const expectedDays = calendarDays(capture.from, capture.to);
  if (capture.days.length !== expectedDays.length || capture.days.some((day, i) => day.date !== expectedDays[i])) {
    throw new Error('capture series is not one row per calendar day');
  }
  const missing: string[] = [];
  for (const day of capture.days) {
    const inGap = dateInDeclaredGap(day.date);
    if (day.in_declared_gap !== inGap) throw new Error(`gap flag is wrong on ${day.date}`);
    if (day.captured) {
      if (!Number.isInteger(day.listings) || (day.listings ?? 0) <= 0) throw new Error(`captured day ${day.date} has no positive count`);
    } else if (day.listings !== null) {
      throw new Error(`missing day ${day.date} has a listing count — counts are not filled in`);
    } else missing.push(day.date);
  }
  if (missing.join() !== capture.missing_dates.join()) throw new Error('missing date list does not match the blank days');
  if (capture.days_missing !== missing.length || capture.days_captured !== capture.days.length - missing.length) {
    throw new Error('capture totals do not match the day rows');
  }
  for (const gap of KNOWN_GAPS) {
    for (const date of calendarDays(gap.from, gap.to)) {
      if (date < capture.from || date > capture.to) continue;
      const day = capture.days.find((row) => row.date === date);
      if (!day) throw new Error(`declared gap day ${date} is absent from the series`);
    }
  }
  if (file.completeness.listings !== file.book.listings) throw new Error('completeness listings differ from the book');
  for (const stat of file.completeness.fields) {
    if (stat.listings !== file.book.listings || stat.present > stat.listings || stat.share !== shareTo4(stat.present, stat.listings)) {
      throw new Error(`completeness field ${stat.id} does not add up`);
    }
  }
  const provinceSum = file.coverage.provinces.reduce((sum, row) => sum + row.listings, 0);
  const townSum = file.coverage.towns.reduce((sum, row) => sum + row.listings, 0);
  if (provinceSum !== file.book.listings || townSum !== file.book.listings) {
    throw new Error('place counts do not add up to the book');
  }
  const churnNew = file.churn.weeks.reduce((sum, week) => sum + week.new_listings, 0);
  const churnOut = file.churn.weeks.reduce((sum, week) => sum + week.delistings, 0);
  if (churnNew !== file.churn.new_listings || churnOut !== file.churn.delistings) throw new Error('churn totals do not match the weeks');
  const counts = file.same_unit.counts;
  if (priceChanges(counts) !== file.same_unit.price_changes) throw new Error('same-unit price-change total is wrong');
  if (file.same_unit.pass_share !== shareTo4(counts.passed, file.same_unit.price_changes)) {
    throw new Error('same-unit pass share does not match the counts');
  }
  const check = file.same_unit.price_index_check;
  if (counts.passed !== check.cuts + check.rises) throw new Error('passed price changes do not match the price index cuts and rises');
  if (counts.held_large !== check.held_back_large_move) throw new Error('held-back large moves do not match the price index');
  if (counts.held_spec + counts.spec_only !== check.excluded_spec_change) throw new Error('spec changes do not match the price index');
  if (counts.unchanged !== check.unchanged || counts.reassigned !== check.reassigned) {
    throw new Error('unchanged or reassigned counts do not match the price index');
  }
  if (counts.excluded_unpriced !== check.excluded_unpriced || counts.excluded_price_range !== check.excluded_price_range) {
    throw new Error('excluded pairs do not match the price index');
  }
  const weekSum = emptyComparison();
  for (const week of file.same_unit.weeks) addComparison(weekSum, week);
  (Object.keys(weekSum) as Array<keyof BookComparison>).forEach((key) => {
    if (weekSum[key] !== counts[key]) throw new Error(`same-unit weeks do not add up: ${key}`);
  });
  if (!file.same_unit.reconciled) throw new Error('same-unit section was not reconciled to the price index');
  const present = new Set(file.feed_file_gaps.price_snapshot_present);
  const absent = new Set(file.feed_file_gaps.no_price_snapshot);
  for (const date of file.feed_file_gaps.dates) {
    const day = file.capture.days.find((row) => row.date === date);
    if (!day) continue;
    if (day.captured && !present.has(date)) throw new Error(`feed-file gap ${date} has a snapshot but is not listed as present`);
    if (!day.captured && !absent.has(date)) throw new Error(`feed-file gap ${date} has no snapshot but is not listed as absent`);
  }
}

export function readDataQuality(path = dataQualityPath()): DataQualityFile {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as DataQualityFile;
  if (!raw || !Array.isArray(raw.capture?.days) || !Array.isArray(raw.completeness?.fields)) {
    throw new Error('data/data-quality.json is not a data quality file');
  }
  validateDataQuality(raw);
  for (const row of [...raw.coverage.provinces, ...raw.coverage.towns, ...raw.completeness.fields]) {
    if (!isShare(row.share)) throw new Error('a share is not a 4-decimal string');
  }
  return raw;
}

const CSV_HEADER = [
  'section', 'date', 'name', 'province', 'field', 'listings', 'present', 'share',
  'captured', 'in_declared_gap', 'new_listings', 'delistings', 'count', 'note',
] as const;

function csvCell(value: unknown): string {
  if (value == null || value === '') return '';
  const textValue = String(value);
  if (/[",\n\r]/.test(textValue)) return `"${textValue.replace(/"/g, '""')}"`;
  return textValue;
}

function csvRow(values: Record<string, unknown>): string {
  return CSV_HEADER.map((column) => csvCell(values[column])).join(',');
}

export function dataQualityToCsv(file: DataQualityFile): string {
  const lines = [CSV_HEADER.join(',')];
  for (const day of file.capture.days) {
    lines.push(csvRow({
      section: 'capture',
      date: day.date,
      listings: day.listings,
      captured: day.captured ? 'true' : 'false',
      in_declared_gap: day.in_declared_gap ? 'true' : 'false',
      note: day.captured ? '' : 'No snapshot. Count left blank. Not interpolated.',
    }));
  }
  for (const stat of file.completeness.fields) {
    lines.push(csvRow({
      section: 'completeness',
      field: stat.id,
      name: stat.label,
      listings: stat.listings,
      present: stat.present,
      share: stat.share,
      note: stat.note,
    }));
  }
  for (const place of file.coverage.provinces) {
    lines.push(csvRow({ section: 'province', name: place.name, listings: place.listings, share: place.share }));
  }
  for (const place of file.coverage.towns) {
    lines.push(csvRow({ section: 'town', name: place.name, province: place.province, listings: place.listings, share: place.share }));
  }
  for (const week of file.churn.weeks) {
    lines.push(csvRow({
      section: 'churn',
      date: week.week,
      new_listings: week.new_listings,
      delistings: week.delistings,
      in_declared_gap: week.overlaps_declared_gap ? 'true' : 'false',
      note: week.overlaps_declared_gap ? 'Week overlaps the declared capture gap. Delistings in the gap are not given a day.' : '',
    }));
  }
  const buckets: Array<[string, number, string]> = [
    ['passed', file.same_unit.counts.passed, 'Price changed and the same-unit check passed.'],
    ['passed_under_25', file.same_unit.counts.passed_under_25, 'Passed. Absolute change under 25%.'],
    ['passed_25_to_50', file.same_unit.counts.passed_25_to_50, 'Passed. Absolute change from 25% to under 50%.'],
    ['passed_over_50', file.same_unit.counts.passed_over_50, 'Passed. Absolute change of 50% or more.'],
    ['held_spec', file.same_unit.counts.held_spec, 'Price changed and size, bedrooms, bathrooms, type or plot disagreed.'],
    ['held_large', file.same_unit.counts.held_large, 'Price changed by 25% or more and the same-unit check did not verify it.'],
    ['spec_only', file.same_unit.counts.spec_only, 'Specification disagreed and the asking price did not change. Not in the pass share.'],
    ['unchanged', file.same_unit.counts.unchanged, 'Same unit, asking price unchanged.'],
  ];
  for (const [fieldId, count, note] of buckets) {
    const share = fieldId === 'passed' ? file.same_unit.pass_share : '';
    lines.push(csvRow({ section: 'same_unit', field: fieldId, count, share, note }));
  }
  return `${lines.join('\n')}\n`;
}
