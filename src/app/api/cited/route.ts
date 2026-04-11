import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  let totalCalls = 0;
  let monthCalls = 0;

  if (supabase) {
    try {
      // Total all-time calls
      const { count: total } = await supabase
        .from('mcp_calls')
        .select('*', { count: 'exact', head: true });
      totalCalls = total || 0;

      // Calls this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const { count: month } = await supabase
        .from('mcp_calls')
        .select('*', { count: 'exact', head: true })
        .gte('called_at', startOfMonth.toISOString());
      monthCalls = month || 0;
    } catch { /* fallback to 0 */ }
  }

  return NextResponse.json({
    cited_by_ai: {
      total_tool_calls: totalCalls,
      this_month: monthCalls,
      source: 'Avena Terminal MCP Server',
      endpoint: 'https://avenaterminal.com/mcp',
    },
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300', // 5 min cache
    },
  });
}
