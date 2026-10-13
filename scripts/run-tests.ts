/**
 * scripts/run-tests.ts — run every `scripts/test-*.ts` suite and fail loudly.
 *
 * WHY THIS EXISTS (2026-10-13).
 *
 * This repo holds 25 hand-written test suites — roughly 660 assertions across
 * the capture pipeline, the scribe, move reconciliation, the corpus artifacts,
 * PLAB honesty, the EU stats adapters and the feed provenance instruments. ONE
 * of them ran in CI: `test-capture-backstop.ts`, invoked by
 * capture-backstop.yml. The other 24 ran only when someone remembered to type
 * their names.
 *
 * A test nobody runs is not a safety net, it is a comment that compiles. And it
 * ROTS, which is not a theoretical worry: on the morning this file was written,
 * three fixtures added to `test-feed-provenance.ts` an hour earlier stamped a
 * time-of-day on TODAY, so they would have passed only when the suite ran
 * between 07:00 and midnight UTC and failed silently every morning before that.
 * They were caught because the suite happened to be run twice in one hour. That
 * is luck, and luck is not a process.
 *
 * MEASURED BEFORE BUILDING, NOT ASSUMED. All 25 suites were run twice on
 * 2026-10-13: once normally, and once with NEXT_PUBLIC_SUPABASE_URL,
 * SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY, ANTHROPIC_API_KEY,
 * PERPLEXITY_API_KEY, STRIPE_SECRET_KEY, RESEND_API_KEY,
 * GOOGLE_SEARCH_CONSOLE_KEY, HF_TOKEN and FEED_URL all unset. 25/25 passed both
 * times. So they are genuinely hermetic, a CI job needs no secrets, and there
 * is no "it only works locally" caveat hiding in here.
 *
 * THE ANTI-PATTERN THIS FILE REFUSES TO COMMIT. Every serious failure in this
 * project has been a missing value silently becoming a zero, so a broken thing
 * looks like a working thing with nothing to report. A test runner is an easy
 * place to do it again: glob for suites, find none because a path changed,
 * report "0 failures", exit 0, green check on zero tests executed. So this
 * refuses to pass unless it actually ran a plausible number of suites, and it
 * counts what it RAN rather than trusting the glob.
 */

import { spawnSync } from 'child_process';
import { readdirSync } from 'fs';
import path from 'path';

/**
 * The floor. There were 25 suites on 2026-10-13; below 20 means a path, a
 * rename or a glob broke and the run is meaningless rather than clean.
 * Deliberately a floor and not an exact count: adding a suite must not fail
 * the build, and deleting most of them must.
 */
const MIN_SUITES = 20;

const dir = path.join(process.cwd(), 'scripts');
const suites = readdirSync(dir)
  .filter((f) => f.startsWith('test-') && f.endsWith('.ts'))
  .sort();

console.log(`Discovered ${suites.length} suite(s) in scripts/\n`);

if (suites.length < MIN_SUITES) {
  console.error(
    `REFUSING TO REPORT A RESULT — found only ${suites.length} suite(s), expected at least ${MIN_SUITES}.\n` +
      `This is a broken discovery step, not a clean run, and reporting 0 failures here is exactly the ` +
      `bug this repo keeps getting bitten by.`,
  );
  process.exit(1);
}

const failed: { suite: string; code: number; tail: string }[] = [];
let ran = 0;

for (const suite of suites) {
  const started = Date.now();
  const r = spawnSync('npx', ['tsx', path.join('scripts', suite)], {
    encoding: 'utf8',
    cwd: process.cwd(),
    // Suites are chatty; capture rather than stream, and print only what matters.
    maxBuffer: 64 * 1024 * 1024,
  });
  ran++;
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  // A suite that could not be SPAWNED has status null — that is a failure, and
  // `?? 0` here would turn "never ran" into "passed".
  const code = r.status === null ? -1 : r.status;
  const summary = out.match(/ALL PASS[^\n]*|FAILED[^\n]*/g)?.slice(-1)[0] ?? '(no summary line)';

  if (code === 0) {
    console.log(`  ✓ ${suite.padEnd(34)} ${secs}s  ${summary}`);
  } else {
    const tail = out.trimEnd().split('\n').slice(-25).join('\n');
    console.log(`  ✗ ${suite.padEnd(34)} ${secs}s  exit=${code}  ${summary}`);
    failed.push({ suite, code, tail });
  }
}

console.log('');
if (ran !== suites.length) {
  console.error(`REFUSING TO REPORT A RESULT — discovered ${suites.length} suite(s) but ran ${ran}.`);
  process.exit(1);
}

if (failed.length) {
  for (const f of failed) {
    console.log(`\n── ${f.suite} (exit ${f.code}) ───────────────────────────────`);
    console.log(f.tail);
  }
  console.log(`\nFAILED — ${suites.length - failed.length}/${suites.length} suites passed, ${failed.length} failed`);
  process.exit(1);
}

console.log(`ALL SUITES PASS — ${ran}/${suites.length}`);
