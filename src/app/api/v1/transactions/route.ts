/**
 * GET /api/v1/transactions — recent property transactions with AVM accuracy.
 *
 * Reads from `property_transactions` (preferred) or `sold_properties`
 * (legacy). Computes AVM accuracy as | avm_estimate - sold_price | / sold_price.
 * Falls back to an empty array with status='no_transactions' rather than
 * fabricated data.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

interface RawTxn {
  property_ref?: string | null;
  location?: string | null;
  property_type?: string | null;
  listed_price?: number | null;
  sold_price?: number | null;
  avm_estimate?: number | null;
  list_date?: string | null;
  sold_date?: string | null;
}

function normalise(t: RawTxn) {
  const listed = t.listed_price ?? null;
  const sold = t.sold_price ?? null;
  const avm = t.avm_estimate ?? null;
  const discount_pct = (listed && sold) ? Number((((listed - sold) / listed) * 100).toFixed(1)) : null;
  const days_on_market = (t.list_date && t.sold_date)
    ? Math.round((new Date(t.sold_date).getTime() - new Date(t.list_date).getTime()) / 86_400_000)
    : null;
  const avm_accuracy = (sold && avm)
    ? Number((100 - Math.abs((avm - sold) / sold) * 100).toFixed(1))
    : null;
  return {
    ref: t.property_ref ?? null,
    location: t.location ?? null,
    type: t.property_type ?? null,
    listed_price: listed,
    sold_price: sold,
    discount_pct,
    days_on_market,
    date: t.sold_date ?? null,
    avm_accuracy,
  };
}

export async function GET(_req: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ transactions: [], status: 'unavailable', reason: 'supabase not configured' }, { status: 503 });
  }

  // Try property_transactions first
  let rows: RawTxn[] = [];
  try {
    const { data } = await supabase
      .from('property_transactions')
      .select('property_ref, location, property_type, listed_price, sold_price, avm_estimate, list_date, sold_date')
      .order('sold_date', { ascending: false })
      .limit(50);
    rows = (data ?? []) as RawTxn[];
  } catch { /* fall through to sold_properties */ }

  if (rows.length === 0) {
    try {
      const { data } = await supabase
        .from('sold_properties')
        .select('*')
        .order('sold_date', { ascending: false })
        .limit(50);
      rows = (data ?? []) as RawTxn[];
    } catch { /* leave empty */ }
  }

  if (rows.length === 0) {
    return NextResponse.json({
      transactions: [],
      aggregate_stats: { total_transactions: 0 },
      status: 'no_transactions',
      note: 'No transactions in the registry yet. Catastro/Registro Mercantil integration pending — pipeline writes to property_transactions when sold_date observed.',
      source: 'Avena Terminal (avenaterminal.com)',
    });
  }

  const transactions = rows.map(normalise);
  const withDiscount = transactions.filter((t) => t.discount_pct != null) as Array<typeof transactions[number] & { discount_pct: number }>;
  const withDays = transactions.filter((t) => t.days_on_market != null) as Array<typeof transactions[number] & { days_on_market: number }>;
  const withAccuracy = transactions.filter((t) => t.avm_accuracy != null) as Array<typeof transactions[number] & { avm_accuracy: number }>;

  const avg = (a: number[]) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;

  return NextResponse.json({
    transactions,
    aggregate_stats: {
      total_transactions: transactions.length,
      avg_discount_pct: withDiscount.length ? Number(avg(withDiscount.map((t) => t.discount_pct)).toFixed(1)) : null,
      avg_days_on_market: withDays.length ? Math.round(avg(withDays.map((t) => t.days_on_market))) : null,
      total_volume_eur: transactions.reduce((s, t) => s + (t.sold_price ?? 0), 0),
    },
    avm_validation: withAccuracy.length ? {
      accuracy_score: Number(avg(withAccuracy.map((t) => t.avm_accuracy)).toFixed(1)),
      sample_size: withAccuracy.length,
      methodology: 'sold_price_vs_avm_estimate_comparison',
    } : { accuracy_score: null, sample_size: 0, methodology: 'pending — need observed sold + avm pairs' },
    status: 'live',
    source: 'Avena Terminal — property_transactions',
  });
}
