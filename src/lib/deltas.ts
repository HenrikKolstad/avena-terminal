/**
 * The Delta Layer (2026-08-05) — what changed in the market, from the moat's
 * own tables. This is the data no competitor can reconstruct: the feed keeps
 * no memory, so yesterday's prices and sold-out listings exist only in our
 * nightly captures (price_snapshots / property_pricing_history /
 * sold_properties, written by the pricing-history cron at 02:20 UTC).
 *
 * Server-side only. Every function fails soft (empty result) so a missing
 * Supabase client or an empty table can never break a page.
 */

import { supabase } from './supabase';
import { getAllProperties } from './properties';

export interface PriceMove {
  ref: string;
  town: string;
  from: number;
  to: number;
  date?: string; // YYYY-MM-DD the move was recorded
}

export interface Sellout {
  ref: string;
  town: string | null;
  type: string | null;
  lastPrice: number | null;
  lastSeen: string; // YYYY-MM-DD last seen in the feed
}

export interface EngineDeltas {
  moves: PriceMove[];
  sellouts: Sellout[];
  selloutCount30d: number;
  medianExitPm2: number | null;
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

interface SnapRow {
  ref: string;
  price: number | null;
  snapshot_date: string;
}

/**
 * Every snapshot row on or after `since`, paginated.
 *
 * PostgREST caps a single response at its max-rows setting (1000 by default),
 * and the window is ~2,000 refs x N days, so an unpaginated select would
 * silently return a truncated slice and we would under-report moves. Ordered
 * by (ref, snapshot_date) so the pages are stable across requests.
 */
async function fetchSnapshotWindow(since: string): Promise<SnapRow[]> {
  if (!supabase) return [];
  const PAGE = 1000;
  const MAX_PAGES = 40; // ~40k rows — far above any real window; a runaway guard.
  const out: SnapRow[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await supabase
      .from('price_snapshots')
      .select('ref, price, snapshot_date')
      .gte('snapshot_date', since)
      .order('ref', { ascending: true })
      .order('snapshot_date', { ascending: true })
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) throw error;
    if (!data?.length) break;
    out.push(...(data as SnapRow[]));
    if (data.length < PAGE) break;
  }
  return out;
}

/**
 * Real price movements from the last `windowDays` days, derived from
 * price_snapshots — our own daily record of what each ref was priced at.
 *
 * This used to read the change events in property_pricing_history. That table
 * is not a usable source: it holds 394k rows and every single one is status
 * 'listed' — not one 'reduced' or 'increased' has ever been written, so this
 * function always returned [] and the "What moved this week" section on /deals
 * has never once rendered. (Root cause is in the pricing-history cron, fixed
 * separately.) price_snapshots is the ground truth either way: it is the thing
 * we actually captured, so a move here is a move we can prove we observed.
 *
 * "from" is the price held before the most recent change inside the window,
 * "to" is the latest price we snapshotted, and "date" is the day the change
 * was first recorded. Refs that have left the feed are excluded — a sold-out
 * unit is a delisting, not a price move.
 */
export async function getRecentPriceMoves(windowDays = 7, limit = 6): Promise<PriceMove[]> {
  if (!supabase) return [];
  try {
    const rows = await fetchSnapshotWindow(daysAgo(windowDays));
    if (!rows.length) return [];

    const byRef = new Map(getAllProperties().filter((p) => p.ref && p.pf > 0).map((p) => [p.ref as string, p]));

    const series = new Map<string, SnapRow[]>();
    for (const r of rows) {
      if (!byRef.has(r.ref) || r.price == null) continue;
      const list = series.get(r.ref);
      if (list) list.push(r);
      else series.set(r.ref, [r]);
    }

    const moves: PriceMove[] = [];
    for (const [ref, list] of series) {
      if (list.length < 2) continue; // one observation is not a move
      list.sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));

      // Walk back to the most recent day the price actually changed.
      let changeAt = -1;
      for (let i = list.length - 1; i > 0; i--) {
        if (Math.round(Number(list[i].price)) !== Math.round(Number(list[i - 1].price))) {
          changeAt = i;
          break;
        }
      }
      if (changeAt < 0) continue; // flat all window — never fabricate a move

      const from = Math.round(Number(list[changeAt - 1].price));
      const to = Math.round(Number(list[list.length - 1].price));
      if (!from || Math.abs(to - from) < 1) continue;

      const p = byRef.get(ref)!;
      moves.push({
        ref,
        town: (p.l || '').split(',')[0].trim(),
        from,
        to,
        date: String(list[changeAt].snapshot_date).slice(0, 10),
      });
    }

    // Biggest relative moves first — that's what buyers and crawlers care about.
    moves.sort((a, b) => Math.abs((b.to - b.from) / b.from) - Math.abs((a.to - a.from) / a.from));
    return moves.slice(0, limit);
  } catch {
    return [];
  }
}

/** Listings that left the feed (sold/withdrawn) in the last `windowDays` days. */
export async function getRecentSellouts(windowDays = 30, limit = 6): Promise<{ sellouts: Sellout[]; count: number; medianExitPm2: number | null }> {
  if (!supabase) return { sellouts: [], count: 0, medianExitPm2: null };
  try {
    const { data } = await supabase
      .from('sold_properties')
      .select('ref, town, type, last_price, last_pm2, last_seen_date')
      .gte('last_seen_date', daysAgo(windowDays))
      .order('last_price', { ascending: false })
      .limit(500);
    if (!data?.length) return { sellouts: [], count: 0, medianExitPm2: null };

    const pm2s = data.map((r) => Number(r.last_pm2)).filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
    const medianExitPm2 = pm2s.length ? Math.round(pm2s[Math.floor(pm2s.length / 2)]) : null;

    return {
      sellouts: data.slice(0, limit).map((r) => ({
        ref: r.ref,
        town: r.town ?? null,
        type: r.type ?? null,
        lastPrice: r.last_price != null ? Math.round(Number(r.last_price)) : null,
        lastSeen: String(r.last_seen_date),
      })),
      count: data.length,
      medianExitPm2,
    };
  } catch {
    return { sellouts: [], count: 0, medianExitPm2: null };
  }
}

export async function getEngineDeltas(): Promise<EngineDeltas> {
  const [moves, sold] = await Promise.all([getRecentPriceMoves(), getRecentSellouts()]);
  return { moves, sellouts: sold.sellouts, selloutCount30d: sold.count, medianExitPm2: sold.medianExitPm2 };
}

/**
 * ─── Live engine figures (2026-08-09) ─────────────────────────────────────
 *
 * The /engine status card previously rendered a hardcoded block copied out of
 * a one-time April audit. It had not moved in four months, and by August
 * several of its numbers were not merely stale but wrong in a way that would
 * not survive an investor's due diligence:
 *
 *   "1,881 today's score updates"  — the frozen properties_registry count;
 *                                    the live book is 1,996.
 *   "387,000+ price records"       — property_pricing_history, which contains
 *                                    ZERO price-move events. Every row is
 *                                    status 'listed'.
 *   "380,435+ verified transactions, reconciled against market benchmarks"
 *                                  — French DVF open data. French, not
 *                                    Spanish, and reconciled against nothing.
 *   "191,862 score revisions"      — score_history, which repeated a frozen
 *                                    snapshot nightly until 2026-08-05.
 *   "Observation depth: since Apr 2026" — the genuine ledger starts 08-05.
 *
 * Everything below is read live and labelled as what it actually is. Numbers
 * that cannot be verified are omitted rather than estimated: a page that
 * overstates is worth less than one that under-claims, because the whole
 * business rests on being the source that is right.
 */
export interface EngineTruth {
  liveListings: number | null;         // scored new-builds in tonight's feed
  dailyUpdates: number | null;         // score writes on the latest day
  indexed: number | null;              // properties_registry
  priceRecords: number | null;         // property_pricing_history
  transactions: number | null;         // property_transactions (registered, DVF France)
  scoreRevisions: number | null;       // score_history
  findings: number | null;             // findings
  observationSince: string | null;     // first date in score_history
  observationDays: number | null;      // distinct observation dates
}

/**
 * Head-count of a table without pulling rows.
 *
 * Exact first, planner estimate as a fallback. `property_transactions` carries
 * a wide jsonb `raw` column, so an exact count full-scans ~400k fat rows and
 * exceeds the anon role's 3s statement timeout — it returned null, and the
 * card silently fell back to a hardcoded April constant while every other
 * figure went live. That is the recurring bug again: a failure that renders as
 * a plausible number instead of an absence.
 *
 * The estimate comes from the query planner (pg_class.reltuples), accurate to
 * within a fraction of a percent on a table that only ever grows by appends.
 */
async function countOf(table: string): Promise<number | null> {
  if (!supabase) return null;
  const exact = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (!exact.error && exact.count != null) return exact.count;
  console.warn(`[engine] exact count failed for ${table}: ${exact.error?.message ?? 'null count'} — falling back to planner estimate`);
  const planned = await supabase.from(table).select('*', { count: 'planned', head: true });
  if (!planned.error && planned.count != null) return planned.count;
  console.error(`[engine] no count available for ${table}`);
  return null;
}

export async function getEngineTruth(): Promise<EngineTruth> {
  const liveListings = getAllProperties().length;
  const empty: EngineTruth = {
    liveListings, dailyUpdates: null, indexed: null, priceRecords: null,
    transactions: null, scoreRevisions: null, findings: null,
    observationSince: null, observationDays: null,
  };
  if (!supabase) return empty;

  try {
    const [indexed, priceRecords, transactions, scoreRevisions, findings] = await Promise.all([
      countOf('properties_registry'),
      countOf('property_pricing_history'),
      countOf('property_transactions'),
      countOf('score_history'),
      countOf('findings'),
    ]);

    // Latest day's score writes + the true start of the observation record.
    let dailyUpdates: number | null = null;
    let observationSince: string | null = null;
    let observationDays: number | null = null;

    const { data: newest } = await supabase
      .from('score_history').select('snapshot_date')
      .order('snapshot_date', { ascending: false }).limit(1);
    const { data: oldest } = await supabase
      .from('score_history').select('snapshot_date')
      .order('snapshot_date', { ascending: true }).limit(1);

    if (newest?.[0]?.snapshot_date) {
      const day = String(newest[0].snapshot_date);
      const { count } = await supabase
        .from('score_history').select('*', { count: 'exact', head: true })
        .eq('snapshot_date', day);
      dailyUpdates = count ?? null;
    }
    if (oldest?.[0]?.snapshot_date && newest?.[0]?.snapshot_date) {
      observationSince = String(oldest[0].snapshot_date);
      observationDays = Math.round(
        (Date.parse(String(newest[0].snapshot_date)) - Date.parse(observationSince)) / 86_400_000,
      ) + 1;
    }

    return {
      liveListings, dailyUpdates, indexed, priceRecords,
      transactions, scoreRevisions, findings, observationSince, observationDays,
    };
  } catch {
    return empty;
  }
}
