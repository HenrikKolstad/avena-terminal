/**
 * GET /api/v1/data-quality
 *
 * Public data-quality report. No key.
 * ?format=csv returns the same figures as CSV.
 * The body is the committed file plus a freshness grade computed at read time
 * from feed-meta.json and the health thresholds. It does not scan price snapshots.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { dataQualityToCsv, gradeDataFreshness, priceIndexDrift, readDataQuality } from '@/lib/data-quality';
import { readPriceIndex } from '@/lib/price-index';

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
  let file: ReturnType<typeof readDataQuality>;
  try {
    file = readDataQuality();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'data quality file could not be read';
    return NextResponse.json({ error: message }, { status: 500, headers: HEADERS });
  }

  if (req.nextUrl.searchParams.get('format') === 'csv') {
    return new NextResponse(dataQualityToCsv(file), {
      headers: {
        ...HEADERS,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="avena-data-quality.csv"',
      },
    });
  }

  let drift: string | null = null;
  try {
    drift = priceIndexDrift(file, readPriceIndex().data_as_of);
  } catch {
    drift = 'The asking-price index file could not be read, so this response does not say whether the same-unit section is still reconciled to it.';
  }
  const generatedAt = (() => {
    try {
      const meta = JSON.parse(readFileSync(join(process.cwd(), 'public', 'feed-meta.json'), 'utf8')) as { generated_at?: unknown };
      return typeof meta.generated_at === 'string' ? meta.generated_at : file.freshness.feed_generated_at;
    } catch {
      return file.freshness.feed_generated_at;
    }
  })();
  const graded = gradeDataFreshness(
    { ...file, freshness: { ...file.freshness, feed_generated_at: generatedAt } },
    new Date(),
  );

  return NextResponse.json({ ...file, freshness_grade: graded, price_index_drift: drift }, { headers: HEADERS });
}
