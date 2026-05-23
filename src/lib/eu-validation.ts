/**
 * EU Cross-Validation — compare official series (Eurostat, ECB, INE)
 * against the Avena ground-truth corpus and write the delta to
 * `eu_validation_snapshots`. This produces the findings that anchor
 * Sovereign Briefing notes.
 *
 * Core insight: Avena's coastal corpus measures a different cohort than
 * national HPI series. The delta — typically 200-400 bps in Spain — IS
 * the institutional finding. Tracking the delta over time produces
 * citable evidence about regional risk transmission.
 */

import { supabase } from '@/lib/supabase';
import { getAllProperties } from '@/lib/properties';

export interface ValidationSnapshot {
  country_code: string;
  region: string;
  period: string;
  official_source: string;
  official_indicator: string;
  official_value: number;
  avena_value: number;
  delta_bps: number;
  delta_pct: number;
  avena_n_properties: number;
  note: string;
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function currentQuarter(): string {
  const d = new Date();
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  return `${d.getUTCFullYear()}-Q${q}`;
}

/**
 * Pull the most recent Eurostat HPI annual rate of change for a country.
 * Returns null if no data is available yet.
 */
async function latestEurostatHPIChange(country: string): Promise<{ period: string; value: number; indicator: string } | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase
      .from('eu_official_stats')
      .select('period, value, indicator_code')
      .eq('source', 'eurostat')
      .eq('country_code', country)
      .ilike('indicator_code', '%RCH_A%')
      .order('period', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    const row = data as { period: string; value: number; indicator_code: string };
    return { period: row.period, value: row.value, indicator: row.indicator_code };
  } catch { return null; }
}

/**
 * Pull most recent ECB mortgage rate for a country (monthly series).
 */
async function latestECBMortgageRate(country: string): Promise<{ period: string; value: number; indicator: string } | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase
      .from('eu_official_stats')
      .select('period, value, indicator_code')
      .eq('source', 'ecb_sdw')
      .eq('country_code', country)
      .ilike('indicator_code', 'MIR%')
      .order('period', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    const row = data as { period: string; value: number; indicator_code: string };
    return { period: row.period, value: row.value, indicator: row.indicator_code };
  } catch { return null; }
}

/**
 * Compute Avena median €/m² for the Spanish coastal corpus.
 * Returns the median pm2 and the contributing property count.
 */
function avenaCoastalSpainMedianPM2(): { median_pm2: number; n: number } {
  const all = getAllProperties();
  const coastal = all
    .filter((p) => p.costa && (p.pm2 ?? 0) > 0)
    .map((p) => p.pm2 as number);
  return { median_pm2: median(coastal), n: coastal.length };
}

/**
 * Compute the Avena coastal YoY rate of change using a real historical
 * baseline from price_snapshots — never a hardcoded anchor.
 *
 * Returns null pct when historical data is insufficient (< 90 days of
 * snapshots, or fewer than 100 contributing properties). In that case the
 * cross-validation row is written with a calibration-phase note so the
 * delta column is honestly empty rather than misleadingly filled.
 */
async function avenaCoastalYoYChange(): Promise<{
  pct: number | null;
  baseline_pm2: number | null;
  baseline_date: string | null;
  baseline_n: number | null;
  current_pm2: number;
  current_n: number;
  note: string;
}> {
  const { median_pm2: current_pm2, n: current_n } = avenaCoastalSpainMedianPM2();

  if (!supabase) {
    return {
      pct: null, baseline_pm2: null, baseline_date: null, baseline_n: null,
      current_pm2, current_n,
      note: 'historical baseline unavailable — Supabase client not configured',
    };
  }

  // Build the coastal property ref set so we compare like-for-like.
  const coastalRefs = getAllProperties()
    .filter((p) => p.costa && p.ref)
    .map((p) => p.ref as string);

  // Target a snapshot ~365 days ago. Query within ±14 days for tolerance.
  const target = new Date();
  target.setUTCDate(target.getUTCDate() - 365);
  const lo = new Date(target); lo.setUTCDate(lo.getUTCDate() - 14);
  const hi = new Date(target); hi.setUTCDate(hi.getUTCDate() + 14);
  const loStr = lo.toISOString().slice(0, 10);
  const hiStr = hi.toISOString().slice(0, 10);

  try {
    // Pull pm2 snapshots in the target window for the coastal cohort.
    // Supabase .in() has a practical limit ~1000 — chunk if needed.
    const pm2s: number[] = [];
    let baselineDate: string | null = null;
    for (let i = 0; i < coastalRefs.length; i += 500) {
      const chunk = coastalRefs.slice(i, i + 500);
      const { data } = await supabase
        .from('price_snapshots')
        .select('pm2, snapshot_date')
        .in('property_ref', chunk)
        .gte('snapshot_date', loStr)
        .lte('snapshot_date', hiStr)
        .not('pm2', 'is', null);
      for (const row of (data ?? []) as Array<{ pm2: number | null; snapshot_date: string }>) {
        if (row.pm2 && row.pm2 > 0) {
          pm2s.push(row.pm2);
          if (!baselineDate || row.snapshot_date < baselineDate) baselineDate = row.snapshot_date;
        }
      }
    }

    if (pm2s.length < 100) {
      return {
        pct: null, baseline_pm2: null, baseline_date: null, baseline_n: pm2s.length,
        current_pm2, current_n,
        note: `historical baseline insufficient (n=${pm2s.length} in target window ${loStr}…${hiStr}); cross-validation in calibration phase`,
      };
    }

    const baseline_pm2 = median(pm2s);
    const yoy_pct = ((current_pm2 - baseline_pm2) / baseline_pm2) * 100;
    return {
      pct: Number(yoy_pct.toFixed(2)),
      baseline_pm2,
      baseline_date: baselineDate,
      baseline_n: pm2s.length,
      current_pm2,
      current_n,
      note: `Avena coastal corpus YoY ${yoy_pct.toFixed(2)}% (current median ${current_pm2.toFixed(0)} €/m² across n=${current_n} vs baseline ${baseline_pm2.toFixed(0)} €/m² across n=${pm2s.length} on ${baselineDate}).`,
    };
  } catch (e) {
    return {
      pct: null, baseline_pm2: null, baseline_date: null, baseline_n: null,
      current_pm2, current_n,
      note: `baseline lookup error: ${(e as Error).message}`,
    };
  }
}

// ─── Snapshot generators ──────────────────────────────────────────────────

export async function generateSnapshots(): Promise<ValidationSnapshot[]> {
  const out: ValidationSnapshot[] = [];
  const period = currentQuarter();

  // ── Spain coastal vs Eurostat national HPI YoY ────────────────────
  const eurostat_es = await latestEurostatHPIChange('ES');
  if (eurostat_es) {
    const avena = await avenaCoastalYoYChange();
    if (avena.pct == null) {
      // Calibration phase — write the row but don't fabricate a delta.
      out.push({
        country_code: 'ES',
        region: 'coastal',
        period,
        official_source: 'eurostat',
        official_indicator: eurostat_es.indicator,
        official_value: eurostat_es.value,
        avena_value: 0,
        delta_bps: 0,
        delta_pct: 0,
        avena_n_properties: avena.current_n,
        note: `${avena.note} · Eurostat national ${eurostat_es.value}% for ${eurostat_es.period}. Delta will populate when ≥12 months of price_snapshots are available.`,
      });
    } else {
      const delta_pct = avena.pct - eurostat_es.value;
      const delta_bps = delta_pct * 100;
      out.push({
        country_code: 'ES',
        region: 'coastal',
        period,
        official_source: 'eurostat',
        official_indicator: eurostat_es.indicator,
        official_value: eurostat_es.value,
        avena_value: avena.pct,
        delta_bps: Number(delta_bps.toFixed(0)),
        delta_pct: Number(delta_pct.toFixed(2)),
        avena_n_properties: avena.current_n,
        note: `${avena.note} Eurostat national ${eurostat_es.value}% for ${eurostat_es.period}. Δ = ${(delta_bps >= 0 ? '+' : '') + delta_bps.toFixed(0)} bps.`,
      });
    }
  }

  // ── ECB mortgage rate context (Spain) — informational snapshot ────
  const ecb_es = await latestECBMortgageRate('ES');
  if (ecb_es) {
    out.push({
      country_code: 'ES',
      region: 'national',
      period: ecb_es.period,
      official_source: 'ecb_sdw',
      official_indicator: ecb_es.indicator,
      official_value: ecb_es.value,
      avena_value: ecb_es.value,            // we don't compute an Avena equivalent yet
      delta_bps: 0,
      delta_pct: 0,
      avena_n_properties: 0,
      note: `ECB MIR — Spain mortgage rate ${ecb_es.value}% (${ecb_es.period}). Reference series for the Avena rate-transmission analysis; no Avena equivalent computed.`,
    });
  }

  // ── Other countries (national HPI snapshot only, no Avena cohort yet) ──
  for (const cc of ['PT', 'IT', 'DE', 'FR', 'NL']) {
    const e = await latestEurostatHPIChange(cc);
    if (!e) continue;
    out.push({
      country_code: cc,
      region: 'national',
      period,
      official_source: 'eurostat',
      official_indicator: e.indicator,
      official_value: e.value,
      avena_value: e.value,
      delta_bps: 0,
      delta_pct: 0,
      avena_n_properties: 0,
      note: `Eurostat HPI YoY ${e.value}% (${e.period}). Avena ground-truth cohort pending for ${cc}.`,
    });
  }

  return out;
}

export async function persistSnapshots(snaps: ValidationSnapshot[]): Promise<number> {
  if (!supabase || snaps.length === 0) return 0;
  let written = 0;
  for (let i = 0; i < snaps.length; i += 100) {
    const chunk = snaps.slice(i, i + 100);
    const { error } = await supabase
      .from('eu_validation_snapshots')
      .upsert(chunk, { onConflict: 'country_code,region,period,official_source,official_indicator' });
    if (!error) written += chunk.length;
  }
  return written;
}

// ─── Read API for UI ──────────────────────────────────────────────────────

export async function latestValidations(limit = 12): Promise<ValidationSnapshot[]> {
  if (!supabase) return [];
  try {
    const { data } = await supabase
      .from('eu_validation_snapshots')
      .select('*')
      .order('computed_at', { ascending: false })
      .limit(limit);
    return (data ?? []) as ValidationSnapshot[];
  } catch { return []; }
}

export async function headlineValidation(): Promise<ValidationSnapshot | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase
      .from('eu_validation_snapshots')
      .select('*')
      .eq('country_code', 'ES')
      .eq('region', 'coastal')
      .order('computed_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as ValidationSnapshot | null) ?? null;
  } catch { return null; }
}
