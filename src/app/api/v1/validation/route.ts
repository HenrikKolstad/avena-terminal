/**
 * GET /api/v1/validation
 *
 * Public query over eu_validation_snapshots. Same access conventions as
 * /api/v1/stats.
 *
 * Query params:
 *   country   ISO 2-char
 *   region    'coastal' | 'national' | ...
 *   from / to ISO period bounds
 *   limit     1..2000 (default 200)
 *   format    json | csv
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const COMMON_HEADERS = {
  'X-Avena-Layer': 'cross-validation',
  'X-Avena-License': 'CC-BY-4.0',
  'X-Avena-DOI': '10.5281/zenodo.19520064',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
};

export async function GET(req: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'data layer not configured' }, { status: 503, headers: COMMON_HEADERS });
  }
  const { searchParams } = req.nextUrl;
  const country = searchParams.get('country')?.toUpperCase();
  const region = searchParams.get('region')?.toLowerCase();
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const limit = Math.min(2000, Math.max(1, parseInt(searchParams.get('limit') ?? '200', 10) || 200));
  const format = (searchParams.get('format') ?? 'json').toLowerCase();

  try {
    let q = supabase
      .from('eu_validation_snapshots')
      .select('country_code, region, period, official_source, official_indicator, official_value, avena_value, delta_bps, delta_pct, avena_n_properties, note, computed_at')
      .order('computed_at', { ascending: false })
      .limit(limit);
    if (country) q = q.eq('country_code', country);
    if (region) q = q.eq('region', region);
    if (from) q = q.gte('period', from);
    if (to) q = q.lte('period', to);

    const { data, error } = await q;
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500, headers: COMMON_HEADERS });
    const rows = data ?? [];

    if (format === 'csv') {
      const cols = ['country_code','region','period','official_source','official_indicator','official_value','avena_value','delta_bps','delta_pct','avena_n_properties','note','computed_at'];
      const esc = (v: unknown) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
      const body = [cols.join(','), ...rows.map((r: Record<string, unknown>) => cols.map((c) => esc(r[c])).join(','))].join('\n');
      return new NextResponse(body, { headers: { ...COMMON_HEADERS, 'Content-Type': 'text/csv; charset=utf-8' } });
    }

    return NextResponse.json({
      ok: true,
      count: rows.length,
      filters: { country, region, from, to, limit },
      rows,
      methodology: 'https://avenaterminal.com/sovereign-briefing/cross-validating-official-statistics-2026',
    }, { headers: COMMON_HEADERS });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500, headers: COMMON_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { ...COMMON_HEADERS, 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' },
  });
}
