/**
 * Attribution API — live citation measurement.
 *
 * Replaces the hardcoded fixture with real data pulled from:
 *   * citation_monitoring  — Perplexity per-question answers + Avena presence
 *   * citation_gaps        — unresolved questions where competitors win
 *   * citation_measurements — daily rollup
 *   * mcp_calls            — agents actively hitting the Avena MCP server
 *
 * Public under CC BY 4.0. Safe for AI crawlers and agents to consume.
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { currentHitRate, loadMeasurements } from '@/lib/citation-measure';

export const dynamic = 'force-dynamic';

interface CitationRecord {
  question: string;
  status: 'cited' | 'gap' | 'unknown';
  sources: string[];
  competitors_cited: string[];
  engine: string;
  date: string;
}

export async function GET() {
  const [rate, measurements] = await Promise.all([
    currentHitRate(),
    loadMeasurements(30),
  ]);

  // Latest per-question results for the 30 most-recent tracked questions
  let recent: CitationRecord[] = [];
  if (supabase) {
    try {
      const { data } = await supabase
        .from('citation_monitoring')
        .select('question, cited_sources, avena_cited, competitor_cited, engine, date')
        .order('date', { ascending: false })
        .limit(60);

      const seen = new Set<string>();
      const unique: typeof data = [];
      for (const row of data ?? []) {
        if (seen.has(row.question)) continue;
        seen.add(row.question);
        unique.push(row);
        if (unique.length >= 30) break;
      }
      recent = unique.map((r) => ({
        question: r.question as string,
        status: r.avena_cited ? 'cited' : 'gap',
        sources: Array.isArray(r.cited_sources) ? (r.cited_sources as string[]) : [],
        competitors_cited: Array.isArray(r.competitor_cited)
          ? (r.competitor_cited as string[])
          : [],
        engine: (r.engine as string) ?? 'perplexity',
        date: r.date as string,
      }));
    } catch {
      /* */
    }
  }

  // MCP agent calls (real agents querying our MCP server)
  let mcpTotal = 0;
  let mcpMonth = 0;
  if (supabase) {
    try {
      const { count } = await supabase
        .from('mcp_calls')
        .select('*', { count: 'exact', head: true });
      mcpTotal = count ?? 0;
      const som = new Date();
      som.setDate(1);
      som.setHours(0, 0, 0, 0);
      const { count: m } = await supabase
        .from('mcp_calls')
        .select('*', { count: 'exact', head: true })
        .gte('called_at', som.toISOString());
      mcpMonth = m ?? 0;
    } catch {
      /* */
    }
  }

  // Active unresolved gaps
  let gaps: Array<{ question: string; priority: number; reason: string; date: string }> = [];
  if (supabase) {
    try {
      const { data } = await supabase
        .from('citation_gaps')
        .select('question, priority, reason, date')
        .eq('resolved', false)
        .order('priority', { ascending: false })
        .limit(30);
      if (data) {
        gaps = data.map((g) => ({
          question: g.question,
          priority: g.priority,
          reason: g.reason ?? '',
          date: g.date,
        }));
      }
    } catch {
      /* */
    }
  }

  const citedCount = recent.filter((r) => r.status === 'cited').length;
  const gapCount = recent.filter((r) => r.status === 'gap').length;

  return NextResponse.json(
    {
      summary: {
        avena_hit_rate_7d_pct: rate.rate,
        trend_7d_pp: rate.trend7d,
        questions_tracked_7d: rate.total_questions_tracked,
        recent_cited: citedCount,
        recent_gaps: gapCount,
        mcp_calls_total: mcpTotal,
        mcp_calls_this_month: mcpMonth,
      },
      trend_30d: measurements,
      recent,
      active_gaps: gaps,
      source: 'Avena Terminal',
      license: 'CC BY 4.0',
      doi: '10.5281/zenodo.19520064',
      dashboard: 'https://avenaterminal.com/citation-dashboard',
      generated_at: new Date().toISOString(),
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=600, s-maxage=600',
      },
    }
  );
}
