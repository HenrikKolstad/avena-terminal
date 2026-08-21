/**
 * Pure decision logic for the scribe capture, extracted so it can be tested
 * without a database or a deployed book.
 *
 * The rule both functions encode: a row in an observation table is a claim
 * that something was true ON A GIVEN DAY. If the date names a day other than
 * the one the observation came from, the row is not merely imprecise — it is
 * false, and it is false in the direction that is hardest to notice, because
 * a complete-looking series with every day present reads as healthy.
 */

/**
 * The date an observation should be filed under.
 *
 * `scribe` reads the DEPLOYED public/data.json. Which day's book that is
 * depends on when the nightly feed workflow landed, not on when this route
 * happens to run — so wall-clock is the wrong source for the date, and using
 * it produced a systematic one-day lie across every row score_history holds
 * (measured 2026-08-21: on all 8 days checked, 100% of rows dated D carried
 * the price observed on D-1, confirmed against price_snapshots on the 73
 * cases where the price actually moved between the two days).
 *
 * `feed-meta.json` records which day the book represents. Prefer it.
 *
 * An ABSENT stamp means "unknown", never "stale" — a deploy predating
 * feed-meta.json must not be able to stop the capture, so it falls back to
 * wall-clock. That is the correct failure direction: a slightly misdated row
 * beats a lost day, and the summary reports which source was used either way.
 */
export function resolveSnapshotDate(
  feedGeneratedDate: string | null,
  wallClockDate: string
): { date: string; source: 'feed-meta' | 'wall-clock'; lagDays: number | null } {
  if (feedGeneratedDate === null) {
    return { date: wallClockDate, source: 'wall-clock', lagDays: null };
  }
  return {
    date: feedGeneratedDate,
    source: 'feed-meta',
    lagDays: daysBetween(feedGeneratedDate, wallClockDate),
  };
}

/** Whole days from `from` to `to`, both YYYY-MM-DD. Negative if `from` is later. */
export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

export interface WriteTally {
  /** Rows handed to the database. */
  rowsSent: number;
  /** Rows in chunks the database rejected. */
  rowsFailed: number;
  /** Error text from rejected chunks, capped. */
  errors: string[];
}

/**
 * Turn a write tally into a cron status.
 *
 * The shape this replaces — `if (!error) inserted += slice.length` followed by
 * an unconditional `finishCronLog(log, 'success', …)` — reported a green run
 * whether every chunk landed or every chunk was rejected. The two must not be
 * indistinguishable.
 *
 * An empty book is an ERROR, not a quiet success: scribe reads a file that is
 * supposed to hold ~2,000 listings, so zero scoreable rows means the book is
 * missing or unparsed, which is precisely the failure that must be loud.
 */
export function deriveStatus(t: WriteTally): {
  status: 'success' | 'error' | 'skipped';
  reason: string | null;
} {
  if (t.rowsFailed > 0) {
    return {
      status: 'error',
      reason: `${t.rowsFailed} of ${t.rowsSent} rows rejected by the database`,
    };
  }
  if (t.rowsSent === 0) {
    return {
      status: 'error',
      reason: 'no scoreable properties in the deployed book — the feed is missing or unparsed',
    };
  }
  return { status: 'success', reason: null };
}
