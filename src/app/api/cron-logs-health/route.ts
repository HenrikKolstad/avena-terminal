import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Public diagnostic — shows whether cron_logs is receiving writes.
 * If this returns { ok: true, total: 0, recent: [] } after crons fire,
 * the RLS write policy is still broken.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 500 });
  }
  try {
    const { data: recent, error } = await supabase
      .from('cron_logs')
      .select('id, agent_id, status, started_at, finished_at, duration_ms')
      .order('started_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const perAgent: Record<string, number> = {};
    for (const r of recent ?? []) {
      perAgent[r.agent_id] = (perAgent[r.agent_id] ?? 0) + 1;
    }

    return NextResponse.json({
      ok: true,
      total_recent: recent?.length ?? 0,
      per_agent_in_sample: perAgent,
      recent: (recent ?? []).slice(0, 20),
      hint: recent && recent.length === 0
        ? 'Empty — either crons have not fired since instrumentation OR RLS is blocking inserts. Run the 20260424 migration.'
        : 'Writes are flowing.',
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
