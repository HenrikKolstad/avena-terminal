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
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';

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
  // A failed insert used to return `{ id: null }`, which is exactly what a
  // successful hash-with-no-database also returns. The caller could not tell
  // "attested" from "silently dropped", so throw and let the cron report it.
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
  if (error) throw new Error(`fingerprint insert failed (${input.fingerprint_type}): ${error.message}`);
  return { id: (data as { id: string }).id, sha256_hash };
}

/* -------------------------------------------------------------------------- */
/* Daily artefact recording — what actually feeds the log                      */
/* -------------------------------------------------------------------------- */

const SITE = process.env.NEXT_PUBLIC_APP_URL || 'https://avenaterminal.com';

/** Refuse to attest an artefact we could not actually read. An empty or absent
 *  artefact hashed and committed would be a fingerprint of nothing presented as
 *  a fingerprint of something — the fabrication this whole surface exists to
 *  make impossible. */
function assertNonEmpty(name: string, value: unknown): void {
  if (value === null || value === undefined) throw new Error(`${name}: artefact is empty`);
  if (Array.isArray(value) && value.length === 0) throw new Error(`${name}: artefact is an empty array`);
  if (typeof value === 'object' && Object.keys(value as object).length === 0) {
    throw new Error(`${name}: artefact is an empty object`);
  }
}

async function fetchJson(path: string): Promise<unknown> {
  const res = await fetch(`${SITE}${path}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`GET ${path} -> HTTP ${res.status}`);
  return res.json();
}

/**
 * Read every row of one observation day, paginated.
 *
 * PostgREST caps a response at 1,000 rows and the book is ~2,000 refs, so an
 * unpaginated read returns half a day and hashes it as if it were the whole
 * day. That exact cap has already produced two published falsehoods in this
 * repo (9c387fd, b730a1d). Running out of page budget throws rather than
 * returning a short slice.
 */
async function readSnapshotBatch(date: string): Promise<Array<{ ref: string; price: number }>> {
  if (!supabase) throw new Error('no database client');
  const PAGE = 1000;
  const MAX_PAGES = 60; // ~60k rows; the book is ~2k
  const out: Array<{ ref: string; price: number }> = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await supabase
      .from('price_snapshots')
      .select('ref, price')
      .eq('snapshot_date', date)
      .order('ref', { ascending: true })
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) throw new Error(`price_snapshots read failed on page ${page}: ${error.message}`);
    const rows = (data as Array<{ ref: string; price: number | string }> | null) ?? [];
    for (const r of rows) out.push({ ref: r.ref, price: Number(r.price) });
    if (rows.length < PAGE) return out;
  }
  throw new Error(`price_snapshots for ${date} exceeded ${MAX_PAGES} pages; refusing to hash a truncated batch`);
}

export interface DailyArtefactResult {
  recorded: Array<{ type: string; source_id: string; sha256_hash: string }>;
  unchanged: number;
  errors: string[];
  latest_batch_date: string | null;
  batch_age_days: number | null;
}

/**
 * Fingerprint the artefacts Avena actually ships, once each per distinct state.
 *
 * WHY THIS EXISTS: /verify, /stack, /proof, /papers/delphi and llms.txt have
 * all told readers that "every methodology version, model snapshot and dataset
 * batch is fingerprinted with SHA-256" since June. Nothing in production ever
 * called recordFingerprint — the only row in integrity_fingerprints was seeded
 * by scripts/run-pipeline-local.ts on 2026-06-10. The claim was published; the
 * mechanism was not running. This is the mechanism.
 *
 * IDEMPOTENCY: an artefact whose bytes have not changed is not re-attested. The
 * log records distinct STATES, not one row per artefact per day, so a repeated
 * run adds nothing and an unchanged model does not manufacture attestations.
 *
 * THE PRICE BATCH IS DELIBERATELY YESTERDAY'S. pricing-history only ever writes
 * rows dated today, so any date strictly before today is closed and complete.
 * Hashing "today" would race the nightly capture and could attest half a book.
 * The artefact carries its own snapshot_date, so the attestation is about that
 * observation day regardless of when the roll ran.
 */
export async function recordDailyArtefacts(dateISO?: string): Promise<DailyArtefactResult> {
  const result: DailyArtefactResult = {
    recorded: [], unchanged: 0, errors: [], latest_batch_date: null, batch_age_days: null,
  };
  if (!supabase) {
    result.errors.push('no database client');
    return result;
  }

  const today = dateISO ?? new Date().toISOString().slice(0, 10);

  // Skip anything already attested with identical bytes.
  const commit = async (
    type: RecordFingerprintInput['fingerprint_type'],
    source_table: string,
    source_id: string,
    artefact: unknown,
    summary: string,
  ): Promise<void> => {
    assertNonEmpty(`${type}/${source_id}`, artefact);
    const { sha256_hash } = hashJsonArtefact(artefact);
    const { data: existing, error: dupError } = await supabase!
      .from('integrity_fingerprints')
      .select('id')
      .eq('sha256_hash', sha256_hash)
      .limit(1);
    if (dupError) throw new Error(`duplicate check failed (${source_id}): ${dupError.message}`);
    if (existing && existing.length > 0) { result.unchanged++; return; }
    await recordFingerprint({ fingerprint_type: type, source_table, source_id, artefact, artefact_summary: summary });
    result.recorded.push({ type, source_id, sha256_hash });
  };

  // Each artefact is independent: one unreachable source must not stop the rest
  // from being attested, but every failure is reported and flips the run red.
  const attempt = async (label: string, fn: () => Promise<void>): Promise<void> => {
    try { await fn(); }
    catch (e) { result.errors.push(`${label}: ${e instanceof Error ? e.message : String(e)}`); }
  };

  // 1. The observation batch — the artefact the whole moat rests on.
  await attempt('price_batch', async () => {
    const { data: latest, error } = await supabase!
      .from('price_snapshots')
      .select('snapshot_date')
      .lt('snapshot_date', today)
      .order('snapshot_date', { ascending: false })
      .limit(1);
    if (error) throw new Error(`latest snapshot_date read failed: ${error.message}`);
    const date = (latest as Array<{ snapshot_date: string }> | null)?.[0]?.snapshot_date;
    if (!date) throw new Error('no closed observation day found');
    result.latest_batch_date = date;
    result.batch_age_days = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86400000);
    const rows = await readSnapshotBatch(date);
    if (rows.length === 0) throw new Error(`observation day ${date} returned no rows`);
    const refs: Record<string, number> = {};
    for (const r of rows) refs[r.ref] = r.price;
    await commit(
      'price_batch', 'price_snapshots', `price_snapshots:${date}`,
      { snapshot_date: date, ref_count: rows.length, refs },
      `Observed asking prices for ${rows.length} refs on ${date}`,
    );
  });

  // 2. The published model snapshot and dataset artefact, exactly as served.
  await attempt('model_snapshot', async () => {
    const stats = await fetchJson('/model-stats.json');
    await commit('model_snapshot', 'public/model-stats.json', 'model-stats.json', stats, 'AVM accuracy snapshot as published');
  });

  await attempt('dataset', async () => {
    const ds = await fetchJson('/open-data/dataset.json') as { version?: string };
    await commit('dataset', 'public/open-data/dataset.json', `open-data:${ds?.version ?? 'unversioned'}`, ds, `Open-data corpus manifest ${ds?.version ?? ''}`.trim());
  });

  // 3. Methodology weights — the specific claim made on /methodology.
  await attempt('methodology', async () => {
    const { data, error } = await supabase!
      .from('methodology_versions')
      .select('methodology_name, semver, weights')
      .is('deactivated_at', null)
      .order('methodology_name', { ascending: true });
    if (error) throw new Error(`methodology_versions read failed: ${error.message}`);
    const versions = (data as Array<{ methodology_name: string; semver: string; weights: unknown }> | null) ?? [];
    if (versions.length === 0) throw new Error('no active methodology versions');
    for (const v of versions) {
      await commit(
        'methodology', 'methodology_versions', `${v.methodology_name}@${v.semver}`,
        { methodology_name: v.methodology_name, semver: v.semver, weights: v.weights },
        `Weights for ${v.methodology_name} v${v.semver}`,
      );
    }
  });

  return result;
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
  const UNROLLED_CAP = 50000;
  const { data: rows, error: selectError } = await supabase
    .from('integrity_fingerprints')
    .select('id, sha256_hash, committed_at')
    .is('daily_merkle_root', null)
    .lte('committed_at', cutoff)
    .order('committed_at', { ascending: true })
    .limit(UNROLLED_CAP);
  if (selectError) throw new Error(`unrolled fingerprint read failed: ${selectError.message}`);
  const fingerprints = (rows as Array<{ id: string; sha256_hash: string }> | null) ?? [];
  if (fingerprints.length >= UNROLLED_CAP) {
    // A truncated read would produce a root over a SUBSET while tagging only
    // that subset as rolled — a root that silently attests less than it claims.
    throw new Error(`unrolled fingerprints hit the ${UNROLLED_CAP} read cap; refusing to roll a partial root`);
  }
  if (fingerprints.length === 0) return { root_date: today, merkle_root: sha256(''), count: 0, inserted: false };

  const root = merkleRoot(fingerprints.map(f => f.sha256_hash));

  // Insert daily root FIRST, and only tag the fingerprints if it landed.
  //
  // This used to be `try { await upsert } catch {}`. supabase-js resolves with
  // `{ error }` instead of throwing, so the catch was unreachable and a failed
  // upsert was indistinguishable from a stored root. The tagging update then
  // ran anyway, stamping every fingerprint with a `daily_root_date` whose root
  // row did not exist — permanently, because the tag is what excludes them from
  // the next roll. /verify would then answer with a root it cannot show.
  // Order matters: root first, tag second, neither silent.
  const { error: rootError } = await supabase.from('integrity_daily_roots').upsert({
    root_date: today,
    merkle_root: root,
    fingerprint_count: fingerprints.length,
  });
  if (rootError) throw new Error(`daily root upsert failed: ${rootError.message}`);

  // Tag each fingerprint with the root
  const ids = fingerprints.map(f => f.id);
  const { error: tagError } = await supabase
    .from('integrity_fingerprints')
    .update({ daily_merkle_root: root, daily_root_date: today })
    .in('id', ids);
  if (tagError) throw new Error(`fingerprint tagging failed after root ${root.slice(0, 12)} was stored: ${tagError.message}`);

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
