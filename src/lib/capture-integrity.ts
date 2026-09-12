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
