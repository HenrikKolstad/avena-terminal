/**
 * Tests for src/lib/unit-identity.ts — the unit-identity check on price moves.
 * Fixtures are shaped on real W43 cases (2026-10-24): a ref re-used for a
 * different unit of the same building must never count as a price move.
 *
 * Run: npx tsx scripts/test-unit-identity.ts
 */
import { moveVerdict, dropPreUnitChange, isUnitBreak, SIZE_TOL, LARGE_MOVE } from '../src/lib/unit-identity';
import { buildObservedMoves, type SnapshotRow } from '../src/lib/open-dataset';

let pass = 0;
let fail = 0;
const ok = (cond: boolean, label: string) => {
  if (cond) { pass++; console.log(`  ok  ${label}`); } else { fail++; console.error(`  FAIL ${label}`); }
};

const base = { type: 'Apartment', beds: 2, baths: 2, img_sig: 'aaaa' };

ok(moveVerdict({ price: 300000, ...base, built_m2: 100 }, { price: 300000, ...base, built_m2: 100 }) === null, 'no change → null');
ok(moveVerdict({ price: 300000, ...base, built_m2: 100 }, { price: 285000, ...base, built_m2: 100 })?.status === 'verified', 'same unit −5% → verified');
ok(moveVerdict({ price: 300000, ...base, built_m2: 100 }, { price: 310000, ...base, built_m2: 100 + 100 * SIZE_TOL * 0.5 })?.status === 'verified', 'size within tolerance → verified');
// N8723-like: built 127→92 m²
const n = moveVerdict({ price: 847000, ...base, built_m2: 127, plot_m2: 48 }, { price: 478000, ...base, built_m2: 92, plot_m2: 26 });
ok(n?.status === 'unit_changed' && /built 127→92/.test(n.note ?? ''), 'built size changed → unit_changed with note');
ok(moveVerdict({ price: 300000, ...base, built_m2: 100 }, { price: 340000, ...base, beds: 3, built_m2: 100 })?.status === 'unit_changed', 'beds changed → unit_changed');
ok(moveVerdict({ price: 300000, ...base, pm2: 3000 }, { price: 450000, ...base, pm2: 3000 })?.status === 'unit_changed', 'implied built size from €/m² differs → unit_changed');
// SP1277-like: alternating
ok(moveVerdict({ price: 1125000, ...base, built_m2: 200 }, { price: 1690000, ...base, built_m2: 200 }, null, true)?.status === 'unverified', 'large move back to an earlier price → unverified');
ok(moveVerdict({ price: 300000, ...base, built_m2: 100 }, { price: 400000, ...base, built_m2: 100, img_sig: 'bbbb' })?.status === 'unverified', 'large move with replaced images → unverified');
ok(moveVerdict({ price: 300000 }, { price: 300000 * (1 + LARGE_MOVE) })?.status === 'unverified', 'large move without specs → unverified');
ok(moveVerdict({ price: 300000 }, { price: 290000 })?.status === 'verified', 'small move without specs → verified');
ok(moveVerdict({ price: 300000, ...base, built_m2: 100 }, { price: 400000, ...base, built_m2: 100 }, 1000)?.status === 'unverified', '€/m² far above area benchmark → unverified');
ok(moveVerdict({ price: 300000, ...base, built_m2: 100 }, { price: 400000, ...base, built_m2: 100 }, 3500)?.status === 'verified', 'large move, all checks pass → verified');

const rows = [
  { ref: 'A', price: 100, snapshot_date: '2026-10-01', move_status: null },
  { ref: 'A', price: 200, snapshot_date: '2026-10-02', move_status: 'unit_changed' },
  { ref: 'A', price: 190, snapshot_date: '2026-10-03', move_status: 'verified' },
  { ref: 'B', price: 100, snapshot_date: '2026-10-01', move_status: null },
  { ref: 'B', price: 95, snapshot_date: '2026-10-02', move_status: 'verified' },
];
const kept = dropPreUnitChange(rows);
ok(kept.length === 4 && !kept.some((r) => r.ref === 'A' && r.snapshot_date === '2026-10-01'), 'dropPreUnitChange removes the earlier unit only');
ok(isUnitBreak({ move_status: 'unverified' }) && !isUnitBreak({ move_status: 'verified' }) && !isUnitBreak({}), 'isUnitBreak');

const snap = (ref: string, d: string, price: number, move_status: string | null = null): SnapshotRow =>
  ({ ref, snapshot_date: d, price, pm2: null, town: 'X', region: 'Y', type: 'Apartment', move_status }) as SnapshotRow;
const moves = buildObservedMoves([
  snap('A', '2026-10-01', 100000), snap('A', '2026-10-02', 200000, 'unit_changed'),
  snap('B', '2026-10-01', 100000), snap('B', '2026-10-02', 95000, 'verified'),
] as SnapshotRow[]);
ok(moves.length === 1 && moves[0].avn_id === 'B', 'open dataset excludes unit changes from observed moves');

console.log(fail ? `FAILED — ${pass} passed, ${fail} failed` : `ALL PASS — ${pass} passed, 0 failed`);
if (fail) process.exit(1);
