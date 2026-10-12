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

import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';
import {
  CONTENT_RED_DAYS,
  CONTENT_UNPRECEDENTED_DAYS,
  PAYLOAD_RED_DAYS,
  carryForwardContent,
  carryForwardProvenance,
  contentLines,
  describeUpstream,
  judgeUpstream,
  readContentProvenance,
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

// ── The content axis: fixtures from the REAL 10-09 → 10-12 run ─────────────
//
// The deployed book on 2026-10-12 is byte-identical to the one committed at
// 2026-10-09T11:50:26Z (both sha256 e44c31c6…, verified against the git blob),
// and the 10-09 07:57 book is a different one (01d8ebf6…). Its observable
// {ref → price} map hashes to fe0834fd… over 2,039 refs. Those are measurements,
// not invented fixtures, and CONTENT_0909 below is the real seed written into
// public/feed-meta.json.

const CONTENT_A = 'fe0834fd8839bfab5c8f6da43ecf2d202b5153760f37bc23199b42231e7b5b7c';
const CONTENT_B = 'c'.repeat(64);

/** The real seed: the map first seen in the 10-09 11:50 book. */
const CONTENT_0909: FeedMetaShape = {
  ...META_0909,
  content_sha256: CONTENT_A,
  content_refs: 2039,
  content_first_seen_at: '2026-10-09T11:50:22.792Z',
};

/** The payload hash RedSP served at 11:21 — a NEW payload, the SAME map. */
const REGENERATED: FeedMetaShape = {
  ...CONTENT_0909,
  source_sha256: SHA_B,
  source_first_seen_at: '2026-10-11T11:21:50.722Z',
};

// ── readContentProvenance: same all-or-nothing rule as the payload block ──

ok('a legacy meta has no content block', readContentProvenance(LEGACY_META) === null);
ok('a payload-only meta has no content block', readContentProvenance(META_0909) === null);
ok('a complete content block reads back', readContentProvenance(CONTENT_0909)?.content_sha256 === CONTENT_A);
ok('null meta reads as null', readContentProvenance(null) === null);
ok(
  'a content hash with no first-seen stamp is absent, not half-read',
  readContentProvenance({ ...META_0909, content_sha256: CONTENT_A, content_refs: 2039 }) === null,
);
ok(
  'a content stamp with no hash is absent',
  readContentProvenance({ ...META_0909, content_refs: 2039, content_first_seen_at: '2026-10-09T11:50:22.792Z' }) === null,
);
ok('a truncated content hash is rejected', readContentProvenance({ ...CONTENT_0909, content_sha256: 'abc' }) === null);
ok('an uppercase content hash is rejected', readContentProvenance({ ...CONTENT_0909, content_sha256: CONTENT_A.toUpperCase() }) === null);
ok('zero refs is rejected — an empty map is not a map', readContentProvenance({ ...CONTENT_0909, content_refs: 0 }) === null);
ok('negative refs is rejected', readContentProvenance({ ...CONTENT_0909, content_refs: -1 }) === null);
ok('a non-date content stamp is rejected', readContentProvenance({ ...CONTENT_0909, content_first_seen_at: 'sunday' }) === null);

// ── contentLines: the hash covers exactly what the capture banks ──────────

ok('contentLines pairs ref with price', contentLines([{ ref: 'N1', pf: 100 }])[0] === 'N1:100');
ok(
  'contentLines is order-independent — a reordered feed is not a changed market',
  contentLines([{ ref: 'N2', pf: 2 }, { ref: 'N1', pf: 1 }]).join('|') ===
    contentLines([{ ref: 'N1', pf: 1 }, { ref: 'N2', pf: 2 }]).join('|'),
);
ok(
  'a ref with no price is excluded — the snapshot write excludes it too',
  contentLines([{ ref: 'N1', pf: 0 }, { ref: 'N2' }, { ref: 'N3', pf: null }, { ref: 'N4', pf: 5 }]).length === 1,
);
ok('a priced row with no ref is excluded', contentLines([{ pf: 5 }]).length === 0);
ok('an empty ref string is excluded', contentLines([{ ref: '', pf: 5 }]).length === 0);
ok('a NaN price is excluded rather than hashed as a number', contentLines([{ ref: 'N1', pf: NaN }]).length === 0);
ok(
  'a PRICE CHANGE changes the lines — the whole point of the instrument',
  contentLines([{ ref: 'N1', pf: 100 }])[0] !== contentLines([{ ref: 'N1', pf: 101 }])[0],
);
ok(
  'an ARRIVAL changes the lines',
  contentLines([{ ref: 'N1', pf: 1 }]).length !== contentLines([{ ref: 'N1', pf: 1 }, { ref: 'N2', pf: 2 }]).length,
);

// ── carryForwardContent ───────────────────────────────────────────────────

ok(
  'an unchanged map KEEPS the first-seen stamp across a day',
  carryForwardContent(CONTENT_0909, { content_sha256: CONTENT_A, content_refs: 2039 }, '2026-10-10T07:41:39.625Z')
    .content_first_seen_at === '2026-10-09T11:50:22.792Z',
);
ok(
  'a changed map RESETS the stamp to now',
  carryForwardContent(CONTENT_0909, { content_sha256: CONTENT_B, content_refs: 2040 }, '2026-10-10T07:41:39.625Z')
    .content_first_seen_at === '2026-10-10T07:41:39.625Z',
);
ok(
  'a meta with no content block resets rather than back-dating',
  carryForwardContent(META_0909, { content_sha256: CONTENT_A, content_refs: 2039 }, '2026-10-12T07:00:00.000Z')
    .content_first_seen_at === '2026-10-12T07:00:00.000Z',
);
ok(
  'the written ref count is the NEW map, not the carried one',
  carryForwardContent(CONTENT_0909, { content_sha256: CONTENT_A, content_refs: 7 }, '2026-10-10T07:41:39.625Z')
    .content_refs === 7,
);
threw = false;
try { carryForwardContent(CONTENT_0909, { content_sha256: 'nope', content_refs: 1 }, '2026-10-10T00:00:00Z'); } catch { threw = true; }
ok('a bad content hash throws rather than writing a meaningless stamp', threw);
threw = false;
try { carryForwardContent(CONTENT_0909, { content_sha256: CONTENT_A, content_refs: 0 }, '2026-10-10T00:00:00Z'); } catch { threw = true; }
ok('a zero-ref map throws — an empty book is not a quiet market', threw);
threw = false;
try { carryForwardContent(CONTENT_0909, { content_sha256: CONTENT_A, content_refs: 1 }, 'not-a-date'); } catch { threw = true; }
ok('an unparseable now throws rather than stamping Invalid Date', threw);

// ── judgeUpstream: THE BUG THIS REWRITE EXISTS FOR ────────────────────────
//
// On 2026-10-11 RedSP served two different payload hashes with the byte length
// identical and the same book. Graded on the payload axis alone, the second run
// read `current` — and so would every run forever, because the hash changes on
// every fetch. The content axis has to see through that.

const regen = judgeUpstream(REGENERATED, '2026-10-11T11:22:43.000Z');
ok(
  'THE BUG: a NEW payload hash carrying an UNCHANGED map is not "current"',
  regen.level !== 'current',
);
ok('…it is quiet, with the map 2 days old', regen.level === 'quiet' && regen.content_days === 2);
ok('…and the payload axis separately reports the upstream as regenerating', regen.liveness === 'regenerating');
ok('…and payload_days is 0, which is true of the payload and says nothing about the map', regen.payload_days === 0);
ok('…and it states plainly that the zeros are inherited', regen.zeros_inherited === true);
ok('…in words', /inherited, not observed/.test(describeUpstream(regen)));
ok('…and credits the upstream for still regenerating', /still regenerating/.test(describeUpstream(regen)));

// The 10-10 case the original instrument was built for, now graded on content.
const d1 = judgeUpstream(CONTENT_0909, '2026-10-10T07:43:23.542Z');
ok('THE 10-10 CASE: one unchanged day is quiet', d1.level === 'quiet' && d1.content_days === 1);
ok('…and zeros_inherited is already true on day one', d1.zeros_inherited === true);

// A new map on the same day is the only thing that reads `current`.
const fresh = judgeUpstream(
  { ...CONTENT_0909, content_sha256: CONTENT_B, content_first_seen_at: '2026-10-12T07:30:00.000Z' },
  '2026-10-12T07:40:00.000Z',
);
ok('a map first seen today is current', fresh.level === 'current' && fresh.content_days === 0);
ok('…and current never claims inherited zeros', fresh.zeros_inherited === false);
ok('…and says the book carries new facts', /new facts/.test(describeUpstream(fresh)));

// The second run of the same day, with the map unchanged WITHIN the day.
const sameDaySecondRun = judgeUpstream(
  { ...CONTENT_0909, content_first_seen_at: '2026-10-12T07:30:00.000Z' },
  '2026-10-12T11:21:00.000Z',
);
ok(
  'the second run of a day whose map did not move again is current — the cry-wolf guard',
  sameDaySecondRun.level === 'current',
);

// 23:59 → 00:01 is two minutes but a new banked day.
const acrossMidnight = judgeUpstream(
  { ...CONTENT_0909, content_first_seen_at: '2026-10-09T23:59:00.000Z' },
  '2026-10-10T00:01:00.000Z',
);
ok('two minutes ACROSS midnight is quiet, not current — the date boundary is the signal', acrossMidnight.level === 'quiet');
ok('…reported as 1 day', acrossMidnight.content_days === 1);
const longDayNoBoundary = judgeUpstream(
  { ...CONTENT_0909, content_first_seen_at: '2026-10-09T00:01:00.000Z' },
  '2026-10-09T23:59:00.000Z',
);
ok('…while 24h WITHIN one UTC day is not', longDayNoBoundary.level === 'current');

// ── The escalation ladder, set from the measured base rate ────────────────
//
// Nine of the ledger's 68 days are genuine zero days and the longest run is
// two, so two stays quiet, three is unusual, four is red. Four was written down
// in prose on 2026-10-11 ("the real test is Tuesday 2026-10-13") BEFORE the
// data that would decide it; pinning it here is what stops it being quietly
// relaxed on the morning it fires.

function atDays(n: number): ReturnType<typeof judgeUpstream> {
  // first seen 10-09T12:00Z, judged n days later at the same hour
  const seen = Date.parse('2026-10-09T12:00:00.000Z');
  return judgeUpstream(
    { ...REGENERATED, content_first_seen_at: new Date(seen).toISOString(), source_first_seen_at: new Date(seen + n * 86_400_000).toISOString() },
    new Date(seen + n * 86_400_000).toISOString(),
  );
}
ok('0 unchanged days → current', atDays(0).level === 'current');
ok('1 unchanged day → quiet (precedented: nine such days in 68)', atDays(1).level === 'quiet');
ok('2 unchanged days → quiet (the ledger has two such runs)', atDays(2).level === 'quiet');
ok('3 unchanged days → unusual (longer than any run on record)', atDays(3).level === 'unusual');
ok('…and says so, naming the ledger maximum', /LONGER THAN ANY RUN/.test(describeUpstream(atDays(3))));
ok('4 unchanged days → STALLED (the criterion pre-registered on 2026-10-11)', atDays(4).level === 'stalled');
ok('5 unchanged days → still stalled, not saturated into silence', atDays(5).level === 'stalled');
ok('…and the ladder is driven by the exported constants, not by magic numbers', CONTENT_RED_DAYS === 4 && CONTENT_UNPRECEDENTED_DAYS === 3);

// ── The liveness axis can go red on its own ───────────────────────────────
//
// Content unchanged AND the payload byte-identical across two boundaries means
// we cannot verify the quiet at all. The same origin refused our egress outright
// on 2026-10-11, so "RedSP stopped regenerating" is not a hypothetical.

// AND THE DISCRIMINATOR THAT KEEPS IT FROM CRYING WOLF, which the first draft
// of this rewrite got wrong and the live run caught within the hour: a grader
// reading the DEPLOYED book before the day's feed has landed holds a day-old
// payload stamp for the trivial reason that nobody has asked RedSP yet. That is
// `not_refetched` and it is not evidence of anything. Only a stamp we re-fetched
// PAST — generated_at strictly later than source_first_seen_at, which parse-feed
// produces exactly when the bytes came back identical — is `byte_identical`.

/** We asked again on 10-13 and were handed the same bytes first seen on 10-11. */
const refetchedIdentical: FeedMetaShape = {
  ...CONTENT_0909,
  content_first_seen_at: '2026-10-11T07:00:00.000Z',
  source_first_seen_at: '2026-10-11T07:00:00.000Z',
  generated_at: '2026-10-13T07:00:00.000Z',
};
const cached = judgeUpstream(refetchedIdentical, '2026-10-13T07:00:00.000Z');
ok('a RE-FETCHED byte-identical payload across 2 boundaries is STALLED even at 2 content days', cached.level === 'stalled');
ok('…reported as byte_identical, never as regenerating', cached.liveness === 'byte_identical');
ok('…and its sentence raises the cached-file possibility', /cached file/.test(describeUpstream(cached)));
ok(
  'one byte-identical boundary is NOT red on its own — that is a normal overnight carry',
  judgeUpstream({ ...refetchedIdentical, generated_at: '2026-10-12T07:00:00.000Z' }, '2026-10-12T07:00:00.000Z')
    .level === 'quiet',
);
ok('PAYLOAD_RED_DAYS drives that, not a literal', PAYLOAD_RED_DAYS === 2);

/** Same stamps, but the last fetch IS the one that set them. */
const notRefetched = judgeUpstream(
  {
    ...CONTENT_0909,
    content_first_seen_at: '2026-10-11T07:00:00.000Z',
    source_first_seen_at: '2026-10-11T07:00:00.000Z',
    generated_at: '2026-10-11T07:00:00.000Z',
  },
  '2026-10-13T07:00:00.000Z',
);
ok(
  'THE CRY-WOLF GUARD: a stamp that is old only because nobody re-fetched is not_refetched',
  notRefetched.liveness === 'not_refetched',
);
ok(
  '…and it does NOT go red on the payload axis, however many boundaries old it is',
  notRefetched.level === 'quiet',
);
ok(
  '…and its sentence refuses to draw a conclusion from it',
  /says nothing about the upstream either way/.test(describeUpstream(notRefetched)),
);
ok(
  '…and never mentions a cached file, which would be a claim it cannot support',
  !/cached file/.test(describeUpstream(notRefetched)),
);
ok(
  'a fetch TODAY that returned new bytes is regenerating',
  judgeUpstream(
    { ...CONTENT_0909, source_first_seen_at: '2026-10-12T07:30:00.000Z', generated_at: '2026-10-12T07:30:00.000Z' },
    '2026-10-12T07:40:00.000Z',
  ).liveness === 'regenerating',
);
ok(
  'an unparseable generated_at leaves liveness unknown rather than guessing which it was',
  judgeUpstream(
    {
      ...CONTENT_0909,
      content_first_seen_at: '2026-10-11T07:00:00.000Z',
      source_first_seen_at: '2026-10-11T07:00:00.000Z',
      generated_at: 'whenever',
    },
    '2026-10-13T07:00:00.000Z',
  ).liveness === 'unknown',
);
ok(
  'a MISSING generated_at leaves liveness unknown too',
  (() => {
    const m = { ...CONTENT_0909, content_first_seen_at: '2026-10-11T07:00:00.000Z', source_first_seen_at: '2026-10-11T07:00:00.000Z' } as Record<string, unknown>;
    delete m.generated_at;
    return judgeUpstream(m as FeedMetaShape, '2026-10-13T07:00:00.000Z').liveness === 'unknown';
  })(),
);

// ── unknown is unknown, in both directions ────────────────────────────────

const legacy = judgeUpstream(LEGACY_META, '2026-10-12T05:42:00.000Z');
ok('a deploy predating the content fingerprint is UNKNOWN, not fresh', legacy.level === 'unknown');
ok('…and content_days is null, NEVER 0 — this is the recurring bug', legacy.content_days === null);
ok('…and payload_days is null too', legacy.payload_days === null);
ok('…and liveness is unknown, not regenerating', legacy.liveness === 'unknown');
ok('…and it does NOT claim inherited zeros it cannot see', legacy.zeros_inherited === false);
ok('…and it says so out loud', /provenance unknown/.test(describeUpstream(legacy)));
ok(
  '…and names the reason as a missing fingerprint, so the reader knows to look at the deploy',
  /no content fingerprint/.test(legacy.reason ?? ''),
);
ok(
  'A PAYLOAD-ONLY META IS UNKNOWN — the old block alone cannot answer the question',
  judgeUpstream(META_0909, '2026-10-12T05:42:00.000Z').level === 'unknown',
);
ok(
  'a malformed content block is unknown and says it is malformed, not missing',
  (() => {
    const v = judgeUpstream({ ...CONTENT_0909, content_sha256: 'garbage' }, '2026-10-12T05:42:00.000Z');
    return v.level === 'unknown' && /unreadable/.test(v.reason ?? '');
  })(),
);
ok('null meta is unknown', judgeUpstream(null, '2026-10-12T05:42:00.000Z').level === 'unknown');
ok('an unparseable caller clock is unknown, not quiet', judgeUpstream(CONTENT_0909, 'tomorrow').level === 'unknown');
ok(
  'a content stamp in the FUTURE is refused rather than reported as negative staleness',
  (() => {
    const v = judgeUpstream({ ...CONTENT_0909, content_first_seen_at: '2026-12-01T00:00:00.000Z' }, '2026-10-12T05:42:00.000Z');
    return v.level === 'unknown' && /future/.test(v.reason ?? '');
  })(),
);
ok(
  'a content block with a MALFORMED payload block still grades the content, with liveness unknown',
  (() => {
    const v = judgeUpstream({ ...CONTENT_0909, source_sha256: 'garbage' }, '2026-10-12T05:42:00.000Z');
    return v.level === 'unusual' && v.liveness === 'unknown' && v.payload_days === null;
  })(),
);
ok(
  '…and describes the liveness as unknown rather than implying health',
  /upstream liveness is unknown/.test(
    describeUpstream(judgeUpstream({ ...CONTENT_0909, source_sha256: 'garbage' }, '2026-10-12T05:42:00.000Z')),
  ),
);
ok(
  'a payload stamp in the future leaves liveness unknown rather than inventing a day count',
  (() => {
    const v = judgeUpstream({ ...CONTENT_0909, source_first_seen_at: '2026-12-01T00:00:00.000Z' }, '2026-10-12T05:42:00.000Z');
    return v.liveness === 'unknown' && v.payload_days === null;
  })(),
);
ok(
  'describeUpstream never asserts freshness on an unknown verdict',
  !/new facts|still regenerating/.test(describeUpstream(legacy)),
);

// ── THE CROSS-IMPLEMENTATION GUARD ────────────────────────────────────────
//
// parse-feed.js is plain CommonJS and cannot import the TypeScript above, so
// the content hash exists twice. If the two ever drift, every verdict becomes
// nonsense while still looking like a measurement. So recompute it here over
// the COMMITTED book and compare it to what parse-feed actually wrote into
// feed-meta.json. This is the one assertion in the file that tests the real
// artifact rather than a fixture.

const liveMeta: FeedMetaShape = JSON.parse(readFileSync(path.join(process.cwd(), 'public', 'feed-meta.json'), 'utf8'));
const liveBook: Array<{ ref?: unknown; pf?: unknown }> = JSON.parse(
  readFileSync(path.join(process.cwd(), 'public', 'data.json'), 'utf8'),
);
const liveProv = readContentProvenance(liveMeta);
ok('the committed feed-meta.json carries a readable content fingerprint', liveProv !== null);
if (liveProv) {
  const lines = contentLines(liveBook);
  const recomputed = createHash('sha256').update(lines.join('\n')).digest('hex');
  ok(
    'THE TWO IMPLEMENTATIONS AGREE on the committed book — parse-feed.js and feed-provenance.ts',
    recomputed === liveProv.content_sha256,
    `meta=${liveProv.content_sha256.slice(0, 16)}… recomputed=${recomputed.slice(0, 16)}…`,
  );
  ok(
    '…and on the ref count',
    lines.length === liveProv.content_refs,
    `meta=${liveProv.content_refs} recomputed=${lines.length}`,
  );
}

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
  return i < 0 ? '' : parseFeedSource.slice(i, i + 5000);
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


// ── …and the same guards for the content block added 2026-10-12 ───────────
//
// The content hash is the half that can actually detect a freeze, so if the
// writer stops computing it the instrument silently reverts to the version that
// could only report health.

ok('…and hashes the observable content, not the payload, for the content block',
  /content_sha256:\s*require\('crypto'\)\.createHash\('sha256'\)\.update\(contentLines\.join/.test(metaWriteBlock));
ok('…and builds those lines as ref:price pairs', /\$\{p\.ref\}:\$\{p\.pf\}/.test(metaWriteBlock));
ok('…and SORTS them, so a reordered feed is not a changed market', /\.map\([^)]*\)\s*\.sort\(\)/.test(metaWriteBlock));
ok('…and excludes unpriced rows, matching the snapshot write', /p\.pf\s*>\s*0/.test(metaWriteBlock));
ok('…and excludes rows with no ref', /typeof p\.ref === 'string'/.test(metaWriteBlock));
ok('…and writes content_refs so the hash can be checked against a count', /content_refs:\s*contentLines\.length/.test(metaWriteBlock));
ok('…and writes content_first_seen_at', /content_first_seen_at:/.test(metaWriteBlock));
ok(
  '…and carries the CONTENT stamp forward conditionally, not unconditionally',
  /content_first_seen_at:\s*contentCarriedForward\s*\?\s*prevContentSeen\s*:\s*nowIso/.test(metaWriteBlock),
);
ok(
  '…and gates that on the content hash matching',
  /prevContentSha\s*===\s*contentFingerprint\.content_sha256/.test(metaWriteBlock),
);
// Both halves of that comparison have to come from somewhere real — the
// 2026-10-11 lesson, where `const prevSha = null` left an asserted comparison
// comparing nothing.
ok(
  '…with prevContentSha read off the previous meta',
  /prevContentSha\s*=\s*prevMeta\s*&&[^;]*prevMeta\.content_sha256/.test(metaWriteBlock),
);
ok(
  '…and prevContentSeen read off the previous meta too',
  /prevContentSeen\s*=\s*prevMeta\s*&&[^;]*prevMeta\.content_first_seen_at/.test(metaWriteBlock),
);
ok(
  '…and refuses a prior content stamp that will not parse',
  /Number\.isFinite\(Date\.parse\(prevContentSeen\)\)/.test(metaWriteBlock),
);

console.log('');
if (failures.length) {
  console.log(`FAILED — ${passed} passed, ${failures.length} failed`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`ALL PASS — ${passed} passed, 0 failed`);
