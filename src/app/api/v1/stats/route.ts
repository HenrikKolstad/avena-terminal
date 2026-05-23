/**
 * GET /api/v1/stats
 *
 * Public query endpoint over the eu_official_stats time-series store.
 * No auth required. CORS-open. CC BY 4.0.
 *
 * Query params:
 *   country     ISO 3166-1 alpha-2 (e.g. ES, DE, EU27_2020)
 *   source      eurostat | ecb_sdw | ine_es | istat | cbs | bis
 *   indicator   substring match against indicator_code (e.g. 'prc_hpi_q')
 *   from        ISO period lower bound (e.g. 2024 or 2024-Q1)
 *   to          ISO period upper bound
 *   limit       max rows (default 500, max 5000)
 *   format      json (default) | csv
 *
 * Response headers carry provenance:
 *   X-Avena-Layer: official-statistics
 *   X-Avena-License: CC-BY-4.0
 *   X-Avena-DOI: 10.5281/zenodo.19520064
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const COMMON_HEADERS = {
  'X-Avena-Layer': 'official-statistics',
  'X-Avena-License': 'CC-BY-4.0',
  'X-Avena-DOI': '10.5281/zenodo.19520064',
  'X-Avena-Cite-As': 'Avena Terminal (2026). EU Official Statistics Layer. avenaterminal.com/eu-official',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
};

export async function GET(req: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'data layer not configured' }, { status: 503, headers: COMMON_HEADERS });
  }

  const { searchParams } = req.nextUrl;
  const country = searchParams.get('country')?.toUpperCase();
  const source = searchParams.get('source')?.toLowerCase();
  const indicator = searchParams.get('indicator');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const limit = Math.min(5000, Math.max(1, parseInt(searchParams.get('limit') ?? '500', 10) || 500));
  const format = (searchParams.get('format') ?? 'json').toLowerCase();

  try {
    let query = supabase
      .from('eu_official_stats')
      .select('source, indicator_code, indicator_name, country_code, period, period_freq, value, unit, source_url, fetched_at')
      .order('period', { ascending: false })
      .limit(limit);

    if (country) query = query.eq('country_code', country);
    if (source) query = query.eq('source', source);
    if (indicator) query = query.ilike('indicator_code', `%${indicator}%`);
    if (from) query = query.gte('period', from);
    if (to) query = query.lte('period', to);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500, headers: COMMON_HEADERS });
    }

    const rows = data ?? [];

    if (format === 'csv') {
      const header = 'source,indicator_code,indicator_name,country_code,period,period_freq,value,unit,source_url,fetched_at';
      const escape = (v: unknown) => {
        const s = v == null ? '' : String(v);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      };
      const body = [
        header,
        ...rows.map((r: Record<string, unknown>) =>
          ['source','indicator_code','indicator_name','country_code','period','period_freq','value','unit','source_url','fetched_at']
            .map((k) => escape(r[k])).join(',')
        ),
      ].join('\n');
      return new NextResponse(body, {
        status: 200,
        headers: {
          ...COMMON_HEADERS,
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'inline; filename="avena_stats.csv"',
        },
      });
    }

    return NextResponse.json({
      ok: true,
      count: rows.length,
      filters: { country, source, indicator, from, to, limit },
      rows,
    }, { headers: COMMON_HEADERS });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500, headers: COMMON_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...COMMON_HEADERS,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
