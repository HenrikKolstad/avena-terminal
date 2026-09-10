/**
 * scripts/test-openapi-stats-sources.ts
 *
 * Asserts that /api/openapi.json never states the `eu_official_stats` source
 * set as a live fact, and never converts absence-from-a-snapshot into a claim
 * that an adapter is dormant.
 *
 * WHY THIS EXISTS
 * The source list was hardcoded, then correctly repaired to derive from the
 * table. Deriving it was necessary and NOT sufficient. The route is an ISR
 * render cached for a fixed window, so a derived value rendered into it is a
 * SNAPSHOT — and it was written in the present tense:
 *
 *   "Sources currently holding observations: ECB SDW, Eurostat, INE Spain.
 *    Any adapter not listed here is wired but is not returning rows."
 *
 * On 2026-09-10 BIS held 8,700 rows from 04:15 — 49.6% of the whole table —
 * and the served spec published exactly the sentence above for hours. The
 * list being stale was the smaller half. The second sentence was the real
 * defect: it promoted "absent from a cached list" into "returns no rows", so
 * the document did not merely omit the largest source, it denied it. This
 * file is read by LLMs, which is precisely where an unhedged false negative
 * is most expensive.
 *
 * This is the project's recurring failure shape one level up from a zero: a
 * stale snapshot presented as current state looks exactly like a live reading.
 *
 * WHAT IT CHECKS
 *  1. The resolved branch dates its observation with the caller's timestamp.
 *  2. The resolved branch names every source it was given.
 *  3. The resolved branch does NOT assert dormancy about unlisted adapters,
 *     and says the reading may be out of date.
 *  4. The failed-read branch states no source set at all — no remembered list.
 *  5. Neither branch uses present-tense "currently holding" for the list.
 *  6. `revalidate` and the Cache-Control max-age agree, so the age bound the
 *     prose promises is the age bound the CDN actually enforces.
 *
 * (3) AND (6) ARE THE LOAD-BEARING ONES. (3) is the claim that was false; (6)
 * is what stops the prose and the caching drifting apart later — a spec that
 * says "regenerated at most 1h apart" while the CDN holds it for a day is the
 * same bug wearing the fix's clothes.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { statsSourcesDescription } from '../src/app/api/openapi.json/route';

const ROOT = join(__dirname, '..');
const ROUTE = 'src/app/api/openapi.json/route.ts';

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

const AT = '2026-09-10T04:20:00.000Z';

// ── 1-3. The resolved branch ────────────────────────────────────────────────
// Deliberately exercised with the REAL 2026-09-10 source set, BIS included:
// the regression is only meaningful against the day it actually happened.
console.log('\nResolved branch (sources read successfully)');

const resolved = statsSourcesDescription(['bis', 'ecb_sdw', 'eurostat', 'ine_es'], AT);

ok('dates the observation with the timestamp it was given', resolved.includes(AT), resolved);

for (const label of ['BIS', 'ECB SDW', 'Eurostat', 'INE Spain']) {
  ok(`names the source it was given: ${label}`, resolved.includes(label));
}

// The exact sentence that was false. Not a substring match on a stale list —
// a match on the SHAPE of the claim, so any reworded dormancy assertion also
// fails. Pinning the test to the wrong words would guard the symptom; pinning
// it to the claim guards the class.
const DORMANCY_CLAIM =
  /(not listed|not listed here|absent from)[^.]*\b(is|are)\s+(wired but\s+)?(is\s+)?not returning rows/i;
ok(
  'does NOT assert that an unlisted adapter is not returning rows',
  !DORMANCY_CLAIM.test(resolved),
  resolved,
);
ok(
  'tells the reader the list may be out of date',
  /may hold rows now|not a live reading/i.test(resolved),
  resolved,
);
ok(
  'points the reader at the live endpoint',
  resolved.includes('/api/v1/stats'),
  resolved,
);

// ── 4. The failed-read branch ───────────────────────────────────────────────
console.log('\nFailed-read branch (probe errored)');

const unresolved = statsSourcesDescription(null, AT);

ok('dates the failed read', unresolved.includes(AT), unresolved);
ok(
  'states no source set at all — no remembered list',
  !['BIS', 'ECB SDW', 'Eurostat', 'INE Spain', 'ISTAT', 'CBS'].some((s) =>
    unresolved.includes(s),
  ),
  unresolved,
);
ok(
  'does NOT assert dormancy about anything',
  !DORMANCY_CLAIM.test(unresolved),
  unresolved,
);

// ── 5. Present tense ────────────────────────────────────────────────────────
// "currently holding observations" is the exact phrasing that made a cached
// snapshot read as a live reading. It must not return in either branch.
console.log('\nTense');

for (const [name, text] of [
  ['resolved', resolved],
  ['failed-read', unresolved],
] as const) {
  ok(
    `${name} branch does not claim a CURRENT source list`,
    !/sources currently holding observations:/i.test(text),
    text,
  );
}

// ── 6. Prose and cache agree ────────────────────────────────────────────────
console.log('\nThe promised age bound is the enforced age bound');

const src = readFileSync(join(ROOT, ROUTE), 'utf8');

const revalidate = /export const revalidate = (\d+)\s*;/.exec(src)?.[1];
const maxAgeConst = /const SPEC_MAX_AGE_SECONDS = (\d+)\s*;/.exec(src)?.[1];

ok('route exports a numeric revalidate', revalidate != null, String(revalidate));
ok('route defines SPEC_MAX_AGE_SECONDS', maxAgeConst != null, String(maxAgeConst));
ok(
  'revalidate equals SPEC_MAX_AGE_SECONDS',
  revalidate != null && revalidate === maxAgeConst,
  `revalidate=${revalidate} SPEC_MAX_AGE_SECONDS=${maxAgeConst}`,
);
ok(
  'Cache-Control is built from SPEC_MAX_AGE_SECONDS, not a literal',
  /max-age=\$\{SPEC_MAX_AGE_SECONDS\}, s-maxage=\$\{SPEC_MAX_AGE_SECONDS\}/.test(src),
  'a literal here can drift from the window the prose promises',
);

// The prose states the window in hours; if the constant changes and the prose
// is a literal, the document starts lying about its own freshness.
ok(
  'the stated window is computed from SPEC_MAX_AGE_SECONDS, not written out',
  /SPEC_MAX_AGE_SECONDS \/ 3600/.test(src),
  'the hour figure in the description must derive from the constant',
);

const statedHours = Number(maxAgeConst) / 3600;
ok(
  'the description states the real window',
  resolved.includes(`at most ${statedHours}h`),
  resolved,
);

// ── Report ──────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
if (failures.length) {
  console.log(`FAILED — ${passed} passed, ${failures.length} failed\n`);
  for (const f of failures) console.log(`  • ${f}`);
  process.exit(1);
}
console.log(`ALL PASS — ${passed} passed, 0 failed`);
