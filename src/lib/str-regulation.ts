/**
 * Short-let regulatory risk for the towns in the listing book.
 *
 * The committed file is a manual reading of official gazettes. It is not
 * fetched on a schedule: the texts do not move like a statistical table.
 * A missing or unreadable file returns an empty view. Pages keep rendering.
 * Nothing here changes the yield calculation.
 */

import { readFileSync } from 'fs';
import path from 'path';
import { getAllProperties, slugify } from '@/lib/properties';

export const STR_FILE = path.join(process.cwd(), 'data', 'str-regulation.json');

export const STR_RISK_LEVELS = ['low', 'elevated', 'high', 'unknown'] as const;
export type StrRiskLevel = (typeof STR_RISK_LEVELS)[number];

/** Hosts this review accepts. A blog, a portal, or a consultancy is not a source. */
export const STR_SOURCE_HOSTS = [
  'boe.es',
  'www.boe.es',
  'juntadeandalucia.es',
  'www.juntadeandalucia.es',
  'ws040.juntadeandalucia.es',
  'dogv.gva.es',
  'www.dogv.gva.es',
  'borm.es',
  'www.borm.es',
  'poderjudicial.es',
  'www.poderjudicial.es',
  'malaga.eu',
  'www.malaga.eu',
  'urbanismo.malaga.eu',
  'bopmalaga.es',
  'www.bopmalaga.es',
  'alicante.es',
  'www.alicante.es',
  'w3.alicante.es',
  'fuengirola.es',
  'www.fuengirola.es',
  'eur-lex.europa.eu',
  'cindi.gva.es',
] as const;

export interface StrSource {
  title: string;
  url: string;
  published: string | null;
}

export interface StrNationalRule {
  id: string;
  title: string;
  summary: string;
  sources: StrSource[];
}

export interface StrRegionRule {
  id: string;
  name: string;
  provinces: string[];
  summary: string;
  sources: StrSource[];
}

export interface StrTownRecord {
  town: string;
  slug: string;
  place: string;
  province: string;
  province_key: string;
  costa: string;
  region_id: string;
  municipality: string | null;
  municipality_resolution: 'name' | 'alias' | 'part' | 'unresolved';
  risk: StrRiskLevel;
  reason: string;
  municipal_status: string;
  as_of: string;
  sources: StrSource[];
}

export interface StrRiskLevels {
  low: string;
  elevated: string;
  high: string;
  unknown: string;
}

export interface StrFile {
  reviewed_at: string;
  next_review: string;
  review_cadence: string;
  not_legal_advice: string;
  yield_maths: string;
  method: {
    question: string;
    risk_levels: StrRiskLevels;
    national_note: string;
    municipal_note: string;
  };
  limitations: string[];
  national: StrNationalRule[];
  regions: StrRegionRule[];
  towns: StrTownRecord[];
}

export interface StrTownView extends StrTownRecord {
  in_book: boolean;
  listings: number;
  href: string;
  synthetic: boolean;
}

export interface StrCounts {
  towns: number;
  in_book: number;
  high: number;
  elevated: number;
  low: number;
  unknown: number;
  not_reviewed: number;
}

export interface StrView {
  ok: true;
  status: 'ready' | 'unavailable';
  message: string | null;
  reviewed_at: string | null;
  next_review: string | null;
  review_cadence: string | null;
  not_legal_advice: string | null;
  yield_maths: string | null;
  method: StrFile['method'] | null;
  limitations: string[];
  national: StrNationalRule[];
  regions: StrRegionRule[];
  towns: StrTownView[];
  counts: StrCounts;
  listings_in_book: number;
}

export interface StrBadge {
  level: StrRiskLevel;
  reason: string;
  href: string;
  town: string;
}

const EMPTY_COUNTS: StrCounts = {
  towns: 0, in_book: 0, high: 0, elevated: 0, low: 0, unknown: 0, not_reviewed: 0,
};

function fold(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

function isSource(value: unknown): value is StrSource {
  if (!value || typeof value !== 'object') return false;
  const row = value as StrSource;
  return typeof row.title === 'string' && row.title.length > 0
    && typeof row.url === 'string'
    && (row.published === null || typeof row.published === 'string');
}

function isTown(value: unknown): value is StrTownRecord {
  if (!value || typeof value !== 'object') return false;
  const row = value as StrTownRecord;
  return typeof row.town === 'string' && row.town.includes(',')
    && typeof row.slug === 'string'
    && typeof row.place === 'string'
    && typeof row.province === 'string'
    && typeof row.province_key === 'string'
    && typeof row.region_id === 'string'
    && (row.municipality === null || typeof row.municipality === 'string')
    && (row.municipality_resolution === 'name' || row.municipality_resolution === 'alias' || row.municipality_resolution === 'part' || row.municipality_resolution === 'unresolved')
    && (STR_RISK_LEVELS as readonly string[]).includes(row.risk)
    && typeof row.reason === 'string' && row.reason.length > 0
    && typeof row.municipal_status === 'string'
    && typeof row.as_of === 'string'
    && Array.isArray(row.sources) && row.sources.every(isSource);
}

export function sourceHostOk(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (STR_SOURCE_HOSTS as readonly string[]).includes(host);
  } catch {
    return false;
  }
}

export function parseStrFile(value: unknown): StrFile | null {
  if (!value || typeof value !== 'object') return null;
  const file = value as StrFile;
  const levels = file.method?.risk_levels;
  if (typeof file.reviewed_at !== 'string') return null;
  if (typeof file.next_review !== 'string') return null;
  if (typeof file.review_cadence !== 'string') return null;
  if (typeof file.not_legal_advice !== 'string') return null;
  if (typeof file.yield_maths !== 'string') return null;
  if (!file.method || typeof file.method.question !== 'string') return null;
  if (!levels || typeof levels.low !== 'string' || typeof levels.elevated !== 'string' || typeof levels.high !== 'string' || typeof levels.unknown !== 'string') return null;
  if (!Array.isArray(file.limitations) || !Array.isArray(file.national) || !Array.isArray(file.regions) || !Array.isArray(file.towns)) return null;
  if (!file.towns.every(isTown)) return null;
  if (!file.national.every((rule) => rule && typeof rule.id === 'string' && typeof rule.summary === 'string' && Array.isArray(rule.sources))) return null;
  if (!file.regions.every((rule) => rule && typeof rule.id === 'string' && typeof rule.summary === 'string' && Array.isArray(rule.sources))) return null;
  return file;
}

export function readStrFile(filePath = STR_FILE): StrFile | null {
  try {
    const raw = readFileSync(filePath, 'utf8');
    return parseStrFile(JSON.parse(raw));
  } catch {
    return null;
  }
}

function countsOf(towns: StrTownView[]): StrCounts {
  const counts = { ...EMPTY_COUNTS, towns: towns.length };
  for (const town of towns) {
    counts[town.risk] += 1;
    if (town.in_book) counts.in_book += 1;
    if (town.synthetic) counts.not_reviewed += 1;
  }
  return counts;
}

function toViewTown(row: StrTownRecord, listings: number, inBook: boolean, synthetic: boolean): StrTownView {
  return {
    ...row,
    in_book: inBook,
    listings,
    href: `/spain/short-let-rules#${row.slug}`,
    synthetic,
  };
}

export function buildStrView(
  file: StrFile | null,
  places: readonly { location: string; costa: string | null }[],
): StrView {
  const book = new Map<string, { costa: string | null; listings: number }>();
  for (const place of places) {
    const key = place.location.trim();
    if (!key) continue;
    const prev = book.get(key);
    if (!prev) book.set(key, { costa: place.costa, listings: 1 });
    else prev.listings += 1;
  }
  const listingsInBook = places.length;

  if (!file) {
    return {
      ok: true,
      status: 'unavailable',
      message: 'The short-let file is not loaded. No risk level is shown.',
      reviewed_at: null,
      next_review: null,
      review_cadence: null,
      not_legal_advice: null,
      yield_maths: null,
      method: null,
      limitations: [],
      national: [],
      regions: [],
      towns: [],
      counts: { ...EMPTY_COUNTS },
      listings_in_book: listingsInBook,
    };
  }

  const byTown = new Map(file.towns.map((row) => [row.town, row]));
  const towns: StrTownView[] = [];
  for (const [location, info] of book) {
    const row = byTown.get(location);
    if (row) {
      towns.push(toViewTown({ ...row, costa: info.costa || row.costa }, info.listings, true, false));
      continue;
    }
    const place = location.split(',')[0]?.trim() || location;
    const province = location.split(',').at(-1)?.trim() || '';
    towns.push(toViewTown({
      town: location,
      slug: slugify(location),
      place,
      province,
      province_key: fold(province),
      costa: info.costa || '',
      region_id: 'unreviewed',
      municipality: null,
      municipality_resolution: 'unresolved',
      risk: 'unknown',
      reason: 'This place is in the current book and has no reviewed row.',
      municipal_status: 'not_reviewed',
      as_of: file.reviewed_at,
      sources: [],
    }, info.listings, true, true));
  }
  for (const row of file.towns) {
    if (!book.has(row.town)) towns.push(toViewTown(row, 0, false, false));
  }
  towns.sort((a, b) => a.province.localeCompare(b.province, 'en') || a.place.localeCompare(b.place, 'en'));

  return {
    ok: true,
    status: 'ready',
    message: null,
    reviewed_at: file.reviewed_at,
    next_review: file.next_review,
    review_cadence: file.review_cadence,
    not_legal_advice: file.not_legal_advice,
    yield_maths: file.yield_maths,
    method: file.method,
    limitations: file.limitations,
    national: file.national,
    regions: file.regions,
    towns,
    counts: countsOf(towns.filter((town) => town.in_book)),
    listings_in_book: listingsInBook,
  };
}

let cachedFile: StrFile | null | undefined;
let cachedView: StrView | null = null;

export function getStrRegulation(): StrView {
  if (cachedView) return cachedView;
  if (cachedFile === undefined) cachedFile = readStrFile();
  const places = getAllProperties().map((p) => ({ location: p.l, costa: p.costa ?? null }));
  cachedView = buildStrView(cachedFile, places);
  return cachedView;
}

export function resetStrRegulationCache(): void {
  cachedFile = undefined;
  cachedView = null;
}

function candidates(view: StrView, query: string, province?: string | null): StrTownView[] {
  const q = fold(query);
  const wantProvince = province ? fold(province) : '';
  const pool = wantProvince
    ? view.towns.filter((town) => fold(town.province) === wantProvince || town.province_key === wantProvince)
    : view.towns;
  const exact = pool.filter((town) => fold(town.town) === q || town.slug === q || fold(town.slug) === q);
  if (exact.length) return exact;
  const place = pool.filter((town) => fold(town.place) === q);
  if (place.length === 1) return place;
  if (place.length > 1) return [];
  return [];
}

export function matchStrTown(view: StrView, query: string, province?: string | null): StrTownView | null {
  const q = query.trim();
  if (!q || view.status !== 'ready') return null;
  const hits = candidates(view, q, province);
  return hits.length === 1 ? hits[0] : null;
}

/**
 * Badge for a yield already on screen. Null when the file is missing, so the
 * yield still renders. A book place with no reviewed row is unknown. A free-text
 * place that is not in the book is left blank rather than labelled.
 */
export function strBadgeFor(place: string, province?: string | null): StrBadge | null {
  const view = getStrRegulation();
  if (view.status !== 'ready') return null;
  const hit = matchStrTown(view, place, province);
  if (!hit) return null;
  return { level: hit.risk, reason: hit.reason, href: hit.href, town: hit.town };
}
