/**
 * GET /api/v1/oracle/property/[ref]
 *
 * Returns a signed price feed for one property. Output envelope is
 * verifiable by anyone via /api/v1/oracle/verify.
 *
 * Use case: DeFi RWA platforms that need a verifiable property-valuation
 * oracle for loan underwriting + liquidation triggers.
 */
import { NextRequest, NextResponse } from 'next/server';
import { signPropertyFeed } from '@/lib/oracle';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const env = signPropertyFeed(decodeURIComponent(ref));
  if (!env) return NextResponse.json({ ok: false, error: 'property not found', ref }, { status: 404 });

  const res = NextResponse.json({ ok: true, envelope: env });
  res.headers.set('X-Oracle-Issuer', 'avena-terminal-oracle-v1');
  res.headers.set('X-Oracle-Signature', env.signature);
  res.headers.set('X-Oracle-Nonce', env.nonce);
  res.headers.set('X-Oracle-Timestamp', env.timestamp);
  res.headers.set('X-APIP-Version', '1.0');
  return res;
}
