/**
 * Tests for src/lib/chunked-write.ts.
 *
 * The point of this suite is the pair of invariants that make a lost row
 * impossible to report as a zero. The headline cases are the FAILURE cases:
 * a helper that has only ever been observed on the happy path is not a guard
 * (lesson 2026-09-02).
 *
 * Run: npx tsx scripts/test-chunked-write.ts
 */

import {
  chunkedWrite,
  mergeChunkWriteResults,
  chunkWriteSummary,
  emptyChunkWriteResult,
  failedRowIndices,
  type ChunkWriteResult,
  type ChunkWriteOutcome,
} from '../src/lib/chunked-write';

let passed = 0;
let failed = 0;

function ok(name: string, cond: boolean) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}`);
  }
}

/** The two invariants, checked on every result any test produces. */
function assertInvariants(name: string, r: ChunkWriteResult) {
  ok(`${name}: attempted === written + lost`, r.attempted === r.written + r.lost);
  const lossy = r.lost > 0;
  ok(
    `${name}: lost>0 <=> chunks_failed>0 <=> errors non-empty`,
    lossy === r.chunks_failed > 0 && lossy === r.errors.length > 0,
  );
}

const okWrite = async (): Promise<ChunkWriteOutcome> => ({ error: null });
const failWrite = async (): Promise<ChunkWriteOutcome> => ({ error: { message: 'FK violation' } });

async function main() {
  console.log('chunked-write\n');

  // ── The happy path ──────────────────────────────────────────────────────
  {
    const r = await chunkedWrite(Array.from({ length: 250 }, (_, i) => i), 50, okWrite);
    ok('all-clean: written === attempted', r.written === 250);
    ok('all-clean: lost === 0', r.lost === 0);
    ok('all-clean: chunks_total === 5', r.chunks_total === 5);
    ok('all-clean: errors empty', r.errors.length === 0);
    assertInvariants('all-clean', r);
  }

  // ── Empty input is not a failure ────────────────────────────────────────
  {
    const r = await chunkedWrite([], 50, failWrite);
    ok('empty: no chunks attempted', r.chunks_total === 0);
    ok('empty: errors empty (nothing to write is not a loss)', r.errors.length === 0);
    assertInvariants('empty', r);
  }

  // ── THE HEADLINE: a total failure must NOT look like an empty input ─────
  {
    const r = await chunkedWrite(Array.from({ length: 250 }, (_, i) => i), 50, failWrite);
    ok('total-failure: written === 0', r.written === 0);
    ok('total-failure: lost === 250 (the old code reported only the 0)', r.lost === 250);
    ok('total-failure: chunks_failed === 5', r.chunks_failed === 5);
    ok('total-failure: errors_total === 5', r.errors_total === 5);
    ok('total-failure: distinguishable from empty input', r.chunks_total === 5);
    assertInvariants('total-failure', r);
  }

  // ── A capped SAMPLE must not cap the COUNT ──────────────────────────────
  // This is the dvf-ingest defect: 08-27 Nice lost ~588 rows across ~12
  // failed chunks and reported exactly 5 error strings, the same as a run
  // that lost 250. errors_total is the number that must survive the cap.
  {
    const r = await chunkedWrite(
      Array.from({ length: 1000 }, (_, i) => i),
      50,
      failWrite,
      { sampleLimit: 5 },
    );
    ok('cap: errors sample is capped at 5', r.errors.length === 5);
    ok('cap: errors_total is NOT capped (20)', r.errors_total === 20);
    ok('cap: chunks_failed is NOT capped (20)', r.chunks_failed === 20);
    ok('cap: lost is NOT capped (1000)', r.lost === 1000);
    assertInvariants('cap', r);
  }

  // ── Partial failure: the arithmetic must land exactly ───────────────────
  {
    let n = 0;
    const r = await chunkedWrite(
      Array.from({ length: 230 }, (_, i) => i),
      50,
      async () => (++n === 2 ? { error: { message: 'boom' } } : { error: null }),
    );
    // 5 chunks: 50,50,50,50,30. The 2nd fails.
    ok('partial: written === 180', r.written === 180);
    ok('partial: lost === 50', r.lost === 50);
    ok('partial: chunks_failed === 1', r.chunks_failed === 1);
    ok('partial: error names the offset', r.errors[0].includes('chunk 50'));
    assertInvariants('partial', r);
  }

  // ── A ragged final chunk is counted by its real length, not chunkSize ───
  // The old code used Math.min(CHUNK, rows.length - i), which was right, but
  // only by accident of being written twice. Assert it.
  {
    let n = 0;
    const r = await chunkedWrite(
      Array.from({ length: 230 }, (_, i) => i),
      50,
      async () => (++n === 5 ? { error: { message: 'boom' } } : { error: null }),
    );
    ok('ragged: last chunk loses 30, not 50', r.lost === 30);
    assertInvariants('ragged', r);
  }

  // ── A thrown exception is a failed chunk, not an aborted run ────────────
  {
    let n = 0;
    const r = await chunkedWrite(
      Array.from({ length: 150 }, (_, i) => i),
      50,
      async () => {
        if (++n === 1) throw new Error('ECONNRESET');
        return { error: null };
      },
    );
    ok('throw: loop continued past the exception', r.chunks_total === 3);
    ok('throw: rows after the throw were still written', r.written === 100);
    ok('throw: the thrown chunk is counted as lost', r.lost === 50);
    ok('throw: the message is preserved', r.errors[0].includes('ECONNRESET'));
    assertInvariants('throw', r);
  }

  // ── Labels disambiguate two loops sharing one errors array ──────────────
  // dvf-ingest wrote registry and transaction failures into one capped list
  // with no way to tell which loop lost rows.
  {
    const r = await chunkedWrite([1, 2, 3], 50, failWrite, { label: 'tx' });
    ok('label: prefixes the message', r.errors[0].startsWith('tx chunk 0:'));
  }

  // ── merge preserves the invariants across several writers ──────────────
  {
    const a = await chunkedWrite(Array.from({ length: 100 }, (_, i) => i), 50, failWrite, { label: 'a' });
    const b = await chunkedWrite(Array.from({ length: 100 }, (_, i) => i), 50, okWrite, { label: 'b' });
    const m = mergeChunkWriteResults([a, b]);
    ok('merge: attempted sums', m.attempted === 200);
    ok('merge: written sums', m.written === 100);
    ok('merge: lost sums', m.lost === 100);
    ok('merge: errors_total sums', m.errors_total === 2);
    assertInvariants('merge', m);
  }

  {
    const m = mergeChunkWriteResults([]);
    ok('merge: empty list is an empty result', JSON.stringify(m) === JSON.stringify(emptyChunkWriteResult()));
  }

  // ── merge caps the sample but never the count ──────────────────────────
  {
    const parts = await Promise.all(
      Array.from({ length: 4 }, (_, k) =>
        chunkedWrite(Array.from({ length: 150 }, (_, i) => i), 50, failWrite, { label: `p${k}` }),
      ),
    );
    const m = mergeChunkWriteResults(parts, 5);
    ok('merge-cap: sample capped at 5', m.errors.length === 5);
    ok('merge-cap: errors_total === 12', m.errors_total === 12);
    ok('merge-cap: lost === 600', m.lost === 600);
    assertInvariants('merge-cap', m);
  }

  // ── The summary shape callers spread into output_summary ───────────────
  {
    const r = await chunkedWrite(Array.from({ length: 100 }, (_, i) => i), 50, failWrite);
    const s = chunkWriteSummary(r, 'tx');
    ok('summary: names are prefixed', 'tx_lost' in s && 'tx_written' in s && 'tx_chunks_failed' in s);
    ok('summary: reports the loss', s.tx_lost === 100);
  }

  // ── failedRowIndices: which parent rows never landed ───────────────────
  //
  // dvf-ingest writes properties_registry and then property_transactions,
  // which has an FK onto it. If it hands the child writer a key whose parent
  // chunk failed, ONE bad row destroys its whole 50-row chunk — measured at a
  // 46x amplification on the real feed (12 orphans -> 550 rows lost). These
  // cases are the negative half: the helper must say nothing is missing when
  // nothing is missing, or it becomes a false-alarm generator.
  {
    const r = await chunkedWrite(Array.from({ length: 250 }, (_, i) => i), 50, okWrite);
    ok('failedRowIndices: clean write excludes nothing', failedRowIndices(r, 50).size === 0);
    ok('failedRowIndices: clean write records no failed starts', r.failed_chunk_starts.length === 0);
  }
  {
    const r = await chunkedWrite([], 50, failWrite);
    ok('failedRowIndices: empty input excludes nothing', failedRowIndices(r, 50).size === 0);
  }
  {
    // Fail only the second chunk (indices 50..99).
    let call = 0;
    const failSecond = async (): Promise<ChunkWriteOutcome> => {
      call++;
      return call === 2 ? { error: { message: 'FK violation' } } : { error: null };
    };
    const r = await chunkedWrite(Array.from({ length: 250 }, (_, i) => i), 50, failSecond);
    const idx = failedRowIndices(r, 50);
    ok('failedRowIndices: one failed chunk === 50 indices', idx.size === 50);
    ok('failedRowIndices: names the right window', idx.has(50) && idx.has(99));
    ok('failedRowIndices: excludes the chunks that landed', !idx.has(49) && !idx.has(100));
    ok('failedRowIndices: start index recorded uncapped', r.failed_chunk_starts.join() === '50');
    assertInvariants('fail-second', r);
  }
  {
    // A short trailing chunk must not report indices past the end of input.
    const r = await chunkedWrite(Array.from({ length: 120 }, (_, i) => i), 50, failWrite);
    const idx = failedRowIndices(r, 50);
    ok('failedRowIndices: short final chunk is not over-counted', idx.size === 120);
    ok('failedRowIndices: no index beyond the input', !idx.has(120));
  }
  {
    // The COUNT is uncapped even though the error SAMPLE is capped at 5.
    const r = await chunkedWrite(Array.from({ length: 400 }, (_, i) => i), 10, failWrite);
    ok('failedRowIndices: starts are uncapped while errors are sampled',
      r.failed_chunk_starts.length === 40 && r.errors.length === 5);
    ok('failedRowIndices: covers every lost row', failedRowIndices(r, 10).size === 400);
  }
  {
    // merge must NOT carry indices across parts — they index different arrays.
    const a = await chunkedWrite(Array.from({ length: 100 }, (_, i) => i), 50, failWrite);
    const b = await chunkedWrite(Array.from({ length: 100 }, (_, i) => i), 50, failWrite);
    const m = mergeChunkWriteResults([a, b]);
    ok('merge: does not fabricate cross-array indices', m.failed_chunk_starts.length === 0);
    ok('merge: still reports the totals', m.lost === 200 && m.errors_total === 4);
    assertInvariants('merge-indices', m);
  }

  // ── A nonsense chunk size is a bug, not a silent no-op ─────────────────
  {
    let threw = false;
    try {
      await chunkedWrite([1, 2, 3], 0, okWrite);
    } catch {
      threw = true;
    }
    ok('chunkSize 0 throws rather than looping forever', threw);
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  console.log('ALL PASS');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
