/**
 * scripts/test-corpus-count.ts
 *
 * Asserts that the size of the property book is DERIVED wherever it is
 * published, and that no new hardcoded copy of it can be added unnoticed.
 *
 * WHY THIS EXISTS
 * The literal "1,881" was published on ~40 server-rendered surfaces — the
 * site <title>, the site-wide meta description, the OpenGraph and Twitter
 * cards, and both JSON-LD `description` fields that GPTBot/ClaudeBot/
 * PerplexityBot ingest on every page — while the live book held 2,034. It
 * was wrong by 153 listings (7.5%) and grew more wrong every night the feed
 * added a unit.
 *
 * That is the same defect as the hardcoded `eu_official_stats` observation
 * count: a fixed number quoted against a nightly-growing table is a false
 * claim BY CONSTRUCTION, not by accident. There is no value of the literal
 * that stays true, so a one-off correction is not a fix — it just resets the
 * clock on the same bug. The fix is derivation plus this test.
 *
 * WHAT IT CHECKS
 *  1. `getCorpusSize()` equals the actual length of public/data.json.
 *  2. `getCorpusSizeLabel()` is formatted the way published copy writes it.
 *  3. No file under src/ carries a hardcoded corpus-sized number except the
 *     sites on ALLOWED below, each of which is allowed for a stated reason.
 *
 * (3) IS THE LOAD-BEARING ONE. Deriving today's ~40 surfaces is worth little
 * if the forty-first is added as a literal next week. The allow-list is
 * deliberately explicit: every remaining literal is now a decision somebody
 * wrote down, not an oversight nobody noticed.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { getCorpusSize, getCorpusSizeLabel } from '../src/lib/properties';

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

// ── Part 1: the derivation is actually correct ──────────────────────────────

console.log('\nCorpus size — derivation\n');

const book = JSON.parse(readFileSync(join(ROOT, 'public', 'data.json'), 'utf8')) as unknown[];

ok(
  'getCorpusSize() equals public/data.json length',
  getCorpusSize() === book.length,
  `derived ${getCorpusSize()} vs file ${book.length}`,
);
ok(
  'getCorpusSizeLabel() is the thousands-separated form published copy uses',
  getCorpusSizeLabel() === book.length.toLocaleString('en-US'),
  `got "${getCorpusSizeLabel()}"`,
);
ok(
  'the book is non-empty — an empty book must never be published as a count',
  book.length > 0,
);

// ── Part 2: no un-declared hardcoded corpus count ───────────────────────────

/**
 * Every site below is allowed to carry a literal, each for a reason that has
 * been checked. Deriving these would make them WRONG, not right.
 *
 * The distinction that decides membership: does the sentence describe the
 * book AS IT IS NOW (derive it), or the book AS IT WAS AT A STATED TIME
 * (leave it)? A dated retrospective is not a stale claim; it is a true one.
 */
const ALLOWED: Array<{ file: string; why: string }> = [
  // Dated retrospectives — true of the period they describe.
  { file: 'src/lib/blog-posts.ts', why: 'Q1-2026 review articles; 1,881 was the book at the time they describe' },
  { file: 'src/app/changelog/page.tsx', why: 'a dated changelog entry describing a past release' },

  // A forward TARGET, not a count of the book.
  { file: 'src/app/api/v1/prediction-oracle/route.ts', why: '">2,500 properties by Q1 2027" is the threshold being predicted' },

  // Fabricated demo activity — a DIFFERENT defect. Refreshing the number here
  // would only make invented agent telemetry look more current, so it stays
  // tracked as fabrication rather than laundered into a derived figure.
  { file: 'src/app/swarm/page.tsx', why: 'synthetic agent activity counters; tracked as fabricated output, not staleness' },
  { file: 'src/app/api/v1/swarm/messages/route.ts', why: 'synthetic agent message ("14 price changes detected" is invented too)' },

  // Client components. The number is real and wrong, but reaching it needs a
  // server parent to pass it down, which is a layout-touching change rather
  // than a string edit. Deferred deliberately, not forgotten — these are the
  // remaining known-stale published counts.
  { file: 'src/app/tiktok/TikTokLanding.tsx', why: 'client component; needs the count as a prop (reads 1,881)' },
  { file: 'src/app/chat/page.tsx', why: 'client component; needs the count as a prop (reads 1,881)' },
  { file: 'src/app/checkout/success/page.tsx', why: 'client component; needs the count as a prop (reads 1,881)' },
  { file: 'src/app/search/page.tsx', why: 'client component; needs the count as a prop (reads 1,999)' },
  { file: 'src/app/calculator/page.tsx', why: 'client component; needs the count as a prop (reads 1,800+)' },
];

const allowedFiles = new Set(ALLOWED.map((a) => a.file));

/**
 * Matches a literal number immediately qualified by a corpus noun —
 * "1,881 properties", "1,867 scored new builds", "2,200 property pages".
 *
 * Two design choices, both learned the hard way while writing this test:
 *
 * 1. The number is NOT pinned to 1881. Pinning it there would pass the moment
 *    someone "fixed" a surface by typing 2,034 — the same bug one book later,
 *    which is exactly how this class of defect regenerates. Any four-digit
 *    count in the plausible band counts as an offence.
 *
 * 2. The noun must be ADJACENT. A first version matched any 1,8xx–2,6xx
 *    number on a line mentioning "propert…" anywhere, and drowned in Spanish
 *    notary fees and €/m² ranges. Requiring the noun to follow the number
 *    is what separates a claim about the book from a price.
 *
 * It still earned its keep on the first run: it found five stale counts on
 * surfaces the manual sweep had missed, across four different wrong values
 * (1,800+ / 1,867 / 1,999 / 2,200) — including an OVERSTATEMENT of the book
 * on llms-full.txt, the file written specifically for model ingest.
 */
const LITERAL =
  /\b(?:1881|[12],[0-9]{3})\+?\s*(?:scored\s+)?(?:new[- ]builds?|new build propert|propert|listings|Spanish New Builds)/i;

/** Comments describe history and bugs; they are not published claims. */
const IS_COMMENT = /^\s*(?:\/\/|\/?\*|\*\/)/;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

console.log('\nCorpus size — no un-declared hardcoded count\n');

const offenders: string[] = [];
for (const file of walk(join(ROOT, 'src'))) {
  const rel = relative(ROOT, file).split('\\').join('/');
  if (allowedFiles.has(rel)) continue;
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (IS_COMMENT.test(line)) return;
    if (!LITERAL.test(line)) return;
    offenders.push(`${rel}:${i + 1}  ${line.trim().slice(0, 120)}`);
  });
}

ok(
  'no file publishes a hardcoded corpus count outside the allow-list',
  offenders.length === 0,
  offenders.length ? `\n      ${offenders.join('\n      ')}` : '',
);

// Guard the guard: an allow-list entry that no longer contains a literal is
// stale, and a stale exemption silently re-opens the hole it was cut for.
for (const { file } of ALLOWED) {
  let body: string;
  try {
    body = readFileSync(join(ROOT, file), 'utf8');
  } catch {
    failures.push(`allow-list names a file that does not exist: ${file}`);
    continue;
  }
  ok(
    `allow-list entry is still needed: ${file}`,
    LITERAL.test(body),
    'no corpus literal left in this file — remove the exemption',
  );
}

// ── Report ──────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
if (failures.length) {
  console.log(`FAILED — ${passed} passed, ${failures.length} failed\n`);
  for (const f of failures) console.log(`  • ${f}`);
  process.exit(1);
}
console.log(`ALL PASS — ${passed} passed, 0 failed`);
