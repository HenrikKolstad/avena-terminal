import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  const { ref } = await params;
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 90), 365);

  if (!supabase) {
    return NextResponse.json({ ref, history: [], source: 'supabase unavailable' }, { headers: corsHeaders });
  }

  const { data } = await supabase
    .from('score_history')
    .select('snapshot_date, avena_score, price_eur, pm2_eur, mm2_eur, yield_gross')
    .eq('property_ref', ref)
    .order('snapshot_date', { ascending: false })
    .limit(limit);

  const history = (data ?? []).slice().reverse();

  let delta_7d: number | null = null;
  let delta_30d: number | null = null;
  if (history.length > 0) {
    const latest = history[history.length - 1].avena_score;
    const wk = history.find((h) => {
      const d = new Date(h.snapshot_date);
      return Date.now() - d.getTime() >= 7 * 24 * 3600 * 1000;
    });
    const mo = history.find((h) => {
      const d = new Date(h.snapshot_date);
      return Date.now() - d.getTime() >= 30 * 24 * 3600 * 1000;
    });
    if (wk) delta_7d = latest - wk.avena_score;
    if (mo) delta_30d = latest - mo.avena_score;
  }

  return NextResponse.json(
    {
      ref,
      count: history.length,
      history,
      delta_7d,
      delta_30d,
      source: 'Avena Terminal',
    },
    { headers: corsHeaders }
  );
}
