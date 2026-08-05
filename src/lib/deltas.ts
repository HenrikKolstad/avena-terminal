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

/**
 * Real price movements from the last `windowDays` days.
 * "to" is the live feed price (authoritative); "from" is the earliest price
 * we snapshotted for that ref inside the window — so a move only appears
 * when we actually observed both sides of it.
 */
export async function getRecentPriceMoves(windowDays = 7, limit = 6): Promise<PriceMove[]> {
  if (!supabase) return [];
  try {
    const since = daysAgo(windowDays);

    // Change events written by the cron (small set — only actual moves).
    const { data: events } = await supabase
      .from('property_pricing_history')
      .select('avn_prop_id, recorded_at, status')
      .gte('recorded_at', since)
      .in('status', ['reduced', 'increased'])
      .order('recorded_at', { ascending: false })
      .limit(400);
    if (!events?.length) return [];

    const byRef = new Map(getAllProperties().filter((p) => p.ref && p.pf > 0).map((p) => [p.ref as string, p]));
    // Latest event per ref, only refs still in the live feed.
    const latestEvent = new Map<string, string>();
    for (const e of events) {
      if (!byRef.has(e.avn_prop_id)) continue;
      if (!latestEvent.has(e.avn_prop_id)) latestEvent.set(e.avn_prop_id, String(e.recorded_at).slice(0, 10));
    }
    if (latestEvent.size === 0) return [];

    // Earliest snapshotted price per ref inside the window = the "from" side.
    const refs = [...latestEvent.keys()].slice(0, 200);
    const { data: snaps } = await supabase
      .from('price_snapshots')
      .select('ref, price, snapshot_date')
      .in('ref', refs)
      .gte('snapshot_date', daysAgo(windowDays + 1))
      .order('snapshot_date', { ascending: true });

    const fromByRef = new Map<string, number>();
    for (const s of snaps ?? []) {
      if (!fromByRef.has(s.ref) && s.price != null) fromByRef.set(s.ref, Number(s.price));
    }

    const moves: PriceMove[] = [];
    for (const [ref, date] of latestEvent) {
      const p = byRef.get(ref)!;
      const from = fromByRef.get(ref);
      const to = Math.round(p.pf);
      if (!from || Math.abs(to - from) < 1) continue; // never fabricate a move
      moves.push({ ref, town: (p.l || '').split(',')[0].trim(), from: Math.round(from), to, date });
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
