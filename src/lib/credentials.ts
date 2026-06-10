/**
 * Property Credentials — Architectural Commitment 9 (pragmatic variant).
 *
 * Issue and verify signed JWT credentials anchored to AVN-IDs.
 *
 * Crypto: Ed25519 via node:crypto (no external deps). Signing key is held
 * in env var `AVENA_FOUNDATION_SIGNING_KEY` (PEM-encoded PKCS8). If the
 * env var is missing we fall back to HS256 with `CRON_SECRET` so the
 * issuance pipeline still runs in dev — but production should always use
 * Ed25519.
 *
 * Once 50 banks accept AVN-ID credentials, the protocol is permanent
 * infrastructure. Avena Foundation governs the standard.
 */

import { createHmac, createPrivateKey, createPublicKey, sign as cryptoSign, verify as cryptoVerify, type KeyObject } from 'crypto';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';

export type CredentialType = 'valuation' | 'insurance' | 'ownership' | 'regulatory_regime' | 'energy_certificate';

export interface CredentialClaims {
  avn_id: string;
  type: CredentialType;
  issuer_id: string;
  issued_at: string;
  expires_at?: string;
  claims: Record<string, unknown>;
}

export interface CredentialRow {
  credential_id: string;
  avn_id: string;
  credential_type: CredentialType;
  issuer_id: string;
  claims: Record<string, unknown>;
  credential_jwt: string;
  issued_at: string;
  expires_at: string | null;
  revoked: boolean;
  revoked_at: string | null;
  revoked_reason: string | null;
}

/* -------------------------------------------------------------------------- */
/* JWT signing / verification                                                  */
/* -------------------------------------------------------------------------- */

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}
function b64urlDecode(input: string): Buffer {
  return Buffer.from(input, 'base64url');
}

function getSigningKey(): { key: KeyObject | string; alg: 'EdDSA' | 'HS256' } {
  const pem = process.env.AVENA_FOUNDATION_SIGNING_KEY;
  if (pem) {
    try {
      const key = createPrivateKey({ key: pem, format: 'pem' });
      return { key, alg: 'EdDSA' };
    } catch { /* fall through */ }
  }
  return { key: process.env.CRON_SECRET ?? 'dev-fallback-not-for-production', alg: 'HS256' };
}

function getVerifyingKey(alg: 'EdDSA' | 'HS256'): KeyObject | string {
  if (alg === 'HS256') return process.env.CRON_SECRET ?? 'dev-fallback-not-for-production';
  const pem = process.env.AVENA_FOUNDATION_PUBLIC_KEY ?? process.env.AVENA_FOUNDATION_SIGNING_KEY;
  if (!pem) throw new Error('AVENA_FOUNDATION_PUBLIC_KEY missing');
  try { return createPublicKey({ key: pem, format: 'pem' }); }
  catch { return createPublicKey(createPrivateKey({ key: pem, format: 'pem' })); }
}

export function signCredentialJWT(claims: CredentialClaims): string {
  const { key, alg } = getSigningKey();
  const header = { alg, typ: 'JWT', kid: claims.issuer_id };
  const payload = {
    iss: claims.issuer_id,
    sub: claims.avn_id,
    iat: Math.floor(new Date(claims.issued_at).getTime() / 1000),
    exp: claims.expires_at ? Math.floor(new Date(claims.expires_at).getTime() / 1000) : undefined,
    type: claims.type,
    claims: claims.claims,
  };
  const headerB64 = b64url(JSON.stringify(header));
  const payloadB64 = b64url(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;
  let sigB64: string;
  if (alg === 'HS256') {
    const secret: string = typeof key === 'string' ? key : (process.env.CRON_SECRET ?? 'dev-fallback-not-for-production');
    const h = createHmac('sha256', secret).update(signingInput).digest();
    sigB64 = b64url(h);
  } else {
    const sig = cryptoSign(null, Buffer.from(signingInput), key as KeyObject);
    sigB64 = b64url(sig);
  }
  return `${signingInput}.${sigB64}`;
}

export function verifyCredentialJWT(jwt: string): { valid: boolean; payload: Record<string, unknown> | null; error?: string } {
  const parts = jwt.split('.');
  if (parts.length !== 3) return { valid: false, payload: null, error: 'malformed' };
  const [headerB64, payloadB64, sigB64] = parts;
  let header: { alg: string };
  let payload: Record<string, unknown>;
  try {
    header = JSON.parse(b64urlDecode(headerB64).toString('utf8'));
    payload = JSON.parse(b64urlDecode(payloadB64).toString('utf8'));
  } catch {
    return { valid: false, payload: null, error: 'bad_encoding' };
  }
  if (header.alg !== 'EdDSA' && header.alg !== 'HS256') {
    return { valid: false, payload, error: 'unsupported_alg' };
  }
  const signingInput = `${headerB64}.${payloadB64}`;
  try {
    if (header.alg === 'HS256') {
      const expected = createHmac('sha256', getVerifyingKey('HS256') as string).update(signingInput).digest();
      const valid = expected.equals(b64urlDecode(sigB64));
      return { valid, payload, error: valid ? undefined : 'bad_signature' };
    }
    const valid = cryptoVerify(null, Buffer.from(signingInput), getVerifyingKey('EdDSA') as KeyObject, b64urlDecode(sigB64));
    return { valid, payload, error: valid ? undefined : 'bad_signature' };
  } catch (e) {
    return { valid: false, payload, error: (e as Error).message };
  }
}

/* -------------------------------------------------------------------------- */
/* Issue + persist                                                             */
/* -------------------------------------------------------------------------- */

export interface IssueCredentialInput {
  avn_id: string;
  credential_type: CredentialType;
  issuer_id: string;
  claims: Record<string, unknown>;
  expires_at?: string;
}

export async function issueCredential(input: IssueCredentialInput): Promise<{ ok: boolean; credential_id?: string; jwt?: string; error?: string }> {
  if (!supabase) return { ok: false, error: 'no_supabase' };
  const issued_at = new Date().toISOString();
  const fullClaims: CredentialClaims = {
    avn_id: input.avn_id,
    type: input.credential_type,
    issuer_id: input.issuer_id,
    issued_at,
    expires_at: input.expires_at,
    claims: input.claims,
  };
  const jwt = signCredentialJWT(fullClaims);
  try {
    const { data, error } = await supabase
      .from('property_credentials')
      .insert({
        avn_id: input.avn_id,
        credential_type: input.credential_type,
        issuer_id: input.issuer_id,
        claims: input.claims,
        credential_jwt: jwt,
        issued_at,
        expires_at: input.expires_at ?? null,
      })
      .select('credential_id')
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, credential_id: (data as { credential_id: string }).credential_id, jwt };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function credentialsForAvnId(avnId: string): Promise<CredentialRow[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('property_credentials')
    .select('*')
    .eq('avn_id', avnId)
    .order('issued_at', { ascending: false });
  return (data as CredentialRow[]) || [];
}
