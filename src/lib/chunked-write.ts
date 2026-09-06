/**
 * Chunked writes that cannot report a loss as a zero.
 *
 * Every ingest path in this repo had the same shape:
 *
 *     let written = 0;
 *     for (const chunk of chunks) {
 *       const { error } = await supabase.from(t).upsert(chunk);
 *       if (!error) written += chunk.length;   // <- a failed chunk vanishes
 *     }
 *     return written;
 *
 * A single number cannot distinguish "there was nothing to write" from
 * "every write failed". Worse, callers that capped their error samples
 * (dvf-ingest kept 5) made a run that lost 588 rows look identical to one
 * that lost 250: the sample was full either way and the magnitude was
 * nowhere.
 *
 * This helper returns the whole funnel instead. Two invariants hold on
 * every result and are asserted by scripts/test-chunked-write.ts:
 *
 *   1. attempted === written + lost        (no row is unaccounted for)
 *   2. lost > 0  <=>  chunks_failed > 0  <=>  errors.length > 0
 *
 * (2) is what makes the status derivation work without teaching it to guess
 * at numeric fields (see O-56): any real loss always puts at least one
 * message in `errors`, and a non-empty `errors[]` is already a marker that
 * turns the run red in deriveCronStatus.
 */

export interface ChunkWriteResult {
  /** Rows handed to the writer. */
  attempted: number;
  /** Rows in chunks the database accepted. */
  written: number;
  /** Rows in chunks the database rejected or that threw. Never inferred — counted. */
  lost: number;
  chunks_total: number;
  chunks_failed: number;
  /** A capped SAMPLE of failure messages, for legibility. Not a count. */
  errors: string[];
  /** The uncapped number of failed chunks. This is the number to trust. */
  errors_total: number;
  /**
   * Start index (into the input array) of every chunk the database rejected.
   * Uncapped, like `errors_total` — the sample is `errors`, never this.
   *
   * A caller that writes a PARENT table and then a CHILD table that
   * references it needs to know which parent rows actually landed, or it will
   * hand the child writer foreign keys that do not exist. dvf-ingest is that
   * caller. Indices rather than row copies so this stays cheap on a 20k-row
   * ingest.
   */
  failed_chunk_starts: number[];
}

/** A Supabase-shaped write outcome: `{ error }`, null when it succeeded. */
export type ChunkWriteOutcome = { error: { message: string } | null };

export function emptyChunkWriteResult(): ChunkWriteResult {
  return {
    attempted: 0,
    written: 0,
    lost: 0,
    chunks_total: 0,
    chunks_failed: 0,
    errors: [],
    errors_total: 0,
    failed_chunk_starts: [],
  };
}

/**
 * The input indices covered by the chunks that failed, given the chunk size
 * the write used. Callers use this to exclude rows that never landed from
 * whatever they derive next.
 */
export function failedRowIndices(r: ChunkWriteResult, chunkSize: number): Set<number> {
  const out = new Set<number>();
  for (const start of r.failed_chunk_starts) {
    const end = Math.min(start + chunkSize, r.attempted);
    for (let i = start; i < end; i++) out.add(i);
  }
  return out;
}

/**
 * Write `rows` in slices of `chunkSize`, recording what was lost.
 *
 * `write` is never allowed to abort the loop: a thrown exception is recorded
 * as a failed chunk exactly like a returned error, so a mid-run network drop
 * is reported as a partial write rather than swallowing the rows that had
 * already landed.
 */
export async function chunkedWrite<T>(
  rows: T[],
  chunkSize: number,
  // PromiseLike, not Promise: a Supabase query builder is thenable but is not
  // a Promise instance, and awaiting it is what actually issues the request.
  write: (chunk: T[]) => PromiseLike<ChunkWriteOutcome>,
  opts: { label?: string; sampleLimit?: number } = {},
): Promise<ChunkWriteResult> {
  const label = opts.label ? `${opts.label} ` : '';
  const sampleLimit = opts.sampleLimit ?? 5;

  if (chunkSize < 1 || !Number.isFinite(chunkSize)) {
    throw new Error(`chunkedWrite: chunkSize must be a positive integer, got ${chunkSize}`);
  }

  const result = emptyChunkWriteResult();
  result.attempted = rows.length;
  if (rows.length === 0) return result;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    result.chunks_total++;
    let message: string | null = null;
    try {
      const { error } = await write(chunk);
      if (error) message = error.message;
    } catch (e) {
      message = e instanceof Error ? e.message : String(e);
    }
    if (message === null) {
      result.written += chunk.length;
    } else {
      result.lost += chunk.length;
      result.chunks_failed++;
      result.errors_total++;
      result.failed_chunk_starts.push(i);
      if (result.errors.length < sampleLimit) {
        result.errors.push(`${label}chunk ${i}: ${message}`);
      }
    }
  }
  return result;
}

/**
 * Fold several ChunkWriteResults into one, for callers that write to more
 * than one table (dvf-ingest) or loop over many indicators (eu-stats-feeds).
 */
export function mergeChunkWriteResults(
  parts: ChunkWriteResult[],
  sampleLimit = 5,
): ChunkWriteResult {
  const out = emptyChunkWriteResult();
  for (const p of parts) {
    out.attempted += p.attempted;
    out.written += p.written;
    out.lost += p.lost;
    out.chunks_total += p.chunks_total;
    out.chunks_failed += p.chunks_failed;
    out.errors_total += p.errors_total;
    for (const e of p.errors) {
      if (out.errors.length < sampleLimit) out.errors.push(e);
    }
  }
  // `failed_chunk_starts` is deliberately NOT merged: the indices belong to
  // each part's own input array, so concatenating them would produce numbers
  // that index nothing. A merged result is for reporting totals; read the
  // per-part result when you need to know which rows landed.
  return out;
}

/**
 * The subset of the funnel worth putting in a cron summary. Callers spread
 * this into their `output_summary` so every ingest reports the same fields.
 *
 * `errors` is included so a loss always trips the existing non-empty-errors
 * marker in deriveCronStatus.
 */
export function chunkWriteSummary(r: ChunkWriteResult, prefix: string) {
  return {
    [`${prefix}_attempted`]: r.attempted,
    [`${prefix}_written`]: r.written,
    [`${prefix}_lost`]: r.lost,
    [`${prefix}_chunks_failed`]: r.chunks_failed,
  };
}

/**
 * Split a batch on its upsert conflict key BEFORE the database sees it.
 *
 * Postgres rejects an entire `INSERT ... ON CONFLICT DO UPDATE` statement with
 * "ON CONFLICT DO UPDATE command cannot affect row a second time" when the
 * batch touches the same key twice. Through `chunkedWrite` that means one bad
 * pair destroys its whole 500-row chunk — the same amplification that let 12
 * orphan DVF rows take 550 good ones with them. eu-stats-ingest has been
 * losing 4,480 rows a night, 100% of the INE Spain feed, to exactly this.
 *
 * The split is deliberately NOT a plain de-duplication, because two rows
 * sharing a key are two different bugs and only one of them is safe to
 * collapse:
 *
 *   - IDENTICAL values: the source listed the same observation twice. Keeping
 *     one is lossless, so collapse it — but count it, because a source that
 *     suddenly starts repeating itself is worth seeing.
 *   - CONFLICTING values: the key does not identify what the caller thinks it
 *     identifies. Picking a winner would publish one of two contradictory
 *     numbers as fact, so ALL rows for that key are excluded and the key is
 *     named. Excluding a handful of rows is recoverable; inventing a value is
 *     not.
 *
 * `valueOf` should serialise everything that is NOT part of the key. Rows that
 * differ only in a field the caller does not care about would otherwise be
 * reported as conflicting.
 */
export interface KeySplitResult<T> {
  /** Safe to write: one row per distinct key. */
  rows: T[];
  /** Rows dropped as exact repeats of a row already kept. */
  collapsed_identical: number;
  /** Rows excluded because their key carried more than one distinct value. */
  excluded_conflicting: number;
  /** A capped sample of the conflicting keys, for the error message. */
  conflicting_keys: string[];
  /** The uncapped number of distinct conflicting keys. Trust this one. */
  conflicting_keys_total: number;
}

export function splitOnUpsertKey<T>(
  rows: T[],
  keyOf: (row: T) => string,
  valueOf: (row: T) => string,
  opts: { sampleLimit?: number } = {},
): KeySplitResult<T> {
  const sampleLimit = opts.sampleLimit ?? 5;
  const byKey = new Map<string, { rows: T[]; values: Set<string> }>();
  const order: string[] = [];

  for (const row of rows) {
    const k = keyOf(row);
    let slot = byKey.get(k);
    if (!slot) {
      slot = { rows: [], values: new Set() };
      byKey.set(k, slot);
      order.push(k);
    }
    slot.rows.push(row);
    slot.values.add(valueOf(row));
  }

  const out: KeySplitResult<T> = {
    rows: [],
    collapsed_identical: 0,
    excluded_conflicting: 0,
    conflicting_keys: [],
    conflicting_keys_total: 0,
  };

  for (const k of order) {
    const slot = byKey.get(k)!;
    if (slot.values.size > 1) {
      out.excluded_conflicting += slot.rows.length;
      out.conflicting_keys_total++;
      if (out.conflicting_keys.length < sampleLimit) out.conflicting_keys.push(k);
      continue;
    }
    out.rows.push(slot.rows[0]);
    out.collapsed_identical += slot.rows.length - 1;
  }

  return out;
}
