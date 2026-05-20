import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const cors = { 'Access-Control-Allow-Origin': '*' };

export function OPTIONS() { return new NextResponse(null, { status: 204, headers: cors }); }

export async function GET(req: NextRequest) {
  if (!supabase) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503, headers: cors });
  const { searchParams } = req.nextUrl;
  const country = searchParams.get('country');
  const grade = searchParams.get('grade');
  const minScore = parseInt(searchParams.get('min_score') || '0', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10) || 100, 500);

  let q = supabase
    .from('counterpart_developers')
    .select('*')
    .gte('counterpart_score', minScore)
    .order('counterpart_score', { ascending: false })
    .limit(limit);
  if (country) q = q.eq('country', country.toUpperCase());
  if (grade) q = q.eq('score_grade', grade);

  const { data, error } = await q;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500, headers: cors });
  return NextResponse.json({ ok: true, count: data?.length ?? 0, developers: data ?? [] }, { headers: cors });
}
