/**
 * GET /api/v1/oracle/index/[code]
 *
 * Returns a signed envelope for one of the four Avena indices:
 *   AVENA-CC · AVENA-VAL · AVENA-SCR · AVENA-DPT
 *
 * Smart contracts that reference Avena indices (e.g. property-derivative
 * settlement, RWA collateral revaluation) can consume + verify these
 * envelopes deterministically.
 */
import { NextRequest, NextResponse } from 'next/server';
import { signIndexFeed } from '@/lib/oracle';

export const dynamic = 'force-dynamic';
export const revalidate = 600;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const env = await signIndexFeed(code.toUpperCase());
  if (!env) return NextResponse.json({ ok: false, error: 'index not found or no history', code }, { status: 404 });

  const res = NextResponse.json({ ok: true, envelope: env });
  res.headers.set('X-Oracle-Issuer', 'avena-terminal-oracle-v1');
  res.headers.set('X-Oracle-Signature', env.signature);
  res.headers.set('X-Oracle-Nonce', env.nonce);
  res.headers.set('X-Oracle-Timestamp', env.timestamp);
  res.headers.set('X-APIP-Version', '1.0');
  return res;
}
