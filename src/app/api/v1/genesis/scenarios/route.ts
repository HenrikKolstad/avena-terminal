import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export function OPTIONS() { return new NextResponse(null, { status: 204, headers: cors }); }

export async function GET(req: NextRequest) {
  if (!supabase) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503, headers: cors });
  const { searchParams } = req.nextUrl;
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 200);
  const { data } = await supabase
    .from('genesis_scenarios')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  return NextResponse.json({ ok: true, count: data?.length ?? 0, scenarios: data ?? [] }, { headers: cors });
}
