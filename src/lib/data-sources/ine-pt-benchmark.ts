/**
 * Official Portuguese housing benchmark behind /portugal/official.
 *
 * Keyless Statistics Portugal (INE) JSON API, verified against the live
 * service on 2026-11-01. Nothing here fetches. scripts/ingest-pt-ine-benchmark.ts
 * does the I/O.
 *
 *   0012248  Median bank appraisal, €/m², monthly, by NUTS 2024 geography
 *            and construction type (Total / Flats / Villas). The geography
 *            dimension includes the country, NUTS II, NUTS III and
 *            municipalities even though the title says "Municipality".
 *   0012250  Same appraisal, published year-on-year rate, %. NUTS II only.
 *            Área Metropolitana do Porto (11A) is not a valid geography.
 *   0012234  Median €/m² of dwellings sold in the last 12 months, quarterly,
 *            New / Existing / Total. "Preços da habitação ao nível local".
 *   0014765  House price index, base 2025, quarterly, national, by category.
 *   0014767  Same index, published annual rate of change, %.
 *
 * NUTS 2024 does not publish one Área Metropolitana de Lisboa. Grande Lisboa
 * (1A) and Península de Setúbal (1B) are stored separately and never added
 * together. Where a NUTS II code and its NUTS III code publish the same
 * figures, one row is kept and the other code is named. A disagreement
 * becomes two rows. A missing required cell throws: a blank table is
 * indistinguishable from a dead source, and a zero is not a blank.
 */

import { normalisePeriod } from './ine-pt';

export const INE_API = 'https://www.ine.pt/ine/json_indicador/pindica.jsp';
export const INE_META_API = 'https://www.ine.pt/ine/json_indicador/pindicaMeta.jsp';

export const APPRAISAL_INDICATOR = '0012248';
export const APPRAISAL_YOY_INDICATOR = '0012250';
export const SALES_INDICATOR = '0012234';
export const HPI_INDEX_INDICATOR = '0014765';
export const HPI_YOY_INDICATOR = '0014767';

export const APPRAISAL_CATEGORIES: Record<string, 'total' | 'flats' | 'villas'> = {
  Total: 'total',
  Flats: 'flats',
  Villas: 'villas',
};

export const HOUSING_CATEGORIES: Record<string, 'total' | 'new' | 'existing'> = {
  Total: 'total',
  New: 'new',
  Existing: 'existing',
};

const EXPECTED_GEO_NAME: Record<string, string> = {
  PT: 'Portugal',
  '15': 'Algarve',
  '150': 'Algarve',
  '1A': 'Grande Lisboa',
  '1A0': 'Grande Lisboa',
  '1B': 'Península de Setúbal',
  '1B0': 'Península de Setúbal',
  '11': 'Norte',
  '11A': 'Área Metropolitana do Porto',
  '19': 'Centro',
  '30': 'Região Autónoma da Madeira',
  '300': 'Região Autónoma da Madeira',
};

export interface PtRegionDef {
  slug: string;
  name: string;
  geo: string;
  nutsLevel: 'country' | 'nuts2' | 'nuts3';
  alias?: { geo: string; nutsLevel: 'nuts3'; name: string };
  note: string;
}

export const PT_BENCHMARK_REGIONS: PtRegionDef[] = [
  { slug: 'portugal', name: 'Portugal', geo: 'PT', nutsLevel: 'country', note: 'Country total published by INE.' },
  {
    slug: 'algarve', name: 'Algarve', geo: '15', nutsLevel: 'nuts2',
    alias: { geo: '150', nutsLevel: 'nuts3', name: 'Algarve' },
    note: 'NUTS II. INE also publishes NUTS III 150 under the same name.',
  },
  {
    slug: 'grande-lisboa', name: 'Grande Lisboa', geo: '1A', nutsLevel: 'nuts2',
    alias: { geo: '1A0', nutsLevel: 'nuts3', name: 'Grande Lisboa' },
    note: 'NUTS II. INE does not publish a single Área Metropolitana de Lisboa. This is one of the two NUTS II regions in that metro.',
  },
  {
    slug: 'setubal', name: 'Península de Setúbal', geo: '1B', nutsLevel: 'nuts2',
    alias: { geo: '1B0', nutsLevel: 'nuts3', name: 'Península de Setúbal' },
    note: 'NUTS II. The other NUTS II region in the Lisbon metro. Not added to Grande Lisboa.',
  },
  { slug: 'norte', name: 'Norte', geo: '11', nutsLevel: 'nuts2', note: 'NUTS II. The Porto metropolitan area sits inside it and is also published on its own row.' },
  {
    slug: 'porto', name: 'Área Metropolitana do Porto', geo: '11A', nutsLevel: 'nuts3',
    note: 'NUTS III inside Norte. The published year-on-year appraisal (0012250) is NUTS II only, so this row has a level and no rate.',
  },
  { slug: 'centro', name: 'Centro', geo: '19', nutsLevel: 'nuts2', note: 'NUTS II.' },
  {
    slug: 'madeira', name: 'Região Autónoma da Madeira', geo: '30', nutsLevel: 'nuts2',
    alias: { geo: '300', nutsLevel: 'nuts3', name: 'Região Autónoma da Madeira' },
    note: 'NUTS II. INE also publishes NUTS III 300 under the same name.',
  },
];

export function benchmarkGeos(): string[] {
  const geos: string[] = [];
  for (const region of PT_BENCHMARK_REGIONS) {
    geos.push(region.geo);
    if (region.alias) geos.push(region.alias.geo);
  }
  return geos;
}

export interface IneObs {
  period: string;
  geo: string;
  name: string;
  category: string;
  value: number | null;
}

export interface IneBenchmarkParsed {
  indicator: string;
  title: string;
  infoUrl: string;
  lastUpdated: string;
  extractedAt: string;
  latestPeriod: string;
  rows: IneObs[];
}

export function ineInfoUrl(indicator: string): string {
  return `https://www.ine.pt/bddXplorer/htdocs/minfo.jsp?var_cd=${indicator}&lingua=EN`;
}

export function ineDataUrl(indicator: string, dims: { dim2?: string; dim3?: string }): string {
  // Commas stay literal. INE treats Dim2=PT,15 as several geographies, and
  // URLSearchParams would turn that comma into %2C.
  const parts = [`op=2`, `varcd=${indicator}`, `Dim1=T`];
  if (dims.dim2) parts.push(`Dim2=${dims.dim2}`);
  if (dims.dim3) parts.push(`Dim3=${dims.dim3}`);
  parts.push('lang=EN');
  return `${INE_API}?${parts.join('&')}`;
}

/** Unit label as INE prints it on the metadata payload. */
export function ineMetaUnit(json: unknown, expectedCode: string): string {
  const unit = oneIndicator(json, expectedCode).UnidadeMedida;
  if (typeof unit !== 'string' || !unit.trim()) throw new Error(`INE ${expectedCode} metadata has no unit`);
  return unit;
}

/** Geography codes on an INE metadata payload (pindicaMeta.jsp). */
export function ineMetaGeoCodes(json: unknown, expectedCode: string): Set<string> {
  const x = oneIndicator(json, expectedCode);
  const dims = x.Dimensoes as { Categoria_Dim?: unknown } | undefined;
  const block = Array.isArray(dims?.Categoria_Dim) ? dims!.Categoria_Dim[0] : null;
  if (!block || typeof block !== 'object') throw new Error(`INE ${expectedCode} metadata has no category block`);
  const codes = new Set<string>();
  for (const value of Object.values(block as Record<string, unknown>)) {
    const row = Array.isArray(value) ? value[0] : null;
    if (!row || typeof row !== 'object') continue;
    const rec = row as Record<string, unknown>;
    if (String(rec.dim_num) !== '2') continue;
    if (typeof rec.categ_cod !== 'string' || !rec.categ_cod) throw new Error(`INE ${expectedCode} geography category has no code`);
    codes.add(rec.categ_cod);
  }
  if (codes.size === 0) throw new Error(`INE ${expectedCode} metadata lists no geographies`);
  return codes;
}

function oneIndicator(json: unknown, expectedCode: string): Record<string, unknown> {
  if (!Array.isArray(json) || json.length !== 1 || typeof json[0] !== 'object' || json[0] === null) {
    throw new Error(`INE ${expectedCode} response is not a one-element array`);
  }
  const x = json[0] as Record<string, unknown>;
  const code = String(x.IndicadorCod ?? '');
  if (code !== expectedCode) throw new Error(`INE indicator mismatch: wanted ${expectedCode}, got ${code || '(none)'}`);
  const sucesso = x.Sucesso as { Verdadeiro?: unknown; Falso?: { Msg?: string }[] } | undefined;
  if (!sucesso?.Verdadeiro) {
    const msg = sucesso?.Falso?.[0]?.Msg ?? JSON.stringify(sucesso ?? null);
    throw new Error(`INE ${expectedCode} did not report success: ${msg}`);
  }
  return x;
}

/**
 * Parse an INE op=2 payload. `categories` maps the English dim_3_t label onto
 * our key. An unknown label, a non-numeric valor, or a latest-period mismatch
 * throws. A blank valor stays null.
 */
export function parseIneBenchmark(
  json: unknown,
  expectedCode: string,
  categories: Record<string, string>,
): IneBenchmarkParsed {
  const x = oneIndicator(json, expectedCode);
  const dados = x.Dados as Record<string, unknown> | undefined;
  if (!dados || typeof dados !== 'object' || Object.keys(dados).length === 0) {
    throw new Error(`INE ${expectedCode} returned no Dados`);
  }
  const rows: IneObs[] = [];
  const seen = new Set<string>();
  for (const [label, list] of Object.entries(dados)) {
    const period = normalisePeriod(label);
    if (!Array.isArray(list) || list.length === 0) throw new Error(`INE ${expectedCode} period ${label} is empty`);
    for (const raw of list) {
      if (!raw || typeof raw !== 'object') throw new Error(`INE ${expectedCode} row is not an object`);
      const r = raw as Record<string, unknown>;
      const geo = r.geocod;
      const name = r.geodsg;
      if (typeof geo !== 'string' || typeof name !== 'string' || !geo) {
        throw new Error(`INE ${expectedCode} row missing geocod/geodsg`);
      }
      const labelCat = r.dim_3_t;
      if (typeof labelCat !== 'string' || !(labelCat in categories)) {
        throw new Error(`INE ${expectedCode} unknown category "${String(labelCat)}" for ${geo}`);
      }
      const category = categories[labelCat];
      let value: number | null = null;
      if (r.valor !== undefined && r.valor !== null && r.valor !== '') {
        const v = typeof r.valor === 'number' ? r.valor : Number(r.valor);
        if (!Number.isFinite(v)) throw new Error(`INE ${expectedCode} non-numeric value "${String(r.valor)}" for ${geo} ${category}`);
        value = v;
      }
      const key = `${period}|${geo}|${category}`;
      if (seen.has(key)) throw new Error(`INE ${expectedCode} duplicate ${key}`);
      seen.add(key);
      rows.push({ period, geo, name, category, value });
    }
  }
  const periods = [...new Set(rows.map((r) => r.period))].sort();
  const latestPeriod = normalisePeriod(String(x.UltimoPref ?? ''));
  if (periods[periods.length - 1] !== latestPeriod) {
    throw new Error(`INE ${expectedCode} latest period ${latestPeriod} is not the last period in Dados (${periods[periods.length - 1]})`);
  }
  if (!rows.some((r) => r.value !== null)) throw new Error(`INE ${expectedCode} has no numeric values`);
  const infoUrl = String(x.MetaInfUrl ?? '');
  if (!infoUrl.includes(expectedCode)) throw new Error(`INE ${expectedCode} MetaInfUrl does not name the indicator: "${infoUrl}"`);
  const lastUpdated = String(x.DataUltimoAtualizacao ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lastUpdated)) throw new Error(`INE ${expectedCode} last-updated date not understood: "${lastUpdated}"`);
  const extractedAt = String(x.DataExtracao ?? '');
  if (!extractedAt) throw new Error(`INE ${expectedCode} has no DataExtracao`);
  return {
    indicator: expectedCode,
    title: String(x.IndicadorDsg ?? ''),
    infoUrl,
    lastUpdated,
    extractedAt,
    latestPeriod,
    rows,
  };
}

export interface SourcedPt {
  value: number;
  unit: 'eur_per_m2' | 'pct' | 'index';
  unit_label: string;
  period: string;
  series_id: string;
  indicator: string;
  source: 'ine_pt';
  source_name: 'INE Portugal';
  source_url: string;
  retrieved_at: string;
}

export interface PtSeriesSource {
  indicator: string;
  title: string;
  info_url: string;
  api_url: string;
  unit_label: string;
  last_updated: string;
  extracted_at: string;
  fetched_at: string;
  latest_period: string;
  first_period: string;
}

export interface PtLevelTriple {
  total: SourcedPt;
  flats: SourcedPt;
  villas: SourcedPt;
}

export interface PtSalesTriple {
  new: SourcedPt;
  existing: SourcedPt;
  total: SourcedPt;
}

export interface PtHpiQuarter {
  period: string;
  index: { total: number | null; new: number | null; existing: number | null };
  yoy_pct: { total: number | null; new: number | null; existing: number | null };
}

export interface PtBenchmarkRegion {
  slug: string;
  name: string;
  geo: string;
  nuts_level: PtRegionDef['nutsLevel'];
  also_published_as: { geo: string; nuts_level: 'nuts3'; name: string } | null;
  note: string;
  appraisal_eur_m2: PtLevelTriple;
  /** Published 0012250 rate. Null when that indicator has no row for this geography. Never derived. */
  appraisal_yoy_pct: SourcedPt | null;
  sales_eur_m2: PtSalesTriple;
  appraisal_series: { period: string; total: number | null }[];
  appraisal_yoy_series: { period: string; value: number | null }[] | null;
  sales_series: { period: string; new: number | null; existing: number | null; total: number | null }[];
}

export interface PtOmission {
  source: string;
  indicator: string | null;
  url: string | null;
  ingested: false;
  reason: string;
}

export interface PtBenchmarkLayer {
  status: 'ready';
  generated_at: string;
  licence: string;
  sources: {
    appraisal: PtSeriesSource;
    appraisal_yoy: PtSeriesSource;
    sales: PtSeriesSource;
    hpi_index: PtSeriesSource;
    hpi_yoy: PtSeriesSource;
  };
  regions: PtBenchmarkRegion[];
  hpi: {
    base_year: string;
    geography: 'PT';
    note: string;
    latest: {
      period: string;
      index: { total: SourcedPt; new: SourcedPt; existing: SourcedPt };
      yoy_pct: { total: SourcedPt; new: SourcedPt; existing: SourcedPt };
    };
    quarters: PtHpiQuarter[];
  };
  omissions: PtOmission[];
  caveats: string[];
}

export interface BenchmarkInputs {
  generatedAt: string;
  appraisal: IneBenchmarkParsed;
  appraisalApiUrl: string;
  appraisalUnit: string;
  appraisalFetchedAt: string;
  appraisalYoy: IneBenchmarkParsed;
  appraisalYoyApiUrl: string;
  appraisalYoyUnit: string;
  appraisalYoyFetchedAt: string;
  /** Geographies the 0012250 metadata actually lists. Porto is absent. */
  appraisalYoyGeos: readonly string[];
  sales: IneBenchmarkParsed;
  salesApiUrl: string;
  salesUnit: string;
  salesFetchedAt: string;
  hpiIndex: IneBenchmarkParsed;
  hpiIndexApiUrl: string;
  hpiIndexUnit: string;
  hpiIndexFetchedAt: string;
  hpiYoy: IneBenchmarkParsed;
  hpiYoyApiUrl: string;
  hpiYoyUnit: string;
  hpiYoyFetchedAt: string;
}

const LICENCE = 'INE data, CC BY 4.0. Attribution: Fonte: INE.';

const CAVEATS = [
  'The bank appraisal is the median euro per m² from INE’s Survey on bank evaluation on housing. It is a valuation, not a price at which a home sold. Total, Flats and Villas are construction types. They are not a new-versus-existing split.',
  'The sale price is the median euro per m² of dwellings sold in the last 12 months (indicator 0012234), split New and Existing. It comes from a different operation and a different calendar from the appraisal.',
  'The house price index is national, base 2025, and split New and Existing. It is not a euro price and INE does not publish it by NUTS region.',
  'Área Metropolitana de Lisboa is not a NUTS 2024 geography. Grande Lisboa and Península de Setúbal are separate rows. They are not added together.',
  'A year-on-year appraisal rate is the figure INE publishes in indicator 0012250. Where that indicator has no geography, the rate is left empty. It is not computed from the level.',
  'This file does not contain Avena asking prices. The Spain comparison is joined when the page and the JSON route are rendered.',
];

function day(iso: string): string {
  const dayPart = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayPart)) throw new Error(`fetch timestamp is not a date: "${iso}"`);
  return dayPart;
}

function sourceOf(parsed: IneBenchmarkParsed, apiUrl: string, unitLabel: string, fetchedAt: string): PtSeriesSource {
  const periods = [...new Set(parsed.rows.map((r) => r.period))].sort();
  return {
    indicator: parsed.indicator,
    title: parsed.title,
    info_url: parsed.infoUrl,
    api_url: apiUrl,
    unit_label: unitLabel,
    last_updated: parsed.lastUpdated,
    extracted_at: parsed.extractedAt,
    fetched_at: fetchedAt,
    latest_period: parsed.latestPeriod,
    first_period: periods[0],
  };
}

function cell(rows: IneObs[], geo: string, category: string, period: string): IneObs | null {
  return rows.find((r) => r.geo === geo && r.category === category && r.period === period) ?? null;
}

function requireCell(parsed: IneBenchmarkParsed, geo: string, category: string): IneObs {
  const row = cell(parsed.rows, geo, category, parsed.latestPeriod);
  const expected = EXPECTED_GEO_NAME[geo];
  if (!row) throw new Error(`INE ${parsed.indicator} has no ${category} for ${geo} at ${parsed.latestPeriod}`);
  if (expected && row.name !== expected) {
    throw new Error(`INE ${parsed.indicator} geography ${geo} is named "${row.name}", expected "${expected}"`);
  }
  if (row.value === null) throw new Error(`INE ${parsed.indicator} ${geo} ${category} is blank at ${parsed.latestPeriod}`);
  return row;
}

function sourced(
  parsed: IneBenchmarkParsed,
  row: IneObs,
  unit: SourcedPt['unit'],
  unitLabel: string,
  fetchedAt: string,
): SourcedPt {
  return {
    value: row.value as number,
    unit,
    unit_label: unitLabel,
    period: row.period,
    series_id: `INE:${parsed.indicator}:${row.geo}:${row.category}`,
    indicator: parsed.indicator,
    source: 'ine_pt',
    source_name: 'INE Portugal',
    source_url: parsed.infoUrl,
    retrieved_at: day(fetchedAt),
  };
}

function seriesMap(rows: IneObs[], geo: string, category: string): Map<string, number | null> {
  const out = new Map<string, number | null>();
  for (const row of rows) {
    if (row.geo === geo && row.category === category) out.set(row.period, row.value);
  }
  return out;
}

function mapsEqual(a: Map<string, number | null>, b: Map<string, number | null>): boolean {
  if (a.size !== b.size) return false;
  for (const [period, value] of a) {
    if (!b.has(period) || b.get(period) !== value) return false;
  }
  return true;
}

function territoryMatches(appraisal: IneObs[], sales: IneObs[], geo: string, alias: string): boolean {
  for (const category of ['total', 'flats', 'villas']) {
    if (!mapsEqual(seriesMap(appraisal, geo, category), seriesMap(appraisal, alias, category))) return false;
  }
  for (const category of ['new', 'existing', 'total']) {
    if (!mapsEqual(seriesMap(sales, geo, category), seriesMap(sales, alias, category))) return false;
  }
  return true;
}

function sortedPeriods(map: Map<string, number | null>): string[] {
  return [...map.keys()].sort();
}

function baseYear(indexTitle: string, yoyTitle: string): string {
  const read = (title: string) => {
    const m = /Base\s*-?\s*(\d{4})/.exec(title);
    if (!m) throw new Error(`house price index title has no base year: "${title}"`);
    return m[1];
  };
  const a = read(indexTitle);
  const b = read(yoyTitle);
  if (a !== b) throw new Error(`house price index base years disagree: ${a} and ${b}`);
  return a;
}

function hpiValue(parsed: IneBenchmarkParsed, category: 'total' | 'new' | 'existing', period: string): number | null {
  const row = cell(parsed.rows, 'PT', category, period);
  return row ? row.value : null;
}

export function buildPtBenchmarkLayer(input: BenchmarkInputs): PtBenchmarkLayer {
  for (const region of PT_BENCHMARK_REGIONS) {
    for (const geo of [region.geo, region.alias?.geo].filter((g): g is string => !!g)) {
      requireCell(input.appraisal, geo, 'total');
      requireCell(input.appraisal, geo, 'flats');
      requireCell(input.appraisal, geo, 'villas');
      requireCell(input.sales, geo, 'new');
      requireCell(input.sales, geo, 'existing');
      requireCell(input.sales, geo, 'total');
    }
  }
  const yoyGeos = new Set(input.appraisalYoyGeos);
  if (!yoyGeos.has('PT') || !yoyGeos.has('15') || !yoyGeos.has('11') || !yoyGeos.has('19') || !yoyGeos.has('1A') || !yoyGeos.has('1B') || !yoyGeos.has('30')) {
    throw new Error(`INE ${APPRAISAL_YOY_INDICATOR} metadata is missing a required NUTS II geography`);
  }
  if (yoyGeos.has('11A')) {
    throw new Error(`INE ${APPRAISAL_YOY_INDICATOR} now lists 11A. The Porto omission has to be revised before publishing.`);
  }
  for (const geo of ['PT', '15', '11', '19', '1A', '1B', '30']) {
    requireCell(input.appraisalYoy, geo, 'total');
  }

  for (const category of ['total', 'new', 'existing'] as const) {
    requireCell(input.hpiIndex, 'PT', category);
    requireCell(input.hpiYoy, 'PT', category);
  }
  if (input.hpiIndex.latestPeriod !== input.hpiYoy.latestPeriod) {
    throw new Error(`house price index period ${input.hpiIndex.latestPeriod} does not match the annual-change period ${input.hpiYoy.latestPeriod}`);
  }

  const regions: PtBenchmarkRegion[] = [];
  for (const def of PT_BENCHMARK_REGIONS) {
    const publishAlias = def.alias
      ? territoryMatches(input.appraisal.rows, input.sales.rows, def.geo, def.alias.geo)
      : false;
    const geos = def.alias && !publishAlias ? [def.geo, def.alias.geo] : [def.geo];
    for (const geo of geos) {
      const aliasRow = geo === def.geo;
      const nutsLevel = aliasRow ? def.nutsLevel : 'nuts3';
      const name = aliasRow ? def.name : (def.alias?.name ?? def.name);
      const slug = aliasRow ? def.slug : `${def.slug}-nuts3`;
      const splitNote = !aliasRow
        ? `NUTS III ${geo}. Its figures are not the same as NUTS II ${def.geo}, so it is shown separately.`
        : def.note;
      const yoyRow = yoyGeos.has(geo) ? requireCell(input.appraisalYoy, geo, 'total') : null;
      const totalSeries = seriesMap(input.appraisal.rows, geo, 'total');
      const yoySeries = yoyRow ? seriesMap(input.appraisalYoy.rows, geo, 'total') : null;
      const salesNew = seriesMap(input.sales.rows, geo, 'new');
      const salesExisting = seriesMap(input.sales.rows, geo, 'existing');
      const salesTotal = seriesMap(input.sales.rows, geo, 'total');
      const salesPeriods = [...new Set([...salesNew.keys(), ...salesExisting.keys(), ...salesTotal.keys()])].sort();
      regions.push({
        slug,
        name,
        geo,
        nuts_level: nutsLevel,
        also_published_as: aliasRow && publishAlias && def.alias
          ? { geo: def.alias.geo, nuts_level: 'nuts3', name: def.alias.name }
          : null,
        note: splitNote,
        appraisal_eur_m2: {
          total: sourced(input.appraisal, requireCell(input.appraisal, geo, 'total'), 'eur_per_m2', input.appraisalUnit, input.appraisalFetchedAt),
          flats: sourced(input.appraisal, requireCell(input.appraisal, geo, 'flats'), 'eur_per_m2', input.appraisalUnit, input.appraisalFetchedAt),
          villas: sourced(input.appraisal, requireCell(input.appraisal, geo, 'villas'), 'eur_per_m2', input.appraisalUnit, input.appraisalFetchedAt),
        },
        appraisal_yoy_pct: yoyRow
          ? sourced(input.appraisalYoy, yoyRow, 'pct', input.appraisalYoyUnit, input.appraisalYoyFetchedAt)
          : null,
        sales_eur_m2: {
          new: sourced(input.sales, requireCell(input.sales, geo, 'new'), 'eur_per_m2', input.salesUnit, input.salesFetchedAt),
          existing: sourced(input.sales, requireCell(input.sales, geo, 'existing'), 'eur_per_m2', input.salesUnit, input.salesFetchedAt),
          total: sourced(input.sales, requireCell(input.sales, geo, 'total'), 'eur_per_m2', input.salesUnit, input.salesFetchedAt),
        },
        appraisal_series: sortedPeriods(totalSeries).map((period) => ({ period, total: totalSeries.get(period) ?? null })),
        appraisal_yoy_series: yoySeries
          ? sortedPeriods(yoySeries).map((period) => ({ period, value: yoySeries.get(period) ?? null }))
          : null,
        sales_series: salesPeriods.map((period) => ({
          period,
          new: salesNew.get(period) ?? null,
          existing: salesExisting.get(period) ?? null,
          total: salesTotal.get(period) ?? null,
        })),
      });
    }
  }

  const indexPeriods = [...new Set(input.hpiIndex.rows.filter((r) => r.geo === 'PT').map((r) => r.period))].sort();
  const yoyPeriods = new Set(input.hpiYoy.rows.filter((r) => r.geo === 'PT').map((r) => r.period));
  const quarters: PtHpiQuarter[] = indexPeriods.map((period) => ({
    period,
    index: {
      total: hpiValue(input.hpiIndex, 'total', period),
      new: hpiValue(input.hpiIndex, 'new', period),
      existing: hpiValue(input.hpiIndex, 'existing', period),
    },
    yoy_pct: yoyPeriods.has(period)
      ? {
          total: hpiValue(input.hpiYoy, 'total', period),
          new: hpiValue(input.hpiYoy, 'new', period),
          existing: hpiValue(input.hpiYoy, 'existing', period),
        }
      : { total: null, new: null, existing: null },
  }));
  const latestPeriod = input.hpiIndex.latestPeriod;
  const latestQuarter = quarters[quarters.length - 1];
  if (!latestQuarter || latestQuarter.period !== latestPeriod) throw new Error('house price index latest quarter missing');
  for (const side of ['index', 'yoy_pct'] as const) {
    for (const category of ['total', 'new', 'existing'] as const) {
      if (latestQuarter[side][category] === null) throw new Error(`house price index ${side} ${category} is blank at ${latestPeriod}`);
    }
  }

  const omissions: PtOmission[] = [
    {
      source: 'Área Metropolitana de Lisboa',
      indicator: null,
      url: ineInfoUrl(APPRAISAL_INDICATOR),
      ingested: false,
      reason: 'NUTS 2024 does not publish that geography. Grande Lisboa (1A) and Península de Setúbal (1B) are the two NUTS II regions. They are not summed.',
    },
    {
      source: 'House price index by region',
      indicator: HPI_INDEX_INDICATOR,
      url: ineInfoUrl(HPI_INDEX_INDICATOR),
      ingested: false,
      reason: 'Indicators 0014765 and 0014767 are national. INE does not publish the new-versus-existing house price index by NUTS region in these series.',
    },
  ];
  if (!yoyGeos.has('11A')) {
    omissions.push({
      source: 'Bank appraisal year-on-year rate, Área Metropolitana do Porto',
      indicator: APPRAISAL_YOY_INDICATOR,
      url: ineInfoUrl(APPRAISAL_YOY_INDICATOR),
      ingested: false,
      reason: 'Indicator 0012250 is NUTS II. Code 11A is not a valid geography on it. The Porto level is indicator 0012248. No rate is derived from that level.',
    });
  }

  return {
    status: 'ready',
    generated_at: input.generatedAt,
    licence: LICENCE,
    sources: {
      appraisal: sourceOf(input.appraisal, input.appraisalApiUrl, input.appraisalUnit, input.appraisalFetchedAt),
      appraisal_yoy: sourceOf(input.appraisalYoy, input.appraisalYoyApiUrl, input.appraisalYoyUnit, input.appraisalYoyFetchedAt),
      sales: sourceOf(input.sales, input.salesApiUrl, input.salesUnit, input.salesFetchedAt),
      hpi_index: sourceOf(input.hpiIndex, input.hpiIndexApiUrl, input.hpiIndexUnit, input.hpiIndexFetchedAt),
      hpi_yoy: sourceOf(input.hpiYoy, input.hpiYoyApiUrl, input.hpiYoyUnit, input.hpiYoyFetchedAt),
    },
    regions,
    hpi: {
      base_year: baseYear(input.hpiIndex.title, input.hpiYoy.title),
      geography: 'PT',
      note: 'National house price index. New and existing are the categories INE publishes. The index is not a euro price.',
      latest: {
        period: latestPeriod,
        index: {
          total: sourced(input.hpiIndex, requireCell(input.hpiIndex, 'PT', 'total'), 'index', input.hpiIndexUnit, input.hpiIndexFetchedAt),
          new: sourced(input.hpiIndex, requireCell(input.hpiIndex, 'PT', 'new'), 'index', input.hpiIndexUnit, input.hpiIndexFetchedAt),
          existing: sourced(input.hpiIndex, requireCell(input.hpiIndex, 'PT', 'existing'), 'index', input.hpiIndexUnit, input.hpiIndexFetchedAt),
        },
        yoy_pct: {
          total: sourced(input.hpiYoy, requireCell(input.hpiYoy, 'PT', 'total'), 'pct', input.hpiYoyUnit, input.hpiYoyFetchedAt),
          new: sourced(input.hpiYoy, requireCell(input.hpiYoy, 'PT', 'new'), 'pct', input.hpiYoyUnit, input.hpiYoyFetchedAt),
          existing: sourced(input.hpiYoy, requireCell(input.hpiYoy, 'PT', 'existing'), 'pct', input.hpiYoyUnit, input.hpiYoyFetchedAt),
        },
      },
      quarters,
    },
    omissions,
    caveats: CAVEATS,
  };
}

export function layerFingerprint(layer: PtBenchmarkLayer): string {
  return JSON.stringify(layer, (key, value) => (
    key === 'generated_at' || key === 'fetched_at' || key === 'retrieved_at' || key === 'extracted_at' ? undefined : value
  ));
}

// ─── Read-time join: listing coverage and the Spain coast ───────────────────

const PORTUGAL_PLACE = new Set([
  'portugal',
  'algarve',
  'lisboa',
  'lisbon',
  'grande lisboa',
  'peninsula de setubal',
  'setubal',
  'madeira',
  'funchal',
  'area metropolitana do porto',
  'porto',
  'faro',
]);

export function foldPlace(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** A listing counts as Portuguese only when the string says Portugal, or the last place is one of the regions this layer publishes. */
export function isPortugueseLocation(location: string): boolean {
  const folded = foldPlace(location);
  if (!folded) return false;
  if (folded.includes('portugal')) return true;
  const last = foldPlace(location.split(',').pop() ?? '');
  return PORTUGAL_PLACE.has(last);
}

export interface SpainCoastComparison {
  name: string;
  slug: string;
  ccaa: string;
  listings: number;
  avena_median_asking_eur_m2: number | null;
  appraisal_eur_m2: number | null;
  appraisal_period: string | null;
  appraisal_series_id: string | null;
  appraisal_source_name: string | null;
  appraisal_source_url: string | null;
  appraisal_retrieved_at: string | null;
  asking_vs_appraisal_pct: number | null;
}

export interface PtOfficialView extends PtBenchmarkLayer {
  listing_book: number;
  portuguese_listings: number;
  coverage_note: string;
  spain_coast: SpainCoastComparison[];
  spain_coast_note: string;
  spain_gap_method: string;
}

export function assemblePtOfficialView(
  layer: PtBenchmarkLayer,
  locations: readonly string[],
  spainCoast: readonly SpainCoastComparison[],
  spainGapMethod: string,
): PtOfficialView {
  const portuguese = locations.filter((location) => isPortugueseLocation(location)).length;
  const coverage_note = portuguese === 0
    ? `Avena does not publish Portuguese listings. The listing book on this deployment has ${locations.length.toLocaleString('en-GB')} listings and none with a Portugal place name. This page is official reference data from Statistics Portugal, plus the Spanish coastal provinces already in the Avena book. It is not Avena coverage of Portugal.`
    : `The listing book on this deployment has ${locations.length.toLocaleString('en-GB')} listings, of which ${portuguese.toLocaleString('en-GB')} match a Portugal place name. This page does not compute a Portugal asking-price median from them. The figures below are official Statistics Portugal series. The Spain table is the coastal book already published on /spain/official.`;
  return {
    ...layer,
    listing_book: locations.length,
    portuguese_listings: portuguese,
    coverage_note,
    spain_coast: spainCoast.filter((row) => row.listings > 0),
    spain_coast_note: 'Spanish coastal provinces in the current Avena listing book. The asking figure is the Avena median euro per m². The appraisal is the Spanish ministry figure. The gap is derived. None of these rows are Portuguese listings.',
    spain_gap_method: spainGapMethod,
  };
}
