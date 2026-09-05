/**
 * Tests for Prometheus failure reporting.
 *
 * Background: `/api/cron/prometheus` logged `success` 4x a day for weeks while
 * drafting nothing, publishing nothing and failing every single question. Two
 * separate instances of this project's recurring bug made that possible:
 *
 *   1. `draftAnswer` returned a bare `null` for three different failures — no
 *      API key, an API error, an empty model response — so the reason was
 *      destroyed at the only place that knew it.
 *   2. The route published `error_count: <number>` and dropped the `errors[]`
 *      array. `deriveStatusFromSummary` reads the array and deliberately does
 *      not guess at numeric fields, so a total failure derived to `success`.
 *
 * The headline cases here are therefore the FAILURE cases. A guard that has
 * only ever been observed passing is not a guard (lesson 2026-09-02).
 *
 * Run: npx tsx scripts/test-prometheus-reporting.ts
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { deriveStatusFromSummary } from '../src/lib/cron-log';
import type { DraftOutcome } from '../src/lib/prometheus';

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

const ROOT = join(__dirname, '..');
const routeSrc = readFileSync(
  join(ROOT, 'src/app/api/cron/prometheus/route.ts'),
  'utf8',
);
const libSrc = readFileSync(join(ROOT, 'src/lib/prometheus.ts'), 'utf8');

/** The summary the route builds, as a function of a run's outcome. */
function routeSummary(s: {
  harvested: number;
  drafted: number;
  published: number;
  pinged: number;
  errors: string[];
}) {
  return {
    harvested: s.harvested,
    drafted: s.drafted,
    published: s.published,
    pinged: s.pinged,
    error_count: s.errors.length,
    errors: s.errors.slice(0, 10),
  };
}

function main() {
  console.log('\nPrometheus failure reporting\n');

  // ── The regression that started this: every question fails ──────────────
  {
    // The real 2026-09-05 02:03 run, verbatim from `prometheus_runs`.
    const errors = [
      'draft_failed (no_api_key: ANTHROPIC_API_KEY is not set): What is the price per m² in Manilva, Málaga, Spain?',
      'draft_failed (no_api_key: ANTHROPIC_API_KEY is not set): Can I still get Spanish residency by buying property?',
      'draft_failed (no_api_key: ANTHROPIC_API_KEY is not set): Is Manilva, Málaga a good place to buy property in Spain?',
      'draft_failed (no_api_key: ANTHROPIC_API_KEY is not set): How many new builds are in Manilva, Málaga?',
      'draft_failed (no_api_key: ANTHROPIC_API_KEY is not set): What is the Avena Property Consciousness Index (APCI)?',
    ];
    const summary = routeSummary({
      harvested: 5,
      drafted: 0,
      published: 0,
      pinged: 0,
      errors,
    });
    const derived = deriveStatusFromSummary(summary);
    ok('a run that fails every question derives `error`', derived.status === 'error');
    ok(
      'the derived message carries the count and the first reason',
      String(derived.error).includes('5 error(s)') &&
        String(derived.error).includes('no_api_key'),
    );
  }

  // ── The half that can refute me: a healthy run must stay green ──────────
  {
    const summary = routeSummary({
      harvested: 5,
      drafted: 5,
      published: 5,
      pinged: 5,
      errors: [],
    });
    ok(
      'a fully successful run still derives `success`',
      deriveStatusFromSummary(summary).status === 'success',
    );
  }

  // ── A partial failure is a failure, not a rounding error ────────────────
  {
    const summary = routeSummary({
      harvested: 5,
      drafted: 5,
      published: 4,
      pinged: 4,
      errors: ['publish_failed: what-is-the-apci'],
    });
    ok(
      'one failed publish out of five derives `error`',
      deriveStatusFromSummary(summary).status === 'error',
    );
  }

  // ── The cap must never understate the failure ───────────────────────────
  {
    const errors = Array.from({ length: 25 }, (_, i) => `draft_failed (api_error: 401): q${i}`);
    const summary = routeSummary({
      harvested: 25,
      drafted: 0,
      published: 0,
      pinged: 0,
      errors,
    });
    ok('errors[] is capped at 10 for size', summary.errors.length === 10);
    ok('error_count carries the UNCAPPED total', summary.error_count === 25);
    ok(
      'error_count >= errors.length — the sample can never overstate health',
      summary.error_count >= summary.errors.length,
    );
    ok(
      '25 failures still derive `error`',
      deriveStatusFromSummary(summary).status === 'error',
    );
  }

  // ── The route must not regress to publishing only the count ─────────────
  {
    ok(
      'the route passes errors[] to the cron log, not just error_count',
      /errors:\s*summary\.errors/.test(routeSrc),
    );
    ok(
      'the route still reports the uncapped error_count alongside it',
      /error_count:\s*summary\.errors\.length/.test(routeSrc),
    );
    ok(
      'the route derives its status rather than passing a literal',
      routeSrc.includes('finishCronLogDerived') &&
        !/finishCronLog\(handle,\s*'success'/.test(routeSrc),
    );
  }

  // ── draftAnswer must name the reason, not return a bare null ────────────
  {
    ok(
      'draftAnswer returns DraftOutcome, not DraftedAnswer | null',
      /draftAnswer\([^)]*\):\s*Promise<DraftOutcome>/.test(libSrc),
    );
    ok(
      'the missing-key path names itself',
      libSrc.includes("reason: 'no_api_key"),
    );
    ok('the API-failure path carries the thrown message', libSrc.includes('api_error: $'));
    ok('the empty-response path is distinguishable', libSrc.includes('empty_response:'));
    ok(
      'no `catch { return null }` remains in the drafting path',
      !/catch\s*\{\s*return null;\s*\}/.test(libSrc),
    );

    // Type-level: every DraftOutcome must be narrowable to a reason.
    const outcomes: DraftOutcome[] = [
      { ok: false, reason: 'no_api_key: ANTHROPIC_API_KEY is not set' },
      { ok: false, reason: 'api_error: 401 credit balance is too low' },
      { ok: false, reason: 'empty_response: model returned no text (first block type: none)' },
    ];
    ok(
      'every failure outcome carries a non-empty reason',
      outcomes.every(o => !o.ok && o.reason.length > 0),
    );
    ok(
      'the three failure modes are distinguishable from one another',
      new Set(outcomes.map(o => (o.ok ? '' : o.reason.split(':')[0]))).size === 3,
    );
  }

  // ── The gap-resolve must not close a gap nothing answered ───────────────
  {
    ok(
      'citation_gaps is resolved on `answered`, never on `target`',
      /\.in\('question',\s*answered\)/.test(libSrc) &&
        !/\.in\('question',\s*target\)/.test(libSrc),
    );
    ok(
      'the resolve is gated on having answered something',
      /answered\.length\s*>\s*0/.test(libSrc),
    );
    ok(
      'a failed gap-resolve is reported rather than swallowed',
      libSrc.includes('gap_resolve_failed:'),
    );
    ok(
      'a question only reaches `answered` after a successful publish',
      /published\+\+;[\s\S]{0,120}answered\.push\(q\)/.test(libSrc),
    );
  }

  // ── A run that failed to persist must say so ────────────────────────────
  {
    ok(
      'trackRun returns a reason instead of an empty catch',
      /trackRun\([\s\S]{0,120}Promise<\{\s*ok:\s*boolean;\s*reason\?:\s*string\s*\}>/.test(libSrc),
    );
    ok(
      'a failed trackRun reaches the run summary',
      libSrc.includes('run_not_tracked:'),
    );
    const summary = routeSummary({
      harvested: 5,
      drafted: 5,
      published: 5,
      pinged: 5,
      errors: ['run_not_tracked: relation "prometheus_runs" does not exist'],
    });
    ok(
      'an otherwise-perfect run that was not persisted derives `error`',
      deriveStatusFromSummary(summary).status === 'error',
    );
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  console.log('ALL PASS');
}

main();
