/**
 * Engine pulse (2026-10-21): the pure arithmetic behind the /engine market-pulse
 * line and the price-history showcase.
 *
 * Kept free of any Supabase import so it can be pinned by a hermetic test
 * (scripts/test-engine-pulse.ts). Every function here takes rows that were
 * actually captured in price_snapshots and returns either a figure derived from
 * them or an explicit absence (null / empty). Nothing in this file may invent,
 * pad or default a number: if the rows are not there, the pulse says nothing.
 */

export interface SnapPoint {
  ref: string;
  price: number | null;
  snapshot_date: string; // YYYY-MM-DD
}

export interface PriceCut {
  ref: string;
  date: string; // day the lower price was first captured
  from: number;
  to: number;
  pct: number; // negative, e.g. -4.2
}

export interface MarketPulse {
  /** Price-cut events captured in the window (one per ref per drop). */
  cuts: number;
  /** Distinct homes that took at least one cut in the window. */
  homesCut: number;
  /** Median cut size in percent (negative), or null when there were no cuts. */
  medianCutPct: number | null;
  /** First and last snapshot day the window actually covers. */
  from: string | null;
  to: string | null;
}

export interface PriceHistory {
  ref: string;
  town: string;
  title: string | null;
  points: Array<{ date: string; price: number }>;
  cuts: PriceCut[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Group snapshot rows into per-ref series, sorted by day, dropping null/zero prices. */
export function seriesByRef(rows: SnapPoint[], keep?: (ref: string) => boolean): Map<string, Array<{ date: string; price: number }>> {
  const out = new Map<string, Array<{ date: string; price: number }>>();
  for (const r of rows) {
    if (!r?.ref || r.price == null) continue;
    const price = Math.round(Number(r.price));
    if (!Number.isFinite(price) || price <= 0) continue;
    if (keep && !keep(r.ref)) continue;
    const date = String(r.snapshot_date).slice(0, 10);
    const list = out.get(r.ref);
    if (list) list.push({ date, price });
    else out.set(r.ref, [{ date, price }]);
  }
  for (const list of out.values()) list.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

/** Every drop between two consecutive captured prices in one series. */
export function cutsInSeries(ref: string, points: Array<{ date: string; price: number }>): PriceCut[] {
  const cuts: PriceCut[] = [];
  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1].price;
    const to = points[i].price;
    if (to < from) cuts.push({ ref, date: points[i].date, from, to, pct: round1(((to - from) / from) * 100) });
  }
  return cuts;
}

/** Median of a non-empty list; null for an empty one. Never a default. */
export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * The market pulse over a snapshot window. Returns null when the window holds
 * no observations at all, so the page can hide the line instead of printing a
 * zero that would read as "the market did nothing".
 */
export function summarizePulse(rows: SnapPoint[], keep?: (ref: string) => boolean): MarketPulse | null {
  const series = seriesByRef(rows, keep);
  if (!series.size) return null;
  let first: string | null = null;
  let last: string | null = null;
  const cuts: PriceCut[] = [];
  for (const [ref, pts] of series) {
    if (!first || pts[0].date < first) first = pts[0].date;
    const end = pts[pts.length - 1].date;
    if (!last || end > last) last = end;
    cuts.push(...cutsInSeries(ref, pts));
  }
  const med = median(cuts.map((c) => c.pct));
  return {
    cuts: cuts.length,
    homesCut: new Set(cuts.map((c) => c.ref)).size,
    medianCutPct: med == null ? null : round1(med),
    from: first,
    to: last,
  };
}

/** Refs ranked by how many cuts they took in `rows` (ties: deepest total cut first). */
export function rankByCuts(rows: SnapPoint[], keep?: (ref: string) => boolean, limit = 8): string[] {
  const series = seriesByRef(rows, keep);
  const ranked: Array<{ ref: string; n: number; depth: number }> = [];
  for (const [ref, pts] of series) {
    const cuts = cutsInSeries(ref, pts);
    if (!cuts.length) continue;
    ranked.push({ ref, n: cuts.length, depth: cuts.reduce((s, c) => s + c.pct, 0) });
  }
  ranked.sort((a, b) => b.n - a.n || a.depth - b.depth || a.ref.localeCompare(b.ref));
  return ranked.slice(0, limit).map((r) => r.ref);
}

/**
 * From full per-ref histories, the single series with the most captured cuts.
 * Null when no series holds a cut: the chart is only worth showing if it shows
 * the thing it exists to show.
 */
export function pickShowcase(rows: SnapPoint[]): { ref: string; points: Array<{ date: string; price: number }>; cuts: PriceCut[] } | null {
  const series = seriesByRef(rows);
  let best: { ref: string; points: Array<{ date: string; price: number }>; cuts: PriceCut[] } | null = null;
  for (const [ref, points] of series) {
    const cuts = cutsInSeries(ref, points);
    if (!cuts.length) continue;
    if (
      !best ||
      cuts.length > best.cuts.length ||
      (cuts.length === best.cuts.length && points.length > best.points.length)
    ) {
      best = { ref, points, cuts };
    }
  }
  return best;
}
