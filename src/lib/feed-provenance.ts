/**
 * Upstream feed provenance — can this day's book tell us anything NEW?
 *
 * WHY THIS EXISTS (2026-10-11).
 *
 * On 2026-10-10 the capture ran perfectly and recorded nothing. `price_snapshots`
 * banked 2,039 rows for 2,039 refs from a single book, three pricing-history runs
 * agreed (`moves_detected: 0`), and `public/open-data/movement-ledger.csv` gained
 * the row `2026-10-10,2039,0,0,,0,0` — zero increases, zero reductions, zero
 * delistings, zero arrivals. That row is now published on the site, mirrored to
 * the avena-data GitHub corpus, and will be pushed to Hugging Face the day the
 * token lands.
 *
 * `public/data.json` for 2026-10-10 was BYTE-IDENTICAL to the book published at
 * 2026-10-09T11:50Z (md5 dbf845ba…). The nightly workflow committed only the
 * `generated_at` timestamp in feed-meta.json. Seven of the seven Saturdays before
 * it carried 6–21 price moves; zero-move days in the whole 67-day ledger cluster
 * on Sundays and Mondays, which is the capture of weekend inactivity. A Saturday
 * zero had never happened.
 *
 * So: did the Spanish coast genuinely not move, or did RedSP serve us the same
 * file twice? BEFORE THIS MODULE THE PIPELINE COULD NOT TELL, AND IT PUBLISHED
 * THE SECOND AS THE FIRST. feed-meta.json recorded `generated_at`,
 * `generated_date`, `listings` and `source` — all four of which are things WE
 * stamp, none of which describe the payload we were handed. A frozen upstream and
 * a quiet market were the same observation.
 *
 * That is this project's recurring bug in its purest form: a missing value (the
 * upstream did not refresh) silently becoming a measurement (no movement
 * observed). It is also the most expensive version of it, because the published
 * artifact goes into the corpus channel, where a wrong number survives a training
 * sweep.
 *
 * WHAT IT DOES. parse-feed.js hashes the raw XML it downloaded and writes
 * `source_sha256` / `source_bytes` / `source_first_seen_at` into feed-meta.json,
 * carrying the first-seen stamp forward whenever the hash is unchanged. A reader
 * can then say which of the two happened.
 *
 * TWO CONTRACTS, BOTH DELIBERATE:
 *
 *  1. UNKNOWN IS NEVER ZERO. Every function here returns `null` or
 *     `level: 'unknown'` when the stamp is absent or malformed. A deploy
 *     predating this module, a hand-edited meta file, or a failed hash must read
 *     as "we do not know", never as "the feed is fresh" and never as "0 days
 *     stale". Fabricating either direction is the bug this module exists to catch.
 *
 *  2. REPEATING WITHIN A DAY IS NORMAL; REPEATING ACROSS A DAY IS NOT. The feed
 *     workflow runs twice daily, so the second run of the day legitimately sees
 *     the same payload. The condition worth alarming on is identical bytes across
 *     a UTC date boundary, because that is the case where the capture banks a day
 *     that carries no new information.
 *
 * Pure: no I/O, no clock, no env. The caller passes `nowIso`.
 */

export interface FeedFingerprint {
  /** SHA-256 of the raw upstream payload, lowercase hex. */
  source_sha256: string;
  /** Byte length of the raw upstream payload. */
  source_bytes: number;
}

export interface FeedProvenance extends FeedFingerprint {
  /**
   * ISO instant at which THIS EXACT payload was first recorded by this
   * instrument. Carried forward across runs while the hash is unchanged.
   *
   * Note the wording: "first recorded by this instrument", not "first served by
   * RedSP". On the first run after this module ships, a payload that upstream
   * has been serving for a week is stamped with that run's time, because that is
   * genuinely all we know. It must not be back-dated — see contract 1.
   */
  source_first_seen_at: string;
}

/** A parsed feed-meta.json, with every provenance field optional. */
export interface FeedMetaShape {
  generated_at?: unknown;
  generated_date?: unknown;
  listings?: unknown;
  source?: unknown;
  source_sha256?: unknown;
  source_bytes?: unknown;
  source_first_seen_at?: unknown;
  content_sha256?: unknown;
  content_refs?: unknown;
  content_first_seen_at?: unknown;
}

const SHA256_HEX = /^[0-9a-f]{64}$/;

function isSha256(v: unknown): v is string {
  return typeof v === 'string' && SHA256_HEX.test(v);
}

function isIsoInstant(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0 && Number.isFinite(Date.parse(v));
}

/**
 * Read the provenance block out of a parsed feed-meta.json.
 *
 * Returns null unless ALL THREE fields are present and well-formed. A partial
 * block is treated as absent on purpose: a hash with no first-seen stamp cannot
 * answer the staleness question, and half-answering it is how a caller ends up
 * inventing the other half.
 */
export function readProvenance(meta: FeedMetaShape | null | undefined): FeedProvenance | null {
  if (!meta || typeof meta !== 'object') return null;
  const { source_sha256: sha, source_bytes: bytes, source_first_seen_at: seen } = meta;
  if (!isSha256(sha)) return null;
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes <= 0) return null;
  if (!isIsoInstant(seen)) return null;
  return { source_sha256: sha, source_bytes: bytes, source_first_seen_at: seen };
}

/**
 * Build the provenance block to write for a freshly downloaded payload.
 *
 * Keeps the previous `source_first_seen_at` when the hash is unchanged, so the
 * stamp accumulates across runs; resets it to `nowIso` the moment the payload
 * differs, or when the previous block is absent/unreadable.
 *
 * `prevMeta` is whatever was on disk — possibly nothing, possibly a meta file
 * from before this module existed, possibly malformed. All three read as "no
 * prior knowledge", which resets the stamp. That is the safe direction: it can
 * under-report how long a payload has been frozen, never over-report it.
 */
export function carryForwardProvenance(
  prevMeta: FeedMetaShape | null | undefined,
  next: FeedFingerprint,
  nowIso: string,
): FeedProvenance {
  if (!isSha256(next.source_sha256)) {
    throw new Error(`carryForwardProvenance: not a sha256 hex digest: ${String(next.source_sha256).slice(0, 32)}`);
  }
  if (!Number.isFinite(next.source_bytes) || next.source_bytes <= 0) {
    throw new Error(`carryForwardProvenance: payload bytes must be a positive number, got ${String(next.source_bytes)}`);
  }
  if (!isIsoInstant(nowIso)) {
    throw new Error(`carryForwardProvenance: nowIso is not a parseable instant: ${String(nowIso).slice(0, 32)}`);
  }

  const prev = readProvenance(prevMeta);
  const unchanged = prev !== null && prev.source_sha256 === next.source_sha256;

  return {
    source_sha256: next.source_sha256,
    source_bytes: next.source_bytes,
    source_first_seen_at: unchanged ? prev.source_first_seen_at : nowIso,
  };
}

/* -------------------------------------------------------------------------- */
/* THE CONTENT AXIS — added 2026-10-12, and it exists because the payload axis */
/* above cannot fire.                                                          */
/* -------------------------------------------------------------------------- */

/**
 * WHAT THE FIRST DAY OF REAL DATA SHOWED (2026-10-12).
 *
 * The payload fingerprint shipped on 10-11 and was read out the next morning.
 * RedSP served us the feed twice that day:
 *
 *   08:15:39Z  sha256 1422f2d9…  97,801,138 bytes
 *   11:21:50Z  sha256 06ced78b…  97,801,138 bytes
 *
 * Two different hashes, THE SAME BYTE LENGTH TO THE BYTE, and a parsed book
 * byte-identical to the one published on 10-09 at 11:50 (sha256 e44c31c6…).
 * So the upstream rewrites some fixed-width field — a generation timestamp,
 * almost certainly — on every regeneration, while the listings are unchanged.
 *
 * THE CONSEQUENCE IS THAT YESTERDAY'S INSTRUMENT COULD ONLY EVER REPORT HEALTH.
 * `carryForwardProvenance` resets `source_first_seen_at` the moment the hash
 * differs, the hash differs on every fetch, so `source_first_seen_at` is always
 * "now" and the `frozen` branch is unreachable in production. A detector whose
 * alarm is structurally unreachable is this project's recurring bug wearing the
 * uniform of a fix: a missing signal silently reading as a healthy one. It is
 * also METHOD RULE 5 collecting again — the verdict `current` had been observed
 * three times and never anything else, and "a test I have only ever seen pass is
 * not evidence of anything".
 *
 * THE FIX IS TO FINGERPRINT WHAT THE CAPTURE ACTUALLY OBSERVES, which is neither
 * the wrapper nor the whole book: it is the map {ref → price}. Every row the
 * moat banks is a function of that map —
 *
 *   a price move   = a ref whose price changed
 *   an arrival     = a ref that appeared
 *   a departure    = a ref that vanished
 *
 * so if the map is unchanged across a UTC date boundary, the day's zeros are
 * INHERITED BY CONSTRUCTION, provably and not by inference. That is the exact
 * statement O-114 wanted and could not make on 10-10.
 *
 * TWO AXES, AND THEY ANSWER DIFFERENT QUESTIONS. Keeping both is the whole
 * point:
 *
 *   content  — did the market say anything new?   (information)
 *   payload  — is the upstream still generating?  (liveness)
 *
 * content unchanged + payload regenerating  = a real quiet market; the zero is
 *                                             an observation, publishable.
 * content unchanged + payload byte-identical = we may be reading a cached file;
 *                                             the zero is NOT verifiable, and
 *                                             the same origin refused our egress
 *                                             outright on 10-11, so this is not
 *                                             a hypothetical.
 *
 * THRESHOLDS COME FROM THE MEASURED BASE RATE, NOT FROM INSTINCT. Over the
 * ledger's 68 days there are nine days with zero moves AND zero arrivals AND
 * zero departures (08-17, 08-24, 09-07, 09-14, 09-20, 09-21, 09-27, 10-10,
 * 10-11), every one a Saturday, Sunday or Monday, and the longest consecutive
 * run is TWO (09-20+09-21, and now 10-10+10-11). Three is therefore unusual and
 * four has no precedent anywhere in the series. This was written down in prose
 * on 10-11 as "the real test is Tuesday 2026-10-13"; it is executable here so it
 * is not re-derived or quietly relaxed after seeing the data.
 */

/** sha256 over the observable content of a book: the sorted {ref → price} map. */
export interface ContentFingerprint {
  content_sha256: string;
  /** Refs included in the hash — the same population the capture banks. */
  content_refs: number;
}

export interface ContentProvenance extends ContentFingerprint {
  /** Carried forward across runs while the content hash is unchanged. */
  content_first_seen_at: string;
}

/**
 * The canonical content hash. ONE implementation, used by the grader, the
 * scripts and the tests; parse-feed.js mirrors it in plain JS, and
 * `scripts/test-feed-provenance.ts` asserts the two agree by recomputing this
 * over the committed `public/data.json` and comparing it to the
 * `content_sha256` parse-feed wrote into `public/feed-meta.json`. If the two
 * implementations ever drift, that test fails against the real book.
 *
 * The filter mirrors the snapshot write in parse-feed.js (`p.ref && p.pf > 0`)
 * on purpose: the hash must cover exactly the rows that reach price_snapshots,
 * no more and no less, or it answers a question the capture is not asking.
 */
export function contentLines(rows: ReadonlyArray<{ ref?: unknown; pf?: unknown }>): string[] {
  const lines: string[] = [];
  for (const r of rows) {
    if (typeof r.ref !== 'string' || r.ref.length === 0) continue;
    if (typeof r.pf !== 'number' || !Number.isFinite(r.pf) || r.pf <= 0) continue;
    lines.push(`${r.ref}:${r.pf}`);
  }
  return lines.sort();
}

/**
 * Read the content block. Returns null unless all three fields are present and
 * well-formed — same rule as `readProvenance`, same reason: half an answer is
 * how a caller invents the other half.
 */
export function readContentProvenance(meta: FeedMetaShape | null | undefined): ContentProvenance | null {
  if (!meta || typeof meta !== 'object') return null;
  const m = meta as Record<string, unknown>;
  const sha = m.content_sha256;
  const refs = m.content_refs;
  const seen = m.content_first_seen_at;
  if (!isSha256(sha)) return null;
  if (typeof refs !== 'number' || !Number.isFinite(refs) || refs <= 0) return null;
  if (!isIsoInstant(seen)) return null;
  return { content_sha256: sha, content_refs: refs, content_first_seen_at: seen };
}

/**
 * Carry `content_first_seen_at` forward while the content hash holds, resetting
 * it the moment the observable map changes. Same safe direction as the payload
 * version: it can under-report how long the content has been static, never
 * over-report it.
 */
export function carryForwardContent(
  prevMeta: FeedMetaShape | null | undefined,
  next: ContentFingerprint,
  nowIso: string,
): ContentProvenance {
  if (!isSha256(next.content_sha256)) {
    throw new Error(`carryForwardContent: not a sha256 hex digest: ${String(next.content_sha256).slice(0, 32)}`);
  }
  if (!Number.isFinite(next.content_refs) || next.content_refs <= 0) {
    throw new Error(`carryForwardContent: content_refs must be a positive number, got ${String(next.content_refs)}`);
  }
  if (!isIsoInstant(nowIso)) {
    throw new Error(`carryForwardContent: nowIso is not a parseable instant: ${String(nowIso).slice(0, 32)}`);
  }
  const prev = readContentProvenance(prevMeta);
  const unchanged = prev !== null && prev.content_sha256 === next.content_sha256;
  return {
    content_sha256: next.content_sha256,
    content_refs: next.content_refs,
    content_first_seen_at: unchanged ? prev.content_first_seen_at : nowIso,
  };
}

/* -------------------------------------------------------------------------- */
/* The verdict                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * How many consecutive calendar days the capture has banked against an unchanged
 * observable map. Red here is my own pre-registered criterion from 2026-10-11,
 * not a number chosen after seeing today's data.
 */
export const CONTENT_UNPRECEDENTED_DAYS = 3;
export const CONTENT_RED_DAYS = 4;
/** Payload byte-identical across this many boundaries = we cannot verify the quiet. */
export const PAYLOAD_RED_DAYS = 2;

export type UpstreamLiveness =
  /** We fetched today and were handed a payload we had not seen — upstream is generating. */
  | 'regenerating'
  /**
   * We fetched AFTER the stamp was set and were handed the identical bytes. This
   * is the cached-file signal, and the only liveness state that can go red.
   */
  | 'byte_identical'
  /**
   * The last fetch IS the one that set the stamp, so the payload has simply not
   * been requested since. Distinguished from `byte_identical` on purpose: a
   * grader reading the DEPLOYED book before the day's feed has landed sees a
   * day-old stamp, and calling that a cached file would cry wolf every single
   * morning — the exact failure this module is written to avoid.
   */
  | 'not_refetched'
  /** No usable payload fingerprint, or no readable `generated_at` to compare it to. */
  | 'unknown';

export interface UpstreamVerdict {
  /**
   * `unknown`  — no usable content fingerprint. Says nothing either way.
   * `current`  — the observable map changed today; the book carries new facts.
   * `quiet`    — map unchanged for 1–2 days, which nine days in 68 say is normal.
   * `unusual`  — unchanged for 3 days; longer than anything in the ledger.
   * `stalled`  — unchanged for >=4 days, or byte-identical payload across >=2
   *              boundaries. Either way the published zeros are not trustworthy.
   */
  level: 'unknown' | 'current' | 'quiet' | 'unusual' | 'stalled';
  /** UTC date boundaries crossed since the observable map last changed. Null when unknown. */
  content_days: number | null;
  /** Boundaries crossed since the raw payload last changed. Null when unknown. */
  payload_days: number | null;
  liveness: UpstreamLiveness;
  content_first_seen_at: string | null;
  /** True when this book cannot produce a move, an arrival or a departure. */
  zeros_inherited: boolean;
  /** Present only at `unknown`; always a sentence, never an empty string. */
  reason: string | null;
}

function utcDayNumber(ms: number): number {
  return Math.floor(ms / 86_400_000);
}

/**
 * Judge the deployed book on both axes.
 *
 * `content_days` counts UTC date boundaries crossed since the observable map
 * last changed — 0 while it is still the same UTC day, 1 once midnight has
 * passed. Deliberately NOT `hours / 24`: the capture keys on the UTC date, so
 * "has another calendar day been banked against an unchanged map" is the
 * question, and a 23-hour-old payload that crossed midnight has.
 */
export function judgeUpstream(
  meta: FeedMetaShape | null | undefined,
  nowIso: string,
): UpstreamVerdict {
  const unknown = (reason: string): UpstreamVerdict => ({
    level: 'unknown',
    content_days: null,
    payload_days: null,
    liveness: 'unknown',
    content_first_seen_at: null,
    zeros_inherited: false,
    reason,
  });

  const now = Date.parse(nowIso);
  if (!Number.isFinite(now)) return unknown(`caller passed an unparseable instant: ${String(nowIso).slice(0, 32)}`);

  const content = readContentProvenance(meta);
  if (!content) {
    const hasKey = meta && typeof meta === 'object' && 'content_sha256' in meta;
    return unknown(
      hasKey
        ? 'feed-meta.json carries an unreadable content fingerprint'
        : 'feed-meta.json carries no content fingerprint (deploy predates it)',
    );
  }

  const contentSeen = Date.parse(content.content_first_seen_at);
  // A stamp in the future is a clock or hand-edit problem, not evidence of
  // freshness. Refuse to grade rather than report a negative staleness.
  if (contentSeen > now) return unknown('content fingerprint stamp is in the future relative to the caller');

  const contentDays = utcDayNumber(now) - utcDayNumber(contentSeen);

  // Liveness is a SEPARATE read and is allowed to be unknown while the content
  // axis is known: an older deploy wrote one block and not the other, and
  // guessing either from the other is how a half answer becomes a whole claim.
  const payload = readProvenance(meta);
  let payloadDays: number | null = null;
  let liveness: UpstreamLiveness = 'unknown';
  if (payload) {
    const payloadSeen = Date.parse(payload.source_first_seen_at);
    if (payloadSeen <= now) {
      payloadDays = utcDayNumber(now) - utcDayNumber(payloadSeen);
      if (payloadDays < 1) {
        liveness = 'regenerating';
      } else {
        // The discriminator: parse-feed sets `generated_at` to the run's own
        // clock every time and only moves `source_first_seen_at` when the bytes
        // differ. So generated_at STRICTLY LATER than the stamp means we asked
        // again and got the same file; equal means the stamp-setting fetch is
        // still the most recent one and nobody has asked since.
        const generated = Date.parse(String((meta as Record<string, unknown>)?.generated_at ?? ''));
        liveness = !Number.isFinite(generated)
          ? 'unknown'
          : generated > payloadSeen
            ? 'byte_identical'
            : 'not_refetched';
      }
    }
  }

  const base = {
    content_days: contentDays,
    payload_days: payloadDays,
    liveness,
    content_first_seen_at: content.content_first_seen_at,
    reason: null,
  };

  if (contentDays <= 0) {
    return { ...base, level: 'current', zeros_inherited: false };
  }

  // Past here the map has not changed across at least one boundary, so any zero
  // this book produces is arithmetic, not an observation.
  // Only a CONFIRMED re-fetch of identical bytes counts. `not_refetched` is a
  // scheduling fact, not an upstream fact, and must never drive the alarm.
  const payloadRed = liveness === 'byte_identical' && payloadDays !== null && payloadDays >= PAYLOAD_RED_DAYS;
  if (contentDays >= CONTENT_RED_DAYS || payloadRed) {
    return { ...base, level: 'stalled', zeros_inherited: true };
  }
  if (contentDays >= CONTENT_UNPRECEDENTED_DAYS) {
    return { ...base, level: 'unusual', zeros_inherited: true };
  }
  return { ...base, level: 'quiet', zeros_inherited: true };
}

/**
 * One honest sentence for a log, a cron summary or a workflow annotation.
 *
 * Never asserts freshness it cannot show, and never describes the liveness axis
 * as healthy when it is unknown.
 */
export function describeUpstream(v: UpstreamVerdict): string {
  if (v.level === 'unknown') return `upstream provenance unknown — ${v.reason ?? 'no reason recorded'}`;

  const live =
    v.liveness === 'regenerating'
      ? 'the upstream payload itself changed today, so it is still regenerating'
      : v.liveness === 'byte_identical'
        ? `we re-fetched and were handed the IDENTICAL payload, now ${v.payload_days} UTC boundar${v.payload_days === 1 ? 'y' : 'ies'} old, so we may be reading a cached file rather than a quiet market`
        : v.liveness === 'not_refetched'
          ? `the payload has not been re-requested since it was first seen ${v.payload_days} boundar${v.payload_days === 1 ? 'y' : 'ies'} ago, so this says nothing about the upstream either way`
          : 'the raw payload carries no usable fingerprint, so upstream liveness is unknown';

  if (v.level === 'current') {
    return `the observable {ref → price} map changed today — this book carries new facts (${live})`;
  }

  const days = `${v.content_days} calendar day${v.content_days === 1 ? '' : 's'}`;
  const inherited =
    `the map has been identical for ${days} (first seen ${v.content_first_seen_at}), ` +
    `so every zero move, zero arrival and zero departure this book produces is inherited, not observed`;

  switch (v.level) {
    case 'quiet':
      return `${inherited} — normal: nine of the ledger's 68 days are genuine zero days and the longest run is two (${live})`;
    case 'unusual':
      return `${inherited} — LONGER THAN ANY RUN IN THE LEDGER, whose maximum is two consecutive days (${live})`;
    case 'stalled':
      return `${inherited} — NO PRECEDENT: red at ${CONTENT_RED_DAYS} unchanged days or a byte-identical payload across ${PAYLOAD_RED_DAYS} (${live})`;
  }
}
