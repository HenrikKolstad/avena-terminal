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

import { resolveSnapshotDate, daysBetween, deriveStatus } from '../src/lib/scribe-logic';

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

console.log(`\n${failed === 0 ? 'ALL PASS' : 'FAILURES'} — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
