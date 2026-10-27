/**
 * Official new-housing supply for the provinces Avena covers.
 *
 * Two keyless files, both required before a layer is published:
 *
 *   - Ministerio de Vivienda y Agenda Urbana, dataset VDP005_01. Estimated
 *     monthly counts of free-market dwellings started (viviendas libres
 *     iniciadas) and finished (viviendas libres terminadas), by province.
 *     The ministry compiles the series from the architects' colleges and from
 *     the Ministerio de Transportes visados de dirección de obra, then
 *     imputes blank fields. It is not the raw visa count and not the raw
 *     certificado de fin de obra count. CC BY 4.0.
 *   - INE, Estadística de transmisiones de derechos de la propiedad, table
 *     6150. Registered sales of vivienda nueva, by province and month. The
 *     "vivienda nueva" row is every regime. It is not the "vivienda libre"
 *     row. Reuse with attribution ("Fuente: INE").
 *
 * A blank cell stays blank. A zero that the file actually prints stays zero.
 * A trailing-twelve-month total is the sum of twelve published months. A
 * missing month is not filled in.
 *
 * The ministry notarial transaction file (VDP003_01) and the statistical
 * bulletin of raw visas are assessed and, when they cannot be published
 * without choosing a number, recorded as omissions. Network I/O lives in
 * scripts/ingest-es-supply.ts. Nothing here fetches.
 */

import {
  ES_PROVINCE_DEFS,
  corpusProvinces,
  fold,
  provinceFromLocation,
  type ProvinceDef,
} from './ine-es';

export { ES_PROVINCE_DEFS, corpusProvinces, provinceFromLocation };

export const VDP005_DATASET_ID = 'VDP005_01';
export const VDP005_URL = 'https://cdn.mivau.gob.es/portal-web-mivau/Datos_MIVAU/CSV/VDP005_01.csv';
export const VDP005_CATALOG_URL =
  'https://datos.gob.es/es/catalogo/e05233601-numero-de-viviendas-iniciadas-y-terminadas-por-regimen-de-proteccion';
export const VDP005_README_URL = 'https://cdn.mivau.gob.es/portal-web-mivau/Datos_MIVAU/Info/Readme_VDP005_01.pdf';

export const VDP003_DATASET_ID = 'VDP003_01';
export const VDP003_URL = 'https://cdn.mivau.gob.es/portal-web-mivau/Datos_MIVAU/CSV/VDP003_01.csv';
export const VDP003_CATALOG_URL = 'https://datos.gob.es/es/catalogo/e05233601-transacciones-inmobiliarias-de-vivienda';

export const INE_SALES_TABLE_ID = '6150';
export const INE_SALES_TABLE_URL = 'https://www.ine.es/jaxiT3/Tabla.htm?t=6150';
export const INE_SALES_CSV_URL = 'https://www.ine.es/jaxiT3/files/t/csv_bdsc/6150.csv';

export const VISADOS_BULLETIN_URL = 'https://apps.fomento.gob.es/Boletinonline/?nivel=2&orden=09000000';
export const VISADOS_MINISTRY_URL =
  'https://www.transportes.gob.es/informacion-para-el-ciudadano/informacion-estadistica/construccion/obras-en-edificacion-visados-de-direccion-de-obra-de-los-colegios-de-arquitectos-tecnicos';

const VDP005_COLUMNS = [
  'CODAUTO', 'COMUNIDAD_AUTONOMA', 'CPRO', 'PROVINCIA', 'AÑO', 'MES',
  'TIPO_VIVIENDA', 'ESTADO', 'VALOR',
] as const;

const INE_SALES_COLUMNS = [
  'Total Nacional', 'Comunidades y Ciudades Autónomas', 'Provincias',
  'Régimen y estado', 'Periodo', 'Total',
] as const;

const VDP003_COLUMNS = [
  'CODCOMUNIDAD', 'COMUNIDAD', 'CODPROVINCIA', 'PROVINCIA', 'Tipo', 'regimen',
  'AÑO', 'Trimestre', 'Numero_Transacciones', 'Valor_Transacciones',
] as const;

/** Province codes 01–52: the fifty provinces plus Ceuta and Melilla. */
export const ES_CPRO_CODES: string[] = Array.from({ length: 52 }, (_, i) => String(i + 1).padStart(2, '0'));

const WITHHELD = new Set(['', '..', '.', '-', '…']);

export interface SupplyOmission {
  source: string;
  url: string | null;
  ingested: false;
  reason: string;
}

export interface SupplyCount {
  available: true;
  value: number;
  unit: 'dwellings';
  /** YYYY-MM, or YYYY-MM/YYYY-MM for a trailing twelve-month sum. */
  period: string;
  months: 1 | 12;
  series_id: string;
  source: 'mivau_vdp005' | 'ine_es';
  source_name: string;
  source_url: string;
  /** True when Avena added months, or summed provinces. The file did not publish this total. */
  derived: boolean;
  /** YYYY-MM-DD from the file's Last-Modified header. Null when the server sent none. */
  file_modified: string | null;
  retrieved_at: string;
}

export interface SupplyGap {
  available: false;
  period: string | null;
  months: 1 | 12;
  derived: boolean;
  reason: string;
}

export type SupplySlot = SupplyCount | SupplyGap;

export interface ProvinceSupplyOfficial {
  name: string;
  slug: string;
  key: string;
  cpro: string;
  nuts3: string;
  ccaa: string;
  starts_latest: SupplyCount;
  starts_trailing_12m: SupplyCount;
  completions_latest: SupplyCount;
  completions_trailing_12m: SupplyCount;
  ine_new_sales_latest: SupplyCount;
  ine_new_sales_trailing_12m: SupplyCount;
}

export interface SpainSupplyLayer {
  status: 'ready';
  generated_at: string;
  retrieved_at: string;
  provinces_in_corpus: string[];
  coverage_note: string;
  caveats: string[];
  omissions: SupplyOmission[];
  sources: {
    mivau_supply: {
      publisher: string;
      dataset_id: string;
      url: string;
      catalog_url: string;
      readme_url: string;
      licence: string;
      file_modified: string | null;
      file_modified_note: string;
      latest_period: string;
      starts_definition: string;
      completions_definition: string;
      trailing_12m_definition: string;
    };
    ine_new_sales: {
      publisher: string;
      table_id: string;
      table_url: string;
      csv_url: string;
      licence_note: string;
      file_modified: string | null;
      file_modified_note: string;
      latest_period: string;
      definition: string;
      trailing_12m_definition: string;
    };
  };
  national: {
    starts_latest: SupplySlot;
    starts_trailing_12m: SupplySlot;
    completions_latest: SupplySlot;
    completions_trailing_12m: SupplySlot;
    ine_new_sales_latest: SupplyCount;
    ine_new_sales_trailing_12m: SupplyCount;
  };
  provinces: ProvinceSupplyOfficial[];
}

export const STARTS_DEFINITION =
  'Estimated number of free-market dwellings started in the month (viviendas libres iniciadas). ' +
  'Ministerio de Vivienda y Agenda Urbana dataset VDP005_01. The ministry compiles it from the Consejo Superior de Colegios de Arquitectos de España and from the Ministerio de Transportes y Movilidad Sostenible statistics of visados de dirección de obra, and imputes blank fields. ' +
  'It is not the raw count of visas.';

export const COMPLETIONS_DEFINITION =
  'Estimated number of free-market dwellings finished in the month (viviendas libres terminadas), from the same file. ' +
  'It is the ministry estimate of completions. It is not the raw count of certificados de fin de obra.';

export const TRAILING_12M_DEFINITION =
  'Sum of the twelve published monthly counts ending at the latest month in that file. Not seasonally adjusted. A month that is missing or blank is not filled with zero.';

export const INE_SALES_DEFINITION =
  'Registered sales of new dwellings (compraventa de vivienda nueva) in the month. INE table 6150, Estadística de transmisiones de derechos de la propiedad. ' +
  'The vivienda nueva row covers new dwellings of every regime. It is not the vivienda libre row. ' +
  'INE compiles the statistic from the Colegio de Registradores de la Propiedad.';

export const FILE_MODIFIED_NOTE =
  'file_modified is the Last-Modified day of the downloaded file, in UTC. It is the timestamp the file server sent. It is not a date printed in the statistical bulletin. When the server sends no Last-Modified header, file_modified is null.';

export const COVERAGE_NOTE =
  'Starts and completions are estimated free-market dwellings for the whole province. ' +
  'INE sales are registered sales of new dwellings for the whole province, every regime. ' +
  'Avena listings are the coastal new-build stock in the current corpus. ' +
  'Avena price moves are verified asking-price changes in the published moves file. ' +
  'These are four different measurements, and none of them is limited to the coast except the Avena stock. ' +
  'The Spain line for ministry starts and completions is a sum of province codes 01 to 52 only when every one of those cells is a published number. The file does not print that total.';

export const SUPPLY_CAVEATS = [
  'Avena\'s listing count is how many new-build listings in the current corpus sit in the province. It is a stock of coastal listings, not homes started, finished or sold.',
  'Avena\'s price moves are verified asking-price changes in the published moves file. A move is not a registered sale. A delisting is not a sale.',
  'Ministry starts are estimated free-market dwellings started, compiled from visados de dirección de obra and from the architects\' colleges, after imputation. They are not the raw visa count. Completions in the same file are not the raw certificado de fin de obra count.',
  'Both ministry series cover the whole province, inland as well as coast, and free-market dwellings only.',
  'INE vivienda nueva is registered sales of new dwellings in the whole province. The row is not limited to free-market housing. The CSV does not mark a month as provisional, and recent months are often revised. This file does not guess which months will change.',
  'A trailing twelve-month figure adds the twelve published months. It is not seasonally adjusted, and it is not an official annual total unless the source itself published one.',
  'No comparison on this page is a statistic published by INE or the ministry.',
];

const VISADOS_OMISSION: SupplyOmission = {
  source: 'Ministerio de Transportes y Movilidad Sostenible, visados de dirección de obra and certificados de fin de obra',
  url: VISADOS_BULLETIN_URL,
  ingested: false,
  reason:
    'The statistical bulletin publishes provincial tables for visados de dirección de obra nueva (dwellings and buildings) and for certificados de fin de obra as HTML, not as one keyless CSV this job can parse. ' +
    'No raw visa count and no raw completion-certificate count was ingested. ' +
    'The starts and completions in this file are the housing ministry\'s estimated free-market series, which it says is compiled from those visas and from the architects\' colleges.',
};

const NOTARY_OMISSION: SupplyOmission = {
  source: 'Consejo General del Notariado',
  url: null,
  ingested: false,
  reason: 'No keyless CSV or JSON endpoint is read by this job. A direct notarial series is not in this file. The ministry file that republishes notarial transactions is assessed separately.',
};

export function parseSemicolonTable(text: string, expected: readonly string[], label: string): Record<string, string>[] {
  const src = text.replace(/^\uFEFF/, '');
  const table: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ';') { row.push(field); field = ''; }
    else if (c === '\n') {
      row.push(field);
      field = '';
      if (row.some((cell) => cell.trim() !== '')) table.push(row);
      row = [];
    } else if (c !== '\r') field += c;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.trim() !== '')) table.push(row);
  }
  if (table.length < 2) throw new Error(`${label}: CSV has no data rows`);
  const header = table[0].map((h) => h.trim());
  if (header.length !== expected.length || expected.some((col, i) => header[i] !== col)) {
    throw new Error(`${label}: header is "${header.join('|')}", expected "${expected.join('|')}"`);
  }
  return table.slice(1).map((cells, index) => {
    if (cells.length !== expected.length) {
      throw new Error(`${label}: row ${index + 2} has ${cells.length} cells, expected ${expected.length}`);
    }
    const out: Record<string, string> = {};
    header.forEach((h, i) => { out[h] = (cells[i] ?? '').trim(); });
    return out;
  });
}

/**
 * A count the file printed. "1.132" is 1132 (Spanish thousands separator).
 * "2966" is 2966 (no separator). A decimal is refused.
 */
export function parseEsInteger(raw: string, label: string): number {
  const t = raw.trim();
  const grouped = /^\d{1,3}(\.\d{3})+$/.test(t);
  const plain = /^\d+$/.test(t);
  if (!grouped && !plain) {
    throw new Error(`${label}: not a whole dwelling count: "${raw}"`);
  }
  const n = Number((grouped ? t.replace(/\./g, '') : t));
  if (!Number.isInteger(n) || n < 0) throw new Error(`${label}: count ${raw} is not a non-negative integer`);
  return n;
}

/** Last-Modified header to a UTC day. Null when the server sent nothing usable. */
export function fileModifiedDay(header: string | null | undefined): string | null {
  if (!header) return null;
  const t = Date.parse(header.trim());
  if (!Number.isFinite(t)) return null;
  return new Date(t).toISOString().slice(0, 10);
}

export function monthPeriod(year: number, month: number): string {
  if (!Number.isInteger(year) || year < 1900 || year > 2200) throw new Error(`implausible year ${year}`);
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error(`implausible month ${month}`);
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function shiftMonth(period: string, delta: number): string {
  const m = /^(\d{4})-(\d{2})$/.exec(period);
  if (!m) throw new Error(`period not YYYY-MM: "${period}"`);
  const index = Number(m[1]) * 12 + (Number(m[2]) - 1) + delta;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return monthPeriod(year, month);
}

export function monthsEnding(end: string, count: number): string[] {
  if (!Number.isInteger(count) || count < 1) throw new Error(`bad window ${count}`);
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) out.push(shiftMonth(end, -i));
  return out;
}

function padCpro(raw: string, label: string): string {
  const t = raw.trim();
  if (!/^\d{1,2}$/.test(t)) throw new Error(`${label}: CPRO is not a province code: "${raw}"`);
  const code = t.padStart(2, '0');
  if (!ES_CPRO_CODES.includes(code)) throw new Error(`${label}: CPRO ${code} is outside 01–52`);
  return code;
}

export interface VdpMonthRow {
  cpro: string;
  provincia: string;
  ccaa: string;
  period: string;
  estado: 'Iniciadas' | 'Terminadas';
  /** null when the cell is blank. Never coerced to 0. */
  value: number | null;
}

export function parseVdp005(text: string): VdpMonthRow[] {
  const records = parseSemicolonTable(text, VDP005_COLUMNS, VDP005_DATASET_ID);
  const rows: VdpMonthRow[] = [];
  for (const r of records) {
    const estado = r['ESTADO'];
    if (estado !== 'Iniciadas' && estado !== 'Terminadas') {
      throw new Error(`${VDP005_DATASET_ID}: estado not understood: "${estado}"`);
    }
    const tipo = r['TIPO_VIVIENDA'];
    const expectedTipo = estado === 'Iniciadas' ? 'Libres' : 'Libre';
    if (tipo !== expectedTipo) {
      throw new Error(`${VDP005_DATASET_ID}: ${estado} is labelled "${tipo}", expected ${expectedTipo}`);
    }
    if (!/^\d{4}$/.test(r['AÑO'])) throw new Error(`${VDP005_DATASET_ID}: year not understood: "${r['AÑO']}"`);
    if (!/^\d{1,2}$/.test(r['MES'])) throw new Error(`${VDP005_DATASET_ID}: month not understood: "${r['MES']}"`);
    const period = monthPeriod(Number(r['AÑO']), Number(r['MES']));
    const cpro = padCpro(r['CPRO'], VDP005_DATASET_ID);
    let value: number | null = null;
    if (!WITHHELD.has(r['VALOR'])) {
      value = parseEsInteger(r['VALOR'], `${VDP005_DATASET_ID} ${cpro} ${estado} ${period}`);
    }
    const provincia = r['PROVINCIA'];
    if (!provincia) throw new Error(`${VDP005_DATASET_ID}: blank province name for cpro ${cpro}`);
    rows.push({ cpro, provincia, ccaa: r['COMUNIDAD_AUTONOMA'], period, estado, value });
  }
  if (!rows.some((r) => r.value != null && r.estado === 'Iniciadas')) {
    throw new Error(`${VDP005_DATASET_ID}: no numeric starts`);
  }
  if (!rows.some((r) => r.value != null && r.estado === 'Terminadas')) {
    throw new Error(`${VDP005_DATASET_ID}: no numeric completions`);
  }
  return rows;
}

export interface IneSalesRow {
  /** 'nacional' or a zero-padded province code. Community rows are not returned. */
  geo: string;
  name: string;
  period: string;
  value: number | null;
}

export function parseIneNewSales(text: string): IneSalesRow[] {
  const records = parseSemicolonTable(text, INE_SALES_COLUMNS, `INE ${INE_SALES_TABLE_ID}`);
  const rows: IneSalesRow[] = [];
  for (const r of records) {
    if (r['Régimen y estado'] !== 'Vivienda nueva') continue;
    const periodRaw = r['Periodo'];
    const pm = /^(\d{4})M(0[1-9]|1[0-2])$/.exec(periodRaw);
    if (!pm) throw new Error(`INE ${INE_SALES_TABLE_ID}: period not understood: "${periodRaw}"`);
    const period = `${pm[1]}-${pm[2]}`;
    const province = r['Provincias'];
    const ccaa = r['Comunidades y Ciudades Autónomas'];
    const headline = r['Total Nacional'];
    if (headline !== 'Total Nacional') {
      throw new Error(`INE ${INE_SALES_TABLE_ID}: first column is "${headline}", expected Total Nacional`);
    }
    let geo: string;
    let name: string;
    if (province === '' && ccaa === '') {
      geo = 'nacional';
      name = 'Total Nacional';
    } else if (province === '') {
      continue;
    } else {
      const coded = /^(\d{2}) (.+)$/.exec(province);
      if (!coded) throw new Error(`INE ${INE_SALES_TABLE_ID}: province not understood: "${province}"`);
      geo = coded[1];
      if (!ES_CPRO_CODES.includes(geo)) throw new Error(`INE ${INE_SALES_TABLE_ID}: province code ${geo} is outside 01–52`);
      name = coded[2];
    }
    let value: number | null = null;
    if (!WITHHELD.has(r['Total'])) {
      value = parseEsInteger(r['Total'], `INE ${INE_SALES_TABLE_ID} ${name} ${period}`);
    }
    rows.push({ geo, name, period, value });
  }
  if (!rows.some((r) => r.geo === 'nacional' && r.value != null)) {
    throw new Error(`INE ${INE_SALES_TABLE_ID}: no numeric national vivienda nueva row`);
  }
  return rows;
}

export interface Vdp003Assessment {
  omission: SupplyOmission;
}

/**
 * VDP003_01 is the ministry's notarial transaction file. On the file this job
 * was written against, the same province-quarter of new free-market sales is
 * printed twice, with two different transaction counts (one of them zero).
 * This function never picks a count.
 */
export function assessVdp003(text: string | null, httpStatus: number | null): SupplyOmission {
  const base = {
    source: 'Ministerio de Vivienda y Agenda Urbana, transacciones inmobiliarias (notarial, VDP003_01)',
    url: VDP003_URL,
    ingested: false as const,
  };
  if (text == null) {
    const status = httpStatus == null ? 'the file could not be reached' : `HTTP ${httpStatus}`;
    return { ...base, reason: `The notarial transactions file returned ${status}. No notarial transaction count was ingested.` };
  }
  let records: Record<string, string>[];
  try {
    records = parseSemicolonTable(text, VDP003_COLUMNS, VDP003_DATASET_ID);
  } catch (e) {
    return { ...base, reason: `The notarial transactions file did not match the expected columns (${(e as Error).message}). No notarial transaction count was ingested.` };
  }
  const groups = new Map<string, { name: string; period: string; counts: Set<string> }>();
  for (const r of records) {
    if (r['Tipo'] !== 'Nueva' || r['regimen'] !== 'Libre') continue;
    if (r['PROVINCIA'] === 'Nacional' || r['COMUNIDAD'] === 'Nacional') continue;
    if (!/^\d{1,2}$/.test(r['CODPROVINCIA'].trim())) continue;
    const cpro = r['CODPROVINCIA'].trim().padStart(2, '0');
    if (!/^\d{4}$/.test(r['AÑO']) || !/^[1-4]$/.test(r['Trimestre'])) continue;
    const period = `${r['AÑO']}-Q${r['Trimestre']}`;
    const key = `${cpro}|${period}`;
    let g = groups.get(key);
    if (!g) {
      g = { name: r['PROVINCIA'], period, counts: new Set() };
      groups.set(key, g);
    }
    g.counts.add(r['Numero_Transacciones']);
  }
  const conflicts = [...groups.entries()].filter(([, g]) => g.counts.size > 1);
  if (conflicts.length === 0) {
    return {
      ...base,
      reason: 'VDP003_01 did not show two transaction counts for the same province and quarter on this run, and this job still has no parser that publishes the file. No notarial transaction count was ingested.',
    };
  }
  conflicts.sort((a, b) => (a[0] < b[0] ? 1 : -1));
  const [, example] = conflicts[0];
  const counts = [...example.counts].sort().join(' and ');
  return {
    ...base,
    reason:
      `VDP003_01 prints more than one transaction count for the same province, quarter, type Nueva and regime Libre ` +
      `(${conflicts.length} province-quarters). Example: ${example.name} ${example.period} has ${counts}. ` +
      'This job does not choose a count. No notarial transaction count was ingested.',
  };
}

interface MonthSeries {
  points: Map<string, number | null>;
  names: Set<string>;
}

function indexMonths(rows: { period: string; value: number | null; name?: string }[], label: string): MonthSeries {
  const points = new Map<string, number | null>();
  const names = new Set<string>();
  for (const r of rows) {
    if (r.name) names.add(r.name);
    if (points.has(r.period)) {
      const prev = points.get(r.period);
      if (prev !== r.value) throw new Error(`${label}: ${r.period} has both ${String(prev)} and ${String(r.value)}`);
      continue;
    }
    points.set(r.period, r.value);
  }
  if (points.size === 0) throw new Error(`${label}: no rows`);
  return { points, names };
}

function latestPeriod(points: Map<string, number | null>, label: string): string {
  const periods = [...points.keys()].sort();
  if (periods.length === 0) throw new Error(`${label}: no periods`);
  return periods[periods.length - 1];
}

function readWindow(
  points: Map<string, number | null>,
  end: string,
  months: 1 | 12,
  label: string,
): { period: string; value: number } {
  const window = monthsEnding(end, months);
  let total = 0;
  for (const period of window) {
    if (!points.has(period)) {
      throw new Error(`${label}: ${period} is absent from the ${months} month${months === 1 ? '' : 's'} ending ${end}. A gap is not zero.`);
    }
    const value = points.get(period);
    if (value == null) {
      throw new Error(`${label}: ${period} is blank in the ${months} month${months === 1 ? '' : 's'} ending ${end}. A blank is not zero.`);
    }
    total += value;
  }
  const period = months === 1 ? window[0] : `${window[0]}/${window[window.length - 1]}`;
  return { period, value: total };
}

function describeBlanks(missing: string[]): string {
  const shown = missing.slice(0, 6).join('; ');
  const more = missing.length > 6 ? `; and ${missing.length - 6} more` : '';
  return `${shown}${more}`;
}

function sumProvinces(
  byCode: Map<string, MonthSeries>,
  names: Map<string, string>,
  end: string,
  months: 1 | 12,
  label: string,
): { period: string; value: number } | { gap: string; period: string } {
  const window = monthsEnding(end, months);
  const missing: string[] = [];
  let total = 0;
  for (const code of ES_CPRO_CODES) {
    const series = byCode.get(code);
    const who = names.get(code) ?? `cpro ${code}`;
    if (!series) {
      missing.push(`${who} has no rows`);
      continue;
    }
    for (const period of window) {
      if (!series.points.has(period)) missing.push(`${who} ${period} absent`);
      else if (series.points.get(period) == null) missing.push(`${who} ${period} blank`);
      else total += series.points.get(period)!;
    }
  }
  const period = months === 1 ? window[0] : `${window[0]}/${window[window.length - 1]}`;
  if (missing.length) {
    return {
      period,
      gap: `${label} was not summed. A blank or missing provincial cell is not zero. ${describeBlanks(missing)}.`,
    };
  }
  return { period, value: total };
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function countOf(
  spec: {
    value: number;
    period: string;
    months: 1 | 12;
    seriesId: string;
    source: SupplyCount['source'];
    sourceName: string;
    sourceUrl: string;
    derived: boolean;
    fileModified: string | null;
    retrievedAt: string;
  },
): SupplyCount {
  return {
    available: true,
    value: spec.value,
    unit: 'dwellings',
    period: spec.period,
    months: spec.months,
    series_id: spec.seriesId,
    source: spec.source,
    source_name: spec.sourceName,
    source_url: spec.sourceUrl,
    derived: spec.derived,
    file_modified: spec.fileModified,
    retrieved_at: spec.retrievedAt,
  };
}

const MIVAU_NAME = 'Ministerio de Vivienda y Agenda Urbana';
const INE_NAME = 'Instituto Nacional de Estadística';

export interface BuildSupplyInput {
  now: Date;
  provinceKeys: string[];
  unmappedLocations: string[];
  vdp005: VdpMonthRow[];
  ine: IneSalesRow[];
  vdp005Modified: string | null;
  ineModified: string | null;
  vdp003: SupplyOmission;
}

function vdpIndex(rows: VdpMonthRow[], estado: 'Iniciadas' | 'Terminadas'): Map<string, MonthSeries> {
  const by = new Map<string, VdpMonthRow[]>();
  for (const r of rows) {
    if (r.estado !== estado) continue;
    const list = by.get(r.cpro) ?? [];
    list.push(r);
    by.set(r.cpro, list);
  }
  const out = new Map<string, MonthSeries>();
  for (const [cpro, list] of by) {
    out.set(cpro, indexMonths(list.map((r) => ({ period: r.period, value: r.value, name: r.provincia })), `${VDP005_DATASET_ID} ${cpro} ${estado}`));
  }
  return out;
}

function ineIndex(rows: IneSalesRow[]): Map<string, MonthSeries> {
  const by = new Map<string, IneSalesRow[]>();
  for (const r of rows) {
    const list = by.get(r.geo) ?? [];
    list.push(r);
    by.set(r.geo, list);
  }
  const out = new Map<string, MonthSeries>();
  for (const [geo, list] of by) {
    out.set(geo, indexMonths(list.map((r) => ({ period: r.period, value: r.value, name: r.name })), `INE ${INE_SALES_TABLE_ID} ${geo}`));
  }
  return out;
}

function namesOf(index: Map<string, MonthSeries>): Map<string, string> {
  const out = new Map<string, string>();
  for (const [code, series] of index) {
    const names = [...series.names];
    if (names.length > 1) throw new Error(`cpro ${code} has province names ${names.join(' | ')}`);
    if (names.length === 1) out.set(code, names[0]);
  }
  return out;
}

function requireSeries(index: Map<string, MonthSeries>, key: string, label: string): MonthSeries {
  const series = index.get(key);
  if (!series) throw new Error(`${label}: no rows`);
  return series;
}

function alignEnd(series: MonthSeries, end: string, label: string): void {
  const own = latestPeriod(series.points, label);
  if (own !== end) {
    throw new Error(`${label}: latest period is ${own}, file latest is ${end}`);
  }
}

export function buildSpainSupplyLayer(input: BuildSupplyInput): SpainSupplyLayer {
  if (input.unmappedLocations.length > 0) {
    const sample = [...new Set(input.unmappedLocations)].slice(0, 5).join(' | ');
    throw new Error(`${input.unmappedLocations.length} listings are not in a known province (${sample}). Refusing to publish a layer that drops them.`);
  }
  const defs = ES_PROVINCE_DEFS.filter((p) => input.provinceKeys.includes(p.key));
  if (defs.length === 0) throw new Error('No corpus province to publish');
  const unknown = input.provinceKeys.filter((k) => !ES_PROVINCE_DEFS.some((p) => p.key === k));
  if (unknown.length) throw new Error(`Unknown province keys: ${unknown.join(', ')}`);
  if (input.vdp003.ingested !== false) throw new Error('VDP003 assessment must record the series as not ingested');

  const retrievedAt = isoDay(input.now);
  const starts = vdpIndex(input.vdp005, 'Iniciadas');
  const completions = vdpIndex(input.vdp005, 'Terminadas');
  const sales = ineIndex(input.ine);
  const startNames = namesOf(starts);
  const completionNames = namesOf(completions);

  const startsEnd = latestPeriod(
    new Map([...starts.values()].flatMap((s) => [...s.points.keys()].map((p) => [p, 1] as const))),
    `${VDP005_DATASET_ID} iniciadas`,
  );
  const completionsEnd = latestPeriod(
    new Map([...completions.values()].flatMap((s) => [...s.points.keys()].map((p) => [p, 1] as const))),
    `${VDP005_DATASET_ID} terminadas`,
  );
  const nationalSales = requireSeries(sales, 'nacional', `INE ${INE_SALES_TABLE_ID} nacional`);
  const salesEnd = latestPeriod(nationalSales.points, `INE ${INE_SALES_TABLE_ID} nacional`);

  const provincePair = (def: ProvinceDef, index: Map<string, MonthSeries>, end: string, label: string): MonthSeries => {
    const series = requireSeries(index, def.cpro, `${label} ${def.name}`);
    alignEnd(series, end, `${label} ${def.name}`);
    return series;
  };

  const mivauCount = (
    series: MonthSeries,
    end: string,
    months: 1 | 12,
    seriesId: string,
    label: string,
  ): SupplyCount => {
    const read = readWindow(series.points, end, months, label);
    return countOf({
      value: read.value,
      period: read.period,
      months,
      seriesId,
      source: 'mivau_vdp005',
      sourceName: MIVAU_NAME,
      sourceUrl: VDP005_URL,
      // A twelve-month total is added here. The file publishes months, not this sum.
      derived: months === 12,
      fileModified: input.vdp005Modified,
      retrievedAt,
    });
  };

  const ineCount = (
    series: MonthSeries,
    end: string,
    months: 1 | 12,
    seriesId: string,
    label: string,
    derived: boolean,
  ): SupplyCount => {
    const read = readWindow(series.points, end, months, label);
    return countOf({
      value: read.value,
      period: read.period,
      months,
      seriesId,
      source: 'ine_es',
      sourceName: INE_NAME,
      sourceUrl: INE_SALES_TABLE_URL,
      derived,
      fileModified: input.ineModified,
      retrievedAt,
    });
  };

  const mivauSum = (
    index: Map<string, MonthSeries>,
    names: Map<string, string>,
    end: string,
    months: 1 | 12,
    seriesId: string,
    label: string,
  ): SupplySlot => {
    const summed = sumProvinces(index, names, end, months, label);
    if ('gap' in summed) {
      return { available: false, period: summed.period, months, derived: true, reason: summed.gap };
    }
    return countOf({
      value: summed.value,
      period: summed.period,
      months,
      seriesId,
      source: 'mivau_vdp005',
      sourceName: MIVAU_NAME,
      sourceUrl: VDP005_URL,
      derived: true,
      fileModified: input.vdp005Modified,
      retrievedAt,
    });
  };

  const provinces: ProvinceSupplyOfficial[] = defs.map((def) => {
    const startSeries = provincePair(def, starts, startsEnd, `${VDP005_DATASET_ID} iniciadas`);
    const doneSeries = provincePair(def, completions, completionsEnd, `${VDP005_DATASET_ID} terminadas`);
    const saleSeries = provincePair(def, sales, salesEnd, `INE ${INE_SALES_TABLE_ID} vivienda nueva`);
    return {
      name: def.name,
      slug: def.slug,
      key: def.key,
      cpro: def.cpro,
      nuts3: def.nuts3,
      ccaa: def.ccaaIne,
      starts_latest: mivauCount(startSeries, startsEnd, 1, `${VDP005_DATASET_ID}:libres:iniciadas:cpro=${def.cpro}`, `${def.name} starts`),
      starts_trailing_12m: mivauCount(startSeries, startsEnd, 12, `${VDP005_DATASET_ID}:libres:iniciadas:cpro=${def.cpro}:t12`, `${def.name} starts, 12 months`),
      completions_latest: mivauCount(doneSeries, completionsEnd, 1, `${VDP005_DATASET_ID}:libres:terminadas:cpro=${def.cpro}`, `${def.name} completions`),
      completions_trailing_12m: mivauCount(doneSeries, completionsEnd, 12, `${VDP005_DATASET_ID}:libres:terminadas:cpro=${def.cpro}:t12`, `${def.name} completions, 12 months`),
      ine_new_sales_latest: ineCount(saleSeries, salesEnd, 1, `INE:${INE_SALES_TABLE_ID}:vivienda_nueva:cpro=${def.cpro}`, `${def.name} vivienda nueva`, false),
      ine_new_sales_trailing_12m: ineCount(saleSeries, salesEnd, 12, `INE:${INE_SALES_TABLE_ID}:vivienda_nueva:cpro=${def.cpro}:t12`, `${def.name} vivienda nueva, 12 months`, true),
    };
  });

  const nationalSalesLatest = ineCount(nationalSales, salesEnd, 1, `INE:${INE_SALES_TABLE_ID}:vivienda_nueva:nacional`, 'Spain vivienda nueva', false);
  const nationalSalesYear = ineCount(nationalSales, salesEnd, 12, `INE:${INE_SALES_TABLE_ID}:vivienda_nueva:nacional:t12`, 'Spain vivienda nueva, 12 months', true);

  return {
    status: 'ready',
    generated_at: input.now.toISOString(),
    retrieved_at: retrievedAt,
    provinces_in_corpus: defs.map((d) => d.name),
    coverage_note: COVERAGE_NOTE,
    caveats: SUPPLY_CAVEATS,
    omissions: [VISADOS_OMISSION, input.vdp003, NOTARY_OMISSION],
    sources: {
      mivau_supply: {
        publisher: MIVAU_NAME,
        dataset_id: VDP005_DATASET_ID,
        url: VDP005_URL,
        catalog_url: VDP005_CATALOG_URL,
        readme_url: VDP005_README_URL,
        licence: 'CC BY 4.0',
        file_modified: input.vdp005Modified,
        file_modified_note: FILE_MODIFIED_NOTE,
        latest_period: startsEnd > completionsEnd ? startsEnd : completionsEnd,
        starts_definition: STARTS_DEFINITION,
        completions_definition: COMPLETIONS_DEFINITION,
        trailing_12m_definition: TRAILING_12M_DEFINITION,
      },
      ine_new_sales: {
        publisher: INE_NAME,
        table_id: INE_SALES_TABLE_ID,
        table_url: INE_SALES_TABLE_URL,
        csv_url: INE_SALES_CSV_URL,
        licence_note: 'Reuse with attribution. Fuente: INE.',
        file_modified: input.ineModified,
        file_modified_note: FILE_MODIFIED_NOTE,
        latest_period: salesEnd,
        definition: INE_SALES_DEFINITION,
        trailing_12m_definition: TRAILING_12M_DEFINITION,
      },
    },
    national: {
      starts_latest: mivauSum(starts, startNames, startsEnd, 1, `${VDP005_DATASET_ID}:libres:iniciadas:sum:cpro=01-52`, 'Spain starts'),
      starts_trailing_12m: mivauSum(starts, startNames, startsEnd, 12, `${VDP005_DATASET_ID}:libres:iniciadas:sum:cpro=01-52:t12`, 'Spain starts, 12 months'),
      completions_latest: mivauSum(completions, completionNames, completionsEnd, 1, `${VDP005_DATASET_ID}:libres:terminadas:sum:cpro=01-52`, 'Spain completions'),
      completions_trailing_12m: mivauSum(completions, completionNames, completionsEnd, 12, `${VDP005_DATASET_ID}:libres:terminadas:sum:cpro=01-52:t12`, 'Spain completions, 12 months'),
      ine_new_sales_latest: nationalSalesLatest,
      ine_new_sales_trailing_12m: nationalSalesYear,
    },
    provinces,
  };
}

/** Drop retrieval timestamps so an unchanged upstream file is not rewritten. */
export function supplyFingerprint(layer: SpainSupplyLayer): string {
  return JSON.stringify(layer, (key, value) => (key === 'generated_at' || key === 'retrieved_at' ? undefined : value));
}

// ─── Avena stock and asking-price moves ─────────────────────────────────────

export const LISTINGS_METHOD =
  'Count of new-build listings in the deployed corpus whose location is in the province. ' +
  'A stock of listings, not a count of homes started, finished or sold.';

export const MOVES_METHOD =
  'Verified asking-price changes in the published moves file. A move is placed by its listing ref when that ref is still in the corpus. ' +
  'A ref that has left the corpus is placed by town only when that town name belongs to one province in the current corpus. Otherwise it is unplaced and not added to a province. ' +
  'An increase is a positive change. A reduction is a negative change. These are asking-price moves, not registered sales.';

export interface SupplyListing {
  ref: string | null;
  location: string;
}

export interface SupplyMove {
  ref: string;
  town: string;
  date: string;
  changePct: number;
}

export interface ProvinceSupplyView {
  name: string;
  slug: string;
  key: string;
  cpro: string;
  nuts3: string;
  ccaa: string;
  listings: number;
  price_moves: number;
  price_increases: number;
  price_reductions: number;
  price_move_first: string | null;
  price_move_last: string | null;
  starts_latest: SupplyCount | null;
  starts_trailing_12m: SupplyCount | null;
  completions_latest: SupplyCount | null;
  completions_trailing_12m: SupplyCount | null;
  ine_new_sales_latest: SupplyCount | null;
  ine_new_sales_trailing_12m: SupplyCount | null;
  official: 'ready' | 'missing_from_layer';
}

export interface EsSupplyView {
  ok: true;
  status: 'ready' | 'pending';
  generated_at: string | null;
  retrieved_at: string | null;
  method: { listings: string; price_moves: string };
  caveats: string[];
  coverage_note: string | null;
  omissions: SupplyOmission[];
  sources: SpainSupplyLayer['sources'] | null;
  national: SpainSupplyLayer['national'] | null;
  provinces: ProvinceSupplyView[];
  unmapped_listings: number;
  moves_file: {
    rows: number;
    unplaced: number;
    first_date: string | null;
    last_date: string | null;
  };
}


function emptyOfficial(def: ProvinceDef, listings: number): ProvinceSupplyView {
  return {
    name: def.name,
    slug: def.slug,
    key: def.key,
    cpro: def.cpro,
    nuts3: def.nuts3,
    ccaa: def.ccaaIne,
    listings,
    price_moves: 0,
    price_increases: 0,
    price_reductions: 0,
    price_move_first: null,
    price_move_last: null,
    starts_latest: null,
    starts_trailing_12m: null,
    completions_latest: null,
    completions_trailing_12m: null,
    ine_new_sales_latest: null,
    ine_new_sales_trailing_12m: null,
    official: 'missing_from_layer',
  };
}

export function buildEsSupplyView(
  layer: SpainSupplyLayer | null,
  listings: readonly SupplyListing[],
  moves: readonly SupplyMove[],
): EsSupplyView {
  const groups = new Map<string, number>();
  const refToKey = new Map<string, string | null>();
  const townToKeys = new Map<string, Set<string>>();
  let unmapped = 0;
  for (const listing of listings) {
    const def = provinceFromLocation(listing.location);
    if (!def) {
      unmapped++;
      if (listing.ref) refToKey.set(listing.ref, null);
      continue;
    }
    groups.set(def.key, (groups.get(def.key) ?? 0) + 1);
    if (listing.ref) refToKey.set(listing.ref, def.key);
    const town = fold(listing.location.split(',')[0] ?? '');
    if (!town) continue;
    const set = townToKeys.get(town) ?? new Set<string>();
    set.add(def.key);
    townToKeys.set(town, set);
  }

  const moveGroups = new Map<string, { n: number; up: number; down: number; first: string | null; last: string | null }>();
  let unplaced = 0;
  let fileFirst: string | null = null;
  let fileLast: string | null = null;
  for (const move of moves) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(move.date)) throw new Error(`move date not YYYY-MM-DD: "${move.date}"`);
    if (!Number.isFinite(move.changePct)) throw new Error(`move ${move.ref} ${move.date} has a non-numeric change`);
    if (fileFirst == null || move.date < fileFirst) fileFirst = move.date;
    if (fileLast == null || move.date > fileLast) fileLast = move.date;
    let key: string | null = null;
    if (refToKey.has(move.ref)) key = refToKey.get(move.ref) ?? null;
    else {
      const towns = townToKeys.get(fold(move.town));
      if (towns && towns.size === 1) key = [...towns][0];
    }
    if (!key) { unplaced++; continue; }
    const g = moveGroups.get(key) ?? { n: 0, up: 0, down: 0, first: null, last: null };
    g.n++;
    if (move.changePct > 0) g.up++;
    else if (move.changePct < 0) g.down++;
    if (g.first == null || move.date < g.first) g.first = move.date;
    if (g.last == null || move.date > g.last) g.last = move.date;
    moveGroups.set(key, g);
  }

  const officialByKey = new Map<string, ProvinceSupplyOfficial>();
  if (layer) for (const p of layer.provinces) officialByKey.set(p.key, p);
  const keys = ES_PROVINCE_DEFS.map((p) => p.key).filter((k) => groups.has(k) || officialByKey.has(k) || moveGroups.has(k));
  const provinces: ProvinceSupplyView[] = keys.map((key) => {
    const def = ES_PROVINCE_DEFS.find((p) => p.key === key)!;
    const off = officialByKey.get(key) ?? null;
    const movesFor = moveGroups.get(key);
    const base = off
      ? {
          ...emptyOfficial(def, groups.get(key) ?? 0),
          starts_latest: off.starts_latest,
          starts_trailing_12m: off.starts_trailing_12m,
          completions_latest: off.completions_latest,
          completions_trailing_12m: off.completions_trailing_12m,
          ine_new_sales_latest: off.ine_new_sales_latest,
          ine_new_sales_trailing_12m: off.ine_new_sales_trailing_12m,
          official: 'ready' as const,
        }
      : emptyOfficial(def, groups.get(key) ?? 0);
    return {
      ...base,
      price_moves: movesFor?.n ?? 0,
      price_increases: movesFor?.up ?? 0,
      price_reductions: movesFor?.down ?? 0,
      price_move_first: movesFor?.first ?? null,
      price_move_last: movesFor?.last ?? null,
    };
  });

  const movesFile = { rows: moves.length, unplaced, first_date: fileFirst, last_date: fileLast };
  if (!layer) {
    return {
      ok: true,
      status: 'pending',
      generated_at: null,
      retrieved_at: null,
      method: { listings: LISTINGS_METHOD, price_moves: MOVES_METHOD },
      caveats: SUPPLY_CAVEATS,
      coverage_note: null,
      omissions: [],
      sources: null,
      national: null,
      provinces,
      unmapped_listings: unmapped,
      moves_file: movesFile,
    };
  }
  return {
    ok: true,
    status: 'ready',
    generated_at: layer.generated_at,
    retrieved_at: layer.retrieved_at,
    method: { listings: LISTINGS_METHOD, price_moves: MOVES_METHOD },
    caveats: layer.caveats,
    coverage_note: layer.coverage_note,
    omissions: layer.omissions,
    sources: layer.sources,
    national: layer.national,
    provinces,
    unmapped_listings: unmapped,
    moves_file: movesFile,
  };
}
