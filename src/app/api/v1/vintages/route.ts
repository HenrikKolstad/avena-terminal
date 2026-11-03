/**
 * GET /api/v1/vintages
 *
 * Manifest of frozen weekly town and province vintages. The SHA-256 on each
 * frozen row is the hash of data/vintages/YYYY-MM-DD.json. Gap weeks have no
 * file. Public, no key.
 */

import { NextResponse } from 'next/server';
import { publicManifest, readVintageManifest } from '@/lib/vintages';

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
  return NextResponse.json(publicManifest(readVintageManifest()), { headers: HEADERS });
}
