import { NextResponse } from 'next/server';
import { readSampleCsv } from '@/lib/due-diligence';

export const revalidate = 3600;

export async function GET() {
  const csv = readSampleCsv();
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="avena-due-diligence-sample.csv"',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
