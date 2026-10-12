/**
 * scripts/test-plab-honesty.ts
 *
 * Pins the published-claim defect found on 2026-10-12 and the shape behind it.
 *
 * WHAT WAS PUBLISHED. /api/v1/plab — a route carrying a `cite_as` line and a
 * DOI, i.e. the form an AI assistant quotes — returned `ok: true` with:
 *
 *   run_date: 2026-08-27, leaderboard: [{ rank 1, Perplexity Sonar, 100%, 36/36 }]
 *
 * 46 days stale, one contestant, and no field on the response saying either
 * thing. /benchmark renders the same data under the sentence "PLAB scores major
 * AI models daily".
 *
 * WHY IT LOOKED FINE. `plab_daily_scores` holds Claude Sonnet 4.5 and Claude
 * Haiku 4.5 up to 2026-08-09 and Perplexity Sonar up to 2026-08-27 — two
 * billing outages at two dates. `latestScores()` takes the newest date holding
 * ANY row, so a date on which only one provider answered becomes "the
 * leaderboard". Meanwhile both provider calls ended in `catch { return null }`
 * and the runner read a null probe as "key absent", so a 401 that says "You
 * exceeded your current quota" was recorded as `models_skipped` — the same word
 * used for a provider nobody has integrated — and the cron logged `success`
 * with `errors: []` every morning for 44 days.
 *
 * The fabricated-zero branch is the one that had not fired yet: `answered === 0`
 * yielded `accuracy: 0`, upserted as a real score, which would have published
 * "Claude Sonnet 4.5 — 0.0%" about somebody else's model because OUR billing
 * failed. No 0-accuracy row exists in the table; the probe gate happened to
 * stop the loop first. That is luck, not design, and it is citation-measure's
 * bug exactly.
 */

import { readFileSync } from 'fs';
import path from 'path';
import { PLAB_PROVIDERS, describeContest } from '../src/lib/plab';

let passed = 0;
const failures: string[] = [];
function ok(label: string, cond: boolean, detail = '') {
  if (cond) { passed++; console.log(`  ✓ ${label}`); }
  else { failures.push(`${label}${detail ? ` — ${detail}` : ''}`); console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`); }
}

const LABELS = PLAB_PROVIDERS.map((p) => p.label);
const NOW = '2026-10-12T06:00:00.000Z';

// ── THE REAL CASE ──────────────────────────────────────────────────────────

const real = describeContest(LABELS, ['Perplexity Sonar'], '2026-08-27', NOW);
ok('THE REAL CASE: the 08-27 standings are 46 days old', real.days_since_run === 46);
ok('…and are NOT a current measurement', real.measurement_current === false);
ok('…and say so in words a quoting consumer cannot miss', /NOT a current measurement/.test(real.note));
ok('…and name the two contestants absent from them', real.absent.length === 2 && real.absent.includes('Claude Sonnet 4.5') && real.absent.includes('Claude Haiku 4.5'));
ok('…and say they were attempted rather than unranked', /attempted and did not return a score/.test(real.note));
ok('…and count the field honestly: 1 of 3', real.scored_on_run_date === 1 && real.configured === 3);

// ── Staleness arithmetic ───────────────────────────────────────────────────

ok('a run scored today is current', describeContest(LABELS, LABELS, '2026-10-12', NOW).days_since_run === 0);
ok('…and reads as scored today', /scored today/.test(describeContest(LABELS, LABELS, '2026-10-12', NOW).note));
ok('yesterday is still current — the cron runs at 05:30 and a reader may be earlier', describeContest(LABELS, LABELS, '2026-10-11', NOW).measurement_current === true);
ok('two days is not current', describeContest(LABELS, LABELS, '2026-10-10', NOW).measurement_current === false);
ok('…reported as 2 days', describeContest(LABELS, LABELS, '2026-10-10', NOW).days_since_run === 2);
ok(
  'a complete field says so rather than listing nothing and leaving it ambiguous',
  /all 3 configured contestants scored/.test(describeContest(LABELS, LABELS, '2026-10-12', NOW).note),
);

// ── Never a fabricated zero, in either field ───────────────────────────────

const never = describeContest(LABELS, [], null, NOW);
ok('NO RUN EVER: days_since_run is null, NEVER 0 — the recurring bug', never.days_since_run === null);
ok('…and measurement_current is false, not true-by-default', never.measurement_current === false);
ok('…and it says plainly that nothing has been scored', /No benchmark run has ever been scored/.test(never.note));
ok('…and all three contestants are listed as absent', never.absent.length === 3);

const unparseable = describeContest(LABELS, ['Perplexity Sonar'], 'not-a-date', NOW);
ok('an unparseable run_date gives a null age rather than a fake one', unparseable.days_since_run === null);
ok('…and refuses to call it current', unparseable.measurement_current === false);
ok('…and says it must not be read as current', /must not be read as current/.test(unparseable.note));
const badClock = describeContest(LABELS, ['Perplexity Sonar'], '2026-08-27', 'tomorrow');
ok('an unparseable caller clock gives a null age too', badClock.days_since_run === null);
ok('the note is never empty — an empty string reads as "nothing to report"', never.note.length > 0 && unparseable.note.length > 0 && real.note.length > 0);

// ── A single-contestant table is never silently fine ──────────────────────

ok(
  'one contestant out of three is reported as incomplete even when the run is today',
  (() => {
    const v = describeContest(LABELS, ['Perplexity Sonar'], '2026-10-12', NOW);
    return v.measurement_current === true && v.absent.length === 2 && /2 of 3|1 of 3/.test(v.note);
  })(),
);
ok(
  'pluralisation is honest for a single absentee',
  /was attempted and did not return a score/.test(describeContest(LABELS, ['Perplexity Sonar', 'Claude Sonnet 4.5'], '2026-10-12', NOW).note),
);

// ── Source-shape guards on the runner ─────────────────────────────────────
//
// `runBenchmark` needs live API keys and a database, so it cannot be exercised
// here. These assertions read its source instead and fail if the four fixes are
// backed out. Comments are stripped first — a guard of this kind went red on
// its own explanatory comment twice in this repo.

const plabSource = (() => {
  const raw = readFileSync(path.join(process.cwd(), 'src', 'lib', 'plab.ts'), 'utf8');
  return raw
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map((l) => l.replace(/(^|\s)\/\/.*$/, '$1'))
    .join('\n');
})();

ok(
  'NO BARE `catch { return null }` SURVIVES in the provider calls — that one line hid 44 days of 401s',
  !/catch\s*\{\s*return null;?\s*\}/.test(plabSource),
);
ok(
  'a provider failure carries a reason',
  /reason: 'provider_error'/.test(plabSource),
);
ok(
  '…and a detail, so tomorrow reads the 401 body instead of guessing',
  /detail: `HTTP \$\{res\.status\}/.test(plabSource),
);
ok(
  'a missing key is a DIFFERENT reason from a refusal',
  /reason: 'no_key'/.test(plabSource) && /models_refused/.test(plabSource) && /models_skipped/.test(plabSource),
);
ok(
  'the runner routes a refusal to models_refused, not models_skipped',
  /probe\.reason === 'no_key'[\s\S]{0,200}models_skipped\.push[\s\S]{0,200}models_refused\.push/.test(plabSource),
);
ok(
  'ACCURACY IS NULL, NOT 0, WHEN NOTHING WAS ANSWERED',
  /answered > 0 \? Number\(\(\(correct \/ answered\) \* 100\)\.toFixed\(1\)\) : null/.test(plabSource),
);
ok(
  '…and no score row is written in that case, so a fabricated zero cannot be published',
  /if \(accuracy === null\)[\s\S]{0,300}no score row written/.test(plabSource),
);
ok(
  'the per-question insert READS the supabase error instead of discarding it',
  /const \{ error: insErr \} = await supabase\.from\('plab_runs'\)\.insert/.test(plabSource),
);
ok(
  '…and only counts a row that landed',
  /if \(insErr\)[\s\S]{0,120}else rowsWritten\+\+;/.test(plabSource),
);
ok(
  'the daily-score upsert reads its error too — the supabase client resolves on a failed write',
  /const \{ error: scoreErr \} = await supabase\.from\('plab_daily_scores'\)\.upsert/.test(plabSource),
);
ok(
  'the summary carries whether the score row actually landed',
  /score_row_written/.test(plabSource),
);

const cronSource = readFileSync(path.join(process.cwd(), 'src', 'app', 'api', 'cron', 'plab-run', 'route.ts'), 'utf8');
ok(
  'the cron declares ok:false when nothing was scored — withCronLog logs that as an error',
  /const ok = scored > 0 && result\.models_refused\.length === 0 && result\.errors\.length === 0;/.test(cronSource),
);
ok('…and returns that flag rather than computing it and dropping it', /\n    ok,/.test(cronSource));

const v1Source = readFileSync(path.join(process.cwd(), 'src', 'app', 'api', 'v1', 'plab', 'route.ts'), 'utf8');
ok('the quotable API carries the standings age', /days_since_run: status\.days_since_run/.test(v1Source));
ok('…and whether they are current', /measurement_current: status\.measurement_current/.test(v1Source));
ok('…and the honest sentence', /standings_note: status\.note/.test(v1Source));
ok('…and who was attempted without scoring', /attempted_without_a_score: status\.absent/.test(v1Source));
ok(
  '…and keeps "not integrated" separate from "attempted and refused"',
  /not_integrated: PLAB_PENDING/.test(v1Source),
);

console.log('');
if (failures.length) {
  console.log(`FAILED — ${passed} passed, ${failures.length} failed`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`ALL PASS — ${passed} passed, 0 failed`);
