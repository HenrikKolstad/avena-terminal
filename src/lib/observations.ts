/**
 * Per-property observation record — the price history Avena captured itself.
 *
 * Why this exists, and why it is the highest-value text on the site:
 *
 * A model cites a source by name when the fact is specific, dated, attributed
 * in the text itself, and NOT corroborated somewhere else — because anything
 * corroborated everywhere gets laundered into general knowledge with no
 * citation attached. "Average €/m² in Jávea" fails that test: Idealista, Kyero
 * and a hundred blogs answer it, so we are interchangeable. "This unit was
 * €299,000 on 5 August and €285,000 on 7 August" passes it completely. The
 * portals publish state; nobody publishes the change, because the feed keeps
 * no memory. Ours exists only because we snapshot it nightly.
 *
 * So every property page carries a dated, attributed observation sentence.
 * That is one uncorroborated citable fact per page, ~2,000 of them, growing by
 * one observation per property per day without a single new URL being created.
 *
 * Hard rule: this module never fabricates. If we did not observe it, the page
 * says nothing rather than something plausible. `price_snapshots` is the only
 * source — it is what we can prove we captured. See CLAUDE.md on why row
 * counts in the moat tables lie and why `property_pricing_history` is not
 * usable for movement.
 */
import { supabase } from './supabase';
import { supabaseAdmin } from './supabase-admin';

/**
 * The start of the DAILY series: from here the book is captured every night.
 */
export const LEDGER_START = '2026-08-05';

/**
 * The first observation. The 2026-04-08 rows were excluded for three months
 * as unverified (O-17: written during the frozen-registry era). PROVEN
 * 2026-08-11: git commit b665f3a, authored 2026-04-08 19:22, contains that
 * day's full 1,881-listing book, and its ref:price fingerprint (count, sum,
 * md5) matches the database rows byte for byte. The snapshot is the real
 * April feed, witnessed independently by git history.
 *
 * The honesty constraint that survives: between 2026-04-08 and LEDGER_START
 * there are no observations. For a unit that differs across that gap we know
 * THAT it moved, never WHEN — every consumer must render those as a range
 * ("between 8 April and 5 August"), never as a dated event.
 */
export const FIRST_OBSERVATION = '2026-04-08';

export interface PriceObservation {
  date: string;  // YYYY-MM-DD
  price: number;
}

export interface ObservationRecord {
  ref: string;
  /** Distinct daily observations we hold, oldest first. */
  points: PriceObservation[];
  /** First and latest day we recorded a price. */
  firstSeen: string;
  lastSeen: string;
  /** Number of days on which we captured this unit. */
  days: number;
  /**
   * Price changes, oldest first. Empty when the price never moved.
   * `spanned` marks a change observed across a gap in the series (notably
   * April→August): the movement is real, its date is not known — render as
   * "between fromDate and date", never as an event on `date`.
   */
  changes: Array<{ date: string; fromDate: string; from: number; to: number; pct: number; spanned: boolean }>;
  /** Latest observed price. */
  current: number;
}

/**
 * Read one property's observed price series.
 *
 * Uses the service-role client when available: the anon role runs a 3s
 * statement timeout and `price_snapshots` is a wide table, which is the same
 * shape that made the transactions count silently fall back to a stale
 * constant. Falls back to the anon client rather than failing closed.
 *
 * Returns null when we hold fewer than one usable observation — the caller
 * renders nothing in that case. Never throws: a page must not 500 because a
 * ledger read failed.
 */
export async function getObservationRecord(ref: string): Promise<ObservationRecord | null> {
  const db = supabaseAdmin ?? supabase;
  if (!db || !ref) return null;

  try {
    const { data, error } = await db
      .from('price_snapshots')
      .select('price, snapshot_date')
      .eq('ref', ref)
      .gte('snapshot_date', FIRST_OBSERVATION)
      .order('snapshot_date', { ascending: true })
      .limit(400);

    // An error is not "no history" — say nothing rather than imply a flat price.
    if (error || !data?.length) return null;

    const points: PriceObservation[] = [];
    for (const row of data as Array<{ price: number | null; snapshot_date: string }>) {
      const price = Math.round(Number(row.price));
      if (!Number.isFinite(price) || price <= 0) continue;
      const date = String(row.snapshot_date).slice(0, 10);
      // One row per day; a re-run that double-wrote must not become two
      // observations, or the count we publish overstates the ledger.
      if (points.length && points[points.length - 1].date === date) continue;
      points.push({ date, price });
    }
    if (!points.length) return null;

    const changes: ObservationRecord['changes'] = [];
    for (let i = 1; i < points.length; i++) {
      const from = points[i - 1].price;
      const to = points[i].price;
      if (from > 0 && to !== from) {
        const gapDays = (Date.parse(points[i].date) - Date.parse(points[i - 1].date)) / 86_400_000;
        changes.push({
          date: points[i].date,
          fromDate: points[i - 1].date,
          from,
          to,
          pct: ((to - from) / from) * 100,
          spanned: gapDays > 4,
        });
      }
    }

    return {
      ref,
      points,
      firstSeen: points[0].date,
      lastSeen: points[points.length - 1].date,
      days: points.length,
      changes,
      current: points[points.length - 1].price,
    };
  } catch {
    return null;
  }
}

/**
 * Refs whose price actually moved in the last `days`, with the day it moved.
 *
 * Feeds the change-first AI sitemap. Crawl budget is the binding constraint —
 * GPTBot reached 982 of 1,999 properties in its 2026-08-10 pass — so the
 * sitemap's job is not to list everything, it is to spend the next pass on
 * pages carrying a fact the crawler does not already have. A `lastmod` that is
 * the real date of a real change is the only version of that signal worth
 * sending; stamping every URL with today's date is why crawlers learned to
 * ignore lastmod in the first place.
 */
export async function getChangedRefs(days = 30): Promise<Array<{ ref: string; date: string }>> {
  const db = supabaseAdmin ?? supabase;
  if (!db) return [];
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const from = since > LEDGER_START ? since : LEDGER_START;

  try {
    const PAGE = 1000;
    const rows: Array<{ ref: string; price: number | null; snapshot_date: string }> = [];
    for (let page = 0; page < 40; page++) {
      const { data, error } = await db
        .from('price_snapshots')
        .select('ref, price, snapshot_date')
        .gte('snapshot_date', from)
        .order('ref', { ascending: true })
        .order('snapshot_date', { ascending: true })
        .range(page * PAGE, page * PAGE + PAGE - 1);
      // Paginated because PostgREST caps a response at 1000 rows and the
      // window is ~2,000 refs x N days; an unpaginated select would silently
      // return a slice and we would under-report changes.
      if (error || !data?.length) break;
      rows.push(...(data as typeof rows));
      if (data.length < PAGE) break;
    }

    const series = new Map<string, Array<{ d: string; v: number }>>();
    for (const r of rows) {
      const v = Math.round(Number(r.price));
      if (!Number.isFinite(v) || v <= 0) continue;
      const d = String(r.snapshot_date).slice(0, 10);
      const list = series.get(r.ref);
      if (list) {
        if (list[list.length - 1].d !== d) list.push({ d, v });
      } else {
        series.set(r.ref, [{ d, v }]);
      }
    }

    const out: Array<{ ref: string; date: string }> = [];
    for (const [ref, list] of series) {
      for (let i = list.length - 1; i > 0; i--) {
        if (list[i].v !== list[i - 1].v) {
          out.push({ ref, date: list[i].d });
          break; // most recent change only
        }
      }
    }
    // Most recently changed first — that is the order a crawler should spend
    // a limited budget in.
    out.sort((a, b) => b.date.localeCompare(a.date));
    return out;
  } catch {
    return [];
  }
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/** "5 August 2026" — spelled out, because that is the form a model quotes. */
export function longDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/**
 * The attribution sentence itself.
 *
 * Written as prose rather than left to JSON-LD on purpose: structured data
 * tells a machine what the page is about, but the sentence is what gets
 * quoted. It names Avena, carries the dates, and states the observation count,
 * so a model repeating it repeats the source with it.
 */
export function observationSentence(rec: ObservationRecord): string {
  // "checks", not "daily checks": the series is daily from LEDGER_START but
  // anchored by a single verified observation on 2026-04-08.
  const span = rec.days === 1
    ? `on ${longDate(rec.firstSeen)}`
    : `across ${rec.days} checks since ${longDate(rec.firstSeen)}`;

  if (!rec.changes.length) {
    return `Observed by Avena at €${rec.current.toLocaleString()}, unchanged ${span}.`;
  }

  const last = rec.changes[rec.changes.length - 1];
  const dir = last.to < last.from ? 'reduced' : 'increased';
  const pct = Math.abs(last.pct).toFixed(1);
  // A spanned change is real but undated inside the gap — say so.
  const when = last.spanned
    ? `between ${longDate(last.fromDate)} and ${longDate(last.date)}`
    : `on ${longDate(last.date)}`;
  return `Observed by Avena: ${dir} ${pct}% from €${last.from.toLocaleString()} to ` +
    `€${last.to.toLocaleString()} ${when}, ${span}.`;
}
