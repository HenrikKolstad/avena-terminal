/**
 * GET /api/v1/property/{ref} — bundled per-property data sheet API.
 *
 * Returns the full institutional dataset for one property: identity,
 * geography, physical specs, valuation, climate risk, transactions,
 * regulatory status, market context, provenance — all in one response.
 *
 * Identity, location, basic specs, current price/score = FREE
 * Climate, transactions, regulatory, market context, valuation history = PAID
 *
 * Auth: optional `X-Avena-API-Key` header for paid tier. Without it,
 * the response includes paid sections but their values are replaced by
 * `{ paywall: true, unlock_at: '/pro' }` placeholders.
 *
 * Spec: AVP v1.0 | License: CC BY 4.0 (free tier) | Commercial: contact
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;
export const revalidate = 300;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Avena-API-Key',
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

const PAYWALL_PLACEHOLDER = { paywall: true, unlock_at: 'https://avenaterminal.com/pro' };

function isAuthed(req: NextRequest): boolean {
  const key = req.headers.get('x-avena-api-key') || '';
  // For now: any non-empty key that matches AVENA_API_KEY env var counts as paid.
  // Future: per-key plans, rate limits, usage tracking via Supabase.
  const validKey = process.env.AVENA_API_KEY || process.env.AVP_SIGNING_SECRET || '';
  return validKey.length > 0 && key === validKey;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  const { ref: rawRef } = await params;
  const ref = decodeURIComponent(rawRef).trim();

  if (!ref || !ref.startsWith('AVN:')) {
    return NextResponse.json(
      { ok: false, error: 'Provide a canonical AVN_PROP_ID (starts with "AVN:")' },
      { status: 400, headers: cors }
    );
  }

  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: 'Registry unavailable' },
      { status: 503, headers: cors }
    );
  }

  // Pull all 8 augmentation tables in parallel, joined by avn_prop_id
  const [coreRes, geoRes, climateRes, valRes, valHistRes, txRes, regRes, marketRes] = await Promise.all([
    supabase.from('properties_registry').select('*').eq('avn_prop_id', ref).maybeSingle(),
    supabase.from('property_geo').select('*').eq('avn_prop_id', ref).maybeSingle(),
    supabase.from('property_climate').select('*').eq('avn_prop_id', ref).maybeSingle(),
    supabase.from('property_valuation').select('*').eq('avn_prop_id', ref).maybeSingle(),
    supabase.from('property_valuation_history').select('*').eq('avn_prop_id', ref).order('recorded_at', { ascending: false }).limit(50),
    supabase.from('property_transactions').select('*').eq('avn_prop_id', ref).order('transacted_at', { ascending: false }).limit(50),
    supabase.from('property_regulatory').select('*').eq('avn_prop_id', ref).maybeSingle(),
    supabase.from('property_market').select('*').eq('avn_prop_id', ref).maybeSingle(),
  ]);

  const core = coreRes.data;
  if (!core) {
    return NextResponse.json(
      { ok: false, error: 'AVN_PROP_ID not found in registry' },
      { status: 404, headers: cors }
    );
  }

  const authed = isAuthed(req);

  // Free tier exposes: identity, location, basic specs, current price/score, primary image
  const free = {
    identity: {
      avn_prop_id: core.avn_prop_id,
      cadastral_ref: core.cadastral_ref,
      osm_id: core.osm_id,
      tier: core.tier,
      is_for_sale: core.is_for_sale,
      source_portal: core.source_portal,
      source_url: core.source_url,
    },
    location: {
      country: core.country,
      region: core.region,
      municipality: core.municipality,
      province: core.province,
      postal_code: core.postal_code,
      lat: core.lat,
      lng: core.lng,
      address: core.address,
    },
    physical: {
      property_type: core.property_type,
      status: core.status,
      bedrooms: core.bedrooms,
      bathrooms: core.bathrooms,
      built_m2: core.built_m2,
      plot_m2: core.plot_m2,
      terrace_m2: core.terrace_m2,
      year_built: core.year_built,
      completion_year: core.completion_year,
      energy_rating: core.energy_rating,
      pool: core.pool,
      parking: core.parking,
      building_footprint_m2: core.building_footprint_m2,
    },
    listing: {
      price_eur: core.price_eur,
      price_max_eur: core.price_max_eur,
      price_per_m2_eur: core.price_per_m2_eur,
      avena_score: core.avena_score,
      yield_gross_pct: core.yield_gross_pct,
      developer: core.developer,
      first_seen_at: core.first_seen_at,
      last_seen_at: core.last_seen_at,
    },
    media: {
      primary_image: core.primary_image,
      images_count: Array.isArray(core.images) ? core.images.length : 0,
    },
  };

  // Paid sections — gated unless authed
  const paid = {
    geo: authed ? (geoRes.data ?? null) : PAYWALL_PLACEHOLDER,
    climate: authed ? (climateRes.data ?? null) : PAYWALL_PLACEHOLDER,
    valuation: authed ? (valRes.data ?? null) : PAYWALL_PLACEHOLDER,
    valuation_history: authed ? (valHistRes.data ?? []) : PAYWALL_PLACEHOLDER,
    transactions: authed ? (txRes.data ?? []) : PAYWALL_PLACEHOLDER,
    regulatory: authed ? (regRes.data ?? null) : PAYWALL_PLACEHOLDER,
    market: authed ? (marketRes.data ?? null) : PAYWALL_PLACEHOLDER,
  };

  return NextResponse.json(
    {
      ok: true,
      avn_prop_id: ref,
      generated_at: new Date().toISOString(),
      access_tier: authed ? 'paid' : 'free',
      data: {
        ...free,
        ...paid,
      },
      meta: {
        source: 'Avena European Property Registry',
        license_free: 'CC BY 4.0',
        license_paid: 'Commercial — contact henrik@avenaterminal.com',
        attribution: 'Avena Terminal (avenaterminal.com)',
        doi: '10.5281/zenodo.19520064',
        spec: 'https://avenaterminal.com/standards/avp',
        verifier: 'https://avenaterminal.com/standards/avp/verify',
        unlock_paid: 'https://avenaterminal.com/pro',
      },
    },
    {
      headers: {
        ...cors,
        'Cache-Control': authed
          ? 'private, no-store'
          : 'public, s-maxage=300, stale-while-revalidate=600',
      },
    }
  );
}
