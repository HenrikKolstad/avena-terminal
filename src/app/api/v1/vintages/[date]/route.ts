/**
 * GET /api/v1/vintages/YYYY-MM-DD
 *
 * The frozen JSON file, byte for byte, so the body matches the manifest hash.
 * ?format=csv returns the same rows as CSV. That CSV is derived at read time
 * and is not a second vintage. A gap date returns 404 and no invented rows.
 */

import { NextRequest, NextResponse } from 'next/server';
import { readVintage, vintageToCsv } from '@/lib/vintages';

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

export async function GET(req: NextRequest, { params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  let found: ReturnType<typeof readVintage>;
  try {
    found = readVintage(date);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'vintage file could not be read';
    return NextResponse.json({ error: message }, { status: 500, headers: HEADERS });
  }
  if (!found.ok) {
    return NextResponse.json(
      {
        error: found.status === 'gap' ? 'No vintage file for this date. The day is a gap and was not interpolated.' : 'No vintage for this date.',
        status: found.status,
        vintage_date: null,
        gap_dates_in_week: found.entry?.gap_dates_in_week ?? null,
      },
      { status: 404, headers: HEADERS },
    );
  }

  const csv = req.nextUrl.searchParams.get('format') === 'csv';
  if (csv) {
    return new NextResponse(vintageToCsv(found.file), {
      headers: {
        ...HEADERS,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="avena-vintage-${date}.csv"`,
      },
    });
  }
  return new NextResponse(found.body, {
    headers: {
      ...HEADERS,
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="avena-vintage-${date}.json"`,
    },
  });
}
