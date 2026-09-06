/**
 * Tests for the two halves of the eu-stats-ingest repair.
 *
 * 1. `ineQuarterPeriod` — the actual bug. INE's Tempus codes for a quarterly
 *    series are 19-22, and the old code fell back to Math.ceil(fk / 3), which
 *    mapped 19, 20 AND 21 onto "Q7" and 22 onto "Q8". Three of every four
 *    quarters collapsed onto one key, and the periods produced did not exist.
 *
 *    The important thing to hold on to: the database REJECTING those writes on
 *    the unique constraint is the only reason `eu_official_stats` does not
 *    contain fabricated quarters today. So the tests below assert the decode is
 *    right AND that an unrecognised code is refused rather than guessed —
 *    because the tempting "fix" for the rejection was to de-duplicate the batch
 *    until Postgres accepted it, which would have written the nonsense.
 *
 * 2. `splitOnUpsertKey` — the amplification guard. One duplicated key destroys
 *    its entire 500-row chunk, which is how 4,480 INE rows a night died behind
 *    a report of "errors: 2". The asymmetry is the whole design: identical
 *    duplicates collapse (lossless), CONFLICTING ones are excluded and named
 *    (because picking a winner publishes one of two contradictory numbers as
 *    fact).
 *
 *   npx tsx scripts/test-eu-stats-keys.ts
 */

import { splitOnUpsertKey } from '../src/lib/chunked-write';
import { ineQuarterPeriod } from '../src/lib/eu-stats-feeds';

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

// ---------------------------------------------------------------------------
console.log('\nineQuarterPeriod — the real INE codes, verified against live Fecha values');
// ---------------------------------------------------------------------------
// Read off table 25171 on 2026-09-06: FK_Periodo 19 carries Fecha 2025-01-01
// (Madrid), 20 -> 2025-04-01, 21 -> 2025-07-01, 22 -> 2025-10-01.

check('19 is Q1', ineQuarterPeriod({ Anyo: 2025, FK_Periodo: 19 }), { period: '2025-Q1' });
check('20 is Q2', ineQuarterPeriod({ Anyo: 2025, FK_Periodo: 20 }), { period: '2025-Q2' });
check('21 is Q3', ineQuarterPeriod({ Anyo: 2025, FK_Periodo: 21 }), { period: '2025-Q3' });
check('22 is Q4', ineQuarterPeriod({ Anyo: 2025, FK_Periodo: 22 }), { period: '2025-Q4' });

console.log('\n  ...and the four are DISTINCT, which is the entire bug');
check(
  'the four quarters of one year produce four different periods',
  new Set([19, 20, 21, 22].map((fk) => {
    const r = ineQuarterPeriod({ Anyo: 2025, FK_Periodo: fk });
    return 'period' in r ? r.period : 'ERR';
  })).size,
  4
);

// The exact output of the old rule, asserted as something that must never
// reappear. Math.ceil(19/3)=7, ceil(20/3)=7, ceil(21/3)=7, ceil(22/3)=8.
console.log('\n  the fabricated quarters the old rule produced must be unreachable');
for (const fk of [19, 20, 21, 22]) {
  const r = ineQuarterPeriod({ Anyo: 2025, FK_Periodo: fk });
  const period = 'period' in r ? r.period : '';
  check(`FK_Periodo ${fk} never yields Q7 or Q8`, /Q[78]$/.test(period), false);
}

// ---------------------------------------------------------------------------
console.log('\nineQuarterPeriod — refuses rather than guesses');
// ---------------------------------------------------------------------------
// There is deliberately NO arithmetic fallback. An unknown code means we do
// not know the quarter, and a guessed period is a fabricated fact.

for (const fk of [0, 1, 4, 5, 12, 18, 23, 99, -3]) {
  const r = ineQuarterPeriod({ Anyo: 2025, FK_Periodo: fk });
  check(`FK_Periodo ${fk} is refused, not guessed`, 'error' in r, true);
}
check(
  'the refusal names the code, so the log can be acted on',
  ineQuarterPeriod({ Anyo: 2025, FK_Periodo: 23 }),
  { error: 'unmapped FK_Periodo 23 for a quarterly series' }
);
check('an implausible year is refused', 'error' in ineQuarterPeriod({ Anyo: 12, FK_Periodo: 19 }), true);
check('a non-integer year is refused', 'error' in ineQuarterPeriod({ Anyo: NaN, FK_Periodo: 19 }), true);
check('a real year passes', ineQuarterPeriod({ Anyo: 2007, FK_Periodo: 22 }), { period: '2007-Q4' });

// ---------------------------------------------------------------------------
console.log('\nsplitOnUpsertKey — the healthy case must stay untouched');
// ---------------------------------------------------------------------------
// eurostat and ecb_sdw write 4,345 rows a night with zero loss, so this guard
// must be a strict no-op for them. If it ever starts excluding their rows it
// has become worse than the bug it fixed.

type R = { k: string; v: number };
const keyOf = (r: R) => r.k;
const valueOf = (r: R) => String(r.v);

check(
  'a batch with no duplicates passes through unchanged',
  splitOnUpsertKey([{ k: 'a', v: 1 }, { k: 'b', v: 2 }, { k: 'c', v: 3 }], keyOf, valueOf),
  {
    rows: [{ k: 'a', v: 1 }, { k: 'b', v: 2 }, { k: 'c', v: 3 }],
    collapsed_identical: 0,
    excluded_conflicting: 0,
    conflicting_keys: [],
    conflicting_keys_total: 0,
  }
);
check(
  'an empty batch is empty, not an error',
  splitOnUpsertKey([] as R[], keyOf, valueOf).rows.length,
  0
);
check(
  'input order is preserved (a stable batch is a debuggable one)',
  splitOnUpsertKey([{ k: 'c', v: 3 }, { k: 'a', v: 1 }], keyOf, valueOf).rows.map((r) => r.k),
  ['c', 'a']
);

// ---------------------------------------------------------------------------
console.log('\nsplitOnUpsertKey — identical duplicates collapse, and are counted');
// ---------------------------------------------------------------------------

check(
  'an exact repeat is collapsed to one row',
  splitOnUpsertKey([{ k: 'a', v: 1 }, { k: 'a', v: 1 }, { k: 'b', v: 2 }], keyOf, valueOf),
  {
    rows: [{ k: 'a', v: 1 }, { k: 'b', v: 2 }],
    collapsed_identical: 1,
    excluded_conflicting: 0,
    conflicting_keys: [],
    conflicting_keys_total: 0,
  }
);
check(
  'a row repeated five times collapses to one and counts four',
  splitOnUpsertKey(
    Array.from({ length: 5 }, () => ({ k: 'a', v: 1 })),
    keyOf,
    valueOf
  ).collapsed_identical,
  4
);

// ---------------------------------------------------------------------------
console.log('\nsplitOnUpsertKey — CONFLICTING duplicates are excluded, never picked between');
// ---------------------------------------------------------------------------
// This is the load-bearing asymmetry. Keeping "the last one" would have made
// the INE write succeed and published one of two contradictory values as the
// official Spanish house price index for that quarter.

const conflicted = splitOnUpsertKey(
  [{ k: 'a', v: 1 }, { k: 'a', v: 999 }, { k: 'b', v: 2 }],
  keyOf,
  valueOf
);
check('no row for the conflicting key survives', conflicted.rows.map((r) => r.k), ['b']);
check('both conflicting rows are counted as excluded', conflicted.excluded_conflicting, 2);
check('the conflicting key is named', conflicted.conflicting_keys, ['a']);
check('the uncapped key count is reported', conflicted.conflicting_keys_total, 1);
check('the innocent row still lands', conflicted.rows, [{ k: 'b', v: 2 }]);

check(
  'the sample is capped but the total is not — the 09-03 lesson, applied here',
  (() => {
    const rows: R[] = [];
    for (let i = 0; i < 20; i++) rows.push({ k: `k${i}`, v: 1 }, { k: `k${i}`, v: 2 });
    const r = splitOnUpsertKey(rows, keyOf, valueOf);
    return { sample: r.conflicting_keys.length, total: r.conflicting_keys_total, excluded: r.excluded_conflicting };
  })(),
  { sample: 5, total: 20, excluded: 40 }
);

console.log('\n  a key that is both repeated AND conflicting is excluded, not collapsed');
check(
  'three rows, two values → all three excluded',
  splitOnUpsertKey([{ k: 'a', v: 1 }, { k: 'a', v: 1 }, { k: 'a', v: 2 }], keyOf, valueOf),
  {
    rows: [],
    collapsed_identical: 0,
    excluded_conflicting: 3,
    conflicting_keys: ['a'],
    conflicting_keys_total: 1,
  }
);

// ---------------------------------------------------------------------------
console.log('\nsplitOnUpsertKey — the funnel adds up');
// ---------------------------------------------------------------------------
// Same invariant as chunkedWrite: no row may go unaccounted for.

for (const [name, rows] of [
  ['clean', [{ k: 'a', v: 1 }, { k: 'b', v: 2 }]],
  ['identical dupes', [{ k: 'a', v: 1 }, { k: 'a', v: 1 }]],
  ['conflicts', [{ k: 'a', v: 1 }, { k: 'a', v: 2 }, { k: 'b', v: 3 }]],
  ['mixed', [{ k: 'a', v: 1 }, { k: 'a', v: 1 }, { k: 'b', v: 2 }, { k: 'b', v: 9 }, { k: 'c', v: 3 }]],
  ['empty', []],
] as Array<[string, R[]]>) {
  const r = splitOnUpsertKey(rows, keyOf, valueOf);
  check(
    `${name}: input === kept + collapsed + excluded`,
    r.rows.length + r.collapsed_identical + r.excluded_conflicting,
    rows.length
  );
}

check(
  'a loss is always accompanied by a named key (so it can never be a silent zero)',
  (() => {
    const r = splitOnUpsertKey([{ k: 'a', v: 1 }, { k: 'a', v: 2 }], keyOf, valueOf);
    return r.excluded_conflicting > 0 && r.conflicting_keys.length > 0;
  })(),
  true
);

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILURES'} — ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
