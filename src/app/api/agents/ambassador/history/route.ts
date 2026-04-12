import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!supabase) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });

  const { data } = await supabase
    .from('deal_initiations')
    .select('property_ref, project_name, buyer_name, developer_name, location, price, score, status, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  return NextResponse.json({
    initiations: data || [],
    count: data?.length || 0,
    source: 'Avena Terminal Ambassador Agent',
  });
}
