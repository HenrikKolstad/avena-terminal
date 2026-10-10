/**
 * scripts/test-counterpart-drift.ts
 *
 * Pins the ratchet shut, using the REAL rows and the REAL measured history
 * that produced the bug.
 *
 * What happened (measured 2026-10-10 from `events` and `counterpart_developers`):
 * `counterpart-scan` re-applied a signal-derived drift every night to stress
 * signals that nothing in the codebase ever updates. 122 `grade_revised`
 * events per developer, every one with min(drift) == max(drift) — a constant.
 * Neinor Homes 59 -> 0, Realia Patrimonio 49 -> 0, Metrovacesa 13 -> 0, all
 * pinned at the clamp floor and published as grade DV on a public page, plus
 * ~725 "active" financial-distress alerts, ~5 more per day.
 *
 * The regression this file exists to prevent: a scan moving a score, minting
 * an alert, or writing a revision event when it has learned NOTHING.
 */

import {
  decideScan, signalsFingerprint, computeDrift, scoreToGrade,
  type DeveloperScanRow, type DriftInputs,
} from '../src/lib/counterpart-drift';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const ROUTE = readFileSync(
  join(ROOT, 'src', 'app', 'api', 'cron', 'counterpart-scan', 'route.ts'), 'utf8',
);
/**
 * The route's comments deliberately QUOTE the old buggy expressions so the
 * next reader knows what was wrong. A shape assertion must therefore read the
 * code with comments stripped, or it fails on the very explanation of the fix.
 */
const ROUTE_CODE = ROUTE
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

let passed = 0;
const failures: string[] = [];
function ok(label: string, cond: boolean, detail = '') {
  if (cond) { passed++; console.log(`  ✓ ${label}`); }
  else { failures.push(`${label}${detail ? ` — ${detail}` : ''}`); console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`); }
}

// ── The real rows, as read from counterpart_developers on 2026-10-10 ────────

const METROVACESA: DriftInputs = {
  payment_delay_signals: 1, legal_disputes_active: 3,
  court_judgements_against: 1, delayed_projects: 0,
  cancelled_projects: 0, financial_stress_score: null,
};
const NEINOR: DriftInputs = {
  payment_delay_signals: 0, legal_disputes_active: 2,
  court_judgements_against: 0, delayed_projects: 0,
  cancelled_projects: 0, financial_stress_score: null,
};
const REALIA: DriftInputs = {
  payment_delay_signals: 1, legal_disputes_active: 1,
  court_judgements_against: 0, delayed_projects: 0,
  cancelled_projects: 0, financial_stress_score: null,
};
const TAYLOR_WIMPEY: DriftInputs = {
  payment_delay_signals: 0, legal_disputes_active: 0,
  court_judgements_against: 0, delayed_projects: 0,
  cancelled_projects: 0, financial_stress_score: null,
};

function row(id: string, name: string, score: number, s: DriftInputs, fp: string | null): DeveloperScanRow {
  return { developer_id: id, name, counterpart_score: score, score_trend: null, signals_fingerprint: fp, ...s };
}

console.log('\n── the drift model itself is unchanged ──');

// The arithmetic was never the bug. If these move, the model changed and the
// published scores change with it — that is a decision, not a refactor.
ok('Metrovacesa signals still imply -2.5 drift', computeDrift(METROVACESA) === -2.5,
   `got ${computeDrift(METROVACESA)}`);
ok('Neinor signals still imply 0 drift (2 disputes is below the >2 threshold)',
   computeDrift(NEINOR) === 0, `got ${computeDrift(NEINOR)}`);
ok('a clean developer still earns +0.5 recovery', computeDrift(TAYLOR_WIMPEY) === 0.5,
   `got ${computeDrift(TAYLOR_WIMPEY)}`);
ok('drift is clamped to -3', computeDrift({
  payment_delay_signals: 99, legal_disputes_active: 99, court_judgements_against: 99,
  delayed_projects: 99, cancelled_projects: 99, financial_stress_score: 99,
}) === -3);
ok('grade boundaries unchanged', scoreToGrade(85) === 'AAV' && scoreToGrade(84) === 'AV'
   && scoreToGrade(41) === 'DV' && scoreToGrade(42) === 'CV');

console.log('\n── THE RATCHET: unchanged signals must never move a score ──');

const fpMetro = signalsFingerprint(METROVACESA);

// This is THE regression. Metrovacesa's signals have not changed since
// 2026-05-21 and the old code took -2.5 off its score every single night.
const held = decideScan(row('DEV-ES-MV', 'Metrovacesa', 13, METROVACESA, fpMetro));
ok('a developer with unchanged signals HOLDS, it does not drift',
   held.action === 'hold', `got ${held.action}`);
ok('the hold states its reason', held.action === 'hold' && held.reason === 'signals_unchanged');

// Run it 122 times — the real number of nightly revisions — and the score
// must be exactly where it started.
let score = 59;
for (let night = 0; night < 122; night++) {
  const d = decideScan(row('DEV-ES-MV', 'Metrovacesa', score, METROVACESA, fpMetro));
  if (d.action === 'drift') score = d.newScore;
}
ok('122 nights of unchanged signals leave the score untouched (was 59 -> 0)',
   score === 59, `ended at ${score}`);

// And the same for the developer that actually walked 59 -> 0.
let neinor = 59;
const fpNeinor = signalsFingerprint(NEINOR);
for (let night = 0; night < 122; night++) {
  const d = decideScan(row('DEV-ES-NEINOR', 'Neinor Homes', neinor, NEINOR, fpNeinor));
  if (d.action === 'drift') neinor = d.newScore;
}
ok('Neinor Homes does not walk to the floor any more', neinor === 59, `ended at ${neinor}`);

console.log('\n── the first run must not move anything either ──');

// A row with no fingerprint on record is NOT evidence of a change. The old
// bug was absence-becomes-a-value; baselining must not repeat it.
const baseline = decideScan(row('DEV-ES-MV', 'Metrovacesa', 13, METROVACESA, null));
ok('a row with no fingerprint BASELINES rather than drifting',
   baseline.action === 'baseline', `got ${baseline.action}`);
ok('the baseline carries the fingerprint to store',
   baseline.action === 'baseline' && baseline.fingerprint === fpMetro);

console.log('\n── a real change still moves the score, once ──');

const worsened: DriftInputs = { ...METROVACESA, court_judgements_against: 2 };
const moved = decideScan(row('DEV-ES-MV', 'Metrovacesa', 60, worsened, fpMetro));
ok('changed signals DO produce a drift', moved.action === 'drift', `got ${moved.action}`);
ok('the drift lands on the expected score', moved.action === 'drift' && moved.newScore === 58,
   moved.action === 'drift' ? `got ${moved.newScore}` : '');
ok('the drift reports a deteriorating trend',
   moved.action === 'drift' && moved.newTrend === 'deteriorating');

// ...and the NEXT night, with the change now on record, it holds.
const nextNight = decideScan(
  row('DEV-ES-MV', 'Metrovacesa', 58, worsened, signalsFingerprint(worsened)),
);
ok('the night after a real change, it holds instead of re-charging it',
   nextNight.action === 'hold', `got ${nextNight.action}`);

console.log('\n── absence is not zero ──');

// null and 0 are different facts. Fingerprinting them identically would make
// "we have no figure" indistinguishable from "we checked, there are none",
// which is precisely how this family of bug begins.
const unknown: DriftInputs = { ...TAYLOR_WIMPEY, legal_disputes_active: null };
ok('a null signal fingerprints differently from a zero signal',
   signalsFingerprint(unknown) !== signalsFingerprint(TAYLOR_WIMPEY),
   `${signalsFingerprint(unknown)} vs ${signalsFingerprint(TAYLOR_WIMPEY)}`);
ok('acquiring a figure for a previously-null signal counts as a change',
   decideScan(row('X', 'X', 70, TAYLOR_WIMPEY, signalsFingerprint(unknown))).action === 'drift');
ok('the fingerprint is stable across calls',
   signalsFingerprint(METROVACESA) === signalsFingerprint({ ...METROVACESA }));
ok('the fingerprint is versioned, so a model change can invalidate it',
   signalsFingerprint(METROVACESA).startsWith('v1:'));

console.log('\n── the clamp must announce itself ──');

// A score decided by the clamp rather than by the model is not a measurement.
// It is the thing that published grade DV against real listed companies.
const atFloor = decideScan(row('X', 'X', 1, worsened, fpMetro));
ok('a drift stopped by the zero floor is flagged as floored',
   atFloor.action === 'drift' && atFloor.floored === true,
   atFloor.action === 'drift' ? `floored=${atFloor.floored}` : `got ${atFloor.action}`);
const midRange = decideScan(row('X', 'X', 60, worsened, fpMetro));
ok('an ordinary drift is NOT flagged as floored',
   midRange.action === 'drift' && midRange.floored === false);

console.log('\n── a changed signal the model is indifferent to ──');

// delayed_projects 0 -> 1 changes the fingerprint but crosses no threshold.
// It must be recorded (so it is not re-evaluated nightly) but must not be
// dressed up as a drift of zero.
const indifferent: DriftInputs = { ...NEINOR, delayed_projects: 1 };
const ind = decideScan(row('X', 'Neinor Homes', 59, indifferent, fpNeinor));
ok('a change the model is indifferent to holds, and banks the new fingerprint',
   ind.action === 'hold' && ind.fingerprint === signalsFingerprint(indifferent),
   `got ${ind.action}`);

console.log('\n── the route must not re-grow the three write bugs ──');

// 1. The Supabase client RESOLVES on a failed write, so the old
//    `try { await update(); updated++ } catch { continue }` counted rejected
//    writes as successes. The returned error must be read.
ok('the score update reads the returned error',
   /const \{ error: updErr \}[\s\S]*?if \(updErr\)\s*\{[\s\S]{0,160}?continue;/.test(ROUTE_CODE));
ok('no try/catch wraps a write in place of checking its error',
   !/try\s*\{[\s\S]{0,200}?\.update\(/.test(ROUTE_CODE));
ok('no empty catch swallows an alert insert', !/catch\s*\{\s*\/\*\s*silent/.test(ROUTE_CODE));
ok('a run with failed writes does not report success',
   /writeFailures\.length > 0[\s\S]{0,300}?finishCronLog\(log, 'error'/.test(ROUTE));

// 2. The old event condition was `|| newGrade !== undefined`, which is always
//    true — so a "grade_revised" event was written on every scan, including
//    0 -> 0. That is 122 phantom revisions per developer in the audit trail.
ok('the always-true event condition is gone in the CODE (the comment may quote it)',
   !/newGrade !== undefined/.test(ROUTE_CODE) && /newGrade !== undefined/.test(ROUTE));
ok('an event is recorded only on a real score change',
   /if \(decision\.newScore !== decision\.previousScore\) \{[\s\S]{0,200}?recordEvent/.test(ROUTE));

// 3. Alerts were inserted unconditionally — Metrovacesa accrued 137 identical
//    "active" financial_distress rows.
ok('alerts are de-duplicated against what is already open',
   /openAlerts\.has\(key\)/.test(ROUTE) && /alertsSuppressed/.test(ROUTE));
ok('an unreadable alert table fails the run rather than guessing',
   /alert read failed/.test(ROUTE));

// 4. The decision must come from the tested module, not be re-inlined.
ok('the route delegates the decision to counterpart-drift', /decideScan\(d\)/.test(ROUTE));
ok('the route no longer carries its own drift arithmetic',
   !/function computeDrift/.test(ROUTE_CODE));
ok('the run reports holds and baselines, so a quiet scan is legible',
   /held_signals_unchanged/.test(ROUTE) && /baselined/.test(ROUTE));
ok('the run reports how many scores were decided by the clamp',
   /scores_decided_by_clamp/.test(ROUTE));

console.log('');
if (failures.length) {
  console.log(`FAILED — ${passed} passed, ${failures.length} failed`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`ALL PASS — ${passed} passed, 0 failed`);
