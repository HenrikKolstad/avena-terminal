/**
 * GET /api/v1/transactions/live
 *
 * Returns the N most recently sold properties (from sold_properties).
 * Powers the live transactions ticker on /eu-takeover.
 *
 * Query params:
 *   ?limit=20      — number of transactions (default 30, max 100)
 *   ?country=ES    — filter by ISO 3166-1 alpha-2 country code
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

interface SoldRow {
  ref: string;
  property_name: string | null;
  town: string | null;
  region: string | null;
  type: string | null;
  last_price: number | null;
  last_pm2: number | null;
  last_seen_date: string | null;
  beds: number | null;
  country: string | null;
}

export async function GET(req: NextRequest) {
  if (!supabase) return NextResponse.json({ ok: true, transactions: [], source: 'unavailable' });

  const params = req.nextUrl.searchParams;
  const limit = Math.min(Math.max(parseInt(params.get('limit') ?? '30', 10) || 30, 1), 100);
  const country = params.get('country');

  let q = supabase
    .from('sold_properties')
    .select('ref, property_name, town, region, type, last_price, last_pm2, last_seen_date, beds, country')
    .order('last_seen_date', { ascending: false })
    .limit(limit);
  if (country) q = q.eq('country', country.toUpperCase());

  const { data, error } = await q;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const transactions = (data ?? []).map((r: SoldRow) => ({
    ref: r.ref,
    name: r.property_name ?? `${r.type ?? 'Property'} in ${r.town ?? '—'}`,
    town: r.town ?? '—',
    region: r.region ?? '',
    country: r.country ?? 'ES',
    type: r.type ?? 'Property',
    price_eur: r.last_price ?? null,
    pm2: r.last_pm2 ?? null,
    sold_date: r.last_seen_date ?? null,
    beds: r.beds ?? null,
  }));

  return NextResponse.json({
    ok: true,
    transactions,
    count: transactions.length,
    source: 'avena.sold_properties · diff-detection from feed sync',
    methodology_url: 'https://avenaterminal.com/methodology',
  });
}
