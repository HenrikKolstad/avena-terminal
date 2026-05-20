import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!supabase) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const { searchParams } = req.nextUrl;
  const severity = searchParams.get('severity');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 200);
  let q = supabase
    .from('counterpart_stress_alerts')
    .select('*, developer:counterpart_developers!inner(developer_id, name, country, counterpart_score)')
    .eq('status', 'active')
    .order('severity', { ascending: false })
    .order('detected_at', { ascending: false })
    .limit(limit);
  if (severity) q = q.eq('severity', severity);
  const { data } = await q;
  return NextResponse.json({ ok: true, count: data?.length ?? 0, alerts: data ?? [] });
}
