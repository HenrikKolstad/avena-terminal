/**
 * POST /api/v1/oracle/verify
 *
 * Body: full signed envelope (or just { payload, payload_hash, signature,
 * nonce, timestamp }).
 *
 * Re-hashes the payload, re-signs with the same secret + nonce + timestamp,
 * compares. Rejects envelopes older than 24h.
 *
 * Smart contracts running off-chain can call this. v2 will move to Ed25519
 * so verification works without round-trip.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyEnvelope } from '@/lib/oracle';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: { envelope?: unknown; payload?: unknown; payload_hash?: string; signature?: string; nonce?: string; timestamp?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 }); }

  const env = (body.envelope ?? body) as { payload: Record<string, unknown>; payload_hash: string; signature: string; nonce: string; timestamp: string };
  if (!env || !env.payload || !env.payload_hash || !env.signature || !env.nonce || !env.timestamp) {
    return NextResponse.json({ ok: false, error: 'envelope must contain { payload, payload_hash, signature, nonce, timestamp }' }, { status: 400 });
  }

  const result = verifyEnvelope(env);
  const res = NextResponse.json({ ok: true, ...result });
  res.headers.set('X-Oracle-Verified', String(result.valid));
  return res;
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/v1/oracle/verify',
    method: 'POST',
    description: 'Verify a signed Avena Oracle envelope. Returns { valid: boolean, reason?: string }.',
    accepts: 'application/json',
    body_schema: {
      payload:      'Record<string, unknown> — the original signed payload (sorted keys reproducible)',
      payload_hash: 'string — sha256 hex of canonical_json(payload)',
      signature:    'string — 32-hex HMAC-SHA256 prefix',
      nonce:        'string — random 16-byte hex',
      timestamp:    'string — ISO 8601',
    },
    notes: 'Envelopes older than 24h are rejected. Roadmap v2 → Ed25519 asymmetric (no round-trip needed).',
  });
}
