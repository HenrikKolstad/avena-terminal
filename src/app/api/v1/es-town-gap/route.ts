/**
 * GET /api/v1/es-town-gap
 *
 * Per town in the current Avena corpus: the median new-build asking €/m²,
 * beside the ministry's municipal appraised €/m². The up-to-five-years
 * column is the comparison with new-build asking prices. The all-ages
 * column is separate. Every official number carries its source, series id,
 * period, appraisal count and retrieval date. A gap is derived and labelled
 * as derived. A town with fewer than the stated minimum of priced listings
 * has no median and no gap. A cell the sheet prints as n.r. stays withheld.
 *
 * This is an appraisal, not a transaction price. Notarial prices are an
 * omission, not a blank that was filled in.
 *
 * Public, no auth. The official half is the committed file refreshed by
 * .github/workflows/es-town-gap-refresh.yml.
 */

import { NextResponse } from 'next/server';
import { getEsTownGap } from '@/lib/es-town-gap-view';

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
  return NextResponse.json(getEsTownGap(), { headers: HEADERS });
}
