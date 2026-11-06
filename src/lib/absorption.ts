/**
 * Public listing-absorption snapshot.
 *
 * The paid Sell-Through Monitor (src/lib/sellthrough.ts) computes project
 * rows and a project watchlist. This module keeps the same GroupStats — coast,
 * region, town — and drops every project row, listing reference and watchlist.
 * An exit stays a delisting. Days to sell are not estimated.
 *
 * Pure aside from readAbsorption, which reads the committed file.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  KNOWN_GAPS,
  METHODOLOGY,
  SERIES_START,
  addDays,
  type GroupStats,
  type MonitorResult,
  type WeekStats,
} from './sellthrough';

/** Below this, the book is too thin to publish as the coast. The report script uses the same floor. */
export const MIN_PUBLISHED_LISTINGS = 500;

export const ABSORPTION_LEVELS = ['coast', 'region', 'town'] as const;
export type AbsorptionLevel = (typeof ABSORPTION_LEVELS)[number];

/**
 * Plain-language definitions. The page and the committed JSON share these
 * sentences so the file cannot claim a sale the page has disowned.
 */
export const ABSORPTION_PLAIN = {
  listing:
    'A listing is one reference in the captured feed. On a new-build that is often a unit type inside a development, not one dwelling. The counts are listing counts.',
  exit:
    'An exit is a delisting. The reference was in an earlier snapshot and is absent from the latest one. It may have sold out, or it may have been withdrawn. The feed does not say which, so an exit is not a confirmed sale.',
  price:
    'A cut or a rise is a change in the asking price between two snapshots. These are asking prices. No transaction price is claimed.',
  gap:
    'The trusted daily series starts on 5 August 2026. There is no snapshot from 14 October 2026 through 20 October 2026. A listing last seen on 13 October and absent on 21 October left on an unknown day inside that gap. It is counted as an exit, and the gap is marked. The missing days are not filled in.',
  days:
    'Days to sell are not estimated. Median days listed is how long a listing that is still in the latest snapshot has been seen, from the first day it was observed. Listings older than the series are understated. An exit has no sale date.',
  scope:
    'This file is coast, region and town only. It has no project rows and no listing references.',
} as const;

export const ABSORPTION_NAME = 'Avena listing absorption';

export const ABSORPTION_METHOD = [
  ABSORPTION_PLAIN.listing,
  ABSORPTION_PLAIN.exit,
  ABSORPTION_PLAIN.price,
  ABSORPTION_PLAIN.gap,
  ABSORPTION_PLAIN.days,
  ABSORPTION_PLAIN.scope,
].join(' ');

export interface AbsorptionCoverage {
  listingsObserved: number;
  live: number;
  /** Count of development references. Names are not in this file. */
  developments: number;
  towns: number;
  exitsSinceStart: number;
  exitsInGap: number;
  priceMovesSinceStart: number;
}

export interface AbsorptionFile {
  name: string;
  asOf: string;
  windowDays: number;
  windowStart: string;
  seriesStart: string;
  knownGaps: Array<{ from: string; to: string }>;
  coverage: AbsorptionCoverage;
  coast: GroupStats;
  regions: GroupStats[];
  towns: GroupStats[];
  weekly: WeekStats[];
  methodology: string[];
}

const FORBIDDEN_KEYS = new Set([
  'projects',
  'project',
  'recentCuts',
  'recentExits',
  'ref',
  'refs',
  'dev',
]);

/** Path of the first forbidden key, or null. Project rows must not survive this. */
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

export function weekOverlapsKnownGap(week: string, gaps: ReadonlyArray<{ from: string; to: string }> = KNOWN_GAPS): boolean {
  const end = addDays(week, 6);
  return gaps.some((gap) => gap.from <= end && gap.to >= week);
}

export function publicFromMonitor(result: MonitorResult): AbsorptionFile {
  const file: AbsorptionFile = {
    name: ABSORPTION_NAME,
    asOf: result.asOf,
    windowDays: result.windowDays,
    windowStart: result.windowStart,
    seriesStart: result.seriesStart,
    knownGaps: result.knownGaps.map((gap) => ({ from: gap.from, to: gap.to })),
    coverage: {
      listingsObserved: result.coverage.listingsObserved,
      live: result.coverage.live,
      developments: result.coverage.projects,
      towns: result.coverage.towns,
      exitsSinceStart: result.coverage.exitsSinceStart,
      exitsInGap: result.coverage.exitsInGap,
      priceMovesSinceStart: result.coverage.priceMovesSinceStart,
    },
    coast: result.market,
    regions: result.regions,
    towns: result.towns,
    weekly: result.weekly,
    methodology: [...Object.values(ABSORPTION_PLAIN), ...METHODOLOGY],
  };
  const leak = findForbiddenKey(file);
  if (leak) throw new Error(`public absorption payload leaked ${leak}`);
  if (file.seriesStart !== SERIES_START) throw new Error(`absorption seriesStart drifted from ${SERIES_START}`);
  if (!file.knownGaps.some((gap) => gap.from === '2026-10-14' && gap.to === '2026-10-20')) {
    throw new Error('absorption file is missing the 2026-10-14 to 2026-10-20 gap');
  }
  return file;
}

export function absorptionPath(): string {
  return join(process.cwd(), 'data', 'absorption.json');
}

export function canonicalAbsorptionJson(file: AbsorptionFile): string {
  return `${JSON.stringify(file, null, 2)}\n`;
}

function isGroup(value: unknown): value is GroupStats {
  if (!value || typeof value !== 'object') return false;
  const row = value as Partial<GroupStats>;
  return typeof row.key === 'string'
    && typeof row.label === 'string'
    && typeof row.live === 'number'
    && typeof row.exitsWindow === 'number'
    && typeof row.exitsSinceStart === 'number'
    && typeof row.newWindow === 'number'
    && typeof row.cutsWindow === 'number'
    && typeof row.risesWindow === 'number';
}

export function assertAbsorptionFile(value: unknown): asserts value is AbsorptionFile {
  if (!value || typeof value !== 'object') throw new Error('data/absorption.json is not an absorption file');
  const file = value as Partial<AbsorptionFile>;
  if (file.name !== ABSORPTION_NAME) throw new Error('data/absorption.json is not an absorption file');
  if (file.seriesStart !== SERIES_START) throw new Error(`absorption seriesStart is not ${SERIES_START}`);
  if (typeof file.asOf !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(file.asOf)) throw new Error('absorption asOf is missing');
  if (!Array.isArray(file.knownGaps) || !file.knownGaps.some((gap) => gap.from === '2026-10-14' && gap.to === '2026-10-20')) {
    throw new Error('absorption file is missing the 2026-10-14 to 2026-10-20 gap');
  }
  if (!isGroup(file.coast)) throw new Error('absorption file has no coast stats');
  if (!Array.isArray(file.regions) || !file.regions.every(isGroup)) throw new Error('absorption file has no region rows');
  if (!Array.isArray(file.towns) || !file.towns.every(isGroup)) throw new Error('absorption file has no town rows');
  if (!Array.isArray(file.weekly) || !Array.isArray(file.methodology)) throw new Error('absorption file is missing weekly flow or methodology');
  const leak = findForbiddenKey(file);
  if (leak) throw new Error(`absorption file contains ${leak}`);
}

export function readAbsorption(path = absorptionPath()): AbsorptionFile {
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
  assertAbsorptionFile(parsed);
  return parsed;
}

export function parseLevel(level: string | null): AbsorptionLevel | null {
  if (!level) return null;
  if ((ABSORPTION_LEVELS as readonly string[]).includes(level)) return level as AbsorptionLevel;
  throw new Error('level must be coast, region or town');
}

export function forLevel(file: AbsorptionFile, level: string | null): AbsorptionFile | (Omit<AbsorptionFile, 'coast' | 'regions' | 'towns' | 'weekly'> & { level: AbsorptionLevel; coast?: GroupStats; regions?: GroupStats[]; towns?: GroupStats[]; weekly?: WeekStats[] }) {
  const parsed = parseLevel(level);
  if (!parsed) return file;
  const base = {
    name: file.name,
    asOf: file.asOf,
    windowDays: file.windowDays,
    windowStart: file.windowStart,
    seriesStart: file.seriesStart,
    knownGaps: file.knownGaps,
    coverage: file.coverage,
    methodology: file.methodology,
    level: parsed,
  };
  if (parsed === 'coast') return { ...base, coast: file.coast, weekly: file.weekly };
  if (parsed === 'region') return { ...base, regions: file.regions };
  return { ...base, towns: file.towns };
}

export const GROUP_COLUMNS = [
  'key',
  'label',
  'region',
  'live',
  'exitsWindow',
  'exitsSinceStart',
  'newWindow',
  'absorptionPct30d',
  'monthsOfSupply',
  'cutsWindow',
  'risesWindow',
  'cutBreadthPct',
  'medianCutPct',
  'medianRisePct',
  'medianPm2',
  'medianDaysListed',
] as const satisfies readonly (keyof GroupStats)[];

function csvCell(value: unknown): string {
  if (value == null) return '';
  const text = Array.isArray(value) ? value.join('|') : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function groupsToCsv(rows: GroupStats[]): string {
  return [GROUP_COLUMNS.join(','), ...rows.map((row) => GROUP_COLUMNS.map((column) => csvCell(row[column])).join(','))].join('\n') + '\n';
}

export function csvForLevel(file: AbsorptionFile, level: string | null): { filename: string; body: string } {
  const parsed = parseLevel(level) ?? 'town';
  const rows = parsed === 'coast' ? [file.coast] : parsed === 'region' ? file.regions : file.towns;
  return { filename: `avena-absorption-${parsed}.csv`, body: groupsToCsv(rows) };
}
