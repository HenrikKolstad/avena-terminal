/**
 * Property Augmentation cron — backfills metrics for properties_registry.
 *
 * Each tick processes ~30 properties (rate-limit polite for Catastro + OSM)
 * and populates:
 *   - cadastral_ref + osm_id + building_footprint_m2 in properties_registry
 *   - property_geo (amenity distances)
 *   - property_climate (when COPERNICUS_API_KEY is set)
 *
 * Schedule: every 4h via vercel.json. Spread across 6 ticks/day = 180
 * properties enriched daily. Full Xavia 1,881 corpus enriched in ~10 days.
 * After that, only newly-ingested properties need processing.
 */

import { isAuthorizedCron } from '@/lib/cron-auth';
import { NextRequest, NextResponse } from 'next/server';
import { startCronLog, finishCronLog } from '@/lib/cron-log';
import { supabase } from '@/lib/supabase';
import { getCadastralRefByCoords } from '@/lib/data-sources/catastro';
import { getBuildingAtCoords, getAmenityDistances } from '@/lib/data-sources/osm';
import { getClimateRisk } from '@/lib/data-sources/climate';
import { getMarketContext } from '@/lib/data-sources/eurostat';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const BATCH_SIZE = 12;  // Reduced from 30 — Catastro + OSM + Eurostat serial calls = ~10s/property

interface PropertyRow {
  avn_prop_id: string;
  country: string;
  lat: number | null;
  lng: number | null;
  postal_code: string | null;
  cadastral_ref: string | null;
  osm_id: string | null;
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const log = await startCronLog('property-augment', '/api/cron/property-augment');

  if (!supabase) {
    await finishCronLog(log, 'error', null, new Error('Supabase not configured'));
    return NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 503 });
  }

  // Pull a batch of Spanish properties that have lat/lng but no cadastral_ref yet
  const { data, error } = await supabase
    .from('properties_registry')
    .select('avn_prop_id, country, lat, lng, postal_code, cadastral_ref, osm_id')
    .eq('country', 'ES')
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .or('cadastral_ref.is.null,osm_id.is.null')
    .order('last_augmented_at', { ascending: true, nullsFirst: true })
    .limit(BATCH_SIZE);

  if (error) {
    await finishCronLog(log, 'error', null, error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as PropertyRow[];

  let cadastralOk = 0;
  let osmOk = 0;
  let climateOk = 0;
  let geoOk = 0;
  let marketOk = 0;
  let failed = 0;

  for (const row of rows) {
    if (row.lat == null || row.lng == null) continue;

    const updates: Record<string, unknown> = { last_augmented_at: new Date().toISOString() };

    // 1. Catastro reverse-geocode (Spain only)
    if (!row.cadastral_ref) {
      try {
        const cat = await getCadastralRefByCoords(row.lat, row.lng);
        if (cat) {
          updates.cadastral_ref = cat.cadastral_ref;
          if (cat.postal_code) updates.postal_code = cat.postal_code;
          if (cat.municipality) updates.municipality = cat.municipality;
          if (cat.province) updates.province = cat.province;
          cadastralOk++;
        }
      } catch { failed++; }
      // Polite delay between Catastro requests
      await new Promise((r) => setTimeout(r, 800));
    }

    // 2. OSM building footprint match
    if (!row.osm_id) {
      try {
        const bld = await getBuildingAtCoords(row.lat, row.lng);
        if (bld) {
          updates.osm_id = bld.osm_id;
          if (bld.area_m2) updates.building_footprint_m2 = bld.area_m2;
          osmOk++;
        }
      } catch { failed++; }
      await new Promise((r) => setTimeout(r, 1500));
    }

    // 3. Persist core registry updates
    // CRITICAL: always update last_augmented_at, even if Catastro + OSM both
    // returned null. Otherwise this property keeps getting picked first by
    // the `nulls first, asc` order — cron loops on the same 12 broken
    // properties forever. Writing last_augmented_at moves it to the back
    // of the queue so the next batch processes 12 new properties.
    try {
      await supabase
        .from('properties_registry')
        .update(updates)
        .eq('avn_prop_id', row.avn_prop_id);
    } catch { failed++; }

    // 4. Amenity distances → property_geo
    try {
      const dists = await getAmenityDistances(row.lat, row.lng);
      if (dists) {
        await supabase
          .from('property_geo')
          .upsert({
            avn_prop_id: row.avn_prop_id,
            distance_beach_m: dists.beach_m ?? null,
            distance_school_m: dists.school_m ?? null,
            distance_hospital_m: dists.hospital_m ?? null,
            distance_airport_m: dists.airport_m ?? null,
            distance_train_m: dists.train_m ?? null,
            distance_supermarket_m: dists.supermarket_m ?? null,
            distance_restaurant_m: dists.restaurant_m ?? null,
            source: 'osm-overpass',
            computed_at: new Date().toISOString(),
          }, { onConflict: 'avn_prop_id' });
        geoOk++;
      }
    } catch { failed++; }
    await new Promise((r) => setTimeout(r, 1500));

    // 5. Climate risk → property_climate (only if Copernicus key set)
    try {
      const climate = await getClimateRisk(row.lat, row.lng);
      if (climate) {
        await supabase
          .from('property_climate')
          .upsert({
            avn_prop_id: row.avn_prop_id,
            ...climate,
            computed_at: new Date().toISOString(),
          }, { onConflict: 'avn_prop_id' });
        climateOk++;
      }
    } catch { failed++; }

    // 6. Market context (Eurostat) → property_market
    // Uses postal_code → NUTS3 lookup → Eurostat regional stats
    try {
      const market = await getMarketContext(row.country, row.postal_code);
      if (market) {
        await supabase
          .from('property_market')
          .upsert({
            avn_prop_id: row.avn_prop_id,
            ...market,
            computed_at: new Date().toISOString(),
          }, { onConflict: 'avn_prop_id' });
        marketOk++;
      }
    } catch { failed++; }
    await new Promise((r) => setTimeout(r, 1000));
  }

  const summary = {
    batch_size: rows.length,
    cadastral_matched: cadastralOk,
    osm_matched: osmOk,
    geo_computed: geoOk,
    climate_computed: climateOk,
    market_computed: marketOk,
    failed,
  };

  // Mark error if more than half the operations failed (real signal something is broken)
  const totalOps = rows.length * 4;
  const status = failed > totalOps / 2 ? 'error' : 'success';
  await finishCronLog(log, status, summary);
  return NextResponse.json({ ok: true, ...summary });
}
