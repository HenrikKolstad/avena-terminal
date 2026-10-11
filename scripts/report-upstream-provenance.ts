/**
 * scripts/report-upstream-provenance.ts
 *
 * Did tonight's book come from a payload RedSP actually regenerated?
 *
 * Run by the nightly workflow immediately after parse-feed, and safe to run by
 * hand against any checkout. It reads the provenance block parse-feed stamps
 * into public/feed-meta.json and grades it with src/lib/feed-provenance.ts.
 *
 * WHY IT EXISTS. On 2026-10-10 the capture was flawless and the day was empty:
 * the book was byte-identical to 2026-10-09's, three pricing-history runs agreed
 * on `moves_detected: 0`, and public/open-data/movement-ledger.csv published
 * `2026-10-10,2039,0,0,,0,0` to the site, the avena-data mirror and (once the
 * token lands) Hugging Face. Nothing could say whether the coast was quiet or
 * the upstream had not refreshed. This is the step that now says it, out loud,
 * on the night it happens rather than in a git archaeology session afterwards.
 *
 * EXIT CODES, and the reasoning behind each:
 *   0  current  — payload first seen today. The second daily run lands here and
 *                 must stay quiet; an alarm that fires every night is ignored.
 *   0  frozen, 1 boundary — one unchanged calendar day is plausible market
 *                 quiet (every Sunday and Monday in the ledger is a real zero).
 *                 Annotated as a warning so it is on the record, not red.
 *   1  frozen, >=2 boundaries — two or more days banked from one payload is no
 *                 longer plausibly the market. The moat is accumulating empty
 *                 days, which is the failure the whole pipeline exists to avoid.
 *   1  unknown  — parse-feed is supposed to have just written the stamp. If it
 *                 is missing or malformed the instrument is broken, and a
 *                 broken instrument reporting nothing is exactly the shape this
 *                 project keeps getting bitten by. Loud beats silent.
 *
 * It never fails the capture: the workflow runs it with continue-on-error and
 * re-raises at the end, after the feed and every write have landed.
 */

import { readFileSync } from 'fs';
import path from 'path';
import { describeUpstream, judgeUpstream, readProvenance, type FeedMetaShape } from '../src/lib/feed-provenance';

const META = path.join(process.cwd(), 'public', 'feed-meta.json');
const ESCALATE_AT_DAYS = 2;

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
const prov = readProvenance(meta);
const sentence = describeUpstream(verdict);

console.log(`feed-meta.json  generated_date=${String(meta?.generated_date ?? 'unknown')} listings=${String(meta?.listings ?? 'unknown')}`);
if (prov) {
  console.log(`upstream payload sha256=${prov.source_sha256.slice(0, 16)}… bytes=${prov.source_bytes} first_seen=${prov.source_first_seen_at}`);
} else {
  console.log('upstream payload  NO USABLE FINGERPRINT');
}
console.log(`verdict: ${verdict.level} — ${sentence}`);

if (verdict.level === 'unknown') {
  annotate(
    'error',
    'Upstream feed payload was not fingerprinted',
    `${sentence}. parse-feed.js writes source_sha256 / source_bytes / source_first_seen_at alongside the book; ` +
      `without them a frozen upstream and a quiet market are the same observation, and the open-data movement ` +
      `ledger publishes the second when it means the first.`,
  );
  process.exit(1);
}

if (verdict.level === 'frozen') {
  const escalate = verdict.days_spanned >= ESCALATE_AT_DAYS;
  annotate(
    escalate ? 'error' : 'warning',
    escalate
      ? `Upstream feed frozen for ${verdict.days_spanned} days`
      : 'Upstream feed served identical bytes across a date boundary',
    `${sentence}. ${
      escalate
        ? `${verdict.days_spanned} calendar days have now been banked from one payload. That is past what market ` +
          `quiet explains — check whether RedSP is still regenerating the file before trusting any zero in the ` +
          `movement ledger for those days.`
        : `One unchanged calendar day is plausible (weekend zeros are real in this ledger), so this is on the ` +
          `record rather than red. It turns red at ${ESCALATE_AT_DAYS} boundaries.`
    }`,
  );
  if (escalate) {
    console.error(`FAIL — upstream unchanged across ${verdict.days_spanned} date boundaries`);
    process.exit(1);
  }
  console.log('OK (warned) — one unchanged calendar day, recorded but not escalated.');
  process.exit(0);
}

console.log('OK — the book came from a payload first seen today.');
