import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!supabase) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  try {
    const body = await req.json();
    const { signal_id, market, checkpoint_date, apci_at_checkpoint, price_per_m2_at_checkpoint, deal_score_avg_at_checkpoint, signal_holding, notes } = body;
    if (!signal_id || !market || !checkpoint_date) {
      return NextResponse.json({ ok: false, error: 'signal_id, market, checkpoint_date required' }, { status: 400 });
    }
    const { data, error } = await supabase.from('precursor_tracking').insert({
      signal_id, market, checkpoint_date,
      apci_at_checkpoint, price_per_m2_at_checkpoint, deal_score_avg_at_checkpoint,
      signal_holding, notes,
    }).select().single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, tracking: data });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
