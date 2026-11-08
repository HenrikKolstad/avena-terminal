/**
 * GET /api/v1/es-notary
 *
 * Per coastal province Avena covers: the median new-build asking €/m², the
 * CIEN notarial average €/m² for that province's autonomous community, the
 * transaction count, and the derived asking-versus-closing gap. Towns are
 * listed with a blank notary price. Foreign-buyer figures are a separate
 * semester. Every official number carries its source, period and retrieval
 * date.
 *
 * Public, no auth. The official half is the committed file refreshed by
 * .github/workflows/es-notary-refresh.yml.
 */

import { NextResponse } from 'next/server';
import { getEsNotary } from '@/lib/es-notary-view';

export const revalidate = 3600;

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
};

export function OPTIONS() {
  return NextResponse.json(null, { status: 204, headers: HEADERS });
}

export function GET() {
  return NextResponse.json(getEsNotary(), { headers: HEADERS });
}
