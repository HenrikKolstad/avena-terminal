/**
 * Weekly bulk snapshots of the town and province vintages already published
 * in data/vintages. One gzipped CSV per frozen week, written once.
 *
 * This module only reads vintage files. It does not freeze a week, and it
 * does not rewrite a vintage. A week with no frozen file is listed and left
 * empty. Listing-level books and lender-gated series are not part of the file.
 */

import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { gzipSync, gunzipSync, type ZlibOptions } from 'zlib';
import {
  sha256Hex,
  type ManifestVintage,
  type VintageBookTotals,
  type VintageFile,
  type VintageManifest,
  type VintageRow,
} from '@/lib/vintages';

export const BULK_SCHEMA_VERSION = 1 as const;
export const BULK_FILE_NAME = 'town-province.csv.gz' as const;
export const BULK_INDEX_PATH = 'data/bulk/index.json';
export const BULK_CHANGELOG_PATH = 'data/bulk/schema-changelog.json';

export const BULK_COLUMNS = [
  'vintage_date',
  'iso_week',
  'week_start',
  'week_end',
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
] as const;

export type BulkColumn = (typeof BULK_COLUMNS)[number];

const ROW_COLUMNS: Array<keyof VintageRow> = [
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

export const COLUMN_DEFINITIONS: Record<BulkColumn, string> = {
  vintage_date: 'Capture date of the frozen vintage: the last eligible public/data.json commit in that closed ISO week. Repeated on every row so weeks can be concatenated.',
  iso_week: 'ISO week of the capture date, Monday to Sunday, UTC.',
  week_start: 'Monday of that ISO week, UTC.',
  week_end: 'Sunday of that ISO week, UTC.',
  level: 'province or town. Copied from the vintage row.',
  key: 'Province key or town name, copied from the vintage row.',
  name: 'Display name, copied from the vintage row.',
  province: 'Province name on a town row. Empty on a province row. Copied from the vintage row.',
  costa: 'Costa label, copied from the vintage row. Empty when the vintage left it empty.',
  live_listings: 'Listings in that place on the capture date. A listing is one feed reference, not one dwelling.',
  priced_listings: 'Listings in that place with a positive asking EUR per square metre.',
  median_asking_eur_m2: 'Median asking EUR per square metre, copied from the vintage row. Empty when the vintage published no median. No value is filled in from another day.',
  comparable_listings: 'Same ref and same place with a positive asking price in this vintage and the previous one. Empty when there is no previous vintage.',
  price_cuts: 'Comparable listings with a lower asking price on the capture date. Empty when there is no previous vintage.',
  price_rises: 'Comparable listings with a higher asking price on the capture date. Empty when there is no previous vintage.',
  price_cut_share: 'price_cuts divided by comparable listings, the decimal string already on the vintage row. Empty when the vintage left it empty.',
  price_rise_share: 'price_rises divided by the same comparable count, the decimal string already on the vintage row. Empty when the vintage left it empty.',
  new_listings: 'A ref in this place on the capture date that was not in the previous book. Empty when there is no previous vintage.',
  removed_listings: 'A ref that was in this place in the previous vintage and is absent from the whole book on the capture date. Leaving the book is not a recorded sale. Empty when there is no previous vintage.',
  reassigned_in: 'A ref present in both books that moved into this place. Empty when there is no previous vintage.',
  reassigned_out: 'A ref present in both books that moved out of this place. Empty when there is no previous vintage.',
};

export const BULK_GUARANTEE =
  'Each bundle is the town and province rows of one frozen vintage, written once as gzipped CSV. The SHA-256 is of those gzip bytes. The source is the vintage file and the capture dates recorded on it. A later run keeps a bundle whose row text still matches that vintage, including its gzip bytes and checksum. A week with no frozen file is listed and left empty. Nothing is interpolated.';

export const BULK_CADENCE =
  'GitHub Actions bulk-refresh.yml on Monday at 07:20 UTC, after the 06:20 UTC vintage freeze. Also workflow_dispatch. The job reads frozen vintage files. It does not freeze a week and it does not rewrite a bundle.';

export const BULK_NOT_INCLUDED = [
  'These files are the town and province rows already published as weekly vintages. They are not a listing-level extract.',
  'Listing descriptions, images, URLs and developer names are not in these files.',
  'Lender-gated series, including the sell-through monitor, are not in these files.',
  'Schema 1 is gzipped CSV. Parquet is not generated.',
] as const;

export const BULK_LICENSE = 'https://creativecommons.org/licenses/by/4.0/';
export const BULK_LICENSE_NOTE =
  'The open observation files are CC BY 4.0. These files are aggregates of that book.';

const GENERATED_AT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const SHA256 = /^[0-9a-f]{64}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function isGeneratedAt(value: string): boolean {
  if (!GENERATED_AT.test(value)) return false;
  return new Date(value).toISOString() === value;
}

export function sha256Buffer(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export function gzipCsv(csv: string): Buffer {
  const options: ZlibOptions = { level: 9 };
  // Pin the gzip header clock so the same CSV always has the same SHA-256.
  Object.assign(options, { mtime: 0 });
  return gzipSync(Buffer.from(csv, 'utf8'), options);
}

export function gunzipCsv(bytes: Buffer): string {
  return gunzipSync(bytes).toString('utf8');
}

function canonicalJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function csvCell(value: unknown, where: string): string {
  if (value == null) return '';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`${where} is not a finite number`);
    return String(value);
  }
  if (typeof value !== 'string') throw new Error(`${where} is not text or a number`);
  if (/[\n\r]/.test(value)) throw new Error(`${where} contains a line break`);
  return /[",]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function vintageToBulkCsv(file: VintageFile): string {
  const head = BULK_COLUMNS.join(',');
  const lines = file.rows.map((row, index) => {
    const identity = [file.vintage_date, file.iso_week, file.week_start, file.week_end];
    const rest = ROW_COLUMNS.map((col) => csvCell(row[col], `${file.vintage_date} row ${index + 1} ${col}`));
    return [...identity, ...rest].join(',');
  });
  return `${head}\n${lines.join('\n')}\n`;
}

export interface SchemaColumn {
  name: BulkColumn;
  description: string;
}

export interface SchemaChange {
  schema_version: 1;
  effective: string;
  format: 'csv.gz';
  summary: string;
  columns: SchemaColumn[];
}

export interface SchemaChangelog {
  schema_version: 1;
  changes: SchemaChange[];
}

export function schemaChangelog(): SchemaChangelog {
  return {
    schema_version: 1,
    changes: [
      {
        schema_version: 1,
        effective: '2026-11-10',
        format: 'csv.gz',
        summary:
          'First published bulk schema. One gzipped CSV per frozen vintage week. Columns are the town and province rows already in that vintage, with the capture date and ISO week repeated on each row. An empty cell is a null on the vintage row. A week with no frozen vintage has no file. Parquet is not part of schema 1.',
        columns: BULK_COLUMNS.map((name) => ({ name, description: COLUMN_DEFINITIONS[name] })),
      },
    ],
  };
}

export interface BulkFileRecord {
  name: typeof BULK_FILE_NAME;
  format: 'csv.gz';
  sha256: string;
  bytes: number;
  uncompressed_sha256: string;
  uncompressed_bytes: number;
  row_count: number;
  schema_version: 1;
}

export interface BulkWeekManifest {
  schema_version: 1;
  generated_at: string;
  vintage_date: string;
  iso_week: string;
  week_start: string;
  week_end: string;
  source_capture_dates: string[];
  gap_dates_in_week: string[];
  missing_days_since_compared_to: string[] | null;
  overlaps_declared_capture_gap: boolean;
  compared_to: string | null;
  capture_commit: string;
  series_start: string;
  town_min_listings: number;
  vintage_file: string;
  vintage_sha256: string;
  row_count: number;
  book: VintageBookTotals;
  columns: BulkColumn[];
  files: BulkFileRecord[];
}

export interface BulkBundleFile extends BulkFileRecord {
  path: string;
}

export interface BulkBundle {
  iso_week: string;
  week_start: string;
  week_end: string;
  status: 'frozen' | 'gap';
  vintage_date: string | null;
  row_count: number | null;
  generated_at: string | null;
  source_capture_dates: string[];
  gap_dates_in_week: string[];
  missing_days_since_compared_to: string[] | null;
  overlaps_declared_capture_gap: boolean;
  vintage_sha256: string | null;
  reason: string | null;
  manifest_path: string | null;
  manifest_sha256: string | null;
  files: BulkBundleFile[] | null;
}

export interface BulkIndex {
  schema_version: 1;
  series_start: string;
  generated_at: string;
  cadence: string;
  format: 'csv.gz';
  parquet: null;
  page: '/data/bulk';
  schema_changelog: typeof BULK_CHANGELOG_PATH;
  guarantee: string;
  not_included: string[];
  license: string;
  license_note: string;
  known_gaps: Array<{ from: string; to: string }>;
  missing_capture_dates: string[];
  bundles: BulkBundle[];
}

export interface BulkWrite {
  path: string;
  body: Buffer;
}

export interface BulkDecision {
  writes: BulkWrite[];
  errors: string[];
  index: BulkIndex;
}

export interface PublicBulkBundle extends BulkBundle {
  download_csv_gz: string | null;
  download_manifest: string | null;
}

export interface PublicBulkIndex extends Omit<BulkIndex, 'bundles'> {
  schema_changelog_url: '/api/v1/bulk/schema';
  bundles: PublicBulkBundle[];
}

function weekPaths(date: string): { gz: string; manifest: string } {
  return {
    gz: `data/bulk/weeks/${date}/${BULK_FILE_NAME}`,
    manifest: `data/bulk/weeks/${date}/manifest.json`,
  };
}

function sameStrings(a: string[] | null, b: string[] | null): boolean {
  if (a == null || b == null) return a === b;
  return a.length === b.length && a.every((item, i) => item === b[i]);
}

function isSha256(value: unknown): value is string {
  return typeof value === 'string' && SHA256.test(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function fileRecord(gz: Buffer, csv: string, rowCount: number): BulkFileRecord {
  return {
    name: BULK_FILE_NAME,
    format: 'csv.gz',
    sha256: sha256Buffer(gz),
    bytes: gz.length,
    uncompressed_sha256: sha256Hex(csv),
    uncompressed_bytes: Buffer.byteLength(csv, 'utf8'),
    row_count: rowCount,
    schema_version: 1,
  };
}

function buildManifest(file: VintageFile, week: ManifestVintage, gz: Buffer, csv: string, generatedAt: string): BulkWeekManifest {
  return {
    schema_version: 1,
    generated_at: generatedAt,
    vintage_date: file.vintage_date,
    iso_week: file.iso_week,
    week_start: file.week_start,
    week_end: file.week_end,
    source_capture_dates: [...file.capture_dates_in_week],
    gap_dates_in_week: [...file.gap_dates_in_week],
    missing_days_since_compared_to: file.missing_days_since_compared_to ? [...file.missing_days_since_compared_to] : null,
    overlaps_declared_capture_gap: file.overlaps_declared_capture_gap,
    compared_to: file.compared_to,
    capture_commit: file.capture_commit,
    series_start: file.series_start,
    town_min_listings: file.town_min_listings,
    vintage_file: `data/vintages/${file.vintage_date}.json`,
    vintage_sha256: week.sha256 ?? '',
    row_count: file.rows.length,
    book: file.book,
    columns: [...BULK_COLUMNS],
    files: [fileRecord(gz, csv, file.rows.length)],
  };
}

function bundleFromManifest(manifest: BulkWeekManifest, manifestBytes: Buffer): BulkBundle {
  const file = manifest.files[0];
  const paths = weekPaths(manifest.vintage_date);
  return {
    iso_week: manifest.iso_week,
    week_start: manifest.week_start,
    week_end: manifest.week_end,
    status: 'frozen',
    vintage_date: manifest.vintage_date,
    row_count: manifest.row_count,
    generated_at: manifest.generated_at,
    source_capture_dates: [...manifest.source_capture_dates],
    gap_dates_in_week: [...manifest.gap_dates_in_week],
    missing_days_since_compared_to: manifest.missing_days_since_compared_to ? [...manifest.missing_days_since_compared_to] : null,
    overlaps_declared_capture_gap: manifest.overlaps_declared_capture_gap,
    vintage_sha256: manifest.vintage_sha256,
    reason: null,
    manifest_path: paths.manifest,
    manifest_sha256: sha256Buffer(manifestBytes),
    files: [{ ...file, path: paths.gz }],
  };
}

function gapBundle(week: ManifestVintage): BulkBundle {
  return {
    iso_week: week.iso_week,
    week_start: week.week_start,
    week_end: week.week_end,
    status: 'gap',
    vintage_date: null,
    row_count: null,
    generated_at: null,
    source_capture_dates: [],
    gap_dates_in_week: [...week.gap_dates_in_week],
    missing_days_since_compared_to: null,
    overlaps_declared_capture_gap: week.overlaps_declared_capture_gap,
    vintage_sha256: null,
    reason: week.reason,
    manifest_path: null,
    manifest_sha256: null,
    files: null,
  };
}

function indexShell(manifest: VintageManifest, generatedAt: string, bundles: BulkBundle[]): BulkIndex {
  return {
    schema_version: 1,
    series_start: manifest.series_start,
    generated_at: generatedAt,
    cadence: BULK_CADENCE,
    format: 'csv.gz',
    parquet: null,
    page: '/data/bulk',
    schema_changelog: BULK_CHANGELOG_PATH,
    guarantee: BULK_GUARANTEE,
    not_included: [...BULK_NOT_INCLUDED],
    license: BULK_LICENSE,
    license_note: BULK_LICENSE_NOTE,
    known_gaps: manifest.known_gaps.map((gap) => ({ from: gap.from, to: gap.to })),
    missing_capture_dates: [...manifest.missing_capture_dates],
    bundles,
  };
}

function comparableIndex(index: BulkIndex): string {
  const { generated_at: _generatedAt, ...rest } = index;
  return canonicalJson(rest);
}

function parseKeptManifest(bytes: Buffer, week: ManifestVintage, gz: Buffer, csv: string): { ok: true; manifest: BulkWeekManifest } | { ok: false; error: string } {
  let parsed: BulkWeekManifest;
  try {
    parsed = JSON.parse(bytes.toString('utf8')) as BulkWeekManifest;
  } catch {
    return { ok: false, error: `bulk manifest for ${week.vintage_date} is not JSON` };
  }
  const file = parsed.files?.[0];
  const record = fileRecord(gz, csv, week.row_count ?? -1);
  const date = week.vintage_date ?? '(missing)';
  if (parsed.schema_version !== 1) return { ok: false, error: `bulk manifest for ${date} is not schema 1` };
  if (parsed.vintage_date !== week.vintage_date) return { ok: false, error: `bulk manifest for ${date} names another capture` };
  if (parsed.vintage_sha256 !== week.sha256) return { ok: false, error: `bulk manifest for ${date} does not match the vintage hash` };
  if (parsed.row_count !== week.row_count) return { ok: false, error: `bulk manifest for ${date} row count differs` };
  if (!file || file.name !== BULK_FILE_NAME || file.format !== 'csv.gz' || file.schema_version !== 1) {
    return { ok: false, error: `bulk manifest for ${date} does not name ${BULK_FILE_NAME}` };
  }
  if (file.sha256 !== record.sha256 || file.bytes !== record.bytes) {
    return { ok: false, error: `bulk manifest for ${date} checksum does not match the gzip file` };
  }
  if (file.uncompressed_sha256 !== record.uncompressed_sha256 || file.uncompressed_bytes !== record.uncompressed_bytes) {
    return { ok: false, error: `bulk manifest for ${date} uncompressed checksum does not match the vintage rows` };
  }
  if (file.row_count !== week.row_count) return { ok: false, error: `bulk file for ${date} row count differs` };
  if (!isGeneratedAt(parsed.generated_at)) return { ok: false, error: `bulk manifest for ${date} has no generation time` };
  if (!sameStrings(parsed.source_capture_dates, week.capture_dates_in_week)) {
    return { ok: false, error: `bulk manifest for ${date} capture dates differ` };
  }
  if (!sameStrings(parsed.gap_dates_in_week, week.gap_dates_in_week)) {
    return { ok: false, error: `bulk manifest for ${date} gap dates differ` };
  }
  if (!sameStrings(parsed.columns, [...BULK_COLUMNS])) return { ok: false, error: `bulk manifest for ${date} columns differ from schema 1` };
  return { ok: true, manifest: parsed };
}

function vintageAgrees(file: VintageFile, week: ManifestVintage, seriesStart: string): string | null {
  if (file.schema_version !== 1) return `${week.vintage_date} vintage schema is not 1`;
  if (file.vintage_date !== week.vintage_date) return `${week.vintage_date} vintage date does not match the manifest`;
  if (file.iso_week !== week.iso_week || file.week_start !== week.week_start || file.week_end !== week.week_end) {
    return `${week.vintage_date} vintage week does not match the manifest`;
  }
  if (file.rows.length !== week.row_count) return `${week.vintage_date} vintage row count does not match the manifest`;
  if (!file.rows.length) return `${week.vintage_date} vintage has no rows`;
  if (file.capture_commit !== week.capture_commit) return `${week.vintage_date} capture commit does not match the manifest`;
  if (file.compared_to !== week.compared_to) return `${week.vintage_date} comparison date does not match the manifest`;
  if (file.series_start !== seriesStart) return `${week.vintage_date} series start differs`;
  if (!sameStrings(file.capture_dates_in_week, week.capture_dates_in_week)) return `${week.vintage_date} capture dates do not match the manifest`;
  if (!sameStrings(file.gap_dates_in_week, week.gap_dates_in_week)) return `${week.vintage_date} gap dates do not match the manifest`;
  if (!sameStrings(file.missing_days_since_compared_to, week.missing_days_since_compared_to)) {
    return `${week.vintage_date} comparison gap differs`;
  }
  if (file.overlaps_declared_capture_gap !== week.overlaps_declared_capture_gap) {
    return `${week.vintage_date} declared-gap overlap differs`;
  }
  return null;
}

function loadVintage(week: ManifestVintage, bodies: Map<string, string>, seriesStart: string): { file: VintageFile; body: string } | { error: string } {
  if (week.status !== 'frozen' || !week.vintage_date || !week.sha256 || !week.file || week.row_count == null) {
    return { error: `frozen week ${week.iso_week} is incomplete` };
  }
  if (week.file !== `data/vintages/${week.vintage_date}.json`) {
    return { error: `frozen week ${week.iso_week} file path is not the vintage date` };
  }
  const body = bodies.get(week.vintage_date);
  if (body == null) return { error: `missing vintage file for ${week.vintage_date}` };
  if (sha256Hex(body) !== week.sha256) return { error: `vintage ${week.vintage_date} does not match the manifest hash — refusing to publish it` };
  let file: VintageFile;
  try {
    file = JSON.parse(body) as VintageFile;
  } catch {
    return { error: `vintage ${week.vintage_date} is not JSON` };
  }
  const disagree = vintageAgrees(file, week, seriesStart);
  if (disagree) return { error: disagree };
  if (typeof file.town_min_listings !== 'number' || !file.book) {
    return { error: `vintage ${week.vintage_date} is missing its book` };
  }
  return { file, body };
}

export function decideBulk(args: {
  manifest: VintageManifest;
  bodies: Map<string, string>;
  existing: Map<string, Buffer>;
  generatedAt: string;
}): BulkDecision {
  const errors: string[] = [];
  const writes: BulkWrite[] = [];
  if (!isGeneratedAt(args.generatedAt)) errors.push('generated_at is not a UTC timestamp');

  const seenWeeks = new Set<string>();
  const seenDates = new Set<string>();
  for (const week of args.manifest.vintages) {
    if (seenWeeks.has(week.iso_week)) errors.push(`duplicate vintage week ${week.iso_week}`);
    seenWeeks.add(week.iso_week);
    if (week.vintage_date) {
      if (seenDates.has(week.vintage_date)) errors.push(`duplicate vintage date ${week.vintage_date}`);
      seenDates.add(week.vintage_date);
    }
  }

  const bundles: BulkBundle[] = [];
  const allowed = new Set<string>([BULK_INDEX_PATH, BULK_CHANGELOG_PATH]);

  for (const week of args.manifest.vintages) {
    if (week.status === 'gap') {
      const paths = week.vintage_date ? weekPaths(week.vintage_date) : null;
      if (paths && (args.existing.has(paths.gz) || args.existing.has(paths.manifest))) {
        errors.push(`gap week ${week.iso_week} has a bulk file`);
      }
      bundles.push(gapBundle(week));
      continue;
    }

    const loaded = loadVintage(week, args.bodies, args.manifest.series_start);
    if ('error' in loaded) {
      errors.push(loaded.error);
      continue;
    }
    const date = week.vintage_date as string;
    const paths = weekPaths(date);
    allowed.add(paths.gz);
    allowed.add(paths.manifest);

    let csv: string;
    try {
      csv = vintageToBulkCsv(loaded.file);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : `could not write CSV for ${date}`);
      continue;
    }
    const dataLines = csv.trimEnd().split('\n');
    if (dataLines.length !== loaded.file.rows.length + 1) {
      errors.push(`${date} CSV row count does not match the vintage`);
      continue;
    }

    const haveGz = args.existing.get(paths.gz);
    const haveManifest = args.existing.get(paths.manifest);
    if (haveGz && haveManifest) {
      let decoded = '';
      try {
        decoded = gunzipCsv(haveGz);
      } catch {
        errors.push(`refusing to replace ${paths.gz}: the existing file is not gzip`);
        continue;
      }
      if (decoded !== csv) {
        errors.push(`refusing to replace ${paths.gz}: the vintage rows would change the published file`);
        continue;
      }
      const kept = parseKeptManifest(haveManifest, week, haveGz, csv);
      if (!kept.ok) {
        errors.push(`refusing to replace ${paths.manifest}: ${kept.error}`);
        continue;
      }
      bundles.push(bundleFromManifest(kept.manifest, haveManifest));
      continue;
    }
    if (haveGz || haveManifest) {
      errors.push(`refusing partial bulk bundle for ${date}`);
      continue;
    }

    const gz = gzipCsv(csv);
    const manifest = buildManifest(loaded.file, week, gz, csv, args.generatedAt);
    const manifestBytes = Buffer.from(canonicalJson(manifest), 'utf8');
    writes.push({ path: paths.gz, body: gz });
    writes.push({ path: paths.manifest, body: manifestBytes });
    bundles.push(bundleFromManifest(manifest, manifestBytes));
  }

  for (const path of args.existing.keys()) {
    if (!allowed.has(path)) errors.push(`refusing unexpected bulk file ${path}`);
  }

  const changelogBytes = Buffer.from(canonicalJson(schemaChangelog()), 'utf8');
  const haveLog = args.existing.get(BULK_CHANGELOG_PATH);
  if (!haveLog) writes.push({ path: BULK_CHANGELOG_PATH, body: changelogBytes });
  else if (!haveLog.equals(changelogBytes)) errors.push(`refusing to replace ${BULK_CHANGELOG_PATH}`);

  let index = indexShell(args.manifest, args.generatedAt, bundles);
  const indexBytes = Buffer.from(canonicalJson(index), 'utf8');
  const haveIndex = args.existing.get(BULK_INDEX_PATH);
  if (haveIndex) {
    let previous: BulkIndex;
    try {
      previous = parseBulkIndex(JSON.parse(haveIndex.toString('utf8')));
    } catch (err) {
      errors.push(err instanceof Error ? err.message : 'bulk index could not be read');
      previous = index;
    }
    if (previous.schema_version !== 1 || previous.series_start !== args.manifest.series_start) {
      errors.push('refusing to replace the bulk index: schema or series start differs');
    }
    const previousFrozen = new Map(previous.bundles.filter((row) => row.status === 'frozen' && row.vintage_date).map((row) => [row.vintage_date as string, row]));
    for (const [date, prior] of previousFrozen) {
      const next = bundles.find((row) => row.vintage_date === date);
      const priorSha = prior.files?.[0]?.sha256 ?? null;
      const nextSha = next?.files?.[0]?.sha256 ?? null;
      if (!next || next.status !== 'frozen' || priorSha !== nextSha || prior.manifest_sha256 !== next.manifest_sha256) {
        errors.push(`refusing to replace bulk bundle ${date}`);
      }
    }
    if (comparableIndex(previous) === comparableIndex(index)) {
      index = previous;
    } else if (!errors.length) {
      writes.push({ path: BULK_INDEX_PATH, body: indexBytes });
    }
  } else if (!errors.length) {
    writes.push({ path: BULK_INDEX_PATH, body: indexBytes });
  }

  if (errors.length) return { writes: [], errors, index };
  return { writes, errors, index };
}

function parseFileRecord(raw: unknown, where: string): BulkFileRecord {
  if (!raw || typeof raw !== 'object') throw new Error(`${where} file record is missing`);
  const file = raw as BulkFileRecord;
  if (file.name !== BULK_FILE_NAME || file.format !== 'csv.gz' || file.schema_version !== 1) {
    throw new Error(`${where} file record is not ${BULK_FILE_NAME}`);
  }
  if (!isSha256(file.sha256) || !isSha256(file.uncompressed_sha256)) throw new Error(`${where} checksum is not SHA-256`);
  if (!Number.isInteger(file.bytes) || file.bytes < 0 || !Number.isInteger(file.uncompressed_bytes) || file.uncompressed_bytes < 0) {
    throw new Error(`${where} byte length is not a count`);
  }
  if (!Number.isInteger(file.row_count) || file.row_count < 1) throw new Error(`${where} row count is not a positive count`);
  return {
    name: BULK_FILE_NAME,
    format: 'csv.gz',
    sha256: file.sha256,
    bytes: file.bytes,
    uncompressed_sha256: file.uncompressed_sha256,
    uncompressed_bytes: file.uncompressed_bytes,
    row_count: file.row_count,
    schema_version: 1,
  };
}

function parseBundle(raw: unknown): BulkBundle {
  if (!raw || typeof raw !== 'object') throw new Error('bulk index bundle is not an object');
  const row = raw as BulkBundle;
  if (row.status !== 'frozen' && row.status !== 'gap') throw new Error(`bulk index status is not frozen or gap: ${String(row.status)}`);
  if (typeof row.iso_week !== 'string' || !DAY.test(row.week_start) || !DAY.test(row.week_end)) {
    throw new Error('bulk index bundle has no week');
  }
  if (!isStringArray(row.source_capture_dates) || !isStringArray(row.gap_dates_in_week)) {
    throw new Error(`bulk index week ${row.iso_week} has no date lists`);
  }
  if (row.missing_days_since_compared_to != null && !isStringArray(row.missing_days_since_compared_to)) {
    throw new Error(`bulk index week ${row.iso_week} has a bad comparison gap list`);
  }
  if (row.status === 'gap') {
    if (row.vintage_date != null || row.row_count != null || row.files != null || row.manifest_sha256 != null || row.vintage_sha256 != null) {
      throw new Error(`gap week ${row.iso_week} records a file`);
    }
    return {
      iso_week: row.iso_week,
      week_start: row.week_start,
      week_end: row.week_end,
      status: 'gap',
      vintage_date: null,
      row_count: null,
      generated_at: null,
      source_capture_dates: [],
      gap_dates_in_week: [...row.gap_dates_in_week],
      missing_days_since_compared_to: null,
      overlaps_declared_capture_gap: row.overlaps_declared_capture_gap === true,
      vintage_sha256: null,
      reason: typeof row.reason === 'string' ? row.reason : null,
      manifest_path: null,
      manifest_sha256: null,
      files: null,
    };
  }
  if (!row.vintage_date || !DAY.test(row.vintage_date) || !Number.isInteger(row.row_count) || !isGeneratedAt(row.generated_at ?? '')) {
    throw new Error(`frozen bundle ${row.iso_week} is incomplete`);
  }
  if (!isSha256(row.vintage_sha256) || !isSha256(row.manifest_sha256) || row.manifest_path !== weekPaths(row.vintage_date).manifest) {
    throw new Error(`frozen bundle ${row.vintage_date} checksum is incomplete`);
  }
  if (!Array.isArray(row.files) || row.files.length !== 1) throw new Error(`frozen bundle ${row.vintage_date} has no file`);
  const file = parseFileRecord(row.files[0], row.vintage_date);
  if (file.row_count !== row.row_count) throw new Error(`frozen bundle ${row.vintage_date} row counts disagree`);
  const path = (row.files[0] as BulkBundleFile).path;
  if (path !== weekPaths(row.vintage_date).gz) throw new Error(`frozen bundle ${row.vintage_date} file path differs`);
  return {
    iso_week: row.iso_week,
    week_start: row.week_start,
    week_end: row.week_end,
    status: 'frozen',
    vintage_date: row.vintage_date,
    row_count: row.row_count,
    generated_at: row.generated_at,
    source_capture_dates: [...row.source_capture_dates],
    gap_dates_in_week: [...row.gap_dates_in_week],
    missing_days_since_compared_to: row.missing_days_since_compared_to ? [...row.missing_days_since_compared_to] : null,
    overlaps_declared_capture_gap: row.overlaps_declared_capture_gap === true,
    vintage_sha256: row.vintage_sha256,
    reason: null,
    manifest_path: row.manifest_path,
    manifest_sha256: row.manifest_sha256,
    files: [{ ...file, path }],
  };
}

export function parseBulkIndex(raw: unknown): BulkIndex {
  if (!raw || typeof raw !== 'object') throw new Error('bulk index is not an object');
  const index = raw as BulkIndex;
  if (index.schema_version !== 1) throw new Error('bulk index schema is not 1');
  if (index.format !== 'csv.gz' || index.parquet !== null) throw new Error('bulk index format is not csv.gz');
  if (!isGeneratedAt(index.generated_at)) throw new Error('bulk index has no generation time');
  if (typeof index.series_start !== 'string' || !Array.isArray(index.bundles)) throw new Error('bulk index is missing its bundles');
  if (!isStringArray(index.missing_capture_dates)) throw new Error('bulk index is missing its capture gaps');
  if (index.schema_changelog !== BULK_CHANGELOG_PATH) throw new Error('bulk index schema changelog path differs');
  return {
    schema_version: 1,
    series_start: index.series_start,
    generated_at: index.generated_at,
    cadence: typeof index.cadence === 'string' ? index.cadence : BULK_CADENCE,
    format: 'csv.gz',
    parquet: null,
    page: '/data/bulk',
    schema_changelog: BULK_CHANGELOG_PATH,
    guarantee: typeof index.guarantee === 'string' ? index.guarantee : BULK_GUARANTEE,
    not_included: isStringArray(index.not_included) ? [...index.not_included] : [...BULK_NOT_INCLUDED],
    license: typeof index.license === 'string' ? index.license : BULK_LICENSE,
    license_note: typeof index.license_note === 'string' ? index.license_note : BULK_LICENSE_NOTE,
    known_gaps: Array.isArray(index.known_gaps)
      ? index.known_gaps.map((gap) => {
        if (!gap || typeof gap.from !== 'string' || typeof gap.to !== 'string') throw new Error('bulk index gap is not a pair of dates');
        return { from: gap.from, to: gap.to };
      })
      : [],
    missing_capture_dates: [...index.missing_capture_dates],
    bundles: index.bundles.map(parseBundle),
  };
}

export function parseSchemaChangelog(raw: unknown): SchemaChangelog {
  if (!raw || typeof raw !== 'object') throw new Error('schema changelog is not an object');
  const log = raw as SchemaChangelog;
  if (log.schema_version !== 1 || !Array.isArray(log.changes) || log.changes.length < 1) {
    throw new Error('schema changelog is not schema 1');
  }
  const first = log.changes[0];
  if (first.schema_version !== 1 || first.format !== 'csv.gz' || first.effective !== '2026-11-10') {
    throw new Error('schema changelog is missing the schema 1 entry');
  }
  if (!sameStrings(first.columns?.map((col) => col.name) ?? null, [...BULK_COLUMNS])) {
    throw new Error('schema changelog columns differ from schema 1');
  }
  return schemaChangelog();
}

export function publicBulkIndex(index: BulkIndex): PublicBulkIndex {
  return {
    ...index,
    schema_changelog_url: '/api/v1/bulk/schema',
    bundles: index.bundles.map((row) => ({
      ...row,
      download_csv_gz: row.status === 'frozen' && row.vintage_date ? `/api/v1/bulk/${row.vintage_date}?file=${BULK_FILE_NAME}` : null,
      download_manifest: row.status === 'frozen' && row.vintage_date ? `/api/v1/bulk/${row.vintage_date}` : null,
    })),
  };
}

export type BulkDateLookup =
  | { kind: 'frozen'; bundle: BulkBundle }
  | { kind: 'gap'; bundle: BulkBundle | null }
  | { kind: 'missing' };

export function lookupBulkDate(index: BulkIndex, date: string): BulkDateLookup {
  if (!DAY.test(date)) return { kind: 'missing' };
  const frozen = index.bundles.find((row) => row.status === 'frozen' && row.vintage_date === date);
  if (frozen) return { kind: 'frozen', bundle: frozen };
  const gap = index.bundles.find((row) => row.status === 'gap' && (row.week_start === date || row.week_end === date || row.gap_dates_in_week.includes(date))) ?? null;
  if (gap || index.missing_capture_dates.includes(date) || index.bundles.some((row) => row.gap_dates_in_week.includes(date))) {
    return { kind: 'gap', bundle: gap };
  }
  return { kind: 'missing' };
}

export function bulkRoot(root = process.cwd()): string {
  return join(root, 'data', 'bulk');
}

export function readBulkTree(dir: string): Map<string, Buffer> {
  const out = new Map<string, Buffer>();
  if (!existsSync(dir)) return out;
  const walk = (abs: string, rel: string) => {
    for (const name of readdirSync(abs)) {
      if (name.endsWith('.tmp')) continue;
      const child = join(abs, name);
      const childRel = rel ? `${rel}/${name}` : name;
      if (statSync(child).isDirectory()) walk(child, childRel);
      else out.set(`data/bulk/${childRel}`, readFileSync(child));
    }
  };
  walk(dir, '');
  return out;
}

export function writeBulk(root: string, decision: BulkDecision): void {
  if (decision.errors.length) throw new Error(decision.errors.join('\n'));
  const rootResolved = resolve(root);
  for (const write of decision.writes) {
    if (write.path.includes('..') || !write.path.startsWith('data/bulk/')) throw new Error(`refusing path ${write.path}`);
    const dest = resolve(rootResolved, write.path);
    if (!dest.startsWith(`${rootResolved}/`)) throw new Error(`refusing path ${write.path}`);
    mkdirSync(dirname(dest), { recursive: true });
    if (existsSync(dest)) {
      const current = readFileSync(dest);
      if (!current.equals(write.body)) throw new Error(`refusing to overwrite ${write.path}`);
      continue;
    }
    const tmp = `${dest}.tmp`;
    writeFileSync(tmp, write.body);
    renameSync(tmp, dest);
  }
}

export interface PublishedWeek {
  bundle: BulkBundle;
  manifestBytes: Buffer;
  manifest: BulkWeekManifest;
  gz: Buffer;
  csv: string;
}

export interface PublishedBulk {
  index: BulkIndex;
  changelog: SchemaChangelog;
  weeks: PublishedWeek[];
}

export function readPublishedBulk(root = process.cwd()): PublishedBulk {
  const dir = bulkRoot(root);
  const index = parseBulkIndex(JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8')) as unknown);
  const changelog = parseSchemaChangelog(JSON.parse(readFileSync(join(dir, BULK_CHANGELOG_PATH.slice('data/bulk/'.length)), 'utf8')) as unknown);
  const weeks: PublishedWeek[] = [];
  for (const bundle of index.bundles) {
    if (bundle.status !== 'frozen' || !bundle.vintage_date || !bundle.files || !bundle.manifest_path || !bundle.manifest_sha256 || !bundle.vintage_sha256) {
      continue;
    }
    const gzPath = join(root, bundle.files[0].path);
    const manifestPath = join(root, bundle.manifest_path);
    const gz = readFileSync(gzPath);
    const manifestBytes = readFileSync(manifestPath);
    if (sha256Buffer(gz) !== bundle.files[0].sha256) {
      throw new Error(`bulk file ${bundle.vintage_date} does not match the index checksum — refusing to serve it`);
    }
    if (sha256Buffer(manifestBytes) !== bundle.manifest_sha256) {
      throw new Error(`bulk manifest ${bundle.vintage_date} does not match the index checksum — refusing to serve it`);
    }
    if (gz.length !== bundle.files[0].bytes) throw new Error(`bulk file ${bundle.vintage_date} byte length differs`);
    const csv = gunzipCsv(gz);
    if (sha256Hex(csv) !== bundle.files[0].uncompressed_sha256) {
      throw new Error(`bulk file ${bundle.vintage_date} uncompressed checksum differs`);
    }
    const lines = csv.trimEnd().split('\n');
    if (lines[0] !== BULK_COLUMNS.join(',')) throw new Error(`bulk file ${bundle.vintage_date} header differs from schema 1`);
    if (lines.length !== bundle.row_count! + 1) throw new Error(`bulk file ${bundle.vintage_date} row count differs from the index`);
    if (!lines.slice(1).every((line) => line.startsWith(`${bundle.vintage_date},`))) {
      throw new Error(`bulk file ${bundle.vintage_date} has a row from another capture`);
    }
    const vintagePath = join(root, 'data', 'vintages', `${bundle.vintage_date}.json`);
    const vintageBody = readFileSync(vintagePath, 'utf8');
    if (sha256Hex(vintageBody) !== bundle.vintage_sha256) {
      throw new Error(`bulk file ${bundle.vintage_date} does not match the vintage hash — refusing to serve it`);
    }
    const manifest = JSON.parse(manifestBytes.toString('utf8')) as BulkWeekManifest;
    if (manifest.generated_at !== bundle.generated_at || manifest.row_count !== bundle.row_count) {
      throw new Error(`bulk manifest ${bundle.vintage_date} does not match the index`);
    }
    if (!sameStrings(manifest.source_capture_dates, bundle.source_capture_dates)) {
      throw new Error(`bulk manifest ${bundle.vintage_date} capture dates do not match the index`);
    }
    weeks.push({ bundle, manifestBytes, manifest, gz, csv });
  }
  const frozen = index.bundles.filter((row) => row.status === 'frozen').length;
  if (weeks.length !== frozen) throw new Error('bulk index frozen count does not match the files that were read');
  return { index, changelog, weeks };
}

export function applyWrites(existing: Map<string, Buffer>, writes: BulkWrite[]): Map<string, Buffer> {
  const next = new Map(existing);
  for (const write of writes) next.set(write.path, Buffer.from(write.body));
  return next;
}
