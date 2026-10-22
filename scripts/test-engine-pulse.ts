/**
 * scripts/test-engine-pulse.ts
 *
 * Pins the arithmetic behind the /engine market-pulse line, the price-history
 * showcase and the sell-out ledger, and the rule that none of them may print
 * a number the engine did not capture.
 *
 * Hermetic: pure functions over fixture rows plus static reads of the
 * components. No credentials needed.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { summarizePulse, cutsInSeries, median, rankByCuts, pickShowcase, seriesByRef, type SnapPoint } from '../src/lib/engine-pulse';

const ROOT = join(__dirname, '..');
let passed = 0;
const failures: string[] = [];
function ok(label: string, cond: boolean, detail = '') {
  if (cond) { passed++; console.log(`  ✓ ${label}`); }
  else { failures.push(`${label}${detail ? ` — ${detail}` : ''}`); console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`); }
}

const row = (ref: string, snapshot_date: string, price: number | null): SnapPoint => ({ ref, snapshot_date, price });

console.log('\n/engine pulse — derived from captured rows, never invented\n');

// ── 1. absence is absence ──────────────────────────────────────────────────
ok('no rows -> pulse is null (the line hides, it does not print zeros)', summarizePulse([]) === null);
ok('rows with only null prices -> pulse is null', summarizePulse([row('A', '2026-10-15', null)]) === null);
ok('median of nothing is null, not 0', median([]) === null);
ok('no cuts anywhere -> no showcase', pickShowcase([row('A', '2026-10-15', 100), row('A', '2026-10-16', 100), row('A', '2026-10-17', 110)]) === null);

// ── 2. the arithmetic ──────────────────────────────────────────────────────
const rows: SnapPoint[] = [
  // A: two cuts (-10%, -5%), out-of-order input to prove sorting
  row('A', '2026-10-17', 90_000), row('A', '2026-10-15', 100_000), row('A', '2026-10-19', 85_500), row('A', '2026-10-20', 85_500),
  // B: one increase, no cut
  row('B', '2026-10-15', 200_000), row('B', '2026-10-18', 220_000),
  // C: one cut (-2%)
  row('C', '2026-10-14', 500_000), row('C', '2026-10-21', 490_000),
  // D: sold-out ref, filtered by `keep`
  row('D', '2026-10-15', 300_000), row('D', '2026-10-16', 150_000),
];
const keep = (r: string) => r !== 'D';
const p = summarizePulse(rows, keep)!;
ok('counts every captured drop', p.cuts === 3, `got ${p.cuts}`);
ok('counts distinct homes cut', p.homesCut === 2, `got ${p.homesCut}`);
ok('median cut is the median of captured cut sizes', p.medianCutPct === -5, `got ${p.medianCutPct}`);
ok('window bounds are the captured days', p.from === '2026-10-14' && p.to === '2026-10-21', `${p.from}..${p.to}`);
ok('increases are not cuts', cutsInSeries('B', seriesByRef(rows).get('B')!).length === 0);
ok('keep() excludes refs no longer in the live book', !rankByCuts(rows, keep).includes('D'));
ok('rankByCuts orders by number of cuts', rankByCuts(rows, keep).join(',') === 'A,C', rankByCuts(rows, keep).join(','));
const s = pickShowcase(rows.filter((r) => r.ref !== 'D'))!;
ok('showcase is the series with the most cuts', s.ref === 'A' && s.cuts.length === 2, `${s?.ref} ${s?.cuts.length}`);
ok('showcase keeps every captured point, unsmoothed', s.points.length === 4);
ok('cut is dated on the day the lower price was first captured', s.cuts[0].date === '2026-10-17' && s.cuts[0].pct === -10);

// ── 3. the components render absence, not examples ─────────────────────────
const pulseSrc = readFileSync(join(ROOT, 'src/components/engine/MarketPulse.tsx'), 'utf8');
const chartSrc = readFileSync(join(ROOT, 'src/components/engine/PriceHistoryChart.tsx'), 'utf8');
const ledgerSrc = readFileSync(join(ROOT, 'src/components/engine/SelloutLedger.tsx'), 'utf8');
ok('MarketPulse returns null when there is nothing captured', /if \(!hasCuts && !hasSellouts\) return null;/.test(pulseSrc));
ok('PriceHistoryChart has an explicit empty state', /price-history-empty/.test(chartSrc));
ok('SelloutLedger has an explicit empty state', /sellout-ledger-empty/.test(ledgerSrc));
ok('no hardcoded example series in the chart', !/\b(points|series)\s*[:=]\s*\[\s*\{/.test(chartSrc));
ok('the ledger carries the promised headline', /Gone from the source feed\./.test(ledgerSrc) && /Only Avena still has the last price\./.test(ledgerSrc));

console.log('');
if (failures.length) {
  console.log(`FAILED — ${passed} passed, ${failures.length} failed`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`ALL PASS — ${passed} passed, 0 failed`);
