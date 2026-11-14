/**
 * Public listing-duration snapshot.
 *
 * Pairs with the public absorption file. Absorption counts listings leaving
 * the book. This file says how long the ones still in the book have been
 * observed, and how long the ones that left had been observed before the
 * delisting ledger recorded them.
 *
 * An exit is a delisting. Days to sell are not estimated. Project rows are
 * not in the file.
 *
 * Pure aside from readListingDuration, which reads the committed file.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { LEDGER_EPOCH } from '@/lib/open-dataset-io';
import {
  KNOWN_GAPS,
  SERIES_START,
  daysBetween,
  inKnownGap,
} from '@/lib/sellthrough';

export const MIN_FOR_MEDIAN = 5;
export const LISTING_DURATION_LEVELS = ['coast', 'region', 'town'] as const;
export type ListingDurationLevel = (typeof LISTING_DURATION_LEVELS)[number];

export const REFRESH_CRON = '55 6 * * *';
export const REFRESH_NOTE = 'GitHub Actions listing-duration-refresh.yml, daily at 06:55 UTC, after listing absorption at 06:40 UTC.';

/**
 * Plain-language definitions. The page and the committed JSON share these
 * sentences so the file cannot claim a sale the page has disowned.
 */
export const DURATION_PLAIN = {
  observe:
    'Avena observes listings, asking-price moves, and delistings. It never observes a confirmed sale. An exit is a delisting.',
  live:
    'Live median days listed counts calendar days from the first price_snapshots day to the as-of date, for references still in the latest snapshot. When a live reference has no snapshot and the listing book carries _added, that date is the start. It is used only then.',
  censored:
    'References already present on 5 August 2026 are left-censored. Their days listed are a lower bound: the daily series did not exist before that day. The arrived-in-series median drops those references. It is blank when fewer than 5 remain.',
  exit:
    'Exit duration is calendar days from the first observed snapshot to the delisting ledger last_seen_date. It is days until delisting. Days to sell are not estimated. An exit has no sale date.',
  stamp:
    'The delisting ledger often stamps last_seen_date on the day the absence was noticed. That can be the day after the last snapshot. The duration uses that recorded date, except where the October gap rule cuts it back.',
  gap:
    'There is no snapshot from 14 October 2026 through 20 October 2026. Where the last snapshot is 13 October 2026 and the ledger date falls on or after that day, the duration stops on 13 October and the exit is marked as leaving on an unknown day inside the gap. The missing days are not added.',
  floor:
    'A median is left blank when fewer than 5 references were measured in that cell. The count is still shown.',
  scope:
    'This file is coast, region and town only. It has no project rows and no listing references.',
  history:
    'The daily series starts on 5 August 2026. The history is short. A median from this window is not a long record of how long listings stay up.',
  liquidity:
    'GET /api/v1/liquidity reports days since _added for one live listing and the other live listings in its town. _added is not on every listing. This file is built from price_snapshots and the delisting ledger.',
} as const;

export const LISTING_DURATION_NAME = 'Avena listing duration';

export const LISTING_DURATION_METHOD = [
  DURATION_PLAIN.observe,
  DURATION_PLAIN.live,
  DURATION_PLAIN.censored,
  DURATION_PLAIN.exit,
  DURATION_PLAIN.stamp,
  DURATION_PLAIN.gap,
  DURATION_PLAIN.floor,
  DURATION_PLAIN.scope,
  DURATION_PLAIN.history,
  DURATION_PLAIN.liquidity,
].join(' ');

export interface SnapshotSpan {
  ref: string;
  town: string | null;
  region: string | null;
  firstSeen: string;
  lastSeen: string;
}

export interface DelistingSpan {
  ref: string;
  town: string | null;
  region: string | null;
  lastSeenDate: string;
}

export interface AddedSpan {
  ref: string;
  town: string | null;
  region: string | null;
  added: string;
}

export interface DurationGroup {
  key: string;
  label: string;
  region: string | null;
  live: number;
  liveMeasured: number;
  liveLeftCensored: number;
  liveArrivedInSeries: number;
  medianDaysListed: number | null;
  medianDaysListedArrivedInSeries: number | null;
  exits: number;
  exitsMeasured: number;
  exitsInGap: number;
  exitsStillListed: number;
  medianExitDays: number | null;
}

export interface DurationCoverage {
  refsInLedger: number;
  live: number;
  liveMeasured: number;
  liveLeftCensored: number;
  liveFromAddedOnly: number;
  exits: number;
  exitsMeasured: number;
  exitsInGap: number;
  exitsStillListed: number;
  exitsUnmeasured: number;
  towns: number;
  regions: number;
}

export interface ListingDurationFile {
  name: string;
  asOf: string;
  seriesStart: string;
  knownGaps: Array<{ from: string; to: string }>;
  minForMedian: number;
  refresh: string;
  coverage: DurationCoverage;
  coast: DurationGroup;
  regions: DurationGroup[];
  towns: DurationGroup[];
  methodology: string[];
}

export interface ExitDuration {
  /** Calendar days, or null when no snapshot falls on or before the end date. */
  days: number | null;
  inGap: boolean;
  /** The end date actually used. Null when the span cannot be measured. */
  end: string | null;
}

/**
 * End date of an exit.
 *
 * The ledger date is the end, including when it is the day after the last
 * snapshot. If that interval would run through the known capture gap, the
 * end is pulled back to the last snapshot. The unobserved days are not counted.
 */
export function exitDuration(input: {
  firstSnapshot: string | null;
  lastSnapshot: string | null;
  delistedOn: string;
}): ExitDuration {
  const gapExit = Boolean(
    input.lastSnapshot
    && inKnownGap(input.lastSnapshot)
    && input.delistedOn >= input.lastSnapshot,
  );
  const stampInsideGap = KNOWN_GAPS.some((gap) => input.delistedOn >= gap.from && input.delistedOn <= gap.to);
  let end = input.delistedOn;
  if (gapExit && input.lastSnapshot && input.delistedOn > input.lastSnapshot) end = input.lastSnapshot;
  if (!gapExit && stampInsideGap) {
    if (input.lastSnapshot && input.lastSnapshot < input.delistedOn) end = input.lastSnapshot;
    else return { days: null, inGap: true, end: null };
  }
  const start = input.firstSnapshot;
  if (!start || start > end) return { days: null, inGap: gapExit || stampInsideGap, end: null };
  return { days: daysBetween(start, end), inGap: gapExit || stampInsideGap, end };
}

export function foldSnapshotSpans(rows: Array<{
  ref: string;
  snapshot_date: string;
  town: string | null;
  region: string | null;
}>): SnapshotSpan[] {
  const byRef = new Map<string, SnapshotSpan>();
  for (const row of rows) {
    const date = String(row.snapshot_date).slice(0, 10);
    if (!row.ref || date < SERIES_START) continue;
    const current = byRef.get(row.ref);
    if (!current) {
      byRef.set(row.ref, { ref: row.ref, town: row.town, region: row.region, firstSeen: date, lastSeen: date });
      continue;
    }
    if (date < current.firstSeen) current.firstSeen = date;
    if (date >= current.lastSeen) {
      current.lastSeen = date;
      if (row.town) current.town = row.town;
      if (row.region) current.region = row.region;
    }
  }
  return [...byRef.values()];
}

interface Prepared {
  live: { town: string; region: string; days: number; leftCensored: boolean; arrived: boolean; fromAdded: boolean } | null;
  exit: { town: string; region: string; days: number | null; inGap: boolean; stillListed: boolean } | null;
}

function place(value: string | null | undefined): string {
  const text = (value ?? '').trim();
  return text || 'unknown';
}

function median(values: number[]): number | null {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  const raw = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return Math.round(raw);
}

function publishedMedian(values: number[]): number | null {
  return values.length >= MIN_FOR_MEDIAN ? median(values) : null;
}

function matches(kind: 'coast' | 'region' | 'town', key: string, value: string): boolean {
  if (kind === 'coast') return true;
  return value === key;
}

function groupOf(
  key: string,
  label: string,
  region: string | null,
  rows: Prepared[],
  kind: 'coast' | 'region' | 'town',
): DurationGroup {
  const live = rows.filter((row) => row.live && matches(kind, key, kind === 'region' ? row.live.region : row.live.town));
  const exits = rows.filter((row) => row.exit && matches(kind, key, kind === 'region' ? row.exit.region : row.exit.town));
  const arrived = live.filter((row) => row.live?.arrived);
  const measuredExits = exits.filter((row) => row.exit?.days != null);
  return {
    key,
    label,
    region,
    live: live.length,
    liveMeasured: live.length,
    liveLeftCensored: live.filter((row) => row.live?.leftCensored).length,
    liveArrivedInSeries: arrived.length,
    medianDaysListed: publishedMedian(live.map((row) => row.live!.days)),
    medianDaysListedArrivedInSeries: publishedMedian(arrived.map((row) => row.live!.days)),
    exits: exits.length,
    exitsMeasured: measuredExits.length,
    exitsInGap: exits.filter((row) => row.exit?.inGap).length,
    exitsStillListed: exits.filter((row) => row.exit?.stillListed).length,
    medianExitDays: publishedMedian(measuredExits.map((row) => row.exit!.days as number)),
  };
}

const FORBIDDEN_KEYS = new Set(['project', 'projects', 'ref', 'refs', 'dev', 'dev_ref']);

export function findForbiddenKey(value: unknown, path = '$'): string | null {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const hit = findForbiddenKey(value[i], `${path}[${i}]`);
      if (hit) return hit;
    }
    return null;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (FORBIDDEN_KEYS.has(key)) return `${path}.${key}`;
      const hit = findForbiddenKey(child, `${path}.${key}`);
      if (hit) return hit;
    }
  }
  return null;
}

export function aggregateListingDuration(input: {
  asOf: string;
  spans: SnapshotSpan[];
  delistings: DelistingSpan[];
  addedOnly?: AddedSpan[];
}): ListingDurationFile {
  if (input.asOf < SERIES_START) throw new Error(`listing duration asOf ${input.asOf} is before ${SERIES_START}`);
  if (SERIES_START !== LEDGER_EPOCH) throw new Error(`listing duration epoch drifted from ${LEDGER_EPOCH}`);

  const spans = new Map(input.spans.filter((span) => span.ref && span.firstSeen >= SERIES_START && span.lastSeen <= input.asOf).map((span) => [span.ref, span]));
  const seen = new Set(spans.keys());
  const prepared: Prepared[] = [];
  const byRef = new Map<string, Prepared>();

  for (const span of spans.values()) {
    const live = span.lastSeen === input.asOf ? {
      town: place(span.town),
      region: place(span.region),
      days: daysBetween(span.firstSeen, input.asOf),
      leftCensored: span.firstSeen <= SERIES_START,
      arrived: span.firstSeen > SERIES_START,
      fromAdded: false,
    } : null;
    const row: Prepared = { live, exit: null };
    byRef.set(span.ref, row);
    prepared.push(row);
  }

  let exitsStillListed = 0;
  for (const delisting of input.delistings) {
    if (!delisting.ref || delisting.lastSeenDate < SERIES_START) continue;
    const span = spans.get(delisting.ref);
    const duration = exitDuration({
      firstSnapshot: span?.firstSeen ?? null,
      lastSnapshot: span?.lastSeen ?? null,
      delistedOn: delisting.lastSeenDate,
    });
    const stillListed = span?.lastSeen === input.asOf;
    if (stillListed) exitsStillListed += 1;
    const exit = {
      town: place(delisting.town ?? span?.town),
      region: place(delisting.region ?? span?.region),
      days: duration.days,
      inGap: duration.inGap,
      stillListed,
    };
    const existing = byRef.get(delisting.ref);
    if (existing && existing.live && existing.live.town === exit.town && existing.live.region === exit.region) {
      existing.exit = exit;
      continue;
    }
    if (existing && !existing.live && !existing.exit) {
      existing.exit = exit;
      continue;
    }
    const row: Prepared = { live: null, exit };
    prepared.push(row);
  }

  let liveFromAddedOnly = 0;
  for (const added of input.addedOnly ?? []) {
    if (!added.ref || seen.has(added.ref) || added.added > input.asOf) continue;
    seen.add(added.ref);
    liveFromAddedOnly += 1;
    prepared.push({
      live: {
        town: place(added.town),
        region: place(added.region),
        days: daysBetween(added.added, input.asOf),
        leftCensored: added.added <= SERIES_START,
        arrived: added.added > SERIES_START,
        fromAdded: true,
      },
      exit: null,
    });
  }

  const liveRows = prepared.filter((row) => row.live);
  const exitRows = prepared.filter((row) => row.exit);
  if (!liveRows.length) throw new Error('listing duration has no live references — refusing to publish an empty book');

  const regionOfTown = new Map<string, string>();
  const regionKeys = new Set<string>();
  for (const row of prepared) {
    if (row.live) {
      regionKeys.add(row.live.region);
      if (!regionOfTown.has(row.live.town)) regionOfTown.set(row.live.town, row.live.region);
    }
    if (row.exit) {
      regionKeys.add(row.exit.region);
      if (!regionOfTown.has(row.exit.town)) regionOfTown.set(row.exit.town, row.exit.region);
    }
  }

  const coast = groupOf('all', 'All covered markets', null, prepared, 'coast');
  const regionRows = [...regionKeys]
    .map((key) => groupOf(key, key, key, prepared, 'region'))
    .sort((a, b) => b.live - a.live || a.label.localeCompare(b.label));
  const townRows = [...regionOfTown.entries()]
    .map(([key, region]) => groupOf(key, key, region, prepared, 'town'))
    .sort((a, b) => (b.live + b.exits) - (a.live + a.exits) || a.label.localeCompare(b.label));

  const file: ListingDurationFile = {
    name: LISTING_DURATION_NAME,
    asOf: input.asOf,
    seriesStart: SERIES_START,
    knownGaps: KNOWN_GAPS.map((gap) => ({ from: gap.from, to: gap.to })),
    minForMedian: MIN_FOR_MEDIAN,
    refresh: REFRESH_NOTE,
    coverage: {
      refsInLedger: spans.size + liveFromAddedOnly,
      live: coast.live,
      liveMeasured: coast.liveMeasured,
      liveLeftCensored: coast.liveLeftCensored,
      liveFromAddedOnly,
      exits: coast.exits,
      exitsMeasured: coast.exitsMeasured,
      exitsInGap: coast.exitsInGap,
      exitsStillListed,
      exitsUnmeasured: coast.exits - coast.exitsMeasured,
      towns: new Set(liveRows.map((row) => row.live!.town).concat(exitRows.map((row) => row.exit!.town))).size,
      regions: new Set(liveRows.map((row) => row.live!.region).concat(exitRows.map((row) => row.exit!.region))).size,
    },
    coast,
    regions: regionRows,
    towns: townRows,
    methodology: [...Object.values(DURATION_PLAIN)],
  };
  const leak = findForbiddenKey(file);
  if (leak) throw new Error(`public listing-duration payload leaked ${leak}`);
  if (!file.knownGaps.some((gap) => gap.from === '2026-10-14' && gap.to === '2026-10-20')) {
    throw new Error('listing duration file is missing the 2026-10-14 to 2026-10-20 gap');
  }
  return file;
}

export function listingDurationPath(): string {
  return join(process.cwd(), 'data', 'listing-duration.json');
}

export function canonicalListingDurationJson(file: ListingDurationFile): string {
  return `${JSON.stringify(file, null, 2)}\n`;
}

function isGroup(value: unknown): value is DurationGroup {
  if (!value || typeof value !== 'object') return false;
  const row = value as Partial<DurationGroup>;
  return typeof row.key === 'string'
    && typeof row.label === 'string'
    && typeof row.live === 'number'
    && typeof row.exits === 'number'
    && typeof row.exitsInGap === 'number'
    && (row.medianDaysListed === null || typeof row.medianDaysListed === 'number')
    && (row.medianExitDays === null || typeof row.medianExitDays === 'number');
}

export function assertListingDurationFile(value: unknown): asserts value is ListingDurationFile {
  if (!value || typeof value !== 'object') throw new Error('data/listing-duration.json is not a listing-duration file');
  const file = value as Partial<ListingDurationFile>;
  if (file.name !== LISTING_DURATION_NAME) throw new Error('data/listing-duration.json is not a listing-duration file');
  if (file.seriesStart !== SERIES_START) throw new Error(`listing duration seriesStart is not ${SERIES_START}`);
  if (typeof file.asOf !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(file.asOf)) throw new Error('listing duration asOf is missing');
  if (!Array.isArray(file.knownGaps) || !file.knownGaps.some((gap) => gap.from === '2026-10-14' && gap.to === '2026-10-20')) {
    throw new Error('listing duration file is missing the 2026-10-14 to 2026-10-20 gap');
  }
  if (!isGroup(file.coast)) throw new Error('listing duration file has no coast row');
  if (!Array.isArray(file.regions) || !file.regions.every(isGroup)) throw new Error('listing duration file has no region rows');
  if (!Array.isArray(file.towns) || !file.towns.every(isGroup)) throw new Error('listing duration file has no town rows');
  if (!Array.isArray(file.methodology)) throw new Error('listing duration file is missing methodology');
  const leak = findForbiddenKey(file);
  if (leak) throw new Error(`listing duration file contains ${leak}`);
  const text = JSON.stringify(file.methodology);
  if (!text.includes('Days to sell are not estimated')) throw new Error('listing duration file does not refuse days to sell');
  if (!text.includes('not a confirmed sale') && !text.includes('never observes a confirmed sale')) {
    throw new Error('listing duration file does not say an exit is not a sale');
  }
}

export function readListingDuration(path = listingDurationPath()): ListingDurationFile {
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
  assertListingDurationFile(parsed);
  return parsed;
}

export function parseLevel(level: string | null): ListingDurationLevel | null {
  if (!level) return null;
  if ((LISTING_DURATION_LEVELS as readonly string[]).includes(level)) return level as ListingDurationLevel;
  throw new Error('level must be coast, region or town');
}

export function forLevel(file: ListingDurationFile, level: string | null) {
  const parsed = parseLevel(level);
  if (!parsed) return file;
  const base = {
    name: file.name,
    asOf: file.asOf,
    seriesStart: file.seriesStart,
    knownGaps: file.knownGaps,
    minForMedian: file.minForMedian,
    refresh: file.refresh,
    coverage: file.coverage,
    methodology: file.methodology,
    level: parsed,
  };
  if (parsed === 'coast') return { ...base, coast: file.coast };
  if (parsed === 'region') return { ...base, regions: file.regions };
  return { ...base, towns: file.towns };
}

export const DURATION_COLUMNS = [
  'key',
  'label',
  'region',
  'live',
  'liveMeasured',
  'liveLeftCensored',
  'liveArrivedInSeries',
  'medianDaysListed',
  'medianDaysListedArrivedInSeries',
  'exits',
  'exitsMeasured',
  'exitsInGap',
  'exitsStillListed',
  'medianExitDays',
] as const satisfies readonly (keyof DurationGroup)[];

function csvCell(value: unknown): string {
  if (value == null) return '';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function groupsToCsv(rows: DurationGroup[]): string {
  return [DURATION_COLUMNS.join(','), ...rows.map((row) => DURATION_COLUMNS.map((column) => csvCell(row[column])).join(','))].join('\n') + '\n';
}

export function csvForLevel(file: ListingDurationFile, level: string | null): { filename: string; body: string } {
  const parsed = parseLevel(level) ?? 'town';
  const rows = parsed === 'coast' ? [file.coast] : parsed === 'region' ? file.regions : file.towns;
  return { filename: `avena-listing-duration-${parsed}.csv`, body: groupsToCsv(rows) };
}
