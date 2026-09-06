/**
 * The capture backstop's decision rule.
 *
 * WHY THIS EXISTS
 * ---------------
 * A day of listing history is unbackfillable. On 2026-09-05 GitHub's scheduler
 * fired the nightly feed ON TIME (06:15:40) and RedSP's origin refused the
 * runner's egress — the run died in 61 seconds with nothing captured. A fresh
 * run dispatched 43 minutes later fetched the same feed in 8 seconds. That is
 * the whole finding: the block is intermittent per RUN, not per day and not
 * per client, so in-run retries never clear it (0 successes in 56 attempts
 * across two 120-minute budgets) while a NEW run does.
 *
 * Until now the thing that noticed and re-dispatched was a human. This module
 * is that human's judgement, written down.
 *
 * THE DESIGN CONSTRAINT
 * ---------------------
 * The no-op check is load-bearing IN BOTH DIRECTIONS and the two errors are
 * not symmetric:
 *
 *   - Too EAGER (dispatch when the day is already captured) draws a second
 *     book into the same (ref, snapshot_date) key. Where the two books differ
 *     that is a union day (O-74) — repairable, and every stored row is
 *     individually defensible, but it corrupts the day's membership count.
 *   - Too SHY (hold when the day is NOT captured) loses the day permanently.
 *
 * So the rule below never silently guesses. Every input is a THREE-valued
 * signal — captured / absent / indeterminate — because the failure this
 * project keeps shipping is a failed read collapsing into a confident zero.
 * A read that could not be made must arrive here as `indeterminate`, never as
 * `absent`, and any decision taken on an indeterminate signal is marked
 * `degraded` so the run ends RED and a human looks at it. A backstop that
 * quietly did the wrong thing would be worse than no backstop.
 */

/** Whether today's capture could be observed. `indeterminate` = the read failed. */
export type CaptureSignal = 'captured' | 'absent' | 'indeterminate';

/** Whether a feed run is already in flight. `indeterminate` = the read failed. */
export type InFlightSignal = 'yes' | 'no' | 'indeterminate';

export interface BackstopInput {
  /**
   * GROUND TRUTH: does `price_snapshots` hold at least one row stamped with
   * today's UTC date? This is the thing we are protecting, so it outranks
   * every other signal.
   */
  snapshot: CaptureSignal;
  /**
   * INDEPENDENT CORROBORATION, and deliberately from a different system: was
   * the `public/feed-meta.json` committed on main generated today? It needs no
   * database credentials, so it survives exactly the failure that darkens the
   * signal above.
   */
  book: CaptureSignal;
  /**
   * Is a feed-refresh run queued or running right now? Dispatching into one is
   * the cheapest way to manufacture the union days this backstop exists to
   * avoid — feed-refresh's concurrency group queues our run rather than
   * cancelling it, so it would draw a second book minutes after the first.
   */
  inFlight: InFlightSignal;
}

export type BackstopAction =
  /** Re-dispatch the nightly feed workflow. */
  | 'dispatch'
  /** Do nothing: today is already captured. */
  | 'no_op'
  /** Do nothing YET: a feed run is in flight and will answer this itself. */
  | 'hold';

export interface BackstopDecision {
  action: BackstopAction;
  /** Machine-readable cause, so a log line can be asserted on. */
  reason: string;
  /** True when the decision rested on a signal that could not be read. Ends the run RED. */
  degraded: boolean;
}

/**
 * Decide what the backstop should do. Pure: no clock, no network, no env.
 *
 * Order matters and is itself the argument:
 *   1. Ground truth says captured  -> nothing to do, whatever else is true.
 *   2. A run is in flight          -> it will capture; a second dispatch would
 *                                     only add a draw.
 *   3. Ground truth says absent    -> the designed case. Dispatch.
 *   4. Ground truth is dark        -> fall back to the book, and mark degraded
 *                                     whichever way it falls.
 */
export function decideBackstop(input: BackstopInput): BackstopDecision {
  const { snapshot, book, inFlight } = input;

  // 1. The moat already holds today. Nothing else can override this.
  if (snapshot === 'captured') {
    return {
      action: 'no_op',
      reason: 'snapshot_present',
      degraded: false,
    };
  }

  // 2. A feed run is already queued or running. Let it finish. The second
  //    scheduled slot re-checks later, so holding is not the end of the story.
  if (inFlight === 'yes') {
    return {
      action: 'hold',
      reason: 'feed_run_in_flight',
      degraded: false,
    };
  }

  // 3. The designed case: we can see the day is genuinely missing.
  if (snapshot === 'absent') {
    // A book committed today with no snapshot behind it is a REAL and
    // separate failure — the feed ran, the deploy landed, and the capture
    // step did not write. Dispatching is still right (feed-refresh re-polls
    // pricing-history), and because the book is unchanged the re-run commits
    // nothing and cannot create a union. But it must not read as routine.
    if (book === 'captured') {
      return {
        action: 'dispatch',
        reason: 'snapshot_absent_despite_todays_book',
        degraded: true,
      };
    }
    // We could not confirm nothing is in flight. Dispatch anyway — a lost day
    // is permanent and a union day is not — but say so out loud.
    if (inFlight === 'indeterminate') {
      return {
        action: 'dispatch',
        reason: 'snapshot_absent_inflight_unknown',
        degraded: true,
      };
    }
    return {
      action: 'dispatch',
      reason: 'snapshot_absent',
      degraded: false,
    };
  }

  // 4. Ground truth is dark. Everything from here is degraded by construction.

  // The book was committed today, so the feed demonstrably ran and its own
  // capture step would have failed the run red had the snapshot write failed.
  // Hold — but red, because "probably fine" is not a measurement.
  if (book === 'captured') {
    return {
      action: 'no_op',
      reason: 'snapshot_unreadable_book_is_todays',
      degraded: true,
    };
  }

  // No book today either: two independent systems, neither showing today.
  if (book === 'absent') {
    return {
      action: 'dispatch',
      reason: 'snapshot_unreadable_no_book_today',
      degraded: true,
    };
  }

  // Total darkness. Both reads failed. Choose the recoverable error over the
  // permanent one and make the run scream about it.
  return {
    action: 'dispatch',
    reason: 'all_signals_unreadable',
    degraded: true,
  };
}

/**
 * Today in UTC as `YYYY-MM-DD`.
 *
 * The capture keys on the UTC date and the runner's clock is UTC, but this is
 * stated once here rather than inlined at three call sites, because a
 * local-time slip would silently compare the wrong day near midnight.
 */
export function utcDateKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}
