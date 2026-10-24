/**
 * GET /api/v1/es-official
 *
 * Per province Avena covers: the median new-build asking €/m² in the current
 * corpus, the ministry's appraised €/m², and the INE new-build index change.
 * Every official number carries its source, series id, period and retrieval
 * date. The gap is derived and labelled as derived.
 *
 * Public, no auth. The official half is the committed file refreshed by
 * .github/workflows/es-official-refresh.yml.
 */

import { NextResponse } from 'next/server';
import { getEsBenchmark } from '@/lib/es-official-view';

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
  return NextResponse.json(getEsBenchmark(), { headers: HEADERS });
}
