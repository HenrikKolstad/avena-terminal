/**
 * Server-only reads for the sample fund report and the score track record.
 *
 * Read-only selects against price_snapshots, score_history, sold_properties,
 * and a head count of predictions. No inserts, no RPC, no migration.
 * A failed read is a named gap. It is never replaced with 0.
 */

import { readFileSync } from 'fs';
import path from 'path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAllProperties, getFeedUpdatedAt } from '@/lib/properties';
import { LEDGER_EPOCH } from '@/lib/open-dataset-io';
import type { Property } from '@/lib/types';
import {
  buildAbsorption,
  buildBookOverview,
  buildPriceHistory,
  calendarDays,
  reconcileObservedDates,
  regionLabels,
  selectTrendDates,
  uniqueDates,
  type Absorption,
  type BookOverview,
  type LiveListing,
  type PriceHistory,
  type SnapListing,
  type SoldListing,
} from '@/lib/fund-report';
import { buildTrackRecord, type TrackRecord } from '@/lib/track-record';

const PAGE = 1000;
const DAY_PAGE_CAP = 8;
const SOLD_PAGE_CAP = 20;
const PROBE_CONCURRENCY = 8;
const DAY_CONCURRENCY = 4;

/** Score rows before this date can be filed one day after the book they describe. */
export const SCRIBE_SEAM = '2026-08-21';

export interface ModelDisclosure {
  version: string | null;
  inSample: boolean | null;
  nScored: number | null;
  medianAbsErrorPct: number | null;
  mapePct: number | null;
  within20Pct: number | null;
  computedAt: string | null;
  caveats: string[];
}

export interface Coverage {
  ledgerEpoch: string;
  feedUpdated: string | null;
  snapshotMin: string | null;
  snapshotMax: string | null;
  observedDays: number | null;
  observedSource: 'ledger' | 'probed' | null;
  scoreMin: string | null;
  scoreMax: string | null;
  scoreRowsBeforeEpoch: number | null;
  snapshotRowsBeforeEpoch: number | null;
  predictionRows: number | null;
}

export interface LoadIssue {
  section: string;
  message: string;
}

export interface InstitutionalSample {
  generatedAt: string;
  book: BookOverview;
  model: ModelDisclosure | null;
  history: PriceHistory | null;
  absorption: Absorption | null;
  track: TrackRecord | null;
  coverage: Coverage;
  issues: LoadIssue[];
}

function num(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function dateOnly(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function toLive(p: Property): LiveListing {
  return {
    ref: p.ref ?? null,
    town: (p.l || '').split(',')[0].trim(),
    costa: (p.costa || '').trim() || 'Unspecified costa',
    region: (p.r || '').trim() || 'unspecified',
    price: p.pf > 0 ? p.pf : null,
    pm2: p.pm2 != null && p.pm2 > 0 ? p.pm2 : null,
    mm2: p.mm2 > 0 ? p.mm2 : null,
    score: p._sc != null && Number.isFinite(p._sc) ? p._sc : null,
    yieldGross: p._yield != null && Number.isFinite(p._yield.gross) ? p._yield.gross : null,
    yieldSource: p._yield?.src ?? null,
  };
}

function readModel(): ModelDisclosure | null {
  try {
    const raw = JSON.parse(readFileSync(path.join(process.cwd(), 'public', 'model-stats.json'), 'utf8')) as Record<string, unknown>;
    const caveats = Array.isArray(raw.caveats)
      ? raw.caveats.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [];
    return {
      version: typeof raw.model_version === 'string' ? raw.model_version : null,
      inSample: typeof raw.in_sample === 'boolean' ? raw.in_sample : null,
      nScored: num(raw.n_scored),
      medianAbsErrorPct: num(raw.median_abs_error_pct),
      mapePct: num(raw.mape_pct),
      within20Pct: num(raw.within_20_pct),
      computedAt: typeof raw.computed_at === 'string' ? raw.computed_at : null,
      caveats,
    };
  } catch {
    return null;
  }
}

function readLedgerDates(): string[] | null {
  try {
    const raw = JSON.parse(readFileSync(path.join(process.cwd(), 'public', 'open-data', 'movement-ledger.json'), 'utf8')) as unknown;
    if (!Array.isArray(raw)) return null;
    const dates: string[] = [];
    for (const row of raw) {
      if (row && typeof row === 'object' && 'date' in row && typeof (row as { date: unknown }).date === 'string') {
        dates.push((row as { date: string }).date);
      }
    }
    return dates;
  } catch {
    return null;
  }
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const ret = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, Math.max(items.length, 1)) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      ret[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return ret;
}

async function fetchEq(
  db: SupabaseClient,
  table: string,
  columns: string,
  column: string,
  value: string,
  order: string,
  cap: number,
): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  for (let page = 0; page < cap; page++) {
    const { data, error } = await db
      .from(table)
      .select(columns)
      .eq(column, value)
      .order(order, { ascending: true })
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) throw new Error(`${table} ${value}: ${error.message}`);
    if (!data?.length) return out;
    out.push(...(data as unknown as Record<string, unknown>[]));
    if (data.length < PAGE) return out;
  }
  throw new Error(`${table} on ${value} exceeded ${cap * PAGE} rows. Refusing a truncated day.`);
}

async function fetchSold(db: SupabaseClient): Promise<SoldListing[]> {
  const out: SoldListing[] = [];
  for (let page = 0; page < SOLD_PAGE_CAP; page++) {
    const { data, error } = await db
      .from('sold_properties')
      .select('ref, town, region, last_price, last_seen_date')
      .gte('last_seen_date', LEDGER_EPOCH)
      .order('ref', { ascending: true })
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) throw new Error(`sold_properties: ${error.message}`);
    if (!data?.length) return out;
    for (const row of data as unknown as Record<string, unknown>[]) {
      const ref = row.ref == null ? '' : String(row.ref);
      if (!ref) continue;
      out.push({
        ref,
        town: row.town == null ? null : String(row.town),
        region: row.region == null ? null : String(row.region),
        lastPrice: num(row.last_price),
        lastSeen: dateOnly(row.last_seen_date),
      });
    }
    if (data.length < PAGE) return out;
  }
  throw new Error(`sold_properties exceeded ${SOLD_PAGE_CAP * PAGE} rows. Absorption omitted rather than truncated.`);
}

async function bound(
  db: SupabaseClient,
  table: string,
  column: string,
  gte: string,
): Promise<{ min: string | null; max: string | null }> {
  const [lo, hi] = await Promise.all([
    db.from(table).select(column).gte(column, gte).order(column, { ascending: true }).limit(1),
    db.from(table).select(column).gte(column, gte).order(column, { ascending: false }).limit(1),
  ]);
  if (lo.error) throw new Error(`${table} min: ${lo.error.message}`);
  if (hi.error) throw new Error(`${table} max: ${hi.error.message}`);
  const min = dateOnly((lo.data?.[0] as unknown as Record<string, unknown> | undefined)?.[column]);
  const max = dateOnly((hi.data?.[0] as unknown as Record<string, unknown> | undefined)?.[column]);
  return { min, max };
}

async function headCount(
  db: SupabaseClient,
  table: string,
  column: string | null,
  before?: string,
): Promise<number | null> {
  let query = db.from(table).select('*', { count: 'exact', head: true });
  if (column && before) query = query.lt(column, before);
  const { count, error } = await query;
  if (error) return null;
  return count ?? null;
}

function toSnap(row: Record<string, unknown>, date: string): SnapListing | null {
  const ref = row.ref == null ? '' : String(row.ref);
  if (!ref) return null;
  return {
    ref,
    date,
    price: num(row.price),
    pm2: num(row.pm2),
    town: row.town == null ? null : String(row.town),
    region: row.region == null ? null : String(row.region),
  };
}

async function loadDay(db: SupabaseClient, date: string): Promise<SnapListing[]> {
  const rows = await fetchEq(
    db,
    'price_snapshots',
    'ref, price, pm2, town, region',
    'snapshot_date',
    date,
    'ref',
    DAY_PAGE_CAP,
  );
  return rows.map((row) => toSnap(row, date)).filter((row): row is SnapListing => row != null);
}

async function probeDates(db: SupabaseClient, min: string, max: string): Promise<string[]> {
  const days = calendarDays(min, max);
  const flags = await mapPool(days, PROBE_CONCURRENCY, async (day) => {
    const { data, error } = await db.from('price_snapshots').select('ref').eq('snapshot_date', day).limit(1);
    if (error) throw new Error(`price_snapshots probe ${day}: ${error.message}`);
    return Boolean(data?.length);
  });
  return days.filter((_, index) => flags[index]);
}

export async function loadInstitutionalSample(now = new Date()): Promise<InstitutionalSample> {
  const issues: LoadIssue[] = [];
  const live = getAllProperties().map(toLive);
  const book = buildBookOverview(live);
  const labels = regionLabels(live);
  const model = readModel();
  if (!model) {
    issues.push({ section: 'model', message: 'public/model-stats.json could not be read. AVM error figures are omitted.' });
  }

  const coverage: Coverage = {
    ledgerEpoch: LEDGER_EPOCH,
    feedUpdated: null,
    snapshotMin: null,
    snapshotMax: null,
    observedDays: null,
    observedSource: null,
    scoreMin: null,
    scoreMax: null,
    scoreRowsBeforeEpoch: null,
    snapshotRowsBeforeEpoch: null,
    predictionRows: null,
  };
  try {
    coverage.feedUpdated = getFeedUpdatedAt().toISOString().slice(0, 10);
  } catch {
    coverage.feedUpdated = null;
  }

  const empty = (history: PriceHistory | null = null, absorption: Absorption | null = null, track: TrackRecord | null = null): InstitutionalSample => ({
    generatedAt: now.toISOString(),
    book,
    model,
    history,
    absorption,
    track,
    coverage,
    issues,
  });

  const db = supabaseAdmin;
  if (!db) {
    issues.push({
      section: 'history',
      message: 'No Supabase client is configured. Historical prices, absorption and the score comparison are omitted.',
    });
    return empty();
  }

  try {
    const [snapBound, scoreBound, preScores, preSnaps, predictionRows] = await Promise.all([
      bound(db, 'price_snapshots', 'snapshot_date', LEDGER_EPOCH),
      bound(db, 'score_history', 'snapshot_date', LEDGER_EPOCH),
      headCount(db, 'score_history', 'snapshot_date', LEDGER_EPOCH),
      headCount(db, 'price_snapshots', 'snapshot_date', LEDGER_EPOCH),
      headCount(db, 'predictions', null),
    ]);
    coverage.snapshotMin = snapBound.min;
    coverage.snapshotMax = snapBound.max;
    coverage.scoreMin = scoreBound.min;
    coverage.scoreMax = scoreBound.max;
    coverage.scoreRowsBeforeEpoch = preScores;
    coverage.snapshotRowsBeforeEpoch = preSnaps;
    coverage.predictionRows = predictionRows;

    if (!snapBound.min || !snapBound.max) {
      issues.push({ section: 'history', message: `price_snapshots has no rows on or after ${LEDGER_EPOCH}.` });
      return empty();
    }

    const reconciled = reconcileObservedDates(snapBound.min, snapBound.max, readLedgerDates());
    let observed: string[];
    if (reconciled.source === 'ledger') {
      observed = reconciled.dates;
      coverage.observedSource = 'ledger';
    } else {
      observed = await probeDates(db, snapBound.min, snapBound.max);
      coverage.observedSource = 'probed';
      issues.push({
        section: 'calendar',
        message: 'The published movement ledger did not match the live snapshot endpoints, so observation days were probed from price_snapshots.',
      });
    }
    observed = uniqueDates(observed);
    coverage.observedDays = observed.length;
    if (observed.length < 2) {
      issues.push({ section: 'history', message: 'Fewer than two observation days are available, so no trend is published.' });
      return empty();
    }

    const first = observed[0];
    const last = observed[observed.length - 1];
    const days = uniqueDates([first, last, ...selectTrendDates(observed)]);
    const loaded = await mapPool(days, DAY_CONCURRENCY, async (date) => ({ date, rows: await loadDay(db, date) }));
    const byDate = new Map(loaded.map((day) => [day.date, day.rows]));
    const history = buildPriceHistory(byDate, observed, labels);
    if (!history) {
      issues.push({ section: 'history', message: 'The first and latest snapshot days could not both be read.' });
      return empty();
    }

    const startRows = byDate.get(history.firstDate) ?? [];
    const endRows = byDate.get(history.lastDate) ?? [];
    let sold: SoldListing[] | null = null;
    try {
      sold = await fetchSold(db);
    } catch (error) {
      issues.push({
        section: 'absorption',
        message: error instanceof Error ? error.message : 'sold_properties read failed. Exit rates are omitted.',
      });
    }

    const absorption = sold ? buildAbsorption(startRows, endRows, sold, history.firstDate, history.lastDate, labels) : null;

    let track: TrackRecord | null = null;
    if (!scoreBound.min) {
      issues.push({ section: 'track', message: `score_history has no rows on or after ${LEDGER_EPOCH}.` });
    } else if (!sold) {
      issues.push({
        section: 'track',
        message: 'The score comparison is omitted because the delisting ledger could not be read. Publishing exits without it would count every departure as unrecorded.',
      });
    } else {
      try {
        const scoreRows = await fetchEq(
          db,
          'score_history',
          'property_ref, avena_score',
          'snapshot_date',
          scoreBound.min,
          'property_ref',
          DAY_PAGE_CAP,
        );
        const entryRows = scoreBound.min === history.firstDate
          ? startRows
          : (byDate.get(scoreBound.min) ?? await loadDay(db, scoreBound.min));
        track = buildTrackRecord({
          cohortDate: scoreBound.min,
          outcomeDate: history.lastDate,
          scores: scoreRows.flatMap((row) => {
            const ref = row.property_ref == null ? '' : String(row.property_ref);
            const score = num(row.avena_score);
            return ref && score != null ? [{ ref, score }] : [];
          }),
          entryPrices: entryRows.flatMap((row) => (row.price != null && row.price > 0 ? [{ ref: row.ref, price: row.price }] : [])),
          exitPrices: endRows.flatMap((row) => (row.price != null && row.price > 0 ? [{ ref: row.ref, price: row.price }] : [])),
          soldRefs: sold.map((row) => row.ref),
          longestMissingDays: history.longestMissingDays,
          scoreMayLagOneDay: scoreBound.min < SCRIBE_SEAM,
        });
        if (!track) issues.push({ section: 'track', message: 'Score rows were read, but they did not form a comparison.' });
      } catch (error) {
        issues.push({ section: 'track', message: error instanceof Error ? error.message : 'score_history read failed.' });
      }
    }

    return empty(history, absorption, track);
  } catch (error) {
    issues.push({ section: 'history', message: error instanceof Error ? error.message : 'Historical read failed.' });
    return empty();
  }
}
