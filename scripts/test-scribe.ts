/**
 * Tests for the scribe capture's decision logic.
 *
 * These exist because the bug they guard against was invisible for months:
 * score_history looked complete — every day present, ~2,000 rows each — while
 * every row was dated one day after the observation it held. Nothing in the
 * output could have revealed that; only a cross-check against price_snapshots
 * did. So the rules are pinned here instead.
 *
 * Run: npx tsx scripts/test-scribe.ts
 */

import { resolveSnapshotDate, daysBetween, deriveStatus, deriveWriteCounts } from '../src/lib/scribe-logic';

let passed = 0;
let failed = 0;

function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

console.log('resolveSnapshotDate — the date must name the observation, not the run');

{
  // The bug, directly: run on 08-21 holding the 08-20 book.
  const r = resolveSnapshotDate('2026-08-20', '2026-08-21');
  check('a stale book is filed under the day it represents, not today', r.date === '2026-08-20', r.date);
  check('the source is reported', r.source === 'feed-meta');
  check('the lag is reported as 1 day', r.lagDays === 1, String(r.lagDays));
}

{
  const r = resolveSnapshotDate('2026-08-21', '2026-08-21');
  check("today's book is filed under today", r.date === '2026-08-21');
  check('a fresh book reports zero lag', r.lagDays === 0, String(r.lagDays));
}

{
  // feed-meta.json absent (a deploy predating the stamp). Unknown must never
  // mean "stale", and must never block the capture.
  const r = resolveSnapshotDate(null, '2026-08-21');
  check('an absent stamp falls back to wall-clock rather than failing', r.date === '2026-08-21');
  check('the fallback is labelled, so it is never mistaken for a real stamp', r.source === 'wall-clock');
  check('lag is null (unknown), never 0', r.lagDays === null, String(r.lagDays));
}

{
  // A book stamped in the future would mean a clock or workflow fault. It must
  // still be filed by its own stamp, with a negative lag making it visible.
  const r = resolveSnapshotDate('2026-08-22', '2026-08-21');
  check('a future-stamped book is still filed by its stamp', r.date === '2026-08-22');
  check('a future stamp surfaces as negative lag', r.lagDays === -1, String(r.lagDays));
}

console.log('\ndaysBetween');
check('same day is 0', daysBetween('2026-08-21', '2026-08-21') === 0);
check('one day', daysBetween('2026-08-20', '2026-08-21') === 1);
check('across a month boundary', daysBetween('2026-07-31', '2026-08-01') === 1);
check('across a year boundary', daysBetween('2025-12-31', '2026-01-01') === 1);
check('a wide gap', daysBetween('2026-08-01', '2026-08-21') === 20);
check('unparseable input degrades to 0 rather than NaN', daysBetween('nonsense', '2026-08-21') === 0);

console.log('\nderiveStatus — a failed write must never read as a green run');

{
  const s = deriveStatus({ rowsSent: 2020, rowsFailed: 0, errors: [] });
  check('a full clean write is success', s.status === 'success' && s.reason === null);
}

{
  // The recurring bug: `if (!error) count += chunk` + unconditional success.
  const s = deriveStatus({ rowsSent: 2020, rowsFailed: 2020, errors: ['boom'] });
  check('every chunk rejected is an error, not a success with 0', s.status === 'error');
  check('the error says how many were rejected', (s.reason ?? '').includes('2020'), s.reason ?? '');
}

{
  const s = deriveStatus({ rowsSent: 2020, rowsFailed: 200, errors: ['boom'] });
  check('a partial rejection is an error, not a rounded-down success', s.status === 'error');
}

{
  // parse-feed downloading 0MB and exiting green is the canonical instance.
  const s = deriveStatus({ rowsSent: 0, rowsFailed: 0, errors: [] });
  check('an empty book is an error, not a quiet success', s.status === 'error');
  check('the reason names the feed', (s.reason ?? '').includes('feed'), s.reason ?? '');
}


// ── deriveWriteCounts — separating what was computed from what was measured ──
//
// Added 2026-10-11. The real run that motivated it: 2026-10-05 12:14:10 logged
// rows_sent 2030 / rows_accepted 2030 / rows_failed 0 and inserted ZERO rows,
// because the 07:40 run had already banked that date — from a book that still
// carried the previous day's prices for twelve refs. Both logs read clean while
// score_history permanently held stale prices that price_snapshots corrected.

{
  // THE REAL CASE: a full book sent, the date already complete, nothing written.
  const c = deriveWriteCounts(2030, 0, 2030, 2030);
  check('a complete no-op is reported as rows_inserted 0', c.rowsInserted === 0);
  check('…and every row is reported as ignored', c.rowsIgnored === 2030);
  check('…and no_op is true', c.noOp === true);
  check('…while rows_accepted still says 2030, which is why it is not evidence', c.rowsAccepted === 2030);
}

{
  // A genuine first write for the date.
  const c = deriveWriteCounts(2039, 0, 0, 2039);
  check('a fresh date inserts the whole book', c.rowsInserted === 2039);
  check('…ignores nothing', c.rowsIgnored === 0);
  check('…and is not a no-op', c.noOp === false);
}

{
  // A second run after the book grew: 9 new refs land, the rest are ignored.
  const c = deriveWriteCounts(2039, 0, 2030, 2039);
  check('a partial top-up measures only the rows that landed', c.rowsInserted === 9);
  check('…and reports the rest as ignored', c.rowsIgnored === 2030);
  check('…and is not a no-op', c.noOp === false);
}

{
  // The contract that matters most: unknown is null, NEVER 0.
  const a = deriveWriteCounts(2030, 0, null, 2030);
  check('a failed PRE count yields null, not 0', a.rowsInserted === null);
  check('…and null rowsIgnored, not a fabricated figure', a.rowsIgnored === null);
  check('…and null no_op, because we cannot know', a.noOp === null);
  const b = deriveWriteCounts(2030, 0, 2030, null);
  check('a failed POST count yields null too', b.rowsInserted === null);
  const d = deriveWriteCounts(2030, 0, null, null);
  check('both counts failing yields null', d.rowsInserted === null && d.noOp === null);
}

{
  // Rejected rows must not be counted as ignored duplicates: different causes,
  // different fixes. 200 rejected, 1830 accepted, 1830 landed -> 0 ignored.
  const c = deriveWriteCounts(2030, 200, 0, 1830);
  check('rejections are excluded from rows_ignored', c.rowsIgnored === 0);
  check('…and rows_accepted nets off the failures', c.rowsAccepted === 1830);
  check('…and a run that landed rows is not a no-op', c.noOp === false);
}

{
  // An empty book that writes nothing is NOT the no-op this flag is for: it is
  // the louder empty-book error deriveStatus already raises.
  const c = deriveWriteCounts(0, 0, 100, 100);
  check('sending nothing is not reported as a no-op', c.noOp === false);
}

console.log(`\n${failed === 0 ? 'ALL PASS' : 'FAILURES'} — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
