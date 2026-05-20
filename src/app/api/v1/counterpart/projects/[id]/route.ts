import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!supabase) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const { id } = await params;
  const { data } = await supabase
    .from('counterpart_projects')
    .select('*, developer:counterpart_developers!inner(*)')
    .eq('project_id', id)
    .maybeSingle();
  if (!data) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
  return NextResponse.json({ ok: true, project: data });
}
