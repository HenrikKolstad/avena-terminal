/**
 * Is a crawler's traffic a RATE or a BURST?
 *
 * This exists because a window total is not a rate, and I published that
 * confusion twice in two days. Reporting `crawler_hits` as a 7-day total gave
 * "meta-externalagent is the largest consumer of the origin by 4x" on
 * 2026-10-07 and "meta-externalagent has STOPPED, five days of silence" on
 * 2026-10-08. The underlying data was one ~20-hour burst — 116,709 hits
 * between 2026-10-02 22:39 and 2026-10-03 18:49, against 1-3 hits on its other
 * active days. It never had a rate to be largest at, and a burst ending is not
 * a stop. Run the window query a day later and the same data yields a third
 * false claim: a "collapse" that is only the burst leaving the window.
 *
 * So: no total is reportable without the daily series behind it, and a
 * crawler whose busiest day holds a disproportionate share of the window is
 * labelled a burst, whose total must not be read as a rate.
 *
 * Deliberately pure — no Supabase, no fetch — so the judgement that produces
 * the published claim is testable without credentials. The real 10-02/10-03
 * meta-externalagent series and the steady Googlebot/AwarioBot series are
 * pinned as fixtures in scripts/test-crawler-shape.ts.
 */

export interface DailyHits { day: string; hits: number }

export interface CrawlerShape {
  crawler: string;
  total: number;
  active_days: number;
  max_day: number;
  max_day_date: string;
  top_day_share: number;
  shape: 'burst' | 'steady';
  /** Mean over days the crawler was actually active. Null for a burst: a
   *  burst has no meaningful per-day rate, and returning one invites exactly
   *  the misreading this module exists to stop. */
  per_day_rate: number | null;
}

/**
 * Perfectly uniform traffic puts 1/windowDays on its busiest day, so the raw
 * threshold is four times that. It is then CLAMPED at both ends, and the first
 * version of this function got the short end backwards — `max(0.35, 4/days)`
 * returns 2.0 for a two-day window, which makes a burst impossible to detect
 * rather than easy. The test caught it.
 *
 *   FLOOR 0.35 — a long window must not brand ordinary day-to-day variation a
 *                burst. Over 40 days, 4x uniform is 10%, which almost any
 *                crawler clears on its busiest day.
 *   CAP   0.90 — a short window must still be able to detect one. Over 2 days
 *                uniform is already 50%, so without the cap nothing qualifies.
 *
 * A reporting guard, not a claim about a crawler's intent.
 */
export function burstThreshold(windowDays: number): number {
  if (!Number.isFinite(windowDays) || windowDays <= 0) {
    throw new Error('burstThreshold: windowDays must be a positive number');
  }
  return Math.min(0.9, Math.max(0.35, 4 / windowDays));
}

export function classifyCrawler(crawler: string, daily: DailyHits[], windowDays: number): CrawlerShape {
  const active = daily.filter((d) => d.hits > 0);
  if (!active.length) {
    throw new Error(`classifyCrawler(${crawler}): no active days — an absence is not a shape, report it as an absence`);
  }
  const total = active.reduce((s, d) => s + d.hits, 0);
  const max = active.reduce((m, d) => (d.hits > m.hits ? d : m), active[0]);
  const share = total > 0 ? max.hits / total : 0;
  const shape: CrawlerShape['shape'] = share >= burstThreshold(windowDays) ? 'burst' : 'steady';
  return {
    crawler,
    total,
    active_days: active.length,
    max_day: max.hits,
    max_day_date: max.day,
    top_day_share: Number(share.toFixed(3)),
    shape,
    per_day_rate: shape === 'steady' ? Math.round(total / active.length) : null,
  };
}

/**
 * How a shape may be written down. A burst never gets a "per day" sentence.
 */
export function describeShape(s: CrawlerShape): string {
  if (s.shape === 'burst') {
    return `${s.crawler}: ${s.total.toLocaleString('en-US')} hits, but ` +
      `${(s.top_day_share * 100).toFixed(1)}% of them on ${s.max_day_date} — a burst. ` +
      `Not a crawl rate; do not quote this total as one.`;
  }
  return `${s.crawler}: ~${s.per_day_rate?.toLocaleString('en-US')}/day over ` +
    `${s.active_days} active days (${s.total.toLocaleString('en-US')} total).`;
}

/**
 * The ranking a reader can act on: sustained consumers only, bursts removed.
 */
export function sustainedRanking(shapes: CrawlerShape[]): CrawlerShape[] {
  return shapes
    .filter((s) => s.shape === 'steady')
    .sort((a, b) => (b.per_day_rate ?? 0) - (a.per_day_rate ?? 0));
}
