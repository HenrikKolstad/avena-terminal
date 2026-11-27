/**
 * GET /api/v1/bulk
 *
 * Index of weekly bulk snapshots. Each frozen week has a gzipped CSV, a
 * SHA-256 of those bytes, and a manifest. Gap weeks have no file. Public, no key.
 */

import { NextResponse } from 'next/server';
import { publicBulkIndex, readPublishedBulk } from '@/lib/bulk';

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
  try {
    const published = readPublishedBulk();
    return NextResponse.json(publicBulkIndex(published.index), { headers: HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'bulk index could not be read';
    return NextResponse.json({ error: message }, { status: 500, headers: HEADERS });
  }
}
