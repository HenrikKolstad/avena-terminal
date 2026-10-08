/**
 * Integrity checks over the daily capture — the moat's ground truth.
 *
 * These are deliberately PURE functions over ref sets, not queries. The capture
 * routes already hold both sides in memory; what was missing was a name for the
 * condition and a value to report, not another database read.
 */

/**
 * Refs already stored under today's date that the CURRENT book no longer
 * contains — i.e. the day's stored snapshot is no longer one single book.
 *
 * WHY THIS EXISTS
 * Upserts add, they never retract. `price_snapshots` (and `score_history`) key
 * on (ref, snapshot_date), so a second capture on the same UTC day overwrites
 * PRICES for refs it can see and silently leaves behind every ref it cannot.
 * When the two legs saw different books, the stored day is a union: membership
 * from the earlier book, prices from the later one. No single observation ever
 * looked like that.
 *
 * OBSERVED 2026-08-31. The nightly was hand-dispatched at 05:37 because
 * GitHub's scheduler was hours late, and it downloaded a book byte-identical to
 * 08-30's: 2,044 refs. GitHub's own run finally landed at 11:32 with the real
 * book: 2,042 refs — N9819 and N9927 gone, N8058 repriced 699,900 -> 709,900.
 * The stored 2026-08-31 ended up holding 2,044 refs carrying the 11:32 price,
 * and every field in the run summary looked healthy.
 *
 * WHY THE EXISTING GUARD DOES NOT CATCH IT
 * pricing-history already refuses to bank a book stamped earlier than today
 * (that guard fixed the 2026-08-08 union, where YESTERDAY's book was banked
 * under today's date). It cannot help here: both of 08-31's books were stamped
 * `generated_date: 2026-08-31`. The guard compares dates; this condition is two
 * different books wearing the same date.
 *
 * WHAT IS AND IS NOT HARMED — measured, not assumed:
 *  - Individual rows stay defensible. N9819 really was listed on 08-31 (at
 *    05:37); N8058 really was 709,900 on 08-31 (at 11:32).
 *  - Delisting dates came out CORRECT. Both refs were tombstoned on 09-01 with
 *    last_seen_date 2026-08-31, which is the truth.
 *  - What is wrong is the day's row SET: any aggregate over it (a count, a
 *    median, a per-town roll-up) describes a 2,044-listing book that never
 *    existed. That is a small seam, and it was completely invisible.
 *
 * DELIBERATELY NOT REPAIRED HERE. Retracting the stale refs means DELETEing
 * rows from the moat's ground-truth table, and a partial or challenged second
 * book would then destroy a good capture. That write belongs on a branch with
 * the same overlap gate the delisting detector already uses. This function only
 * makes the condition visible — which is the part that was missing.
 *
 * @param storedTodayRefs refs already banked under today's date
 * @param currentRefs     refs in the book this run is holding
 * @returns sorted refs present in the stored day but absent from the book
 */
export function findSupersededRefs(
  storedTodayRefs: Iterable<string>,
  currentRefs: ReadonlySet<string>
): string[] {
  const out: string[] = [];
  for (const ref of storedTodayRefs) {
    if (!currentRefs.has(ref)) out.push(ref);
  }
  return out.sort();
}

/**
 * Split the refs `findSupersededRefs` returns into the two OPPOSITE conditions
 * that produce them.
 *
 * WHY THIS EXISTS — measured on 2026-09-11, and it is the project's recurring
 * bug wearing a new coat: one number standing for two conditions that point in
 * opposite directions, with nothing in the value to say which.
 *
 * That day the route ran four times and reported `snapshot_superseded: 2` on
 * two of them, naming DIFFERENT refs:
 *
 *   09:35  superseded_refs = [N8967, N9998]   ← both had been written 55s
 *                                               earlier, by parse-feed, from a
 *                                               NEWER book than this run held.
 *                                               Nothing was stale but the run
 *                                               itself: Vercel had not finished
 *                                               redeploying the 09:34 commit.
 *   14:30  superseded_refs = [N8972, SP0664]  ← genuinely gone. Stored at
 *                                               06:35 from the morning book and
 *                                               absent from every book since.
 *
 * Both were reported as "the stored day is no longer one book", which is true,
 * and both were reported with the same field, which made them
 * indistinguishable. The first is not a data defect at all — it is this run
 * arriving late to its own pipeline. The second is the 08-31 union condition.
 * Reading the first as the second overstates the damage to the ledger; reading
 * the second as the first would hide it.
 *
 * THE DISCRIMINATOR is the stored row's `created_at` against the generation
 * instant of the book this run is holding. A row banked AFTER my book was
 * generated cannot have come from my book or any earlier one — so the ref is
 * ahead of me, not behind. A row banked BEFORE it, and absent from my book,
 * genuinely left the feed in between.
 *
 * UNKNOWN IS ITS OWN ANSWER. With no book stamp (a deploy predating
 * feed-meta.json) or no `created_at`, the honest report is "cannot classify",
 * never a default into either bucket. A fabricated classification here would
 * be worse than the conflated count it replaces.
 *
 * STILL REPORT-ONLY. Nothing is retracted, skipped or repaired on the strength
 * of this. It names the condition; what to DO about a run that finds itself
 * holding a stale book (its snapshot write can overwrite newer prices with
 * older ones under the same date) is a change to cron write logic and belongs
 * on a branch, with evidence that it has actually cost something.
 *
 * @param storedToday  rows already banked under today's date, with created_at
 * @param currentRefs  refs in the book this run is holding
 * @param bookGeneratedAt ISO instant this run's book was generated, or null
 */
export type SupersededSplit = {
  /** Banked before this book was generated and absent from it — really gone. */
  stale: string[];
  /** Banked after this book was generated — this RUN is the stale one. */
  aheadOfThisBook: string[];
  /** No book stamp or no created_at: not classifiable, and not guessed. */
  unclassified: string[];
};

export function classifySupersededRefs(
  storedToday: Iterable<{ ref: string; created_at?: string | null }>,
  currentRefs: ReadonlySet<string>,
  bookGeneratedAt: string | null
): SupersededSplit {
  const bookAt = bookGeneratedAt === null ? NaN : Date.parse(bookGeneratedAt);
  const out: SupersededSplit = { stale: [], aheadOfThisBook: [], unclassified: [] };

  for (const row of storedToday) {
    if (currentRefs.has(row.ref)) continue;
    const rowAt = row.created_at ? Date.parse(row.created_at) : NaN;
    if (!Number.isFinite(bookAt) || !Number.isFinite(rowAt)) {
      out.unclassified.push(row.ref);
    } else if (rowAt > bookAt) {
      out.aheadOfThisBook.push(row.ref);
    } else {
      out.stale.push(row.ref);
    }
  }

  out.stale.sort();
  out.aheadOfThisBook.sort();
  out.unclassified.sort();
  return out;
}

/**
 * Is a stored day ONE BOOK, and is its listing count safe to quote?
 *
 * WHY THIS IS A NAMED FUNCTION AND NOT AN INLINE COMPARISON — I got this wrong
 * twice in two days, in opposite directions.
 *
 * On 2026-10-07 I read `min(created_at) == max(created_at)` as "one write" and
 * published that the day was quotable. It was not: four runs wrote, one holding
 * a stale book. `created_at` is set on INSERT only and the write is an upsert on
 * (ref, snapshot_date), so a run that REWRITES every row leaves every
 * `created_at` untouched. It is a FLOOR on the number of writes, never a count.
 *
 * So on 2026-10-08 I replaced it with "exactly one successful run wrote today".
 * That is wrong the other way, and the very next clean day proved it: the
 * scheduled run wrote at 07:58 and my own idempotent re-run wrote at 08:21 —
 * same feed (2,034), same `feed_generated_date`, `snapshot_superseded: 0`, the
 * second run finding all 4 moves `already_logged`. Two writes of the SAME book
 * is not a union, and calling it one would cry wolf on every re-run, which is a
 * tool nobody would keep using.
 *
 * The honest test is neither count. A day is one book when every run that wrote
 * it held the same book AND no run saw refs the others did not:
 *   - `feed_generated_date` identical across the writing runs, and
 *   - `snapshot_superseded` zero — because two genuinely different books CAN
 *     wear the same date (the 2026-08-31 case in findSupersededRefs above), and
 *     the superseded split is the only thing that catches that.
 */
export interface WritingRun {
  /** `feed_generated_date` from the run summary — the book's own stamp. */
  bookDate: string | null;
  /** `snapshot_superseded`: refs stored under today that this book lacks. */
  supersededRefs: number;
  /** `snapshot_superseded_stale`: this run held a book OLDER than one banked. */
  staleOverwrites: number;
}

export interface DayBookVerdict {
  writingRuns: number;
  distinctBooks: number;
  oneBook: boolean;
  staleOverwrites: number;
  /** Safe to quote as "N listings on this date". */
  quotable: boolean;
  reason: string;
}

export function judgeDayBook(runs: WritingRun[]): DayBookVerdict {
  const staleOverwrites = runs.reduce((n, r) => n + r.staleOverwrites, 0);
  const supersededTotal = runs.reduce((n, r) => n + r.supersededRefs, 0);
  const books = new Set(runs.map((r) => r.bookDate).filter((d): d is string => !!d));

  const base = { writingRuns: runs.length, distinctBooks: books.size, staleOverwrites };

  if (runs.length === 0) {
    return { ...base, oneBook: false, quotable: false,
      reason: 'no successful write recorded for this date — the day is not captured, not merely unquotable' };
  }
  if (runs.some((r) => !r.bookDate)) {
    return { ...base, oneBook: false, quotable: false,
      reason: 'a writing run reported no feed_generated_date, so the books cannot be compared' };
  }
  if (books.size > 1) {
    return { ...base, oneBook: false, quotable: false,
      reason: `${books.size} different books wrote this date (${[...books].sort().join(', ')}) — the stored day is a union` };
  }
  if (supersededTotal > 0) {
    return { ...base, oneBook: false, quotable: false,
      reason: `${supersededTotal} superseded ref(s): two books wearing the same date ${[...books][0]}` };
  }
  if (staleOverwrites > 0) {
    return { ...base, oneBook: true, quotable: false,
      reason: `one book, but ${staleOverwrites} row(s) were overwritten from a STALE book — prices for those refs are not the best observed` };
  }
  return { ...base, oneBook: true, quotable: true,
    reason: runs.length === 1
      ? 'one book, written once'
      : `one book, written ${runs.length}x (idempotent re-runs — not a union)` };
}
