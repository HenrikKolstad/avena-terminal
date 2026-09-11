/**
 * scripts/test-agent-status.ts
 *
 * Unit tests for src/lib/agent-status.ts — the derivation behind the two
 * public agent-status endpoints.
 *
 * These endpoints published `status: "active"` and a false `cadence` string
 * while both agents had been failing for weeks (audited 2026-09-11). The
 * cases below are written so that reintroducing any of those defects turns
 * a named test red:
 *
 *   - a hardcoded 'active'            -> the FAILING / STALE / UNKNOWN cases
 *   - a literal cadence string        -> the CADENCE cases, which assert the
 *                                        real vercel.json expressions
 *   - `catch {}` returning 0          -> the MEASURED and DIFFERENCE cases
 *   - a cron parser that guesses      -> the REFUSES cases
 *
 * Also asserts against the LIVE vercel.json, so that changing a schedule
 * without the published cadence following it fails the build.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ageInDays,
  collectErrors,
  describeCadence,
  deriveAgentHealth,
  difference,
  measure,
  parseCronExpression,
  type AgentRunRow,
  type CronEntry,
} from '../src/lib/agent-status';

const ROOT = join(__dirname, '..');
let passed = 0;
const failures: string[] = [];

function ok(name: string, cond: boolean, detail?: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function eq(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  ok(name, a === e, a === e ? undefined : `got ${a}, expected ${e}`);
}

function throws(name: string, fn: () => unknown) {
  try {
    fn();
    ok(name, false, 'did not throw');
  } catch {
    ok(name, true);
  }
}

const NOW = new Date('2026-09-11T06:00:00.000Z');

/* ------------------------------------------------------------------ */
console.log('A. parseCronExpression — REFUSES what it cannot describe');
/* ------------------------------------------------------------------ */

eq('single daily fire', parseCronExpression('0 2 * * *'), {
  minutes: [0],
  hour: 2,
  daysOfWeek: null,
});
eq('three attempts, Mon/Wed/Fri', parseCronExpression('0,10,20 3 * * 1,3,5'), {
  minutes: [0, 10, 20],
  hour: 3,
  daysOfWeek: [1, 3, 5],
});
throws('REFUSES a step expression rather than guessing', () => parseCronExpression('*/5 3 * * *'));
throws('REFUSES a range expression rather than guessing', () => parseCronExpression('0 3 * * 1-5'));
throws('REFUSES a multi-hour field', () => parseCronExpression('0 3,15 * * *'));
throws('REFUSES a day-of-month restriction', () => parseCronExpression('0 3 1 * *'));
throws('REFUSES a 6-field expression', () => parseCronExpression('0 0 3 * * *'));
throws('REFUSES an out-of-range day-of-week', () => parseCronExpression('0 3 * * 9'));

/* ------------------------------------------------------------------ */
console.log('B. describeCadence — derived from the deployed schedule');
/* ------------------------------------------------------------------ */

const atlasCrons: CronEntry[] = [{ path: '/api/cron/citation-agent', schedule: '0,10,20 3 * * 1,3,5' }];
const atlas = describeCadence('/api/cron/citation-agent', atlasCrons)!;
eq('atlas cadence is Mon/Wed/Fri, NOT daily', atlas.human, 'Mon/Wed/Fri 03:00, 03:10, 03:20 UTC (3 attempts)');
ok(
  'atlas cadence does not claim "daily"',
  !atlas.human.toLowerCase().includes('daily'),
  atlas.human
);
eq('atlas raw expression is published verbatim', atlas.schedules, ['0,10,20 3 * * 1,3,5']);
// Fri 03:20 -> Mon 03:00 is the longest gap in the week: 71h40m.
eq('atlas longest expected gap is the Fri->Mon weekend', atlas.maxExpectedGapMs, (71 * 60 + 40) * 60_000);

const promCrons: CronEntry[] = [
  { path: '/api/cron/prometheus', schedule: '0 2 * * *' },
  { path: '/api/cron/prometheus', schedule: '0 8 * * *' },
  { path: '/api/cron/prometheus', schedule: '0 14 * * *' },
  { path: '/api/cron/prometheus', schedule: '0 20 * * *' },
];
const prom = describeCadence('/api/cron/prometheus', promCrons)!;
eq('prometheus cadence names all four fires', prom.human, 'daily 02:00 UTC; daily 08:00 UTC; daily 14:00 UTC; daily 20:00 UTC');
eq('prometheus longest expected gap is 6h', prom.maxExpectedGapMs, 6 * 3_600_000);
eq('an unscheduled path returns null, not an invented cadence', describeCadence('/api/cron/nope', promCrons), null);

/* ------------------------------------------------------------------ */
console.log('C. deriveAgentHealth — a failed read is never "active"');
/* ------------------------------------------------------------------ */

const failingRows: AgentRunRow[] = [
  { status: 'error', started_at: '2026-09-11T03:20:00Z', error: 'Perplexity HTTP 401: quota exceeded' },
  { status: 'error', started_at: '2026-09-11T03:10:00Z', error: 'Perplexity HTTP 401: quota exceeded' },
  { status: 'error', started_at: '2026-09-11T03:00:00Z', error: 'Perplexity HTTP 401: quota exceeded' },
  { status: 'success', started_at: '2026-08-28T03:00:00Z', error: null },
];

const failing = deriveAgentHealth({ rows: failingRows, cadence: atlas, now: NOW });
eq('THE HEADLINE CASE: an agent failing every run is not "active"', failing.state, 'failing');
eq('counts consecutive failures since the last success', failing.consecutive_failures, 3);
eq('publishes the actual upstream error', failing.last_error, 'Perplexity HTTP 401: quota exceeded');
eq('still reports when it last succeeded', failing.last_success_at, '2026-08-28T03:00:00Z');

const unknown = deriveAgentHealth({
  rows: null,
  readError: 'connection refused',
  cadence: atlas,
  now: NOW,
});
eq('a FAILED READ is "unknown", never "active"', unknown.state, 'unknown');
ok('the unknown verdict names the read failure', unknown.reason.includes('connection refused'), unknown.reason);
eq('an unknown verdict does not invent a failure count', unknown.consecutive_failures, null);

const never = deriveAgentHealth({ rows: [], cadence: atlas, now: NOW });
eq('"read fine, no runs" is distinct from "could not read"', never.state, 'never_run');

const stale = deriveAgentHealth({
  rows: [{ status: 'success', started_at: '2026-09-01T03:00:00Z', error: null }],
  cadence: atlas,
  now: NOW,
});
eq('a successful-but-long-ago agent is "stale", not "active"', stale.state, 'stale');

const healthy = deriveAgentHealth({
  rows: [{ status: 'success', started_at: '2026-09-11T03:00:00Z', error: null }],
  cadence: atlas,
  now: NOW,
});
eq('a genuinely healthy agent DOES report active', healthy.state, 'active');
eq('a healthy agent reports zero consecutive failures', healthy.consecutive_failures, 0);

// The false-alarm guard: one missed fire must NOT read as stale, or this
// endpoint becomes noise and gets ignored.
const oneMissed = deriveAgentHealth({
  rows: [{ status: 'success', started_at: '2026-09-09T03:20:00Z', error: null }],
  cadence: atlas,
  now: NOW,
});
eq('ONE missed fire over a weekend is still active, not a false alarm', oneMissed.state, 'active');

const noSchedule = deriveAgentHealth({
  rows: [{ status: 'success', started_at: '2026-09-11T03:00:00Z', error: null }],
  cadence: null,
  now: NOW,
});
eq('with no schedule, "on time" is undefined rather than assumed', noSchedule.state, 'unknown');

/* ------------------------------------------------------------------ */
console.log('D. measure / difference — a failed read is null, never 0');
/* ------------------------------------------------------------------ */

(async () => {
  const good = await measure('rows', async () => 7);
  eq('a successful read carries its value', good, { value: 7, error: null });

  const bad = await measure('rows', async () => {
    throw new Error('PostgREST 400');
  });
  eq('a FAILED read is null, NOT 0', bad.value, null);
  ok('the failed read is labelled', bad.error === 'rows: PostgREST 400', bad.error ?? 'null');

  eq('difference of two known values', difference({ value: 5, error: null }, { value: 3, error: null }), 2);
  eq(
    'THE FABRICATED-DELTA CASE: unknown minus known is null, not -3',
    difference({ value: null, error: 'x' }, { value: 3, error: null }),
    null
  );
  eq(
    'known minus unknown is null, not 5',
    difference({ value: 5, error: null }, { value: null, error: 'x' }),
    null
  );

  eq('collectErrors keeps only real failures', collectErrors(good, bad), ['rows: PostgREST 400']);

  eq('ageInDays measures a real gap', ageInDays('2026-08-28T03:00:00Z', NOW), 14);
  eq('ageInDays of nothing is null, not 0', ageInDays(null, NOW), null);

  /* ---------------------------------------------------------------- */
  console.log('E. LIVE vercel.json — the published cadence must track the deployment');
  /* ---------------------------------------------------------------- */

  const vercel = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8')) as { crons: CronEntry[] };

  // Every scheduled cron must be describable. A schedule this parser cannot
  // read would otherwise surface as a thrown 500 on a live status route.
  let undescribable = 0;
  for (const c of vercel.crons) {
    try {
      parseCronExpression(c.schedule);
    } catch (e) {
      undescribable++;
      console.log(`      ! ${c.path} ${c.schedule}: ${(e as Error).message}`);
    }
  }
  eq('every schedule in vercel.json is describable by this parser', undescribable, 0);

  const liveAtlas = describeCadence('/api/cron/citation-agent', vercel.crons);
  ok('citation-agent is still scheduled in vercel.json', liveAtlas !== null);
  ok(
    'the LIVE citation cadence is not the false "daily" string this fixed',
    liveAtlas !== null && !liveAtlas.human.toLowerCase().includes('daily'),
    liveAtlas?.human
  );

  const liveProm = describeCadence('/api/cron/prometheus', vercel.crons);
  ok('prometheus is still scheduled in vercel.json', liveProm !== null);
  ok(
    'the LIVE prometheus cadence names more than one fire a day',
    liveProm !== null && liveProm.schedules.length > 1,
    `${liveProm?.schedules.length} schedules`
  );

  /* ---------------------------------------------------------------- */
  console.log('F. the routes must not reintroduce a literal status');
  /* ---------------------------------------------------------------- */

  // Strip comments before matching. Both routes DOCUMENT the defect they
  // fixed — quoting the old `status: 'active'` line verbatim — and a guard
  // that reads prose would both false-alarm on that and, worse, go green if
  // someone deleted the explanation. It must look at code only.
  const stripComments = (s: string) =>
    s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  for (const rel of [
    'src/app/api/citation-agent/status/route.ts',
    'src/app/api/prometheus/status/route.ts',
  ]) {
    const src = stripComments(readFileSync(join(ROOT, rel), 'utf8'));
    // Match a published literal, e.g. `status: 'active'` — but not the
    // derived `status: health.state`.
    ok(
      `${rel} does not publish a literal status`,
      !/status:\s*['"]active['"]/.test(src),
      'found a hardcoded status: "active"'
    );
    ok(
      `${rel} does not publish a literal cadence`,
      !/cadence:\s*['"]daily/.test(src),
      'found a hardcoded cadence string'
    );
    ok(
      `${rel} has no silently-ignoring catch`,
      !/catch\s*\{\s*\/\*\s*(ignore|silent)/.test(src),
      'found a silent catch'
    );
  }

  console.log('');
  if (failures.length) {
    console.log(`FAILED (${failures.length} of ${passed + failures.length}):`);
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
  console.log(`ALL PASS (${passed} assertions)`);
})();
