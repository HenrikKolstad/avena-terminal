import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!supabase) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const { id } = await params;
  const [devRes, projRes, alertsRes] = await Promise.all([
    supabase.from('counterpart_developers').select('*').eq('developer_id', id).maybeSingle(),
    supabase.from('counterpart_projects').select('*').eq('developer_id', id).order('promised_completion', { ascending: true }),
    supabase.from('counterpart_stress_alerts').select('*').eq('developer_id', id).eq('status', 'active').order('detected_at', { ascending: false }),
  ]);
  if (!devRes.data) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
  return NextResponse.json({
    ok: true,
    developer: devRes.data,
    projects: projRes.data ?? [],
    active_alerts: alertsRes.data ?? [],
  });
}
