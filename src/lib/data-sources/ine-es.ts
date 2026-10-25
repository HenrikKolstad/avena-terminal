/**
 * Official Spanish housing statistics for the provinces Avena covers.
 *
 * Two keyless sources, both required before a layer is published:
 *
 *   - INE, Índice de Precios de Vivienda (IPV), table 79563. New dwellings
 *     versus second-hand, index level and the published annual change, for
 *     Spain and each autonomous community. INE does not publish this split
 *     by province. A province is given its community's series, and the layer
 *     says so. JSON API: servicios.ine.es/wstempus. Reuse with attribution
 *     ("Fuente: INE").
 *   - Ministerio de Vivienda y Agenda Urbana, dataset VDP006_01. Mean
 *     appraised €/m² of free-market housing (régimen Libre), all ages, by
 *     province and quarter. CC BY 4.0. Murcia is a single-province community
 *     and the file publishes it only as the community total (Provincia
 *     "Total CCAA"), which is the same territory. That row is not the
 *     national total: the national total is the separate "Total nacional" row.
 *
 * Every parser throws when the file stops meaning what we think it means.
 * An empty table that renders as "no data" is indistinguishable from a dead
 * source. A zero written in place of a blank cell is a fabricated price.
 *
 * Network I/O lives in scripts/ingest-es-official.ts. Nothing here fetches.
 */

export const INE_TABLE_ID = '79563';
export const INE_TABLE_URL = 'https://www.ine.es/jaxiT3/Tabla.htm?t=79563';
export const INE_API_BASE = 'https://servicios.ine.es/wstempus/js/ES';
export const MIVAU_DATASET_ID = 'VDP006_01';
export const MIVAU_CSV_URL = 'https://cdn.mivau.gob.es/portal-web-mivau/Datos_MIVAU/CSV/VDP006_01.csv';
export const MIVAU_CATALOG_URL = 'https://datos.gob.es/es/catalogo/e05233601-valor-tasado-de-la-vivienda';
export const REGISTRADORES_DATASET_URL =
  'https://opendata.registradores.org/dataset/es/dataset/compraventas-de-inmuebles-uso-residencial-por-provincia';

/**
 * Quarterly Tempus codes. The same map as `ineQuarterPeriod` in
 * eu-stats-feeds.ts, checked against live Fecha values on table 25171
 * (FK 19 = Q1 … FK 22 = Q4). Kept here so this module does not import the
 * Supabase client that file pulls in. A NombrePeriodo of "2026T2" is
 * preferred when the response carries one, and it must agree with the code.
 */
const QUARTER_BY_FK: Record<number, number> = { 19: 1, 20: 2, 21: 3, 22: 4 };

export type IneDwelling = 'new' | 'existing' | 'general';
export type IneMeasure = 'index' | 'yoy' | 'qoq' | 'ytd';

export interface ProvinceDef {
  key: string;
  /** Name as Avena's listings write it, and as this layer publishes it. */
  name: string;
  slug: string;
  /** INE province code, zero-padded. Geography, not a statistic. */
  cpro: string;
  nuts3: string;
  /** Exact INE series-name prefix for the autonomous community. */
  ccaaIne: string;
  /**
   * How VDP006_01 identifies the province. `ccaa` is only for a community
   * the file does not split into a province row. The ccaa string is the
   * file's own spelling, accent and all.
   */
  mivau: { kind: 'province'; cpro: string } | { kind: 'ccaa'; ccaa: string };
  /** True when the autonomous community is that one province. */
  ineTerritoryEqualsProvince: boolean;
}

export const ES_PROVINCE_DEFS: ProvinceDef[] = [
  { key: 'malaga', name: 'Málaga', slug: 'malaga', cpro: '29', nuts3: 'ES617', ccaaIne: 'Andalucía', mivau: { kind: 'province', cpro: '29' }, ineTerritoryEqualsProvince: false },
  { key: 'alicante', name: 'Alicante', slug: 'alicante', cpro: '03', nuts3: 'ES521', ccaaIne: 'Comunitat Valenciana', mivau: { kind: 'province', cpro: '03' }, ineTerritoryEqualsProvince: false },
  { key: 'murcia', name: 'Murcia', slug: 'murcia', cpro: '30', nuts3: 'ES620', ccaaIne: 'Murcia, Región de', mivau: { kind: 'ccaa', ccaa: 'Murcia, Region de' }, ineTerritoryEqualsProvince: true },
  { key: 'almeria', name: 'Almería', slug: 'almeria', cpro: '04', nuts3: 'ES611', ccaaIne: 'Andalucía', mivau: { kind: 'province', cpro: '04' }, ineTerritoryEqualsProvince: false },
  { key: 'granada', name: 'Granada', slug: 'granada', cpro: '18', nuts3: 'ES614', ccaaIne: 'Andalucía', mivau: { kind: 'province', cpro: '18' }, ineTerritoryEqualsProvince: false },
  { key: 'cadiz', name: 'Cádiz', slug: 'cadiz', cpro: '11', nuts3: 'ES612', ccaaIne: 'Andalucía', mivau: { kind: 'province', cpro: '11' }, ineTerritoryEqualsProvince: false },
  { key: 'valencia', name: 'Valencia', slug: 'valencia', cpro: '46', nuts3: 'ES523', ccaaIne: 'Comunitat Valenciana', mivau: { kind: 'province', cpro: '46' }, ineTerritoryEqualsProvince: false },
  { key: 'castellon', name: 'Castellón', slug: 'castellon', cpro: '12', nuts3: 'ES522', ccaaIne: 'Comunitat Valenciana', mivau: { kind: 'province', cpro: '12' }, ineTerritoryEqualsProvince: false },
];

export function fold(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** "Alicante/Alacant" and "Cádiz" both fold onto the keys above. */
export function provinceKey(name: string): string {
  return fold(name.split('/')[0] ?? '');
}

export function provinceFromLocation(location: string): ProvinceDef | null {
  const parts = location.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const key = provinceKey(parts[parts.length - 1]);
  return ES_PROVINCE_DEFS.find((p) => p.key === key) ?? null;
}

export function corpusProvinces(locations: string[]): { keys: string[]; unmapped: string[] } {
  const keys = new Set<string>();
  const unmapped: string[] = [];
  for (const loc of locations) {
    const def = provinceFromLocation(loc);
    if (!def) unmapped.push(loc);
    else keys.add(def.key);
  }
  return {
    keys: ES_PROVINCE_DEFS.map((p) => p.key).filter((k) => keys.has(k)),
    unmapped,
  };
}

// ─── INE ────────────────────────────────────────────────────────────────────

export function splitIneSeriesName(nombre: string): { geo: string; dwelling: string; measure: string } {
  const parts = nombre.trim().replace(/\.+$/, '').split('.').map((s) => s.trim()).filter(Boolean);
  if (parts.length !== 3) throw new Error(`INE series name not understood: "${nombre}"`);
  return { geo: parts[0], dwelling: parts[1], measure: parts[2] };
}

export function classifyDwelling(label: string): IneDwelling | null {
  if (label === 'Vivienda nueva') return 'new';
  if (label === 'Vivienda segunda mano') return 'existing';
  if (label === 'General') return 'general';
  return null;
}

export function classifyMeasure(label: string): IneMeasure | null {
  if (label === 'Índice') return 'index';
  if (label === 'Variación anual') return 'yoy';
  if (label === 'Variación trimestral') return 'qoq';
  if (label === 'Variación en lo que va de año') return 'ytd';
  return null;
}

export interface IneSeriesRef {
  cod: string;
  nombre: string;
  geo: string;
  dwelling: IneDwelling;
  measure: IneMeasure;
}

/**
 * Pick the series this layer needs from a SERIES_TABLA listing.
 * Exactly one series per geography × dwelling × measure, or throw.
 */
export function selectIneSeries(
  list: unknown,
  geos: string[],
  dwellings: IneDwelling[] = ['new', 'existing'],
  measures: IneMeasure[] = ['index', 'yoy'],
): IneSeriesRef[] {
  if (!Array.isArray(list) || list.length === 0) throw new Error('INE SERIES_TABLA is not a non-empty array');
  const indexed: IneSeriesRef[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') throw new Error('INE SERIES_TABLA row is not an object');
    const row = raw as { COD?: unknown; Nombre?: unknown };
    if (typeof row.COD !== 'string' || typeof row.Nombre !== 'string') {
      throw new Error('INE SERIES_TABLA row is missing COD or Nombre');
    }
    const parts = splitIneSeriesName(row.Nombre);
    const dwelling = classifyDwelling(parts.dwelling);
    const measure = classifyMeasure(parts.measure);
    if (!dwelling || !measure) continue;
    indexed.push({ cod: row.COD, nombre: row.Nombre, geo: parts.geo, dwelling, measure });
  }
  const out: IneSeriesRef[] = [];
  for (const geo of geos) {
    for (const dwelling of dwellings) {
      for (const measure of measures) {
        const hits = indexed.filter((s) => fold(s.geo) === fold(geo) && s.dwelling === dwelling && s.measure === measure);
        if (hits.length !== 1) {
          throw new Error(`INE table ${INE_TABLE_ID}: expected one series for "${geo}" / ${dwelling} / ${measure}, found ${hits.length}`);
        }
        out.push(hits[0]);
      }
    }
  }
  return out;
}

export function ineObsPeriod(obs: Record<string, unknown>): string {
  let fromName: string | null = null;
  const label = obs.NombrePeriodo;
  if (typeof label === 'string' && label.trim()) {
    const m = /^(\d{4})T([1-4])$/.exec(label.trim());
    if (!m) throw new Error(`INE period label not understood: "${label}"`);
    fromName = `${m[1]}-Q${m[2]}`;
  }
  const periodo = obs.Periodo;
  const fkRaw = obs.FK_Periodo ?? (periodo && typeof periodo === 'object' ? (periodo as { Id?: unknown }).Id : undefined);
  const anyo = obs.Anyo;
  let fromCode: string | null = null;
  if (fkRaw != null) {
    const fk = typeof fkRaw === 'number' ? fkRaw : Number(fkRaw);
    const year = typeof anyo === 'number' ? anyo : Number(anyo);
    const q = QUARTER_BY_FK[fk];
    if (!q) throw new Error(`unmapped INE FK_Periodo ${String(fkRaw)}`);
    if (!Number.isInteger(year) || year < 1900 || year > 2200) throw new Error(`implausible INE Anyo ${String(anyo)}`);
    fromCode = `${year}-Q${q}`;
  } else if (fromName == null) {
    throw new Error('INE observation has no period');
  }
  if (fromName && fromCode && fromName !== fromCode) {
    throw new Error(`INE period disagreement: NombrePeriodo ${fromName} vs code ${fromCode}`);
  }
  const period = fromName ?? fromCode;
  if (!period) throw new Error('INE observation has no period');
  return period;
}

export interface InePoint {
  period: string;
  value: number | null;
  provisional: boolean | null;
}

export interface IneParsed {
  cod: string;
  nombre: string;
  geo: string;
  dwelling: IneDwelling;
  measure: IneMeasure;
  unitLabel: string;
  points: InePoint[];
}

/** Parse one DATOS_SERIE response (the object form, det=2). */
export function parseIneDatosSerie(json: unknown, expectedCod?: string): IneParsed {
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    throw new Error(`INE ${expectedCod ?? 'series'}: DATOS_SERIE is not an object`);
  }
  const x = json as Record<string, unknown>;
  if (typeof x.COD !== 'string' || typeof x.Nombre !== 'string') {
    throw new Error(`INE ${expectedCod ?? 'series'}: missing COD or Nombre`);
  }
  if (expectedCod && x.COD !== expectedCod) {
    throw new Error(`INE series mismatch: wanted ${expectedCod}, got ${x.COD}`);
  }
  const parts = splitIneSeriesName(x.Nombre);
  const dwelling = classifyDwelling(parts.dwelling);
  const measure = classifyMeasure(parts.measure);
  if (!dwelling || !measure) throw new Error(`INE ${x.COD}: unclassified series "${x.Nombre}"`);
  const unidad = x.Unidad as { Nombre?: unknown } | undefined;
  const unitLabel = typeof unidad?.Nombre === 'string' ? unidad.Nombre.trim() : '';
  if (!unitLabel) throw new Error(`INE ${x.COD}: response has no Unidad`);
  if (measure === 'yoy' && !/tasa/i.test(unitLabel)) {
    throw new Error(`INE ${x.COD}: annual change is unit "${unitLabel}", expected a rate (Tasas)`);
  }
  if (measure === 'index' && !/[ií]ndice/i.test(unitLabel)) {
    throw new Error(`INE ${x.COD}: index is unit "${unitLabel}", expected Índice`);
  }
  if (!Array.isArray(x.Data) || x.Data.length === 0) throw new Error(`INE ${x.COD}: no Data`);
  const points: InePoint[] = [];
  for (const raw of x.Data) {
    if (!raw || typeof raw !== 'object') throw new Error(`INE ${x.COD}: data row is not an object`);
    const obs = raw as Record<string, unknown>;
    const period = ineObsPeriod(obs);
    let provisional: boolean | null = null;
    const tipo = obs.TipoDato;
    if (tipo && typeof tipo === 'object' && typeof (tipo as { Nombre?: unknown }).Nombre === 'string') {
      provisional = (tipo as { Nombre: string }).Nombre !== 'Definitivo';
    }
    let value: number | null = null;
    if (obs.Secreto === true) {
      value = null;
    } else if (obs.Valor == null || obs.Valor === '') {
      value = null;
    } else {
      const v = typeof obs.Valor === 'number' ? obs.Valor : Number(obs.Valor);
      if (!Number.isFinite(v)) throw new Error(`INE ${x.COD}: non-numeric value "${String(obs.Valor)}" at ${period}`);
      if (measure === 'index' && v < 0) throw new Error(`INE ${x.COD}: negative index ${v} at ${period}`);
      value = v;
    }
    points.push({ period, value, provisional });
  }
  if (!points.some((p) => p.value != null)) throw new Error(`INE ${x.COD}: no numeric values`);
  return { cod: x.COD, nombre: x.Nombre, geo: parts.geo, dwelling, measure, unitLabel, points };
}

export function latestPoint(points: InePoint[], label: string): { period: string; value: number; provisional: boolean | null } {
  if (points.length === 0) throw new Error(`${label}: no observations`);
  const periods = [...new Set(points.map((p) => p.period))].sort();
  const period = periods[periods.length - 1];
  const rows = points.filter((p) => p.period === period);
  const values = rows.map((r) => r.value);
  if (values.some((v) => v == null) || values.length === 0) {
    throw new Error(`${label}: latest period ${period} is withheld or blank`);
  }
  const distinct = [...new Set(values as number[])];
  if (distinct.length !== 1) throw new Error(`${label}: latest period ${period} has conflicting values ${distinct.join(', ')}`);
  const flags = [...new Set(rows.map((r) => r.provisional))];
  if (flags.length !== 1) throw new Error(`${label}: latest period ${period} disagrees on provisional`);
  return { period, value: distinct[0], provisional: flags[0] };
}

// ─── MIVAU ──────────────────────────────────────────────────────────────────

export interface MivauRow {
  year: number;
  quarter: number;
  /** null when the cell is blank. Never coerced to 0. */
  value: number | null;
  regime: 'Libre' | 'Protegida';
  /** Zero-padded province code, or null for a community / national total. */
  cpro: string | null;
  provincia: string;
  ccaa: string;
  codauto: string | null;
}

const MIVAU_COLUMNS = ['Año', 'Trimestre', 'Valor', 'Régimen', 'CPRO', 'Provincia', 'Comunidad_Autónoma', 'CODAUTO'] as const;

/** Semicolon CSV, quotes optional. Enough for VDP006_01, and strict about its header. */
export function parseSemicolonCsv(text: string): Record<string, string>[] {
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
  if (table.length < 2) throw new Error('MIVAU CSV has no data rows');
  const header = table[0].map((h) => h.trim());
  for (const col of MIVAU_COLUMNS) {
    if (!header.includes(col)) throw new Error(`MIVAU CSV missing column ${col}`);
  }
  return table.slice(1).map((cells) => {
    const out: Record<string, string> = {};
    header.forEach((h, i) => { out[h] = (cells[i] ?? '').trim(); });
    return out;
  });
}

function padCpro(raw: string): string | null {
  const t = raw.trim();
  if (!t || t.toLowerCase() === 'null') return null;
  if (!/^\d{1,2}$/.test(t)) throw new Error(`MIVAU CPRO is not a province code: "${raw}"`);
  return t.padStart(2, '0');
}

export function parseMivauCsv(text: string): MivauRow[] {
  const records = parseSemicolonCsv(text);
  const rows: MivauRow[] = [];
  for (const r of records) {
    if (!/^\d{4}$/.test(r['Año'])) throw new Error(`MIVAU year not understood: "${r['Año']}"`);
    const year = Number(r['Año']);
    if (!/^[1-4]$/.test(r['Trimestre'])) throw new Error(`MIVAU quarter not understood: "${r['Trimestre']}" (${r['Provincia']} ${year})`);
    const quarter = Number(r['Trimestre']);
    const regime = r['Régimen'];
    if (regime !== 'Libre' && regime !== 'Protegida') {
      throw new Error(`MIVAU regime not understood: "${regime}"`);
    }
    let value: number | null = null;
    if (r['Valor'] !== '') {
      if (!/^\d+(\.\d+)?$/.test(r['Valor'])) throw new Error(`MIVAU value not a plain decimal: "${r['Valor']}" (${r['Provincia']} ${year} Q${quarter})`);
      const n = Number(r['Valor']);
      // A published 0 (a handful of inland quarters in 2011–2013) is not an
      // appraisal. Keep it as a blank so it cannot become a benchmark, and
      // let the series builder refuse a required place whose latest quarter
      // is one of these blanks.
      value = n > 0 ? n : null;
    }
    rows.push({
      year,
      quarter,
      value,
      regime,
      cpro: padCpro(r['CPRO']),
      provincia: r['Provincia'],
      ccaa: r['Comunidad_Autónoma'],
      codauto: r['CODAUTO'].trim() ? r['CODAUTO'].trim() : null,
    });
  }
  if (!rows.some((r) => r.value != null && r.regime === 'Libre')) {
    throw new Error('MIVAU CSV has no numeric free-market values');
  }
  return rows;
}

export interface MivauSeries {
  seriesId: string;
  /** The file's own place name for this series. */
  place: string;
  points: { period: string; value: number }[];
}

function periodOf(year: number, quarter: number): string {
  return `${year}-Q${quarter}`;
}

function collapsePoints(rows: MivauRow[], seriesId: string): { period: string; value: number }[] {
  const present = [...new Set(rows.map((r) => periodOf(r.year, r.quarter)))].sort();
  if (present.length === 0) throw new Error(`MIVAU ${seriesId}: no rows`);
  const byPeriod = new Map<string, number>();
  for (const r of rows) {
    if (r.value == null) continue;
    const period = periodOf(r.year, r.quarter);
    const prev = byPeriod.get(period);
    if (prev != null && prev !== r.value) {
      throw new Error(`MIVAU ${seriesId}: ${period} has both ${prev} and ${r.value}`);
    }
    byPeriod.set(period, r.value);
  }
  if (byPeriod.size === 0) throw new Error(`MIVAU ${seriesId}: no numeric values`);
  const latestPresent = present[present.length - 1];
  const latestNumeric = [...byPeriod.keys()].sort().at(-1)!;
  if (latestPresent !== latestNumeric) {
    throw new Error(`MIVAU ${seriesId}: latest quarter ${latestPresent} has no positive appraisal (last positive is ${latestNumeric})`);
  }
  return [...byPeriod.entries()].map(([period, value]) => ({ period, value })).sort((a, b) => a.period < b.period ? -1 : 1);
}

/**
 * Free-market (Libre) series for one geography.
 * `national` is only the "Total nacional" row. A blank CPRO is not national:
 * Murcia's community total also has a blank CPRO.
 */
export function mivauSeries(rows: MivauRow[], spec: ProvinceDef['mivau'] | { kind: 'national' }): MivauSeries {
  const libre = rows.filter((r) => r.regime === 'Libre');
  if (spec.kind === 'national') {
    const hit = libre.filter((r) => fold(r.ccaa) === 'total nacional' && fold(r.provincia) === 'total ccaa');
    const seriesId = `${MIVAU_DATASET_ID}:libre:ccaa=Total nacional`;
    return { seriesId, place: 'Total nacional', points: collapsePoints(hit, seriesId) };
  }
  if (spec.kind === 'province') {
    const hit = libre.filter((r) => r.cpro === spec.cpro && fold(r.provincia) !== 'total ccaa');
    const names = [...new Set(hit.map((r) => r.provincia))];
    if (names.length !== 1) {
      throw new Error(`MIVAU cpro ${spec.cpro}: expected one province name, found ${names.join(' | ') || 'none'}`);
    }
    const seriesId = `${MIVAU_DATASET_ID}:libre:cpro=${spec.cpro}`;
    return { seriesId, place: names[0], points: collapsePoints(hit, seriesId) };
  }
  const hit = libre.filter((r) => fold(r.ccaa) === fold(spec.ccaa) && fold(r.provincia) === 'total ccaa');
  if (hit.length === 0) throw new Error(`MIVAU community total not found: "${spec.ccaa}"`);
  const spellings = [...new Set(hit.map((r) => r.ccaa))];
  if (spellings.length !== 1) throw new Error(`MIVAU community "${spec.ccaa}" has spellings ${spellings.join(' | ')}`);
  const seriesId = `${MIVAU_DATASET_ID}:libre:ccaa=${spellings[0]}`;
  return { seriesId, place: spellings[0], points: collapsePoints(hit, seriesId) };
}

// ─── Layer ──────────────────────────────────────────────────────────────────

export interface SourcedNumber {
  value: number;
  /** What the number is, so a rate cannot be rendered as an index. */
  unit: 'eur_per_m2' | 'index' | 'pct';
  /** Unit name as the source itself labels it, when it has one. */
  unit_label: string | null;
  period: string;
  series_id: string;
  source: 'ine_es' | 'mivau';
  source_name: string;
  source_url: string;
  /** YYYY-MM-DD, the day this exact value was retrieved. Omitted from the no-change check. */
  retrieved_at: string;
  provisional: boolean | null;
}

export interface LayerOmission {
  source: string;
  url: string | null;
  ingested: false;
  reason: string;
}

export interface ProvinceOfficial {
  name: string;
  slug: string;
  key: string;
  cpro: string;
  nuts3: string;
  ccaa: string;
  ine_territory_equals_province: boolean;
  appraisal: SourcedNumber;
  ine_new_index: SourcedNumber;
  ine_new_yoy_pct: SourcedNumber;
  ine_existing_index: SourcedNumber;
  ine_existing_yoy_pct: SourcedNumber;
}

export interface SpainLayer {
  status: 'ready';
  generated_at: string;
  retrieved_at: string;
  provinces_in_corpus: string[];
  coverage_note: string;
  omissions: LayerOmission[];
  sources: {
    ine_ipv: {
      publisher: string;
      table_id: string;
      table_url: string;
      api: string;
      licence_note: string;
      latest_period: string;
    };
    mivau_appraisal: {
      publisher: string;
      dataset_id: string;
      url: string;
      catalog_url: string;
      licence: string;
      regime: 'Libre';
      latest_period: string;
      definition: string;
    };
  };
  national: {
    appraisal: SourcedNumber;
    ine_new_index: SourcedNumber;
    ine_new_yoy_pct: SourcedNumber;
    ine_existing_index: SourcedNumber;
    ine_existing_yoy_pct: SourcedNumber;
  };
  provinces: ProvinceOfficial[];
}

export const COVERAGE_NOTE =
  'INE publishes the new-build versus second-hand housing price index by autonomous community, not by province. ' +
  'Each province below is shown with its community\'s index. ' +
  'The appraised €/m² is provincial free-market housing of all ages. ' +
  'Murcia has no separate province row in the ministry file; the figure is the uniprovincial community total, which is the same territory, and it is not the national total.';

const NOTARY_OMISSION: LayerOmission = {
  source: 'Consejo General del Notariado',
  url: null,
  ingested: false,
  reason: 'No keyless CSV or JSON endpoint is read by this job. Notarial prices are not in this file.',
};

export function registradoresOmission(httpStatus: number | null): LayerOmission {
  const base = {
    source: 'Colegio de Registradores',
    url: REGISTRADORES_DATASET_URL,
    ingested: false as const,
  };
  if (httpStatus == null) {
    return { ...base, reason: 'The open-data portal could not be reached from the refresh job. No registradores series was ingested.' };
  }
  if (httpStatus === 403) {
    return { ...base, reason: 'The open-data portal returned HTTP 403 to the refresh job. No registradores series was ingested.' };
  }
  if (httpStatus === 200) {
    return { ...base, reason: 'The open-data portal returned HTTP 200, but this job has no parser for that file yet. No registradores series was ingested.' };
  }
  return { ...base, reason: `The open-data portal returned HTTP ${httpStatus}. No registradores series was ingested.` };
}

export interface BuildLayerInput {
  now: Date;
  /** Province keys present in the corpus, in any order. */
  provinceKeys: string[];
  unmappedLocations: string[];
  ine: IneParsed[];
  mivau: MivauRow[];
  registradoresStatus: number | null;
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function sourcedIne(series: IneParsed, retrievedAt: string): SourcedNumber {
  const latest = latestPoint(series.points, series.cod);
  return {
    value: latest.value,
    unit: series.measure === 'yoy' ? 'pct' : 'index',
    unit_label: series.unitLabel,
    period: latest.period,
    series_id: series.cod,
    source: 'ine_es',
    source_name: 'Instituto Nacional de Estadística',
    source_url: INE_TABLE_URL,
    retrieved_at: retrievedAt,
    provisional: latest.provisional,
  };
}

function sourcedAppraisal(series: MivauSeries, retrievedAt: string): SourcedNumber {
  const latest = latestPoint(series.points.map((p) => ({ ...p, provisional: null })), series.seriesId);
  return {
    value: latest.value,
    unit: 'eur_per_m2',
    unit_label: '€/m²',
    period: latest.period,
    series_id: series.seriesId,
    source: 'mivau',
    source_name: 'Ministerio de Vivienda y Agenda Urbana',
    source_url: MIVAU_CSV_URL,
    retrieved_at: retrievedAt,
    provisional: null,
  };
}

function findIne(series: IneParsed[], geo: string, dwelling: 'new' | 'existing', measure: 'index' | 'yoy'): IneParsed {
  const hits = series.filter((s) => fold(s.geo) === fold(geo) && s.dwelling === dwelling && s.measure === measure);
  if (hits.length !== 1) {
    throw new Error(`INE: expected one "${geo}" ${dwelling} ${measure} series, found ${hits.length}`);
  }
  return hits[0];
}

export function buildSpainLayer(input: BuildLayerInput): SpainLayer {
  if (input.unmappedLocations.length > 0) {
    const sample = [...new Set(input.unmappedLocations)].slice(0, 5).join(' | ');
    throw new Error(`${input.unmappedLocations.length} listings are not in a known province (${sample}). Refusing to publish a layer that drops them.`);
  }
  const defs = ES_PROVINCE_DEFS.filter((p) => input.provinceKeys.includes(p.key));
  if (defs.length === 0) throw new Error('No corpus province to publish');
  const unknown = input.provinceKeys.filter((k) => !ES_PROVINCE_DEFS.some((p) => p.key === k));
  if (unknown.length) throw new Error(`Unknown province keys: ${unknown.join(', ')}`);

  const retrievedAt = isoDay(input.now);
  const geos = ['Nacional', ...new Set(defs.map((d) => d.ccaaIne))];
  for (const geo of geos) {
    for (const dwelling of ['new', 'existing'] as const) {
      for (const measure of ['index', 'yoy'] as const) findIne(input.ine, geo, dwelling, measure);
    }
  }

  const nationalAppraisal = mivauSeries(input.mivau, { kind: 'national' });
  const national = {
    appraisal: sourcedAppraisal(nationalAppraisal, retrievedAt),
    ine_new_index: sourcedIne(findIne(input.ine, 'Nacional', 'new', 'index'), retrievedAt),
    ine_new_yoy_pct: sourcedIne(findIne(input.ine, 'Nacional', 'new', 'yoy'), retrievedAt),
    ine_existing_index: sourcedIne(findIne(input.ine, 'Nacional', 'existing', 'index'), retrievedAt),
    ine_existing_yoy_pct: sourcedIne(findIne(input.ine, 'Nacional', 'existing', 'yoy'), retrievedAt),
  };

  const provinces: ProvinceOfficial[] = defs.map((def) => {
    const appraisal = mivauSeries(input.mivau, def.mivau);
    return {
      name: def.name,
      slug: def.slug,
      key: def.key,
      cpro: def.cpro,
      nuts3: def.nuts3,
      ccaa: def.ccaaIne,
      ine_territory_equals_province: def.ineTerritoryEqualsProvince,
      appraisal: sourcedAppraisal(appraisal, retrievedAt),
      ine_new_index: sourcedIne(findIne(input.ine, def.ccaaIne, 'new', 'index'), retrievedAt),
      ine_new_yoy_pct: sourcedIne(findIne(input.ine, def.ccaaIne, 'new', 'yoy'), retrievedAt),
      ine_existing_index: sourcedIne(findIne(input.ine, def.ccaaIne, 'existing', 'index'), retrievedAt),
      ine_existing_yoy_pct: sourcedIne(findIne(input.ine, def.ccaaIne, 'existing', 'yoy'), retrievedAt),
    };
  });

  const inePeriods = [national.ine_new_yoy_pct.period, ...provinces.map((p) => p.ine_new_yoy_pct.period)].sort();
  const appraisalPeriods = [national.appraisal.period, ...provinces.map((p) => p.appraisal.period)].sort();

  return {
    status: 'ready',
    generated_at: input.now.toISOString(),
    retrieved_at: retrievedAt,
    provinces_in_corpus: defs.map((d) => d.name),
    coverage_note: COVERAGE_NOTE,
    omissions: [registradoresOmission(input.registradoresStatus), NOTARY_OMISSION],
    sources: {
      ine_ipv: {
        publisher: 'Instituto Nacional de Estadística',
        table_id: INE_TABLE_ID,
        table_url: INE_TABLE_URL,
        api: `${INE_API_BASE}/DATOS_SERIE/{cod}`,
        licence_note: 'Reuse with attribution. Fuente: INE.',
        latest_period: inePeriods[inePeriods.length - 1],
      },
      mivau_appraisal: {
        publisher: 'Ministerio de Vivienda y Agenda Urbana',
        dataset_id: MIVAU_DATASET_ID,
        url: MIVAU_CSV_URL,
        catalog_url: MIVAU_CATALOG_URL,
        licence: 'CC BY 4.0',
        regime: 'Libre',
        latest_period: appraisalPeriods[appraisalPeriods.length - 1],
        definition: 'Mean appraised value per m² of free-market housing (vivienda libre), all ages. Not a new-build price and not a transaction price.',
      },
    },
    national,
    provinces,
  };
}

/** Drop retrieval timestamps so an unchanged upstream file is not rewritten. */
export function layerFingerprint(layer: SpainLayer): string {
  return JSON.stringify(layer, (key, value) => (key === 'generated_at' || key === 'retrieved_at' ? undefined : value));
}

// ─── Comparison with Avena's own asking prices ──────────────────────────────

export const AVENA_MEDIAN_METHOD =
  'Median asking €/m² of new-build listings in the deployed corpus whose location is in the province. ' +
  '€/m² is the midpoint of the asking price range divided by built area, the same figure shown on each listing. ' +
  'Listings with no positive €/m² are counted and excluded from the median.';

export const GAP_METHOD =
  'asking_vs_appraisal_pct = (Avena median asking €/m² − official appraised €/m²) / official appraised €/m², in percent, rounded to 0.1. ' +
  'Positive means the asking median sits above the appraisal. Derived by Avena from the two inputs. It is not an official statistic.';

export const BENCHMARK_CAVEATS = [
  'Avena\'s figure is the median asking price per m² of coastal new-build listings in the current corpus, not a price at which homes have sold.',
  'The ministry figure is the mean appraised value per m² of free-market housing of all ages, for the whole province. It is not limited to new builds and not limited to the coast.',
  'INE\'s new-build housing price index is an autonomous-community index, not a euro price and not a provincial index. Provinces in the same community share it.',
  'The gap between the two euro figures mixes a coastal new-build asking price with a province-wide all-ages appraisal.',
];

export interface AskingListing {
  location: string;
  askingEurM2: number | null;
}

export function medianPositive(values: readonly number[]): number | null {
  const xs = values.filter((v) => Number.isFinite(v) && v > 0).slice().sort((a, b) => a - b);
  if (xs.length === 0) return null;
  const mid = Math.floor(xs.length / 2);
  return xs.length % 2 === 1 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
}

export function askingVsAppraisalPct(asking: number | null, appraisal: number | null): number | null {
  if (asking == null || appraisal == null) return null;
  if (!Number.isFinite(asking) || !Number.isFinite(appraisal) || !(appraisal > 0)) return null;
  return Math.round(((asking - appraisal) / appraisal) * 1000) / 10;
}

export interface ProvinceBenchmark {
  name: string;
  slug: string;
  cpro: string;
  nuts3: string;
  ccaa: string;
  ine_territory_equals_province: boolean;
  listings: number;
  unpriced_listings: number;
  avena_median_asking_eur_m2: number | null;
  appraisal: SourcedNumber | null;
  ine_new_index: SourcedNumber | null;
  ine_new_yoy_pct: SourcedNumber | null;
  ine_existing_yoy_pct: SourcedNumber | null;
  /** Derived. Null when either input is missing. Never zero-filled. */
  asking_vs_appraisal_pct: number | null;
  official: 'ready' | 'missing_from_layer';
}

export interface EsBenchmark {
  ok: true;
  status: 'ready' | 'pending';
  generated_at: string | null;
  retrieved_at: string | null;
  method: { avena_median: string; asking_vs_appraisal: string };
  caveats: string[];
  coverage_note: string | null;
  omissions: LayerOmission[];
  sources: SpainLayer['sources'] | null;
  national: SpainLayer['national'] | null;
  provinces: ProvinceBenchmark[];
  unmapped_listings: number;
  unpriced_listings: number;
}

export function buildEsBenchmark(layer: SpainLayer | null, listings: readonly AskingListing[]): EsBenchmark {
  const groups = new Map<string, { priced: number[]; unpriced: number; listings: number }>();
  let unmapped = 0;
  for (const listing of listings) {
    const def = provinceFromLocation(listing.location);
    if (!def) { unmapped++; continue; }
    let g = groups.get(def.key);
    if (!g) { g = { priced: [], unpriced: 0, listings: 0 }; groups.set(def.key, g); }
    g.listings++;
    if (listing.askingEurM2 != null && Number.isFinite(listing.askingEurM2) && listing.askingEurM2 > 0) g.priced.push(listing.askingEurM2);
    else g.unpriced++;
  }

  const officialByKey = new Map<string, ProvinceOfficial>();
  if (layer) for (const p of layer.provinces) officialByKey.set(p.key, p);

  const keys = ES_PROVINCE_DEFS.map((p) => p.key).filter((k) => groups.has(k) || officialByKey.has(k));
  const provinces: ProvinceBenchmark[] = keys.map((key) => {
    const def = ES_PROVINCE_DEFS.find((p) => p.key === key)!;
    const g = groups.get(key) ?? { priced: [], unpriced: 0, listings: 0 };
    const off = officialByKey.get(key) ?? null;
    const median = medianPositive(g.priced);
    const appraisal = off?.appraisal ?? null;
    return {
      name: def.name,
      slug: def.slug,
      cpro: def.cpro,
      nuts3: def.nuts3,
      ccaa: def.ccaaIne,
      ine_territory_equals_province: def.ineTerritoryEqualsProvince,
      listings: g.listings,
      unpriced_listings: g.unpriced,
      avena_median_asking_eur_m2: median,
      appraisal,
      ine_new_index: off?.ine_new_index ?? null,
      ine_new_yoy_pct: off?.ine_new_yoy_pct ?? null,
      ine_existing_yoy_pct: off?.ine_existing_yoy_pct ?? null,
      asking_vs_appraisal_pct: askingVsAppraisalPct(median, appraisal?.value ?? null),
      official: off ? 'ready' : 'missing_from_layer',
    };
  });

  const unpriced = provinces.reduce((n, p) => n + p.unpriced_listings, 0);
  if (!layer) {
    return {
      ok: true,
      status: 'pending',
      generated_at: null,
      retrieved_at: null,
      method: { avena_median: AVENA_MEDIAN_METHOD, asking_vs_appraisal: GAP_METHOD },
      caveats: BENCHMARK_CAVEATS,
      coverage_note: null,
      omissions: [],
      sources: null,
      national: null,
      provinces,
      unmapped_listings: unmapped,
      unpriced_listings: unpriced,
    };
  }
  return {
    ok: true,
    status: 'ready',
    generated_at: layer.generated_at,
    retrieved_at: layer.retrieved_at,
    method: { avena_median: AVENA_MEDIAN_METHOD, asking_vs_appraisal: GAP_METHOD },
    caveats: BENCHMARK_CAVEATS,
    coverage_note: layer.coverage_note,
    omissions: layer.omissions,
    sources: layer.sources,
    national: layer.national,
    provinces,
    unmapped_listings: unmapped,
    unpriced_listings: unpriced,
  };
}
