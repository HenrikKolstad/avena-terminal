/**
 * scripts/test-health.ts — pins the grading behind /api/health and the
 * /engine status badge (src/lib/health.ts).
 *
 * WHY: from 2026-10-14 to 10-21 every nightly capture failed and the database
 * was paused, while /engine rendered a hardcoded green "Operational". The
 * cases asserted hardest are the ones that must NOT read as healthy: a stale
 * feed, a missing capture, an unreachable database, and a read that failed.
 * Hermetic — pure functions only, no credentials, no network.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  gradeHealth, gradeFeed, gradeCapture, gradeDatabase, gradeDataset, gradeWorkflows,
  type HealthInputs,
} from '../src/lib/health';

let pass = 0;
let fail = 0;
function check(label: string, actual: unknown, expected: unknown) {
  if (actual === expected) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label} — expected ${String(expected)}, got ${String(actual)}`); }
}

const NOW = new Date('2026-10-22T09:00:00Z');
const healthy: HealthInputs = {
  now: NOW,
  feedGeneratedAt: '2026-10-22T06:40:00Z',
  dbReachable: true,
  latestSnapshotDate: '2026-10-22',
  datasetLatestDate: '2026-10-22',
  mirrorLatestDate: '2026-10-21',
  workflows: { 'feed-refresh.yml': 'success', 'capture-backstop.yml': 'success', 'tests.yml': 'success' },
};

console.log('\nOverall verdict');
check('everything fresh → operational', gradeHealth(healthy).status, 'operational');
check('operational label', gradeHealth(healthy).label, 'Operational');
check('database unreachable → down', gradeHealth({ ...healthy, dbReachable: false, latestSnapshotDate: null }).status, 'down');
check('no capture for 8 days (the 2026-10-14 outage) → down',
  gradeHealth({ ...healthy, latestSnapshotDate: '2026-10-13', feedGeneratedAt: '2026-10-13T06:00:00Z' }).status, 'down');
check('a failed feed workflow alone → degraded, not operational',
  gradeHealth({ ...healthy, workflows: { ...healthy.workflows!, 'feed-refresh.yml': 'failure' } }).status, 'degraded');
check('a stale open dataset alone → degraded',
  gradeHealth({ ...healthy, datasetLatestDate: '2026-10-13' }).status, 'degraded');
check('GitHub unreadable is advisory — stays operational',
  gradeHealth({ ...healthy, workflows: null }).status, 'operational');
check('no database client (unknown) is NOT operational',
  gradeHealth({ ...healthy, dbReachable: null, latestSnapshotDate: null }).status, 'degraded');
check('missing feed-meta (unknown) is NOT operational',
  gradeHealth({ ...healthy, feedGeneratedAt: null }).status, 'degraded');

console.log('\nFeed age');
check('8h old → ok', gradeFeed(NOW, '2026-10-22T01:00:00Z').status, 'ok');
check('29h old → ok (normal morning before the nightly lands)', gradeFeed(NOW, '2026-10-21T04:00:00Z').status, 'ok');
check('31h old → degraded', gradeFeed(NOW, '2026-10-21T02:00:00Z').status, 'degraded');
check('55h old → down', gradeFeed(NOW, '2026-10-20T02:00:00Z').status, 'down');
check('garbage timestamp → unknown, never ok', gradeFeed(NOW, 'yesterday').status, 'unknown');

console.log('\nDaily capture');
check("today's capture → ok", gradeCapture(NOW, '2026-10-22', true).status, 'ok');
check("yesterday's, before noon UTC → ok (nightly still due)", gradeCapture(NOW, '2026-10-21', true).status, 'ok');
check("yesterday's, after noon UTC → degraded",
  gradeCapture(new Date('2026-10-22T13:00:00Z'), '2026-10-21', true).status, 'degraded');
check('two days behind → down', gradeCapture(NOW, '2026-10-20', true).status, 'down');
check('empty table on a reachable db → down', gradeCapture(NOW, null, true).status, 'down');
check('unreadable → unknown, not down and not ok', gradeCapture(NOW, null, false).status, 'unknown');

console.log('\nDatabase, dataset, workflows');
check('reachable → ok', gradeDatabase(true).status, 'ok');
check('unreachable → down', gradeDatabase(false, 'HTTP 521').status, 'down');
check('the error text is carried', gradeDatabase(false, 'HTTP 521').detail.includes('521'), true);
check('dataset graded on the OLDER surface', gradeDataset(NOW, '2026-10-22', '2026-10-13').status, 'degraded');
check('dataset 2 days behind → ok', gradeDataset(NOW, '2026-10-20', '2026-10-20').status, 'ok');
check('dataset unreadable → unknown', gradeDataset(NOW, null, null).status, 'unknown');
check('all workflows green → ok', gradeWorkflows(healthy.workflows).status, 'ok');
check('a cancelled run is not green', gradeWorkflows({ 'feed-refresh.yml': 'cancelled' }).status, 'degraded');
check('partially unreadable but rest green → ok', gradeWorkflows({ 'feed-refresh.yml': 'success', 'tests.yml': null }).status, 'ok');

console.log('\nThe badge is wired to the verdict, not a literal');
const client = readFileSync(join(__dirname, '..', 'src', 'app', 'engine', 'EngineClient.tsx'), 'utf8');
check('no hardcoded "/> Operational" badge', /\/>\s*Operational\s*</.test(client), false);
check('badge renders the health label', client.includes('{hLabel}'), true);
check('fallback movements are labelled as examples', client.includes("'example'"), true);
check('no "Since Apr 2026" fallback', client.includes('Since Apr 2026'), false);

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILED'} — ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
