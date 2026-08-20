/**
 * Open-dataset generator correctness harness (2026-08-20).
 * Run: npx tsx scripts/test-open-dataset.ts
 *
 * These functions are pure, and they are the LAST code that runs before a
 * number reaches the published corpus (avenaterminal.com/open-data, the
 * avena-data mirror, Hugging Face, Zenodo). Corpus consumers cross-check
 * sources against each other, so a wrong number here is more expensive than
 * a wrong number anywhere else in this repo. They had no coverage until now.
 *
 * Part A pins the relisting detector, including the boundary cases that make
 * it correct under BOTH the accurate and the one-day-late `last_seen_date`
 * stamping (see O-21).
 * Part B pins the artifacts built on top of it: tombstones carry relisted_on,
 * the ledger counts relistings on the right day, and the manifest separates
 * delistings that stuck from delistings that came back.
 * Part C asserts the refuse-to-publish-nothing guards still throw.
 *
 * Exits 1 on any failure. Extend whenever a corpus defect is found.
 */

import {
  findRelistings,
  latestObservedRefs,
  buildLedger,
  buildTombstones,
  buildManifest,
  type SnapshotRow,
  type SoldRow,
  type ObservedMove,
} from '../src/lib/open-dataset';
import type { Property } from '../src/lib/types';

let failures = 0;
function check(name: string, cond: boolean, detail = '') {
  if (!cond) { failures++; console.error(`  ✗ ${name} ${detail}`); }
  else console.log(`  ✓ ${name}`);
}

const snap = (ref: string, date: string, price = 100_000): SnapshotRow => ({
  ref, snapshot_date: date, price, pm2: 1000, town: 'Estepona', region: 'Costa del Sol', type: 'Apartment',
});
const soldRow = (ref: string, last_seen_date: string | null): SoldRow => ({
  ref, town: 'Estepona', region: 'Costa del Sol', type: 'Apartment',
  beds: 2, built_m2: 90, last_price: 100_000, last_pm2: 1111, last_seen_date,
});

// ── Part A: findRelistings ──────────────────────────────────────────────────
console.log('A. findRelistings');

check('empty sold set → no relistings',
  findRelistings([snap('A', '2026-08-06')], []).size === 0);

check('unit still absent after delisting → not relisted',
  findRelistings([snap('A', '2026-08-05'), snap('B', '2026-08-07')], [soldRow('A', '2026-08-05')]).size === 0);

check('unit seen again after last_seen_date → relisted on that day',
  findRelistings(
    [snap('A', '2026-08-05'), snap('A', '2026-08-09')],
    [soldRow('A', '2026-08-05')],
  ).get('A') === '2026-08-09');

check('relisted_on is the EARLIEST reappearance, not the latest',
  findRelistings(
    [snap('A', '2026-08-12'), snap('A', '2026-08-09'), snap('A', '2026-08-20')],
    [soldRow('A', '2026-08-05')],
  ).get('A') === '2026-08-09');

// Boundary: a snapshot dated exactly last_seen_date is the observation that
// PROVES it was last seen then. Counting it would flag every tombstone.
check('snapshot ON last_seen_date is not a relisting',
  findRelistings([snap('A', '2026-08-05')], [soldRow('A', '2026-08-05')]).size === 0);

check('snapshot BEFORE last_seen_date is not a relisting',
  findRelistings([snap('A', '2026-08-04')], [soldRow('A', '2026-08-05')]).size === 0);

check('null last_seen_date is ignored, never treated as epoch',
  findRelistings([snap('A', '2026-08-09')], [soldRow('A', null)]).size === 0);

check('a live ref with no tombstone is never flagged',
  findRelistings([snap('LIVE', '2026-08-20')], [soldRow('A', '2026-08-05')]).size === 0);

// ── Part B: artifacts ───────────────────────────────────────────────────────
console.log('B. tombstones / ledger / manifest');

// Three tombstone states, exactly as production holds them today:
//   A — delisted 08-05, back 08-07, STILL on the market on the latest day
//   B — delisted 08-06, never seen again (clean absorption)
//   D — delisted 08-05, back 08-06, gone again by the latest day
const snapshots: SnapshotRow[] = [
  snap('A', '2026-08-05'), snap('B', '2026-08-05'), snap('C', '2026-08-05'), snap('D', '2026-08-05'),
  snap('B', '2026-08-06'), snap('C', '2026-08-06'), snap('D', '2026-08-06'),
  snap('A', '2026-08-07'), snap('C', '2026-08-07'),
];
const sold: SoldRow[] = [soldRow('A', '2026-08-05'), soldRow('B', '2026-08-06'), soldRow('D', '2026-08-05')];
const relisted = findRelistings(snapshots, sold);
const liveRefs = latestObservedRefs(snapshots);
const moves: ObservedMove[] = [];
const tombstones = buildTombstones(sold, relisted, liveRefs);
const ledger = buildLedger(snapshots, moves, sold, relisted);
const t = (id: string) => tombstones.find((x) => x.avn_id === id);

check('latestObservedRefs takes the max snapshot day only',
  liveRefs.size === 2 && liveRefs.has('A') && liveRefs.has('C'));

check('A (back and on the market) carries relisted_on and still_listed=true',
  t('A')?.relisted_on === '2026-08-07' && t('A')?.still_listed === true);
check('B (never seen again) carries null relisted_on and still_listed=false',
  t('B')?.relisted_on === null && t('B')?.still_listed === false);
check('D (returned, then left again) carries relisted_on AND still_listed=false',
  t('D')?.relisted_on === '2026-08-06' && t('D')?.still_listed === false);
check('every relisted unit KEEPS its tombstone row (disclosure, not deletion)',
  tombstones.length === 3);

check('ledger counts A\'s relisting on the day it reappeared',
  ledger.find((d) => d.date === '2026-08-07')?.relistings === 1);
check('ledger counts D\'s relisting on its own day',
  ledger.find((d) => d.date === '2026-08-06')?.relistings === 1);
check('ledger reports 0 relistings on days with none',
  ledger.find((d) => d.date === '2026-08-05')?.relistings === 0);
// A delisting is attributed to the first observation day on which the unit was
// actually MISSING, not to the last day it was seen (that day still counted it
// in listings_observed). A and D were last seen 08-05, so both land on 08-06;
// B was last seen 08-06 and lands on 08-07.
check('no delisting is charged to a day the unit was still present',
  ledger.find((d) => d.date === '2026-08-05')?.delistings === 0);
check('delistings land on the first day the units were observed missing',
  ledger.find((d) => d.date === '2026-08-06')?.delistings === 2
  && ledger.find((d) => d.date === '2026-08-07')?.delistings === 1);

const manifest = buildManifest({
  props: [{ id: 'x' } as unknown as Property],
  towns: [], ledger, moves, tombstones, snapshots,
  generatedAt: '2026-08-20T02:41:24.000Z',
});
check('manifest counts every relisting, including ones that left again',
  manifest.observation_ledger.relistings_recorded === 2);
check('only the unit actually back on the market counts as still_listed',
  manifest.observation_ledger.delistings_still_listed === 1);
check('absorption figure excludes ONLY the still-listed unit, not D',
  manifest.observation_ledger.delistings_currently_absent === 2);
check('gross delistings_recorded still equals the tombstone row count',
  manifest.observation_ledger.delistings_recorded === 3);
check('still_listed + currently_absent reconciles to gross',
  manifest.observation_ledger.delistings_still_listed
  + manifest.observation_ledger.delistings_currently_absent
  === manifest.observation_ledger.delistings_recorded);
check('schema_version bumped for the new columns', manifest.schema_version === 2);
check('the honesty block states both counts, not a conflated one',
  manifest.honesty.some((h) => h.includes('2 of the 3 delisted units') && h.includes('1 are on the market')));

const cleanManifest = buildManifest({
  props: [{ id: 'x' } as unknown as Property],
  towns: [], ledger: buildLedger(snapshots, moves, [], new Map()), moves,
  tombstones: buildTombstones([], new Map(), liveRefs), snapshots,
  generatedAt: '2026-08-20T02:41:24.000Z',
});
check('with no relistings the honesty block says so without inventing a number',
  cleanManifest.observation_ledger.relistings_recorded === 0
  && cleanManifest.honesty.some((h) => h.startsWith('No delisted unit has been observed listed again')));

// ── Part C: refuse-to-publish-nothing guards ────────────────────────────────
console.log('C. empty-input guards');

check('an empty snapshot set throws rather than publishing an empty ledger',
  (() => { try { buildLedger([], [], [], new Map()); return false; } catch { return true; } })());

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
