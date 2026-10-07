/**
 * Tests for the capture-integrity helpers.
 *
 * Both things under test exist because a real failure was INVISIBLE, not
 * because it was wrong. So the assertions that matter are the NEGATIVE ones:
 * that a healthy day is still reported as healthy. A detector that fires on
 * good days is worse than the gap it closed — this project has shipped that
 * mistake before and the tests below are written to catch it.
 *
 *   npx tsx scripts/test-capture-integrity.ts
 */

import {
  findSupersededRefs,
  classifySupersededRefs,
  planRelistLookback,
  resolveMoveBaselines,
  countBaselineSources,
} from '../src/lib/capture-integrity';
import { isAtlasRunDay, ROLLUP_FAILURE_REASONS } from '../src/lib/citation-measure';

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

console.log('\nfindSupersededRefs — the 2026-08-31 union');

// The real case. 05:37 leg banked the 08-30 book (2,044 refs incl. N9819 and
// N9927); the 11:32 leg held the true 08-31 book without them.
check(
  'refs banked earlier but absent from the current book are reported',
  findSupersededRefs(['N8058', 'N9819', 'N9927', 'SP1850'], new Set(['N8058', 'SP1850'])),
  ['N9819', 'N9927']
);

console.log('\nfindSupersededRefs — the healthy cases that must stay silent');

check(
  'first write of the day (nothing stored yet) reports nothing',
  findSupersededRefs([], new Set(['N8058', 'SP1850'])),
  []
);
check(
  'idempotent re-run against the SAME book reports nothing',
  findSupersededRefs(['N8058', 'SP1850'], new Set(['N8058', 'SP1850'])),
  []
);
check(
  'a book that only GREW (new listings appeared) reports nothing',
  findSupersededRefs(['N8058'], new Set(['N8058', 'SP1850', 'SP1851'])),
  []
);
check('empty book and empty stored day report nothing', findSupersededRefs([], new Set()), []);
check(
  'output is sorted and stable regardless of input order',
  findSupersededRefs(['N9927', 'N9819', 'A1'], new Set<string>()),
  ['A1', 'N9819', 'N9927']
);

console.log('\nisAtlasRunDay — vercel.json says `0,10,20 3 * * 1,3,5`');

// Anchor dates verified against the UTC calendar.
check('Mon 2026-08-31 is a run day', isAtlasRunDay('2026-08-31'), true);
check('Tue 2026-09-01 is NOT a run day', isAtlasRunDay('2026-09-01'), false);
check('Wed 2026-09-02 is a run day', isAtlasRunDay('2026-09-02'), true);
check('Thu 2026-09-03 is NOT a run day', isAtlasRunDay('2026-09-03'), false);
check('Fri 2026-09-04 is a run day', isAtlasRunDay('2026-09-04'), true);
check('Sat 2026-09-05 is NOT a run day', isAtlasRunDay('2026-09-05'), false);
check('Sun 2026-09-06 is NOT a run day', isAtlasRunDay('2026-09-06'), false);
check('a malformed date is not treated as a run day', isAtlasRunDay('not-a-date'), false);

console.log('\nROLLUP_FAILURE_REASONS — which reasons may colour a run');

// THE DISCRIMINATING PAIR. These two produced byte-identical cron_logs rows
// before this change: Monday 08-31 (Atlas ran, 74/74 lookups failed on a
// Perplexity 401) and Tuesday 09-01 (Atlas was never scheduled). If both ever
// land on the same side of this set again, the fix has been undone.
check(
  'raw rows absent ON A RUN DAY is a failure',
  ROLLUP_FAILURE_REASONS.has('raw_rows_absent_on_a_run_day'),
  true
);
check(
  'no run scheduled is NOT a failure',
  ROLLUP_FAILURE_REASONS.has('no_run_scheduled'),
  false
);
check('a failed query is a failure', ROLLUP_FAILURE_REASONS.has('query_failed'), true);
check('a real measurement is not a failure', ROLLUP_FAILURE_REASONS.has('measured'), false);
check(
  'branded-only rows are not a failure (the engine plainly ran)',
  ROLLUP_FAILURE_REASONS.has('branded_questions_only'),
  false
);

console.log('\nclassifySupersededRefs — the 2026-09-11 pair that share one count');

// 09:35. parse-feed banked the 09:34 book 55 seconds earlier; Vercel had not
// finished redeploying it, so this run still held the 06:35 book and read two
// NEWER refs as missing. Nothing was stale except the run.
check(
  'refs banked AFTER this book was generated are ahead of it, not stale',
  classifySupersededRefs(
    [
      { ref: 'N8058', created_at: '2026-09-11T06:35:24Z' },
      { ref: 'N8967', created_at: '2026-09-11T09:34:40Z' },
      { ref: 'N9998', created_at: '2026-09-11T09:34:40Z' },
    ],
    new Set(['N8058']),
    '2026-09-11T06:35:22Z'
  ),
  { stale: [], aheadOfThisBook: ['N8967', 'N9998'], unclassified: [] }
);

// 14:30, same day, same count of 2 — and the opposite condition. Both refs
// were banked at 06:35 from the morning book and have been gone since.
check(
  'refs banked BEFORE this book and absent from it are genuinely stale',
  classifySupersededRefs(
    [
      { ref: 'N8058', created_at: '2026-09-11T06:35:24Z' },
      { ref: 'N8972', created_at: '2026-09-11T06:35:24Z' },
      { ref: 'SP0664', created_at: '2026-09-11T06:35:24Z' },
    ],
    new Set(['N8058']),
    '2026-09-11T09:34:41Z'
  ),
  { stale: ['N8972', 'SP0664'], aheadOfThisBook: [], unclassified: [] }
);

check(
  'the two conditions can occur together and are reported separately',
  classifySupersededRefs(
    [
      { ref: 'N0001', created_at: '2026-09-11T06:35:24Z' },
      { ref: 'N0002', created_at: '2026-09-11T14:00:00Z' },
    ],
    new Set(['N9999']),
    '2026-09-11T09:34:41Z'
  ),
  { stale: ['N0001'], aheadOfThisBook: ['N0002'], unclassified: [] }
);

console.log('\nclassifySupersededRefs — unknown must stay unknown');

check(
  'no book stamp classifies nothing (it does not default to stale)',
  classifySupersededRefs([{ ref: 'N0001', created_at: '2026-09-11T06:35:24Z' }], new Set(), null),
  { stale: [], aheadOfThisBook: [], unclassified: ['N0001'] }
);
check(
  'a row with no created_at classifies as unknown, not stale',
  classifySupersededRefs([{ ref: 'N0001', created_at: null }], new Set(), '2026-09-11T09:34:41Z'),
  { stale: [], aheadOfThisBook: [], unclassified: ['N0001'] }
);
check(
  'an unparseable created_at classifies as unknown, not stale',
  classifySupersededRefs(
    [{ ref: 'N0001', created_at: 'not-a-date' }],
    new Set(),
    '2026-09-11T09:34:41Z'
  ),
  { stale: [], aheadOfThisBook: [], unclassified: ['N0001'] }
);
check(
  'an unparseable BOOK stamp classifies as unknown, not stale',
  classifySupersededRefs(
    [{ ref: 'N0001', created_at: '2026-09-11T06:35:24Z' }],
    new Set(),
    'not-a-date'
  ),
  { stale: [], aheadOfThisBook: [], unclassified: ['N0001'] }
);

console.log('\nclassifySupersededRefs — the healthy cases that must stay silent');

check(
  'a ref still in the book is never classified, whatever its timestamps',
  classifySupersededRefs(
    [{ ref: 'N8058', created_at: '2026-09-11T14:00:00Z' }],
    new Set(['N8058']),
    '2026-09-11T06:35:22Z'
  ),
  { stale: [], aheadOfThisBook: [], unclassified: [] }
);
check(
  'first write of the day reports nothing',
  classifySupersededRefs([], new Set(['N8058']), '2026-09-11T06:35:22Z'),
  { stale: [], aheadOfThisBook: [], unclassified: [] }
);
check(
  'idempotent re-run against the SAME book reports nothing',
  classifySupersededRefs(
    [{ ref: 'N8058', created_at: '2026-09-11T06:35:24Z' }],
    new Set(['N8058']),
    '2026-09-11T06:35:22Z'
  ),
  { stale: [], aheadOfThisBook: [], unclassified: [] }
);
check(
  'a book that only GREW reports nothing',
  classifySupersededRefs(
    [{ ref: 'N8058', created_at: '2026-09-11T06:35:24Z' }],
    new Set(['N8058', 'SP1850']),
    '2026-09-11T06:35:22Z'
  ),
  { stale: [], aheadOfThisBook: [], unclassified: [] }
);
check(
  'a row banked at the exact book instant is stale, not ahead (ties go to the book)',
  classifySupersededRefs(
    [{ ref: 'N0001', created_at: '2026-09-11T09:34:41.000Z' }],
    new Set(),
    '2026-09-11T09:34:41.000Z'
  ),
  { stale: ['N0001'], aheadOfThisBook: [], unclassified: [] }
);
check(
  'output is sorted within each bucket regardless of input order',
  classifySupersededRefs(
    [
      { ref: 'SP9', created_at: '2026-09-11T06:00:00Z' },
      { ref: 'N1', created_at: '2026-09-11T06:00:00Z' },
    ],
    new Set(),
    '2026-09-11T09:34:41Z'
  ),
  { stale: ['N1', 'SP9'], aheadOfThisBook: [], unclassified: [] }
);

// The totals must reconcile with the field they decompose, or the summary
// publishes two numbers that disagree about the same day.
{
  const stored = [
    { ref: 'A', created_at: '2026-09-11T06:00:00Z' },
    { ref: 'B', created_at: '2026-09-11T14:00:00Z' },
    { ref: 'C', created_at: null },
    { ref: 'D', created_at: '2026-09-11T06:00:00Z' },
  ];
  const book = new Set(['D']);
  const split = classifySupersededRefs(stored, book, '2026-09-11T09:34:41Z');
  check(
    'the three buckets sum to findSupersededRefs, exactly',
    split.stale.length + split.aheadOfThisBook.length + split.unclassified.length,
    findSupersededRefs(stored.map((r) => r.ref), book).length
  );
}


// ── The relisting blind spot ────────────────────────────────────────────────
// The bug: a ref absent from the prior date fell back to today's own banked
// row, which came from the same book, so the comparison was circular and the
// move vanished. These tests pin the precedence that makes that impossible,
// and — per the note at the top of this file — the NEGATIVE cases matter most:
// a healthy day must not start producing relisting events.

console.log('\nresolveMoveBaselines — precedence');
{
  const prior = new Map([['A', { price: 100 }]]);
  const own = new Map([['B', { price: 200, snapshot_date: '2026-09-28' }]]);
  const sameDay = new Map([
    ['A', { price: 999 }],
    ['B', { price: 999 }],
    ['C', { price: 300 }],
  ]);
  const got = resolveMoveBaselines(['A', 'B', 'C'], prior, own, sameDay);
  check(
    'a ref on the prior date uses the prior date, never today',
    got.get('A'),
    { price: 100, source: 'prior_date', observedOn: null }
  );
  check(
    'THE BUG: a relisted ref uses its own last-seen price, NOT today\'s book',
    got.get('B'),
    { price: 200, source: 'own_last_seen', observedOn: '2026-09-28' }
  );
  check(
    'a ref with neither still falls back to same_day, which has its own use',
    got.get('C'),
    { price: 300, source: 'same_day', observedOn: null }
  );
}

console.log('\nresolveMoveBaselines — the real 2026-10-06 miss');
{
  // N9949 341,500 -> 350,040, last seen 2026-09-28, absent from the 10-05
  // prior. Under the old code `observed` became today's banked 350,040 and the
  // move was dropped. The baseline must now be 341,500 so the diff is real.
  const got = resolveMoveBaselines(
    ['N9949'],
    new Map(),
    new Map([['N9949', { price: 341_500, snapshot_date: '2026-09-28' }]]),
    new Map([['N9949', { price: 350_040 }]])
  );
  const b = got.get('N9949');
  check('N9949 resolves to its last-seen price, not today\'s', b?.price, 341_500);
  check('and a move is therefore detectable', b!.price !== 350_040, true);
}

console.log('\nresolveMoveBaselines — a ref with no baseline at all is skipped');
{
  const got = resolveMoveBaselines(['Z'], new Map(), new Map(), new Map());
  check('no baseline means no entry, not a zero', got.has('Z'), false);
  check(
    'a null stored price is not a baseline either',
    resolveMoveBaselines(['Z'], new Map([['Z', { price: null }]]), new Map(), new Map()).has('Z'),
    false
  );
}

console.log('\ncountBaselineSources — a circular baseline is now visible');
{
  const got = countBaselineSources(
    resolveMoveBaselines(
      ['A', 'B', 'C'],
      new Map([['A', { price: 1 }]]),
      new Map([['B', { price: 2, snapshot_date: '2026-09-01' }]]),
      new Map([['C', { price: 3 }]])
    )
  );
  check('provenance is counted, so a reported zero is readable', got, {
    prior_date: 1,
    own_last_seen: 1,
    same_day: 1,
  });
}

console.log('\nplanRelistLookback — the healthy day must stay silent');
{
  const feed = Array.from({ length: 2030 }, (_, i) => `R${i}`);
  const priorAll = new Set(feed);
  check(
    'a full prior capture needs no lookback at all',
    planRelistLookback(feed, priorAll, 0.02),
    { refs: [], skipped: null }
  );

  // 2026-10-04, the worst real day: 5 relisted refs out of 2,030 = 0.25%.
  const priorMinus5 = new Set(feed.slice(5));
  const worstReal = planRelistLookback(feed, priorMinus5, 0.02);
  check('the worst day observed is allowed through', worstReal.refs.length, 5);
  check('and is not reported as skipped', worstReal.skipped, null);
}

console.log('\nplanRelistLookback — a partial prior capture must be REFUSED');
{
  const feed = Array.from({ length: 1000 }, (_, i) => `R${i}`);
  // Prior held only 400 of 1,000 refs: 60% would need a lookback.
  const partial = new Set(feed.slice(0, 400));
  const got = planRelistLookback(feed, partial, 0.02);
  check('no refs are looked back', got.refs.length, 0);
  check('the refusal is reported, never a quiet zero', got.skipped !== null, true);
  check(
    'and it says why, in numbers',
    /600 of 1000 refs \(60\.0%\)/.test(got.skipped ?? ''),
    true
  );
}

console.log('\nplanRelistLookback — boundary and degenerate inputs');
{
  const feed = Array.from({ length: 100 }, (_, i) => `R${i}`);
  // Exactly at the 2% ceiling: allowed (the guard refuses only ABOVE it).
  check(
    'exactly at the ceiling is allowed',
    planRelistLookback(feed, new Set(feed.slice(2)), 0.02).skipped,
    null
  );
  // One more than the ceiling: refused.
  check(
    'one ref over the ceiling is refused',
    planRelistLookback(feed, new Set(feed.slice(3)), 0.02).skipped !== null,
    true
  );
  check(
    'an empty feed is a refusal, not a silent pass',
    planRelistLookback([], new Set<string>(), 0.02).skipped !== null,
    true
  );
  check(
    'an empty prior refuses rather than treating every ref as relisted',
    planRelistLookback(feed, new Set<string>(), 0.02).refs.length,
    0
  );
  check('refs come back sorted and deduped by the feed', planRelistLookback(
    ['B', 'A'], new Set(['X']), 1
  ).refs, ['A', 'B']);
}

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILURES'} — ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
