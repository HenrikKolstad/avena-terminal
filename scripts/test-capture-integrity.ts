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

import { findSupersededRefs } from '../src/lib/capture-integrity';
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

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILURES'} — ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
