/**
 * Integrity Fingerprints — Architectural Commitment 7 (de-cryptoed).
 *
 * For each artefact (methodology version, model snapshot, dataset batch,
 * event log segment) we compute a SHA-256 hash and record it in
 * `integrity_fingerprints`. Once a day a cron computes the Merkle root
 * of all unrolled fingerprints and deposits the root to Zenodo (which
 * applies an RFC 3161 trusted timestamp). The daily root is stored in
 * `integrity_daily_roots`.
 *
 * Verification flow on /verify:
 *   1. User pastes an artefact (or a hash they have).
 *   2. We hash it (SHA-256) and look it up by hash.
 *   3. If found, we return the daily Merkle root and the Zenodo URL where
 *      the root is permanently timestamped.
 *
 * Same cryptographic property as the original Ethereum plan, infrastructure
 * institutional buyers actually trust (Zenodo / CERN, RFC 3161).
 */

import { createHash } from 'crypto';
import { supabase } from '@/lib/supabase';

export interface FingerprintRow {
  id: string;
  fingerprint_type: string;
  source_table: string | null;
  source_id: string | null;
  sha256_hash: string;
  artefact_bytes: number | null;
  artefact_summary: string | null;
  daily_merkle_root: string | null;
  daily_root_date: string | null;
  zenodo_deposit_id: string | null;
  zenodo_url: string | null;
  committed_at: string;
}

export interface DailyRootRow {
  root_date: string;
  merkle_root: string;
  fingerprint_count: number;
  zenodo_deposit_id: string | null;
  zenodo_url: string | null;
  deposited_at: string | null;
  created_at: string;
}

/* -------------------------------------------------------------------------- */
/* Hashing                                                                     */
/* -------------------------------------------------------------------------- */

export function sha256(input: string | Buffer): string {
  return createHash('sha256').update(input).digest('hex');
}

/** Canonical JSON serialiser: keys sorted recursively so equal objects hash
 *  to the same digest regardless of key order. Critical for reproducibility. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return '{' + entries.map(([k, v]) => JSON.stringify(k) + ':' + canonicalJson(v)).join(',') + '}';
}

export function hashJsonArtefact(value: unknown): { sha256_hash: string; canonical: string } {
  const canonical = canonicalJson(value);
  return { sha256_hash: sha256(canonical), canonical };
}

/* -------------------------------------------------------------------------- */
/* Merkle root                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Compute a Merkle root over a list of hex SHA-256 hashes.
 * Pair-hash + duplicate-last-when-odd, the standard Bitcoin/Zcash style.
 */
export function merkleRoot(hashes: string[]): string {
  if (hashes.length === 0) return sha256('');
  let layer = [...hashes];
  while (layer.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = layer[i + 1] ?? layer[i];
      next.push(sha256(Buffer.from(left + right, 'hex')));
    }
    layer = next;
  }
  return layer[0];
}

/* -------------------------------------------------------------------------- */
/* Record a fingerprint                                                        */
/* -------------------------------------------------------------------------- */

export interface RecordFingerprintInput {
  fingerprint_type: 'methodology' | 'model_snapshot' | 'price_batch' | 'dataset' | 'event_log_segment';
  source_table?: string;
  source_id?: string;
  artefact: unknown;          // JSON-serialisable; we hash the canonical form
  artefact_summary?: string;
}

export async function recordFingerprint(input: RecordFingerprintInput): Promise<{ id: string | null; sha256_hash: string }> {
  const { sha256_hash, canonical } = hashJsonArtefact(input.artefact);
  if (!supabase) return { id: null, sha256_hash };
  try {
    const { data, error } = await supabase
      .from('integrity_fingerprints')
      .insert({
        fingerprint_type: input.fingerprint_type,
        source_table: input.source_table ?? null,
        source_id: input.source_id ?? null,
        sha256_hash,
        artefact_bytes: canonical.length,
        artefact_summary: input.artefact_summary ?? null,
      })
      .select('id')
      .single();
    if (error) return { id: null, sha256_hash };
    return { id: (data as { id: string }).id, sha256_hash };
  } catch {
    return { id: null, sha256_hash };
  }
}

/* -------------------------------------------------------------------------- */
/* Daily root roll-up                                                          */
/* -------------------------------------------------------------------------- */

export async function rollDailyRoot(dateISO?: string): Promise<{
  root_date: string;
  merkle_root: string;
  count: number;
  inserted: boolean;
} | null> {
  if (!supabase) return null;
  const today = (dateISO ?? new Date().toISOString().slice(0, 10));
  // Pick all unrolled fingerprints committed on/before today
  const cutoff = `${today}T23:59:59.999Z`;
  const { data: rows } = await supabase
    .from('integrity_fingerprints')
    .select('id, sha256_hash, committed_at')
    .is('daily_merkle_root', null)
    .lte('committed_at', cutoff)
    .order('committed_at', { ascending: true })
    .limit(50000);
  const fingerprints = (rows as Array<{ id: string; sha256_hash: string }> | null) ?? [];
  if (fingerprints.length === 0) return { root_date: today, merkle_root: sha256(''), count: 0, inserted: false };

  const root = merkleRoot(fingerprints.map(f => f.sha256_hash));

  // Insert daily root (idempotent by primary key)
  try {
    await supabase.from('integrity_daily_roots').upsert({
      root_date: today,
      merkle_root: root,
      fingerprint_count: fingerprints.length,
    });
  } catch { /* tolerate */ }

  // Tag each fingerprint with the root
  const ids = fingerprints.map(f => f.id);
  try {
    await supabase
      .from('integrity_fingerprints')
      .update({ daily_merkle_root: root, daily_root_date: today })
      .in('id', ids);
  } catch { /* tolerate */ }

  return { root_date: today, merkle_root: root, count: fingerprints.length, inserted: true };
}

/* -------------------------------------------------------------------------- */
/* Verification                                                                */
/* -------------------------------------------------------------------------- */

export async function verifyByArtefact(artefact: unknown): Promise<{
  sha256_hash: string;
  matched: FingerprintRow | null;
  daily_root: DailyRootRow | null;
}> {
  const { sha256_hash } = hashJsonArtefact(artefact);
  return verifyByHash(sha256_hash);
}

export async function verifyByHash(sha256_hash: string): Promise<{
  sha256_hash: string;
  matched: FingerprintRow | null;
  daily_root: DailyRootRow | null;
}> {
  if (!supabase) return { sha256_hash, matched: null, daily_root: null };
  const { data: row } = await supabase
    .from('integrity_fingerprints')
    .select('*')
    .eq('sha256_hash', sha256_hash)
    .order('committed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const matched = (row as FingerprintRow | null) ?? null;
  let daily_root: DailyRootRow | null = null;
  if (matched?.daily_root_date) {
    const { data: dr } = await supabase
      .from('integrity_daily_roots')
      .select('*')
      .eq('root_date', matched.daily_root_date)
      .maybeSingle();
    daily_root = (dr as DailyRootRow | null) ?? null;
  }
  return { sha256_hash, matched, daily_root };
}

export async function recentDailyRoots(limit = 30): Promise<DailyRootRow[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('integrity_daily_roots')
    .select('*')
    .order('root_date', { ascending: false })
    .limit(limit);
  return (data as DailyRootRow[]) || [];
}
