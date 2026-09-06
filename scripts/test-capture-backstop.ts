/**
 * Tests for the capture backstop's decision rule.
 *
 * This thing fires extra feed runs that write into `price_snapshots`, the
 * moat's ground truth. So the tests that matter most are the ones asserting it
 * does NOTHING:
 *
 *   - When today is already captured it must no-op, on every combination of
 *     the other two signals. That is the case that manufactures union days,
 *     and it is the reason the blind ~05:37 dispatch was retired on 09-05.
 *   - When a feed run is already in flight it must hold, not add a draw.
 *
 * The positive case has exactly one shape — the day is genuinely missing — and
 * every path that reaches `dispatch` on an unreadable signal must also be
 * marked `degraded`, because a backstop that acts on a guess and reports green
 * is the recurring bug in a new costume.
 *
 *   npx tsx scripts/test-capture-backstop.ts
 */

import {
  decideBackstop,
  utcDateKey,
  type BackstopDecision,
  type CaptureSignal,
  type InFlightSignal,
} from '../src/lib/capture-backstop';

let pass = 0;
let fail = 0;

function check(name: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}\n        got  ${g}\n        want ${w}`);
  }
}

const decide = (snapshot: CaptureSignal, book: CaptureSignal, inFlight: InFlightSignal) =>
  decideBackstop({ snapshot, book, inFlight });

const SIGNALS: CaptureSignal[] = ['captured', 'absent', 'indeterminate'];
const IN_FLIGHT: InFlightSignal[] = ['yes', 'no', 'indeterminate'];

// ---------------------------------------------------------------------------
console.log('\nTHE CASE THAT MATTERS MOST — today is already captured');
// ---------------------------------------------------------------------------
// If this ever returns `dispatch`, the backstop has become the blind dispatch
// that was removed on 2026-09-05 for banking a second, different book into one
// day. Assert it across the whole cross-product, not on one hand-picked row.

for (const book of SIGNALS) {
  for (const inFlight of IN_FLIGHT) {
    const d = decide('captured', book, inFlight);
    check(
      `captured + book=${book} + in_flight=${inFlight} → no_op, not degraded`,
      d,
      { action: 'no_op', reason: 'snapshot_present', degraded: false } satisfies BackstopDecision
    );
  }
}

// ---------------------------------------------------------------------------
console.log('\nA feed run is already in flight — hold, never add a draw');
// ---------------------------------------------------------------------------
// feed-refresh's concurrency group QUEUES rather than cancels, so dispatching
// into a running feed does not collide — it draws a second book a few minutes
// later, which is precisely the union.

for (const snapshot of ['absent', 'indeterminate'] as CaptureSignal[]) {
  for (const book of SIGNALS) {
    check(
      `snapshot=${snapshot} + book=${book} + a run in flight → hold`,
      decide(snapshot, book, 'yes'),
      { action: 'hold', reason: 'feed_run_in_flight', degraded: false } satisfies BackstopDecision
    );
  }
}

// ---------------------------------------------------------------------------
console.log('\nTHE DESIGNED CASE — 2026-09-05 replayed');
// ---------------------------------------------------------------------------
// Run 55 died on RedSP's interstitial at 06:15:40. At 06:57 there were no
// snapshot rows for the day, yesterday's book was still the committed one, and
// nothing was running. That is this row, and it must dispatch cleanly — green,
// because nothing about it was guessed.

check(
  '09-05 06:57: no snapshot, book is yesterday, nothing running → dispatch, green',
  decide('absent', 'absent', 'no'),
  { action: 'dispatch', reason: 'snapshot_absent', degraded: false } satisfies BackstopDecision
);

check(
  "the feed committed today's book but wrote no snapshot → dispatch, and RED",
  decide('absent', 'captured', 'no'),
  {
    action: 'dispatch',
    reason: 'snapshot_absent_despite_todays_book',
    degraded: true,
  } satisfies BackstopDecision
);

check(
  'no snapshot and we cannot tell whether a run is in flight → dispatch, and RED',
  decide('absent', 'absent', 'indeterminate'),
  {
    action: 'dispatch',
    reason: 'snapshot_absent_inflight_unknown',
    degraded: true,
  } satisfies BackstopDecision
);

check(
  'no snapshot, book unreadable, nothing running → dispatch, green (ground truth was legible)',
  decide('absent', 'indeterminate', 'no'),
  { action: 'dispatch', reason: 'snapshot_absent', degraded: false } satisfies BackstopDecision
);

// ---------------------------------------------------------------------------
console.log('\nGROUND TRUTH UNREADABLE — the recurring bug, guarded');
// ---------------------------------------------------------------------------
// An unreadable `price_snapshots` must never arrive here as "absent". These
// rows are what happens when it correctly arrives as `indeterminate`.

check(
  "DB dark but today's book is committed → hold, and RED",
  decide('indeterminate', 'captured', 'no'),
  {
    action: 'no_op',
    reason: 'snapshot_unreadable_book_is_todays',
    degraded: true,
  } satisfies BackstopDecision
);

check(
  'DB dark and no book today → dispatch, and RED',
  decide('indeterminate', 'absent', 'no'),
  {
    action: 'dispatch',
    reason: 'snapshot_unreadable_no_book_today',
    degraded: true,
  } satisfies BackstopDecision
);

check(
  'both signals dark → dispatch (the recoverable error), and RED',
  decide('indeterminate', 'indeterminate', 'no'),
  { action: 'dispatch', reason: 'all_signals_unreadable', degraded: true } satisfies BackstopDecision
);

check(
  'both signals dark AND in-flight unknown → still dispatch, and RED',
  decide('indeterminate', 'indeterminate', 'indeterminate'),
  { action: 'dispatch', reason: 'all_signals_unreadable', degraded: true } satisfies BackstopDecision
);

// ---------------------------------------------------------------------------
console.log('\nSTRUCTURAL INVARIANTS over the full 3x3x3 cross-product');
// ---------------------------------------------------------------------------

const all: Array<{ s: CaptureSignal; b: CaptureSignal; f: InFlightSignal; d: BackstopDecision }> =
  [];
for (const s of SIGNALS)
  for (const b of SIGNALS)
    for (const f of IN_FLIGHT) all.push({ s, b, f, d: decide(s, b, f) });

check('the cross-product is 27 rows', all.length, 27);

check(
  'a captured day NEVER dispatches',
  all.filter((r) => r.s === 'captured' && r.d.action === 'dispatch').length,
  0
);

check(
  'a run in flight NEVER dispatches',
  all.filter((r) => r.f === 'yes' && r.d.action === 'dispatch').length,
  0
);

// THE LOAD-BEARING ONE. A decision that DEPENDED on a read that failed must
// end the run red — otherwise the backstop can be wrong and still look fine,
// which is the exact failure this project keeps shipping.
//
// Stated as "any row touching an unreadable signal", this over-fires: when a
// feed run is in flight we hold, and that hold is justified entirely by a
// LEGIBLE signal — the dark database did not enter into it. So the invariant
// is about which reasons rest on darkness, not which inputs contained it.
const REASONS_RESTING_ON_DARKNESS = [
  'all_signals_unreadable',
  'snapshot_absent_inflight_unknown',
  'snapshot_unreadable_book_is_todays',
  'snapshot_unreadable_no_book_today',
];
// The one legible-but-anomalous case: the feed committed today's book and
// still wrote no snapshot. Nothing was guessed, but nobody should sleep
// through it either.
const REASONS_RED_BUT_LEGIBLE = ['snapshot_absent_despite_todays_book'];

check(
  'the degraded set is EXACTLY the reasons resting on darkness, plus the one real anomaly',
  all
    .filter((r) => r.d.degraded)
    .map((r) => r.d.reason)
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort(),
  [...REASONS_RESTING_ON_DARKNESS, ...REASONS_RED_BUT_LEGIBLE].sort()
);

check(
  'no reason resting on darkness ever reports green',
  all.filter((r) => REASONS_RESTING_ON_DARKNESS.includes(r.d.reason) && !r.d.degraded).length,
  0
);

check(
  'a DISPATCH is never taken on an unreadable ground truth without going red',
  all.filter((r) => r.d.action === 'dispatch' && r.s === 'indeterminate' && !r.d.degraded).length,
  0
);

// And the row that taught me the invariant above was too broad, asserted
// directly so the distinction cannot be lost again: holding for an in-flight
// run is GREEN even with the database dark, because the reason is legible.
check(
  'holding for an in-flight run stays green even when the database is dark',
  all
    .filter((r) => r.f === 'yes' && r.s === 'indeterminate')
    .every((r) => r.d.action === 'hold' && !r.d.degraded),
  true
);

check(
  'every row produces one of the three known actions',
  all.filter((r) => !['dispatch', 'no_op', 'hold'].includes(r.d.action)).length,
  0
);

check(
  'every row carries a non-empty reason',
  all.filter((r) => !r.d.reason).length,
  0
);

check('the rule is pure — same input, same output', decide('absent', 'absent', 'no'), decide('absent', 'absent', 'no'));

// ---------------------------------------------------------------------------
console.log('\nutcDateKey — the day boundary the capture keys on');
// ---------------------------------------------------------------------------

check('midnight UTC belongs to the new day', utcDateKey(new Date('2026-09-06T00:00:00Z')), '2026-09-06');
check('one second before midnight belongs to the old day', utcDateKey(new Date('2026-09-05T23:59:59Z')), '2026-09-05');
check('the backstop hour', utcDateKey(new Date('2026-09-06T07:00:00Z')), '2026-09-06');
check('a leap day survives', utcDateKey(new Date('2028-02-29T12:00:00Z')), '2028-02-29');

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILURES'} — ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
