import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export function OPTIONS() { return new NextResponse(null, { status: 204, headers: cors }); }

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!supabase) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503, headers: cors });

  const { id } = await params;
  const [signalRes, trackingRes] = await Promise.all([
    supabase.from('precursor_signals').select('*').eq('signal_id', id).maybeSingle(),
    supabase.from('precursor_tracking').select('*').eq('signal_id', id).order('checkpoint_date', { ascending: true }),
  ]);

  if (!signalRes.data) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404, headers: cors });

  return NextResponse.json({
    ok: true,
    signal: signalRes.data,
    tracking: trackingRes.data ?? [],
  }, { headers: cors });
}
