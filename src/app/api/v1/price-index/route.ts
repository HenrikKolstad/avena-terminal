/**
 * GET /api/v1/price-index
 *
 * Weekly same-unit asking-price index. Public, no key.
 * ?level=coast|province|town limits the rows.
 * ?format=csv returns those rows as CSV. The CSV is derived at read time.
 */

import { NextRequest, NextResponse } from 'next/server';
import { priceIndexToCsv, readPriceIndex, rowsForLevel } from '@/lib/price-index';

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
  let file: ReturnType<typeof readPriceIndex>;
  try {
    file = readPriceIndex();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'price index could not be read';
    return NextResponse.json({ error: message }, { status: 500, headers: HEADERS });
  }

  const level = req.nextUrl.searchParams.get('level');
  let rows: ReturnType<typeof rowsForLevel>;
  try {
    rows = rowsForLevel(file, level);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'bad level';
    return NextResponse.json({ error: message }, { status: 400, headers: HEADERS });
  }

  if (req.nextUrl.searchParams.get('format') === 'csv') {
    const suffix = level ? `-${level}` : '';
    return new NextResponse(priceIndexToCsv(rows), {
      headers: {
        ...HEADERS,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="avena-same-unit-price-index${suffix}.csv"`,
      },
    });
  }

  return NextResponse.json(level ? { ...file, rows } : file, { headers: HEADERS });
}
