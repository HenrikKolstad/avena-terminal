/**
 * GET /api/v1/memo/[short_id]
 * Returns a previously-generated memo as JSON. Used for shareable URLs.
 */
import { NextRequest, NextResponse } from 'next/server';
import { loadMemoByShortId } from '@/lib/memo-engine';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ short_id: string }> }) {
  const { short_id } = await params;
  const memo = await loadMemoByShortId(short_id);
  if (!memo) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true, memo });
}
