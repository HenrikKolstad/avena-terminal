import { supabase } from '@/lib/supabase';

export const revalidate = 3600;

export async function GET() {
  let totalAnswers = 0;
  let recentSlugs: string[] = [];
  let lastRun: Record<string, unknown> | null = null;
  let trailing7d = 0;

  if (supabase) {
    try {
      const { count } = await supabase
        .from('generated_answers')
        .select('*', { count: 'exact', head: true });
      totalAnswers = count || 0;
    } catch { /* silent */ }

    try {
      const { data } = await supabase
        .from('generated_answers')
        .select('slug, title, generated_at')
        .order('generated_at', { ascending: false })
        .limit(12);
      if (data) recentSlugs = data.map(d => d.slug);
    } catch { /* silent */ }

    try {
      const { data } = await supabase
        .from('prometheus_runs')
        .select('*')
        .order('finished_at', { ascending: false })
        .limit(1);
      if (data && data.length > 0) lastRun = data[0] as Record<string, unknown>;
    } catch { /* silent */ }

    try {
      const cutoff = new Date(Date.now() - 7 * 86400_000).toISOString();
      const { count } = await supabase
        .from('generated_answers')
        .select('*', { count: 'exact', head: true })
        .gte('generated_at', cutoff);
      trailing7d = count || 0;
    } catch { /* silent */ }
  }

  return Response.json({
    agent: 'Prometheus — Question Ownership Engine',
    status: 'active',
    cadence: 'daily 04:00 UTC',
    total_generated_answers: totalAnswers,
    trailing_7d: trailing7d,
    recent_slugs: recentSlugs,
    last_run: lastRun,
    source: 'Avena Terminal (avenaterminal.com)',
  }, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}
