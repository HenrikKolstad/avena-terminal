/**
 * AVP Offer Generator — emits an AVP v1.0 compliant signed offer document
 * for an autonomous transaction. Every offer Avena Agent sends carries
 * one of these as a verifiable record.
 *
 * The signature is a SHA-256 of the canonical JSON payload + a secret.
 * Counterparties can verify by re-canonicalizing and re-hashing — the
 * signature alone proves Avena issued it at the recorded timestamp.
 *
 * Spec reference: https://avenaterminal.com/standards/avp
 */

import { createHash } from 'crypto';

const AVP_VERSION = '1.0';
const AVP_CONTEXT = 'https://avenaterminal.com/standards/avp/v1';
const ISSUER = 'avena-agent.v1';

export interface AvpOfferInput {
  mission_id: number;
  avn_prop_id: string;
  offer_amount_eur: number;
  asking_price_eur?: number;
  buyer_persona?: string;
  buyer_nationality?: string;
  timeline_weeks?: number;
  conditions?: string[];
  reasoning?: string;
  prev_signature?: string;            // for the hash chain
}

export interface AvpOfferDocument {
  '@context': string;
  avp_version: string;
  document_type: 'offer';
  issuer: string;
  issued_at: string;
  mission_id: number;
  avn_prop_id: string;
  offer: {
    amount_eur: number;
    asking_price_eur: number | null;
    discount_pct: number | null;
    timeline_weeks: number | null;
    conditions: string[];
  };
  buyer: {
    persona: string | null;
    nationality: string | null;
    represented_by: string;
  };
  reasoning: string | null;
  signature: {
    algorithm: 'sha256';
    value: string;
    prev: string | null;
  };
  verification_url: string;
}

/**
 * Canonicalize the payload — deterministic JSON serialization so signing
 * gives the same hash on both sides regardless of property order.
 */
function canonicalize(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(canonicalize).join(',') + ']';
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalize((obj as Record<string, unknown>)[k])).join(',') + '}';
}

/**
 * Build & sign an AVP offer document.
 */
export function buildAvpOffer(input: AvpOfferInput): AvpOfferDocument {
  const issued_at = new Date().toISOString();
  const discount_pct =
    input.asking_price_eur && input.asking_price_eur > 0
      ? Math.round(((input.asking_price_eur - input.offer_amount_eur) / input.asking_price_eur) * 1000) / 10
      : null;

  const payload = {
    '@context': AVP_CONTEXT,
    avp_version: AVP_VERSION,
    document_type: 'offer' as const,
    issuer: ISSUER,
    issued_at,
    mission_id: input.mission_id,
    avn_prop_id: input.avn_prop_id,
    offer: {
      amount_eur: input.offer_amount_eur,
      asking_price_eur: input.asking_price_eur ?? null,
      discount_pct,
      timeline_weeks: input.timeline_weeks ?? null,
      conditions: input.conditions ?? [],
    },
    buyer: {
      persona: input.buyer_persona ?? null,
      nationality: input.buyer_nationality ?? null,
      represented_by: ISSUER,
    },
    reasoning: input.reasoning ?? null,
  };

  const secret = process.env.AVP_SIGNING_SECRET || 'avp-dev-secret';
  const canonical = canonicalize(payload);
  const inputHash = createHash('sha256')
    .update((input.prev_signature ?? '') + canonical + secret)
    .digest('hex');

  return {
    ...payload,
    signature: {
      algorithm: 'sha256',
      value: inputHash,
      prev: input.prev_signature ?? null,
    },
    verification_url: `https://avenaterminal.com/standards/avp/verify?sig=${inputHash}`,
  };
}

/**
 * Verify a previously-issued AVP document was issued by Avena.
 * Returns true if signature is valid (under current AVP_SIGNING_SECRET).
 */
export function verifyAvpOffer(doc: AvpOfferDocument): boolean {
  const { signature, verification_url, ...rest } = doc;
  void verification_url;
  const secret = process.env.AVP_SIGNING_SECRET || 'avp-dev-secret';
  const canonical = canonicalize(rest);
  const expected = createHash('sha256')
    .update((signature.prev ?? '') + canonical + secret)
    .digest('hex');
  return expected === signature.value;
}
