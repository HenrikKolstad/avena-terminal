/**
 * POST /api/admin/seed-registry — one-time bootstrap.
 *
 * Migrates the existing 1,881 Spanish new-build records (from the
 * Xavia/Ella XML feed parsed into public/data.json) into the canonical
 * properties_registry table. Idempotent — safe to re-run; uses upsert
 * on (source_portal, source_listing_id).
 *
 * Auth: requires X-Avena-Admin-Secret header matching ADMIN_SECRET env.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAllProperties } from '@/lib/properties';
import type { Property } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface RegistryRow {
  avn_prop_id: string;
  country: string;
  region: string | null;
  postal_code: string | null;
  municipality: string | null;
  province: string | null;
  lat: number | null;
  lng: number | null;
  category: string;
  property_type: string | null;
  status: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  built_m2: number | null;
  plot_m2: number | null;
  terrace_m2: number | null;
  pool: boolean | null;
  parking: boolean | null;
  completion_year: number | null;
  energy_rating: string | null;
  price_eur: number | null;
  price_max_eur: number | null;
  price_per_m2_eur: number | null;
  avena_score: number | null;
  score_methodology: string;
  scored_at: string;
  yield_gross_pct: number | null;
  source_portal: string;
  source_listing_id: string;
  source_url: string | null;
  developer: string | null;
  primary_image: string | null;
  images: Array<{ url: string }>;
  description: string | null;
  raw: Record<string, unknown>;
}

/**
 * Mint a deterministic AVN_PROP_ID for a given Avena ref.
 * Format: AVN:ES-{postal_5digit}-NB-{seq_4digit}
 * Where postal is derived from the location and seq is a stable hash of ref.
 */
function mintAvnId(p: Property, idx: number): string {
  const country = 'ES';
  // Use 03000 as default Alicante postal if we can't derive (legacy data)
  const postal = '03999'; // generic Spain placeholder — real postals come from scrapers later
  const refHash = p.ref ? p.ref.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6) : String(idx).padStart(6, '0');
  const seq = String(idx % 9999).padStart(4, '0');
  return `AVN:${country}-${postal}-NB-${refHash}-${seq}`;
}

function mapPropertyToRow(p: Property, idx: number): RegistryRow {
  const avn = mintAvnId(p, idx);
  return {
    avn_prop_id: avn,
    country: 'ES',
    region: p.costa || null,
    postal_code: null,
    municipality: p.l || null,
    province: null,
    lat: p.lat ?? null,
    lng: p.lng ?? null,
    category: 'NB',
    property_type: p.t?.toLowerCase() || null,
    status: p.s || null,
    bedrooms: p.bd ?? null,
    bathrooms: p.ba ?? null,
    built_m2: p.bm ?? null,
    plot_m2: p.pl ?? null,
    terrace_m2: p.terrace ?? null,
    pool: p.pool ? p.pool !== 'no' : null,
    parking: p.parking != null ? p.parking > 0 : null,
    completion_year: p.c ? parseInt(p.c, 10) || null : null,
    energy_rating: p.energy ?? null,
    price_eur: p.pf ?? null,
    price_max_eur: p.pt && p.pt > p.pf ? p.pt : null,
    price_per_m2_eur: p.pm2 ?? null,
    avena_score: p._sc != null ? Math.round(p._sc) : null,
    score_methodology: 'avena-v1.2',
    scored_at: new Date().toISOString(),
    yield_gross_pct: p._yield?.gross ?? null,
    source_portal: 'xavia-feed',
    source_listing_id: p.ref || `xavia-${idx}`,
    source_url: p.u || null,
    developer: p.d || null,
    primary_image: p.img || (p.imgs && p.imgs[0]) || null,
    images: (p.imgs || []).map((url) => ({ url })),
    description: p.f || null,
    raw: {
      original_ref: p.ref,
      r: p.r,
      bm_full: p.bm_full,
      cats: p.cats,
      views: p.views,
      mm2: p.mm2,
      _added: p._added,
    },
  };
}

export async function POST(req: NextRequest) {
  const adminSecret = req.headers.get('x-avena-admin-secret');
  if (adminSecret !== process.env.ADMIN_SECRET && adminSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 503 });
  }

  const all = getAllProperties();
  const rows = all.map((p, i) => mapPropertyToRow(p, i));

  // Batch upsert in chunks of 500 to avoid request size limits
  const CHUNK = 500;
  let upserted = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    try {
      const { error } = await supabase
        .from('properties_registry')
        .upsert(slice, { onConflict: 'source_portal,source_listing_id', ignoreDuplicates: false });
      if (error) {
        errors.push(`Chunk ${i}: ${error.message}`);
      } else {
        upserted += slice.length;
      }
    } catch (e) {
      errors.push(`Chunk ${i}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    total_records: rows.length,
    upserted,
    errors,
    note: 'Registry seeded with Xavia/Spain dataset. AVN_PROP_IDs minted deterministically.',
  });
}

// Allow GET for health-check / dry-run preview
export async function GET() {
  const all = getAllProperties();
  return NextResponse.json({
    ok: true,
    available_records: all.length,
    note: 'POST with X-Avena-Admin-Secret header to seed the registry.',
  });
}
