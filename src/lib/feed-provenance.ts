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

export type UpstreamVerdict =
  | {
      /** No usable provenance stamp. Says nothing about freshness either way. */
      level: 'unknown';
      reason: string;
      days_spanned: null;
      hours_unchanged: null;
    }
  | {
      /** The payload was first seen today (UTC). The second daily run lands here. */
      level: 'current';
      days_spanned: 0;
      hours_unchanged: number;
      first_seen_at: string;
    }
  | {
      /**
       * Identical bytes across at least one UTC date boundary: upstream did not
       * regenerate, so every zero this book produces is inherited, not observed.
       */
      level: 'frozen';
      days_spanned: number;
      hours_unchanged: number;
      first_seen_at: string;
    };

function utcDayNumber(ms: number): number {
  return Math.floor(ms / 86_400_000);
}

/**
 * Judge the deployed book's upstream payload.
 *
 * `days_spanned` counts UTC date boundaries crossed since the payload was first
 * recorded — 0 while it is still the same UTC day, 1 once midnight has passed.
 * Deliberately NOT `hours / 24`: the question is "has a new calendar day been
 * banked against an unchanged book", and the capture keys on the UTC date.
 */
export function judgeUpstream(
  meta: FeedMetaShape | null | undefined,
  nowIso: string,
): UpstreamVerdict {
  const unknown = (reason: string): UpstreamVerdict => ({
    level: 'unknown',
    reason,
    days_spanned: null,
    hours_unchanged: null,
  });

  const prov = readProvenance(meta);
  if (!prov) {
    return unknown(
      meta && typeof meta === 'object' && 'source_sha256' in meta
        ? 'feed-meta.json carries an unreadable provenance block'
        : 'feed-meta.json carries no upstream fingerprint (deploy predates it)',
    );
  }
  const now = Date.parse(nowIso);
  if (!Number.isFinite(now)) return unknown(`caller passed an unparseable instant: ${String(nowIso).slice(0, 32)}`);

  const seen = Date.parse(prov.source_first_seen_at);
  // A stamp in the future is a clock or hand-edit problem, not evidence of
  // freshness. Refuse to grade it rather than reporting a negative staleness.
  if (seen > now) return unknown('provenance stamp is in the future relative to the caller');

  const hours = Math.round(((now - seen) / 3_600_000) * 10) / 10;
  const days = utcDayNumber(now) - utcDayNumber(seen);

  if (days <= 0) {
    return { level: 'current', days_spanned: 0, hours_unchanged: hours, first_seen_at: prov.source_first_seen_at };
  }
  return { level: 'frozen', days_spanned: days, hours_unchanged: hours, first_seen_at: prov.source_first_seen_at };
}

/**
 * One honest sentence for a log, a cron summary or a workflow annotation.
 *
 * Never asserts freshness it cannot show: an `unknown` verdict says it does not
 * know, and does not pretend the feed is fine.
 */
export function describeUpstream(v: UpstreamVerdict): string {
  switch (v.level) {
    case 'unknown':
      return `upstream payload provenance unknown — ${v.reason}`;
    case 'current':
      return `upstream payload first seen ${v.hours_unchanged}h ago, same UTC day — normal for a second daily run`;
    case 'frozen':
      return (
        `upstream served IDENTICAL bytes across ${v.days_spanned} UTC date ` +
        `boundar${v.days_spanned === 1 ? 'y' : 'ies'} (${v.hours_unchanged}h since first seen at ` +
        `${v.first_seen_at}) — any zero this book produces is inherited, not observed`
      );
  }
}
