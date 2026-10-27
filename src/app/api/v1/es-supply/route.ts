/**
 * GET /api/v1/es-supply
 *
 * Per province Avena covers: estimated free-market dwellings started and
 * finished (ministry VDP005_01), INE registered sales of new dwellings
 * (table 6150), the live listing count, and verified asking-price moves.
 * Every official number carries its source, series id, period and the
 * Last-Modified day of the file it came from. A series that could not be
 * read is an omission, not a zero.
 *
 * Public, no auth. The official half is the committed file refreshed by
 * .github/workflows/es-supply-refresh.yml.
 */

import { NextResponse } from 'next/server';
import { getEsSupply } from '@/lib/es-supply-view';

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
  return NextResponse.json(getEsSupply(), { headers: HEADERS });
}
