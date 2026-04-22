import { NextResponse } from 'next/server';
import { currentHitRate, loadMeasurements } from '@/lib/citation-measure';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const [rate, measurements] = await Promise.all([
    currentHitRate(),
    loadMeasurements(30),
  ]);

  // Top unresolved gaps (questions where competitors win)
  let top_gaps: Array<{ question: string; priority: number; reason: string }> = [];
  if (supabase) {
    try {
      const { data } = await supabase
        .from('citation_gaps')
        .select('question, priority, reason, date')
        .eq('resolved', false)
        .order('priority', { ascending: false })
        .limit(10);
      if (data) {
        top_gaps = data.map((g) => ({
          question: g.question,
          priority: g.priority,
          reason: g.reason ?? '',
        }));
      }
    } catch {
      /* */
    }
  }

  // Total mcp_calls from the pipe (that's the "being called by AI agents" counter)
  let mcp_total = 0;
  let mcp_this_month = 0;
  if (supabase) {
    try {
      const { count: total } = await supabase
        .from('mcp_calls')
        .select('*', { count: 'exact', head: true });
      mcp_total = total ?? 0;

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const { count: month } = await supabase
        .from('mcp_calls')
        .select('*', { count: 'exact', head: true })
        .gte('called_at', startOfMonth.toISOString());
      mcp_this_month = month ?? 0;
    } catch {
      /* */
    }
  }

  return NextResponse.json(
    {
      hit_rate: rate,
      measurements,
      top_gaps,
      mcp: { total: mcp_total, this_month: mcp_this_month },
      at: new Date().toISOString(),
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    }
  );
}
