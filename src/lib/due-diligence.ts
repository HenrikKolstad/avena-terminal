/**
 * Buyer due-diligence pack for the Spanish coastal new-build listing book
 * and the observation ledger published with it.
 *
 * Every count is computed from the listing book, the published open-data
 * files, or a live price_snapshots read. A figure that cannot be computed
 * is the string `not available`. Nothing here is a commercial term: the
 * pack points at /license and /access.
 */

import { readFileSync } from 'fs';
import path from 'path';
import { avg, getAllProperties } from '@/lib/properties';
import { toAPIP } from '@/lib/apip';
import { buildTownAggregates } from '@/lib/open-dataset';
import { LEDGER_EPOCH } from '@/lib/open-dataset-io';
import { KNOWN_GAPS } from '@/lib/sellthrough';
import { findMissingRanges, type MissingRange } from '@/lib/fund-report';
import { LARGE_MOVE, PM2_BAND, RECUR_DAYS, SIZE_TOL } from '@/lib/unit-identity';
import { SCRIBE_SEAM } from '@/lib/institutional-load';
import { computeConfidence } from '@/lib/score-confidence';
import { ES_PROVINCE_DEFS, provinceFromLocation } from '@/lib/data-sources/ine-es';
import { collectHealth, type HealthReport } from '@/lib/health';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { Property } from '@/lib/types';

export const NOT_AVAILABLE = 'not available' as const;
export type NotAvailable = typeof NOT_AVAILABLE;
export type OrNA<T> = T | NotAvailable;

/** Date recorded in src/lib/unit-identity.ts: new snapshot rows carry move_status from this day. */
export const MOVE_STATUS_SINCE = '2026-10-24';

export const SAMPLE_MOVE_ROWS = 25;
export const SAMPLE_SOURCE = 'public/open-data/moves.csv';

export interface DictionaryField {
  surface: string;
  record: string;
  field: string;
  type: string;
  unit: string | null;
  nullable: boolean;
  description: string;
  example: unknown;
}

export interface TownCoverage {
  location: string;
  town: string;
  province: string | null;
  costa: string | null;
  listings: number;
}

export interface NamedCount {
  name: string;
  listings: number;
}

export interface FeedCoverage {
  source: 'public/data.json';
  listings: number;
  feed_generated_at: OrNA<string>;
  countries: NamedCount[];
  country_note: string;
  towns: TownCoverage[];
  town_count: number;
  provinces: Array<{ key: string; name: string; listings: number; towns: number }>;
  unmapped_locations: string[];
  costas: NamedCount[];
  property_types: NamedCount[];
  /** Town aggregates the open-dataset generator would publish from this book (k>=5). */
  open_dataset_towns_now: number;
  development_refs: number;
  development_refs_missing: number;
  promoter_names: NotAvailable;
  promoter_names_reason: string;
  source_labels: NamedCount[];
  source_labels_note: string;
}

export interface PriceHistoryCoverage {
  source: 'price_snapshots' | NotAvailable;
  first_date: OrNA<string>;
  latest_date: OrNA<string>;
  observed_days: OrNA<number>;
  observed_days_source: OrNA<string>;
  reason: string | null;
}

export interface PublishedDataset {
  source: 'public/open-data/dataset.json';
  readable: boolean;
  name: OrNA<string>;
  version: OrNA<string>;
  schema_version: OrNA<number>;
  generated_at: OrNA<string>;
  license: OrNA<string>;
  attribution: OrNA<string>;
  first_date: OrNA<string>;
  latest_date: OrNA<string>;
  observation_days: OrNA<number>;
  refs_observed: OrNA<number>;
  moves_recorded: OrNA<number>;
  delistings_recorded: OrNA<number>;
  relistings_recorded: OrNA<number>;
  delistings_still_listed: OrNA<number>;
  delistings_currently_absent: OrNA<number>;
  live_listings: OrNA<number>;
  towns_published: OrNA<number>;
  town_k_threshold: OrNA<number>;
  zenodo: Record<string, unknown> | NotAvailable;
  honesty: string[] | NotAvailable;
}

export interface PipelineStep {
  id: string;
  name: string;
  cadence: string;
  what: string;
  source_file: string;
  last_observed: OrNA<string>;
  last_observed_kind: string;
  health_status: OrNA<string>;
  health_detail: OrNA<string>;
}

export interface DeliveryOption {
  id: string;
  method: 'GET';
  path: string;
  format: string;
  auth: string;
  note: string;
}

export interface UnavailableNote {
  field: string;
  reason: string;
}

export interface DueDiligencePack {
  generated_at: string;
  title: string;
  overview: string;
  coverage: {
    feed: FeedCoverage;
    price_history: PriceHistoryCoverage;
    published_open_dataset: PublishedDataset;
    ledger_gaps: MissingRange[] | NotAvailable;
    ledger_gaps_source: OrNA<string>;
  };
  dictionary: DictionaryField[];
  dictionary_scope: string;
  pipeline: PipelineStep[];
  health_checked_at: OrNA<string>;
  quality: {
    history_starts: string;
    history_start_note: string;
    declared_capture_gaps: typeof KNOWN_GAPS;
    declared_capture_gap_note: string;
    unit_identity: string;
    move_status_since: string;
    move_status_note: string;
    excluded: string[];
  };
  point_in_time: {
    summary: string;
    asking_prices: string;
    backfill: string;
    stored_scores: string;
    live_api_scores: string;
    open_dataset: string;
    scribe_last_run: NotAvailable;
    scribe_last_run_reason: string;
  };
  delivery: DeliveryOption[];
  licensing: {
    open_observations: string;
    zenodo: string;
    listings_api: string;
    access_href: '/access';
    license_href: '/license';
    sourcing: string[];
  };
  sample: {
    href: '/api/v1/due-diligence/sample';
    source: typeof SAMPLE_SOURCE;
    rows: number;
    note: string;
  };
  not_available: UnavailableNote[];
}

interface DictSeed {
  surface: string;
  record: string;
  field: string;
  type: string;
  unit: string | null;
  nullable: boolean;
  description: string;
}

function field(seed: DictSeed, example: unknown): DictionaryField {
  return {
    surface: seed.surface,
    record: seed.record,
    field: seed.field,
    type: seed.type,
    unit: seed.unit,
    nullable: seed.nullable,
    description: seed.description,
    example: example === undefined ? null : example,
  };
}

function readJson(rel: string): unknown | null {
  try {
    return JSON.parse(readFileSync(path.join(process.cwd(), rel), 'utf8'));
  } catch {
    return null;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function ymd(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

export function coverageFromFeed(props: Property[], feedGeneratedAt: string | null): FeedCoverage {
  const towns = new Map<string, Property[]>();
  const costaCounts = new Map<string, number>();
  const typeCounts = new Map<string, number>();
  const labelCounts = new Map<string, number>();
  const countryCounts = new Map<string, number>();
  const devRefs = new Set<string>();
  let devMissing = 0;
  let countryUnset = 0;

  for (const p of props) {
    const loc = p.l || '';
    if (!towns.has(loc)) towns.set(loc, []);
    towns.get(loc)!.push(p);
    const costa = (p.costa || '').trim();
    if (costa) costaCounts.set(costa, (costaCounts.get(costa) ?? 0) + 1);
    if (p.t) typeCounts.set(p.t, (typeCounts.get(p.t) ?? 0) + 1);
    if (p.d) labelCounts.set(p.d, (labelCounts.get(p.d) ?? 0) + 1);
    if (p.country) countryCounts.set(p.country, (countryCounts.get(p.country) ?? 0) + 1);
    else countryUnset++;
    const dev = (p.dev_ref || '').trim();
    if (dev) devRefs.add(dev);
    else devMissing++;
  }

  const provinceListings = new Map<string, number>();
  const provinceTowns = new Map<string, Set<string>>();
  const unmapped: string[] = [];
  const townRows: TownCoverage[] = [];

  for (const [location, list] of towns) {
    const def = location ? provinceFromLocation(location) : null;
    const town = location.split(',')[0]?.trim() || location;
    const costas = [...new Set(list.map((p) => (p.costa || '').trim()).filter(Boolean))];
    if (!def) {
      if (location) unmapped.push(location);
    } else {
      provinceListings.set(def.key, (provinceListings.get(def.key) ?? 0) + list.length);
      if (!provinceTowns.has(def.key)) provinceTowns.set(def.key, new Set());
      provinceTowns.get(def.key)!.add(town);
    }
    townRows.push({
      location,
      town,
      province: def?.name ?? null,
      costa: costas.length ? costas.join('; ') : null,
      listings: list.length,
    });
  }
  townRows.sort((a, b) => b.listings - a.listings || a.location.localeCompare(b.location));

  const provinces = ES_PROVINCE_DEFS.filter((d) => provinceListings.has(d.key)).map((d) => ({
    key: d.key,
    name: d.name,
    listings: provinceListings.get(d.key) ?? 0,
    towns: provinceTowns.get(d.key)?.size ?? 0,
  }));

  const byCount = (m: Map<string, number>): NamedCount[] =>
    [...m.entries()].map(([name, listings]) => ({ name, listings })).sort((a, b) => b.listings - a.listings || a.name.localeCompare(b.name));

  const countries = byCount(countryCounts);
  if (countryUnset) countries.push({ name: '(country not set on the listing row)', listings: countryUnset });

  return {
    source: 'public/data.json',
    listings: props.length,
    feed_generated_at: feedGeneratedAt ?? NOT_AVAILABLE,
    countries,
    country_note: 'Rows with no country field are counted as unset. GET /api/v1/properties defaults a missing country to ES. This pack does not apply that default to the count.',
    towns: townRows,
    town_count: townRows.filter((t) => t.town).length,
    provinces,
    unmapped_locations: unmapped.sort(),
    costas: byCount(costaCounts),
    property_types: byCount(typeCounts),
    open_dataset_towns_now: buildTownAggregates(props).length,
    development_refs: devRefs.size,
    development_refs_missing: devMissing,
    promoter_names: NOT_AVAILABLE,
    promoter_names_reason: 'The listing feed does not include promoter or developer company names. The value stored as developer is a source label written by the capture from the region (Costa del Sol versus the other regions). It is not a promoter directory.',
    source_labels: byCount(labelCounts),
    source_labels_note: 'Source labels on the current book, grouped from the developer field. These are not promoter names.',
  };
}

export function priceHistoryFromQuery(args: {
  client: boolean;
  min: string | null;
  max: string | null;
  error: string | null;
  ledgerDates: string[] | null;
}): PriceHistoryCoverage {
  if (!args.client) {
    return {
      source: NOT_AVAILABLE,
      first_date: NOT_AVAILABLE,
      latest_date: NOT_AVAILABLE,
      observed_days: NOT_AVAILABLE,
      observed_days_source: NOT_AVAILABLE,
      reason: 'Database client is not configured on this deployment, so price_snapshots was not read.',
    };
  }
  if (args.error) {
    return {
      source: NOT_AVAILABLE,
      first_date: NOT_AVAILABLE,
      latest_date: NOT_AVAILABLE,
      observed_days: NOT_AVAILABLE,
      observed_days_source: NOT_AVAILABLE,
      reason: args.error,
    };
  }
  if (!args.min || !args.max) {
    return {
      source: 'price_snapshots',
      first_date: NOT_AVAILABLE,
      latest_date: NOT_AVAILABLE,
      observed_days: NOT_AVAILABLE,
      observed_days_source: NOT_AVAILABLE,
      reason: `price_snapshots returned no rows on or after ${LEDGER_EPOCH}.`,
    };
  }
  const dates = args.ledgerDates?.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort() ?? null;
  const matched = !!dates?.length && dates[0] === args.min && dates[dates.length - 1] === args.max;
  return {
    source: 'price_snapshots',
    first_date: args.min,
    latest_date: args.max,
    observed_days: matched ? dates!.length : NOT_AVAILABLE,
    observed_days_source: matched
      ? 'published movement ledger; its first and latest dates match the live price_snapshots endpoints'
      : NOT_AVAILABLE,
    reason: matched
      ? null
      : 'The published movement ledger does not share both endpoints with the live price_snapshots read. This page does not scan every snapshot day, so the live day count is not available. The date range above is the live read.',
  };
}

function feedGeneratedAt(): string | null {
  const meta = readJson('public/feed-meta.json');
  return isRecord(meta) ? str(meta.generated_at) : null;
}

function ledgerDates(): string[] | null {
  const raw = readJson('public/open-data/movement-ledger.json');
  if (!Array.isArray(raw)) return null;
  const dates: string[] = [];
  for (const row of raw) {
    if (isRecord(row) && typeof row.date === 'string') dates.push(row.date);
  }
  return dates;
}

function firstRow(rel: string): Record<string, unknown> | null {
  const raw = readJson(rel);
  if (!Array.isArray(raw) || !isRecord(raw[0])) return null;
  return raw[0];
}

export function readPublishedDataset(): PublishedDataset {
  const base: PublishedDataset = {
    source: 'public/open-data/dataset.json',
    readable: false,
    name: NOT_AVAILABLE,
    version: NOT_AVAILABLE,
    schema_version: NOT_AVAILABLE,
    generated_at: NOT_AVAILABLE,
    license: NOT_AVAILABLE,
    attribution: NOT_AVAILABLE,
    first_date: NOT_AVAILABLE,
    latest_date: NOT_AVAILABLE,
    observation_days: NOT_AVAILABLE,
    refs_observed: NOT_AVAILABLE,
    moves_recorded: NOT_AVAILABLE,
    delistings_recorded: NOT_AVAILABLE,
    relistings_recorded: NOT_AVAILABLE,
    delistings_still_listed: NOT_AVAILABLE,
    delistings_currently_absent: NOT_AVAILABLE,
    live_listings: NOT_AVAILABLE,
    towns_published: NOT_AVAILABLE,
    town_k_threshold: NOT_AVAILABLE,
    zenodo: NOT_AVAILABLE,
    honesty: NOT_AVAILABLE,
  };
  const raw = readJson('public/open-data/dataset.json');
  if (!isRecord(raw)) return base;
  const ledger = isRecord(raw.observation_ledger) ? raw.observation_ledger : null;
  const cross = isRecord(raw.cross_section) ? raw.cross_section : null;
  const pickS = (obj: Record<string, unknown> | null, key: string): OrNA<string> => (obj && str(obj[key])) || NOT_AVAILABLE;
  const pickN = (obj: Record<string, unknown> | null, key: string): OrNA<number> => {
    const n = obj ? num(obj[key]) : null;
    return n == null ? NOT_AVAILABLE : n;
  };
  return {
    ...base,
    readable: true,
    name: str(raw.name) ?? NOT_AVAILABLE,
    version: str(raw.version) ?? NOT_AVAILABLE,
    schema_version: num(raw.schema_version) ?? NOT_AVAILABLE,
    generated_at: str(raw.generated_at) ?? NOT_AVAILABLE,
    license: str(raw.license) ?? NOT_AVAILABLE,
    attribution: str(raw.attribution) ?? NOT_AVAILABLE,
    first_date: pickS(ledger, 'first_date'),
    latest_date: pickS(ledger, 'latest_date'),
    observation_days: pickN(ledger, 'observation_days'),
    refs_observed: pickN(ledger, 'refs_observed'),
    moves_recorded: pickN(ledger, 'moves_recorded'),
    delistings_recorded: pickN(ledger, 'delistings_recorded'),
    relistings_recorded: pickN(ledger, 'relistings_recorded'),
    delistings_still_listed: pickN(ledger, 'delistings_still_listed'),
    delistings_currently_absent: pickN(ledger, 'delistings_currently_absent'),
    live_listings: pickN(cross, 'live_listings'),
    towns_published: pickN(cross, 'towns_published'),
    town_k_threshold: pickN(cross, 'town_k_threshold'),
    zenodo: isRecord(raw.zenodo_snapshot) ? raw.zenodo_snapshot : NOT_AVAILABLE,
    honesty: Array.isArray(raw.honesty) ? raw.honesty.filter((h): h is string => typeof h === 'string') : NOT_AVAILABLE,
  };
}

function officialGeneratedAt(): string | null {
  const raw = readJson('data/es-official.json');
  return isRecord(raw) ? str(raw.generated_at) : null;
}

function supplyGeneratedAt(): string | null {
  const raw = readJson('data/es-supply.json');
  return isRecord(raw) ? str(raw.generated_at) : null;
}

function townGeneratedAt(): string | null {
  const raw = readJson('data/es-town-gap.json');
  return isRecord(raw) ? str(raw.generated_at) : null;
}

function hpiGeneratedAt(): string | null {
  const raw = readJson('data/eu-hpi.json');
  return isRecord(raw) ? str(raw.generated_at) : null;
}

function rentsGeneratedAt(): string | null {
  const raw = readJson('data/es-rents.json');
  return isRecord(raw) ? str(raw.generated_at) : null;
}

async function readSnapshotBounds(): Promise<{ client: boolean; min: string | null; max: string | null; error: string | null }> {
  const db = supabaseAdmin;
  if (!db) return { client: false, min: null, max: null, error: null };
  try {
    const [lo, hi] = await Promise.all([
      db.from('price_snapshots').select('snapshot_date').gte('snapshot_date', LEDGER_EPOCH).order('snapshot_date', { ascending: true }).limit(1).abortSignal(AbortSignal.timeout(4000)),
      db.from('price_snapshots').select('snapshot_date').gte('snapshot_date', LEDGER_EPOCH).order('snapshot_date', { ascending: false }).limit(1).abortSignal(AbortSignal.timeout(4000)),
    ]);
    if (lo.error) return { client: true, min: null, max: null, error: `price_snapshots min: ${lo.error.message}`.slice(0, 240) };
    if (hi.error) return { client: true, min: null, max: null, error: `price_snapshots max: ${hi.error.message}`.slice(0, 240) };
    const min = ymd((lo.data?.[0] as { snapshot_date?: unknown } | undefined)?.snapshot_date);
    const max = ymd((hi.data?.[0] as { snapshot_date?: unknown } | undefined)?.snapshot_date);
    return { client: true, min, max, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { client: true, min: null, max: null, error: `price_snapshots read failed: ${message}`.slice(0, 240) };
  }
}

const OPEN_SURFACE = 'Open dataset (public/open-data and the avena-data market/ mirror)';

const OPEN_FIELDS: DictSeed[] = [
  { surface: OPEN_SURFACE, record: 'towns.csv / towns.json', field: 'town', type: 'string', unit: null, nullable: false, description: 'Town name, the text before the comma in the listing location. Towns with fewer than 5 live listings are omitted from this file.' },
  { surface: OPEN_SURFACE, record: 'towns.csv / towns.json', field: 'costa', type: 'string', unit: null, nullable: false, description: 'Costa label from the listing book for that town.' },
  { surface: OPEN_SURFACE, record: 'towns.csv / towns.json', field: 'n_listings', type: 'integer', unit: 'listings', nullable: false, description: 'Live listings in the town at the time the file was built.' },
  { surface: OPEN_SURFACE, record: 'towns.csv / towns.json', field: 'median_price_eur', type: 'number', unit: 'EUR', nullable: false, description: 'Median asking price of the live listings in the town.' },
  { surface: OPEN_SURFACE, record: 'towns.csv / towns.json', field: 'median_pm2_eur', type: 'number', unit: 'EUR/m²', nullable: false, description: 'Median asking price per square metre.' },
  { surface: OPEN_SURFACE, record: 'towns.csv / towns.json', field: 'p25_pm2_eur', type: 'number', unit: 'EUR/m²', nullable: false, description: '25th percentile of asking price per square metre.' },
  { surface: OPEN_SURFACE, record: 'towns.csv / towns.json', field: 'p75_pm2_eur', type: 'number', unit: 'EUR/m²', nullable: false, description: '75th percentile of asking price per square metre.' },
  { surface: OPEN_SURFACE, record: 'towns.csv / towns.json', field: 'median_built_m2', type: 'number', unit: 'm²', nullable: false, description: 'Median built area of the live listings in the town.' },
  { surface: OPEN_SURFACE, record: 'towns.csv / towns.json', field: 'villa_share_pct', type: 'number', unit: 'percent', nullable: false, description: 'Share of listings whose type is Villa, Townhouse, or Bungalow.' },
  { surface: OPEN_SURFACE, record: 'towns.csv / towns.json', field: 'median_beach_km', type: 'number', unit: 'km', nullable: true, description: 'Median beach distance. Null when the town has no beach-distance values.' },
  { surface: OPEN_SURFACE, record: 'movement-ledger.csv / movement-ledger.json', field: 'date', type: 'date', unit: 'YYYY-MM-DD', nullable: false, description: 'Observation day. Days with no snapshot are absent, not filled with zeros.' },
  { surface: OPEN_SURFACE, record: 'movement-ledger.csv / movement-ledger.json', field: 'listings_observed', type: 'integer', unit: 'listings', nullable: false, description: 'Distinct listing refs observed that day.' },
  { surface: OPEN_SURFACE, record: 'movement-ledger.csv / movement-ledger.json', field: 'price_increases', type: 'integer', unit: 'listings', nullable: false, description: 'Verified asking-price increases observed that day. Unit changes are not included.' },
  { surface: OPEN_SURFACE, record: 'movement-ledger.csv / movement-ledger.json', field: 'price_reductions', type: 'integer', unit: 'listings', nullable: false, description: 'Verified asking-price reductions observed that day. Unit changes are not included.' },
  { surface: OPEN_SURFACE, record: 'movement-ledger.csv / movement-ledger.json', field: 'median_abs_move_pct', type: 'number', unit: 'percent', nullable: true, description: 'Median absolute size of the verified moves that day. Null when the day had no counted move.' },
  { surface: OPEN_SURFACE, record: 'movement-ledger.csv / movement-ledger.json', field: 'delistings', type: 'integer', unit: 'listings', nullable: false, description: 'Listing refs recorded as leaving the feed that day. A delisting is not a registered sale.' },
  { surface: OPEN_SURFACE, record: 'movement-ledger.csv / movement-ledger.json', field: 'relistings', type: 'integer', unit: 'listings', nullable: false, description: 'Delisted refs observed listed again that day.' },
  { surface: OPEN_SURFACE, record: 'moves.csv / moves.json', field: 'avn_id', type: 'string', unit: null, nullable: false, description: 'Listing ref the move was observed on. The column name is historical; the value is the feed ref.' },
  { surface: OPEN_SURFACE, record: 'moves.csv / moves.json', field: 'date', type: 'date', unit: 'YYYY-MM-DD', nullable: false, description: 'Day the new asking price was observed.' },
  { surface: OPEN_SURFACE, record: 'moves.csv / moves.json', field: 'prev_date', type: 'date', unit: 'YYYY-MM-DD', nullable: false, description: 'Day the previous asking price of the same ref was observed. Not necessarily the previous calendar day.' },
  { surface: OPEN_SURFACE, record: 'moves.csv / moves.json', field: 'prev_price_eur', type: 'number', unit: 'EUR', nullable: false, description: 'Previous asking price.' },
  { surface: OPEN_SURFACE, record: 'moves.csv / moves.json', field: 'new_price_eur', type: 'number', unit: 'EUR', nullable: false, description: 'Newly observed asking price.' },
  { surface: OPEN_SURFACE, record: 'moves.csv / moves.json', field: 'change_pct', type: 'number', unit: 'percent', nullable: false, description: 'Change from the previous observed asking price to the new one, in percent.' },
  { surface: OPEN_SURFACE, record: 'moves.csv / moves.json', field: 'town', type: 'string', unit: null, nullable: true, description: 'Town stored on the newer snapshot. Null when the snapshot had none.' },
  { surface: OPEN_SURFACE, record: 'moves.csv / moves.json', field: 'type', type: 'string', unit: null, nullable: true, description: 'Property type stored on the newer snapshot. Null when the snapshot had none.' },
  { surface: OPEN_SURFACE, record: 'tombstones.csv / tombstones.json', field: 'avn_id', type: 'string', unit: null, nullable: false, description: 'Listing ref that left the observed feed. The value is the feed ref.' },
  { surface: OPEN_SURFACE, record: 'tombstones.csv / tombstones.json', field: 'town', type: 'string', unit: null, nullable: true, description: 'Town on the delisting row.' },
  { surface: OPEN_SURFACE, record: 'tombstones.csv / tombstones.json', field: 'region', type: 'string', unit: null, nullable: true, description: 'Region code on the delisting row.' },
  { surface: OPEN_SURFACE, record: 'tombstones.csv / tombstones.json', field: 'type', type: 'string', unit: null, nullable: true, description: 'Property type on the delisting row.' },
  { surface: OPEN_SURFACE, record: 'tombstones.csv / tombstones.json', field: 'beds', type: 'number', unit: 'bedrooms', nullable: true, description: 'Bedrooms on the delisting row.' },
  { surface: OPEN_SURFACE, record: 'tombstones.csv / tombstones.json', field: 'built_m2', type: 'number', unit: 'm²', nullable: true, description: 'Built area on the delisting row.' },
  { surface: OPEN_SURFACE, record: 'tombstones.csv / tombstones.json', field: 'last_price_eur', type: 'number', unit: 'EUR', nullable: true, description: 'Last asking price observed before the ref left the feed.' },
  { surface: OPEN_SURFACE, record: 'tombstones.csv / tombstones.json', field: 'last_pm2_eur', type: 'number', unit: 'EUR/m²', nullable: true, description: 'Last asking price per square metre observed before the ref left the feed.' },
  { surface: OPEN_SURFACE, record: 'tombstones.csv / tombstones.json', field: 'last_seen_date', type: 'date', unit: 'YYYY-MM-DD', nullable: true, description: 'Last day the ref was observed in the feed.' },
  { surface: OPEN_SURFACE, record: 'tombstones.csv / tombstones.json', field: 'relisted_on', type: 'date', unit: 'YYYY-MM-DD', nullable: true, description: 'First later day the ref was observed listed again. Null when it has not returned. The tombstone row is kept either way.' },
  { surface: OPEN_SURFACE, record: 'tombstones.csv / tombstones.json', field: 'still_listed', type: 'boolean', unit: null, nullable: false, description: 'True when the ref is present on the latest observation day. Those rows are not evidence of absorption.' },
];

const MANIFEST_FIELDS: Array<DictSeed & { path: string[] }> = [
  { surface: OPEN_SURFACE, record: 'dataset.json', field: 'name', path: ['name'], type: 'string', unit: null, nullable: false, description: 'Dataset name written by the open-dataset generator.' },
  { surface: OPEN_SURFACE, record: 'dataset.json', field: 'version', path: ['version'], type: 'string', unit: null, nullable: false, description: 'File version, the generation date prefixed with v. Not the Zenodo deposit.' },
  { surface: OPEN_SURFACE, record: 'dataset.json', field: 'schema_version', path: ['schema_version'], type: 'integer', unit: null, nullable: false, description: 'Schema version of the observation files. 2 added relisted_on, relistings, and the split between delistings that returned and delistings still absent.' },
  { surface: OPEN_SURFACE, record: 'dataset.json', field: 'generated_at', path: ['generated_at'], type: 'timestamp', unit: 'ISO-8601', nullable: false, description: 'When this manifest was generated.' },
  { surface: OPEN_SURFACE, record: 'dataset.json', field: 'license', path: ['license'], type: 'string', unit: null, nullable: false, description: 'License string written on the manifest.' },
  { surface: OPEN_SURFACE, record: 'dataset.json', field: 'attribution', path: ['attribution'], type: 'string', unit: null, nullable: false, description: 'Attribution string written on the manifest.' },
  { surface: OPEN_SURFACE, record: 'dataset.json', field: 'observation_ledger.first_date', path: ['observation_ledger', 'first_date'], type: 'date', unit: 'YYYY-MM-DD', nullable: false, description: 'First observation day in the published ledger.' },
  { surface: OPEN_SURFACE, record: 'dataset.json', field: 'observation_ledger.latest_date', path: ['observation_ledger', 'latest_date'], type: 'date', unit: 'YYYY-MM-DD', nullable: false, description: 'Latest observation day in the published ledger.' },
  { surface: OPEN_SURFACE, record: 'dataset.json', field: 'observation_ledger.observation_days', path: ['observation_ledger', 'observation_days'], type: 'integer', unit: 'days', nullable: false, description: 'Count of observation days in the file. Not a calendar span.' },
  { surface: OPEN_SURFACE, record: 'dataset.json', field: 'observation_ledger.refs_observed', path: ['observation_ledger', 'refs_observed'], type: 'integer', unit: 'listings', nullable: false, description: 'Distinct refs present in the snapshots used to build the file.' },
  { surface: OPEN_SURFACE, record: 'dataset.json', field: 'observation_ledger.moves_recorded', path: ['observation_ledger', 'moves_recorded'], type: 'integer', unit: 'moves', nullable: false, description: 'Rows in moves.csv.' },
  { surface: OPEN_SURFACE, record: 'dataset.json', field: 'observation_ledger.delistings_recorded', path: ['observation_ledger', 'delistings_recorded'], type: 'integer', unit: 'listings', nullable: false, description: 'Rows in tombstones.csv, including refs later observed again.' },
  { surface: OPEN_SURFACE, record: 'dataset.json', field: 'observation_ledger.relistings_recorded', path: ['observation_ledger', 'relistings_recorded'], type: 'integer', unit: 'listings', nullable: false, description: 'Tombstoned refs with a relisted_on date.' },
  { surface: OPEN_SURFACE, record: 'dataset.json', field: 'observation_ledger.delistings_still_listed', path: ['observation_ledger', 'delistings_still_listed'], type: 'integer', unit: 'listings', nullable: false, description: 'Tombstoned refs present again on the latest observation day.' },
  { surface: OPEN_SURFACE, record: 'dataset.json', field: 'observation_ledger.delistings_currently_absent', path: ['observation_ledger', 'delistings_currently_absent'], type: 'integer', unit: 'listings', nullable: false, description: 'Tombstoned refs absent on the latest observation day.' },
  { surface: OPEN_SURFACE, record: 'dataset.json', field: 'cross_section.live_listings', path: ['cross_section', 'live_listings'], type: 'integer', unit: 'listings', nullable: false, description: 'Listing-book size when the file was built. It can differ from the book on a later deploy.' },
  { surface: OPEN_SURFACE, record: 'dataset.json', field: 'cross_section.towns_published', path: ['cross_section', 'towns_published'], type: 'integer', unit: 'towns', nullable: false, description: 'Towns in towns.csv.' },
  { surface: OPEN_SURFACE, record: 'dataset.json', field: 'cross_section.town_k_threshold', path: ['cross_section', 'town_k_threshold'], type: 'integer', unit: 'listings', nullable: false, description: 'Minimum live listings for a town to be published in towns.csv.' },
  { surface: OPEN_SURFACE, record: 'dataset.json', field: 'zenodo_snapshot.doi', path: ['zenodo_snapshot', 'doi'], type: 'string', unit: null, nullable: false, description: 'DOI of an earlier one-off snapshot. The manifest note says the current dataset version is not that deposit.' },
  { surface: OPEN_SURFACE, record: 'dataset.json', field: 'zenodo_snapshot.published', path: ['zenodo_snapshot', 'published'], type: 'date', unit: 'YYYY-MM-DD', nullable: false, description: 'Publication date of the Zenodo snapshot named on the manifest.' },
  { surface: OPEN_SURFACE, record: 'dataset.json', field: 'zenodo_snapshot.listings', path: ['zenodo_snapshot', 'listings'], type: 'integer', unit: 'listings', nullable: false, description: 'Listing count of that Zenodo snapshot, as written on the manifest. Not the current book.' },
  { surface: OPEN_SURFACE, record: 'dataset.json', field: 'zenodo_snapshot.note', path: ['zenodo_snapshot', 'note'], type: 'string', unit: null, nullable: false, description: 'The generator\'s own note on what the Zenodo DOI is and is not.' },
];

function atPath(root: unknown, parts: string[]): unknown {
  let cur: unknown = root;
  for (const part of parts) {
    if (!isRecord(cur)) return null;
    cur = cur[part];
  }
  return cur === undefined ? null : cur;
}

const PROPERTIES = 'GET /api/v1/properties';
const APIP = 'GET /api/v1/properties?format=apip';
const EXPORT = 'GET /api/v1/dataset-export';
const AGG = 'GET /api/v1/open-dataset';

function propertiesExample(all: Property[]): { listing: Record<string, unknown>; envelope: Record<string, unknown> } {
  const sorted = [...all].sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0));
  const paged = sorted.slice(0, 20);
  const p = paged[0];
  const townComps = new Map<string, number>();
  for (const row of sorted) {
    const t = (row.l || '').toLowerCase();
    if (!t) continue;
    townComps.set(t, (townComps.get(t) ?? 0) + 1);
  }
  const town = (p?.l || '').toLowerCase();
  const inTown = sorted.filter((row) => (row.l || '').toLowerCase() === town && row.pm2);
  const ppms = inTown.map((row) => row.pm2!).sort((a, b) => a - b);
  const median = ppms.length ? ppms[Math.floor(ppms.length / 2)] : undefined;
  const c = p
    ? computeConfidence(
      {
        ref: p.ref ?? '',
        primary_score: p._sc ?? 50,
        price_eur: p.pf ?? null,
        built_m2: p.bm ?? null,
        town: p.l ?? null,
        energy: null,
        bedrooms: p.bd ?? null,
        type: p.t ?? null,
      },
      { median_price_per_m2: median, town_comp_count: townComps.get(town) },
    )
    : null;
  const listing: Record<string, unknown> = p
    ? {
      ref: p.ref ?? null,
      name: p.p,
      developer: p.d,
      town: p.l,
      region: p.costa || p.r,
      type: p.t,
      price: p.pf,
      price_to: p.pt,
      pm2: p.pm2 ?? null,
      mm2: p.mm2,
      built_m2: p.bm,
      plot_m2: p.pl,
      bedrooms: p.bd,
      bathrooms: p.ba,
      beach_km: p.bk,
      status: p.s,
      completion: p.c,
      score: p._sc ?? null,
      score_confidence: c?.confidence ?? null,
      score_confidence_codes: c?.reason_codes ?? [],
      score_flagged_for_review: c?.flagged_for_review ?? null,
      yield_gross: p._yield?.gross ?? null,
      yield_net: p._yield?.net ?? null,
      yield_annual: p._yield?.annual ?? null,
      url: p.u,
      image: p.imgs?.[0] || p.img || null,
      lat: p.lat ?? null,
      lng: p.lng ?? null,
      country: p.country ?? 'ES',
      country_name: p.country_name ?? 'Spain',
      currency: p.currency ?? 'EUR',
      source_portal: p.source_portal ?? null,
      last_synced: p.last_synced ?? null,
    }
    : {};
  return {
    listing,
    envelope: {
      total: sorted.length,
      limit: 20,
      offset: 0,
      count: paged.length,
      avg_price: Math.round(avg(paged.map((row) => row.pf))),
      avg_score: Math.round(avg(paged.filter((row) => row._sc).map((row) => row._sc!))),
    },
  };
}

function exportExample(p: Property | undefined): Record<string, unknown> {
  if (!p) return {};
  return {
    ref: p.ref ?? p.dev_ref ?? '',
    type: p.t,
    town: p.l,
    region: p.r,
    price: p.pf,
    price_m2: p.pm2 ?? null,
    score: p._sc ?? null,
    yield_gross: p._yield?.gross ?? null,
    beds: p.bd,
    baths: p.ba,
    m2: p.bm,
    beach_km: p.bk ?? null,
    developer: p.d,
    status: p.s,
    energy: p.energy ?? null,
    pool: p.pool ?? null,
    source: 'Avena Terminal (avenaterminal.com)',
    doi: '10.5281/zenodo.19520064',
  };
}

function flatten(value: unknown, prefix: string, out: Record<string, unknown>) {
  if (Array.isArray(value) || !isRecord(value)) {
    if (prefix) out[prefix] = value;
    return;
  }
  const keys = Object.keys(value);
  if (!keys.length && prefix) out[prefix] = value;
  for (const key of keys) flatten(value[key], prefix ? `${prefix}.${key}` : key, out);
}

function aggregateExamples(all: Property[], today: string): Record<string, unknown> {
  const town = (() => {
    const counts = new Map<string, Property[]>();
    for (const p of all) {
      if (!counts.has(p.l)) counts.set(p.l, []);
      counts.get(p.l)!.push(p);
    }
    const top = [...counts.entries()].sort((a, b) => b[1].length - a[1].length)[0];
    if (!top) return null;
    const props = top[1];
    const yields = props.filter((p) => p._yield).map((p) => p._yield!.gross);
    const scores = props.filter((p) => p._sc).map((p) => p._sc!);
    const pm2s = props.filter((p) => p.pm2).map((p) => p.pm2!);
    return {
      town: top[0],
      count: props.length,
      avg_price: Math.round(avg(props.map((p) => p.pf))),
      avg_yield: Number(avg(yields).toFixed(1)),
      avg_score: Math.round(avg(scores)),
      avg_pm2: Math.round(avg(pm2s)),
      source: 'Avena Terminal (avenaterminal.com)',
      license: 'CC BY 4.0',
    };
  })();
  const costa = (() => {
    const counts = new Map<string, Property[]>();
    for (const p of all) {
      const key = p.costa || '';
      if (!key) continue;
      if (!counts.has(key)) counts.set(key, []);
      counts.get(key)!.push(p);
    }
    const top = [...counts.entries()].sort((a, b) => b[1].length - a[1].length)[0];
    if (!top) return null;
    const props = top[1];
    const yields = props.filter((p) => p._yield).map((p) => p._yield!.gross);
    const scores = props.filter((p) => p._sc).map((p) => p._sc!);
    const pm2s = props.filter((p) => p.pm2).map((p) => p.pm2!);
    return {
      costa: top[0],
      count: props.length,
      avg_price: Math.round(avg(props.map((p) => p.pf))),
      avg_yield: Number(avg(yields).toFixed(1)),
      avg_score: Math.round(avg(scores)),
      avg_pm2: Math.round(avg(pm2s)),
      source: 'Avena Terminal (avenaterminal.com)',
      license: 'CC BY 4.0',
    };
  })();
  const types = new Map<string, number>();
  for (const p of all) types.set(p.t, (types.get(p.t) ?? 0) + 1);
  const topType = [...types.entries()].sort((a, b) => b[1] - a[1])[0];
  const scored = all.filter((p) => p._sc !== undefined);
  const withYield = all.filter((p) => p._yield);
  const globalAvgScore = scored.length ? avg(scored.map((p) => p._sc!)) : 0;
  const globalAvgYield = withYield.length ? avg(withYield.map((p) => p._yield!.gross)) : 0;
  const pm2s = all.filter((p) => p.pm2).map((p) => p.pm2!);
  const globalAvgPm2 = avg(pm2s);
  const apci = Number((globalAvgScore * 0.4 + globalAvgYield * 10 * 0.3 + (1 - globalAvgPm2 / 5000) * 100 * 0.3).toFixed(1));
  return {
    'data.town_statistics.town': town?.town ?? null,
    'data.town_statistics.count': town?.count ?? null,
    'data.town_statistics.avg_price': town?.avg_price ?? null,
    'data.town_statistics.avg_yield': town?.avg_yield ?? null,
    'data.town_statistics.avg_score': town?.avg_score ?? null,
    'data.town_statistics.avg_pm2': town?.avg_pm2 ?? null,
    'data.town_statistics.source': town?.source ?? null,
    'data.town_statistics.license': town?.license ?? null,
    'data.costa_statistics.costa': costa?.costa ?? null,
    'data.costa_statistics.count': costa?.count ?? null,
    'data.costa_statistics.avg_price': costa?.avg_price ?? null,
    'data.costa_statistics.avg_yield': costa?.avg_yield ?? null,
    'data.costa_statistics.avg_score': costa?.avg_score ?? null,
    'data.costa_statistics.avg_pm2': costa?.avg_pm2 ?? null,
    'data.costa_statistics.source': costa?.source ?? null,
    'data.costa_statistics.license': costa?.license ?? null,
    'data.property_type_distribution.type': topType?.[0] ?? null,
    'data.property_type_distribution.count': topType?.[1] ?? null,
    'data.property_type_distribution.pct': topType ? Number(((topType[1] / all.length) * 100).toFixed(1)) : null,
    'data.price_band_distribution.band': 'Under €100k',
    'data.price_band_distribution.count': all.filter((p) => p.pf >= 0 && p.pf < 100_000).length,
    'data.score_distribution.band': '90–100 (Exceptional)',
    'data.score_distribution.count': all.filter((p) => p._sc !== undefined && p._sc >= 90 && p._sc < 101).length,
    'data.yield_distribution.band': 'Over 8%',
    'data.yield_distribution.count': all.filter((p) => p._yield && p._yield.gross >= 8).length,
    'data.index_values.apci_composite': Number.isFinite(apci) ? apci : null,
    'data.index_values.avg_investment_score': Number(globalAvgScore.toFixed(1)),
    'data.index_values.avg_price': Math.round(avg(all.map((p) => p.pf))),
    'data.index_values.avg_yield': Number(globalAvgYield.toFixed(2)),
    'data.index_values.avg_pm2': Math.round(globalAvgPm2),
    'data.index_values.total_properties': all.length,
    'data.index_values.scored_properties': scored.length,
    'data.index_values.date': today,
    version: '1.0.0',
    license: 'https://creativecommons.org/licenses/by/4.0/',
  };
}

const LISTING_FIELDS: DictSeed[] = [
  { surface: PROPERTIES, record: 'properties[]', field: 'ref', type: 'string', unit: null, nullable: true, description: 'Feed listing reference. Omitted from JSON when the listing has none.' },
  { surface: PROPERTIES, record: 'properties[]', field: 'name', type: 'string', unit: null, nullable: false, description: 'Listing title stored on the book.' },
  { surface: PROPERTIES, record: 'properties[]', field: 'developer', type: 'string', unit: null, nullable: false, description: 'Source label written by the capture, not a promoter company name. See coverage.' },
  { surface: PROPERTIES, record: 'properties[]', field: 'town', type: 'string', unit: null, nullable: false, description: 'Location string as stored, normally "town, province".' },
  { surface: PROPERTIES, record: 'properties[]', field: 'region', type: 'string', unit: null, nullable: false, description: 'Costa name when the listing has one, otherwise the region code.' },
  { surface: PROPERTIES, record: 'properties[]', field: 'type', type: 'string', unit: null, nullable: false, description: 'Property type stored on the listing.' },
  { surface: PROPERTIES, record: 'properties[]', field: 'price', type: 'number', unit: 'EUR', nullable: false, description: 'Asking price. Not a registered transaction price.' },
  { surface: PROPERTIES, record: 'properties[]', field: 'price_to', type: 'number', unit: 'EUR', nullable: false, description: 'Upper asking price when the feed has a range. Equals price when it does not.' },
  { surface: PROPERTIES, record: 'properties[]', field: 'pm2', type: 'number', unit: 'EUR/m²', nullable: true, description: 'Asking price per square metre of the area used for the listing.' },
  { surface: PROPERTIES, record: 'properties[]', field: 'mm2', type: 'number', unit: 'EUR/m²', nullable: false, description: 'Area benchmark price per square metre stored on the listing. A model input, not a transaction index.' },
  { surface: PROPERTIES, record: 'properties[]', field: 'built_m2', type: 'number', unit: 'm²', nullable: false, description: 'Built area stored on the listing.' },
  { surface: PROPERTIES, record: 'properties[]', field: 'plot_m2', type: 'number', unit: 'm²', nullable: true, description: 'Plot area. Null when the feed has none.' },
  { surface: PROPERTIES, record: 'properties[]', field: 'bedrooms', type: 'number', unit: 'bedrooms', nullable: false, description: 'Bedroom count stored on the listing.' },
  { surface: PROPERTIES, record: 'properties[]', field: 'bathrooms', type: 'number', unit: 'bathrooms', nullable: false, description: 'Bathroom count stored on the listing.' },
  { surface: PROPERTIES, record: 'properties[]', field: 'beach_km', type: 'number', unit: 'km', nullable: true, description: 'Beach distance stored on the listing.' },
  { surface: PROPERTIES, record: 'properties[]', field: 'status', type: 'string', unit: null, nullable: false, description: 'Build status stored on the listing.' },
  { surface: PROPERTIES, record: 'properties[]', field: 'completion', type: 'string', unit: null, nullable: false, description: 'Completion quarter stored on the listing, or TBA when the feed has no delivery date.' },
  { surface: PROPERTIES, record: 'properties[]', field: 'score', type: 'number', unit: '0–100', nullable: true, description: 'Avena Score computed when the book is loaded. Not a read of score_history. Null when the listing was not scored.' },
  { surface: PROPERTIES, record: 'properties[]', field: 'score_confidence', type: 'number', unit: '0–1', nullable: false, description: 'Deterministic adversarial confidence computed with the response. The route passes energy as null into that calculation.' },
  { surface: PROPERTIES, record: 'properties[]', field: 'score_confidence_codes', type: 'string[]', unit: null, nullable: false, description: 'Reason codes from the same confidence calculation. Empty when none apply.' },
  { surface: PROPERTIES, record: 'properties[]', field: 'score_flagged_for_review', type: 'boolean', unit: null, nullable: false, description: 'True when that confidence is below the review threshold in the confidence module.' },
  { surface: PROPERTIES, record: 'properties[]', field: 'yield_gross', type: 'number', unit: 'percent', nullable: true, description: 'Gross yield estimate computed with the score. Null when the listing has no yield.' },
  { surface: PROPERTIES, record: 'properties[]', field: 'yield_net', type: 'number', unit: 'percent', nullable: true, description: 'Net yield estimate computed with the score.' },
  { surface: PROPERTIES, record: 'properties[]', field: 'yield_annual', type: 'number', unit: 'EUR', nullable: true, description: 'Gross annual rent estimate behind the yield.' },
  { surface: PROPERTIES, record: 'properties[]', field: 'url', type: 'string', unit: null, nullable: false, description: 'URL stored on the listing. It is not guaranteed to be an http listing page.' },
  { surface: PROPERTIES, record: 'properties[]', field: 'image', type: 'string', unit: null, nullable: true, description: 'First image URL stored on the listing.' },
  { surface: PROPERTIES, record: 'properties[]', field: 'lat', type: 'number', unit: 'degrees', nullable: true, description: 'Latitude stored on the listing.' },
  { surface: PROPERTIES, record: 'properties[]', field: 'lng', type: 'number', unit: 'degrees', nullable: true, description: 'Longitude stored on the listing.' },
  { surface: PROPERTIES, record: 'properties[]', field: 'country', type: 'string', unit: 'ISO 3166-1 alpha-2', nullable: false, description: 'Country code. The route writes ES when the listing has none.' },
  { surface: PROPERTIES, record: 'properties[]', field: 'country_name', type: 'string', unit: null, nullable: false, description: 'Country name. The route writes Spain when the listing has none.' },
  { surface: PROPERTIES, record: 'properties[]', field: 'currency', type: 'string', unit: 'ISO 4217', nullable: false, description: 'Currency code. The route writes EUR when the listing has none.' },
  { surface: PROPERTIES, record: 'properties[]', field: 'source_portal', type: 'string', unit: null, nullable: true, description: 'Portal name stored on the listing, when the book has one.' },
  { surface: PROPERTIES, record: 'properties[]', field: 'last_synced', type: 'timestamp', unit: 'ISO-8601', nullable: true, description: 'Last sync timestamp stored on the listing, when the book has one.' },
];

const ENVELOPE_FIELDS: DictSeed[] = [
  { surface: PROPERTIES, record: 'response', field: 'total', type: 'integer', unit: 'listings', nullable: false, description: 'Listings matching the filters, before paging. The example is the unfiltered book.' },
  { surface: PROPERTIES, record: 'response', field: 'limit', type: 'integer', unit: 'listings', nullable: false, description: 'Page size. Default 20. The route caps it at 50.' },
  { surface: PROPERTIES, record: 'response', field: 'offset', type: 'integer', unit: 'listings', nullable: false, description: 'Paging offset. Default 0.' },
  { surface: PROPERTIES, record: 'response', field: 'count', type: 'integer', unit: 'listings', nullable: false, description: 'Listings in this page.' },
  { surface: PROPERTIES, record: 'response', field: 'avg_price', type: 'number', unit: 'EUR', nullable: false, description: 'Mean asking price of the page, not of the whole filtered set.' },
  { surface: PROPERTIES, record: 'response', field: 'avg_score', type: 'number', unit: '0–100', nullable: false, description: 'Mean score of scored listings on the page. The route rounds the mean of an empty page to 0.' },
];

const APIP_FIELDS: DictSeed[] = [
  { surface: APIP, record: 'property', field: 'id', type: 'string', unit: null, nullable: false, description: 'Identifier derived from the feed ref by deriveAPIPId. Not the feed ref itself. The default payload\'s ref is the feed ref.' },
  { surface: APIP, record: 'property', field: 'deal_score', type: 'integer', unit: '0–100', nullable: false, description: 'Rounded score, clamped to 0–100. A listing with no score is emitted as 0.' },
  { surface: APIP, record: 'property', field: 'yield_gross', type: 'number', unit: 'percent', nullable: true, description: 'Gross yield, rounded to 2 decimals. Omitted when the listing has no yield.' },
  { surface: APIP, record: 'property', field: 'developer_rating', type: 'string', unit: null, nullable: true, description: 'Present in the APIP schema. toAPIP always sets it undefined, so the JSON omits it. Not populated from this book.' },
  { surface: APIP, record: 'property', field: 'market_regime', type: 'string', unit: null, nullable: true, description: 'Present in the APIP schema. toAPIP always sets it undefined, so the JSON omits it.' },
  { surface: APIP, record: 'property', field: 'liquidity_score', type: 'integer', unit: '0–100', nullable: true, description: 'Present in the APIP schema. toAPIP always sets it undefined, so the JSON omits it.' },
  { surface: APIP, record: 'property', field: 'carbon_rating', type: 'string', unit: null, nullable: true, description: 'Copied from the listing energy letter when that letter is A–G. No separate carbon figure is computed. Omitted otherwise.' },
  { surface: APIP, record: 'property', field: 'apci_at_listing', type: 'number', unit: null, nullable: true, description: 'Present in the APIP schema. toAPIP always sets it undefined, so the JSON omits it.' },
  { surface: APIP, record: 'property', field: 'location.town', type: 'string', unit: null, nullable: false, description: 'Text before the comma in the location string.' },
  { surface: APIP, record: 'property', field: 'location.region', type: 'string', unit: null, nullable: false, description: 'Costa name, or the region code when the listing has no costa.' },
  { surface: APIP, record: 'property', field: 'location.country', type: 'string', unit: 'ISO 3166-1 alpha-2', nullable: false, description: 'Country code. ES when the listing has none.' },
  { surface: APIP, record: 'property', field: 'location.coordinates.lat', type: 'number', unit: 'degrees', nullable: true, description: 'Latitude. The coordinates object is omitted unless both lat and lng are present.' },
  { surface: APIP, record: 'property', field: 'location.coordinates.lng', type: 'number', unit: 'degrees', nullable: true, description: 'Longitude. Omitted with coordinates when either value is missing.' },
  { surface: APIP, record: 'property', field: 'location.beach_km', type: 'number', unit: 'km', nullable: true, description: 'Beach distance. Omitted when the listing has none.' },
  { surface: APIP, record: 'property', field: 'pricing.asking_price', type: 'number', unit: 'EUR', nullable: false, description: 'Asking price.' },
  { surface: APIP, record: 'property', field: 'pricing.price_per_m2', type: 'number', unit: 'EUR/m²', nullable: true, description: 'Asking price per square metre. Omitted when absent or zero.' },
  { surface: APIP, record: 'property', field: 'pricing.market_reference', type: 'number', unit: 'EUR/m²', nullable: true, description: 'The listing benchmark price per square metre (mm2). Omitted when absent or zero.' },
  { surface: APIP, record: 'property', field: 'pricing.currency', type: 'string', unit: 'ISO 4217', nullable: false, description: 'Currency. EUR when the listing has none.' },
  { surface: APIP, record: 'property', field: 'pricing.raw_price_local', type: 'number', unit: 'local currency', nullable: true, description: 'Pre-conversion price. Omitted when the listing has none. This book\'s rows do not carry it.' },
  { surface: APIP, record: 'property', field: 'specifications.built_m2', type: 'number', unit: 'm²', nullable: true, description: 'Built area. Omitted when absent or zero.' },
  { surface: APIP, record: 'property', field: 'specifications.bedrooms', type: 'number', unit: 'bedrooms', nullable: true, description: 'Bedrooms. Omitted when null.' },
  { surface: APIP, record: 'property', field: 'specifications.bathrooms', type: 'number', unit: 'bathrooms', nullable: true, description: 'Bathrooms. Omitted when null.' },
  { surface: APIP, record: 'property', field: 'specifications.pool', type: 'string', unit: null, nullable: true, description: 'Mapped to private, communal, or none. Other stored values are omitted.' },
  { surface: APIP, record: 'property', field: 'specifications.energy', type: 'string', unit: null, nullable: true, description: 'Energy letter A–G, or pending when a value is present but not a letter. Omitted when the listing has none.' },
  { surface: APIP, record: 'property', field: 'specifications.status', type: 'string', unit: null, nullable: true, description: 'Mapped to off_plan, under_construction, key_ready, or resale. Unrecognised status text is omitted.' },
  { surface: APIP, record: 'property', field: 'source.portal', type: 'string', unit: null, nullable: true, description: 'Portal stored on the listing. The source object is omitted when portal, source ref, last sync, and URL are all empty.' },
  { surface: APIP, record: 'property', field: 'source.source_ref', type: 'string', unit: null, nullable: true, description: 'Source reference stored on the listing.' },
  { surface: APIP, record: 'property', field: 'source.last_synced', type: 'timestamp', unit: 'ISO-8601', nullable: true, description: 'Last sync timestamp stored on the listing.' },
  { surface: APIP, record: 'property', field: 'source.url', type: 'string', unit: null, nullable: true, description: 'URL stored on the listing.' },
];

const EXPORT_FIELDS: DictSeed[] = [
  { surface: EXPORT, record: 'row', field: 'ref', type: 'string', unit: null, nullable: false, description: 'Feed ref, or the development ref when the feed ref is missing. Empty string when both are missing.' },
  { surface: EXPORT, record: 'row', field: 'type', type: 'string', unit: null, nullable: false, description: 'Property type.' },
  { surface: EXPORT, record: 'row', field: 'town', type: 'string', unit: null, nullable: false, description: 'Location string as stored.' },
  { surface: EXPORT, record: 'row', field: 'region', type: 'string', unit: null, nullable: false, description: 'Region code, not the costa name. The properties API region field prefers the costa name.' },
  { surface: EXPORT, record: 'row', field: 'price', type: 'number', unit: 'EUR', nullable: false, description: 'Asking price.' },
  { surface: EXPORT, record: 'row', field: 'price_m2', type: 'number', unit: 'EUR/m²', nullable: true, description: 'Asking price per square metre.' },
  { surface: EXPORT, record: 'row', field: 'score', type: 'number', unit: '0–100', nullable: true, description: 'Score computed when the book is loaded.' },
  { surface: EXPORT, record: 'row', field: 'yield_gross', type: 'number', unit: 'percent', nullable: true, description: 'Gross yield estimate.' },
  { surface: EXPORT, record: 'row', field: 'beds', type: 'number', unit: 'bedrooms', nullable: false, description: 'Bedroom count.' },
  { surface: EXPORT, record: 'row', field: 'baths', type: 'number', unit: 'bathrooms', nullable: false, description: 'Bathroom count.' },
  { surface: EXPORT, record: 'row', field: 'm2', type: 'number', unit: 'm²', nullable: false, description: 'Built area.' },
  { surface: EXPORT, record: 'row', field: 'beach_km', type: 'number', unit: 'km', nullable: true, description: 'Beach distance.' },
  { surface: EXPORT, record: 'row', field: 'developer', type: 'string', unit: null, nullable: false, description: 'Source label, not a promoter name.' },
  { surface: EXPORT, record: 'row', field: 'status', type: 'string', unit: null, nullable: false, description: 'Build status.' },
  { surface: EXPORT, record: 'row', field: 'energy', type: 'string', unit: null, nullable: true, description: 'Energy rating stored on the listing.' },
  { surface: EXPORT, record: 'row', field: 'pool', type: 'string', unit: null, nullable: true, description: 'Pool value stored on the listing.' },
  { surface: EXPORT, record: 'row', field: 'source', type: 'string', unit: null, nullable: false, description: 'Constant attribution string written by this route on every row.' },
  { surface: EXPORT, record: 'row', field: 'doi', type: 'string', unit: null, nullable: false, description: 'Constant DOI string written by this route on every row. The open-dataset manifest describes that DOI as an earlier snapshot, not the current observation file.' },
];

const AGG_FIELDS: DictSeed[] = [
  { surface: AGG, record: 'response', field: 'version', type: 'string', unit: null, nullable: false, description: 'Literal version written by this route. It is not the version in /open-data/dataset.json.' },
  { surface: AGG, record: 'response', field: 'license', type: 'string', unit: null, nullable: false, description: 'License URL written by this route.' },
  { surface: AGG, record: 'data.town_statistics[]', field: 'town', type: 'string', unit: null, nullable: false, description: 'Full location string from the listing book, including the province. Not the town-only name used in towns.csv.' },
  { surface: AGG, record: 'data.town_statistics[]', field: 'count', type: 'integer', unit: 'listings', nullable: false, description: 'Listings with that location string.' },
  { surface: AGG, record: 'data.town_statistics[]', field: 'avg_price', type: 'number', unit: 'EUR', nullable: false, description: 'Mean asking price, rounded. The route emits 0 when the input list is empty.' },
  { surface: AGG, record: 'data.town_statistics[]', field: 'avg_yield', type: 'number', unit: 'percent', nullable: false, description: 'Mean gross yield, one decimal. 0 when the location has no yield estimates.' },
  { surface: AGG, record: 'data.town_statistics[]', field: 'avg_score', type: 'number', unit: '0–100', nullable: false, description: 'Mean score, rounded. 0 when the location has no scores.' },
  { surface: AGG, record: 'data.town_statistics[]', field: 'avg_pm2', type: 'number', unit: 'EUR/m²', nullable: false, description: 'Mean asking price per square metre, rounded.' },
  { surface: AGG, record: 'data.town_statistics[]', field: 'source', type: 'string', unit: null, nullable: false, description: 'Constant attribution written on every aggregate row.' },
  { surface: AGG, record: 'data.town_statistics[]', field: 'license', type: 'string', unit: null, nullable: false, description: 'Constant license string written on every aggregate row.' },
  { surface: AGG, record: 'data.costa_statistics[]', field: 'costa', type: 'string', unit: null, nullable: false, description: 'Costa label from the listing book.' },
  { surface: AGG, record: 'data.costa_statistics[]', field: 'count', type: 'integer', unit: 'listings', nullable: false, description: 'Listings in that costa.' },
  { surface: AGG, record: 'data.costa_statistics[]', field: 'avg_price', type: 'number', unit: 'EUR', nullable: false, description: 'Mean asking price in the costa, rounded.' },
  { surface: AGG, record: 'data.costa_statistics[]', field: 'avg_yield', type: 'number', unit: 'percent', nullable: false, description: 'Mean gross yield in the costa. 0 when none of the listings have a yield.' },
  { surface: AGG, record: 'data.costa_statistics[]', field: 'avg_score', type: 'number', unit: '0–100', nullable: false, description: 'Mean score in the costa. 0 when none of the listings have a score.' },
  { surface: AGG, record: 'data.costa_statistics[]', field: 'avg_pm2', type: 'number', unit: 'EUR/m²', nullable: false, description: 'Mean asking price per square metre in the costa, rounded.' },
  { surface: AGG, record: 'data.costa_statistics[]', field: 'source', type: 'string', unit: null, nullable: false, description: 'Constant attribution written on every aggregate row.' },
  { surface: AGG, record: 'data.costa_statistics[]', field: 'license', type: 'string', unit: null, nullable: false, description: 'Constant license string written on every aggregate row.' },
  { surface: AGG, record: 'data.property_type_distribution[]', field: 'type', type: 'string', unit: null, nullable: false, description: 'Property type.' },
  { surface: AGG, record: 'data.property_type_distribution[]', field: 'count', type: 'integer', unit: 'listings', nullable: false, description: 'Listings of that type.' },
  { surface: AGG, record: 'data.property_type_distribution[]', field: 'pct', type: 'number', unit: 'percent', nullable: false, description: 'Share of the book, one decimal.' },
  { surface: AGG, record: 'data.price_band_distribution[]', field: 'band', type: 'string', unit: null, nullable: false, description: 'Asking-price band label defined in the route.' },
  { surface: AGG, record: 'data.price_band_distribution[]', field: 'count', type: 'integer', unit: 'listings', nullable: false, description: 'Listings in that band. The top of each band is exclusive.' },
  { surface: AGG, record: 'data.score_distribution[]', field: 'band', type: 'string', unit: null, nullable: false, description: 'Score band label defined in the route.' },
  { surface: AGG, record: 'data.score_distribution[]', field: 'count', type: 'integer', unit: 'listings', nullable: false, description: 'Scored listings in that band.' },
  { surface: AGG, record: 'data.yield_distribution[]', field: 'band', type: 'string', unit: null, nullable: false, description: 'Gross-yield band label defined in the route.' },
  { surface: AGG, record: 'data.yield_distribution[]', field: 'count', type: 'integer', unit: 'listings', nullable: false, description: 'Listings whose gross yield falls in that band.' },
  { surface: AGG, record: 'data.index_values', field: 'apci_composite', type: 'number', unit: null, nullable: false, description: 'A single number this route computes from the book averages. It is not the APCI series published at /avena-index.' },
  { surface: AGG, record: 'data.index_values', field: 'avg_investment_score', type: 'number', unit: '0–100', nullable: false, description: 'Mean score of scored listings, one decimal.' },
  { surface: AGG, record: 'data.index_values', field: 'avg_price', type: 'number', unit: 'EUR', nullable: false, description: 'Mean asking price of the book, rounded.' },
  { surface: AGG, record: 'data.index_values', field: 'avg_yield', type: 'number', unit: 'percent', nullable: false, description: 'Mean gross yield of listings that have one, two decimals.' },
  { surface: AGG, record: 'data.index_values', field: 'avg_pm2', type: 'number', unit: 'EUR/m²', nullable: false, description: 'Mean asking price per square metre, rounded.' },
  { surface: AGG, record: 'data.index_values', field: 'total_properties', type: 'integer', unit: 'listings', nullable: false, description: 'Listings in the book used to build the response.' },
  { surface: AGG, record: 'data.index_values', field: 'scored_properties', type: 'integer', unit: 'listings', nullable: false, description: 'Listings that have a score.' },
  { surface: AGG, record: 'data.index_values', field: 'date', type: 'date', unit: 'YYYY-MM-DD', nullable: false, description: 'UTC date of the request, not the feed generation date.' },
];

export function buildDictionary(props: Property[], manifest: unknown, today: string): DictionaryField[] {
  const towns = firstRow('public/open-data/towns.json');
  const ledger = firstRow('public/open-data/movement-ledger.json');
  const moves = firstRow('public/open-data/moves.json');
  const tombs = firstRow('public/open-data/tombstones.json');
  const rowFor = (record: string) => {
    if (record.startsWith('towns')) return towns;
    if (record.startsWith('movement-ledger')) return ledger;
    if (record.startsWith('moves')) return moves;
    if (record.startsWith('tombstones')) return tombs;
    return null;
  };
  const open = OPEN_FIELDS.map((seed) => field(seed, rowFor(seed.record)?.[seed.field] ?? null));
  const manifestFields = MANIFEST_FIELDS.map((seed) => field(seed, atPath(manifest, seed.path)));
  const api = propertiesExample(props);
  const listingFields = LISTING_FIELDS.map((seed) => field(seed, api.listing[seed.field] ?? null));
  const envelopeFields = ENVELOPE_FIELDS.map((seed) => field(seed, api.envelope[seed.field] ?? null));
  const flat: Record<string, unknown> = {};
  if (props[0]) flatten(toAPIP(props[0]).property, '', flat);
  const apipFields = APIP_FIELDS.map((seed) => field(seed, Object.prototype.hasOwnProperty.call(flat, seed.field) ? flat[seed.field] : null));
  const exported = exportExample(props[0]);
  const exportFields = EXPORT_FIELDS.map((seed) => field(seed, exported[seed.field] ?? null));
  const agg = aggregateExamples(props, today);
  const aggFields = AGG_FIELDS.map((seed) => {
    const key = seed.record === 'response' ? seed.field : `${seed.record.replace('[]', '')}.${seed.field}`;
    return field(seed, agg[key] ?? null);
  });
  return [...open, ...manifestFields, ...listingFields, ...envelopeFields, ...apipFields, ...exportFields, ...aggFields];
}

export function sampleMovesCsv(text: string, rows = SAMPLE_MOVE_ROWS): string {
  const lines = text.split(/\r?\n/);
  const header = lines[0] ?? '';
  const data = lines.slice(1).filter((line) => line.trim().length > 0).slice(0, rows);
  return `${[header, ...data].join('\n')}\n`;
}

export function readSampleCsv(): string {
  const text = readFileSync(path.join(process.cwd(), SAMPLE_SOURCE), 'utf8');
  return sampleMovesCsv(text);
}

function datasetDates(detail: string | null): { site: OrNA<string>; mirror: OrNA<string> } {
  if (!detail) return { site: NOT_AVAILABLE, mirror: NOT_AVAILABLE };
  const site = detail.match(/site (\d{4}-\d{2}-\d{2}|unknown)/);
  const mirror = detail.match(/avena-data (\d{4}-\d{2}-\d{2}|unknown)/);
  return {
    site: site && site[1] !== 'unknown' ? site[1] : NOT_AVAILABLE,
    mirror: mirror && mirror[1] !== 'unknown' ? mirror[1] : NOT_AVAILABLE,
  };
}

export function buildPipeline(health: HealthReport | null, officialAt: string | null, supplyAt: string | null = null, townAt: string | null = null, hpiAt: string | null = null, rentsAt: string | null = null): PipelineStep[] {
  const feed = health?.checks.find((c) => c.id === 'feed') ?? null;
  const capture = health?.checks.find((c) => c.id === 'capture') ?? null;
  const workflows = health?.checks.find((c) => c.id === 'workflows') ?? null;
  const workflowDetail = workflows?.detail ?? null;
  return [
    {
      id: 'feed-refresh',
      name: 'Feed refresh',
      cadence: 'GitHub Actions feed-refresh.yml at 01:37 UTC and 05:10 UTC, plus workflow_dispatch.',
      what: 'Refreshes the listing book in public/data.json from the daily capture and rebuilds the open-data observation files. After the book is deployed it calls /api/cron/pricing-history and /api/cron/scribe.',
      source_file: '.github/workflows/feed-refresh.yml',
      last_observed: feed?.observed ?? NOT_AVAILABLE,
      last_observed_kind: 'feed-meta.json generated_at, from the /api/health feed check. This is the capture artifact time, not the GitHub run start.',
      health_status: feed?.status ?? NOT_AVAILABLE,
      health_detail: feed?.detail ?? NOT_AVAILABLE,
    },
    {
      id: 'price-capture',
      name: 'Daily price capture',
      cadence: 'Vercel cron /api/cron/pricing-history at 02:20 UTC and 14:30 UTC. feed-refresh.yml also calls that route after the new book is deployed. The cron can run before that deploy.',
      what: 'Writes price_snapshots for the current UTC day from the deployed listing book and diffs asking prices against the previous trusted day. Same-unit checks are applied there.',
      source_file: 'vercel.json',
      last_observed: capture?.observed ?? NOT_AVAILABLE,
      last_observed_kind: 'Latest price_snapshots.snapshot_date from the /api/health capture check. A date, not the clock time of the job. The job clock time is not in /api/health.',
      health_status: capture?.status ?? NOT_AVAILABLE,
      health_detail: capture?.detail ?? NOT_AVAILABLE,
    },
    {
      id: 'capture-backstop',
      name: 'Capture backstop',
      cadence: 'GitHub Actions capture-backstop.yml at 07:00 UTC and 09:00 UTC.',
      what: 'Checks whether today\'s capture is missing and, only if it is, dispatches feed-refresh. It does not reconstruct an earlier day that was never stored.',
      source_file: '.github/workflows/capture-backstop.yml',
      last_observed: NOT_AVAILABLE,
      last_observed_kind: 'The run timestamp is not in /api/health. That payload only carries the latest completed-run conclusion.',
      health_status: workflows?.status ?? NOT_AVAILABLE,
      health_detail: workflowDetail
        ? `Workflows check from /api/health (feed-refresh, capture-backstop, and tests together): ${workflowDetail}`
        : NOT_AVAILABLE,
    },
    {
      id: 'es-official',
      name: 'Spain official benchmark',
      cadence: 'GitHub Actions es-official-refresh.yml on Wednesday at 04:40 UTC.',
      what: 'Rebuilds data/es-official.json from INE housing price index table 79563 and the Ministerio de Vivienda y Agenda Urbana appraisal file. Separate from the listing history. The Registradores series is recorded as not ingested when the portal refuses the job.',
      source_file: '.github/workflows/es-official-refresh.yml',
      last_observed: officialAt ?? NOT_AVAILABLE,
      last_observed_kind: officialAt
        ? 'data/es-official.json generated_at on this deployment. /api/health does not watch es-official-refresh.yml, so the GitHub run timestamp is not available.'
        : 'not available. /api/health does not watch es-official-refresh.yml, and data/es-official.json had no generated_at.',
      health_status: NOT_AVAILABLE,
      health_detail: NOT_AVAILABLE,
    },
    {
      id: 'es-supply',
      name: 'Spain supply pipeline',
      cadence: 'GitHub Actions es-supply-refresh.yml on Thursday at 04:15 UTC.',
      what: 'Rebuilds data/es-supply.json from the housing ministry file of estimated free-market dwellings started and finished (VDP005_01) and INE table 6150, registered sales of new dwellings. Separate from the listing history. The raw visado bulletin is HTML and is not ingested. The ministry notarial transaction file is recorded as not ingested when it prints two counts for one province and quarter.',
      source_file: '.github/workflows/es-supply-refresh.yml',
      last_observed: supplyAt ?? NOT_AVAILABLE,
      last_observed_kind: supplyAt
        ? 'data/es-supply.json generated_at on this deployment. /api/health does not watch es-supply-refresh.yml, so the GitHub run timestamp is not available.'
        : 'not available. /api/health does not watch es-supply-refresh.yml, and data/es-supply.json had no generated_at.',
      health_status: NOT_AVAILABLE,
      health_detail: NOT_AVAILABLE,
    },
    {
      id: 'es-town-gap',
      name: 'Spain municipal appraisal',
      cadence: 'GitHub Actions es-town-gap-refresh.yml on Friday at 04:25 UTC.',
      what: 'Rebuilds data/es-town-gap.json from the ministry statistical bulletin of appraised €/m² for municipalities of more than 25,000 inhabitants. The up-to-five-years column is the comparison with new-build asking prices. It is an appraisal, not a transaction price. The Notariado portal is not fetched. The Registradores series is recorded as not ingested when the portal refuses the job.',
      source_file: '.github/workflows/es-town-gap-refresh.yml',
      last_observed: townAt ?? NOT_AVAILABLE,
      last_observed_kind: townAt
        ? 'data/es-town-gap.json generated_at on this deployment. /api/health does not watch es-town-gap-refresh.yml, so the GitHub run timestamp is not available.'
        : 'not available. /api/health does not watch es-town-gap-refresh.yml, and data/es-town-gap.json had no generated_at.',
      health_status: NOT_AVAILABLE,
      health_detail: NOT_AVAILABLE,
    },
    {
      id: 'eu-hpi',
      name: 'Eurostat house price index',
      cadence: 'GitHub Actions eu-hpi-refresh.yml on Monday at 04:50 UTC.',
      what: 'Rebuilds data/eu-hpi.json from Eurostat dataset prc_hpi_q (new dwellings and total, quarterly index and annual rate of change) for Spain, Portugal, the EU aggregate and the euro area, and records the median asking EUR/m2 of the committed listing book. Asking prices are not transaction prices. If Eurostat does not parse, the previous file stays.',
      source_file: '.github/workflows/eu-hpi-refresh.yml',
      last_observed: hpiAt ?? NOT_AVAILABLE,
      last_observed_kind: hpiAt
        ? 'data/eu-hpi.json generated_at on this deployment. /api/health does not watch eu-hpi-refresh.yml, so the GitHub run timestamp is not available.'
        : 'not available. /api/health does not watch eu-hpi-refresh.yml, and data/eu-hpi.json had no generated_at.',
      health_status: NOT_AVAILABLE,
      health_detail: NOT_AVAILABLE,
    },
    {
      id: 'es-rents',
      name: 'Spain rent benchmark',
      cadence: 'GitHub Actions es-rents-refresh.yml on Tuesday at 04:35 UTC.',
      what: 'Rebuilds data/es-rents.json from the ministry SERPAVI workbook of habitual-residence rents and INE rental-price index table 59058. The implied yield is derived. Census sections and districts in the workbook are not ingested. Separate from the listing history.',
      source_file: '.github/workflows/es-rents-refresh.yml',
      last_observed: rentsAt ?? NOT_AVAILABLE,
      last_observed_kind: rentsAt
        ? 'data/es-rents.json generated_at on this deployment. /api/health does not watch es-rents-refresh.yml, so the GitHub run timestamp is not available.'
        : 'not available. /api/health does not watch es-rents-refresh.yml, and data/es-rents.json had no generated_at.',
      health_status: NOT_AVAILABLE,
      health_detail: NOT_AVAILABLE,
    },
  ];
}

function unitIdentityText(): string {
  return `A developer often advertises several units of one building under a single listing reference and changes which unit it shows. A change in asking price counts as a price move only when it is the same unit: same property type, bedrooms and bathrooms, and built and plot size within ${Math.round(SIZE_TOL * 100)}%. When the specification changed, the row is recorded as a unit change and excluded from move counts. A move of ${Math.round(LARGE_MOVE * 100)}% or more also needs full specs on both sides, the same photo set, a new EUR/m² within ${PM2_BAND[0]}–${PM2_BAND[1]}× the area benchmark, and must not return exactly to an asking price the listing showed in the previous ${RECUR_DAYS} days; otherwise it is marked unverified and not counted. Every observation is kept. The verdict is stored on the row.`;
}

function quality() {
  return {
    history_starts: LEDGER_EPOCH,
    history_start_note: `The published observation ledger begins ${LEDGER_EPOCH}, the day price capture was pointed at the live feed. Earlier internal tables repeated a frozen snapshot and are excluded. Snapshots before that date are not in the open dataset.`,
    declared_capture_gaps: KNOWN_GAPS,
    declared_capture_gap_note: 'The sell-through monitor records this gap: no snapshots on these dates after a feed outage. Listings last seen the day before the gap and absent the day after left on an unknown date inside the gap and are flagged as exits in that gap. The ledger gaps below are computed from the published movement ledger on this deployment, which can show the same gap and any further gap.',
    unit_identity: unitIdentityText(),
    move_status_since: MOVE_STATUS_SINCE,
    move_status_note: `Snapshot rows carry move_status from ${MOVE_STATUS_SINCE}. moves.csv drops a change only when that status is unit_changed or unverified. A row with no status is not dropped. History from before that date was not reclassified.`,
    excluded: [
      'Registered transaction prices. Spanish unit-level sale prices are not in this dataset. Figures are asking prices.',
      'Days with no capture, including the declared gap. Those days are absent. They are not filled.',
      `Snapshots before ${LEDGER_EPOCH}.`,
      'Unit changes and unverified large moves, from moves.csv and from move counts. The snapshot row is kept.',
      'Towns with fewer than 5 live listings, from towns.csv only. They remain in the listing book and on the listings API.',
      'Listing descriptions, image files, listing URLs, and project or promoter names, from the open observation files. The current book at /data.json still contains description text and image URLs.',
      'Promoter company names. They are not in the feed.',
      'The resale market and the separate Spain official statistics files. This book is new-build listings from the daily capture.',
    ],
  };
}

function pointInTime() {
  return {
    summary: 'Asking-price history is a calendar of observations. A stored day is the book captured for that UTC date. Missed days stay missed. Scores on the live API are computed at read time and are not that history.',
    asking_prices: 'price_snapshots is written for the current UTC day, one row per listing ref and date. A later capture on the same UTC day upserts that day\'s row, so the same day can be replaced. The job does not write earlier dates. score rows in score_history are not rewritten: the scribe upsert ignores a row that already exists for that ref and date.',
    backfill: 'A calendar day that was not captured is not backfilled. The capture backstop only dispatches a fresh capture when today is missing. It cannot invent the book for a day that has already passed without a snapshot.',
    stored_scores: `score_history is written by /api/cron/scribe. The Vercel cron is 03:05 UTC (5 3 * * *), and feed-refresh.yml calls the same route after a deploy. Existing rows are not updated. Rows dated before ${SCRIBE_SEAM} can be filed one day after the book they describe. The route dates rows from the feed file after that seam and does not rewrite the earlier rows.`,
    live_api_scores: 'score, yield, and score_confidence on GET /api/v1/properties are computed when the response is built. They are not a read of score_history. A methodology change changes the live score without rewriting stored history.',
    open_dataset: `The open dataset is rebuilt from snapshots on or after ${LEDGER_EPOCH} and from the listing book at build time. Rebuilding it does not create rows for dates that have no snapshot. A same-day replacement of today's snapshot is what a later build of that same day will contain.`,
    scribe_last_run: NOT_AVAILABLE,
    scribe_last_run_reason: '/api/health does not report the scribe job, so its last-run timestamp is not available.',
  };
}

function delivery(mirror: OrNA<string>): DeliveryOption[] {
  return [
    { id: 'properties', method: 'GET', path: '/api/v1/properties', format: 'JSON', auth: 'API key required. A request with no key is rejected.', note: 'Listing page, default 20 rows, cap 50. format=apip returns the APIP shape of the same page. Pricing on request. See /license and /access.' },
    { id: 'dataset-export', method: 'GET', path: '/api/v1/dataset-export', format: 'JSON. CSV with ?format=csv. JSONL wrappers with ?format=kaggle and ?format=huggingface.', auth: 'No key on this route.', note: 'Column subset of the current listing book. The kaggle and huggingface query values change the file shape. They do not mean this response was fetched from those sites.' },
    { id: 'open-dataset-api', method: 'GET', path: '/api/v1/open-dataset', format: 'JSON', auth: 'No key.', note: 'Aggregate counts for the current book. No listing rows.' },
    { id: 'open-data-files', method: 'GET', path: '/open-data/dataset.json', format: 'JSON and CSV', auth: 'No key.', note: 'Observation files: dataset.json, towns.csv, towns.json, movement-ledger.csv, movement-ledger.json, moves.csv, moves.json, tombstones.csv, tombstones.json.' },
    { id: 'git-mirror', method: 'GET', path: 'https://github.com/HenrikKolstad/avena-data', format: 'git, market/ directory', auth: 'Public repository.', note: `Mirror of the observation files. /api/health compares market/dataset.json. Latest mirror date from this health read: ${mirror}.` },
    { id: 'listing-book', method: 'GET', path: '/data.json', format: 'JSON', auth: 'No key.', note: 'Current listing book used by the site, including description text and image URLs that the open observation files omit. It is the current cross-section, not the price history.' },
    { id: 'sample', method: 'GET', path: '/api/v1/due-diligence/sample', format: 'CSV', auth: 'No key.', note: `First ${SAMPLE_MOVE_ROWS} data rows of ${SAMPLE_SOURCE}, unchanged.` },
    { id: 'spain-official', method: 'GET', path: '/spain/official', format: 'HTML. Source file data/es-official.json.', auth: 'No key.', note: 'Weekly official benchmark. Not the listing history.' },
    { id: 'spain-supply', method: 'GET', path: '/spain/supply', format: 'HTML. Source file data/es-supply.json. JSON at /api/v1/es-supply.', auth: 'No key.', note: 'Weekly supply pipeline. Ministry starts and completions, and INE registered sales of new dwellings. Not the listing history.' },
    { id: 'spain-towns', method: 'GET', path: '/spain/towns', format: 'HTML. Source file data/es-town-gap.json. JSON at /api/v1/es-town-gap.', auth: 'No key.', note: 'Weekly municipal appraisal. Asking prices beside the ministry appraisal for municipalities over 25,000 inhabitants. Not a transaction price and not the listing history.' },
    { id: 'europe-official', method: 'GET', path: '/europe/official', format: 'HTML. Source file data/eu-hpi.json. JSON at /api/v1/eu-hpi.', auth: 'No key.', note: 'Weekly Eurostat house price index beside Avena asking prices. Not a transaction price and not the listing history.' },
    { id: 'spain-rents', method: 'GET', path: '/spain/rents', format: 'HTML. Source file data/es-rents.json. JSON at /api/v1/es-rents.', auth: 'No key.', note: 'Weekly habitual-residence rents from the ministry SERPAVI workbook and the INE rental-price index. Not the listing history.' },
    { id: 'huggingface', method: 'GET', path: 'https://huggingface.co/datasets/AVENATERMINAL/spain-new-build-properties-2026', format: 'Hugging Face dataset', auth: 'Public page.', note: 'feed-refresh.yml uploads the open-data files here when HF_TOKEN is set, and leaves the existing copy when it is not. /api/health does not report this copy. Freshness is not available.' },
  ];
}

function licensing(published: PublishedDataset): DueDiligencePack['licensing'] {
  const zenodoNote = isRecord(published.zenodo) && typeof published.zenodo.note === 'string'
    ? published.zenodo.note
    : 'The Zenodo note could not be read from the manifest.';
  const manifestLicense = published.license === NOT_AVAILABLE
    ? 'The observation manifest could not be read, so the license string on that file is not available.'
    : `The observation manifest on this deployment says license ${published.license}${published.attribution === NOT_AVAILABLE ? '' : ` and attribution "${published.attribution}"`}.`;
  return {
    open_observations: `${manifestLicense} The license page states that aggregate datasets, research papers, and training data published by Avena Terminal are under CC BY 4.0, with attribution to Avena Terminal (avenaterminal.com).`,
    zenodo: zenodoNote,
    listings_api: 'The keyed listings API is covered by the API section of /license. This pack does not restate tiers. Commercial terms: Pricing on request.',
    access_href: '/access',
    license_href: '/license',
    sourcing: [
      'Listings are Avena\'s daily capture of agency-marketed new-build asking prices.',
      'Prices in the listing book and the observation files are asking prices. A delisting means the ref left the observed feed. It is not a notarised sale.',
      `The observation ledger used for the open dataset starts on ${LEDGER_EPOCH}. Earlier repeated snapshots are excluded.`,
      'The Spain official file is a separate weekly pull from INE table 79563 and the housing ministry appraisal file. Its omissions, including sources the job could not read, are in that file.',
      'The Spain supply file is a separate weekly pull from ministry dataset VDP005_01 and INE table 6150. Sources the job could not read are omissions in that file. It is not the listing book.',
      'The Spain municipal file is a separate weekly pull from the ministry bulletin of appraised €/m² for municipalities of more than 25,000 inhabitants. It is not a transaction price. Sources the job could not read are omissions in that file.',
      'The Eurostat house price file is a separate weekly pull of dataset prc_hpi_q. It is an official transaction-price index. The asking-price tape in that file is the median of the committed listing book. It is not a transaction price.',
      'The Spain rent file is a separate weekly pull from the ministry SERPAVI workbook and INE table 59058. The implied yield in that file is derived. Sources the job did not read are omissions in that file.',
      zenodoNote,
    ],
  };
}

function unavailable(pack: Omit<DueDiligencePack, 'not_available'>): UnavailableNote[] {
  const notes: UnavailableNote[] = [];
  const add = (fieldName: string, value: unknown, reason: string) => {
    if (value === NOT_AVAILABLE) notes.push({ field: fieldName, reason });
  };
  add('coverage.feed.feed_generated_at', pack.coverage.feed.feed_generated_at, 'public/feed-meta.json had no generated_at.');
  add('coverage.feed.promoter_names', pack.coverage.feed.promoter_names, pack.coverage.feed.promoter_names_reason);
  add('coverage.price_history.first_date', pack.coverage.price_history.first_date, pack.coverage.price_history.reason ?? 'Live price_snapshots range was not read.');
  add('coverage.price_history.latest_date', pack.coverage.price_history.latest_date, pack.coverage.price_history.reason ?? 'Live price_snapshots range was not read.');
  add('coverage.price_history.observed_days', pack.coverage.price_history.observed_days, pack.coverage.price_history.reason ?? 'Live observation-day count was not reconciled.');
  add('coverage.ledger_gaps', pack.coverage.ledger_gaps, 'public/open-data/movement-ledger.json could not be read as a list of days.');
  add('health_checked_at', pack.health_checked_at, 'The /api/health collector did not return a report.');
  for (const step of pack.pipeline) {
    add(`pipeline.${step.id}.last_observed`, step.last_observed, step.last_observed_kind);
    add(`pipeline.${step.id}.health_status`, step.health_status, '/api/health did not return a status for this step.');
  }
  add('point_in_time.scribe_last_run', pack.point_in_time.scribe_last_run, pack.point_in_time.scribe_last_run_reason);
  notes.push(
    { field: 'pipeline.price-capture.run_clock_time', reason: '/api/health reports the latest snapshot date, not the clock time the capture job ran.' },
    { field: 'pipeline.capture-backstop.run_clock_time', reason: '/api/health reports the workflow conclusion, not the run timestamp.' },
    { field: 'pipeline.es-official.github_run_timestamp', reason: '/api/health does not watch es-official-refresh.yml. A generated_at on data/es-official.json is the artifact on this deployment, not a GitHub run timestamp.' },
    { field: 'pipeline.es-supply.github_run_timestamp', reason: '/api/health does not watch es-supply-refresh.yml. A generated_at on data/es-supply.json is the artifact on this deployment, not a GitHub run timestamp.' },
    { field: 'pipeline.es-town-gap.github_run_timestamp', reason: '/api/health does not watch es-town-gap-refresh.yml. A generated_at on data/es-town-gap.json is the artifact on this deployment, not a GitHub run timestamp.' },
    { field: 'pipeline.eu-hpi.github_run_timestamp', reason: '/api/health does not watch eu-hpi-refresh.yml. A generated_at on data/eu-hpi.json is the artifact on this deployment, not a GitHub run timestamp.' },
    { field: 'pipeline.es-rents.github_run_timestamp', reason: '/api/health does not watch es-rents-refresh.yml. A generated_at on data/es-rents.json is the artifact on this deployment, not a GitHub run timestamp.' },
    { field: 'delivery.huggingface.freshness', reason: 'Not in /api/health. The feed workflow uploads this copy only when a token is set.' },
  );
  return notes;
}

export function assembleDueDiligence(args: {
  now: Date;
  props: Property[];
  feedGeneratedAt: string | null;
  published: PublishedDataset;
  manifest: unknown;
  ledgerDates: string[] | null;
  officialGeneratedAt: string | null;
  supplyGeneratedAt: string | null;
  townGeneratedAt?: string | null;
  hpiGeneratedAt?: string | null;
  rentsGeneratedAt?: string | null;
  health: HealthReport | null;
  snapshot: { client: boolean; min: string | null; max: string | null; error: string | null };
}): DueDiligencePack {
  const today = args.now.toISOString().slice(0, 10);
  const feed = coverageFromFeed(args.props, args.feedGeneratedAt);
  const price_history = priceHistoryFromQuery({ ...args.snapshot, ledgerDates: args.ledgerDates });
  const ledger_gaps = args.ledgerDates ? findMissingRanges(args.ledgerDates) : NOT_AVAILABLE;
  const datasetCheck = args.health?.checks.find((c) => c.id === 'dataset') ?? null;
  const mirror = datasetDates(datasetCheck?.detail ?? null).mirror;
  const partial: Omit<DueDiligencePack, 'not_available'> = {
    generated_at: args.now.toISOString(),
    title: 'Dataset due diligence',
    overview: 'Due-diligence pack for the Spanish coastal new-build listing book and the observation ledger published with it. Listing counts are computed from the book on this deployment. The price-history range is read from price_snapshots when a database client is configured. The published open-data file is reported separately and is not used to fill a failed database read. A figure that cannot be computed is not available.',
    coverage: {
      feed,
      price_history,
      published_open_dataset: args.published,
      ledger_gaps,
      ledger_gaps_source: args.ledgerDates ? 'public/open-data/movement-ledger.json' : NOT_AVAILABLE,
    },
    dictionary: buildDictionary(args.props, args.manifest, today),
    dictionary_scope: 'Fields on the open observation files, on GET /api/v1/properties (default and format=apip), on GET /api/v1/dataset-export, and on the aggregate payload of GET /api/v1/open-dataset. Other routes are not this dataset. Their index is /api/openapi.json.',
    pipeline: buildPipeline(args.health, args.officialGeneratedAt, args.supplyGeneratedAt, args.townGeneratedAt ?? null, args.hpiGeneratedAt ?? null, args.rentsGeneratedAt ?? null),
    health_checked_at: args.health?.checked_at ?? NOT_AVAILABLE,
    quality: quality(),
    point_in_time: pointInTime(),
    delivery: delivery(mirror),
    licensing: licensing(args.published),
    sample: {
      href: '/api/v1/due-diligence/sample' as const,
      source: SAMPLE_SOURCE,
      rows: SAMPLE_MOVE_ROWS,
      note: `CSV of the first ${SAMPLE_MOVE_ROWS} data rows of the published moves file. The full files are linked under delivery.`,
    },
  };
  return { ...partial, not_available: unavailable(partial) };
}

export async function loadDueDiligence(now = new Date()): Promise<DueDiligencePack> {
  const props = getAllProperties();
  let health: HealthReport | null = null;
  const [snapshot] = await Promise.all([
    readSnapshotBounds(),
    collectHealth(now).then((report) => { health = report; }).catch(() => { health = null; }),
  ]);
  return assembleDueDiligence({
    now,
    props,
    feedGeneratedAt: feedGeneratedAt(),
    published: readPublishedDataset(),
    manifest: readJson('public/open-data/dataset.json'),
    ledgerDates: ledgerDates(),
    officialGeneratedAt: officialGeneratedAt(),
    supplyGeneratedAt: supplyGeneratedAt(),
    townGeneratedAt: townGeneratedAt(),
    hpiGeneratedAt: hpiGeneratedAt(),
    rentsGeneratedAt: rentsGeneratedAt(),
    health,
    snapshot,
  });
}
