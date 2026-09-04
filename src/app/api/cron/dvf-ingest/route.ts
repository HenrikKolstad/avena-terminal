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
import { chunkedWrite, mergeChunkWriteResults, failedRowIndices } from '@/lib/chunked-write';
import { NextRequest, NextResponse } from 'next/server';
import { startCronLog, finishCronLog, finishCronLogDerived } from '@/lib/cron-log';
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
  const db = supabase; // narrowed once, so the chunk writers below close over a non-null client

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
    await finishCronLogDerived(log, { commune: commune.insee, year, fetched: 0 });
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
  const registryWrite = await chunkedWrite(
    registryRows,
    CHUNK,
    (chunk) =>
      db
        .from('properties_registry')
        .upsert(chunk, { onConflict: 'source_portal,source_listing_id', ignoreDuplicates: false }),
    { label: 'registry' },
  );

  // Which parent rows actually reached properties_registry? A transaction
  // whose avn_prop_id has no registry row violates
  // property_transactions_avn_prop_id_fkey and takes its whole 50-row chunk
  // down with it, so this set is what keeps the child write honest.
  const failedRegistryIdx = failedRowIndices(registryWrite, CHUNK);
  const landedAvns = new Set<string>();
  registryRows.forEach((r, i) => {
    if (!failedRegistryIdx.has(i)) landedAvns.add(r.avn_prop_id as string);
  });

  // Insert transaction rows — de-dupe by AVN to avoid duplicate transaction entries
  // for the same property/date (caused by repeated CSV rows for same parcel)
  //
  // THE ORPHAN CLASS (found 2026-09-04, cause of every FK failure this cron
  // has ever had): the two dedupe keys disagree. The registry keys on
  // source_listing_id, whose seed omits code_postal; the AVN id puts the
  // postal code in its prefix. DVF publishes the same parcel twice with the
  // postal code blank on one copy, so ONE listing_id mints TWO avn ids — the
  // registry keeps the first, and the second transaction row references a
  // parent that does not exist.
  //
  // Measured on the real feed 2026-09-04: Hyeres 2024 12 orphans, Nice 2024
  // 12, Nice 2023 21; Cannes/Paris-8e/Vence 0 — which is exactly why this
  // cron failed on some communes and not others. 12 orphan rows poisoned 11
  // chunks and destroyed 550 good rows: a 46x amplification.
  //
  // Orphans are EXCLUDED and COUNTED, never silently dropped. Excluding them
  // is not data loss: the transaction is unreachable either way, and keeping
  // it costs the 49 valid rows sharing its chunk.
  const txSeen = new Set<string>();
  const txRows: Array<Record<string, unknown>> = [];
  const orphanAvns: string[] = [];
  for (const row of rows) {
    const avn = mintAvnIdForDvf(row);
    const txKey = `${avn}|${row.date_mutation}`;
    if (txSeen.has(txKey)) continue;
    txSeen.add(txKey);
    if (!landedAvns.has(avn)) {
      orphanAvns.push(avn);
      continue;
    }
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

  // Upsert, not insert. A plain insert with no unique constraint let every
  // rotation cycle re-append the same commune-year: measured 2026-09-04, the
  // table held 503,434 rows for 55,888 real transactions — 88.9% duplicates,
  // and getEngineTruth() publishes the raw row count as "Verified
  // transactions" on /engine.
  //
  // REQUIRES supabase/migrations/20260904_property_transactions_dedupe.sql,
  // which creates the unique index this conflict target names. Shipping this
  // line without that migration makes every write fail on a missing
  // constraint; shipping the migration without this line makes every re-ingest
  // a chunk of unique violations. They land together.
  const txWrite = await chunkedWrite(
    txRows,
    CHUNK,
    (chunk) =>
      db
        .from('property_transactions')
        .upsert(chunk, { onConflict: 'avn_prop_id,transacted_at', ignoreDuplicates: true }),
    { label: 'tx' },
  );

  const write = mergeChunkWriteResults([registryWrite, txWrite]);

  // `transactions_fetched` counts raw CSV rows; the writers see the DE-DUPED
  // set. Reporting only those two invited the reading that the difference was
  // lost rows — on 2026-09-03 that looked like 1,846 lost when the real loss
  // was 50. `transactions_deduped` is the middle term that makes the funnel
  // legible: fetched -> deduped -> written (+ lost).
  const summary = {
    commune: commune.name,
    insee: commune.insee,
    year,
    transactions_fetched: rows.length,
    // fetched -> deduped -> (orphaned) -> written + lost. `deduped` counts the
    // rows that survived de-duplication, BEFORE the orphan exclusion, so the
    // funnel still reconciles:
    //   deduped === orphaned + written + lost
    transactions_deduped: txRows.length + orphanAvns.length,
    transactions_orphaned: orphanAvns.length,
    // A capped sample, like `errors`. `transactions_orphaned` is the count.
    orphan_sample: orphanAvns.slice(0, 5),
    duplicate_rows_dropped: rows.length - (txRows.length + orphanAvns.length),
    registry_candidates: registryRows.length,
    registry_upserted: registryWrite.written,
    registry_lost: registryWrite.lost,
    transactions_inserted: txWrite.written,
    transactions_lost: txWrite.lost,
    rows_lost: write.lost,
    chunks_failed: write.chunks_failed,
    errors: write.errors,
    errors_total: write.errors_total,
  };

  await finishCronLogDerived(log, summary);
  return NextResponse.json({ ok: true, ...summary });
}
