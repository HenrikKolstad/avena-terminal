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
import { boundSummary, classifyInvocation, deriveCronStatus, isPlatformRun } from '../src/lib/cron-log';

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

// A 200 carrying the run's own failures is not a clean run. Every case below
// was observed in cron_logs on 2026-08-22, logged as 'success'.
ok('a 200 with a populated errors[] is an error',
  deriveCronStatus(res(200), { agent: 'Nostradamus', errors: ['claude_parse: 400 credit balance too low'] }).status === 'error');
ok('an EMPTY errors[] is still a success',
  deriveCronStatus(res(200), { errors: [] }).status === 'success');
ok('a null errors field is still a success',
  deriveCronStatus(res(200), { errors: null }).status === 'success');
ok('the error text names how many failed and quotes the first',
  String(deriveCronStatus(res(200), { errors: ['a', 'b', 'c'] }).error).includes('3 error(s)')
  && String(deriveCronStatus(res(200), { errors: ['a', 'b', 'c'] }).error).includes('a'));
ok('a PostgrestError inside errors[] is described, not "[object Object]"',
  String(deriveCronStatus(res(200), { errors: [{ message: 'FK violation', code: '23503' }] }).error).includes('FK violation'));
ok('a 200 with a non-empty error string is an error',
  deriveCronStatus(res(200), { error: 'generate-pulse failed: HTTP 500' }).status === 'error');

// ok:false — the run declaring its own failure. Both bodies below are real
// atlas rows, and the whole point is that they must NOT be treated alike.
const atlasFailed = {
  ok: false,
  status: 'measurement_failed',
  note: 'No rows written — a failed lookup is not a zero citation.',
  bank_size: 74,
  lookups_failed: 74,
  lookups_measured: 0,
  first_error: 'Perplexity HTTP 401: You exceeded your current quota',
};
const atlasResumable = {
  ok: false,
  status: 'incomplete_resumable',
  bank_size: 74,
  remaining: 31,
  first_error: 'not queried in this invocation',
};

ok('a 200 with ok:false and a failure status is an error (atlas, 2026-08-31)',
  deriveCronStatus(res(200), atlasFailed).status === 'error');
ok('the ok:false error names the self-declared status and the first error',
  String(deriveCronStatus(res(200), atlasFailed).error).includes('measurement_failed')
  && String(deriveCronStatus(res(200), atlasFailed).error).includes('Perplexity HTTP 401'));
ok('incomplete_resumable is NOT an error — atlas hands work to its next run',
  deriveCronStatus(res(200), atlasResumable).status === 'success');
ok('a completed atlas run is a success',
  deriveCronStatus(res(200), { ok: true, status: 'complete' }).status === 'success');
ok('already_complete is a success',
  deriveCronStatus(res(200), { ok: true, status: 'already_complete' }).status === 'success');
ok('ok:false with an UNKNOWN status fails loud rather than passing quietly',
  deriveCronStatus(res(200), { ok: false, status: 'something_new' }).status === 'error');
ok('ok:false with no status at all is still an error',
  deriveCronStatus(res(200), { ok: false }).status === 'error');
ok('ok:false with no reason says so instead of inventing one',
  String(deriveCronStatus(res(200), { ok: false }).error).includes('no reason given'));
ok('skipped still beats ok:false — a dormant run is not a failed one',
  deriveCronStatus(res(200), { ok: false, skipped: true }).status === 'skipped');
ok('a 200 with an empty error string stays a success',
  deriveCronStatus(res(200), { error: '' }).status === 'success');
ok('skipped still wins over a populated errors[]',
  deriveCronStatus(res(200), { skipped: true, errors: ['x'] }).status === 'skipped');
ok('dvf-ingest’s real 08-23 shape is now an error',
  deriveCronStatus(res(200), { status: 'success', transactions_inserted: 2569, errors: ['chunk 3: FK violation'] }).status === 'error');

// ── Part 2b: who invoked the run ─────────────────────────────────────────────
//
// The rejected-platform-run branch is only as good as this test. It was
// `x-vercel-cron === '1'` alone, and /api/detect-events’ 07:30 scheduled run
// on 2026-08-22 was rejected and left NO row, so that test did not match what
// the scheduler sends.

console.log('\nInvocation classification\n');

const req = (h: Record<string, string>) =>
  ({ headers: { get: (k: string) => h[k.toLowerCase()] ?? null } }) as unknown as Parameters<typeof classifyInvocation>[0];

ok('the x-vercel-cron header is recognised',
  classifyInvocation(req({ 'x-vercel-cron': '1' })) === 'vercel-cron-header');
ok('a vercel-cron user-agent is recognised',
  classifyInvocation(req({ 'user-agent': 'vercel-cron/1.0' })) === 'vercel-cron-ua');
ok('the header wins when both are present',
  classifyInvocation(req({ 'x-vercel-cron': '1', 'user-agent': 'vercel-cron/1.0' })) === 'vercel-cron-header');
ok('an ordinary browser request is direct',
  classifyInvocation(req({ 'user-agent': 'Mozilla/5.0' })) === 'direct');
ok('a request with no headers at all is direct',
  classifyInvocation(req({})) === 'direct');
ok('x-vercel-cron with any other value is not a platform run',
  classifyInvocation(req({ 'x-vercel-cron': '0' })) === 'direct');
ok('both recognised signals count as a platform run',
  isPlatformRun('vercel-cron-header') && isPlatformRun('vercel-cron-ua'));
ok('a direct call is NOT a platform run, so noise cannot fill cron_logs',
  !isPlatformRun('direct'));

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
