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

/* ────────────────────────────────────────────────────────────────────────────
 * The relisting blind spot in price-move detection.
 *
 * OBSERVED 2026-10-06/07. Diffing `price_snapshots` with a per-ref window
 * function yields 553 real price moves since 2026-08-10. The event log
 * `property_pricing_history` holds 522 of them. Zero orphans — every event the
 * log holds is real — but 31 real moves have no event, and the gap GREW by 2
 * in one day (540/511/29 on 10-06 → 553/522/31 on 10-07), so it is an ongoing
 * miss, not a historical artifact.
 *
 * THE MECHANISM, and it is this project's signature bug shape. The detector
 * builds its baseline from exactly ONE date — the single most recent
 * `snapshot_date` before today — and then falls back:
 *
 *     const priorPrice = trustPrior ? priorByRef.get(ref)?.price ?? null : null;
 *     const sameDayPrice = todayByRef.get(ref)?.price ?? null;
 *     const observed = priorPrice ?? sameDayPrice;
 *
 * A ref that was ABSENT on the prior date — delisted and relisted — has no
 * `priorPrice`, so `observed` becomes today's own banked row. That row was
 * written by parse-feed from the SAME book this run is holding, so the
 * comparison is a value against itself, `Math.abs(now - observed) < 1` is
 * always true, and the move is dropped in silence. A missing value became a
 * self-comparison became "nothing changed" — a broken path that looks exactly
 * like a working one with nothing to report.
 *
 * The route's own comment already named this trap for the GLOBAL case ("every
 * comparison was a value against itself") and fixed it by preferring the prior
 * date. The `?? sameDayPrice` fallback silently reintroduces it per-ref, for
 * precisely the refs whose history is worth the most.
 *
 * WHY THESE ARE THE EXPENSIVE ONES TO LOSE. All 18 non-startup unlogged moves
 * are relistings, and they are large: N8648 547,690 → 725,000 (+32.4%),
 * SP1484 525,000 → 650,000 (+23.8%), SP1018 552,000 → 492,000 (−10.9%). A unit
 * that left the market and came back at a different price is the strongest
 * motivated-seller / repricing signal the capture produces. The remaining 13
 * fall on 2026-08-11, the day after the log began, where the prior date is
 * 08-10 and the miss has a different cause.
 *
 * WHY THE EXISTING GUARDS DO NOT CATCH IT. `trustPrior` (MAX_PRIOR_AGE_DAYS,
 * MIN_FEED_OVERLAP) judges the prior snapshot GLOBALLY — on every one of these
 * days the prior was yesterday and trusted. Nothing asked whether the prior
 * held a row for THIS ref. `baselineRefs` counts refs that resolved to some
 * baseline and cannot distinguish a real one from a self-comparison, so it
 * reported full coverage throughout.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Where a ref's move baseline came from. Reported so a zero stays readable. */
export type BaselineSource = 'prior_date' | 'own_last_seen' | 'same_day';

export interface MoveBaseline {
  price: number;
  source: BaselineSource;
  /** snapshot_date the baseline price was observed on; null for `same_day`. */
  observedOn: string | null;
}

export interface RelistLookbackPlan {
  /** Refs in today's feed with no row on the trusted prior date. */
  refs: string[];
  /**
   * Non-null when the lookback must NOT run. A partial prior capture leaves
   * hundreds of refs with no prior row; diffing them all against older
   * snapshots would mass-flag phantom moves. Refusing is the safe failure, and
   * saying so is the difference between a refusal and a silent zero.
   */
  skipped: string | null;
}

/**
 * Decide which refs need an own-last-seen lookback, and refuse outright when
 * too many do.
 *
 * The cap is deliberately far tighter than MAX_MOVE_SHARE (0.2). Observed
 * reality is 0–5 relisted refs per day against a ~2,030 ref feed (0.25% on the
 * worst day, 2026-10-04). A 2% ceiling is ~8x headroom over the worst day
 * observed and still refuses anything that looks like a partial prior capture.
 * It also bounds the cost of the follow-up read: the lookback query is only
 * cheap because the ref list is small.
 *
 * @param feedRefs    refs in the book this run is holding
 * @param priorRefs   refs present on the trusted prior snapshot date
 * @param maxShare    refuse if more than this share of the feed needs lookback
 */
export function planRelistLookback(
  feedRefs: Iterable<string>,
  priorRefs: ReadonlySet<string>,
  maxShare: number
): RelistLookbackPlan {
  const all = [...feedRefs];
  const refs = all.filter((ref) => !priorRefs.has(ref)).sort();
  if (all.length === 0) {
    return { refs: [], skipped: 'empty feed — no lookback attempted' };
  }
  const share = refs.length / all.length;
  if (share > maxShare) {
    return {
      refs: [],
      skipped:
        `${refs.length} of ${all.length} refs (${(share * 100).toFixed(1)}%) are absent from the prior ` +
        `snapshot, over the ${(maxShare * 100).toFixed(1)}% ceiling — the prior capture is probably ` +
        `partial, refusing the relisting lookback rather than mass-flagging phantom moves`,
    };
  }
  return { refs, skipped: null };
}

/**
 * Resolve each feed ref's move baseline, in precedence order, carrying where
 * it came from.
 *
 * `same_day` is kept — when there is no trusted prior it really is the oldest
 * price available, and it catches a mid-day move written by an EARLIER run
 * holding a DIFFERENT book. What it must never do is stand in for a missing
 * prior-date row while a trusted prior exists, because then it is today's own
 * book and the comparison is circular. That is the bug this function exists to
 * make impossible: the precedence is explicit and the source is reported.
 *
 * @param feedRefs          refs in the book this run is holding
 * @param priorByRef        ref → price on the trusted prior date (empty if untrusted)
 * @param ownLastSeenByRef  ref → {price, date} of that ref's own most recent
 *                          snapshot before the prior date (the lookback result)
 * @param sameDayByRef      ref → price already banked under today's date
 */
export function resolveMoveBaselines(
  feedRefs: Iterable<string>,
  priorByRef: ReadonlyMap<string, { price: number | null }>,
  ownLastSeenByRef: ReadonlyMap<string, { price: number | null; snapshot_date: string }>,
  sameDayByRef: ReadonlyMap<string, { price: number | null }>
): Map<string, MoveBaseline> {
  const out = new Map<string, MoveBaseline>();
  for (const ref of feedRefs) {
    const prior = priorByRef.get(ref)?.price;
    if (prior != null) {
      out.set(ref, { price: Number(prior), source: 'prior_date', observedOn: null });
      continue;
    }
    const own = ownLastSeenByRef.get(ref);
    if (own && own.price != null) {
      out.set(ref, { price: Number(own.price), source: 'own_last_seen', observedOn: own.snapshot_date });
      continue;
    }
    const same = sameDayByRef.get(ref)?.price;
    if (same != null) {
      out.set(ref, { price: Number(same), source: 'same_day', observedOn: null });
    }
  }
  return out;
}

/** Count baselines by provenance, so a reported zero is interpretable. */
export function countBaselineSources(
  baselines: ReadonlyMap<string, MoveBaseline>
): Record<BaselineSource, number> {
  const out: Record<BaselineSource, number> = { prior_date: 0, own_last_seen: 0, same_day: 0 };
  for (const b of baselines.values()) out[b.source]++;
  return out;
}
