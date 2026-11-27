/**
 * GET /api/v1/bulk/YYYY-MM-DD
 *
 * The week manifest, byte for byte, so the body matches the index hash.
 * ?file=town-province.csv.gz returns the gzipped CSV. The response is the
 * stored bytes, not a recompression. A gap date returns 404 and no invented rows.
 */

import { NextRequest, NextResponse } from 'next/server';
import { BULK_FILE_NAME, lookupBulkDate, readPublishedBulk, sha256Buffer } from '@/lib/bulk';

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
  let published: ReturnType<typeof readPublishedBulk>;
  try {
    published = readPublishedBulk();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'bulk index could not be read';
    return NextResponse.json({ error: message }, { status: 500, headers: HEADERS });
  }

  const found = lookupBulkDate(published.index, date);
  if (found.kind !== 'frozen') {
    const gap = found.kind === 'gap';
    return NextResponse.json(
      {
        error: gap
          ? 'No bulk file for this date. The day is a gap and was not interpolated.'
          : 'No bulk file for this date.',
        status: found.kind,
        vintage_date: null,
        gap_dates_in_week: found.kind === 'gap' ? found.bundle?.gap_dates_in_week ?? null : null,
      },
      { status: 404, headers: HEADERS },
    );
  }

  const week = published.weeks.find((row) => row.bundle.vintage_date === date);
  if (!week || !week.bundle.files) {
    return NextResponse.json({ error: `bulk file ${date} is not in the index` }, { status: 500, headers: HEADERS });
  }

  const file = req.nextUrl.searchParams.get('file');
  if (file == null || file === 'manifest') {
    return new NextResponse(new Uint8Array(week.manifestBytes), {
      headers: {
        ...HEADERS,
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="avena-bulk-${date}-manifest.json"`,
        'X-Content-SHA256': sha256Buffer(week.manifestBytes),
      },
    });
  }
  if (file !== BULK_FILE_NAME) {
    return NextResponse.json({ error: `No bulk file named ${file}.` }, { status: 404, headers: HEADERS });
  }

  if (sha256Buffer(week.gz) !== week.bundle.files[0].sha256) {
    return NextResponse.json(
      { error: `bulk file ${date} does not match the index checksum — refusing to serve it` },
      { status: 500, headers: HEADERS },
    );
  }
  return new NextResponse(new Uint8Array(week.gz), {
    headers: {
      ...HEADERS,
      'Content-Type': 'application/gzip',
      'Content-Disposition': `attachment; filename="avena-bulk-${date}-town-province.csv.gz"`,
      'X-Content-SHA256': week.bundle.files[0].sha256,
    },
  });
}
