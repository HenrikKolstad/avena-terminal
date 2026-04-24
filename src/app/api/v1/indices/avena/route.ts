import { NextRequest, NextResponse } from 'next/server';
import { computeAvena } from '@/lib/avena-index';
import { supabase } from '@/lib/supabase';

export const revalidate = 300;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

interface HistRow {
  snapshot_date: string;
  value: number;
  median_pm2: number | null;
  mean_score: number | null;
  count: number | null;
}

async function loadHistory(limit: number): Promise<HistRow[]> {
  if (!supabase) return [];
  try {
    const { data } = await supabase
      .from('avena_history')
      .select('snapshot_date, value, median_pm2, mean_score, count')
      .order('snapshot_date', { ascending: true })
      .limit(limit);
    return (data ?? []) as HistRow[];
  } catch {
    return [];
  }
}

function csvEscape(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const format = (searchParams.get('format') || 'json').toLowerCase();
  const historyParam = searchParams.get('history') || '';
  const limit = historyParam === 'all' ? 5000 : historyParam ? Math.max(1, Math.min(3650, parseInt(historyParam, 10) || 90)) : 90;

  const live = computeAvena();
  const history = await loadHistory(limit);

  if (format === 'csv') {
    const rows = [['date', 'value', 'median_pm2', 'mean_score', 'count']];
    for (const r of history) {
      rows.push([r.snapshot_date, String(r.value), String(r.median_pm2 ?? ''), String(r.mean_score ?? ''), String(r.count ?? '')]);
    }
    rows.push([live.date, String(live.value), String(live.median_pm2), String(live.mean_score), String(live.count)]);
    const csv = rows.map((r) => r.map(csvEscape).join(',')).join('\n');
    return new NextResponse(csv, {
      headers: {
        ...cors,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="avena-history.csv"',
      },
    });
  }

  return NextResponse.json(
    {
      index: 'AVENA',
      ticker: 'AVENA.TERMINAL',
      name: 'AVENA Index',
      full_name: 'AVENA European New-Build Composite',
      methodology: 'v1.0',
      methodology_url: 'https://avenaterminal.com/indices/avena',
      base: { date: '2026-01-01', value: 1000 },
      live,
      history,
      license: 'CC BY 4.0',
      cite_as: 'AVENA · Avena Terminal (avenaterminal.com)',
      doi: '10.5281/zenodo.19520064',
    },
    { headers: cors }
  );
}
