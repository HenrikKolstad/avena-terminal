/**
 * AVN-ID Registry — issuance, signing, verification.
 *
 * The canonical identifier for European property. Avena issues, signs, and
 * verifies. Once an AVN-ID is issued, the signed receipt makes the
 * identifier verifiable forever by anyone who has Avena's public key.
 *
 * ID grammar:
 *   AVN:<COUNTRY>-<POSTAL>-<CATEGORY>-<SEQ>
 *   e.g. AVN:ES-03185-NB-0421
 *
 *   COUNTRY   ISO 3166-1 alpha-2
 *   POSTAL    country postal code (zero-padded to local length)
 *   CATEGORY  NB | EX | CM | LH | FR | PL
 *   SEQ       YYMM + 2-digit local index (e.g. 0421 = April 2026 #21)
 *
 * Signing:
 *   payload   country + postal + category + seq + canonical_fingerprint
 *   sig       HMAC-SHA256(payload, AVENA_SIGNING_SECRET) — first 32 hex chars
 *
 * Verification:
 *   anyone can call /api/v1/avn-id/<id>/verify with the original payload
 *   → re-computes HMAC, compares to stored sig, returns boolean.
 *
 * Roadmap: migrate from HMAC to Ed25519 (asymmetric) so the public key
 * can be openly published and signatures verified without round-trips.
 */

import { createHmac, createHash, randomBytes } from 'crypto';
import { supabase } from '@/lib/supabase';

export type AVNCategory = 'NB' | 'EX' | 'CM' | 'LH' | 'FR' | 'PL';

export interface AVNIDIssueInput {
  country: string;                       // ISO 3166-1 alpha-2
  postal_code: string;                   // local postal code
  category: AVNCategory;
  // Canonical fingerprint inputs — whatever identifies the property uniquely
  cadastral_ref?: string;
  street?: string;
  built_m2?: number;
  lat?: number;
  lng?: number;
  source_ref?: string;                   // ref from upstream feed (e.g. Avena ref)
  source_portal?: string;
}

export interface AVNIDRecord {
  avn_id: string;
  country: string;
  postal_code: string;
  category: AVNCategory;
  seq: string;
  payload_hash: string;
  signature: string;
  issued_at: string;
  issuer: string;
  fingerprint: Record<string, unknown>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function pad(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : '0'.repeat(n - s.length) + s;
}

function generateSeq(now: Date): string {
  // YYMM + 2-digit random local sequence index
  const yy = String(now.getUTCFullYear() % 100).padStart(2, '0');
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const idx = String(Math.floor(Math.random() * 100)).padStart(2, '0');
  return `${yy}${mm}${idx}`;
}

function canonicalFingerprint(input: AVNIDIssueInput): Record<string, unknown> {
  // Deterministic, ordered, lower-cased — same inputs → same fingerprint hash
  const fp: Record<string, unknown> = {
    country: input.country.toUpperCase(),
    postal: input.postal_code,
    category: input.category,
  };
  if (input.cadastral_ref) fp.cadastral_ref = input.cadastral_ref.toUpperCase();
  if (input.street)        fp.street = input.street.trim().toLowerCase();
  if (input.built_m2)      fp.built_m2 = Math.round(input.built_m2);
  if (input.lat != null && input.lng != null) {
    // Round to 5 decimals (~1m precision) — avoids cadastral imprecision creating duplicate IDs
    fp.lat = Math.round(input.lat * 100_000) / 100_000;
    fp.lng = Math.round(input.lng * 100_000) / 100_000;
  }
  if (input.source_ref)    fp.source_ref = input.source_ref;
  if (input.source_portal) fp.source_portal = input.source_portal;
  return fp;
}

function fingerprintHash(fp: Record<string, unknown>): string {
  // Canonical JSON (sorted keys) → SHA-256
  const keys = Object.keys(fp).sort();
  const canon = keys.map((k) => `${k}:${JSON.stringify(fp[k])}`).join('|');
  return createHash('sha256').update(canon).digest('hex');
}

function signAVNID(avn_id: string, payload_hash: string, secret: string): string {
  return createHmac('sha256', secret).update(`${avn_id}::${payload_hash}`).digest('hex').slice(0, 32);
}

function getSigningSecret(): string {
  // Use a dedicated env var; fallback to a derived secret for dev so we never
  // ship un-signed records. Production must set AVENA_SIGNING_SECRET.
  return process.env.AVENA_SIGNING_SECRET
      ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ?? 'dev-fallback-' + randomBytes(8).toString('hex');
}

// ─── Public API ───────────────────────────────────────────────────────────

export async function issueAVNID(input: AVNIDIssueInput): Promise<AVNIDRecord> {
  const country = input.country.toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) {
    throw new Error(`Invalid country code: ${input.country} (expected ISO 3166-1 alpha-2)`);
  }
  if (!['NB', 'EX', 'CM', 'LH', 'FR', 'PL'].includes(input.category)) {
    throw new Error(`Invalid category: ${input.category}`);
  }

  // Idempotency check — if this fingerprint was already registered, return the existing record
  const fingerprint = canonicalFingerprint(input);
  const fp_hash = fingerprintHash(fingerprint);
  if (supabase) {
    try {
      const { data } = await supabase
        .from('avn_id_registry')
        .select('*')
        .eq('payload_hash', fp_hash)
        .limit(1)
        .single();
      if (data) return data as AVNIDRecord;
    } catch { /* nothing to do — not found, proceed to issue */ }
  }

  const seq = generateSeq(new Date());
  const postal = input.postal_code.trim();
  const avn_id = `AVN:${country}-${postal}-${input.category}-${seq}`;
  const signature = signAVNID(avn_id, fp_hash, getSigningSecret());

  const record: AVNIDRecord = {
    avn_id,
    country,
    postal_code: postal,
    category: input.category,
    seq,
    payload_hash: fp_hash,
    signature,
    issued_at: new Date().toISOString(),
    issuer: 'avena-terminal-v1',
    fingerprint,
  };

  if (supabase) {
    try { await supabase.from('avn_id_registry').insert(record); }
    catch { /* non-fatal — caller still receives the issued record */ }
  }

  return record;
}

export async function lookupAVNID(avn_id: string): Promise<AVNIDRecord | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase
      .from('avn_id_registry')
      .select('*')
      .eq('avn_id', avn_id)
      .limit(1)
      .single();
    return (data as AVNIDRecord) ?? null;
  } catch { return null; }
}

export function verifyAVNID(avn_id: string, payload_hash: string, signature: string): boolean {
  const expected = signAVNID(avn_id, payload_hash, getSigningSecret());
  return expected === signature;
}

export async function registryStats(): Promise<{ total: number; by_country: Record<string, number>; by_category: Record<string, number>; latest: string | null }> {
  if (!supabase) return { total: 0, by_country: {}, by_category: {}, latest: null };
  try {
    const { count } = await supabase
      .from('avn_id_registry')
      .select('*', { count: 'exact', head: true });

    const { data: rows } = await supabase
      .from('avn_id_registry')
      .select('country, category, issued_at')
      .order('issued_at', { ascending: false })
      .limit(2000);

    const by_country: Record<string, number> = {};
    const by_category: Record<string, number> = {};
    for (const r of (rows ?? []) as Array<{ country: string; category: string; issued_at: string }>) {
      by_country[r.country] = (by_country[r.country] ?? 0) + 1;
      by_category[r.category] = (by_category[r.category] ?? 0) + 1;
    }
    return {
      total: count ?? 0,
      by_country,
      by_category,
      latest: rows?.[0]?.issued_at ?? null,
    };
  } catch {
    return { total: 0, by_country: {}, by_category: {}, latest: null };
  }
}

export async function recentIssuances(limit = 12): Promise<AVNIDRecord[]> {
  if (!supabase) return [];
  try {
    const { data } = await supabase
      .from('avn_id_registry')
      .select('*')
      .order('issued_at', { ascending: false })
      .limit(limit);
    return (data ?? []) as AVNIDRecord[];
  } catch { return []; }
}
