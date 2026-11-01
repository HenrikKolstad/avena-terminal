/**
 * GET /api/v1/pt-official
 *
 * Official Portuguese housing statistics from Statistics Portugal: median
 * bank appraisal €/m² by NUTS region, median sale €/m² of new and existing
 * dwellings, and the national house price index split new versus existing.
 * Every INE figure carries its indicator, period and retrieval date.
 *
 * The Spain coast block is the Avena asking median beside the Spanish
 * ministry appraisal. It is not Portuguese listing coverage.
 *
 * Public, no auth. The INE half is the committed file refreshed by
 * .github/workflows/pt-ine-benchmark-refresh.yml.
 */

import { NextResponse } from 'next/server';
import { getPtOfficial } from '@/lib/pt-official-view';

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
  return NextResponse.json(getPtOfficial(), { headers: HEADERS });
}
