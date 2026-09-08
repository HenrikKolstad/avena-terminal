/**
 * Resilient HTTP for the ingest adapters.
 *
 * WHY THIS EXISTS
 * On 2026-09-07 the scheduled eu-stats-ingest run reported, for its single
 * INE indicator, exactly this:
 *
 *     ine_es: INE 25171: fetch failed
 *
 * Two separate defects are visible in that one line.
 *
 * 1. ONE BAD DRAW COST THE WHOLE SOURCE FOR THE DAY. The adapters call
 *    `fetch` once, with no retry. INE answered 200 on ten consecutive manual
 *    attempts minutes later, and a hand re-run of the same route landed all
 *    4,480 rows. Nothing was wrong with the code or the upstream — a single
 *    transient network failure was enough to zero a source for 24 hours.
 *    This is the O-27 lesson in a different place: "retrying does not help"
 *    was true of retries WITHIN one attempt, and says nothing about a second
 *    attempt a moment later.
 *
 * 2. "fetch failed" NAMES NOTHING. That string is Node/undici's generic
 *    wrapper; the actual reason (ECONNRESET, ETIMEDOUT, ENOTFOUND, a TLS
 *    failure) is hidden one level down in `err.cause`. Reading `err.message`
 *    throws the diagnosis away at the only point that had it — the same shape
 *    as `draftAnswer` returning a bare null, and the reason a whole class of
 *    failures here has been unexplainable after the fact.
 *
 * AND THE TRAP THIS AVOIDS
 * Adding retries WITHOUT a time budget would have made things worse, not
 * better. The route runs six adapters sequentially under `maxDuration = 300`.
 * A hung host with no timeout burns the entire function budget and silently
 * kills every adapter after it — so a naive retry turns "one source fails"
 * into "this source and the four behind it fail". Hence: every request
 * carries an explicit timeout, and every adapter carries a deadline it cannot
 * overrun. The retry is only safe because the budget is bounded.
 */

/** A wall-clock budget an adapter may not overrun. */
export interface FetchBudget {
  /** Absolute epoch-ms after which no NEW request may be started. */
  deadlineAt?: number;
}

/**
 * Split what is left of a source's budget evenly across the indicators that
 * have not been tried yet.
 *
 * WHY THIS EXISTS — measured in production 2026-09-08, one night after the
 * retries in this file went live. ECB's eight series share a single 70s
 * source budget and are fetched serially. Two of them hung:
 *
 *   MIR/M.U2…  all 3 attempts failed in 48005ms  (3 × 15s timeout)
 *   MIR/M.NL…  all 3 attempts failed in 16552ms
 *   FM/…EURIBOR3MD_.HSTA: budget exhausted before attempt 1/3 (0ms elapsed)
 *
 * The third series was HEALTHY and got ZERO attempts, because two sick
 * siblings ahead of it had eaten the whole source budget — 202 rows not
 * refreshed. That is the 2026-09-07 lesson ("a fix that makes a failure less
 * likely can make its blast radius worse") landing on the very change that
 * lesson was written about: retrying multiplies a hung indicator's cost by
 * three, and a shared serial budget passes that cost to everything behind it.
 *
 * Fair-share bounds the damage to the indicator that is actually sick. A slow
 * one can spend at most its own slice, and the last one in the list still gets
 * a slice. Unused time rolls forward automatically, because the remaining
 * budget is re-read from the wall clock on every call — so on a healthy night
 * (ECB fetches take ~0.5s) each successive indicator sees a LARGER slice than
 * the last and nothing is constrained at all.
 *
 * The deliberate trade: a genuinely slow-but-working upstream now gets fewer
 * retries than before. That is the intended direction. A hang is not a
 * transient blip, and the failure mode these retries were added for — INE's
 * "fetch failed" — returns immediately, so it still gets all three attempts
 * inside its slice.
 */
export function shareBudget(
  budget: FetchBudget | undefined,
  remainingItems: number,
  now: number = Date.now(),
): FetchBudget | undefined {
  // No deadline to divide, or nothing to protect from this item.
  if (budget?.deadlineAt == null || remainingItems <= 1) return budget;
  const left = budget.deadlineAt - now;
  // Already overrun. Hand back the real deadline so the caller fails with the
  // honest "budget exhausted" error rather than being given a fresh slice it
  // has not earned.
  if (left <= 0) return budget;
  return { deadlineAt: now + Math.ceil(left / remainingItems) };
}

export interface ResilientFetchOptions extends FetchBudget {
  headers?: Record<string, string>;
  /** Per-attempt timeout. Applies to each attempt separately. */
  timeoutMs?: number;
  /** Total attempts, including the first. 1 disables retrying. */
  attempts?: number;
  /** Backoff before attempt n (n=1 is the first retry). */
  backoffMs?: (attempt: number) => number;
  /** Names the caller in error messages, e.g. "INE 25171". */
  label: string;
  /** Injectable for tests. Defaults to globalThis.fetch. */
  fetchImpl?: typeof fetch;
  /** Injectable for tests. Defaults to a real sleep. */
  sleepImpl?: (ms: number) => Promise<void>;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_ATTEMPTS = 3;

const defaultBackoff = (attempt: number) => (attempt === 1 ? 600 : 2_400);
const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Unwrap Node's generic "fetch failed" to the reason underneath it.
 *
 * undici throws a TypeError whose `message` is the useless constant
 * "fetch failed" and whose `cause` carries the real error — usually a
 * system error with a `code` like ECONNRESET or ETIMEDOUT. An AbortError
 * from our own timeout is reported as the timeout it is, not as a network
 * fault, because those are different failures with different fixes.
 */
export function describeFetchError(err: unknown, timeoutMs?: number): string {
  if (err && typeof err === 'object') {
    const e = err as { name?: string; message?: string; code?: string; cause?: unknown };
    if (e.name === 'TimeoutError' || e.name === 'AbortError') {
      return timeoutMs ? `timed out after ${timeoutMs}ms` : 'timed out';
    }
    const parts: string[] = [];
    if (typeof e.message === 'string' && e.message) parts.push(e.message);
    // Walk the cause chain — undici nests the real reason one or two deep.
    let cause = e.cause;
    let depth = 0;
    while (cause && typeof cause === 'object' && depth < 4) {
      const c = cause as { message?: string; code?: string; cause?: unknown };
      const detail = [c.code, c.message].filter(Boolean).join(': ');
      if (detail && !parts.includes(detail)) parts.push(detail);
      cause = c.cause;
      depth++;
    }
    if (parts.length > 0) return parts.join(' <- ');
  }
  return String(err);
}

/**
 * A status worth trying again. Deliberately narrow: a 404 means the endpoint
 * moved (BIS has been 404ing for weeks) and retrying it three times only
 * spends budget the next adapter needs. 429/408/5xx are the transient ones.
 */
export function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

/**
 * fetch with an explicit per-attempt timeout, bounded retries and an error
 * that names what actually went wrong.
 *
 * Returns the Response for any status the caller should interpret itself —
 * including non-ok ones that are not worth retrying — so existing
 * `if (!res.ok)` and `if (res.status === 404) return []` logic is unchanged.
 * Throws only when every attempt failed at the network level, or when the
 * budget ran out.
 */
export async function fetchWithRetry(url: string, opts: ResilientFetchOptions): Promise<Response> {
  const {
    label,
    headers,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    attempts = DEFAULT_ATTEMPTS,
    backoffMs = defaultBackoff,
    deadlineAt,
    fetchImpl = fetch,
    sleepImpl = defaultSleep,
  } = opts;

  const started = Date.now();
  const failures: string[] = [];
  let lastResponse: Response | null = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    // Never START a request we have no budget to finish.
    if (deadlineAt != null && Date.now() >= deadlineAt) {
      throw new Error(
        `${label}: budget exhausted before attempt ${attempt}/${attempts} ` +
          `(${Date.now() - started}ms elapsed)${failures.length ? ` — ${failures.join('; ')}` : ''}`,
      );
    }
    // Never let one request outlive the budget either.
    const remaining = deadlineAt != null ? deadlineAt - Date.now() : Infinity;
    const thisTimeout = Math.max(1, Math.min(timeoutMs, remaining));

    try {
      const res = await fetchImpl(url, {
        headers,
        signal: AbortSignal.timeout(thisTimeout),
      });
      lastResponse = res;
      if (res.ok || !isRetryableStatus(res.status)) return res;
      failures.push(`attempt ${attempt}: HTTP ${res.status}`);
    } catch (err) {
      failures.push(`attempt ${attempt}: ${describeFetchError(err, thisTimeout)}`);
    }

    if (attempt < attempts) {
      const wait = backoffMs(attempt);
      if (deadlineAt != null && Date.now() + wait >= deadlineAt) {
        // Backing off would consume the rest of the budget — stop honestly.
        break;
      }
      await sleepImpl(wait);
    }
  }

  // Every retryable status still counts as a response the caller can read;
  // its own error text ("ISTAT ... HTTP 500") is already the right message.
  if (lastResponse) return lastResponse;

  throw new Error(
    `${label}: all ${attempts} attempts failed in ${Date.now() - started}ms — ${failures.join('; ')}`,
  );
}
