/**
 * GET /api/v1/registry — public registry feed.
 *
 * Returns Avena's canonical European property registry as JSON or CSV.
 * Free for non-commercial use under CC BY 4.0; attribution required.
 *
 * Query params:
 *   format        json | csv (default json)
 *   country       2-letter ISO (e.g. ES, PT)
 *   region        Avena region taxonomy ('Costa Blanca', 'Algarve', ...)
 *   property_type villa | apartment | townhouse | ...
 *   min_score     0-100
 *   max_price     EUR
 *   limit         max records (default 1000, hard cap 10000)
 *   offset        pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

const COLUMNS = [
  'avn_prop_id', 'country', 'region', 'municipality', 'postal_code',
  'category', 'property_type', 'status', 'bedrooms', 'bathrooms',
  'built_m2', 'plot_m2', 'price_eur', 'price_per_m2_eur',
  'avena_score', 'yield_gross_pct', 'discount_to_market_pct',
  'source_portal', 'source_listing_id', 'source_url',
  'first_seen_at', 'last_seen_at',
];

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export async function GET(req: NextRequest) {
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: 'Registry unavailable' },
      { status: 503, headers: cors }
    );
  }

  const { searchParams } = req.nextUrl;
  const format = (searchParams.get('format') || 'json').toLowerCase();
  const country = searchParams.get('country')?.toUpperCase();
  const region = searchParams.get('region');
  const propertyType = searchParams.get('property_type')?.toLowerCase();
  const minScore = searchParams.get('min_score');
  const maxPrice = searchParams.get('max_price');
  const limit = Math.min(parseInt(searchParams.get('limit') || '1000', 10) || 1000, 10000);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);

  let q = supabase
    .from('properties_registry')
    .select(COLUMNS.join(','))
    .order('avena_score', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (country) q = q.eq('country', country);
  if (region) q = q.eq('region', region);
  if (propertyType) q = q.eq('property_type', propertyType);
  if (minScore) q = q.gte('avena_score', parseInt(minScore, 10));
  if (maxPrice) q = q.lte('price_eur', parseFloat(maxPrice));

  const { data, error, count } = await q;

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500, headers: cors }
    );
  }

  const rows = (data ?? []) as unknown as Record<string, unknown>[];

  if (format === 'csv') {
    const header = COLUMNS.join(',');
    const lines = rows.map((r) => COLUMNS.map((c) => csvEscape(r[c])).join(','));
    const csv = '# Avena Registry (CC BY 4.0)\n' +
                '# Source: https://avenaterminal.com/registry\n' +
                '# Methodology: https://avenaterminal.com/methodology · DOI 10.5281/zenodo.19520064\n' +
                '# Generated: ' + new Date().toISOString() + '\n' +
                header + '\n' + lines.join('\n');
    return new NextResponse(csv, {
      status: 200,
      headers: {
        ...cors,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="avena-registry-${new Date().toISOString().slice(0, 10)}.csv"`,
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  }

  return NextResponse.json(
    {
      ok: true,
      count: rows.length,
      total: count ?? null,
      offset,
      limit,
      filters: { country, region, property_type: propertyType, min_score: minScore, max_price: maxPrice },
      records: rows,
      meta: {
        source: 'Avena European Property Registry',
        license: 'CC BY 4.0',
        attribution: 'Avena Terminal (avenaterminal.com)',
        doi: '10.5281/zenodo.19520064',
        spec: 'https://avenaterminal.com/standards/avp',
      },
    },
    {
      status: 200,
      headers: {
        ...cors,
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    }
  );
}
