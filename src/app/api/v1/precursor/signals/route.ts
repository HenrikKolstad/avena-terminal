/**
 * GET /api/v1/precursor/signals — list active Precursor signals.
 * Filters: market, type, min_confidence, status, limit.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function OPTIONS() { return new NextResponse(null, { status: 204, headers: cors }); }

export async function GET(req: NextRequest) {
  if (!supabase) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503, headers: cors });

  const { searchParams } = req.nextUrl;
  const market = searchParams.get('market');
  const type = searchParams.get('type');
  const status = searchParams.get('status') || 'active';
  const minConfidence = parseInt(searchParams.get('min_confidence') || '0', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 200);

  let q = supabase
    .from('precursor_signals')
    .select('*')
    .eq('status', status)
    .gte('confidence_score', minConfidence)
    .order('detected_at', { ascending: false })
    .limit(limit);

  if (type) q = q.eq('signal_type', type);
  if (market) q = q.contains('affected_markets', [market]);

  const { data, error } = await q;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500, headers: cors });

  return NextResponse.json({
    ok: true,
    count: data?.length ?? 0,
    signals: data ?? [],
    meta: {
      source: 'Avena Precursor — signal-before-signal intelligence',
      license: 'CC BY 4.0 (free tier)',
      doi: '10.5281/zenodo.19520064',
      spec: 'https://avenaterminal.com/standards/avp',
    },
  }, { headers: { ...cors, 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } });
}
