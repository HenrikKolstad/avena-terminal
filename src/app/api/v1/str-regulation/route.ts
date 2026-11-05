/**
 * GET /api/v1/str-regulation
 * GET /api/v1/str-regulation?town=
 *
 * Short-let regulatory risk for each town in the listing book. The file is a
 * manual reading of official gazettes. A missing file returns status
 * "unavailable" and an empty town list. It does not return 500, and it does
 * not change any yield.
 *
 * Public, no auth. ?town= accepts the book location, its slug, or a unique
 * place name. An ambiguous or unknown name returns matched: false.
 */

import { NextResponse } from 'next/server';
import { getStrRegulation, matchStrTown } from '@/lib/str-regulation';

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

export function GET(req: Request) {
  const view = getStrRegulation();
  const town = new URL(req.url).searchParams.get('town');
  if (!town) return NextResponse.json(view, { headers: HEADERS });
  const match = matchStrTown(view, town);
  return NextResponse.json({
    ...view,
    query: town,
    matched: match != null,
    town: match,
    towns: match ? [match] : [],
  }, { headers: HEADERS });
}
