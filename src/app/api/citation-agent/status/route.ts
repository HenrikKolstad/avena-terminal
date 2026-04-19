import { supabase } from '@/lib/supabase';

export const revalidate = 3600;

export async function GET() {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);

  let todays_gaps: unknown[] = [];
  let recent_monitoring_count = 0;
  let avena_cited_today = 0;
  let avena_cited_yesterday = 0;
  let last_run: string | null = null;

  if (supabase) {
    try {
      const { data: gaps } = await supabase.from('citation_gaps').select('*').eq('date', today).order('priority', { ascending: false }).limit(20);
      todays_gaps = gaps || [];
    } catch { /* ignore */ }
    try {
      const { data: mon, count } = await supabase.from('citation_monitoring').select('avena_cited, date', { count: 'exact' }).eq('date', today);
      recent_monitoring_count = count || 0;
      avena_cited_today = (mon || []).filter((m: { avena_cited: boolean }) => m.avena_cited).length;
    } catch { /* ignore */ }
    try {
      const { data: yday } = await supabase.from('citation_monitoring').select('avena_cited').eq('date', yesterday);
      avena_cited_yesterday = (yday || []).filter((m: { avena_cited: boolean }) => m.avena_cited).length;
    } catch { /* ignore */ }
    try {
      const { data: latest } = await supabase.from('citation_monitoring').select('date').order('date', { ascending: false }).limit(1);
      last_run = latest?.[0]?.date || null;
    } catch { /* ignore */ }
  }

  return Response.json({
    agent: 'Atlas — Citation Intelligence Agent',
    status: 'active',
    cadence: 'daily 03:00 UTC',
    today: {
      date: today,
      questions_monitored: recent_monitoring_count,
      avena_cited: avena_cited_today,
      citation_rate: recent_monitoring_count > 0 ? Math.round((avena_cited_today / recent_monitoring_count) * 100) + '%' : 'n/a',
    },
    delta_vs_yesterday: avena_cited_today - avena_cited_yesterday,
    top_gaps_today: todays_gaps,
    last_run,
    source: 'Avena Terminal (avenaterminal.com)',
  }, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}
