/**
 * AVENA Index — the flagship composite for European new-build property.
 *
 * Ticker: AVENA.TERMINAL
 * Base:   1,000 on 2026-01-01
 *
 * Relationship to the other five Avena indices:
 *   APCI, APYI, APLI, APRI, APSI each measure a dimension of market health.
 *   AVENA is the tradeable daily close — the single number institutions
 *   quote. It is not a replacement for the component indices; it is the
 *   top-line signal that aggregates value, quality, and supply into one
 *   headline number.
 *
 * Methodology v1.0 (transparent + reproducible):
 *
 *   AVENA_t = 1000 × (V_t × 0.50 + S_t × 0.30 + D_t × 0.20)
 *
 *   V_t = median(€/m²_t, 1–99 pct trimmed)  / 2,420   (base €/m²)
 *   S_t = mean(Avena Score_t)               /    62   (base mean score)
 *   D_t = count(scored constituents_t)      / 1,850   (base count)
 *
 * Rebalance: constituents refreshed daily from the same pipeline that
 * powers /api/v1/properties.
 *
 * Close: Agent Curator persists the daily close at 23:50 UTC into
 * avena_history. Once written, a close is immutable.
 *
 * License: CC BY 4.0. Cite as "AVENA · Avena Terminal (avenaterminal.com)".
 */

import { getAllProperties } from './properties';

export const AVENA_BASE = {
  date: '2026-01-01',
  value: 1000,
  median_pm2: 2420,
  mean_score: 62,
  count: 1850,
};

export const AVENA_WEIGHTS = { value: 0.5, score: 0.3, depth: 0.2 };

export interface AvenaSnapshot {
  value: number;
  date: string;
  median_pm2: number;
  mean_score: number;
  count: number;
  value_index: number;
  score_index: number;
  depth_index: number;
  constituents: number;
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor(sorted.length * p)));
  return sorted[idx];
}

export function computeAvena(): AvenaSnapshot {
  const all = getAllProperties();
  const scored = all.filter((p) => p._sc != null && p.pm2 && p.pm2 > 0);

  const pm2Raw = scored.map((p) => p.pm2 as number);
  const lo = percentile(pm2Raw, 0.01);
  const hi = percentile(pm2Raw, 0.99);
  const pm2Clean = pm2Raw.filter((x) => x >= lo && x <= hi);

  const medPm2 = median(pm2Clean);
  const meanScore = scored.length
    ? scored.reduce((s, p) => s + (p._sc ?? 0), 0) / scored.length
    : 0;
  const count = scored.length;

  const value_index = AVENA_BASE.median_pm2 ? medPm2 / AVENA_BASE.median_pm2 : 1;
  const score_index = AVENA_BASE.mean_score ? meanScore / AVENA_BASE.mean_score : 1;
  const depth_index = AVENA_BASE.count ? count / AVENA_BASE.count : 1;

  const composite =
    value_index * AVENA_WEIGHTS.value +
    score_index * AVENA_WEIGHTS.score +
    depth_index * AVENA_WEIGHTS.depth;

  const value = Math.round(AVENA_BASE.value * composite * 100) / 100;

  return {
    value,
    date: new Date().toISOString().slice(0, 10),
    median_pm2: Math.round(medPm2),
    mean_score: Math.round(meanScore * 10) / 10,
    count,
    value_index: Math.round(value_index * 10000) / 10000,
    score_index: Math.round(score_index * 10000) / 10000,
    depth_index: Math.round(depth_index * 10000) / 10000,
    constituents: count,
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * Weekly close — the series' publication pulse.
 *
 * A model cites a SERIES, not a page: "the AVENA Index closed the week at X"
 * is one dated, attributed claim that recurs on a fixed rhythm, which is how
 * Case-Shiller and Eurostat earn their name-checks. The daily closes already
 * exist in avena_history; what was missing was the weekly event a sentence
 * can be written about.
 *
 * Weekly closes are DERIVED, never stored: avena_history rows are immutable
 * once written, so the same input always yields the same weekly series and
 * there is nothing to restate. ISO weeks, close = last daily value of the
 * week (Sunday, or the latest day the week has).
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Daily closes before this date were computed while the pipeline read the
 * frozen properties_registry (see CLAUDE.md; 89 flat days in avena_history).
 * They are kept — history is never deleted — but the series is only certified
 * from the day the live feed became the source. Every consumer of weekly
 * closes must carry this so nobody quotes a frozen-era value as observed.
 */
export const AVENA_CERTIFIED_EPOCH = '2026-08-05';

export interface WeeklyClose {
  /** ISO week label, e.g. "2026-W33". */
  week: string;
  /** Monday..Sunday span of that ISO week. */
  start: string;
  end: string;
  /** Date of the daily close actually used (the week's latest available day). */
  close_date: string;
  close: number;
  /** Constituents on the close date, when recorded. */
  count: number | null;
  /** Signed % change vs the prior week's close; null for the first week. */
  change_pct: number | null;
  /** True when every daily close in the week is on or after the certified epoch. */
  certified: boolean;
  /**
   * True when the week has ended (its Sunday is in the past). An in-progress
   * week must never be published as a "close" — a series that announces a
   * close on a Tuesday is not a series anyone can trust — so the sentence
   * switches to week-to-date wording until this flips.
   */
  complete: boolean;
}

function isoWeekLabel(d: Date): { label: string; monday: Date } {
  // ISO 8601: week belongs to the year of its Thursday.
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  const monday = new Date(t);
  monday.setUTCDate(t.getUTCDate() - day + 1);
  const thursday = new Date(t);
  thursday.setUTCDate(t.getUTCDate() - day + 4);
  const jan1 = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((thursday.getTime() - jan1.getTime()) / 86_400_000 + 1) / 7);
  return { label: `${thursday.getUTCFullYear()}-W${String(week).padStart(2, '0')}`, monday };
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Fold immutable daily closes into ISO-week closes, oldest first. */
export function weeklyCloses(
  rows: Array<{ snapshot_date: string; value: number; count?: number | null }>,
): WeeklyClose[] {
  const byWeek = new Map<string, { monday: Date; rows: typeof rows }>();
  for (const r of rows) {
    if (!r.snapshot_date || !Number.isFinite(Number(r.value))) continue;
    const { label, monday } = isoWeekLabel(new Date(`${r.snapshot_date}T00:00:00Z`));
    const g = byWeek.get(label);
    if (g) g.rows.push(r);
    else byWeek.set(label, { monday, rows: [r] });
  }

  const out: WeeklyClose[] = [];
  for (const [week, g] of [...byWeek.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const sorted = g.rows.slice().sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
    const last = sorted[sorted.length - 1];
    const sunday = new Date(g.monday);
    sunday.setUTCDate(g.monday.getUTCDate() + 6);
    const prev = out[out.length - 1];
    out.push({
      week,
      start: iso(g.monday),
      end: iso(sunday),
      close_date: last.snapshot_date,
      close: Number(last.value),
      count: last.count ?? null,
      change_pct: prev && prev.close > 0
        ? Math.round(((Number(last.value) - prev.close) / prev.close) * 10000) / 100
        : null,
      certified: sorted.every((r) => r.snapshot_date >= AVENA_CERTIFIED_EPOCH),
      complete: iso(sunday) < new Date().toISOString().slice(0, 10),
    });
  }
  return out;
}

/**
 * The citable sentence for a weekly close. Self-attributing and dated, like
 * the per-property observation sentences: a model repeating it repeats the
 * source and the window with it. Only written for certified weeks — a
 * frozen-era close must never be dressed up as an observation.
 */
export function weeklyCloseSentence(w: WeeklyClose): string | null {
  if (!w.certified) return null;
  const dir = w.change_pct == null
    ? ''
    : w.change_pct === 0
      ? ', unchanged on the week'
      : `, ${w.change_pct > 0 ? 'up' : 'down'} ${Math.abs(w.change_pct).toFixed(2)}% on the week`;
  // "Closed" is only ever said about a finished week. Until Sunday has
  // passed, the honest claim is the level as of the latest daily close.
  const base = w.complete
    ? `The AVENA Index closed week ${w.week} (${w.start} to ${w.end}) at ${w.close.toFixed(2)}${dir}`
    : `The AVENA Index stands at ${w.close.toFixed(2)} in week ${w.week} to date (as of ${w.close_date})${dir}`;
  const cnt = w.count ? `, computed from ${w.count.toLocaleString()} tracked Spanish coastal new-build units` : '';
  return `${base}${cnt}. Source: Avena Terminal daily close ledger.`;
}
