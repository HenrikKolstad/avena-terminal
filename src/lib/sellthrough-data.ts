/**
 * Server-side loader for the Sell-Through Monitor (src/lib/sellthrough.ts).
 *
 * Reads price_snapshots (READ ONLY) since SERIES_START, compresses each ref
 * to its price change points, and joins the structural project map in
 * data/ref-dev-map.json plus the live book in public/data.json (for refs that
 * appeared after the map was last rebuilt).
 *
 * Throws on a database error rather than returning an empty book: an empty
 * result here would read as "nothing sold, nothing cut", which is the exact
 * silent-zero failure this codebase has been bitten by before.
 */
import { readFileSync } from 'fs';
import path from 'path';
import { supabase } from './supabase';
import { supabaseAdmin } from './supabase-admin';
import { SERIES_START, type RefMeta, type RefSeries } from './sellthrough';

interface SnapRow {
  ref: string;
  snapshot_date: string;
  price: number | string | null;
  town: string | null;
  region: string | null;
  type: string | null;
}

const PAGE = 1000;
const CONCURRENCY = 8;
const MAX_ROWS = 400_000; // runaway guard: ~2.1k refs x ~190 days

async function fetchPage(from: number): Promise<SnapRow[]> {
  const client = supabaseAdmin ?? supabase;
  if (!client) throw new Error('Supabase not configured');
  const { data, error } = await client
    .from('price_snapshots')
    .select('ref, snapshot_date, price, town, region, type')
    .gte('snapshot_date', SERIES_START)
    .order('ref', { ascending: true })
    .order('snapshot_date', { ascending: true })
    .order('id', { ascending: true })
    .range(from, from + PAGE - 1);
  if (error) throw new Error(`price_snapshots read failed: ${error.message}`);
  return (data ?? []) as SnapRow[];
}

export async function loadSnapshotRows(): Promise<SnapRow[]> {
  const out: SnapRow[] = [];
  for (let base = 0; base < MAX_ROWS; base += PAGE * CONCURRENCY) {
    const pages = await Promise.all(
      Array.from({ length: CONCURRENCY }, (_, i) => fetchPage(base + i * PAGE)),
    );
    let done = false;
    for (const p of pages) {
      out.push(...p);
      if (p.length < PAGE) done = true;
    }
    if (done) return out;
  }
  throw new Error(`price_snapshots exceeded ${MAX_ROWS} rows; raise MAX_ROWS deliberately`);
}

/** Compress per-day rows (sorted by ref, date) to per-ref change-point series. */
export function compressRows(rows: SnapRow[]): RefSeries[] {
  const byRef = new Map<string, RefSeries>();
  for (const r of rows) {
    const price = r.price === null ? NaN : Number(r.price);
    if (!r.ref || !Number.isFinite(price) || price <= 0) continue;
    let s = byRef.get(r.ref);
    if (!s) {
      s = { ref: r.ref, town: r.town, region: r.region, type: r.type, firstSeen: r.snapshot_date, lastSeen: r.snapshot_date, points: [] };
      byRef.set(r.ref, s);
    }
    if (r.snapshot_date < s.lastSeen) continue; // out of order duplicate
    const last = s.points[s.points.length - 1];
    if (!last || last[1] !== price) s.points.push([r.snapshot_date, price]);
    s.lastSeen = r.snapshot_date;
    s.town = r.town ?? s.town;
    s.region = r.region ?? s.region;
    s.type = r.type ?? s.type;
  }
  return [...byRef.values()];
}

let _meta: Record<string, RefMeta> | null = null;

export function loadRefMeta(): Record<string, RefMeta> {
  if (_meta) return _meta;
  const meta: Record<string, RefMeta> = {};
  try {
    const map = JSON.parse(readFileSync(path.join(process.cwd(), 'data', 'ref-dev-map.json'), 'utf8')) as {
      refs: Record<string, RefMeta & { first: string }>;
    };
    for (const [ref, e] of Object.entries(map.refs)) {
      meta[ref] = { dev: e.dev, status: e.status, delivery: e.delivery, beds: e.beds, m2: e.m2, first: e.first };
    }
  } catch {
    // map missing: fall through to the live book only
  }
  try {
    const live = JSON.parse(readFileSync(path.join(process.cwd(), 'public', 'data.json'), 'utf8')) as Array<{
      ref?: string; dev_ref?: string | null; s?: string; c?: string; bd?: number; bm?: number;
    }>;
    const today = new Date().toISOString().slice(0, 10);
    for (const p of live) {
      if (!p.ref) continue;
      const prev = meta[p.ref];
      meta[p.ref] = {
        dev: p.dev_ref ?? prev?.dev ?? null,
        status: p.s ?? prev?.status ?? null,
        delivery: p.c && p.c !== 'TBA' ? p.c : prev?.delivery ?? null,
        beds: p.bd && p.bd > 0 ? p.bd : prev?.beds ?? null,
        m2: p.bm && p.bm > 0 ? p.bm : prev?.m2 ?? null,
        first: prev?.first ?? today,
      };
    }
  } catch {
    // no live book in this runtime
  }
  _meta = meta;
  return meta;
}

export async function loadMonitorInputs(): Promise<{ series: RefSeries[]; meta: Record<string, RefMeta>; asOf: string }> {
  const rows = await loadSnapshotRows();
  const series = compressRows(rows);
  if (!series.length) throw new Error('price_snapshots returned no rows since SERIES_START');
  const asOf = series.reduce((m, s) => (s.lastSeen > m ? s.lastSeen : m), '');
  return { series, meta: loadRefMeta(), asOf };
}
