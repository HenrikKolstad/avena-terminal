/**
 * GET /api/v1/wikidata/claims
 *
 * Returns the Wikidata claim graph Avena maintains on Q139165733.
 * Three formats:
 *   format=json (default) → structured claims + JSON-LD
 *   format=qs              → QuickStatements v1 plaintext
 *   format=ttl             → Turtle / RDF subset (not yet implemented)
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateClaims } from '@/lib/wikidata-claims';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'X-Avena-Layer': 'wikidata-claims',
  'X-Avena-License': 'CC0-1.0',
  'Cache-Control': 'public, s-maxage=600',
};

export async function GET(req: NextRequest) {
  const fmt = (req.nextUrl.searchParams.get('format') ?? 'json').toLowerCase();
  const claims = await generateClaims();

  if (fmt === 'qs') {
    return new NextResponse(claims.quickstatements_v1, {
      headers: { ...HEADERS, 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  return NextResponse.json(claims, { headers: HEADERS });
}
