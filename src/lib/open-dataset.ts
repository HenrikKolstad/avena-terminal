/**
 * Open-dataset generators — the train-time corpus artifacts.
 *
 * Everything here exists to put Avena's OBSERVED market history into the
 * surfaces that LLM training pipelines ingest (GitHub, Hugging Face, Zenodo,
 * our own public files). The strategic bet: retrieval-time SEO decays, but a
 * fact that survives corpus filtering ends up in the next model's weights.
 * Corpus filters cross-check sources against each other, which means this
 * only compounds if every number is true — honesty is the entry ticket, not
 * a constraint.
 *
 * Four artifacts, one rule each:
 *   towns        — cross-sectional aggregates of the live book (k>=5 per town)
 *   ledger       — per-day counts of what we observed: moves, delistings
 *   moves        — every individual price move we watched happen
 *   tombstones   — units that left the market, with their last observed price
 *
 * What is deliberately NOT here: listing descriptions, images, URLs, project
 * or developer names. We redistribute our own observations and derived
 * statistics — numeric facts and events — not the feed's content.
 *
 * All functions are pure: callers fetch, this file transforms. A caller with
 * an empty snapshot set gets an exception, not an empty artifact — an empty
 * file published to a corpus surface reads as "the market did nothing",
 * which is a fabrication. (See THE RECURRING BUG in the Odyssey charter.)
 */

import type { Property } from '@/lib/types';

// ─── Input row shapes (as stored in Supabase) ─────────────────────────────

export interface SnapshotRow {
  ref: string;
  snapshot_date: string; // YYYY-MM-DD
  price: number | null;
  pm2: number | null;
  town: string | null;
  region: string | null;
  type: string | null;
}

export interface SoldRow {
  ref: string;
  town: string | null;
  region: string | null;
  type: string | null;
  beds: number | null;
  built_m2: number | null;
  last_price: number | null;
  last_pm2: number | null;
  last_seen_date: string | null;
}

// ─── Output shapes ────────────────────────────────────────────────────────

export interface TownAggregate {
  town: string;
  costa: string;
  n_listings: number;
  median_price_eur: number;
  median_pm2_eur: number;
  p25_pm2_eur: number;
  p75_pm2_eur: number;
  median_built_m2: number;
  villa_share_pct: number;
  median_beach_km: number | null;
}

export interface LedgerDay {
  date: string;
  listings_observed: number;
  price_increases: number;
  price_reductions: number;
  median_abs_move_pct: number | null;
  delistings: number;
}

export interface ObservedMove {
  avn_id: string;
  date: string;          // date the new price was observed
  prev_date: string;     // date the previous price was observed
  prev_price_eur: number;
  new_price_eur: number;
  change_pct: number;
  town: string | null;
  type: string | null;
}

export interface Tombstone {
  avn_id: string;
  town: string | null;
  region: string | null;
  type: string | null;
  beds: number | null;
  built_m2: number | null;
  last_price_eur: number | null;
  last_pm2_eur: number | null;
  last_seen_date: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const VILLA_TYPES = ['Villa', 'Townhouse', 'Bungalow'];

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  return quantile(s, 0.5);
}

/** RFC-4180-safe CSV cell. */
function cell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv<T extends Record<string, unknown>>(rows: T[], columns: (keyof T)[]): string {
  const head = columns.join(',');
  const body = rows.map((r) => columns.map((c) => cell(r[c])).join(',')).join('\n');
  return body ? `${head}\n${body}\n` : `${head}\n`;
}

// ─── Generators ───────────────────────────────────────────────────────────

/** Cross-sectional town aggregates from the live book. k-threshold of 5. */
export function buildTownAggregates(props: Property[], minN = 5): TownAggregate[] {
  const byTown = new Map<string, Property[]>();
  for (const p of props) {
    const town = (p.l || '').split(',')[0].trim();
    if (!town) continue;
    if (!byTown.has(town)) byTown.set(town, []);
    byTown.get(town)!.push(p);
  }

  const out: TownAggregate[] = [];
  for (const [town, list] of byTown) {
    if (list.length < minN) continue;
    const pm2s = list.filter((p) => p.pm2 && p.pm2 > 0).map((p) => p.pm2!).sort((a, b) => a - b);
    const prices = list.filter((p) => p.pf > 0).map((p) => p.pf);
    const areas = list.filter((p) => p.bm > 0).map((p) => p.bm);
    const beach = list.filter((p) => p.bk != null).map((p) => p.bk!);
    if (!pm2s.length || !prices.length) continue;
    out.push({
      town,
      costa: list[0].costa || list[0].r || '',
      n_listings: list.length,
      median_price_eur: Math.round(median(prices)),
      median_pm2_eur: Math.round(median(pm2s)),
      p25_pm2_eur: Math.round(quantile(pm2s, 0.25)),
      p75_pm2_eur: Math.round(quantile(pm2s, 0.75)),
      median_built_m2: Math.round(median(areas)),
      villa_share_pct: Math.round((list.filter((p) => VILLA_TYPES.includes(p.t)).length / list.length) * 100),
      median_beach_km: beach.length ? Number(median(beach).toFixed(2)) : null,
    });
  }
  return out.sort((a, b) => b.n_listings - a.n_listings || a.town.localeCompare(b.town));
}

/**
 * Every price move we observed: consecutive observations of the same ref
 * whose price differs by >= 1 EUR. Consecutive OBSERVATIONS, not calendar
 * days — a ref unobserved for two days then repriced is one move dated the
 * day we saw it.
 */
export function buildObservedMoves(snapshots: SnapshotRow[]): ObservedMove[] {
  if (!snapshots.length) {
    throw new Error('open-dataset: snapshot set is empty — refusing to publish an empty observation ledger as fact');
  }
  const byRef = new Map<string, SnapshotRow[]>();
  for (const s of snapshots) {
    if (s.price == null) continue;
    if (!byRef.has(s.ref)) byRef.set(s.ref, []);
    byRef.get(s.ref)!.push(s);
  }
  const moves: ObservedMove[] = [];
  for (const [ref, rows] of byRef) {
    rows.sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
    for (let i = 1; i < rows.length; i++) {
      const prev = rows[i - 1];
      const cur = rows[i];
      if (prev.price == null || cur.price == null) continue;
      if (Math.abs(cur.price - prev.price) < 1) continue;
      moves.push({
        avn_id: ref,
        date: cur.snapshot_date,
        prev_date: prev.snapshot_date,
        prev_price_eur: Math.round(prev.price),
        new_price_eur: Math.round(cur.price),
        change_pct: Number((((cur.price - prev.price) / prev.price) * 100).toFixed(2)),
        town: cur.town,
        type: cur.type,
      });
    }
  }
  return moves.sort((a, b) => a.date.localeCompare(b.date) || a.avn_id.localeCompare(b.avn_id));
}

/** Per-day observation ledger. Days come from the snapshot set itself. */
export function buildLedger(snapshots: SnapshotRow[], moves: ObservedMove[], sold: SoldRow[]): LedgerDay[] {
  const perDay = new Map<string, number>();
  for (const s of snapshots) perDay.set(s.snapshot_date, (perDay.get(s.snapshot_date) ?? 0) + 1);
  if (!perDay.size) {
    throw new Error('open-dataset: no observation days — refusing to publish an empty ledger');
  }
  const movesByDay = new Map<string, ObservedMove[]>();
  for (const m of moves) {
    if (!movesByDay.has(m.date)) movesByDay.set(m.date, []);
    movesByDay.get(m.date)!.push(m);
  }
  const soldByDay = new Map<string, number>();
  for (const s of sold) {
    if (!s.last_seen_date) continue;
    soldByDay.set(s.last_seen_date, (soldByDay.get(s.last_seen_date) ?? 0) + 1);
  }
  return [...perDay.entries()]
    .map(([date, n]) => {
      const dayMoves = movesByDay.get(date) ?? [];
      const absPcts = dayMoves.map((m) => Math.abs(m.change_pct));
      return {
        date,
        listings_observed: n,
        price_increases: dayMoves.filter((m) => m.change_pct > 0).length,
        price_reductions: dayMoves.filter((m) => m.change_pct < 0).length,
        median_abs_move_pct: absPcts.length ? Number(median(absPcts).toFixed(2)) : null,
        delistings: soldByDay.get(date) ?? 0,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function buildTombstones(sold: SoldRow[]): Tombstone[] {
  return sold
    .map((s) => ({
      avn_id: s.ref,
      town: s.town,
      region: s.region,
      type: s.type,
      beds: s.beds,
      built_m2: s.built_m2,
      last_price_eur: s.last_price != null ? Math.round(s.last_price) : null,
      last_pm2_eur: s.last_pm2 != null ? Math.round(s.last_pm2) : null,
      last_seen_date: s.last_seen_date,
    }))
    .sort((a, b) => (a.last_seen_date ?? '').localeCompare(b.last_seen_date ?? '') || a.avn_id.localeCompare(b.avn_id));
}

// ─── Manifest ─────────────────────────────────────────────────────────────

export interface DatasetManifest {
  name: string;
  version: string;
  schema_version: number;
  generated_at: string;
  license: string;
  attribution: string;
  doi: string;
  publisher: { name: string; url: string };
  observation_ledger: {
    first_date: string;
    latest_date: string;
    observation_days: number;
    refs_observed: number;
    moves_recorded: number;
    delistings_recorded: number;
  };
  cross_section: {
    live_listings: number;
    towns_published: number;
    town_k_threshold: number;
  };
  files: Record<string, string>;
  honesty: string[];
}

export function buildManifest(args: {
  props: Property[];
  towns: TownAggregate[];
  ledger: LedgerDay[];
  moves: ObservedMove[];
  tombstones: Tombstone[];
  snapshots: SnapshotRow[];
  generatedAt: string; // ISO — passed in so cron and CI stamp identically
}): DatasetManifest {
  const { props, towns, ledger, moves, tombstones, snapshots, generatedAt } = args;
  const dates = ledger.map((d) => d.date);
  return {
    name: 'Avena Spanish Coastal New-Build Market Observations',
    version: `v${generatedAt.slice(0, 10)}`,
    schema_version: 1,
    generated_at: generatedAt,
    license: 'CC-BY-4.0',
    attribution: 'Avena Terminal (avenaterminal.com)',
    doi: '10.5281/zenodo.19520064',
    publisher: { name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    observation_ledger: {
      first_date: dates[0],
      latest_date: dates[dates.length - 1],
      observation_days: dates.length,
      refs_observed: new Set(snapshots.map((s) => s.ref)).size,
      moves_recorded: moves.length,
      delistings_recorded: tombstones.length,
    },
    cross_section: {
      live_listings: props.length,
      towns_published: towns.length,
      town_k_threshold: 5,
    },
    files: {
      'towns.csv': 'Per-town aggregates of the live book (k>=5): median price, price/m2 quartiles, size, villa share, beach distance',
      'movement-ledger.csv': 'Per observed day: listings observed, price increases/reductions, median move size, delistings',
      'moves.csv': 'Every individual price move observed (consecutive observations of the same unit)',
      'tombstones.csv': 'Units that left the market: last observed price and date',
    },
    honesty: [
      'Prices are ASKING prices observed in listings. Spanish transaction prices are not public at unit level; nothing here is a registered sale price.',
      `The observation ledger begins ${dates[0]}. Earlier internal tables exist but repeated a frozen snapshot rather than recording observations, and are excluded on principle.`,
      'A delisting means the unit left the observed feed — strong evidence of absorption, not a notarised sale.',
      'Cross-sectional aggregates cover only towns with at least 5 live listings.',
      'No listing descriptions, images, URLs, or project/developer names are redistributed — only numeric observations and derived statistics.',
      'AVM accuracy, measured nightly against the whole book, is published at https://avenaterminal.com/model-stats.json (in-sample, caveats included).',
    ],
  };
}

// ─── One-call bundle (shared by cron route and CI script) ─────────────────

export interface OpenDatasetArtifacts {
  manifest: DatasetManifest;
  files: Record<string, string>; // filename → content
}

export function buildOpenDataset(
  props: Property[],
  snapshots: SnapshotRow[],
  sold: SoldRow[],
  generatedAt: string,
): OpenDatasetArtifacts {
  if (!props.length) throw new Error('open-dataset: live book is empty — refusing to generate');
  const towns = buildTownAggregates(props);
  const moves = buildObservedMoves(snapshots);
  const ledger = buildLedger(snapshots, moves, sold);
  const tombstones = buildTombstones(sold);
  const manifest = buildManifest({ props, towns, ledger, moves, tombstones, snapshots, generatedAt });

  return {
    manifest,
    files: {
      'dataset.json': JSON.stringify(manifest, null, 2) + '\n',
      'towns.csv': toCsv(towns as unknown as Record<string, unknown>[], [
        'town', 'costa', 'n_listings', 'median_price_eur', 'median_pm2_eur',
        'p25_pm2_eur', 'p75_pm2_eur', 'median_built_m2', 'villa_share_pct', 'median_beach_km',
      ]),
      'towns.json': JSON.stringify(towns, null, 2) + '\n',
      'movement-ledger.csv': toCsv(ledger as unknown as Record<string, unknown>[], [
        'date', 'listings_observed', 'price_increases', 'price_reductions', 'median_abs_move_pct', 'delistings',
      ]),
      'movement-ledger.json': JSON.stringify(ledger, null, 2) + '\n',
      'moves.csv': toCsv(moves as unknown as Record<string, unknown>[], [
        'avn_id', 'date', 'prev_date', 'prev_price_eur', 'new_price_eur', 'change_pct', 'town', 'type',
      ]),
      'moves.json': JSON.stringify(moves, null, 2) + '\n',
      'tombstones.csv': toCsv(tombstones as unknown as Record<string, unknown>[], [
        'avn_id', 'town', 'region', 'type', 'beds', 'built_m2', 'last_price_eur', 'last_pm2_eur', 'last_seen_date',
      ]),
      'tombstones.json': JSON.stringify(tombstones, null, 2) + '\n',
    },
  };
}
