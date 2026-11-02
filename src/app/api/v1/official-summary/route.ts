/**
 * GET /api/v1/official-summary
 *
 * One JSON summary of the official-statistics layers: source, geography,
 * latest period, refresh cadence, and the Avena-versus-official gap where
 * both sides exist. A missing side is null. Widening is present only when a
 * previous snapshot of that same gap exists. The committed files do not
 * store one, so history is reported as accumulating.
 *
 * Public, no auth. Same cache headers as the other official v1 routes.
 */

import { NextResponse } from 'next/server';
import { getOfficialSummary } from '@/lib/official-summary-view';

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
  return NextResponse.json(getOfficialSummary(), { headers: HEADERS });
}
