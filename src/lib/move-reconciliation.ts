/**
 * Reconciling DERIVED price moves against the LOGGED move events.
 *
 * WHY THIS FILE EXISTS — it is a fix for my own method, not for the pipeline.
 *
 * The figure "N real moves, M logged, K unlogged" has been quoted in daily
 * briefs and is the case for a branch awaiting approval. It had never been
 * committed as code. Re-derived by hand on three consecutive mornings it gave
 * three different answers (568 / 632 / 609 real; 31 / 66 unlogged), because
 * each ad-hoc query gated the window differently. An unreproducible
 * measurement cannot support a decision, and quoting a number whose method
 * lives only in a transcript is exactly the overstatement this project is
 * supposed to be ruthless about.
 *
 * THE DISTINCTION THAT WAS BEING BLENDED, and the reason the count wandered:
 * two completely different populations were being summed into one "unlogged".
 *
 *  1. CONSECUTIVE moves — the ref was in yesterday's book and today's, at a
 *     different price. `deltas.ts` is the canonical reader for these and gates
 *     a move to a prior snapshot no more than MAX_CONSECUTIVE_GAP_DAYS old.
 *     Measured 2026-10-08: every such move since the event log began on
 *     2026-08-12 IS logged. The only unlogged ones are dated 08-06..08-11,
 *     before the log wrote anything. That half is HEALTHY and closed.
 *
 *  2. RELISTING moves — the ref left the feed and came back later at a
 *     different price. These are invisible to the canonical rule BY
 *     CONSTRUCTION: the gap exceeds the window, so `deltas.ts` correctly
 *     declines to call them a daily move. But they are real observations, and
 *     they are the LARGEST repricings the capture produces.
 *     Measured 2026-10-08: 18 since 2026-08-12 and ZERO logged — a 100% loss
 *     rate, not the 5.6% a blended figure implied. N8648 +32.4%, N8647 +19.8%,
 *     SP1484 +23.8%, SP1750 +14.0%, SP1018 -10.9%; most recent N9949/N9955 on
 *     2026-10-06, so it is ongoing, not historical.
 *
 * So the blended number understated the defect it was cited for and overstated
 * the health of the other half. Both figures are reported separately here and
 * there is deliberately NO combined "unlogged" total to quote.
 *
 * Pure functions over rows, in the style of capture-integrity.ts: the callers
 * already hold both sides, and a second database read is not what was missing
 * — a NAME for each population was.
 */

/** Matches the gate in deltas.ts: a move needs a prior snapshot this recent. */
export const MAX_CONSECUTIVE_GAP_DAYS = 2;

/**
 * The day property_pricing_history began holding real move events. Before it,
 * an unlogged move is expected and says nothing about the current pipeline;
 * after it, an unlogged move is a live defect. Conflating the two is what made
 * the hand-derived counts unstable. See CLAUDE.md's 2026-08-08 audit block and
 * deltas.ts: 394k dead `listed` rows stop on 08-05, real events start 08-12.
 */
export const EVENT_LOG_START = '2026-08-12';

export interface SnapshotRow {
  ref: string;
  snapshot_date: string; // YYYY-MM-DD
  price: number | null;
}

/** A logged 'reduced'/'increased' row, reduced to the two fields that match. */
export interface MoveEventRow {
  ref: string;
  date: string; // YYYY-MM-DD, recorded_at in UTC
}

export type MoveKind = 'consecutive' | 'relisting';

export interface DerivedMove {
  ref: string;
  from: number;
  to: number;
  prevDate: string;
  date: string;
  gapDays: number;
  kind: MoveKind;
  pct: number;
}

const dayDiff = (a: string, b: string) =>
  Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000);

export interface DeriveResult {
  moves: DerivedMove[];
  /**
   * Rows dropped because price was null/non-finite. Reported rather than
   * silently skipped: a null price that quietly vanishes is how a broken
   * enrichment pass looks identical to a quiet market.
   */
  rowsSkippedNullPrice: number;
}

/**
 * Every price change visible in the snapshot rows, each labelled with which
 * population it belongs to. Does NOT filter by date — the caller decides the
 * window, so the window is always explicit at the call site.
 */
export function deriveMoves(rows: SnapshotRow[]): DeriveResult {
  const byRef = new Map<string, SnapshotRow[]>();
  let rowsSkippedNullPrice = 0;
  for (const r of rows) {
    const p = typeof r.price === 'string' ? Number(r.price) : r.price;
    if (p === null || p === undefined || !Number.isFinite(p)) {
      rowsSkippedNullPrice++;
      continue;
    }
    const list = byRef.get(r.ref);
    const row: SnapshotRow = { ref: r.ref, snapshot_date: r.snapshot_date, price: p };
    if (list) list.push(row);
    else byRef.set(r.ref, [row]);
  }

  const moves: DerivedMove[] = [];
  for (const [ref, list] of byRef) {
    list.sort((a, b) => (a.snapshot_date < b.snapshot_date ? -1 : a.snapshot_date > b.snapshot_date ? 1 : 0));
    for (let i = 1; i < list.length; i++) {
      const prev = list[i - 1];
      const cur = list[i];
      const from = prev.price as number;
      const to = cur.price as number;
      if (from === to) continue;
      const gapDays = dayDiff(cur.snapshot_date, prev.snapshot_date);
      moves.push({
        ref,
        from,
        to,
        prevDate: prev.snapshot_date,
        date: cur.snapshot_date,
        gapDays,
        kind: gapDays <= MAX_CONSECUTIVE_GAP_DAYS ? 'consecutive' : 'relisting',
        pct: Math.round(((to - from) / from) * 1000) / 10,
      });
    }
  }
  moves.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.ref < b.ref ? -1 : 1));
  return { moves, rowsSkippedNullPrice };
}

export interface ClassBreakdown {
  total: number;
  logged: number;
  /** Unlogged and dated on/after EVENT_LOG_START — the live defect. */
  unloggedLive: number;
  /** Unlogged but predating the event log — expected, not a defect. */
  unloggedPreLog: number;
  /** The live unlogged moves themselves, largest absolute move first. */
  unloggedLiveMoves: DerivedMove[];
}

export interface ReconciliationReport {
  eventLogStart: string;
  /** Reported separately and never summed. See the header comment. */
  consecutive: ClassBreakdown;
  relisting: ClassBreakdown;
  /**
   * Logged events with no derived move on the same ref and day. An orphan is
   * not noise: it means the event log preserved an observation that
   * price_snapshots no longer contains, which a same-day re-write can cause.
   * Observed 2026-10-07 on SP0848 — logged `reduced` to 415,000 while the
   * stored snapshot for that day reads 441,000.
   */
  orphanEvents: MoveEventRow[];
  rowsSkippedNullPrice: number;
}

function breakdown(moves: DerivedMove[], logged: Set<string>): ClassBreakdown {
  let loggedCount = 0;
  const unloggedLiveMoves: DerivedMove[] = [];
  let unloggedPreLog = 0;
  for (const m of moves) {
    if (logged.has(`${m.ref}|${m.date}`)) {
      loggedCount++;
      continue;
    }
    if (m.date < EVENT_LOG_START) unloggedPreLog++;
    else unloggedLiveMoves.push(m);
  }
  unloggedLiveMoves.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
  return {
    total: moves.length,
    logged: loggedCount,
    unloggedLive: unloggedLiveMoves.length,
    unloggedPreLog,
    unloggedLiveMoves,
  };
}

/**
 * Match derived moves against logged events on (ref, day). Deliberately NOT on
 * price: the point is to find moves with no event at all, and a price-equality
 * requirement would reclassify a logged-but-later-overwritten move as missing,
 * which is a different defect (see orphanEvents).
 */
export function reconcileMoves(
  moves: DerivedMove[],
  events: MoveEventRow[],
  /**
   * Carried through from deriveMoves. Required rather than defaulted: a
   * hardcoded 0 here would be the project's signature bug — a value nobody
   * supplied, published as a measurement — in the very module written to stop
   * quoting unreproducible numbers.
   */
  rowsSkippedNullPrice: number
): ReconciliationReport {
  const logged = new Set(events.map((e) => `${e.ref}|${e.date}`));
  const derivedKeys = new Set(moves.map((m) => `${m.ref}|${m.date}`));
  return {
    eventLogStart: EVENT_LOG_START,
    consecutive: breakdown(moves.filter((m) => m.kind === 'consecutive'), logged),
    relisting: breakdown(moves.filter((m) => m.kind === 'relisting'), logged),
    orphanEvents: events.filter((e) => !derivedKeys.has(`${e.ref}|${e.date}`)),
    rowsSkippedNullPrice,
  };
}
