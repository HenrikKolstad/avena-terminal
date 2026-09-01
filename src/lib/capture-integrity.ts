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
