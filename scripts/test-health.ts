/**
 * Tests for the engine health verdict (src/lib/health.ts).
 *
 * The badge on /engine said "Operational" through an eight-day outage
 * (2026-10-14..21) because it was a literal. These pin the rule that replaced
 * it, hardest on the cases where it must NOT say operational.
 *
 * Run: npx tsx scripts/test-health.ts
 */

import { evaluateHealth, verdict, THRESHOLDS, type HealthFacts } from '../src/lib/health';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}

const NOW = new Date('2026-10-21T12:00:00Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

const healthy: HealthFacts = {
  feedGeneratedAt: hoursAgo(6),
  supabaseReachable: true,
  latestSnapshotDate: '2026-10-21',
  marketCommittedAt: hoursAgo(8),
  workflows: { 'feed-refresh.yml': 'success', 'capture-backstop.yml': 'success' },
  cronRuns24h: 40,
  cronErrors24h: 2,
};
const status = (f: Partial<HealthFacts>) => evaluateHealth({ ...healthy, ...f }, NOW).status;
const checkOf = (f: Partial<HealthFacts>, name: string) => evaluateHealth({ ...healthy, ...f }, NOW).checks.find((c) => c.name === name);

console.log('verdict');
check('all checks ok → operational', status({}) === 'operational', status({}));
check('the 2026-10-21 shape (feed 8d old, DB unreachable) → down',
  status({ feedGeneratedAt: hoursAgo(8 * 24), supabaseReachable: false, supabaseError: '521' }) === 'down');
check('DB unreachable alone → down', status({ supabaseReachable: false }) === 'down');
check('feed past the down threshold → down', status({ feedGeneratedAt: hoursAgo(THRESHOLDS.feedDownH + 1) }) === 'down');
check('feed one missed night → degraded', status({ feedGeneratedAt: hoursAgo(THRESHOLDS.feedDegradedH + 1) }) === 'degraded');
check('feed just inside the window → operational', status({ feedGeneratedAt: hoursAgo(THRESHOLDS.feedDegradedH - 1) }) === 'operational');
check('stale snapshot (3 days) → down', status({ latestSnapshotDate: '2026-10-18' }) === 'down');
check("yesterday's snapshot at noon → degraded (today's capture is missing)", status({ latestSnapshotDate: '2026-10-20' }) === 'degraded');
check("yesterday's snapshot at 05:00, before the nightly lands → operational",
  evaluateHealth({ ...healthy, latestSnapshotDate: '2026-10-20', feedGeneratedAt: '2026-10-20T03:00:00Z' }, new Date('2026-10-21T05:00:00Z')).status === 'operational');
check('a failed workflow degrades but never downs', status({ workflows: { 'feed-refresh.yml': 'failure' } }) === 'degraded');
check('stale open dataset degrades (non-critical)', status({ marketCommittedAt: hoursAgo(8 * 24) }) === 'degraded');
check('cron error storm degrades', status({ cronRuns24h: 40, cronErrors24h: 30 }) === 'degraded');
check('too few cron runs to trust degrades', status({ cronRuns24h: 1, cronErrors24h: 0 }) === 'degraded');

console.log('unknown is never ok');
check('missing feed stamp → not operational', status({ feedGeneratedAt: null }) !== 'operational');
check('missing feed stamp → unknown, not down', checkOf({ feedGeneratedAt: null }, 'feed')?.status === 'unknown');
check('DB not configured → not operational', status({ supabaseReachable: null }) !== 'operational');
check('unknown workflow conclusion → not operational', status({ workflows: { 'feed-refresh.yml': null } }) !== 'operational');
check('garbage timestamp → unknown', checkOf({ feedGeneratedAt: 'not-a-date' }, 'feed')?.status === 'unknown');
check('empty facts → degraded, not operational', evaluateHealth({}, NOW).status === 'degraded', evaluateHealth({}, NOW).status);

console.log('shape');
{
  const r = evaluateHealth({ ...healthy, supabaseReachable: false, supabaseError: 'x'.repeat(500) }, NOW);
  const db = r.checks.find((c) => c.name === 'supabase');
  check('error text is bounded', (db?.detail.length ?? 0) < 200, String(db?.detail.length));
  check('no snapshot check when DB is unreachable', !r.checks.some((c) => c.name === 'price_snapshots'));
  check('checked_at is the evaluation instant', r.checked_at === NOW.toISOString());
}
check('verdict([]) → operational (nothing to fail)', verdict([]) === 'operational');
check('non-critical down does not down the engine',
  verdict([{ name: 'x', status: 'down', critical: false, detail: '' }]) === 'degraded');

console.log(failed ? `\nFAILED (${failed} of ${passed + failed}):` : `\nALL PASS — ${passed} passed, 0 failed`);
process.exit(failed ? 1 : 0);
