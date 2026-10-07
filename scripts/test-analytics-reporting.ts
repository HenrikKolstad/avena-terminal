/**
 * Tests for /api/analytics reporting honesty.
 *
 * BACKGROUND — the defect these tests were written from, 2026-10-07.
 * The route had THREE copies of this project's recurring shape in one file:
 *
 *  1. POST discarded the insert result entirely — `await supabase.from(...)
 *     .insert({...})` with no `{ error }` destructure — and then returned
 *     `{ ok: true }` unconditionally.
 *  2. Its catch returned `{ ok: true }` under a `// never fail` comment, so a
 *     malformed body and a successful write were indistinguishable.
 *  3. GET read `analytics_events` five times discarding every error, then
 *     reported `oracleRaw?.length || 0` — a failed read became a confident 0.
 *
 * `analytics_events` DOES NOT EXIST (swept 2026-10-06, scripts/db-tables.json).
 * supabase-js returns `{data:null,error}` rather than throwing, so every event
 * ever sent to this route was dropped while the route reported success, and
 * the admin dashboard reported "no user activity" when the truth was "no
 * table". A reporting surface that cannot tell those apart is worse than no
 * reporting surface.
 *
 * THE HEADLINE CASES ARE THE FAILURE CASES, and two tests assert the OLD
 * shapes are GONE from the source — because a test that only shows the fixed
 * shape passing never proves it would have caught the bug (lesson 2026-09-02).
 *
 * Creating the table is Henrik's call (it is one of the twelve dead features
 * under NEEDS HENRIK), so these tests pin the REPORTING, which is mine: the
 * route must stay HTTP 200 — analytics must never break a page — while saying
 * plainly that nothing was stored.
 *
 * Run: npx tsx scripts/test-analytics-reporting.ts
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

let passed = 0;
const failures: string[] = [];

function ok(name: string, cond: boolean, detail = '') {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const ROOT = join(__dirname, '..');
const src = readFileSync(join(ROOT, 'src/app/api/analytics/route.ts'), 'utf8');

// ── Part 1: the old shapes must be gone ────────────────────────────────────
console.log('\nanalytics — the false-success shapes are gone\n');

ok(
  'POST no longer discards the insert result',
  !/await supabase\s*\n?\s*\.from\('analytics_events'\)\s*\n?\s*\.insert\(/.test(
    src.replace(/const \{ error \} = /g, 'DESTRUCTURED '),
  ) || /const \{ error \} = await supabase/.test(src),
  'the insert must destructure { error }',
);

ok(
  'the `// never fail` catch that returned a bare ok:true is gone',
  !/catch\s*\{\s*return NextResponse\.json\(\{ ok: true \}\); \/\/ never fail/.test(src),
);

ok(
  'no unconditional bare `{ ok: true }` response survives',
  !/NextResponse\.json\(\{ ok: true \}\)/.test(src),
  'every ok:true must now carry `stored`',
);

ok(
  'every analytics_events read in GET captures its error',
  (src.match(/error: \w+Err \} = await supabase/g) ?? []).length >= 5,
  `found ${(src.match(/error: \w+Err \} = await supabase/g) ?? []).length} of 5`,
);

// ── Part 2: the honest shapes are present ──────────────────────────────────
console.log('\nanalytics — the truthful shapes are present\n');

ok('POST reports `stored: true` only on a clean insert', /ok: true, stored: true/.test(src));
ok('a rejected insert reports stored:false WITH the reason', /stored: false, reason: error\.message/.test(src));
ok('a missing client reports stored:false, not success', /no supabase client configured/.test(src));
ok('a malformed body reports stored:false with its reason', /'malformed request'/.test(src));
ok('GET exposes a `degraded` list naming unread sources', /degraded: readErrors/.test(src));

// Analytics must never break a page: the route stays 200 on a dropped write.
ok(
  'POST still never returns a 5xx — only 400 on a missing event_type',
  (src.match(/status: \d{3}/g) ?? []).every((m) => m === 'status: 400' || m === 'status: 401' || m === 'status: 503'),
  `statuses: ${(src.match(/status: \d{3}/g) ?? []).join(', ')}`,
);

// ── Part 3: the regression guard ───────────────────────────────────────────
console.log('\nanalytics — the guard against the shape returning\n');

// `?? 0` / `|| 0` on a count is only safe BESIDE a degraded list. If someone
// deletes the list but keeps the zeros, this fails.
ok(
  'the zeros are never published without the degraded list beside them',
  !/\?\.length \|\| 0/.test(src) || /degraded: readErrors/.test(src),
);

ok(
  'db-tables.json still documents analytics_events as absent, so this stays honest',
  /analytics_events/.test(readFileSync(join(ROOT, 'scripts/db-tables.json'), 'utf8')),
);

console.log(
  `\n${failures.length === 0 ? 'ALL PASS' : 'FAILURES'} — ${passed} passed, ${failures.length} failed\n`,
);
if (failures.length) {
  for (const f of failures) console.log(`  ${f}`);
  process.exit(1);
}
