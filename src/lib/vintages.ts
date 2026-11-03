/**
 * Weekly point-in-time vintages of the town and province aggregates already
 * published from the listing book.
 *
 * A vintage is the last commit of public/data.json in a closed ISO week
 * (Monday–Sunday, UTC), on or after SERIES_START, and not inside KNOWN_GAPS.
 * The file is written once. decideFreeze / writeFreeze refuse to replace it.
 * Days with no eligible capture are listed and left empty. Nothing is
 * interpolated, and commits before the series start are not used.
 *
 * Town medians use the same floor as buildTownAggregates in open-dataset.ts
 * (at least 5 live listings and one positive asking EUR/m²). Province medians
 * use the same floor as the Spain rent layer: the first positive asking
 * EUR/m². Price cuts, rises, new listings and removals are the difference
 * from the previous frozen vintage, matched on listing ref.
 */

import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { ES_PROVINCE_DEFS, provinceFromLocation } from '@/lib/data-sources/ine-es';
import { KNOWN_GAPS, SERIES_START } from '@/lib/sellthrough';

export { KNOWN_GAPS, SERIES_START };

/** Same k as towns.csv / buildTownAggregates. */
export const TOWN_MIN_LISTINGS = 5;

export const VINTAGE_GUARANTEE =
  `Each vintage is the town and province aggregates of public/data.json on the capture date: the last commit of that file in a closed ISO week, Monday to Sunday, UTC. The series starts on ${SERIES_START}. Commits before that date are not used. A day inside the declared capture gap is not a capture. The JSON file is written once, and a later run refuses to overwrite it. The manifest records the SHA-256 of those exact bytes. A day with no eligible capture is listed and left empty. Nothing is interpolated.`;

export const VINTAGE_DEFINITIONS = {
  live_listings: 'Listings in the committed book on the capture date. A listing is one feed reference, not one dwelling.',
  median_asking_eur_m2:
    `Median asking EUR per square metre on the capture date. A town median is published only when that town has at least ${TOWN_MIN_LISTINGS} live listings and at least one positive asking EUR per square metre, the same floor as towns.csv. A province median is published when the province has at least one positive asking EUR per square metre. A thinner town has no median. No value is filled in from another day.`,
  price_cuts:
    'Same ref, same place, positive asking price on both vintages, and a lower asking price on the capture date. Null on the first vintage, when there is no previous file to compare.',
  price_rises:
    'Same ref, same place, positive asking price on both vintages, and a higher asking price on the capture date. Null when there is no previous vintage.',
  price_cut_share:
    'price_cuts divided by comparable listings, half-up to 4 decimal places, written as a decimal string. Comparable listings are the same ref in the same place with a positive asking price in both vintages. Null when there is no comparison, or when the comparable count is zero.',
  price_rise_share:
    'price_rises divided by the same comparable count, in the same decimal form. Null on the same terms as the cut share.',
  new_listings: 'A ref in this place on the capture date that was not in the previous book. Null when there is no previous vintage.',
  removed_listings:
    'A ref that was in this place in the previous vintage and is absent from the whole book on the capture date. Leaving the book is not a recorded sale. Null when there is no previous vintage.',
  reassigned:
    'A ref present in both books whose town or province changed. It is not counted as new, removed, or a price move.',
  gaps:
    'gap_dates_in_week are the days in that closed week, on or after the series start, that are not an eligible capture. A commit inside the declared capture gap is not eligible. Those days are listed and left empty.',
} as const;

const GAP_WEEK_REASON =
  'No eligible public/data.json commit in this closed week. Days inside the declared capture gap are not eligible. This week is not interpolated.';

export interface VintageListing {
  ref: string;
  town: string;
  provinceKey: string | null;
  provinceName: string | null;
  costa: string;
  priceEur: number;
  askingEurM2: number | null;
}

export interface DatedCommit {
  date: string;
  commit: string;
}

export interface PlannedWeek {
  iso_week: string;
  week_start: string;
  week_end: string;
  status: 'frozen' | 'gap';
  vintage_date: string | null;
  capture_commit: string | null;
  capture_dates_in_week: string[];
  gap_dates_in_week: string[];
  overlaps_declared_capture_gap: boolean;
  compared_to: string | null;
  missing_days_since_compared_to: string[] | null;
  reason: string | null;
}

export interface FlowCounts {
  comparable_listings: number | null;
  price_cuts: number | null;
  price_rises: number | null;
  price_cut_share: string | null;
  price_rise_share: string | null;
  new_listings: number | null;
  removed_listings: number | null;
  reassigned_in: number | null;
  reassigned_out: number | null;
}

export interface VintageRow extends FlowCounts {
  level: 'province' | 'town';
  key: string;
  name: string;
  province: string | null;
  costa: string | null;
  live_listings: number;
  priced_listings: number;
  median_asking_eur_m2: number | null;
}

export interface VintageBookTotals extends FlowCounts {
  live_listings: number;
  priced_listings: number;
  unmapped_listings: number;
  towns_published: number;
  towns_omitted: number;
  reassigned_listings: number | null;
}

export interface VintageFile {
  schema_version: 1;
  vintage_date: string;
  iso_week: string;
  week_start: string;
  week_end: string;
  capture_commit: string;
  source: 'public/data.json';
  series_start: string;
  compared_to: string | null;
  missing_days_since_compared_to: string[] | null;
  capture_dates_in_week: string[];
  gap_dates_in_week: string[];
  overlaps_declared_capture_gap: boolean;
  town_min_listings: number;
  book: VintageBookTotals;
  rows: VintageRow[];
}

export interface ManifestVintage {
  iso_week: string;
  week_start: string;
  week_end: string;
  status: 'frozen' | 'gap';
  vintage_date: string | null;
  row_count: number | null;
  sha256: string | null;
  file: string | null;
  capture_commit: string | null;
  compared_to: string | null;
  capture_dates_in_week: string[];
  gap_dates_in_week: string[];
  overlaps_declared_capture_gap: boolean;
  missing_days_since_compared_to: string[] | null;
  reason: string | null;
}

export interface VintageManifest {
  schema_version: 1;
  series_start: string;
  town_min_listings: number;
  point_in_time: string;
  definitions: typeof VINTAGE_DEFINITIONS;
  known_gaps: Array<{ from: string; to: string }>;
  missing_capture_dates: string[];
  vintages: ManifestVintage[];
}

export interface FreezeDecision {
  writes: Array<{ path: string; body: string }>;
  errors: string[];
  manifest: VintageManifest;
}

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const SHA = /^[0-9a-f]{40}$/;

export function isDay(value: string): boolean {
  return DAY.test(value);
}

export function addDays(iso: string, n: number): string {
  const m = DAY.exec(iso);
  if (!m) throw new Error(`date is not a day: ${iso}`);
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + n));
  return dt.toISOString().slice(0, 10);
}

export function utcDay(isoTimestamp: string): string {
  const ms = Date.parse(isoTimestamp);
  if (!Number.isFinite(ms)) throw new Error(`git commit date is not a timestamp: ${isoTimestamp}`);
  return new Date(ms).toISOString().slice(0, 10);
}

/** ISO week of a UTC calendar day. Week 2026-08-05 is 2026-W32, Monday 2026-08-03. */
export function isoWeek(date: string): { iso_week: string; week_start: string; week_end: string } {
  if (!isDay(date)) throw new Error(`date is not a day: ${date}`);
  const [y, m, d] = date.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  const day = utc.getUTCDay() || 7;
  const thursday = new Date(utc);
  thursday.setUTCDate(utc.getUTCDate() + (4 - day));
  const isoYear = thursday.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const yearStartDay = yearStart.getUTCDay() || 7;
  const firstThursday = new Date(yearStart);
  firstThursday.setUTCDate(yearStart.getUTCDate() + (4 - yearStartDay));
  const week = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / 604_800_000);
  const monday = new Date(utc);
  monday.setUTCDate(utc.getUTCDate() - (day - 1));
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return {
    iso_week: `${isoYear}-W${String(week).padStart(2, '0')}`,
    week_start: monday.toISOString().slice(0, 10),
    week_end: sunday.toISOString().slice(0, 10),
  };
}

export function inKnownGap(date: string, gaps: ReadonlyArray<{ from: string; to: string }> = KNOWN_GAPS): boolean {
  return gaps.some((g) => date >= g.from && date <= g.to);
}

export function assertFullHistory(earliestCommitDate: string, seriesStart: string = SERIES_START): void {
  if (!isDay(earliestCommitDate)) throw new Error(`earliest commit date is not a day: ${earliestCommitDate}`);
  if (earliestCommitDate > seriesStart) {
    throw new Error(
      `git history of public/data.json starts ${earliestCommitDate}, after ${seriesStart}. Refusing to freeze vintages from a short history.`,
    );
  }
}

function eachDate(from: string, to: string): string[] {
  if (from > to) return [];
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

function assertCommit(commit: string): void {
  if (!SHA.test(commit)) throw new Error(`commit is not a sha: ${commit}`);
}

/**
 * One frozen vintage or one gap row per closed ISO week.
 * `asOf` is the UTC day the job runs. A week is closed only when its Sunday
 * is before that day, so the in-progress week is not frozen.
 */
export function planClosedWeeks(args: {
  commits: DatedCommit[];
  asOf: string;
  seriesStart?: string;
  knownGaps?: ReadonlyArray<{ from: string; to: string }>;
}): PlannedWeek[] {
  const seriesStart = args.seriesStart ?? SERIES_START;
  const gaps = args.knownGaps ?? KNOWN_GAPS;
  if (!isDay(args.asOf)) throw new Error(`asOf is not a day: ${args.asOf}`);
  if (!isDay(seriesStart)) throw new Error(`series start is not a day: ${seriesStart}`);

  const byDate = new Map<string, string>();
  for (const row of args.commits) {
    if (!isDay(row.date)) throw new Error(`commit date is not a day: ${row.date}`);
    assertCommit(row.commit);
    if (byDate.has(row.date)) throw new Error(`duplicate commit date ${row.date}`);
    byDate.set(row.date, row.commit);
  }

  const eligible = new Map<string, string>();
  for (const [date, commit] of byDate) {
    if (date < seriesStart) continue;
    if (inKnownGap(date, gaps)) continue;
    eligible.set(date, commit);
  }

  const first = isoWeek(seriesStart);
  const plans: PlannedWeek[] = [];
  let comparedTo: string | null = null;

  for (let start = first.week_start; ; start = addDays(isoWeek(start).week_end, 1)) {
    const week = isoWeek(start);
    if (week.week_end >= args.asOf) break;
    const windowStart = week.week_start < seriesStart ? seriesStart : week.week_start;
    const days = eachDate(windowStart, week.week_end);
    const captureDates = days.filter((d) => eligible.has(d));
    const gapDates = days.filter((d) => !eligible.has(d));
    const overlaps = gapDates.some((d) => inKnownGap(d, gaps));
    if (!captureDates.length) {
      plans.push({
        iso_week: week.iso_week,
        week_start: week.week_start,
        week_end: week.week_end,
        status: 'gap',
        vintage_date: null,
        capture_commit: null,
        capture_dates_in_week: [],
        gap_dates_in_week: gapDates,
        overlaps_declared_capture_gap: overlaps,
        compared_to: null,
        missing_days_since_compared_to: null,
        reason: GAP_WEEK_REASON,
      });
      continue;
    }
    const vintageDate = captureDates[captureDates.length - 1];
    const missingSince = comparedTo
      ? eachDate(addDays(comparedTo, 1), addDays(vintageDate, -1)).filter((d) => d >= seriesStart && !eligible.has(d))
      : null;
    plans.push({
      iso_week: week.iso_week,
      week_start: week.week_start,
      week_end: week.week_end,
      status: 'frozen',
      vintage_date: vintageDate,
      capture_commit: eligible.get(vintageDate) ?? null,
      capture_dates_in_week: captureDates,
      gap_dates_in_week: gapDates,
      overlaps_declared_capture_gap: overlaps,
      compared_to: comparedTo,
      missing_days_since_compared_to: missingSince,
      reason: null,
    });
    comparedTo = vintageDate;
  }
  return plans;
}

export function listingsFromBook(raw: unknown): VintageListing[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('listing book is not a non-empty array — refusing to publish an empty vintage as a quiet market');
  }
  const out: VintageListing[] = [];
  const seen = new Set<string>();
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
    const priceEur = typeof rec.pf === 'number' && Number.isFinite(rec.pf) ? rec.pf : 0;
    const asking = typeof rec.pm2 === 'number' && Number.isFinite(rec.pm2) && rec.pm2 > 0 ? rec.pm2 : null;
    const costa = typeof rec.costa === 'string' ? rec.costa.trim() : '';
    out.push({
      ref,
      town,
      provinceKey: province?.key ?? null,
      provinceName: province?.name ?? null,
      costa,
      priceEur,
      askingEurM2: asking,
    });
  }
  return out;
}

/** Half-up to 4 decimal places. Null when the denominator is not positive. */
export function shareOf(numerator: number, denominator: number): string | null {
  if (!Number.isInteger(numerator) || !Number.isInteger(denominator) || denominator <= 0 || numerator < 0) return null;
  const scaled = numerator * 10_000;
  let q = Math.floor(scaled / denominator);
  const rem = scaled % denominator;
  if (rem * 2 >= denominator) q += 1;
  const whole = Math.floor(q / 10_000);
  const frac = String(q % 10_000).padStart(4, '0');
  return `${whole}.${frac}`;
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function medianRounded(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = quantile(sorted, 0.5);
  if (!Number.isFinite(mid)) return null;
  return Math.round(mid);
}

function mode(values: Array<string | null>): string | null {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'en'))[0];
  return top ? top[0] : null;
}

function indexBook(listings: VintageListing[]): Map<string, VintageListing> {
  const map = new Map<string, VintageListing>();
  for (const row of listings) {
    if (map.has(row.ref)) throw new Error(`duplicate ref in listing book: ${row.ref}`);
    map.set(row.ref, row);
  }
  return map;
}

const EMPTY_FLOW: FlowCounts = {
  comparable_listings: null,
  price_cuts: null,
  price_rises: null,
  price_cut_share: null,
  price_rise_share: null,
  new_listings: null,
  removed_listings: null,
  reassigned_in: null,
  reassigned_out: null,
};

function flowBetween(
  current: VintageListing[],
  previous: VintageListing[] | null,
  currentAll: Map<string, VintageListing>,
  previousAll: Map<string, VintageListing> | null,
  samePlace: (prev: VintageListing, cur: VintageListing) => boolean,
): FlowCounts {
  if (!previous || !previousAll) return { ...EMPTY_FLOW };
  let comparable = 0;
  let cuts = 0;
  let rises = 0;
  let created = 0;
  let removed = 0;
  let reassignedIn = 0;
  let reassignedOut = 0;
  for (const row of current) {
    const prev = previousAll.get(row.ref);
    if (!prev) {
      created += 1;
      continue;
    }
    if (!samePlace(prev, row)) {
      reassignedIn += 1;
      continue;
    }
    if (row.priceEur > 0 && prev.priceEur > 0) {
      comparable += 1;
      if (row.priceEur < prev.priceEur) cuts += 1;
      else if (row.priceEur > prev.priceEur) rises += 1;
    }
  }
  for (const row of previous) {
    const cur = currentAll.get(row.ref);
    if (!cur) removed += 1;
    else if (!samePlace(row, cur)) reassignedOut += 1;
  }
  return {
    comparable_listings: comparable,
    price_cuts: cuts,
    price_rises: rises,
    price_cut_share: shareOf(cuts, comparable),
    price_rise_share: shareOf(rises, comparable),
    new_listings: created,
    removed_listings: removed,
    reassigned_in: reassignedIn,
    reassigned_out: reassignedOut,
  };
}

function groupBy(listings: VintageListing[], keyOf: (row: VintageListing) => string | null): Map<string, VintageListing[]> {
  const map = new Map<string, VintageListing[]>();
  for (const row of listings) {
    const key = keyOf(row);
    if (!key) continue;
    const list = map.get(key);
    if (list) list.push(row);
    else map.set(key, [row]);
  }
  return map;
}

function townQualifies(list: VintageListing[]): boolean {
  return list.length >= TOWN_MIN_LISTINGS && list.some((row) => row.askingEurM2 != null);
}

function rowFor(
  level: 'province' | 'town',
  key: string,
  name: string,
  current: VintageListing[],
  previous: VintageListing[] | null,
  currentAll: Map<string, VintageListing>,
  previousAll: Map<string, VintageListing> | null,
  samePlace: (prev: VintageListing, cur: VintageListing) => boolean,
  publishMedian: boolean,
): VintageRow {
  const priced = current.filter((row) => row.askingEurM2 != null).map((row) => row.askingEurM2!);
  const labelSource = current.length ? current : (previous ?? []);
  return {
    level,
    key,
    name,
    province: level === 'province' ? null : mode(labelSource.map((row) => row.provinceName)),
    costa: mode(labelSource.map((row) => row.costa || null)),
    live_listings: current.length,
    priced_listings: priced.length,
    median_asking_eur_m2: publishMedian ? medianRounded(priced) : null,
    ...flowBetween(current, previous, currentAll, previousAll, samePlace),
  };
}

export function buildVintageFile(
  plan: PlannedWeek,
  current: VintageListing[],
  previous: VintageListing[] | null,
): VintageFile {
  if (plan.status !== 'frozen' || !plan.vintage_date || !plan.capture_commit) {
    throw new Error(`refusing to build a file for ${plan.iso_week}, which is not a frozen week`);
  }
  if (!current.length) throw new Error(`listing book on ${plan.vintage_date} is empty`);
  assertCommit(plan.capture_commit);
  const currentAll = indexBook(current);
  const previousAll = previous ? indexBook(previous) : null;
  const sameTown = (a: VintageListing, b: VintageListing) => a.town === b.town;
  const sameProvince = (a: VintageListing, b: VintageListing) => a.provinceKey === b.provinceKey;
  const sameBookPlace = (a: VintageListing, b: VintageListing) => a.town === b.town && a.provinceKey === b.provinceKey;

  const currentTowns = groupBy(current, (row) => row.town);
  const previousTowns = previous ? groupBy(previous, (row) => row.town) : new Map<string, VintageListing[]>();
  const currentProvinces = groupBy(current, (row) => row.provinceKey);
  const previousProvinces = previous ? groupBy(previous, (row) => row.provinceKey) : new Map<string, VintageListing[]>();

  const rows: VintageRow[] = [];
  const provinceKeys = new Set<string>([...currentProvinces.keys(), ...previousProvinces.keys()]);
  for (const key of provinceKeys) {
    const now = currentProvinces.get(key) ?? [];
    const then = previous ? (previousProvinces.get(key) ?? []) : null;
    if (!now.length && !(then && then.length)) continue;
    const name = ES_PROVINCE_DEFS.find((p) => p.key === key)?.name ?? now[0]?.provinceName ?? then?.[0]?.provinceName ?? key;
    const priced = now.some((row) => row.askingEurM2 != null);
    rows.push(rowFor('province', key, name, now, then, currentAll, previousAll, sameProvince, priced));
  }

  const townKeys = new Set<string>([...currentTowns.keys(), ...previousTowns.keys()]);
  let townsOmitted = 0;
  for (const key of townKeys) {
    const now = currentTowns.get(key) ?? [];
    const thenList = previousTowns.get(key) ?? [];
    const nowOk = townQualifies(now);
    const thenOk = previous ? townQualifies(thenList) : false;
    if (!nowOk && !thenOk) {
      if (now.length) townsOmitted += 1;
      continue;
    }
    rows.push(rowFor(
      'town',
      key,
      key,
      now,
      previous ? thenList : null,
      currentAll,
      previousAll,
      sameTown,
      nowOk,
    ));
  }

  rows.sort((a, b) => {
    if (a.level !== b.level) return a.level === 'province' ? -1 : 1;
    return a.name.localeCompare(b.name, 'en') || a.key.localeCompare(b.key, 'en');
  });

  const bookFlow = flowBetween(current, previous, currentAll, previousAll, sameBookPlace);
  let reassigned: number | null = null;
  if (previousAll) {
    reassigned = 0;
    for (const row of current) {
      const prev = previousAll.get(row.ref);
      if (prev && !sameBookPlace(prev, row)) reassigned += 1;
    }
  }

  return {
    schema_version: 1,
    vintage_date: plan.vintage_date,
    iso_week: plan.iso_week,
    week_start: plan.week_start,
    week_end: plan.week_end,
    capture_commit: plan.capture_commit,
    source: 'public/data.json',
    series_start: SERIES_START,
    compared_to: plan.compared_to,
    missing_days_since_compared_to: plan.missing_days_since_compared_to,
    capture_dates_in_week: plan.capture_dates_in_week,
    gap_dates_in_week: plan.gap_dates_in_week,
    overlaps_declared_capture_gap: plan.overlaps_declared_capture_gap,
    town_min_listings: TOWN_MIN_LISTINGS,
    book: {
      live_listings: current.length,
      priced_listings: current.filter((row) => row.askingEurM2 != null).length,
      unmapped_listings: current.filter((row) => row.provinceKey == null).length,
      towns_published: rows.filter((row) => row.level === 'town').length,
      towns_omitted: townsOmitted,
      ...bookFlow,
      reassigned_listings: reassigned,
    },
    rows,
  };
}

export function canonicalVintageJson(file: VintageFile): string {
  return `${JSON.stringify(file, null, 2)}\n`;
}

export function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function orderEntry(entry: ManifestVintage): ManifestVintage {
  return {
    iso_week: entry.iso_week,
    week_start: entry.week_start,
    week_end: entry.week_end,
    status: entry.status,
    vintage_date: entry.vintage_date,
    row_count: entry.row_count,
    sha256: entry.sha256,
    file: entry.file,
    capture_commit: entry.capture_commit,
    compared_to: entry.compared_to,
    capture_dates_in_week: [...entry.capture_dates_in_week],
    gap_dates_in_week: [...entry.gap_dates_in_week],
    overlaps_declared_capture_gap: entry.overlaps_declared_capture_gap,
    missing_days_since_compared_to: entry.missing_days_since_compared_to ? [...entry.missing_days_since_compared_to] : null,
    reason: entry.reason,
  };
}

function orderManifest(manifest: VintageManifest): VintageManifest {
  return {
    schema_version: 1,
    series_start: manifest.series_start,
    town_min_listings: manifest.town_min_listings,
    point_in_time: manifest.point_in_time,
    definitions: { ...VINTAGE_DEFINITIONS },
    known_gaps: manifest.known_gaps.map((g) => ({ from: g.from, to: g.to })),
    missing_capture_dates: [...manifest.missing_capture_dates],
    vintages: manifest.vintages.map(orderEntry),
  };
}

export function canonicalManifestJson(manifest: VintageManifest): string {
  return `${JSON.stringify(orderManifest(manifest), null, 2)}\n`;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function parseManifest(raw: unknown): VintageManifest {
  if (!raw || typeof raw !== 'object') throw new Error('vintage manifest is not an object — refusing to replace it');
  const rec = raw as Record<string, unknown>;
  if (rec.schema_version !== 1) throw new Error('vintage manifest schema is not 1 — refusing to replace it');
  if (rec.series_start !== SERIES_START) throw new Error('vintage manifest series start differs — refusing to replace it');
  if (rec.town_min_listings !== TOWN_MIN_LISTINGS) throw new Error('vintage manifest town floor differs — refusing to replace it');
  if (!Array.isArray(rec.vintages) || !isStringArray(rec.missing_capture_dates) || !Array.isArray(rec.known_gaps)) {
    throw new Error('vintage manifest is missing its lists — refusing to replace it');
  }
  const vintages: ManifestVintage[] = rec.vintages.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('vintage manifest row is not an object');
    const row = item as ManifestVintage;
    if (row.status !== 'frozen' && row.status !== 'gap') throw new Error(`vintage manifest status is not frozen or gap: ${String(row.status)}`);
    if (!isStringArray(row.capture_dates_in_week) || !isStringArray(row.gap_dates_in_week)) {
      throw new Error(`vintage manifest week ${row.iso_week} has no date lists`);
    }
    if (row.missing_days_since_compared_to != null && !isStringArray(row.missing_days_since_compared_to)) {
      throw new Error(`vintage manifest week ${row.iso_week} has a bad comparison gap list`);
    }
    if (row.status === 'frozen') {
      if (typeof row.vintage_date !== 'string' || typeof row.sha256 !== 'string' || typeof row.file !== 'string' || typeof row.row_count !== 'number') {
        throw new Error(`frozen week ${row.iso_week} is incomplete — refusing to replace the manifest`);
      }
    } else if (row.vintage_date != null || row.sha256 != null || row.file != null || row.row_count != null) {
      throw new Error(`gap week ${row.iso_week} records a file — refusing to replace the manifest`);
    }
    return orderEntry(row);
  });
  const known = (rec.known_gaps as Array<{ from?: unknown; to?: unknown }>).map((g) => {
    if (typeof g?.from !== 'string' || typeof g?.to !== 'string') throw new Error('vintage manifest gap is not a pair of dates');
    return { from: g.from, to: g.to };
  });
  return orderManifest({
    schema_version: 1,
    series_start: SERIES_START,
    town_min_listings: TOWN_MIN_LISTINGS,
    point_in_time: typeof rec.point_in_time === 'string' ? rec.point_in_time : VINTAGE_GUARANTEE,
    definitions: VINTAGE_DEFINITIONS,
    known_gaps: known,
    missing_capture_dates: rec.missing_capture_dates,
    vintages,
  });
}

function entryFor(plan: PlannedWeek, file: VintageFile | null): ManifestVintage {
  if (plan.status === 'gap') {
    return orderEntry({
      iso_week: plan.iso_week,
      week_start: plan.week_start,
      week_end: plan.week_end,
      status: 'gap',
      vintage_date: null,
      row_count: null,
      sha256: null,
      file: null,
      capture_commit: null,
      compared_to: null,
      capture_dates_in_week: [],
      gap_dates_in_week: plan.gap_dates_in_week,
      overlaps_declared_capture_gap: plan.overlaps_declared_capture_gap,
      missing_days_since_compared_to: null,
      reason: GAP_WEEK_REASON,
    });
  }
  if (!file || !plan.vintage_date) throw new Error(`frozen week ${plan.iso_week} has no file`);
  const body = canonicalVintageJson(file);
  return orderEntry({
    iso_week: plan.iso_week,
    week_start: plan.week_start,
    week_end: plan.week_end,
    status: 'frozen',
    vintage_date: plan.vintage_date,
    row_count: file.rows.length,
    sha256: sha256Hex(body),
    file: `data/vintages/${plan.vintage_date}.json`,
    capture_commit: plan.capture_commit,
    compared_to: plan.compared_to,
    capture_dates_in_week: plan.capture_dates_in_week,
    gap_dates_in_week: plan.gap_dates_in_week,
    overlaps_declared_capture_gap: plan.overlaps_declared_capture_gap,
    missing_days_since_compared_to: plan.missing_days_since_compared_to,
    reason: null,
  });
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function decideFreeze(args: {
  plans: PlannedWeek[];
  files: Map<string, VintageFile>;
  existingFiles: Map<string, string>;
  existingManifest: unknown | null;
  /** Exact manifest bytes already on disk. Used so a prose-only difference is a manifest rewrite and a matching file is a no-op. */
  existingManifestBody?: string | null;
  strayDates?: string[];
}): FreezeDecision {
  const errors: string[] = [];
  const writes: Array<{ path: string; body: string }> = [];

  for (const date of args.strayDates ?? []) {
    const planned = args.plans.some((plan) => plan.vintage_date === date);
    if (!planned) errors.push(`refusing unexpected vintage file data/vintages/${date}.json`);
  }

  let existing: VintageManifest | null = null;
  if (args.existingManifest != null) {
    try {
      existing = parseManifest(args.existingManifest);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  const entries: ManifestVintage[] = [];
  for (const plan of args.plans) {
    if (plan.status === 'frozen' && plan.vintage_date) {
      if (inKnownGap(plan.vintage_date)) {
        errors.push(`refusing to freeze ${plan.vintage_date}, which sits inside the declared capture gap`);
      }
      const built = args.files.get(plan.vintage_date);
      if (!built) {
        errors.push(`missing in-memory vintage for ${plan.vintage_date}`);
        continue;
      }
      const body = canonicalVintageJson(built);
      const path = `data/vintages/${plan.vintage_date}.json`;
      const prior = args.existingFiles.get(plan.vintage_date);
      if (prior == null) writes.push({ path, body });
      else if (prior !== body) errors.push(`refusing to overwrite ${path}`);
      try {
        entries.push(entryFor(plan, built));
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
      continue;
    }
    entries.push(entryFor(plan, null));
  }

  const missing = [...new Set(args.plans.flatMap((plan) => plan.gap_dates_in_week))].sort();
  const manifest = orderManifest({
    schema_version: 1,
    series_start: SERIES_START,
    town_min_listings: TOWN_MIN_LISTINGS,
    point_in_time: VINTAGE_GUARANTEE,
    definitions: VINTAGE_DEFINITIONS,
    known_gaps: KNOWN_GAPS.map((g) => ({ from: g.from, to: g.to })),
    missing_capture_dates: missing,
    vintages: entries,
  });

  if (existing) {
    if (!sameJson(existing.known_gaps, manifest.known_gaps)) {
      errors.push('refusing to revise known_gaps in the vintage manifest');
    }
    const priorMissing = existing.missing_capture_dates;
    const samePrefix = priorMissing.every((date, i) => manifest.missing_capture_dates[i] === date);
    if (!samePrefix || priorMissing.length > manifest.missing_capture_dates.length) {
      errors.push('refusing to revise missing capture dates already recorded');
    }
    for (const prior of existing.vintages) {
      const next = manifest.vintages.find((row) => row.iso_week === prior.iso_week);
      if (!next) {
        errors.push(`refusing to drop vintage week ${prior.iso_week}`);
        continue;
      }
      if (!sameJson(orderEntry(prior), orderEntry(next))) {
        errors.push(`refusing to revise manifest entry ${prior.iso_week}`);
      }
    }
  }

  const manifestBody = canonicalManifestJson(manifest);
  const priorManifestBody = args.existingManifestBody ?? null;
  if (priorManifestBody !== manifestBody) writes.push({ path: 'data/vintages/manifest.json', body: manifestBody });

  if (errors.length) return { writes: [], errors, manifest };
  return { writes, errors, manifest };
}

export function writeFreeze(root: string, decision: FreezeDecision): void {
  if (decision.errors.length) {
    throw new Error(decision.errors.join('\n'));
  }
  const rootResolved = resolve(root);
  for (const write of decision.writes) {
    if (write.path.includes('..') || !write.path.startsWith('data/vintages/')) {
      throw new Error(`refusing path ${write.path}`);
    }
    const dest = resolve(rootResolved, write.path);
    if (!dest.startsWith(`${rootResolved}/`)) throw new Error(`refusing path ${write.path}`);
    mkdirSync(dirname(dest), { recursive: true });
    if (existsSync(dest)) {
      const current = readFileSync(dest, 'utf8');
      if (current !== write.body) throw new Error(`refusing to overwrite ${write.path}`);
      continue;
    }
    const tmp = `${dest}.tmp`;
    writeFileSync(tmp, write.body);
    renameSync(tmp, dest);
  }
}

export function vintagesRoot(): string {
  return join(process.cwd(), 'data', 'vintages');
}

export function readVintageManifest(dir = vintagesRoot()): VintageManifest {
  const raw = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')) as unknown;
  return parseManifest(raw);
}

export function latestFrozenDate(manifest: VintageManifest): string | null {
  const dates = manifest.vintages
    .filter((row) => row.status === 'frozen' && row.vintage_date)
    .map((row) => row.vintage_date as string);
  return dates.length ? dates[dates.length - 1] : null;
}

export interface PublicVintage extends ManifestVintage {
  download_json: string | null;
  download_csv: string | null;
}

export function publicManifest(manifest: VintageManifest): Omit<VintageManifest, 'vintages'> & {
  index: '/data/vintages';
  vintages: PublicVintage[];
} {
  const ordered = orderManifest(manifest);
  return {
    ...ordered,
    index: '/data/vintages',
    vintages: ordered.vintages.map((row) => ({
      ...row,
      download_json: row.status === 'frozen' && row.vintage_date ? `/api/v1/vintages/${row.vintage_date}` : null,
      download_csv: row.status === 'frozen' && row.vintage_date ? `/api/v1/vintages/${row.vintage_date}?format=csv` : null,
    })),
  };
}

function csvCell(value: unknown): string {
  if (value == null) return '';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const CSV_COLUMNS: Array<keyof VintageRow> = [
  'level',
  'key',
  'name',
  'province',
  'costa',
  'live_listings',
  'priced_listings',
  'median_asking_eur_m2',
  'comparable_listings',
  'price_cuts',
  'price_rises',
  'price_cut_share',
  'price_rise_share',
  'new_listings',
  'removed_listings',
  'reassigned_in',
  'reassigned_out',
];

export function vintageToCsv(file: VintageFile): string {
  const head = CSV_COLUMNS.join(',');
  const body = file.rows.map((row) => CSV_COLUMNS.map((col) => csvCell(row[col])).join(',')).join('\n');
  return body ? `${head}\n${body}\n` : `${head}\n`;
}

export type VintageRead =
  | { ok: true; entry: ManifestVintage; body: string; file: VintageFile }
  | { ok: false; status: 'gap' | 'missing'; entry: ManifestVintage | null };

export function readVintage(date: string, dir = vintagesRoot()): VintageRead {
  if (!isDay(date)) return { ok: false, status: 'missing', entry: null };
  const manifest = readVintageManifest(dir);
  const entry = manifest.vintages.find((row) => row.vintage_date === date) ?? null;
  if (entry?.status === 'frozen' && entry.file === `data/vintages/${date}.json` && entry.sha256) {
    const body = readFileSync(join(dir, `${date}.json`), 'utf8');
    if (sha256Hex(body) !== entry.sha256) {
      throw new Error(`vintage ${date} does not match the manifest hash — refusing to serve it`);
    }
    const file = JSON.parse(body) as VintageFile;
    return { ok: true, entry, body, file };
  }
  const gapEntry = manifest.vintages.find((row) => row.status === 'gap' && (row.week_start === date || row.gap_dates_in_week.includes(date)))
    ?? manifest.vintages.find((row) => row.gap_dates_in_week.includes(date))
    ?? null;
  if (gapEntry || manifest.missing_capture_dates.includes(date) || inKnownGap(date)) {
    return { ok: false, status: 'gap', entry: gapEntry };
  }
  return { ok: false, status: 'missing', entry: null };
}

export function listVintageFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => DAY.test(name.slice(0, 10)) && name.endsWith('.json'))
    .map((name) => name.slice(0, 10));
}
