/**
 * GET /api/v1/eu-hpi
 *
 * Eurostat house price index (prc_hpi_q): new dwellings and total dwellings,
 * quarterly index (2015=100) and annual rate of change, for Spain, Portugal,
 * the EU aggregate and the euro area. Beside it, Avena's median new-build
 * asking EUR/m² from the committed listing book. Every Eurostat number is
 * the published figure. Empty cells stay null.
 *
 * Public, no auth. The official half is the committed file refreshed by
 * .github/workflows/eu-hpi-refresh.yml.
 */

import { NextResponse } from 'next/server';
import { getEuHpi } from '@/lib/eu-hpi-view';

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
  return NextResponse.json(getEuHpi(), { headers: HEADERS });
}
