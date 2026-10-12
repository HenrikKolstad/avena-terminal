/**
 * scripts/report-upstream-provenance.ts
 *
 * Can tonight's book tell us anything new, and is the upstream still alive?
 *
 * Run by the nightly workflow immediately after parse-feed, and safe to run by
 * hand against any checkout. It reads the two provenance blocks parse-feed
 * stamps into public/feed-meta.json and grades them with
 * src/lib/feed-provenance.ts.
 *
 * WHY IT EXISTS. On 2026-10-10 the capture was flawless and the day was empty:
 * the book was byte-identical to 2026-10-09's, three pricing-history runs agreed
 * on `moves_detected: 0`, and public/open-data/movement-ledger.csv published
 * `2026-10-10,2039,0,0,,0,0` to the site, the avena-data mirror and (once the
 * token lands) Hugging Face. Nothing could say whether the coast was quiet or
 * the upstream had not refreshed.
 *
 * WHY IT WAS REWRITTEN ON 2026-10-12. The first version graded the RAW PAYLOAD
 * hash — and the first day of real data showed RedSP serves a different hash on
 * every fetch with the byte length unchanged (08:15 1422f2d9… and 11:21
 * 06ced78b…, both 97,801,138 bytes, both parsing to the same book). So the
 * first-seen stamp reset every run and the `frozen` verdict was unreachable:
 * the instrument could only ever report health. It now grades the OBSERVABLE
 * CONTENT — the sorted {ref → price} map, which is what every row the moat
 * banks is a function of — and keeps the payload hash as a second, independent
 * axis for whether the upstream is regenerating at all.
 *
 * EXIT CODES, and the reasoning behind each:
 *   0  current  — the map changed today. New facts in the book; stay quiet.
 *   0  quiet    — the map is 1–2 days old. Nine of the ledger's 68 days are
 *                 genuine zero days and the longest run is two, so this is
 *                 annotated for the record, not escalated. An alarm that fires
 *                 most weekends is an alarm nobody reads.
 *   0  unusual  — 3 unchanged days: longer than any run in the ledger, but one
 *                 day short of the criterion pre-registered on 2026-10-11.
 *                 Warning annotation, deliberately still green.
 *   1  stalled  — 4+ unchanged days (no precedent anywhere in the series), or a
 *                 byte-identical payload across 2+ UTC boundaries, which means
 *                 we cannot verify the quiet at all and may be reading a cached
 *                 file. The moat is accumulating empty days, which is the
 *                 failure the whole pipeline exists to avoid.
 *   1  unknown  — parse-feed is supposed to have just written both stamps. If
 *                 one is missing or malformed the instrument is broken, and a
 *                 broken instrument reporting nothing is exactly the shape this
 *                 project keeps getting bitten by. Loud beats silent.
 *
 * It never fails the capture: the workflow runs it with continue-on-error, and
 * the re-raise gate fires only after the feed, the commit, the corpus and every
 * write have landed.
 */

import { readFileSync } from 'fs';
import path from 'path';
import {
  CONTENT_RED_DAYS,
  describeUpstream,
  judgeUpstream,
  readContentProvenance,
  readProvenance,
  type FeedMetaShape,
} from '../src/lib/feed-provenance';

const META = path.join(process.cwd(), 'public', 'feed-meta.json');

function loadMeta(): { meta: FeedMetaShape | null; readError: string | null } {
  try {
    const parsed: unknown = JSON.parse(readFileSync(META, 'utf8'));
    if (!parsed || typeof parsed !== 'object') return { meta: null, readError: 'feed-meta.json is not an object' };
    return { meta: parsed as FeedMetaShape, readError: null };
  } catch (e) {
    return { meta: null, readError: e instanceof Error ? e.message : String(e) };
  }
}

/** GitHub Actions annotation, harmless noise anywhere else. */
function annotate(level: 'warning' | 'error', title: string, message: string): void {
  // Annotation values are one-line; a newline would truncate the rest silently.
  const flat = message.replace(/\s+/g, ' ').trim();
  console.log(`::${level} title=${title}::${flat}`);
}

const { meta, readError } = loadMeta();
if (readError) {
  annotate('error', 'Upstream feed provenance unreadable', `public/feed-meta.json could not be read: ${readError}`);
  console.error(`FAIL — ${readError}`);
  process.exit(1);
}

const verdict = judgeUpstream(meta, new Date().toISOString());
const payload = readProvenance(meta);
const content = readContentProvenance(meta);
const sentence = describeUpstream(verdict);

console.log(`feed-meta.json  generated_date=${String(meta?.generated_date ?? 'unknown')} listings=${String(meta?.listings ?? 'unknown')}`);
if (content) {
  console.log(
    `observable content sha256=${content.content_sha256.slice(0, 16)}… refs=${content.content_refs} ` +
      `first_seen=${content.content_first_seen_at}`,
  );
} else {
  console.log('observable content  NO USABLE FINGERPRINT');
}
if (payload) {
  console.log(
    `raw payload       sha256=${payload.source_sha256.slice(0, 16)}… bytes=${payload.source_bytes} ` +
      `first_seen=${payload.source_first_seen_at}`,
  );
} else {
  console.log('raw payload       NO USABLE FINGERPRINT');
}
console.log(
  `verdict: ${verdict.level} (content_days=${String(verdict.content_days)} payload_days=${String(verdict.payload_days)} ` +
    `liveness=${verdict.liveness} zeros_inherited=${verdict.zeros_inherited}) — ${sentence}`,
);

if (verdict.level === 'unknown') {
  annotate(
    'error',
    'The book was not fingerprinted',
    `${sentence}. parse-feed.js writes content_sha256 / content_refs / content_first_seen_at alongside the ` +
      `payload hash; without them a frozen upstream and a quiet market are the same observation, and the ` +
      `open-data movement ledger publishes the second when it means the first.`,
  );
  process.exit(1);
}

if (verdict.level === 'current') {
  console.log('OK — the observable map moved today; this book carries new facts.');
  process.exit(0);
}

if (verdict.level === 'stalled') {
  annotate(
    'error',
    verdict.liveness === 'byte_identical'
      ? `Upstream payload byte-identical across ${verdict.payload_days} days`
      : `Observable market data unchanged for ${verdict.content_days} days`,
    `${sentence}. Check whether RedSP is still regenerating the file before trusting any zero in the movement ` +
      `ledger for those days. Red at ${CONTENT_RED_DAYS} unchanged days is the criterion pre-registered on ` +
      `2026-10-11, from a ledger whose longest genuine zero run is two days.`,
  );
  console.error(
    `FAIL — stalled (content unchanged ${String(verdict.content_days)} days, payload ${verdict.liveness})`,
  );
  process.exit(1);
}

annotate(
  'warning',
  verdict.level === 'unusual'
    ? `Observable market data unchanged for ${verdict.content_days} days`
    : 'Observable market data unchanged across a date boundary',
  `${sentence}. ${
    verdict.level === 'unusual'
      ? `This is longer than any zero run in the ledger (maximum two), and one day short of red at ${CONTENT_RED_DAYS}.`
      : 'One or two unchanged calendar days is plausible market quiet, so this is on the record rather than red.'
  }`,
);
console.log(`OK (warned) — ${verdict.level}: recorded, not escalated.`);
