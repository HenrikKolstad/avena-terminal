/**
 * scripts/test-feed-provenance.ts
 *
 * Pins the frozen-upstream judgement against the REAL case that exposed the gap.
 *
 * 2026-10-10: `public/data.json` was byte-identical to the book published at
 * 2026-10-09T11:50Z, the capture banked 2,039 rows from it, and
 * movement-ledger.csv published `2026-10-10,2039,0,0,,0,0`. Nothing in the
 * pipeline could say whether that zero was observed or inherited.
 *
 * The fixtures below are the real feed-meta.json contents from those two days.
 * The assertions are written so that the two ways this can go wrong BOTH fail:
 *
 *   - calling a frozen payload fresh (the bug that published the zero), and
 *   - calling an unknown payload stale, or a quiet upstream frozen on the
 *     second run of the same day, which would cry wolf every single night and
 *     train the reader to ignore the alarm.
 *
 * Plus the contract that matters most: an absent or malformed stamp is `unknown`
 * with `days_spanned: null` — NEVER 0, and never a claim of freshness.
 */

import { readFileSync } from 'fs';
import path from 'path';
import {
  carryForwardProvenance,
  describeUpstream,
  judgeUpstream,
  readProvenance,
  type FeedMetaShape,
} from '../src/lib/feed-provenance';

let passed = 0;
const failures: string[] = [];
function ok(label: string, cond: boolean, detail = '') {
  if (cond) { passed++; console.log(`  ✓ ${label}`); }
  else { failures.push(`${label}${detail ? ` — ${detail}` : ''}`); console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`); }
}

// ── Fixtures ───────────────────────────────────────────────────────────────

const SHA_A = 'a'.repeat(64); // the payload RedSP served on 10-09 at 11:50 and again on 10-10
const SHA_B = 'b'.repeat(64); // a genuinely different payload

/** The real shape of feed-meta.json BEFORE this module shipped — no provenance. */
const LEGACY_META: FeedMetaShape = {
  generated_at: '2026-10-10T11:07:31.616Z',
  generated_date: '2026-10-10',
  listings: 2039,
  source: 'redsp',
};

/** 2026-10-09 11:50 — the first run that saw payload A. */
const META_0909: FeedMetaShape = {
  ...LEGACY_META,
  generated_at: '2026-10-09T11:50:22.792Z',
  generated_date: '2026-10-09',
  source_sha256: SHA_A,
  source_bytes: 98_765_432,
  source_first_seen_at: '2026-10-09T11:50:22.792Z',
};

// ── readProvenance: a partial block is absent, not half-true ───────────────

ok('a legacy meta with no provenance reads as null', readProvenance(LEGACY_META) === null);
ok('a complete block reads back', readProvenance(META_0909)?.source_sha256 === SHA_A);
ok('null meta reads as null', readProvenance(null) === null);
ok('undefined meta reads as null', readProvenance(undefined) === null);
ok(
  'a hash with no first-seen stamp is absent, not half-read',
  readProvenance({ ...LEGACY_META, source_sha256: SHA_A, source_bytes: 1 }) === null,
);
ok(
  'a first-seen stamp with no hash is absent',
  readProvenance({ ...LEGACY_META, source_bytes: 1, source_first_seen_at: '2026-10-09T11:50:22.792Z' }) === null,
);
ok('a truncated hash is rejected', readProvenance({ ...META_0909, source_sha256: 'abc123' }) === null);
ok('an uppercase hash is rejected', readProvenance({ ...META_0909, source_sha256: SHA_A.toUpperCase() }) === null);
ok('zero bytes is rejected — an empty payload is not a payload', readProvenance({ ...META_0909, source_bytes: 0 }) === null);
ok('negative bytes is rejected', readProvenance({ ...META_0909, source_bytes: -1 }) === null);
ok('a non-date first-seen stamp is rejected', readProvenance({ ...META_0909, source_first_seen_at: 'yesterday' }) === null);

// ── carryForwardProvenance: the stamp accumulates only while bytes match ───

ok(
  'the 10-10 07:41 run sees payload A again and KEEPS the 10-09 11:50 stamp',
  carryForwardProvenance(META_0909, { source_sha256: SHA_A, source_bytes: 98_765_432 }, '2026-10-10T07:41:39.625Z')
    .source_first_seen_at === '2026-10-09T11:50:22.792Z',
);
ok(
  'a different payload RESETS the stamp to now',
  carryForwardProvenance(META_0909, { source_sha256: SHA_B, source_bytes: 98_765_999 }, '2026-10-10T07:41:39.625Z')
    .source_first_seen_at === '2026-10-10T07:41:39.625Z',
);
ok(
  'the same hash with a changed byte count still carries forward (the hash is the identity)',
  carryForwardProvenance(META_0909, { source_sha256: SHA_A, source_bytes: 1 }, '2026-10-10T07:41:39.625Z')
    .source_first_seen_at === '2026-10-09T11:50:22.792Z',
);
ok(
  'no prior knowledge resets the stamp rather than back-dating it',
  carryForwardProvenance(LEGACY_META, { source_sha256: SHA_A, source_bytes: 98_765_432 }, '2026-10-11T05:42:00.000Z')
    .source_first_seen_at === '2026-10-11T05:42:00.000Z',
);
ok(
  'the written byte count is the NEW payload, not the carried one',
  carryForwardProvenance(META_0909, { source_sha256: SHA_A, source_bytes: 777 }, '2026-10-10T07:41:39.625Z')
    .source_bytes === 777,
);

let threw = false;
try { carryForwardProvenance(META_0909, { source_sha256: 'nope', source_bytes: 1 }, '2026-10-10T00:00:00Z'); } catch { threw = true; }
ok('a bad hash throws rather than writing a meaningless stamp', threw);
threw = false;
try { carryForwardProvenance(META_0909, { source_sha256: SHA_A, source_bytes: 0 }, '2026-10-10T00:00:00Z'); } catch { threw = true; }
ok('a zero-byte payload throws — this is the 12KB-interstitial shape', threw);
threw = false;
try { carryForwardProvenance(META_0909, { source_sha256: SHA_A, source_bytes: 1 }, 'not-a-date'); } catch { threw = true; }
ok('an unparseable now throws rather than stamping Invalid Date', threw);

// ── judgeUpstream: the real 10-09/10-10 case ──────────────────────────────

const frozen = judgeUpstream(
  { ...META_0909, generated_date: '2026-10-10', generated_at: '2026-10-10T07:41:39.625Z' },
  '2026-10-10T07:43:23.542Z', // the pricing-history run that banked the day
);
ok('THE REAL CASE: 10-10 banked against the 10-09 payload is FROZEN', frozen.level === 'frozen');
ok('…and it reports exactly one date boundary crossed', frozen.days_spanned === 1);
ok('…and roughly 20 hours unchanged', frozen.hours_unchanged !== null && frozen.hours_unchanged > 19 && frozen.hours_unchanged < 21);
ok('…and its sentence says the zero is inherited, not observed', /inherited, not observed/.test(describeUpstream(frozen)));

const second = judgeUpstream(META_0909, '2026-10-09T14:30:10.567Z');
ok(
  'the SECOND RUN OF THE SAME DAY is current, not frozen — this is the cry-wolf guard',
  second.level === 'current' && second.days_spanned === 0,
);
ok('…and its sentence calls that normal', /normal for a second daily run/.test(describeUpstream(second)));

const sameInstant = judgeUpstream(META_0909, '2026-10-09T11:50:22.792Z');
ok('a payload judged at the instant it was first seen is current', sameInstant.level === 'current');
ok('…with 0 hours unchanged, which is a measured 0 and not a fabricated one', sameInstant.hours_unchanged === 0);

// 23:59 -> 00:01 is 2 minutes but a new banked day. The capture keys on the UTC
// date, so the date boundary is the thing that matters, not the elapsed hours.
const acrossMidnight = judgeUpstream(
  { ...META_0909, source_first_seen_at: '2026-10-09T23:59:00.000Z' },
  '2026-10-10T00:01:00.000Z',
);
ok('two minutes ACROSS midnight is frozen — the date boundary is the signal', acrossMidnight.level === 'frozen');
ok('…reported as 1 day spanned', acrossMidnight.days_spanned === 1);
const longDayNoBoundary = judgeUpstream(
  { ...META_0909, source_first_seen_at: '2026-10-09T00:01:00.000Z' },
  '2026-10-09T23:59:00.000Z',
);
ok('…while 24h WITHIN one UTC day is not', longDayNoBoundary.level === 'current');

const threeDays = judgeUpstream(
  { ...META_0909, source_first_seen_at: '2026-10-08T07:00:00.000Z' },
  '2026-10-11T07:00:00.000Z',
);
ok('the verdict escalates with the day count rather than saturating', threeDays.days_spanned === 3);
ok('…and pluralises honestly', /3 UTC date boundaries/.test(describeUpstream(threeDays)));

// ── judgeUpstream: unknown is unknown, in both directions ─────────────────

const legacy = judgeUpstream(LEGACY_META, '2026-10-11T05:42:00.000Z');
ok('a deploy predating the fingerprint is UNKNOWN, not fresh', legacy.level === 'unknown');
ok('…and days_spanned is null, NEVER 0 — this is the recurring bug', legacy.days_spanned === null);
ok('…and hours_unchanged is null too', legacy.hours_unchanged === null);
ok('…and it says so out loud', /provenance unknown/.test(describeUpstream(legacy)));
ok(
  '…and names the reason as a missing fingerprint, so the reader knows to look at the deploy',
  legacy.level === 'unknown' && /no upstream fingerprint/.test(legacy.reason),
);
ok(
  'a malformed block is unknown and says it is malformed, not missing',
  (() => {
    const v = judgeUpstream({ ...META_0909, source_sha256: 'garbage' }, '2026-10-11T05:42:00.000Z');
    return v.level === 'unknown' && /unreadable/.test(v.reason);
  })(),
);
ok('null meta is unknown', judgeUpstream(null, '2026-10-11T05:42:00.000Z').level === 'unknown');
ok(
  'an unparseable caller clock is unknown, not frozen',
  judgeUpstream(META_0909, 'tomorrow').level === 'unknown',
);
ok(
  'a stamp in the FUTURE is refused rather than reported as negative staleness',
  (() => {
    const v = judgeUpstream({ ...META_0909, source_first_seen_at: '2026-12-01T00:00:00.000Z' }, '2026-10-11T05:42:00.000Z');
    return v.level === 'unknown' && /future/.test(v.reason);
  })(),
);
ok(
  'describeUpstream never asserts freshness on an unknown verdict',
  !/normal|identical/.test(describeUpstream(legacy)),
);

// ── The writer must not drift from the rule tested above ──────────────────
//
// parse-feed.js is plain CommonJS and cannot import this TS module, so the
// carry-forward rule exists twice: here, where it is tested, and inline in
// parse-feed, where it runs. That is a second copy of a centralised helper —
// the exact shape O-26 says to grep for — and the capture path is the one place
// I will not add a transpile dependency to remove it. So the duplication stays
// and is GUARDED instead: these assertions read parse-feed's source and fail if
// the writer stops stamping all three fields or stops carrying the stamp
// forward conditionally.
//
// Comments are stripped first. A guard of this exact kind went red on its own
// explanatory comment on 2026-09-11 and again on 2026-10-10; it is written down
// in both places, so doing it a third time would be a choice.

const parseFeedSource = (() => {
  const raw = readFileSync(path.join(process.cwd(), 'parse-feed.js'), 'utf8');
  return raw
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map((l) => l.replace(/(^|\s)\/\/.*$/, '$1'))
    .join('\n');
})();

const metaWriteBlock = (() => {
  const i = parseFeedSource.indexOf("const META = 'public/feed-meta.json'");
  return i < 0 ? '' : parseFeedSource.slice(i, i + 2500);
})();

ok('parse-feed.js still has the feed-meta write block', metaWriteBlock.length > 0);
ok('…and still hashes the raw payload with sha256', /createHash\('sha256'\)\s*\.update\(xml\)/.test(metaWriteBlock));
ok('…and measures the payload in bytes, not characters', /Buffer\.byteLength\(xml\)/.test(metaWriteBlock));
ok('…and writes source_first_seen_at', /source_first_seen_at:/.test(metaWriteBlock));
ok(
  '…and carries the stamp forward CONDITIONALLY, not unconditionally',
  /source_first_seen_at:\s*carriedForward\s*\?\s*prevSeen\s*:\s*nowIso/.test(metaWriteBlock),
);
ok(
  '…and gates the carry-forward on the hash matching',
  /prevSha\s*===\s*fingerprint\.source_sha256/.test(metaWriteBlock),
);
// The assertion above passed while `const prevSha = null` made the carry-forward
// unreachable: it proved the COMPARISON exists, not that it compares anything
// real. Caught by actually reintroducing the bug rather than by reading the
// test. Both halves of the comparison now have to come from somewhere.
ok(
  '…and both sides of that comparison are real: prevSha is read off the previous meta',
  /prevSha\s*=\s*prevMeta\s*&&[^;]*prevMeta\.source_sha256/.test(metaWriteBlock),
);
ok(
  '…and prevSeen is read off the previous meta too',
  /prevSeen\s*=\s*prevMeta\s*&&[^;]*prevMeta\.source_first_seen_at/.test(metaWriteBlock),
);
ok(
  '…and refuses a prior stamp that will not parse, rather than writing Invalid Date',
  /Number\.isFinite\(Date\.parse\(prevSeen\)\)/.test(metaWriteBlock),
);
ok(
  '…and reads the previous meta behind a catch that yields null, not {}',
  /catch\s*\{\s*return null;\s*\}/.test(metaWriteBlock),
);

console.log('');
if (failures.length) {
  console.log(`FAILED — ${passed} passed, ${failures.length} failed`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`ALL PASS — ${passed} passed, 0 failed`);
