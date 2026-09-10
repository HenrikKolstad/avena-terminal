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
import { chunkedWrite, emptyChunkWriteResult, splitOnUpsertKey, type ChunkWriteResult } from './chunked-write';
import { fetchWithRetry, shareBudget, type FetchBudget } from './resilient-fetch';

/**
 * Every adapter takes a wall-clock budget it may not overrun.
 *
 * The route runs these six sequentially under `maxDuration = 300`. Without a
 * per-adapter deadline, one hung upstream consumes the whole function budget
 * and silently kills every adapter behind it — which would make the retries
 * added on 2026-09-07 a net loss rather than a gain. See resilient-fetch.ts.
 */
export type IngestOptions = FetchBudget;

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
  /** Rows the database rejected. `rows_upserted` alone cannot distinguish
   *  "nothing to write" from "every write failed" — this is that difference. */
  rows_lost: number;
  write_chunks_failed: number;
  /** Rows excluded because one upsert key carried two DIFFERENT values.
   *  Picking a winner would publish one of two contradictory numbers as fact. */
  rows_duplicate_excluded: number;
  /** Rows dropped as exact repeats of a row already kept. Lossless, but a
   *  source that starts repeating itself is worth seeing. */
  rows_duplicate_collapsed: number;
  /** Observations whose period could not be decoded and were refused rather
   *  than guessed at. See ineQuarterPeriod. */
  rows_undecodable: number;
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
    dataset: 'prc_hpi_q',
    filter: 'purchase=DW_NEW&unit=RCH_A',
    name: 'House Price Index, new dwellings, annual rate of change (%)',
    unit: 'pct',
    freq: 'Q',
  },
  {
    dataset: 'prc_hpi_q',
    filter: 'purchase=DW_EXST&unit=RCH_A',
    name: 'House Price Index, existing dwellings, annual rate of change (%)',
    unit: 'pct',
    freq: 'Q',
  },
  {
    dataset: 'prc_hpi_a',
    filter: 'purchase=TOTAL&unit=RCH_A_AVG',
    name: 'House Price Index, annual rate of change, annual average (%)',
    unit: 'pct',
    freq: 'A',
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
async function fetchEurostatIndicator(ind: EurostatIndicator, budget?: IngestOptions): Promise<OfficialStatRow[]> {
  const sinceYear = new Date().getUTCFullYear() - 5;
  const geoParams = TARGET_COUNTRIES.map((c) => `geo=${c}`).join('&');
  const url = `${EUROSTAT_BASE}/${ind.dataset}?format=JSON&lang=EN&sinceTimePeriod=${sinceYear}&${ind.filter}&${geoParams}`;

  const res = await fetchWithRetry(url, {
    headers: { Accept: 'application/json' },
    label: `Eurostat ${ind.dataset}`,
    deadlineAt: budget?.deadlineAt,
  });
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

export async function ingestEurostat(budget?: IngestOptions): Promise<IngestResult> {
  const result: IngestResult = {
    source: 'eurostat',
    indicators_attempted: 0,
    rows_upserted: 0, rows_lost: 0, write_chunks_failed: 0,
    rows_duplicate_excluded: 0, rows_duplicate_collapsed: 0, rows_undecodable: 0,
    countries: new Set(),
    errors: [],
  };
  for (const [i, ind] of EUROSTAT_INDICATORS.entries()) {
    const slice = shareBudget(budget, EUROSTAT_INDICATORS.length - i);
    result.indicators_attempted++;
    try {
      const rows = await fetchEurostatIndicator(ind, slice);
      const w = await upsertRows(rows);
      result.rows_upserted += w.written;
      result.rows_lost += w.lost;
      result.rows_duplicate_excluded += w.duplicate_excluded;
      result.rows_duplicate_collapsed += w.duplicate_collapsed;
      result.write_chunks_failed += w.chunks_failed;
      for (const e of w.errors) if (result.errors.length < 8) result.errors.push(e);
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
    key: 'M.U2.B.A2C.AM.R.A.2250.EUR.N',
    name: 'Mortgage rate — euro area, new business, total maturity (%)',
    unit: 'pct',
    countryFromKey: () => 'EA20',
    freq: 'M',
  },
  // Mortgage rate — Spain (ES)
  {
    dataflow: 'MIR',
    key: 'M.ES.B.A2C.AM.R.A.2250.EUR.N',
    name: 'Mortgage rate — Spain, new business, total maturity (%)',
    unit: 'pct',
    countryFromKey: () => 'ES',
    freq: 'M',
  },
  // Mortgage rate — Germany (DE)
  {
    dataflow: 'MIR',
    key: 'M.DE.B.A2C.AM.R.A.2250.EUR.N',
    name: 'Mortgage rate — Germany, new business, total maturity (%)',
    unit: 'pct',
    countryFromKey: () => 'DE',
    freq: 'M',
  },
  // Mortgage rate — France (FR)
  {
    dataflow: 'MIR',
    key: 'M.FR.B.A2C.AM.R.A.2250.EUR.N',
    name: 'Mortgage rate — France, new business, total maturity (%)',
    unit: 'pct',
    countryFromKey: () => 'FR',
    freq: 'M',
  },
  // Mortgage rate — Italy (IT)
  {
    dataflow: 'MIR',
    key: 'M.IT.B.A2C.AM.R.A.2250.EUR.N',
    name: 'Mortgage rate — Italy, new business, total maturity (%)',
    unit: 'pct',
    countryFromKey: () => 'IT',
    freq: 'M',
  },
  // Mortgage rate — Portugal (PT)
  {
    dataflow: 'MIR',
    key: 'M.PT.B.A2C.AM.R.A.2250.EUR.N',
    name: 'Mortgage rate — Portugal, new business, total maturity (%)',
    unit: 'pct',
    countryFromKey: () => 'PT',
    freq: 'M',
  },
  // Mortgage rate — Netherlands (NL)
  {
    dataflow: 'MIR',
    key: 'M.NL.B.A2C.AM.R.A.2250.EUR.N',
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

async function fetchECBSeries(s: ECBSeries, budget?: IngestOptions): Promise<OfficialStatRow[]> {
  const startYear = new Date().getUTCFullYear() - 5;
  const url = `${ECB_BASE}/${s.dataflow}/${s.key}?format=jsondata&startPeriod=${startYear}`;
  const res = await fetchWithRetry(url, {
    headers: { Accept: 'application/json' },
    label: `ECB ${s.dataflow}/${s.key}`,
    deadlineAt: budget?.deadlineAt,
  });
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

export async function ingestECB(budget?: IngestOptions): Promise<IngestResult> {
  const result: IngestResult = {
    source: 'ecb_sdw',
    indicators_attempted: 0,
    rows_upserted: 0, rows_lost: 0, write_chunks_failed: 0,
    rows_duplicate_excluded: 0, rows_duplicate_collapsed: 0, rows_undecodable: 0,
    countries: new Set(),
    errors: [],
  };
  for (const [i, s] of ECB_SERIES.entries()) {
    const slice = shareBudget(budget, ECB_SERIES.length - i);
    result.indicators_attempted++;
    try {
      const rows = await fetchECBSeries(s, slice);
      const w = await upsertRows(rows);
      result.rows_upserted += w.written;
      result.rows_lost += w.lost;
      result.rows_duplicate_excluded += w.duplicate_excluded;
      result.rows_duplicate_collapsed += w.duplicate_collapsed;
      result.write_chunks_failed += w.chunks_failed;
      for (const e of w.errors) if (result.errors.length < 8) result.errors.push(e);
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
];

/**
 * INE's Tempus period codes for a QUARTERLY series.
 *
 * Verified against the live table 25171 on 2026-09-06 by reading the `Fecha`
 * each code carries, not from memory: FK_Periodo 19 stamps 2025-01-01,
 * 20 stamps 2025-04-01, 21 stamps 2025-07-01, 22 stamps 2025-10-01 (Madrid
 * local, which is why the raw epoch values read 23:00 the previous day in UTC
 * — do not "fix" that by deriving the quarter from the UTC date).
 *
 * The previous code assumed 1-4 and fell back to `Math.ceil(fk / 3)` for
 * anything else, which turned 19, 20 and 21 all into "Q7" and 22 into "Q8".
 * Three of every four quarters collapsed onto one key and the periods it
 * produced did not exist. The database rejecting those writes on the unique
 * constraint is the ONLY reason `eu_official_stats` does not contain
 * fabricated quarters today — so the fix is to decode the code correctly, and
 * emphatically NOT to de-duplicate the batch until it is accepted.
 */
const INE_QUARTER_BY_PERIOD_CODE: Record<number, number> = { 19: 1, 20: 2, 21: 3, 22: 4 };

/**
 * Decode one observation's period, or say why it cannot be decoded.
 *
 * There is no arithmetic fallback on purpose. An unrecognised code means we do
 * not know which quarter this value belongs to, and a guessed period is a
 * fabricated fact — the expensive kind of wrong. Refusing costs one row and
 * reports itself; guessing costs the table's credibility.
 */
export function ineQuarterPeriod(
  obs: { Anyo: number; FK_Periodo: number },
): { period: string } | { error: string } {
  const q = INE_QUARTER_BY_PERIOD_CODE[obs.FK_Periodo];
  if (!q) {
    return { error: `unmapped FK_Periodo ${obs.FK_Periodo} for a quarterly series` };
  }
  if (!Number.isInteger(obs.Anyo) || obs.Anyo < 1900 || obs.Anyo > 2200) {
    return { error: `implausible Anyo ${obs.Anyo}` };
  }
  return { period: `${obs.Anyo}-Q${q}` };
}

/** Rows we could build, plus the observations we refused to guess at. */
interface INEFetch {
  rows: OfficialStatRow[];
  undecodable: string[];
}

async function fetchINETable(table: string, name: string, unit: string, freq: 'Q', budget?: IngestOptions): Promise<INEFetch> {
  const url = `https://servicios.ine.es/wstempus/js/EN/DATOS_TABLA/${table}?nult=20`;
  const res = await fetchWithRetry(url, {
    headers: { Accept: 'application/json' },
    label: `INE ${table}`,
    deadlineAt: budget?.deadlineAt,
  });
  if (!res.ok) throw new Error(`INE table ${table} HTTP ${res.status}`);
  const data = await res.json() as Array<{
    Nombre: string;
    Data: Array<{ Anyo: number; FK_Periodo: number; Periodo?: string; Valor: number }>;
  }>;

  const out: OfficialStatRow[] = [];
  const undecodable: string[] = [];
  // INE returns multiple sub-series. Ingest every series row, prefixing the
  // indicator_code with the series name so we don't collide on UNIQUE. This
  // is more honest than guessing which row is the "national total" — every
  // series in IPV-25171 is a published national-level index by category.
  for (const series of data ?? []) {
    if (!series || !series.Nombre || !Array.isArray(series.Data)) continue;
    const seriesSlug = series.Nombre.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 60);
    for (const obs of series.Data) {
      if (obs.Valor == null) continue;
      // INE quarterly tables use FK_Periodo 1-4 for Q1-Q4; some monthly tables
      const decoded = ineQuarterPeriod(obs);
      if ('error' in decoded) {
        // Counted, never guessed — see ineQuarterPeriod.
        undecodable.push(`INE ${table}/${seriesSlug}: ${decoded.error}`);
        continue;
      }
      const period = decoded.period;
      out.push({
        source: 'ine_es',
        indicator_code: `ine_${table}_${seriesSlug}`,
        indicator_name: `${name} — ${series.Nombre}`,
        country_code: 'ES',
        period,
        period_freq: freq,
        value: obs.Valor,
        unit,
        source_url: url,
      });
    }
  }
  return { rows: out, undecodable };
}

export async function ingestINESpain(budget?: IngestOptions): Promise<IngestResult> {
  const result: IngestResult = {
    source: 'ine_es',
    indicators_attempted: 0,
    rows_upserted: 0, rows_lost: 0, write_chunks_failed: 0,
    rows_duplicate_excluded: 0, rows_duplicate_collapsed: 0, rows_undecodable: 0,
    countries: new Set(['ES']),
    errors: [],
  };
  for (const [i, s] of INE_SPAIN_SERIES.entries()) {
    const slice = shareBudget(budget, INE_SPAIN_SERIES.length - i);
    result.indicators_attempted++;
    try {
      const fetched = await fetchINETable(s.table, s.name, s.unit, s.freq, slice);
      // An observation whose period we refuse to guess at is a real loss and
      // is reported as one — it is not allowed to look like a quiet source.
      result.rows_undecodable += fetched.undecodable.length;
      for (const e of fetched.undecodable) if (result.errors.length < 8) result.errors.push(e);
      const w = await upsertRows(fetched.rows);
      result.rows_upserted += w.written;
      result.rows_lost += w.lost;
      result.rows_duplicate_excluded += w.duplicate_excluded;
      result.rows_duplicate_collapsed += w.duplicate_collapsed;
      result.write_chunks_failed += w.chunks_failed;
      for (const e of w.errors) if (result.errors.length < 8) result.errors.push(e);
    } catch (e) {
      result.errors.push(`INE ${s.table}: ${(e as Error).message}`);
    }
    await sleep(400);
  }
  return result;
}

// ─── CBS Netherlands adapter (OData) ──────────────────────────────────────
// Bestaande koopwoningen verkoopprijzen prijsindex — the Dutch existing-
// dwellings house price index, quarterly, national series.
//
// THIS ADAPTER RETURNED ZERO ROWS AND NO ERROR FOR MONTHS (O-82). Diagnosed
// 2026-09-10; it was not one bug but four, and only the last one is why
// nobody noticed the first three:
//
//  1. WRONG TABLE. It pointed at 83913NED, whose TableInfos reports
//     `Frequency: Stopgezet` — discontinued, last modified 2024-01-22,
//     ending 2023 Q4. The code comment named 83906NED, which is ALSO
//     discontinued (ends December 2023). Both successors of both are
//     85792NED: same regional shape, quarterly, base 2020=100 (which is
//     what `unit` already claimed), live through 2026 Q2.
//  2. WRONG FIELD NAME. `PrijsindexBestaandeKoopwoningen_1` does not exist
//     in the payload; the field is `PrijsindexVerkoopprijzen_1`. Every row
//     therefore hit `v == null` and was skipped — a complete silent zero.
//  3. `$orderby` IS SILENTLY IGNORED BY THIS ENDPOINT. Verified live:
//     `$orderby=Perioden desc` returns 1995KW01, 1995KW02, 1995KW03. So
//     `$top=80` took the OLDEST 80 periods. Even with (1) and (2) fixed the
//     adapter would have ingested 1995-2010 and never a current quarter,
//     while reporting a healthy row count.
//  4. NO REGION PIN. The table carries 21 RegioS values (national, four
//     landsdelen, twelve provinces...). Every row was stamped
//     `country_code: 'NL'` regardless, so regional indices would have been
//     published as the national series.
//
// (3) is the lesson worth carrying: this endpoint accepts and ignores query
// options rather than rejecting them. So the region filter below is NOT
// trusted — it is verified against the rows that come back. A server-side
// filter you cannot confirm applied is an assumption, not a constraint.

export interface CBSTable {
  table: string;
  name: string;
  unit: string;
  freq: 'Q' | 'M' | 'A';
  valueField: string;
  /** Dimension to pin, and the key selecting the national series. */
  regionField: string;
  regionKey: string;
}

export const CBS_TABLES: CBSTable[] = [
  {
    table: '85792NED',
    name: 'Netherlands — Existing dwellings price index (2020=100)',
    unit: 'index_2020=100',
    freq: 'Q',
    valueField: 'PrijsindexVerkoopprijzen_1',
    regionField: 'RegioS',
    // Fixed-width six-character key; the trailing spaces are part of it.
    regionKey: 'NL01  ',
  },
];

type CBSRow = Record<string, string | number | null>;

export function cbsUrl(t: CBSTable): string {
  // No $top and no $orderby. $orderby does not work here (see (3) above), so
  // $top would silently mean "the oldest N". The national series is ~157 rows
  // for this table, so we take all of it and let the parser decide.
  const filter = encodeURIComponent(`${t.regionField} eq '${t.regionKey}'`);
  return `https://opendata.cbs.nl/ODataApi/odata/${t.table}/TypedDataSet?$format=json&$filter=${filter}`;
}

/**
 * Exported and pure so `scripts/test-cbs-parse.ts` can assert the failure
 * modes directly. Every path that could yield zero usable rows from a
 * non-empty response THROWS instead of returning `[]` — that silence is the
 * whole reason this adapter went unnoticed.
 */
export function parseCbsTypedDataSet(
  body: unknown,
  t: CBSTable,
  url: string,
): OfficialStatRow[] {
  const value = (body as { value?: unknown } | null)?.value;
  if (!Array.isArray(value)) {
    throw new Error(`CBS ${t.table}: response has no 'value' array`);
  }
  if (value.length === 0) {
    throw new Error(`CBS ${t.table}: 'value' array is empty (filter ${t.regionField} eq '${t.regionKey}')`);
  }
  const rows = value as CBSRow[];

  // Address the value column BY NAME and fail loudly when it is absent. This
  // single check is what turns "months of zeros" into "one night of errors":
  // the wrong field name was defect (2) and produced no signal at all.
  if (!Object.prototype.hasOwnProperty.call(rows[0], t.valueField)) {
    throw new Error(
      `CBS ${t.table}: missing field '${t.valueField}' (saw: ${Object.keys(rows[0]).join('|')})`,
    );
  }

  // Verify the server actually APPLIED the filter. This endpoint ignores
  // query options it does not like without complaining, so an unverified
  // filter would let 20 regional series through stamped as national.
  const regions = new Set(rows.map((r) => String(r[t.regionField] ?? '')));
  if (regions.size !== 1 || !regions.has(t.regionKey)) {
    throw new Error(
      `CBS ${t.table}: region filter not applied — expected only '${t.regionKey}', got ${[...regions].map((r) => `'${r}'`).join(',')}`,
    );
  }

  const out: OfficialStatRow[] = [];
  for (const row of rows) {
    const periodRaw = row['Perioden'];
    if (typeof periodRaw !== 'string' || !periodRaw) continue;
    // CBS period format: '2026KW01' = 2026 Q1, '2026MM03' = March 2026, '2026JJ00' = annual
    let period: string | null = null;
    let freq: 'Q' | 'M' | 'A' = t.freq;
    const qMatch = periodRaw.match(/^(\d{4})KW(\d{2})$/);
    const mMatch = periodRaw.match(/^(\d{4})MM(\d{2})$/);
    const aMatch = periodRaw.match(/^(\d{4})JJ00$/);
    if (qMatch) { period = `${qMatch[1]}-Q${parseInt(qMatch[2], 10)}`; freq = 'Q'; }
    else if (mMatch) { period = `${mMatch[1]}-${mMatch[2]}`; freq = 'M'; }
    else if (aMatch) { period = aMatch[1]; freq = 'A'; }
    if (!period) continue;
    const v = row[t.valueField];
    if (v == null) continue;
    const n = Number(v);
    if (!Number.isFinite(n)) continue;
    out.push({
      source: 'cbs',
      indicator_code: `cbs_${t.table}_${t.valueField}`,
      indicator_name: t.name,
      country_code: 'NL',
      period,
      period_freq: freq,
      value: n,
      unit: t.unit,
      source_url: url,
    });
  }

  // A non-empty body that decodes to nothing is a layout change, not a quiet
  // day. Returning [] here is exactly what this adapter did for months.
  if (out.length === 0) {
    throw new Error(`CBS ${t.table}: ${rows.length} rows returned, none usable`);
  }
  return out;
}

async function fetchCBSTable(t: CBSTable, budget?: IngestOptions): Promise<OfficialStatRow[]> {
  const url = cbsUrl(t);
  const res = await fetchWithRetry(url, {
    headers: { Accept: 'application/json' },
    label: `CBS ${t.table}`,
    deadlineAt: budget?.deadlineAt,
  });
  if (!res.ok) throw new Error(`CBS ${t.table} HTTP ${res.status}`);
  return parseCbsTypedDataSet(await res.json(), t, url);
}

export async function ingestCBS(budget?: IngestOptions): Promise<IngestResult> {
  const result: IngestResult = { source: 'cbs', indicators_attempted: 0, rows_upserted: 0, rows_lost: 0, write_chunks_failed: 0,
    rows_duplicate_excluded: 0, rows_duplicate_collapsed: 0, rows_undecodable: 0, countries: new Set(['NL']), errors: [] };
  for (const [i, t] of CBS_TABLES.entries()) {
    const slice = shareBudget(budget, CBS_TABLES.length - i);
    result.indicators_attempted++;
    try {
      const rows = await fetchCBSTable(t, slice);
      const w = await upsertRows(rows);
      result.rows_upserted += w.written;
      result.rows_lost += w.lost;
      result.rows_duplicate_excluded += w.duplicate_excluded;
      result.rows_duplicate_collapsed += w.duplicate_collapsed;
      result.write_chunks_failed += w.chunks_failed;
      for (const e of w.errors) if (result.errors.length < 8) result.errors.push(e);
    } catch (e) {
      result.errors.push(`CBS ${t.table}: ${(e as Error).message}`);
    }
    await sleep(400);
  }
  return result;
}

// ─── ISTAT Italy adapter (SDMX-JSON) ──────────────────────────────────────
// ISTAT's SDMX REST returns the same SDMX-JSON shape as Eurostat, so we
// can reuse the parsing scaffold. Dataflow 729_1050 = HPI quarterly (IPAB).
// API: https://esploradati.istat.it/SDMXWS/rest/data/{dataflow}/{key}

interface ISTATSeries {
  dataflow: string;
  key: string;        // dot-separated dimension key, '.' = all
  name: string;
  unit: string;
  freq: 'Q' | 'M' | 'A';
}

const ISTAT_SERIES: ISTATSeries[] = [
  // House Price Index, quarterly, total (existing + new)
  { dataflow: '729_1050', key: 'Q.IT.IPAB._T._T._T.N.B.', name: 'Italy — House Price Index, total (Q1 2010=100)', unit: 'index_2010=100', freq: 'Q' },
];

async function fetchISTATSeries(s: ISTATSeries, budget?: IngestOptions): Promise<OfficialStatRow[]> {
  const startYear = new Date().getUTCFullYear() - 5;
  const url = `https://esploradati.istat.it/SDMXWS/rest/data/${s.dataflow}/${s.key}?format=jsondata&startPeriod=${startYear}`;
  const res = await fetchWithRetry(url, {
    headers: { Accept: 'application/vnd.sdmx.data+json;version=1.0.0-wd' },
    label: `ISTAT ${s.dataflow}/${s.key}`,
    deadlineAt: budget?.deadlineAt,
  });
  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(`ISTAT ${s.dataflow}/${s.key} HTTP ${res.status}`);
  }
  const data = await res.json() as {
    dataSets: Array<{ series: Record<string, { observations: Record<string, [number]> }> }>;
    structure: { dimensions: { observation: Array<{ id: string; values: Array<{ id: string }> }> } };
  };
  const obsDim = data.structure?.dimensions?.observation?.find((d) => d.id === 'TIME_PERIOD');
  if (!obsDim) return [];
  const periods = obsDim.values.map((v) => v.id);

  const out: OfficialStatRow[] = [];
  const series = data.dataSets?.[0]?.series ?? {};
  for (const obs of Object.values(series)) {
    for (const [idx, arr] of Object.entries(obs.observations)) {
      const period = periods[Number(idx)];
      const value = arr[0];
      if (value == null || period == null) continue;
      out.push({
        source: 'istat',
        indicator_code: `${s.dataflow}::${s.key}`,
        indicator_name: s.name,
        country_code: 'IT',
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

export async function ingestISTAT(budget?: IngestOptions): Promise<IngestResult> {
  const result: IngestResult = { source: 'istat', indicators_attempted: 0, rows_upserted: 0, rows_lost: 0, write_chunks_failed: 0,
    rows_duplicate_excluded: 0, rows_duplicate_collapsed: 0, rows_undecodable: 0, countries: new Set(['IT']), errors: [] };
  for (const [i, s] of ISTAT_SERIES.entries()) {
    const slice = shareBudget(budget, ISTAT_SERIES.length - i);
    result.indicators_attempted++;
    try {
      const rows = await fetchISTATSeries(s, slice);
      const w = await upsertRows(rows);
      result.rows_upserted += w.written;
      result.rows_lost += w.lost;
      result.rows_duplicate_excluded += w.duplicate_excluded;
      result.rows_duplicate_collapsed += w.duplicate_collapsed;
      result.write_chunks_failed += w.chunks_failed;
      for (const e of w.errors) if (result.errors.length < 8) result.errors.push(e);
    } catch (e) {
      result.errors.push(`ISTAT ${s.dataflow}/${s.key}: ${(e as Error).message}`);
    }
    await sleep(400);
  }
  return result;
}

// ─── BIS — Bank for International Settlements (SDMX CSV) ──────────────────
// Residential property prices (WS_SPP), quarterly, ~57 countries.
//
// The old endpoint (www.bis.org/statistics/pp_selected.csv) has 404'd for
// weeks — BIS moved its statistics onto the SDMX portal. We now read
// stats.bis.org's SDMX v1 REST CSV, which is a long/tidy table (one
// observation per line) rather than the wide period-by-country layout the
// previous parser assumed.
//
// The slice we keep, and why:
//   FREQ=Q            quarterly, the only frequency BIS publishes here
//   VALUE=N           nominal (R is the CPI-deflated real series)
//   UNIT_MEASURE=628  the index LEVEL (771 is the year-on-year % change)
// Cross-validated when this was written: ES 2026-Q1 index 144.2233 against
// 2025-Q1 127.8346 is +12.82%, which reproduces BIS's separately published
// YoY figure (771) of 12.8202 for the same cell. Two independent series
// agreeing is what tells us the dimension mapping is right.
const BIS_SPP_URL = 'https://stats.bis.org/api/v1/data/WS_SPP/all/all?format=csv';

/** BIS reference areas that are aggregates, not countries. `country_code`
 *  feeds a published DISTINCT-COUNTRY count, so storing "euro area" or
 *  "world" under it would be a false claim by construction, not a rounding
 *  error. (4T/5R are already excluded by the ISO-2-letter test; XM/XW are
 *  not, which is exactly why they need naming.) */
const BIS_NON_COUNTRY_AREAS = new Set(['XM', 'XW', '4T', '5R']);

/** Parse BIS WS_SPP SDMX CSV. Pure and exported so the layout contract and
 *  the zero-row guard can be tested without a network. Throws rather than
 *  returning empty: see the guard at the bottom. */
export function parseBisSppCsv(
  csv: string,
  url: string = BIS_SPP_URL,
): { rows: OfficialStatRow[]; undecodable: number } {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  // The old parser skipped ~3 preamble rows, so it required 4 lines. The SDMX
  // CSV has exactly ONE header row, and carrying that constant forward would
  // have wrongly rejected a short-but-valid response. The floor is a header
  // plus one observation; "enough lines, but none usable" is a different
  // failure and gets the more specific error at the bottom of this function.
  if (lines.length < 2) throw new Error(`BIS CSV too short (${lines.length} lines)`);

  // Address columns BY NAME. The previous parser located them positionally
  // and inferred country codes from `header.length === 2`, so a layout change
  // would have yielded zero rows with an empty errors[] — a dead adapter
  // indistinguishable from a dormant one.
  const headers = lines[0].split(',').map((h) => h.trim());
  const col = (name: string): number => {
    const i = headers.indexOf(name);
    if (i < 0) throw new Error(`BIS CSV missing column '${name}' (saw: ${headers.join('|')})`);
    return i;
  };
  const iFreq = col('FREQ');
  const iArea = col('REF_AREA');
  const iValueType = col('VALUE');
  const iUnit = col('UNIT_MEASURE');
  const iPeriod = col('TIME_PERIOD');
  const iObs = col('OBS_VALUE');
  const widest = Math.max(iFreq, iArea, iValueType, iUnit, iPeriod, iObs);

  const rows: OfficialStatRow[] = [];
  let undecodable = 0;
  const dataLines = lines.length - 1;

  for (let n = 1; n < lines.length; n++) {
    const f = lines[n].split(',');
    if (f.length <= widest) { undecodable++; continue; }
    if (f[iFreq].trim() !== 'Q') continue;
    if (f[iValueType].trim() !== 'N') continue;
    if (f[iUnit].trim() !== '628') continue;
    const cc = f[iArea].trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(cc) || BIS_NON_COUNTRY_AREAS.has(cc)) continue;
    const period = f[iPeriod].trim();
    if (!/^\d{4}-Q[1-4]$/.test(period)) { undecodable++; continue; }
    const raw = f[iObs].trim();
    if (!raw || raw === '..' || raw === 'NaN') continue;
    const value = Number(raw);
    if (!Number.isFinite(value)) { undecodable++; continue; }
    rows.push({
      source: 'bis',
      indicator_code: 'bis_rppi_nominal',
      indicator_name: 'BIS Residential Property Prices, nominal index',
      country_code: cc,
      period,
      period_freq: 'Q',
      value,
      unit: 'index',
      source_url: url,
    });
  }

  // The guard this adapter never had. A successful fetch that parses to
  // nothing is a BROKEN adapter, not an empty one, and it must not report
  // `rows_upserted: 0` with `errors: []` — that is the shape every serious
  // failure in this project has taken.
  if (rows.length === 0) {
    throw new Error(
      `BIS parsed 0 usable rows from ${dataLines} data lines ` +
        `(${undecodable} undecodable) — the layout or the Q/N/628 slice has moved`,
    );
  }

  return { rows, undecodable };
}

export async function ingestBIS(budget?: IngestOptions): Promise<IngestResult> {
  const result: IngestResult = { source: 'bis', indicators_attempted: 1, rows_upserted: 0, rows_lost: 0, write_chunks_failed: 0,
    rows_duplicate_excluded: 0, rows_duplicate_collapsed: 0, rows_undecodable: 0, countries: new Set(), errors: [] };
  const url = BIS_SPP_URL;
  try {
    const res = await fetchWithRetry(url, {
      headers: { Accept: 'text/csv' },
      label: 'BIS WS_SPP',
      deadlineAt: budget?.deadlineAt,
    });
    if (!res.ok) throw new Error(`BIS HTTP ${res.status}`);
    const parsed = parseBisSppCsv(await res.text(), url);
    result.rows_undecodable = parsed.undecodable;
    for (const r of parsed.rows) result.countries.add(r.country_code);

    const w = await upsertRows(parsed.rows);
    result.rows_upserted = w.written;
    result.rows_lost = w.lost;
    result.rows_duplicate_excluded = w.duplicate_excluded;
    result.rows_duplicate_collapsed = w.duplicate_collapsed;
    result.write_chunks_failed = w.chunks_failed;
    for (const e of w.errors) if (result.errors.length < 8) result.errors.push(e);
  } catch (e) {
    result.errors.push(`BIS: ${(e as Error).message}`);
  }
  return result;
}

// ─── Shared upsert ────────────────────────────────────────────────────────

/** The upsert's conflict key, written once so the guard and the write agree. */
const STATS_CONFLICT_KEY = 'source,indicator_code,country_code,period';
const statsKeyOf = (r: OfficialStatRow) =>
  `${r.source} ${r.indicator_code} ${r.country_code} ${r.period}`;
/** Everything the key does NOT cover. Two rows differing here genuinely conflict. */
const statsValueOf = (r: OfficialStatRow) =>
  `${r.value} ${r.unit} ${r.period_freq} ${r.indicator_name}`;

type StatsWriteResult = ChunkWriteResult & {
  duplicate_excluded: number;
  duplicate_collapsed: number;
};

async function upsertRows(rows: OfficialStatRow[]): Promise<StatsWriteResult> {
  const db = supabase;
  if (!db || rows.length === 0) {
    return { ...emptyChunkWriteResult(), duplicate_excluded: 0, duplicate_collapsed: 0 };
  }

  // Split BEFORE the database sees the batch. Postgres rejects an entire
  // ON CONFLICT statement that touches one key twice, so a single bad pair
  // used to destroy its whole 500-row chunk — that is how the INE feed lost
  // 4,480 rows a night, 100% of itself, while the run reported "errors: 2".
  const split = splitOnUpsertKey(rows, statsKeyOf, statsValueOf);

  const w = await chunkedWrite(
    split.rows,
    500,
    (chunk) =>
      db.from('eu_official_stats').upsert(chunk, { onConflict: STATS_CONFLICT_KEY }),
    { label: 'stats' },
  );

  // An excluded conflict is a loss and is reported as one. If it were left out
  // of `errors[]` the run could lose rows and still derive a green status —
  // the exact shape this repo keeps shipping.
  if (split.excluded_conflicting > 0 && w.errors.length < 5) {
    w.errors.push(
      `stats: ${split.excluded_conflicting} rows excluded across ` +
        `${split.conflicting_keys_total} conflicting upsert keys ` +
        `(e.g. ${split.conflicting_keys.slice(0, 2).join(', ')})`,
    );
  }

  return {
    ...w,
    duplicate_excluded: split.excluded_conflicting,
    duplicate_collapsed: split.collapsed_identical,
  };
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
