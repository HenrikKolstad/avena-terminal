/**
 * Unit identity for price moves — is a price change on a listing ref a real
 * repricing, or did the ref start describing a different unit?
 *
 * WHY. Developers advertise several units of one building under one ref and
 * swap which unit it shows (smallest flat one week, penthouse the next). A
 * diff on price alone reads that as a 50 % "move". Since 2026-10-24 every
 * price_snapshots row carries the unit's specs and a `move_status` verdict,
 * stamped by a database trigger (supabase/migrations/20261024_price_move_
 * verification.sql). Only `verified` changes are price moves.
 *
 * The constants and rules are mirrored in that migration and in
 * scripts/pulse/unit_identity.py — change all three together.
 */
/** Built / plot m² may differ by at most this share and still be the same unit. */
export const SIZE_TOL = 0.02;
/** Moves at or above this size need extra evidence before they count. */
export const LARGE_MOVE = 0.25;
/** A large move's new EUR/m² must sit within this band of the area benchmark. */
export const PM2_BAND: readonly [number, number] = [0.5, 2.0];
/** A large move that returns exactly to a price seen within this many days is two units alternating. */
export const RECUR_DAYS = 365;

export type MoveStatus = 'verified' | 'unit_changed' | 'unverified';

const pos = (n: unknown): number | null => {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? v : null;
};

export interface SnapSide {
  price: number;
  pm2?: number | null;
  type?: string | null;
  built_m2?: number | null;
  plot_m2?: number | null;
  beds?: number | null;
  baths?: number | null;
  img_sig?: string | null;
}

/** Same rules as public.price_move_verdict(). Returns null when the price did not change. */
export function moveVerdict(prev: SnapSide, cur: SnapSide, mm2?: number | null, priceRecurs = false):
  { status: MoveStatus; note: string | null } | null {
  const pp = Number(prev.price), cp = Number(cur.price);
  if (!(pp > 0) || !(cp > 0) || Math.abs(cp - pp) < 1) return null;
  const pct = (cp - pp) / pp;
  const built = (s: SnapSide, price: number) => pos(s.built_m2) ?? (pos(s.pm2) ? price / Number(s.pm2) : null);
  const ba = built(prev, pp), bb = built(cur, cp);
  const rel = (a: number, b: number) => Math.abs(a - b) / Math.max(a, b);
  const notes: string[] = [];
  if (prev.type && cur.type && prev.type !== cur.type) notes.push(`type ${prev.type}→${cur.type}`);
  if (prev.beds != null && cur.beds != null && prev.beds !== cur.beds) notes.push(`beds ${prev.beds}→${cur.beds}`);
  if (prev.baths != null && cur.baths != null && prev.baths !== cur.baths) notes.push(`baths ${prev.baths}→${cur.baths}`);
  if (ba && bb && rel(ba, bb) > SIZE_TOL) notes.push(`built ${Math.round(ba)}→${Math.round(bb)} m²`);
  const pa = pos(prev.plot_m2), pb = pos(cur.plot_m2);
  if (pa && pb && rel(pa, pb) > SIZE_TOL) notes.push(`plot ${Math.round(pa)}→${Math.round(pb)} m²`);
  if (notes.length) return { status: 'unit_changed', note: notes.join('; ') };
  if (Math.abs(pct) >= LARGE_MOVE) {
    const why: string[] = [];
    if (!ba || !bb || prev.beds == null || cur.beds == null || !prev.type || !cur.type) why.push('spec data missing');
    if (prev.img_sig && cur.img_sig && prev.img_sig !== cur.img_sig) why.push('image set replaced');
    const m = pos(mm2);
    if (m && bb) {
      const r = cp / bb / m;
      if (r < PM2_BAND[0] || r > PM2_BAND[1]) why.push(`€/m² ${Math.round(cp / bb)} vs area ${Math.round(m)}`);
    }
    if (priceRecurs) why.push('returns exactly to an earlier asking price (alternating units)');
    if (why.length) return { status: 'unverified', note: why.join('; ') };
  }
  return { status: 'verified', note: null };
}

/** Columns a consumer should select alongside ref/price/snapshot_date. */
export const MOVE_COLUMNS = 'move_status';

interface SeriesRow { ref: string; price: number | null; snapshot_date: string; move_status?: string | null }

/**
 * A row where the listing switched to another unit (or a large move we could
 * not verify) is a break in the series, not a move. Returns the rows with
 * everything BEFORE each ref's last break removed, so a consumer that diffs
 * consecutive prices only ever sees the current unit's own history.
 */
export function dropPreUnitChange<T extends SeriesRow>(rows: T[]): T[] {
  const lastBreak = new Map<string, string>();
  for (const r of rows) {
    if (r.move_status === 'unit_changed' || r.move_status === 'unverified') {
      const d = String(r.snapshot_date).slice(0, 10);
      const cur = lastBreak.get(r.ref);
      if (!cur || d > cur) lastBreak.set(r.ref, d);
    }
  }
  if (!lastBreak.size) return rows;
  return rows.filter((r) => {
    const b = lastBreak.get(r.ref);
    return !b || String(r.snapshot_date).slice(0, 10) >= b;
  });
}

/** True for a ref whose change rows in `rows` include a unit change / unverified jump. */
export function isUnitBreak(row: { move_status?: string | null }): boolean {
  return row.move_status === 'unit_changed' || row.move_status === 'unverified';
}
