import { NextResponse } from 'next/server';
import { loadDueDiligence } from '@/lib/due-diligence';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET() {
  const pack = await loadDueDiligence();
  return NextResponse.json(pack, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  });
}
