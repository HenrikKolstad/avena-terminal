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
  };
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
