/**
 * APON — Avena Property Oracle Network
 *
 * Signed price feeds that DeFi RWA platforms, smart contracts, and any
 * downstream system can consume + verify without trusting the wire.
 *
 * Two feed types:
 *   1. Property feed       /api/v1/oracle/property/[avn_id|ref]
 *   2. Index feed          /api/v1/oracle/index/[code]
 *
 * Every response carries:
 *   payload         {ref, pm2_eur, mm2_eur, score, yield_gross, ...}
 *   payload_hash    sha256(canonical_json(payload))
 *   signature       HMAC-SHA256(payload_hash || nonce || ts, AVENA_SIGNING_SECRET)[:32]
 *   nonce           random 16 bytes hex — prevents replay across requests
 *   timestamp       ISO 8601
 *   signing_method  'HMAC-SHA256-v1'
 *   issuer          'avena-terminal-oracle-v1'
 *
 * Verification:
 *   GET /api/v1/oracle/verify with the full envelope → returns valid: true|false
 *
 * Future v2: Ed25519 asymmetric signing → public key published, no
 * round-trip needed. The verify endpoint becomes optional.
 */

import { createHmac, createHash, randomBytes } from 'crypto';
import { getAllProperties } from '@/lib/properties';
import type { Property } from '@/lib/types';
import { supabase } from '@/lib/supabase';

export interface OraclePropertyPayload {
  ref: string;
  town: string;
  region: string;
  country: string;
  type: string;
  asking_price_eur: number;
  price_per_m2_eur: number | null;
  market_reference_pm2_eur: number;
  built_m2: number;
  avena_score: number;
  yield_gross_pct: number | null;
  status: string;
  energy_rating: string | null;
}

export interface OracleIndexPayload {
  code: 'AVENA-CC' | 'AVENA-VAL' | 'AVENA-SCR' | 'AVENA-DPT';
  level: number;
  base: number;
  base_date: string;
  change_1d_pct: number | null;
  change_30d_pct: number | null;
  as_of: string;
}

export interface SignedEnvelope<T> {
  feed: 'oracle.property' | 'oracle.index';
  payload: T;
  payload_hash: string;
  signature: string;
  nonce: string;
  timestamp: string;
  signing_method: 'HMAC-SHA256-v1';
  issuer: 'avena-terminal-oracle-v1';
  verify_url: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function canonicalJSON(obj: Record<string, unknown>): string {
  // Sort keys deterministically — required so any consumer can re-hash and match
  const keys = Object.keys(obj).sort();
  const pairs = keys.map((k) => `"${k}":${JSON.stringify(obj[k])}`);
  return `{${pairs.join(',')}}`;
}

function hashPayload(obj: Record<string, unknown>): string {
  return createHash('sha256').update(canonicalJSON(obj)).digest('hex');
}

function signOracle(payload_hash: string, nonce: string, ts: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(`${payload_hash}::${nonce}::${ts}`)
    .digest('hex')
    .slice(0, 32);
}

function getSecret(): string {
  return process.env.AVENA_SIGNING_SECRET
      ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ?? 'dev-oracle-fallback';
}

// ─── Property feed ────────────────────────────────────────────────────────

function propertyToPayload(p: Property): OraclePropertyPayload {
  return {
    ref: p.ref ?? '',
    town: (p.l ?? '').split(',')[0].trim(),
    region: p.costa ?? p.r ?? '',
    country: p.country ?? 'ES',
    type: p.t,
    asking_price_eur: p.pf,
    price_per_m2_eur: p.pm2 ?? null,
    market_reference_pm2_eur: p.mm2,
    built_m2: p.bm,
    avena_score: Math.round(p._sc ?? 0),
    yield_gross_pct: p._yield?.gross ?? null,
    status: p.s,
    energy_rating: p.energy ?? null,
  };
}

export function signPropertyFeed(ref: string): SignedEnvelope<OraclePropertyPayload> | null {
  const properties = getAllProperties();
  const p = properties.find((x) => x.ref === ref || x.dev_ref === ref);
  if (!p) return null;

  const payload = propertyToPayload(p);
  const payload_hash = hashPayload(payload as unknown as Record<string, unknown>);
  const nonce = randomBytes(16).toString('hex');
  const timestamp = new Date().toISOString();
  const signature = signOracle(payload_hash, nonce, timestamp, getSecret());

  return {
    feed: 'oracle.property',
    payload,
    payload_hash,
    signature,
    nonce,
    timestamp,
    signing_method: 'HMAC-SHA256-v1',
    issuer: 'avena-terminal-oracle-v1',
    verify_url: `https://avenaterminal.com/api/v1/oracle/verify`,
  };
}

// ─── Index feed ───────────────────────────────────────────────────────────

const INDEX_COLUMNS: Record<string, string> = {
  'AVENA-CC':  'value',
  'AVENA-VAL': 'value_index',
  'AVENA-SCR': 'score_index',
  'AVENA-DPT': 'depth_index',
};

export async function signIndexFeed(code: string): Promise<SignedEnvelope<OracleIndexPayload> | null> {
  if (!supabase) return null;
  const col = INDEX_COLUMNS[code];
  if (!col) return null;

  try {
    const { data } = await supabase
      .from('avena_history')
      .select(`snapshot_date, value, value_index, score_index, depth_index`)
      .order('snapshot_date', { ascending: true });
    if (!data || data.length === 0) return null;

    const series = data.map((r) => Number((r as Record<string, unknown>)[col] ?? 0)).filter((v) => v > 0);
    const dates  = data.map((r) => (r as { snapshot_date: string }).snapshot_date);
    if (series.length === 0) return null;

    const level = series[series.length - 1];
    const base = series[0];
    const base_date = dates[0];
    const change_1d  = series.length >= 2 ? Number((((level - series[series.length - 2]) / series[series.length - 2]) * 100).toFixed(4)) : null;
    const change_30d = series.length >= 31 ? Number((((level - series[series.length - 31]) / series[series.length - 31]) * 100).toFixed(4)) : null;

    const payload: OracleIndexPayload = {
      code: code as OracleIndexPayload['code'],
      level: Number(level.toFixed(4)),
      base: Number(base.toFixed(4)),
      base_date,
      change_1d_pct: change_1d,
      change_30d_pct: change_30d,
      as_of: dates[dates.length - 1],
    };

    const payload_hash = hashPayload(payload as unknown as Record<string, unknown>);
    const nonce = randomBytes(16).toString('hex');
    const timestamp = new Date().toISOString();
    const signature = signOracle(payload_hash, nonce, timestamp, getSecret());

    return {
      feed: 'oracle.index',
      payload,
      payload_hash,
      signature,
      nonce,
      timestamp,
      signing_method: 'HMAC-SHA256-v1',
      issuer: 'avena-terminal-oracle-v1',
      verify_url: `https://avenaterminal.com/api/v1/oracle/verify`,
    };
  } catch {
    return null;
  }
}

// ─── Verify ────────────────────────────────────────────────────────────────

export function verifyEnvelope(env: {
  payload: Record<string, unknown>;
  payload_hash: string;
  signature: string;
  nonce: string;
  timestamp: string;
}): { valid: boolean; reason?: string } {
  // 1. Re-hash payload + compare
  const recomputedHash = hashPayload(env.payload);
  if (recomputedHash !== env.payload_hash) {
    return { valid: false, reason: 'payload_hash mismatch — payload has been altered' };
  }
  // 2. Re-sign with same secret + nonce + ts + compare
  const recomputedSig = signOracle(env.payload_hash, env.nonce, env.timestamp, getSecret());
  if (recomputedSig !== env.signature) {
    return { valid: false, reason: 'signature mismatch — not signed by Avena, or secret has rotated' };
  }
  // 3. Optional staleness check — reject envelopes older than 24h
  const ageH = (Date.now() - new Date(env.timestamp).getTime()) / 3_600_000;
  if (ageH > 24) {
    return { valid: false, reason: `envelope stale (${ageH.toFixed(1)}h old, max 24h)` };
  }
  return { valid: true };
}
