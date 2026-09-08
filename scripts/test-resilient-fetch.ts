/**
 * Tests for src/lib/resilient-fetch.ts.
 *
 * The headline cases are the failure cases. This helper exists because on
 * 2026-09-07 a single transient network error zeroed a whole source for the
 * day and reported it as the four words "INE 25171: fetch failed" — so the
 * two things that must be true are (a) a second attempt actually happens, and
 * (b) whatever finally goes wrong is NAMED. A helper only ever observed on the
 * happy path is not a guard (lesson 2026-09-02).
 *
 * The budget cases matter just as much and are easy to skip: retrying without
 * a deadline would let one hung upstream consume the whole 300s function and
 * silently kill the five adapters behind it. Every deadline test below is
 * really a test that the retry cannot become an outage.
 *
 * Run: npx tsx scripts/test-resilient-fetch.ts
 */

import {
  fetchWithRetry,
  describeFetchError,
  isRetryableStatus,
  shareBudget,
} from '../src/lib/resilient-fetch';

let passed = 0;
let failed = 0;

function ok(name: string, cond: boolean) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}`);
  }
}

/** A fetch stand-in driven by a scripted list of outcomes. */
function scriptedFetch(outcomes: Array<{ status?: number; throws?: unknown }>) {
  const calls: string[] = [];
  const impl = (async (url: string) => {
    const i = calls.length;
    calls.push(String(url));
    const o = outcomes[Math.min(i, outcomes.length - 1)];
    if (o.throws !== undefined) throw o.throws;
    return new Response('{}', { status: o.status ?? 200 });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

/** undici's real shape: a bare "fetch failed" with the reason in `cause`. */
function undiciError(code: string, message: string) {
  const err = new TypeError('fetch failed');
  (err as unknown as { cause: unknown }).cause = { code, message };
  return err;
}

/**
 * Run a call that is EXPECTED to succeed, converting a throw into a named
 * failure instead of an uncaught crash.
 *
 * Without this, deleting the retry aborts the whole suite at the first retry
 * test with a stack trace: red, but silent about which behaviour broke and
 * hiding every test after it. A suite that cannot say what failed has the same
 * defect as the "fetch failed" message this helper exists to fix.
 */
async function expectResolves<T>(name: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    failed++;
    console.log(`  ✗ ${name} — threw instead of resolving: ${(e as Error).message}`);
    return null;
  }
}

const noSleep = async () => {};

async function main() {
  console.log('\nresilient-fetch\n');

  // ── describeFetchError: the whole point is that "fetch failed" is useless ──
  {
    const msg = describeFetchError(undiciError('ECONNRESET', 'read ECONNRESET'));
    ok('unwraps undici cause to name ECONNRESET', msg.includes('ECONNRESET'));
    ok('keeps the outer message too', msg.includes('fetch failed'));
    ok(
      'the bare message alone is NOT the whole description',
      msg !== 'fetch failed' && msg.length > 'fetch failed'.length,
    );
  }
  {
    const msg = describeFetchError(undiciError('ENOTFOUND', 'getaddrinfo ENOTFOUND servicios.ine.es'));
    ok('names a DNS failure', msg.includes('ENOTFOUND'));
  }
  {
    // A nested cause chain — undici sometimes wraps twice.
    const inner = { code: 'ETIMEDOUT', message: 'connect ETIMEDOUT' };
    const mid = { message: 'socket failure', cause: inner };
    const err = new TypeError('fetch failed');
    (err as unknown as { cause: unknown }).cause = mid;
    const msg = describeFetchError(err);
    ok('walks a nested cause chain to the root code', msg.includes('ETIMEDOUT'));
  }
  {
    const abort = Object.assign(new Error('The operation was aborted'), { name: 'TimeoutError' });
    const msg = describeFetchError(abort, 15_000);
    ok('a timeout is reported as a timeout, not a network fault', msg.includes('timed out'));
    ok('and it names the budget it exceeded', msg.includes('15000'));
  }

  // ── isRetryableStatus: narrow on purpose ──────────────────────────────────
  {
    ok('500 is retryable', isRetryableStatus(500));
    ok('502 is retryable', isRetryableStatus(502));
    ok('503 is retryable', isRetryableStatus(503));
    ok('429 is retryable', isRetryableStatus(429));
    ok('408 is retryable', isRetryableStatus(408));
    ok('404 is NOT retryable (BIS has 404d for weeks; retrying spends budget)', !isRetryableStatus(404));
    ok('400 is NOT retryable', !isRetryableStatus(400));
    ok('401 is NOT retryable', !isRetryableStatus(401));
    ok('403 is NOT retryable', !isRetryableStatus(403));
    ok('200 is NOT retryable', !isRetryableStatus(200));
  }

  // ── The case that caused all this: one blip, then success ─────────────────
  {
    const { impl, calls } = scriptedFetch([
      { throws: undiciError('ECONNRESET', 'read ECONNRESET') },
      { status: 200 },
    ]);
    const res = await expectResolves('a transient network error is retried, not fatal', () =>
      fetchWithRetry('https://x.test/a', { label: 'INE 25171', fetchImpl: impl, sleepImpl: noSleep }));
    ok('a transient network error is retried, not fatal', res?.status === 200);
    ok('  and it took exactly 2 attempts', calls.length === 2);
  }

  // ── Total failure must NAME the reason, every attempt, and the elapsed ─────
  {
    const { impl, calls } = scriptedFetch([{ throws: undiciError('ECONNRESET', 'read ECONNRESET') }]);
    let msg = '';
    try {
      await fetchWithRetry('https://x.test/a', {
        label: 'INE 25171', fetchImpl: impl, sleepImpl: noSleep,
      });
    } catch (e) { msg = (e as Error).message; }
    ok('exhausting every attempt throws', msg.length > 0);
    ok('  the error names the caller', msg.includes('INE 25171'));
    ok('  the error names the attempt count', msg.includes('3 attempts'));
    ok('  the error names the underlying cause', msg.includes('ECONNRESET'));
    ok('  it is not the bare "fetch failed"', msg !== 'fetch failed');
    ok('  and it really did try 3 times', calls.length === 3);
  }

  // ── A 404 must fail FAST — this is a budget guard, not a nicety ────────────
  {
    const { impl, calls } = scriptedFetch([{ status: 404 }]);
    const res = await fetchWithRetry('https://x.test/bis.csv', {
      label: 'BIS', fetchImpl: impl, sleepImpl: noSleep,
    });
    ok('404 is returned to the caller, not thrown', res.status === 404);
    ok('  and it is NOT retried', calls.length === 1);
  }

  // ── A 5xx is retried, then handed back for the caller to describe ─────────
  {
    const { impl, calls } = scriptedFetch([{ status: 500 }]);
    const res = await fetchWithRetry('https://x.test/istat', {
      label: 'ISTAT', fetchImpl: impl, sleepImpl: noSleep,
    });
    ok('a persistent 500 is retried to the attempt limit', calls.length === 3);
    ok('  the last response is RETURNED, not thrown', res.status === 500);
  }
  {
    const { impl, calls } = scriptedFetch([{ status: 503 }, { status: 503 }, { status: 200 }]);
    const res = await expectResolves('a 5xx that clears on the third attempt succeeds', () =>
      fetchWithRetry('https://x.test/e', { label: 'Eurostat', fetchImpl: impl, sleepImpl: noSleep }));
    ok('a 5xx that clears on the third attempt succeeds', res?.status === 200 && calls.length === 3);
  }

  // ── THE BUDGET: a retry must never become an outage ───────────────────────
  {
    const { impl, calls } = scriptedFetch([{ throws: undiciError('ECONNRESET', 'x') }]);
    let msg = '';
    try {
      await fetchWithRetry('https://x.test/a', {
        label: 'Eurostat prc_hpi_q',
        fetchImpl: impl,
        sleepImpl: noSleep,
        deadlineAt: Date.now() - 1, // already spent
      });
    } catch (e) { msg = (e as Error).message; }
    ok('an already-exhausted budget starts NO request', calls.length === 0);
    ok('  and says so by name', msg.includes('budget exhausted'));
    ok('  naming the adapter that was starved', msg.includes('Eurostat prc_hpi_q'));
  }
  {
    // Deadline arrives between attempts: the backoff must not overrun it.
    const { impl, calls } = scriptedFetch([{ throws: undiciError('ECONNRESET', 'x') }]);
    let msg = '';
    try {
      await fetchWithRetry('https://x.test/a', {
        label: 'CBS',
        fetchImpl: impl,
        sleepImpl: noSleep,
        backoffMs: () => 60_000,       // a backoff far longer than the budget
        deadlineAt: Date.now() + 200,  // ~one attempt's worth
      });
    } catch (e) { msg = (e as Error).message; }
    ok('a backoff that would overrun the budget stops instead of sleeping', calls.length === 1);
    ok('  and the failure is still named', msg.includes('CBS') && msg.includes('ECONNRESET'));
  }
  {
    // A generous deadline must NOT suppress legitimate retrying — the guard
    // has to differ between the good and bad state (lesson 2026-08-27).
    const { impl, calls } = scriptedFetch([
      { throws: undiciError('ECONNRESET', 'x') },
      { status: 200 },
    ]);
    const res = await expectResolves('a generous budget still permits the retry', () =>
      fetchWithRetry('https://x.test/a', {
        label: 'INE 25171', fetchImpl: impl, sleepImpl: noSleep, deadlineAt: Date.now() + 60_000,
      }));
    ok('a generous budget still permits the retry', res?.status === 200 && calls.length === 2);
  }

  // ── attempts: 1 disables retrying, for callers that want that ─────────────
  {
    const { impl, calls } = scriptedFetch([{ throws: undiciError('ECONNRESET', 'x') }]);
    try {
      await fetchWithRetry('https://x.test/a', {
        label: 'once', attempts: 1, fetchImpl: impl, sleepImpl: noSleep,
      });
    } catch { /* expected */ }
    ok('attempts:1 makes exactly one call', calls.length === 1);
  }

  // ── The happy path stays a single call ────────────────────────────────────
  {
    const { impl, calls } = scriptedFetch([{ status: 200 }]);
    const res = await fetchWithRetry('https://x.test/a', {
      label: 'ok', fetchImpl: impl, sleepImpl: noSleep,
    });
    ok('a healthy upstream costs exactly one request', res.status === 200 && calls.length === 1);
  }


  // ── shareBudget: no indicator may be starved by its siblings ──────────────
  //
  // Regression cases for a REAL production failure, 2026-09-08 04:15. ECB's
  // eight series share one 70s budget serially; two hung for 48.0s and 16.6s
  // between them, and the third — healthy — was refused with "budget exhausted
  // before attempt 1/3 (0ms elapsed)". 202 rows went unrefreshed. The whole
  // point of these tests is that the LAST item still gets time.
  {
    const t0 = 1_000_000;
    const budget = { deadlineAt: t0 + 70_000 };

    ok(
      'the first of 8 gets an eighth of the budget, not all of it',
      shareBudget(budget, 8, t0)!.deadlineAt === t0 + 8_750,
    );
    ok(
      'a single remaining item gets the whole remaining budget',
      shareBudget(budget, 1, t0)!.deadlineAt === t0 + 70_000,
    );

    // Replay the exact production sequence: items 0 and 1 burn their entire
    // slice, then check that item 7 still has time on the clock.
    let now = t0;
    let starved = false;
    let lastSlice = 0;
    for (let i = 0; i < 8; i++) {
      const slice = shareBudget(budget, 8 - i, now)!;
      const room = slice.deadlineAt! - now;
      if (room <= 0) starved = true;
      lastSlice = room;
      // items 0 and 1 are the two that hung; the rest are healthy (~500ms).
      now += i < 2 ? room : 500;
    }
    ok('after two hung indicators, the eighth is NOT starved', !starved);
    ok('the eighth still gets a usable slice (>5s)', lastSlice > 5_000);

    // Unused time must roll forward, or fair-share would penalise a healthy run.
    const healthy = shareBudget(budget, 7, t0 + 500)!;
    ok(
      'slack from a fast indicator rolls forward to the next',
      healthy.deadlineAt! - (t0 + 500) > 8_750,
    );

    // An already-overrun source must fail honestly, not be handed a fresh slice.
    const overrun = shareBudget(budget, 4, t0 + 80_000)!;
    ok(
      'an overrun budget is returned unchanged so the caller fails honestly',
      overrun.deadlineAt === budget.deadlineAt,
    );
    ok('an absent budget stays absent', shareBudget(undefined, 8, t0) === undefined);
    ok(
      'a budget with no deadline is passed through untouched',
      shareBudget({}, 8, t0)!.deadlineAt === undefined,
    );

  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  console.log('ALL PASS');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
