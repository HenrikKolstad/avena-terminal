/**
 * GET /api/v1/es-rents
 *
 * Habitual-residence rents from the ministry SERPAVI workbook and the INE
 * rental-price index (IPVA, table 59058), joined to Avena asking prices and
 * to the gross-yield estimate already on each listing. Every official number
 * carries its source, series or field, period and retrieval date. The implied
 * yield is derived and labelled as derived.
 *
 * Public, no auth. The official half is the committed file refreshed by
 * .github/workflows/es-rents-refresh.yml.
 */

import { NextResponse } from 'next/server';
import { getEsRents } from '@/lib/es-rents-view';

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
  return NextResponse.json(getEsRents(), { headers: HEADERS });
}
