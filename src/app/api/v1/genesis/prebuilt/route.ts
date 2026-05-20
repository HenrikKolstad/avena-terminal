import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!supabase) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const { data } = await supabase
    .from('genesis_prebuilt_scenarios')
    .select('*')
    .order('is_featured', { ascending: false })
    .order('run_count', { ascending: false });
  return NextResponse.json({ ok: true, scenarios: data ?? [] });
}
