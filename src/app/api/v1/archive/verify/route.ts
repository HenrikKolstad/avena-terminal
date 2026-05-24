/**
 * Archive Chain Verifier
 *
 * Two modes:
 *
 * 1) GET /api/v1/archive/verify?table={name}
 *    Walks every moat_archive_runs row for the table in chronological order
 *    and verifies that row N's prev_sha256 equals row N-1's sha256.
 *    Returns { ok, runs, broken_links, chain }.
 *
 * 2) GET /api/v1/archive/verify?blob_url=...&expected_sha256=...
 *    Downloads the blob, computes SHA-256, compares to expected. Useful for
 *    external verification — a researcher can audit any snapshot without
 *    trusting Avena's internal records.
 *
 * All responses CORS-open, no auth.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'X-Avena-Layer': 'moat-archive',
  'X-Avena-License': 'CC-BY-4.0',
  'Cache-Control': 'public, s-maxage=300',
};

interface ArchiveRunRow {
  run_date: string;
  table_name: string;
  sha256: string;
  prev_sha256: string | null;
  blob_url: string | null;
  row_count: number;
  file_bytes: number;
}

async function verifyChain(table: string) {
  if (!supabase) return { ok: false, error: 'supabase unavailable' };
  const { data, error } = await supabase
    .from('moat_archive_runs')
    .select('run_date, table_name, sha256, prev_sha256, blob_url, row_count, file_bytes')
    .eq('table_name', table)
    .order('run_date', { ascending: true })
    .limit(1000);
  if (error || !data) return { ok: false, error: error?.message ?? 'no data' };
  const runs = data as ArchiveRunRow[];
  const brokenLinks: Array<{ run_date: string; expected: string | null; actual: string | null }> = [];
  for (let i = 1; i < runs.length; i++) {
    const expected = runs[i - 1].sha256;
    const actual = runs[i].prev_sha256;
    if (expected !== actual) {
      brokenLinks.push({ run_date: runs[i].run_date, expected, actual });
    }
  }
  return {
    ok: brokenLinks.length === 0,
    table,
    total_runs: runs.length,
    earliest: runs[0]?.run_date ?? null,
    latest: runs[runs.length - 1]?.run_date ?? null,
    broken_links: brokenLinks,
    chain: runs.map((r) => ({
      run_date: r.run_date,
      sha256: r.sha256,
      prev_sha256: r.prev_sha256,
      blob_url: r.blob_url,
      row_count: r.row_count,
      file_bytes: r.file_bytes,
    })),
  };
}

async function verifyBlob(blobUrl: string, expected: string) {
  const res = await fetch(blobUrl);
  if (!res.ok) return { ok: false, error: `blob fetch HTTP ${res.status}` };
  const buf = Buffer.from(await res.arrayBuffer());
  const actual = createHash('sha256').update(buf).digest('hex');
  return {
    ok: actual === expected,
    blob_url: blobUrl,
    expected_sha256: expected,
    computed_sha256: actual,
    bytes_downloaded: buf.length,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const table = searchParams.get('table');
  const blobUrl = searchParams.get('blob_url');
  const expected = searchParams.get('expected_sha256');

  try {
    if (blobUrl && expected) {
      const result = await verifyBlob(blobUrl, expected);
      return NextResponse.json(result, { status: result.ok ? 200 : 422, headers: HEADERS });
    }
    if (table) {
      const result = await verifyChain(table);
      return NextResponse.json(result, { headers: HEADERS });
    }
    return NextResponse.json({
      ok: false,
      usage: {
        chain_check: '/api/v1/archive/verify?table=eu_official_stats',
        blob_check: '/api/v1/archive/verify?blob_url=https://....blob.vercel-storage.com/...&expected_sha256=...',
      },
    }, { status: 400, headers: HEADERS });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500, headers: HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { ...HEADERS, 'Access-Control-Allow-Methods': 'GET, OPTIONS' },
  });
}
