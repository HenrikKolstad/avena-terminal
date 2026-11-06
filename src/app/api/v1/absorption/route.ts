/**
 * GET /api/v1/absorption
 *
 * Public coast / region / town listing absorption. No key.
 * ?level=coast|region|town limits the groups.
 * ?format=csv returns those groups. With no level, CSV is the town table.
 * Project rows are not in the file this route reads.
 */

import { NextRequest, NextResponse } from 'next/server';
import { csvForLevel, forLevel, readAbsorption } from '@/lib/absorption';

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

export function GET(req: NextRequest) {
  let file: ReturnType<typeof readAbsorption>;
  try {
    file = readAbsorption();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'absorption file could not be read';
    return NextResponse.json({ error: message }, { status: 500, headers: HEADERS });
  }

  const level = req.nextUrl.searchParams.get('level');
  if (req.nextUrl.searchParams.get('format') === 'csv') {
    try {
      const csv = csvForLevel(file, level);
      return new NextResponse(csv.body, {
        headers: {
          ...HEADERS,
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${csv.filename}"`,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'bad level';
      return NextResponse.json({ error: message }, { status: 400, headers: HEADERS });
    }
  }

  try {
    return NextResponse.json(forLevel(file, level), { headers: HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'bad level';
    return NextResponse.json({ error: message }, { status: 400, headers: HEADERS });
  }
}
