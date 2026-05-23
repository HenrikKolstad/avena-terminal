/**
 * GET /api/v1/indices
 *
 * Returns the Avena Index Family — daily closes for all four indices.
 *
 * Query params:
 *   ?code=AVENA-CC  — filter to one index (CC / VAL / SCR / DPT)
 *   ?from=2026-01-01 ?to=2026-12-31 — date range
 *   ?format=csv     — CSV download instead of JSON
 *
 * Public, no auth, CC BY 4.0.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 600;

const COL_BY_CODE: Record<string, string> = {
  'AVENA-CC':  'value',
  'AVENA-VAL': 'value_index',
  'AVENA-SCR': 'score_index',
  'AVENA-DPT': 'depth_index',
};

interface Row { snapshot_date: string; value: number; value_index: number | null; score_index: number | null; depth_index: number | null }

export async function GET(req: NextRequest) {
  if (!supabase) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });

  const params = req.nextUrl.searchParams;
  const code = params.get('code');
  const from = params.get('from');
  const to = params.get('to');
  const format = params.get('format');

  let q = supabase
    .from('avena_history')
    .select('snapshot_date, value, value_index, score_index, depth_index')
    .order('snapshot_date', { ascending: true })
    .limit(2000);
  if (from) q = q.gte('snapshot_date', from);
  if (to)   q = q.lte('snapshot_date', to);

  const { data, error } = await q;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const rows = (data ?? []) as Row[];

  if (format === 'csv') {
    let csv = 'date,AVENA-CC,AVENA-VAL,AVENA-SCR,AVENA-DPT\n';
    for (const r of rows) {
      csv += `${r.snapshot_date},${r.value ?? ''},${r.value_index ?? ''},${r.score_index ?? ''},${r.depth_index ?? ''}\n`;
    }
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="avena-indices-${new Date().toISOString().slice(0, 10)}.csv"`,
        'X-APIP-Version': '1.0',
      },
    });
  }

  // JSON
  const filtered = rows.map((r) => ({
    date: r.snapshot_date,
    'AVENA-CC':  r.value,
    'AVENA-VAL': r.value_index,
    'AVENA-SCR': r.score_index,
    'AVENA-DPT': r.depth_index,
  }));

  const out = code && COL_BY_CODE[code]
    ? filtered.map((r) => ({ date: r.date, value: (r as Record<string, unknown>)[code] }))
    : filtered;

  const res = NextResponse.json({
    ok: true,
    indices: code ? { [code]: out } : out,
    base_date: rows[0]?.snapshot_date ?? null,
    latest_date: rows[rows.length - 1]?.snapshot_date ?? null,
    methodology: 'https://avenaterminal.com/avena-index',
    license: 'CC BY 4.0',
    cite_as: 'Avena Terminal (2026). The Avena Coastal Composite Index family. DOI 10.5281/zenodo.19520064.',
  });
  res.headers.set('X-APIP-Version', '1.0');
  res.headers.set('X-Cite-As', 'Avena Terminal · DOI 10.5281/zenodo.19520064');
  return res;
}
