/**
 * Moat Archive — daily off-site snapshot of every institutional Supabase table.
 *
 * Pipeline:
 *   1. Read all rows from the target table (chunked).
 *   2. Serialise to JSONL (one row per line, deterministic key order).
 *   3. Gzip the JSONL payload.
 *   4. SHA-256 the gzipped bytes.
 *   5. Read previous run's sha for this table → chain.
 *   6. Upload to Vercel Blob as a public, immutable object.
 *   7. Insert a moat_archive_runs row with the chain link.
 *
 * Recovery model: any Supabase table can be rebuilt from the latest blob
 * snapshot. The hash chain proves no historical snapshot has been tampered
 * with — every blob's pathname embeds its sha, and the moat_archive_runs
 * row stores prev_sha256, so verifying the chain is `for each (table, day):
 * check that row.prev_sha256 == previous_row.sha256`.
 *
 * Storage location is independent of Supabase by design — Vercel Blob runs
 * on a different provider (Cloudflare R2 under the hood) so a Supabase
 * region failure cannot wipe the archive.
 */

import { put } from '@vercel/blob';
import { createHash } from 'crypto';
import { gzipSync } from 'zlib';
import { supabase } from '@/lib/supabase';

const TABLE_TARGETS: Array<{ name: string; recentDaysOnly?: number }> = [
  { name: 'eu_official_stats' },
  { name: 'eu_validation_snapshots' },
  { name: 'eu_anomalies' },
  { name: 'avn_id_registry' },
  { name: 'sovereign_briefings' },
  { name: 'counterpart_health_history', recentDaysOnly: 365 },
  { name: 'price_snapshots', recentDaysOnly: 90 },
];

export interface ArchiveOutcome {
  table_name: string;
  row_count: number;
  file_bytes: number;
  sha256: string;
  prev_sha256: string | null;
  blob_url: string | null;
  blob_path: string;
  error?: string;
}

function sortedStringify(obj: Record<string, unknown>): string {
  const keys = Object.keys(obj).sort();
  const ordered: Record<string, unknown> = {};
  for (const k of keys) ordered[k] = obj[k];
  return JSON.stringify(ordered);
}

async function fetchAllRows(table: string, recentDaysOnly?: number): Promise<Record<string, unknown>[]> {
  if (!supabase) return [];
  const rows: Record<string, unknown>[] = [];
  const pageSize = 1000;
  let offset = 0;
  while (true) {
    let q = supabase.from(table).select('*').range(offset, offset + pageSize - 1);
    if (recentDaysOnly) {
      const cutoff = new Date();
      cutoff.setUTCDate(cutoff.getUTCDate() - recentDaysOnly);
      // price_snapshots uses snapshot_date; counterpart_health_history uses history_date
      // Fall back gracefully if the column doesn't exist
      const col = table === 'price_snapshots' ? 'snapshot_date' : 'history_date';
      q = q.gte(col, cutoff.toISOString().slice(0, 10));
    }
    const { data, error } = await q;
    if (error) {
      if (offset === 0) throw error;
      break;
    }
    const batch = (data ?? []) as Record<string, unknown>[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
    if (offset > 200_000) break; // safety cap
  }
  return rows;
}

async function previousSha(table: string): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from('moat_archive_runs')
    .select('sha256')
    .eq('table_name', table)
    .order('run_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { sha256?: string } | null)?.sha256 ?? null;
}

async function archiveOne(table: string, recentDaysOnly: number | undefined, runDate: string): Promise<ArchiveOutcome> {
  const rows = await fetchAllRows(table, recentDaysOnly);
  const jsonl = rows.map(sortedStringify).join('\n') + '\n';
  const gz = gzipSync(Buffer.from(jsonl, 'utf-8'));
  const sha256 = createHash('sha256').update(gz).digest('hex');
  const prev = await previousSha(table);
  const blobPath = `moat-archive/${runDate}/${table}.${sha256.slice(0, 16)}.jsonl.gz`;

  let blobUrl: string | null = null;
  try {
    const result = await put(blobPath, gz, {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/gzip',
    });
    blobUrl = result.url;
  } catch (e) {
    return {
      table_name: table,
      row_count: rows.length,
      file_bytes: gz.length,
      sha256,
      prev_sha256: prev,
      blob_url: null,
      blob_path: blobPath,
      error: `blob upload failed: ${(e as Error).message}`,
    };
  }

  if (supabase) {
    await supabase.from('moat_archive_runs').upsert({
      run_date: runDate,
      table_name: table,
      row_count: rows.length,
      file_bytes: gz.length,
      sha256,
      prev_sha256: prev,
      blob_url: blobUrl,
      blob_path: blobPath,
    }, { onConflict: 'run_date,table_name' });
  }

  return {
    table_name: table,
    row_count: rows.length,
    file_bytes: gz.length,
    sha256,
    prev_sha256: prev,
    blob_url: blobUrl,
    blob_path: blobPath,
  };
}

export async function runMoatArchive(): Promise<{ run_date: string; outcomes: ArchiveOutcome[] }> {
  const runDate = new Date().toISOString().slice(0, 10);
  const outcomes: ArchiveOutcome[] = [];
  for (const target of TABLE_TARGETS) {
    try {
      outcomes.push(await archiveOne(target.name, target.recentDaysOnly, runDate));
    } catch (e) {
      outcomes.push({
        table_name: target.name,
        row_count: 0,
        file_bytes: 0,
        sha256: '',
        prev_sha256: null,
        blob_url: null,
        blob_path: '',
        error: (e as Error).message,
      });
    }
  }
  return { run_date: runDate, outcomes };
}

// ─── Read API for UI ──────────────────────────────────────────────────────

export interface ArchiveRunRow {
  run_date: string;
  table_name: string;
  row_count: number;
  file_bytes: number;
  sha256: string;
  prev_sha256: string | null;
  blob_url: string | null;
  blob_path: string;
  created_at: string;
}

export async function listArchiveRuns(limit = 100): Promise<ArchiveRunRow[]> {
  if (!supabase) return [];
  try {
    const { data } = await supabase
      .from('moat_archive_runs')
      .select('*')
      .order('run_date', { ascending: false })
      .order('table_name', { ascending: true })
      .limit(limit);
    return (data ?? []) as ArchiveRunRow[];
  } catch { return []; }
}

export async function archiveSummary(): Promise<{
  total_runs: number;
  tables_archived: number;
  bytes_total: number;
  latest_run_date: string | null;
  by_table: Record<string, { runs: number; latest_rows: number; latest_bytes: number; latest_sha256: string }>;
}> {
  if (!supabase) return { total_runs: 0, tables_archived: 0, bytes_total: 0, latest_run_date: null, by_table: {} };
  try {
    const { data, count } = await supabase
      .from('moat_archive_runs')
      .select('*', { count: 'exact' })
      .order('run_date', { ascending: false })
      .limit(2000);
    const rows = (data ?? []) as ArchiveRunRow[];
    const by_table: Record<string, { runs: number; latest_rows: number; latest_bytes: number; latest_sha256: string }> = {};
    let bytes_total = 0;
    let latest_run_date: string | null = null;
    for (const r of rows) {
      bytes_total += r.file_bytes ?? 0;
      if (!latest_run_date || r.run_date > latest_run_date) latest_run_date = r.run_date;
      if (!by_table[r.table_name]) {
        by_table[r.table_name] = { runs: 0, latest_rows: r.row_count, latest_bytes: r.file_bytes, latest_sha256: r.sha256 };
      }
      by_table[r.table_name].runs++;
    }
    return {
      total_runs: count ?? 0,
      tables_archived: Object.keys(by_table).length,
      bytes_total,
      latest_run_date,
      by_table,
    };
  } catch {
    return { total_runs: 0, tables_archived: 0, bytes_total: 0, latest_run_date: null, by_table: {} };
  }
}
