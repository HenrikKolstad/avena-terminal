/**
 * scripts/test-cron-coverage.ts
 *
 * Asserts that every scheduled cron in vercel.json is OBSERVABLE:
 *   1. its route file exists;
 *   2. that route writes to `cron_logs` (via withCronLog or startCronLog);
 *   3. the cron_path string it logs matches vercel.json exactly.
 *
 * WHY (3) MATTERS AS MUCH AS (2)
 * A route that logs under a drifted path is invisible to every query that
 * looks for it by name — the same blindness, wearing a disguise. "No rows
 * for /api/cron/x" would again be evidence of nothing.
 *
 * This test exists because 24 of 64 crons wrote nothing at all, and seven of
 * them had been dead for up to four months with no signal whatsoever. The
 * fix for that is not only wiring them up once; it is making it impossible
 * to add a 65th blind cron without this failing.
 *
 * Also runs the pure-function unit tests for the wrapper's status
 * derivation and summary bounding, which are the parts that decide whether
 * a failure is recorded as a failure.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { boundSummary, deriveCronStatus } from '../src/lib/cron-log';

const ROOT = join(__dirname, '..');
let passed = 0;
const failures: string[] = [];

function ok(label: string, cond: boolean, detail = '') {
  if (cond) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

// ── Part 1: every scheduled cron is observable ───────────────────────────────

interface CronEntry { path: string; schedule: string }

const vercel = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8')) as { crons?: CronEntry[] };
const crons = vercel.crons ?? [];

console.log(`\nCron observability — ${crons.length} scheduled entries in vercel.json\n`);

if (crons.length === 0) {
  failures.push('vercel.json declares no crons — the parser or the file is wrong');
}

/** vercel.json paths may carry a query string (e.g. /api/digest?generate=true). */
function routeFileFor(cronPath: string): string | null {
  const clean = cronPath.split('?')[0];
  for (const ext of ['ts', 'tsx']) {
    const p = join(ROOT, 'src', 'app', `${clean}/route.${ext}`);
    if (existsSync(p)) return p;
  }
  return null;
}

const seen = new Set<string>();
const blind: string[] = [];
const mismatched: string[] = [];

for (const c of crons) {
  if (seen.has(c.path)) continue; // same route, several schedules
  seen.add(c.path);

  const file = routeFileFor(c.path);
  if (!file) {
    failures.push(`${c.path} — no route file found`);
    console.log(`  ✗ ${c.path} — no route file`);
    continue;
  }

  const src = readFileSync(file, 'utf8');
  const logs = src.includes('withCronLog(') || src.includes('startCronLog(');
  if (!logs) {
    blind.push(c.path);
    console.log(`  ✗ ${c.path} — writes nothing to cron_logs`);
    continue;
  }

  // The logged path must be the vercel.json path, verbatim.
  const clean = c.path.split('?')[0];
  const declares = src.includes(`'${c.path}'`) || src.includes(`'${clean}'`)
    || src.includes(`"${c.path}"`) || src.includes(`"${clean}"`);
  if (!declares) {
    mismatched.push(c.path);
    console.log(`  ✗ ${c.path} — logs, but never names this path (cron_path drift)`);
    continue;
  }

  passed++;
  console.log(`  ✓ ${c.path}`);
}

if (blind.length) failures.push(`${blind.length} cron(s) write nothing to cron_logs: ${blind.join(', ')}`);
if (mismatched.length) failures.push(`${mismatched.length} cron(s) log under a drifted cron_path: ${mismatched.join(', ')}`);

// ── Part 2: the wrapper's decision logic ─────────────────────────────────────

console.log('\nStatus derivation\n');

const res = (status: number) => new Response('{}', { status });

ok('a 200 is a success', deriveCronStatus(res(200), { ok: true }).status === 'success');
ok('a 500 is an error, not a success', deriveCronStatus(res(500), { error: 'boom' }).status === 'error');
ok('a 502 is an error', deriveCronStatus(res(502), {}).status === 'error');
ok('an error body carries its message forward',
  deriveCronStatus(res(500), { error: 'stress monitor endpoint failed' }).error === 'stress monitor endpoint failed');
ok('a non-2xx with no message still names the status',
  deriveCronStatus(res(503), {}).error === 'HTTP 503');
ok('an explicit skipped marker beats a 200',
  deriveCronStatus(res(200), { skipped: true }).status === 'skipped');
ok('status:"skipped" in the body is honoured',
  deriveCronStatus(res(200), { status: 'skipped' }).status === 'skipped');
ok('a 200 is NOT downgraded by an unrelated falsy field',
  deriveCronStatus(res(200), { ok: true, posted: false }).status === 'success');
ok('a skipped run records no error', deriveCronStatus(res(200), { skipped: true }).error === null);

// ── Part 3: summary bounding ─────────────────────────────────────────────────

console.log('\nSummary bounding\n');

const longStr = 'x'.repeat(1200);
const bounded = boundSummary({ note: longStr }) as Record<string, string>;
ok('a long string is truncated', bounded.note.length < longStr.length);
ok('truncation is declared, not silent', bounded.note.includes('+700 chars'));

const bigArr = boundSummary({ rows: Array.from({ length: 100 }, (_, i) => i) }) as Record<string, unknown[]>;
ok('a long array is truncated', bigArr.rows.length === 41);
ok('array truncation is declared', String(bigArr.rows[40]).includes('+60 more'));

ok('small values pass through untouched',
  JSON.stringify(boundSummary({ feed: 2034, ok: true, prior: null })) === '{"feed":2034,"ok":true,"prior":null}');
ok('nesting is bounded rather than infinite',
  JSON.stringify(boundSummary({ a: { b: { c: { d: { e: { f: 1 } } } } } })).includes('depth limit'));

const cyclicSafe = boundSummary([{ a: 1 }, { b: 2 }]);
ok('arrays of objects survive', JSON.stringify(cyclicSafe) === '[{"a":1},{"b":2}]');

// ── Report ──────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
if (failures.length) {
  console.log(`FAILED — ${passed} passed, ${failures.length} failed\n`);
  for (const f of failures) console.log(`  • ${f}`);
  process.exit(1);
}
console.log(`ALL PASS — ${passed} passed, 0 failed`);
