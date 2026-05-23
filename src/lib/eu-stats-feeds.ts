/**
 * EU Official Statistics — adapters for institutional-grade data sources.
 *
 * Three production sources wired up in this module:
 *   1. Eurostat (SDMX-JSON REST)        — house price indices, transactions, dwellings
 *   2. ECB Statistical Data Warehouse   — mortgage rates, lending volumes
 *   3. INE Spain (JSON-stat)             — notarial transactions, regional HPI
 *
 * All three are free, no API key required, and fully citable. Every value
 * we land in `eu_official_stats` carries the exact source URL for provenance.
 *
 * Eurostat SDMX-JSON spec:
 *   https://wikis.ec.europa.eu/display/EUROSTATHELP/API+-+detailed+guidelines+-+SDMX-JSON
 *
 * ECB SDW JSON:
 *   https://data.ecb.europa.eu/help/api/data
 *
 * INE Spain:
 *   https://www.ine.es/dyngs/DataLab/manual.html?cid=63
 */

import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────

export interface OfficialStatRow {
  source: string;
  indicator_code: string;
  indicator_name: string;
  country_code: string;
  period: string;
  period_freq: 'A' | 'Q' | 'M' | 'D';
  value: number;
  unit: string;
  source_url: string;
}

export interface IngestResult {
  source: string;
  indicators_attempted: number;
  rows_upserted: number;
  countries: Set<string>;
  errors: string[];
}

// ─── Indicator catalogue ──────────────────────────────────────────────────
// Curated list of institutional-relevant indicators per source. Each entry
// maps a dataflow + dimension key to a human label + frequency.

interface EurostatIndicator {
  dataset: string;         // dataset code, e.g. 'prc_hpi_q'
  filter: string;          // dimension filter, e.g. '?purchase=TOTAL&unit=I15_Q'
  name: string;
  unit: string;
  freq: 'A' | 'Q' | 'M';
}

const EUROSTAT_INDICATORS: EurostatIndicator[] = [
  {
    dataset: 'prc_hpi_q',
    filter: 'purchase=TOTAL&unit=I15_Q',
    name: 'House Price Index, total (2015=100)',
    unit: 'index_2015=100',
    freq: 'Q',
  },
  {
    dataset: 'prc_hpi_q',
    filter: 'purchase=DW_NEW&unit=I15_Q',
    name: 'House Price Index, new dwellings (2015=100)',
    unit: 'index_2015=100',
    freq: 'Q',
  },
  {
    dataset: 'prc_hpi_q',
    filter: 'purchase=DW_EXST&unit=I15_Q',
    name: 'House Price Index, existing dwellings (2015=100)',
    unit: 'index_2015=100',
    freq: 'Q',
  },
  {
    dataset: 'prc_hpi_q',
    filter: 'purchase=TOTAL&unit=RCH_A',
    name: 'House Price Index, annual rate of change (%)',
    unit: 'pct',
    freq: 'Q',
  },
  {
    dataset: 'prc_hpi_a',
    filter: 'purchase=TOTAL&unit=I15_A_AVG',
    name: 'House Price Index annual average (2015=100)',
    unit: 'index_2015=100',
    freq: 'A',
  },
  {
    dataset: 'prc_hpi_inq',
    filter: 'unit=I15_Q&purchase=TOTAL',
    name: 'House Price Index by dwelling type, indices',
    unit: 'index_2015=100',
    freq: 'Q',
  },
  {
    dataset: 'tipsho40',
    filter: '',
    name: 'House price index, deflated, annual rate of change',
    unit: 'pct',
    freq: 'Q',
  },
  {
    dataset: 'tipsho20',
    filter: '',
    name: 'House price index, nominal, annual rate of change',
    unit: 'pct',
    freq: 'Q',
  },
];

// Countries to scope to. EU27 + EA20 aggregates + top non-EU members for context.
const TARGET_COUNTRIES = [
  'EU27_2020', 'EA20',
  'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'EL', 'ES', 'FI', 'FR',
  'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO',
  'SE', 'SI', 'SK',
];

// Eurostat returns 'EL' for Greece; canonicalise to ISO 'GR' on insert.
function canonicaliseCountry(c: string): string {
  if (c === 'EL') return 'GR';
  if (c === 'UK') return 'GB';
  return c;
}

// ─── Eurostat SDMX-JSON adapter ───────────────────────────────────────────

const EUROSTAT_BASE = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data';

/**
 * Fetch one Eurostat indicator for all target countries, recent 5 years.
 * SDMX-JSON shape:
 *   {
 *     value: { "0": 100.0, "1": 101.2, ... },              // flattened index
 *     dimension: { geo: {...}, time: {...}, ... },
 *     size: [27, 1, 1, 20]                                 // dimension cardinalities
 *   }
 */
async function fetchEurostatIndicator(ind: EurostatIndicator): Promise<OfficialStatRow[]> {
  const sinceYear = new Date().getUTCFullYear() - 5;
  const geoParams = TARGET_COUNTRIES.map((c) => `geo=${c}`).join('&');
  const url = `${EUROSTAT_BASE}/${ind.dataset}?format=JSON&lang=EN&sinceTimePeriod=${sinceYear}&${ind.filter}&${geoParams}`;

  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Eurostat ${ind.dataset} HTTP ${res.status}`);
  const data = await res.json() as {
    value: Record<string, number>;
    dimension: Record<string, { category: { index: Record<string, number>; label?: Record<string, string> } }>;
    id: string[];
    size: number[];
  };

  const dims = data.id;
  const sizes = data.size;
  const geoDim = data.dimension['geo']?.category?.index ?? {};
  const timeDim = data.dimension['time']?.category?.index ?? {};

  const geoCodes = Object.entries(geoDim).sort((a, b) => a[1] - b[1]).map(([k]) => k);
  const timeCodes = Object.entries(timeDim).sort((a, b) => a[1] - b[1]).map(([k]) => k);

  // Compute multipliers for index decoding
  const mult = new Array(dims.length).fill(1);
  for (let i = dims.length - 2; i >= 0; i--) mult[i] = mult[i + 1] * sizes[i + 1];

  const out: OfficialStatRow[] = [];
  for (const [key, value] of Object.entries(data.value)) {
    if (value == null) continue;
    const idx = Number(key);
    const coords: Record<string, number> = {};
    let remainder = idx;
    for (let i = 0; i < dims.length; i++) {
      coords[dims[i]] = Math.floor(remainder / mult[i]);
      remainder = remainder % mult[i];
    }
    const country = geoCodes[coords['geo']];
    const period = timeCodes[coords['time']];
    if (!country || !period) continue;

    out.push({
      source: 'eurostat',
      indicator_code: `${ind.dataset}::${ind.filter}`,
      indicator_name: ind.name,
      country_code: canonicaliseCountry(country),
      period,
      period_freq: ind.freq,
      value,
      unit: ind.unit,
      source_url: url,
    });
  }
  return out;
}

export async function ingestEurostat(): Promise<IngestResult> {
  const result: IngestResult = {
    source: 'eurostat',
    indicators_attempted: 0,
    rows_upserted: 0,
    countries: new Set(),
    errors: [],
  };
  for (const ind of EUROSTAT_INDICATORS) {
    result.indicators_attempted++;
    try {
      const rows = await fetchEurostatIndicator(ind);
      const written = await upsertRows(rows);
      result.rows_upserted += written;
      for (const r of rows) result.countries.add(r.country_code);
    } catch (e) {
      result.errors.push(`${ind.dataset}: ${(e as Error).message}`);
    }
    // Be polite to Eurostat
    await sleep(400);
  }
  return result;
}

// ─── ECB Statistical Data Warehouse adapter ───────────────────────────────

const ECB_BASE = 'https://data-api.ecb.europa.eu/service/data';

interface ECBSeries {
  dataflow: string;       // e.g. 'MIR' (MFI Interest Rates)
  key: string;            // dot-separated dimension key
  name: string;
  unit: string;
  countryFromKey: (key: string) => string;
  freq: 'M' | 'Q' | 'A';
}

const ECB_SERIES: ECBSeries[] = [
  // Mortgage rates — new business, loans for house purchase, total maturity, euro area aggregate
  {
    dataflow: 'MIR',
    key: 'M.U2.B.A2C.A.R.A.2240.EUR.N',
    name: 'Mortgage rate — euro area, new business, total maturity (%)',
    unit: 'pct',
    countryFromKey: () => 'EA20',
    freq: 'M',
  },
  // Mortgage rate — Spain (ES)
  {
    dataflow: 'MIR',
    key: 'M.ES.B.A2C.A.R.A.2240.EUR.N',
    name: 'Mortgage rate — Spain, new business, total maturity (%)',
    unit: 'pct',
    countryFromKey: () => 'ES',
    freq: 'M',
  },
  // Mortgage rate — Germany (DE)
  {
    dataflow: 'MIR',
    key: 'M.DE.B.A2C.A.R.A.2240.EUR.N',
    name: 'Mortgage rate — Germany, new business, total maturity (%)',
    unit: 'pct',
    countryFromKey: () => 'DE',
    freq: 'M',
  },
  // Mortgage rate — France (FR)
  {
    dataflow: 'MIR',
    key: 'M.FR.B.A2C.A.R.A.2240.EUR.N',
    name: 'Mortgage rate — France, new business, total maturity (%)',
    unit: 'pct',
    countryFromKey: () => 'FR',
    freq: 'M',
  },
  // Mortgage rate — Italy (IT)
  {
    dataflow: 'MIR',
    key: 'M.IT.B.A2C.A.R.A.2240.EUR.N',
    name: 'Mortgage rate — Italy, new business, total maturity (%)',
    unit: 'pct',
    countryFromKey: () => 'IT',
    freq: 'M',
  },
  // Mortgage rate — Portugal (PT)
  {
    dataflow: 'MIR',
    key: 'M.PT.B.A2C.A.R.A.2240.EUR.N',
    name: 'Mortgage rate — Portugal, new business, total maturity (%)',
    unit: 'pct',
    countryFromKey: () => 'PT',
    freq: 'M',
  },
  // Mortgage rate — Netherlands (NL)
  {
    dataflow: 'MIR',
    key: 'M.NL.B.A2C.A.R.A.2240.EUR.N',
    name: 'Mortgage rate — Netherlands, new business, total maturity (%)',
    unit: 'pct',
    countryFromKey: () => 'NL',
    freq: 'M',
  },
  // Euribor 3M — daily reference rate
  {
    dataflow: 'FM',
    key: 'M.U2.EUR.RT.MM.EURIBOR3MD_.HSTA',
    name: 'Euribor 3M — monthly average (%)',
    unit: 'pct',
    countryFromKey: () => 'EA20',
    freq: 'M',
  },
];

async function fetchECBSeries(s: ECBSeries): Promise<OfficialStatRow[]> {
  const startYear = new Date().getUTCFullYear() - 5;
  const url = `${ECB_BASE}/${s.dataflow}/${s.key}?format=jsondata&startPeriod=${startYear}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    // ECB returns 404 for missing series — non-fatal
    if (res.status === 404) return [];
    throw new Error(`ECB ${s.dataflow}/${s.key} HTTP ${res.status}`);
  }
  const data = await res.json() as {
    dataSets: Array<{ series: Record<string, { observations: Record<string, [number]> }> }>;
    structure: { dimensions: { observation: Array<{ id: string; values: Array<{ id: string }> }> } };
  };

  const obsDim = data.structure.dimensions.observation.find((d) => d.id === 'TIME_PERIOD');
  if (!obsDim) return [];
  const periods = obsDim.values.map((v) => v.id);

  const out: OfficialStatRow[] = [];
  const series = data.dataSets[0]?.series ?? {};
  for (const obs of Object.values(series)) {
    for (const [idx, arr] of Object.entries(obs.observations)) {
      const period = periods[Number(idx)];
      const value = arr[0];
      if (value == null || period == null) continue;
      out.push({
        source: 'ecb_sdw',
        indicator_code: `${s.dataflow}::${s.key}`,
        indicator_name: s.name,
        country_code: s.countryFromKey(s.key),
        period,
        period_freq: s.freq,
        value,
        unit: s.unit,
        source_url: url,
      });
    }
  }
  return out;
}

export async function ingestECB(): Promise<IngestResult> {
  const result: IngestResult = {
    source: 'ecb_sdw',
    indicators_attempted: 0,
    rows_upserted: 0,
    countries: new Set(),
    errors: [],
  };
  for (const s of ECB_SERIES) {
    result.indicators_attempted++;
    try {
      const rows = await fetchECBSeries(s);
      const written = await upsertRows(rows);
      result.rows_upserted += written;
      for (const r of rows) result.countries.add(r.country_code);
    } catch (e) {
      result.errors.push(`${s.dataflow}/${s.key}: ${(e as Error).message}`);
    }
    await sleep(300);
  }
  return result;
}

// ─── INE Spain adapter (JSON-stat) ────────────────────────────────────────
// INE publishes the Spanish HPI (IPV) quarterly: dataset 25171
// API: https://servicios.ine.es/wstempus/js/EN/DATOS_TABLA/25171

const INE_SPAIN_SERIES = [
  {
    table: '25171',
    name: 'Spain — National House Price Index (IPV), total dwellings (2015=100)',
    unit: 'index_2015=100',
    freq: 'Q' as const,
  },
  {
    table: '25172',
    name: 'Spain — House Price Index, new dwellings (2015=100)',
    unit: 'index_2015=100',
    freq: 'Q' as const,
  },
  {
    table: '25173',
    name: 'Spain — House Price Index, existing dwellings (2015=100)',
    unit: 'index_2015=100',
    freq: 'Q' as const,
  },
];

async function fetchINETable(table: string, name: string, unit: string, freq: 'Q'): Promise<OfficialStatRow[]> {
  const url = `https://servicios.ine.es/wstempus/js/EN/DATOS_TABLA/${table}?nult=20`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`INE table ${table} HTTP ${res.status}`);
  const data = await res.json() as Array<{
    Nombre: string;
    Data: Array<{ Anyo: number; FK_Periodo: number; Periodo?: string; Valor: number }>;
  }>;

  const out: OfficialStatRow[] = [];
  for (const series of data) {
    // National total only — first series row in INE 25171 is typically the headline
    if (!series.Nombre || !series.Nombre.toLowerCase().includes('national total')) continue;
    for (const obs of series.Data) {
      if (obs.Valor == null) continue;
      const quarter = obs.FK_Periodo >= 1 && obs.FK_Periodo <= 4 ? obs.FK_Periodo : Math.ceil(obs.FK_Periodo / 3);
      const period = `${obs.Anyo}-Q${quarter}`;
      out.push({
        source: 'ine_es',
        indicator_code: `ine_table_${table}`,
        indicator_name: name,
        country_code: 'ES',
        period,
        period_freq: freq,
        value: obs.Valor,
        unit,
        source_url: url,
      });
    }
    break; // first matching national series is enough
  }
  return out;
}

export async function ingestINESpain(): Promise<IngestResult> {
  const result: IngestResult = {
    source: 'ine_es',
    indicators_attempted: 0,
    rows_upserted: 0,
    countries: new Set(['ES']),
    errors: [],
  };
  for (const s of INE_SPAIN_SERIES) {
    result.indicators_attempted++;
    try {
      const rows = await fetchINETable(s.table, s.name, s.unit, s.freq);
      const written = await upsertRows(rows);
      result.rows_upserted += written;
    } catch (e) {
      result.errors.push(`INE ${s.table}: ${(e as Error).message}`);
    }
    await sleep(400);
  }
  return result;
}

// ─── Shared upsert ────────────────────────────────────────────────────────

async function upsertRows(rows: OfficialStatRow[]): Promise<number> {
  if (!supabase || rows.length === 0) return 0;
  // Chunk to stay under Supabase batch limits
  let written = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await supabase
      .from('eu_official_stats')
      .upsert(chunk, { onConflict: 'source,indicator_code,country_code,period' });
    if (!error) written += chunk.length;
  }
  return written;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Read API for UI ──────────────────────────────────────────────────────

export interface StatsCoverageSummary {
  total_rows: number;
  by_source: Record<string, number>;
  by_country: Record<string, number>;
  countries_covered: number;
  latest_period: string | null;
  last_run_at: string | null;
}

export async function statsCoverage(): Promise<StatsCoverageSummary> {
  if (!supabase) {
    return { total_rows: 0, by_source: {}, by_country: {}, countries_covered: 0, latest_period: null, last_run_at: null };
  }
  try {
    const [{ count }, { data: srcRows }, { data: latestRun }] = await Promise.all([
      supabase.from('eu_official_stats').select('*', { count: 'exact', head: true }),
      supabase.from('eu_official_stats').select('source, country_code, period').limit(20000),
      supabase.from('eu_stats_ingest_runs').select('finished_at').order('started_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    const by_source: Record<string, number> = {};
    const by_country: Record<string, number> = {};
    let latest_period: string | null = null;
    for (const r of (srcRows ?? []) as Array<{ source: string; country_code: string; period: string }>) {
      by_source[r.source] = (by_source[r.source] ?? 0) + 1;
      by_country[r.country_code] = (by_country[r.country_code] ?? 0) + 1;
      if (!latest_period || r.period > latest_period) latest_period = r.period;
    }
    return {
      total_rows: count ?? 0,
      by_source,
      by_country,
      countries_covered: Object.keys(by_country).length,
      latest_period,
      last_run_at: (latestRun as { finished_at?: string } | null)?.finished_at ?? null,
    };
  } catch {
    return { total_rows: 0, by_source: {}, by_country: {}, countries_covered: 0, latest_period: null, last_run_at: null };
  }
}

export async function recentStatRows(limit = 50): Promise<OfficialStatRow[]> {
  if (!supabase) return [];
  try {
    const { data } = await supabase
      .from('eu_official_stats')
      .select('*')
      .order('fetched_at', { ascending: false })
      .limit(limit);
    return (data ?? []) as OfficialStatRow[];
  } catch {
    return [];
  }
}
