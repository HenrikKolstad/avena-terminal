/**
 * GET /api/v1/bulk/schema
 *
 * Schema changelog for the bulk files. Public, no key.
 */

import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { BULK_CHANGELOG_PATH, bulkRoot, parseSchemaChangelog, sha256Buffer } from '@/lib/bulk';

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
    const path = join(bulkRoot(), BULK_CHANGELOG_PATH.slice('data/bulk/'.length));
    const body = readFileSync(path);
    parseSchemaChangelog(JSON.parse(body.toString('utf8')) as unknown);
    return new NextResponse(new Uint8Array(body), {
      headers: {
        ...HEADERS,
        'Content-Type': 'application/json; charset=utf-8',
        'X-Content-SHA256': sha256Buffer(body),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'schema changelog could not be read';
    return NextResponse.json({ error: message }, { status: 500, headers: HEADERS });
  }
}
