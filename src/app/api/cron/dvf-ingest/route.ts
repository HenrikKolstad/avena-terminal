/**
 * France DVF Ingest cron — pulls real French property transactions
 * into properties_registry as tier='record'.
 *
 * Each tick processes one priority commune × one year (2023 or 2024).
 * Adds typically 200-2000 records per tick. Runs daily, rotating
 * through 13 priority communes — full coverage of Côte d'Azur + Var
 * + central Paris in ~2 weeks.
 *
 * This is what makes the registry actually European: Spain has Xavia
 * listings, France now has DVF transactions. Each AVN_PROP_ID minted
 * deterministically from the DVF mutation ID + coordinates.
 */

import { isAuthorizedCron } from '@/lib/cron-auth';
import { NextRequest, NextResponse } from 'next/server';
import { startCronLog, finishCronLog } from '@/lib/cron-log';
import { supabase } from '@/lib/supabase';
import {
  fetchCommuneYear,
  mintAvnIdForDvf,
  mintSourceListingIdForDvf,
  mapPropertyType,
  FRANCE_PRIORITY_COMMUNES,
} from '@/lib/data-sources/dvf';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Pick which commune to process this tick — rotates by day-of-year. */
function pickCommune() {
  const day = Math.floor(Date.now() / 86400_000);
  return FRANCE_PRIORITY_COMMUNES[day % FRANCE_PRIORITY_COMMUNES.length];
}

/** Pick which year — alternates 2023/2024 by day-of-year/2. */
function pickYear() {
  const day = Math.floor(Date.now() / 86400_000);
  return day % 2 === 0 ? 2024 : 2023;
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 503 });
  }

  const log = await startCronLog('dvf-ingest', '/api/cron/dvf-ingest');

  // Allow overrides via query params for manual testing
  const overrideInsee = req.nextUrl.searchParams.get('insee');
  const overrideDept = req.nextUrl.searchParams.get('dept');
  const overrideYear = req.nextUrl.searchParams.get('year');

  const commune = overrideInsee && overrideDept
    ? FRANCE_PRIORITY_COMMUNES.find((c) => c.insee === overrideInsee) ?? { insee: overrideInsee, dept: overrideDept, name: overrideInsee, nuts3: 'FR' }
    : pickCommune();
  const year = overrideYear ? parseInt(overrideYear, 10) : pickYear();

  let rows: Awaited<ReturnType<typeof fetchCommuneYear>> = [];
  try {
    rows = await fetchCommuneYear(commune.insee, commune.dept, year);
  } catch (e) {
    await finishCronLog(log, 'error', null, e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }

  if (rows.length === 0) {
    await finishCronLog(log, 'success', { commune: commune.insee, year, fetched: 0 });
    return NextResponse.json({ ok: true, commune: commune.name, year, fetched: 0 });
  }

  // Transform each DVF row into a properties_registry row.
  // De-dupe within batch by source_listing_id — DVF can have multiple CSV
  // rows that hash to the same parcel (rare but possible).
  const seenIds = new Set<string>();
  const registryRows: Array<Record<string, unknown>> = [];
  for (const row of rows) {
    const avn = mintAvnIdForDvf(row);
    const listingId = mintSourceListingIdForDvf(row);
    if (seenIds.has(listingId)) continue;
    seenIds.add(listingId);
    registryRows.push({
      avn_prop_id: avn,
      country: 'FR',
      region: commune.nuts3,
      municipality: row.nom_commune ?? commune.name,
      postal_code: row.code_postal ?? null,
      lat: row.latitude ?? null,
      lng: row.longitude ?? null,
      address: row.type_de_voie && row.voie ? `${row.type_de_voie} ${row.voie}` : null,
      category: 'EX',
      property_type: mapPropertyType(row.type_local),
      bedrooms: row.nombre_pieces_principales ?? null,
      built_m2: row.surface_reelle_bati ?? null,
      plot_m2: row.surface_terrain ?? null,
      tier: 'record',
      is_for_sale: false,
      source_portal: 'dvf-fr',
      source_listing_id: listingId,
      source_url: `https://app.dvf.etalab.gouv.fr/?lat=${row.latitude}&lng=${row.longitude}`,
      raw: { dvf: { ...row } },
      last_seen_at: new Date().toISOString(),
    });
  }

  // Upsert registry rows in chunks (smaller chunks for safety + better error surfacing)
  const CHUNK = 50;
  let registryUpserted = 0;
  const errors: string[] = [];
  for (let i = 0; i < registryRows.length; i += CHUNK) {
    try {
      const { error } = await supabase
        .from('properties_registry')
        .upsert(registryRows.slice(i, i + CHUNK), { onConflict: 'source_portal,source_listing_id', ignoreDuplicates: false });
      if (!error) {
        registryUpserted += Math.min(CHUNK, registryRows.length - i);
      } else if (errors.length < 3) {
        errors.push(`chunk ${i}: ${error.message}`);
      }
    } catch (e) {
      if (errors.length < 3) {
        errors.push(`chunk ${i}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  // Insert transaction rows — de-dupe by AVN to avoid duplicate transaction entries
  // for the same property/date (caused by repeated CSV rows for same parcel)
  const txSeen = new Set<string>();
  const txRows: Array<Record<string, unknown>> = [];
  for (const row of rows) {
    const avn = mintAvnIdForDvf(row);
    const txKey = `${avn}|${row.date_mutation}`;
    if (txSeen.has(txKey)) continue;
    txSeen.add(txKey);
    txRows.push({
      avn_prop_id: avn,
      transacted_at: row.date_mutation,
      price_eur: row.valeur_fonciere,
      price_per_m2_eur:
        row.surface_reelle_bati && row.surface_reelle_bati > 0
          ? Math.round((row.valeur_fonciere / row.surface_reelle_bati) * 100) / 100
          : null,
      source: 'dvf-fr',
      raw: row,
    });
  }

  let txInserted = 0;
  for (let i = 0; i < txRows.length; i += CHUNK) {
    try {
      const { error } = await supabase
        .from('property_transactions')
        .insert(txRows.slice(i, i + CHUNK));
      if (!error) {
        txInserted += Math.min(CHUNK, txRows.length - i);
      } else if (errors.length < 5) {
        errors.push(`tx chunk ${i}: ${error.message}`);
      }
    } catch (e) {
      if (errors.length < 5) {
        errors.push(`tx chunk ${i}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  const summary = {
    commune: commune.name,
    insee: commune.insee,
    year,
    transactions_fetched: rows.length,
    registry_upserted: registryUpserted,
    transactions_inserted: txInserted,
    errors: errors.slice(0, 5),
  };

  await finishCronLog(log, 'success', summary);
  return NextResponse.json({ ok: true, ...summary });
}
