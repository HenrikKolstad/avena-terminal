import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!supabase) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const { id } = await params;
  const [scenarioRes, outputsRes] = await Promise.all([
    supabase.from('genesis_scenarios').select('*').eq('scenario_id', id).maybeSingle(),
    supabase.from('genesis_outputs').select('*').eq('scenario_id', id),
  ]);
  if (!scenarioRes.data) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
  return NextResponse.json({ ok: true, scenario: scenarioRes.data, outputs: outputsRes.data ?? [] });
}
