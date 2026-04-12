import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  let totalAgents = 0;
  let activeAgents = 0;
  let totalQueries = 0;
  const topAgents: { agent_name: string; developer_name: string; queries_total: number; use_case: string }[] = [];

  if (supabase) {
    try {
      const { count: total } = await supabase
        .from('agent_registry')
        .select('*', { count: 'exact', head: true });
      totalAgents = total || 0;

      const { count: active } = await supabase
        .from('agent_registry')
        .select('*', { count: 'exact', head: true })
        .eq('active', true);
      activeAgents = active || 0;

      const { data: agents } = await supabase
        .from('agent_registry')
        .select('agent_name, developer_name, queries_total, use_case')
        .eq('active', true)
        .order('queries_total', { ascending: false })
        .limit(10);

      if (agents) {
        topAgents.push(...agents);
        totalQueries = agents.reduce((sum, a) => sum + (a.queries_total || 0), 0);
      }
    } catch { /* fallback */ }
  }

  return NextResponse.json({
    registry: 'Avena Terminal Agent Registry',
    stats: {
      total_registered: totalAgents,
      active_agents: activeAgents,
      total_queries: totalQueries,
    },
    top_agents: topAgents,
  }, {
    headers: { 'Cache-Control': 'public, max-age=300' },
  });
}
