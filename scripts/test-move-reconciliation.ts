/**
 * Tests for src/lib/move-reconciliation.ts.
 *
 * The fixtures are REAL rows measured out of Supabase on 2026-10-08, not
 * invented ones. That matters: the whole point of the module is that the
 * hand-derived figure wandered between mornings, so the test pins the actual
 * observed population rather than a convenient synthetic one.
 *
 * Run: npx tsx scripts/test-move-reconciliation.ts
 */
import {
  deriveMoves,
  reconcileMoves,
  EVENT_LOG_START,
  MAX_CONSECUTIVE_GAP_DAYS,
  type SnapshotRow,
  type MoveEventRow,
} from '../src/lib/move-reconciliation';

let pass = 0;
let fail = 0;
const ok = (cond: boolean, label: string) => {
  if (cond) {
    pass++;
    console.log(`  ok  ${label}`);
  } else {
    fail++;
    console.error(`  FAIL ${label}`);
  }
};

/** The 18 relisting repricings observed since EVENT_LOG_START, from Supabase. */
const REAL_RELISTINGS: Array<[string, string, string, number, number]> = [
  ['SP1648', '2026-08-28', '2026-09-01', 283500, 268500],
  ['SP1018', '2026-08-18', '2026-09-08', 552000, 492000],
  ['N8967', '2026-08-13', '2026-09-11', 359000, 379000],
  ['N9016', '2026-08-20', '2026-09-12', 450000, 560000],
  ['SP1534', '2026-09-04', '2026-09-19', 558800, 570000],
  ['SP1531', '2026-09-04', '2026-09-19', 295575, 290900],
  ['SP1785', '2026-09-08', '2026-09-24', 884400, 844100],
  ['SP0664', '2026-09-11', '2026-09-24', 397000, 368000],
  ['SP1484', '2026-08-18', '2026-09-24', 525000, 650000],
  ['SP1750', '2026-08-13', '2026-09-29', 798000, 910000],
  ['SP1525', '2026-09-18', '2026-09-30', 506000, 479000],
  ['N7504', '2026-08-13', '2026-10-04', 528125, 598125],
  ['N7506', '2026-08-13', '2026-10-04', 663115, 743115],
  ['N7505', '2026-08-13', '2026-10-04', 563160, 643160],
  ['N8647', '2026-08-13', '2026-10-04', 505280, 605280],
  ['N8648', '2026-08-13', '2026-10-04', 547690, 725000],
  ['N9949', '2026-09-28', '2026-10-06', 341500, 350040],
  ['N9955', '2026-09-28', '2026-10-06', 376500, 401040],
];

const relistRows: SnapshotRow[] = REAL_RELISTINGS.flatMap(([ref, leftAfter, back, from, to]) => [
  { ref, snapshot_date: leftAfter, price: from },
  { ref, snapshot_date: back, price: to },
]);

console.log('move-reconciliation\n');

// ── classification ────────────────────────────────────────────────────────
{
  const { moves } = deriveMoves([
    { ref: 'A', snapshot_date: '2026-10-06', price: 100 },
    { ref: 'A', snapshot_date: '2026-10-07', price: 110 },
  ]);
  ok(moves.length === 1 && moves[0].kind === 'consecutive', 'a next-day change is a consecutive move');
  ok(moves[0].pct === 10, 'pct is signed and rounded to one decimal (+10)');
}
{
  const { moves } = deriveMoves([
    { ref: 'A', snapshot_date: '2026-10-01', price: 100 },
    { ref: 'A', snapshot_date: '2026-10-03', price: 90 },
  ]);
  ok(moves[0].gapDays === MAX_CONSECUTIVE_GAP_DAYS && moves[0].kind === 'consecutive',
    `a gap of exactly ${MAX_CONSECUTIVE_GAP_DAYS} days is still consecutive (matches deltas.ts)`);
}
{
  const { moves } = deriveMoves([
    { ref: 'A', snapshot_date: '2026-10-01', price: 100 },
    { ref: 'A', snapshot_date: '2026-10-04', price: 90 },
  ]);
  ok(moves[0].gapDays === 3 && moves[0].kind === 'relisting',
    'a gap of 3 days is a relisting, the class deltas.ts cannot see');
}
{
  const { moves } = deriveMoves([
    { ref: 'A', snapshot_date: '2026-10-06', price: 100 },
    { ref: 'A', snapshot_date: '2026-10-07', price: 100 },
  ]);
  ok(moves.length === 0, 'an unchanged price is not a move');
}

// ── the recurring bug: a dropped value must be counted, never silent ──────
{
  const { moves, rowsSkippedNullPrice } = deriveMoves([
    { ref: 'A', snapshot_date: '2026-10-06', price: null },
    { ref: 'A', snapshot_date: '2026-10-07', price: 110 },
  ]);
  ok(rowsSkippedNullPrice === 1, 'a null price is COUNTED as skipped, not silently dropped');
  ok(moves.length === 0, 'and it yields no move rather than a move from zero');
}
{
  // PostgREST returns numeric as a string; a lexical compare would call
  // '90' > '110' a rise.
  const { moves } = deriveMoves([
    { ref: 'A', snapshot_date: '2026-10-06', price: '110' as unknown as number },
    { ref: 'A', snapshot_date: '2026-10-07', price: '90' as unknown as number },
  ]);
  ok(moves.length === 1 && moves[0].pct < 0, 'string numerics from PostgREST are coerced, so a fall reads as a fall');
}

// ── the real population ───────────────────────────────────────────────────
{
  const { moves } = deriveMoves(relistRows);
  ok(moves.length === 18, 'all 18 observed relistings are derived');
  ok(moves.every((m) => m.kind === 'relisting'), 'and every one classifies as a relisting');

  // No events at all: this is the measured state of the ledger.
  const report = reconcileMoves(moves, [], 0);
  ok(report.relisting.total === 18, 'relisting total is 18');
  ok(report.relisting.logged === 0, 'relisting logged is 0 — a 100% loss rate, not 5.6%');
  ok(report.relisting.unloggedLive === 18, 'all 18 are live defects, none predate the event log');
  ok(report.relisting.unloggedPreLog === 0, 'none are excused as pre-event-log');
  ok(report.consecutive.total === 0, 'and none of them leak into the consecutive population');
  ok(report.relisting.unloggedLiveMoves[0].ref === 'N8648',
    'the largest move (N8648 +32.4%) is reported first, so the worst case is visible');
}

// ── the pre/post event-log split that made the hand counts wander ─────────
{
  const rows: SnapshotRow[] = [
    { ref: 'OLD', snapshot_date: '2026-08-06', price: 100 },
    { ref: 'OLD', snapshot_date: '2026-08-07', price: 110 },
    { ref: 'NEW', snapshot_date: '2026-10-06', price: 100 },
    { ref: 'NEW', snapshot_date: '2026-10-07', price: 110 },
  ];
  const { moves } = deriveMoves(rows);
  const report = reconcileMoves(moves, [], 0);
  ok(report.consecutive.unloggedPreLog === 1, 'an unlogged move before the event log is NOT a live defect');
  ok(report.consecutive.unloggedLive === 1, 'an unlogged move after it IS');
  ok(EVENT_LOG_START === '2026-08-12', 'the split date is the documented one');
  ok(!('unlogged' in report.consecutive), 'there is no blended "unlogged" field to quote by accident');
}

// ── orphans: the event log holding what the snapshot lost ────────────────
{
  // SP0848, 2026-10-07: logged `reduced` to 415,000 while the stored snapshot
  // for that day reads 441,000 — a later same-day write overwrote the move.
  const rows: SnapshotRow[] = [
    { ref: 'SP0848', snapshot_date: '2026-10-06', price: 441000 },
    { ref: 'SP0848', snapshot_date: '2026-10-07', price: 441000 },
  ];
  const events: MoveEventRow[] = [{ ref: 'SP0848', date: '2026-10-07' }];
  const { moves } = deriveMoves(rows);
  const report = reconcileMoves(moves, events, 0);
  ok(moves.length === 0, 'the overwritten snapshot shows no move at all');
  ok(report.orphanEvents.length === 1 && report.orphanEvents[0].ref === 'SP0848',
    'so the event is surfaced as an orphan rather than vanishing');
}
{
  const { moves } = deriveMoves([
    { ref: 'A', snapshot_date: '2026-10-06', price: 100 },
    { ref: 'A', snapshot_date: '2026-10-07', price: 110 },
  ]);
  const report = reconcileMoves(moves, [{ ref: 'A', date: '2026-10-07' }], 0);
  ok(report.consecutive.logged === 1 && report.orphanEvents.length === 0,
    'a matched event counts as logged and is not an orphan');
}

// ── the skipped-row count must survive into the report ───────────────────
{
  const { moves, rowsSkippedNullPrice } = deriveMoves([
    { ref: 'A', snapshot_date: '2026-10-06', price: null },
    { ref: 'A', snapshot_date: '2026-10-07', price: 110 },
  ]);
  const report = reconcileMoves(moves, [], rowsSkippedNullPrice);
  ok(report.rowsSkippedNullPrice === 1,
    'rowsSkippedNullPrice is carried into the report, not reset to a hardcoded 0');
}

console.log(`\n${fail === 0 ? `ALL PASS (${pass})` : `${pass} passed / ${fail} FAILED`}`);
process.exit(fail === 0 ? 0 : 1);
