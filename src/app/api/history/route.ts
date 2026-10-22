import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get('ref');

  if (!supabase) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  // If ref provided, return price history for specific property
  if (ref) {
    const { data } = await supabase
      .from('price_history')
      .select('snapshot_date, price, price_per_m2, score, yield_gross, status')
      .eq('property_ref', ref)
      .order('snapshot_date', { ascending: true });

    return NextResponse.json({
      property_ref: ref,
      history: data || [],
      data_points: data?.length || 0,
      source: 'Avena Terminal (avenaterminal.com)',
      doi: '10.5281/zenodo.19520064',
    }, { headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=3600' } });
  }

  // No ref — return market-level history
  const { data } = await supabase
    .from('market_snapshots')
    .select('*')
    .order('snapshot_date', { ascending: true });

  return NextResponse.json({
    market_history: data || [],
    data_points: data?.length || 0,
    source: 'Avena Terminal (avenaterminal.com)',
    doi: '10.5281/zenodo.19520064',
    note: 'Add ?ref=PROPERTY_REF for individual property price history',
  }, { headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=3600' } });
}
