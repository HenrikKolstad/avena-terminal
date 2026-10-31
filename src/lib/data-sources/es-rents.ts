/**
 * Official Spanish residential rents for the provinces Avena covers.
 *
 * Two keyless sources, both required before a layer is published:
 *
 *   - Ministerio de Vivienda y Agenda Urbana, Sistema Estatal de Referencia
 *     del Precio del Alquiler de Vivienda (SERPAVI). The workbook linked
 *     from the ministry page (the "BD Sistema Estatal Índices de Alquiler
 *     de Vivienda" download). Habitual-residence rents from tax returns
 *     joined to the cadastre, 2011 through the last year in the file.
 *     Province and municipality sheets. Collective dwellings (flats) and
 *     single-family dwellings, each with a count, a median €/m²/month, the
 *     25th and 75th percentiles, a median monthly rent and a median surface.
 *     Census sections and districts in the same workbook are not read.
 *   - INE, Índice de Precios de la Vivienda en Alquiler (IPVA), base 2015,
 *     table 59058. Provincial index and the published annual change, for
 *     the total, for collective dwellings and for single-family dwellings.
 *     JSON API: servicios.ine.es/wstempus. Reuse with attribution
 *     ("Fuente: INE"). The annual-change series is named Variación anual.
 *     INE labels its unit Índice, the same label as the index series. The
 *     value is the published percent. It is not a ratio computed here.
 *
 * A blank cell stays blank. A zero is not written in its place. A count
 * with no prices is a withheld distribution, not a rent of zero.
 *
 * Network I/O lives in scripts/ingest-es-rents.ts. Nothing here fetches.
 */

import { ES_PROVINCE_DEFS, latestPoint, medianPositive, provinceFromLocation, type InePoint, type ProvinceDef } from './ine-es';
import { MIN_PRICED_LISTINGS, municipalityKeys, townGroupKey } from './es-town-gap';

export { MIN_PRICED_LISTINGS, medianPositive, provinceFromLocation, townGroupKey };

export const SERPAVI_PAGE_URL = 'https://www.mivau.gob.es/vivienda/alquila-bien-es-tu-derecho/serpavi';
export const INE_IPVA_TABLE_ID = '59058';
export const INE_IPVA_TABLE_URL = 'https://www.ine.es/jaxiT3/Tabla.htm?t=59058';
export const INE_IPVA_API = `https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/${INE_IPVA_TABLE_ID}?tip=AM`;
export const INE_API_BASE = 'https://servicios.ine.es/wstempus/js/ES';

/** Annual Tempus code. Checked against live IPVA Fecha values: FK 28, NombrePeriodo "2024". */
const ANNUAL_FK = 28;

/** How IPVA names each province. Not the autonomous community. */
export const IPVA_GEO_BY_PROVINCE: Record<string, string> = {
  malaga: 'Málaga',
  alicante: 'Alicante/Alacant',
  murcia: 'Murcia',
  almeria: 'Almería',
  granada: 'Granada',
  cadiz: 'Cádiz',
  valencia: 'Valencia/València',
  castellon: 'Castellón/Castelló',
};

export const IPVA_NATIONAL_GEO = 'Total Nacional';

/**
 * Feed spellings that are the workbook's municipality under another name.
 * Checked against the workbook. A shorter name is not joined in general:
 * Orihuela Costa is not Orihuela, and Puerto de Mazarrón is not Mazarrón.
 */
const EXTRA_KEYS_BY_OFFICIAL_NAME: Record<string, readonly string[]> = {
  Calp: ['calpe'],
  "Alfàs del Pi, l'": ['alfas del pi'],
  'Fuente Álamo de Murcia': ['fuente alamo'],
  "Sant Joan d'Alacant": ['san juan alicante'],
};

export const ALIAS_NOTE =
  'Four feed spellings are joined to the workbook name of the same municipality: Calpe to Calp, Alfas del Pi to Alfàs del Pi, l\', Fuente Álamo to Fuente Álamo de Murcia, and San Juan Alicante to Sant Joan d\'Alacant. No other shorter name is joined. A district or an urbanisation is not given the municipality\'s rent. A short key that two municipalities in the same province share is dropped and matches neither.';

const STEMS = [
  'BI_ALVHEPCO_TVC', 'BI_ALVHEPCO_TVU',
  'ALQM2_LV_M_VC', 'ALQM2_LV_25_VC', 'ALQM2_LV_75_VC',
  'ALQM2_LV_M_VU', 'ALQM2_LV_25_VU', 'ALQM2_LV_75_VU',
  'ALQTBID12_M_VC', 'ALQTBID12_25_VC', 'ALQTBID12_75_VC',
  'ALQTBID12_M_VU', 'ALQTBID12_25_VU', 'ALQTBID12_75_VU',
  'SLVM2_M_VC', 'SLVM2_M_VU',
] as const;

const METADATA_CODES = ['BI_ALVHEPCO_TVC_AA', 'ALQM2mes_LV_M_VC_AA', 'ALQTBID12_M_VC_AA', 'SLVM2_M_VC_AA'] as const;

export type Cell = string | number | null;

export type IpvaDwelling = 'total' | 'colectiva' | 'unifamiliar';
export type IpvaMeasure = 'index' | 'yoy';

export interface Percentiles {
  median: number;
  p25: number;
  p75: number;
}

export interface DwellingRent {
  dwelling: 'colectiva' | 'unifamiliar';
  contracts: number;
  /** True when the workbook prints a count and leaves the prices blank. */
  withheld: boolean;
  eur_m2_month: Percentiles | null;
  monthly_eur: Percentiles | null;
  surface_m2_median: number | null;
  fields: {
    contracts: string;
    eur_m2_month_median: string;
    monthly_eur_median: string;
    surface_m2_median: string;
  };
}

export interface RentSourced {
  value: number;
  unit: 'index' | 'pct';
  /** Unit name as INE labels it. The annual change is also labelled Índice. */
  unit_label: string;
  period: string;
  series_id: string;
  source_name: string;
  source_url: string;
  retrieved_at: string;
  provisional: boolean | null;
}

export interface ProvinceRent {
  key: string;
  name: string;
  slug: string;
  cpro: string;
  serpavi_name: string;
  colectiva: DwellingRent | null;
  unifamiliar: DwellingRent | null;
  ipva_total_index: RentSourced;
  ipva_total_yoy_pct: RentSourced;
  ipva_colectiva_index: RentSourced;
  ipva_colectiva_yoy_pct: RentSourced;
  ipva_unifamiliar_index: RentSourced;
  ipva_unifamiliar_yoy_pct: RentSourced;
}

export interface MunicipalityRent {
  cumun: string;
  name: string;
  cpro: string;
  province_key: string;
  province: string;
  /** Match keys that belong to this municipality alone. A shared short key is omitted. */
  keys: string[];
  colectiva: DwellingRent | null;
  unifamiliar: DwellingRent | null;
}

export interface AmbiguousKey {
  province_key: string;
  key: string;
  names: string[];
}

export interface RentOmission {
  source: string;
  url: string | null;
  ingested: false;
  reason: string;
}

export interface SpainRentLayer {
  status: 'ready';
  generated_at: string;
  retrieved_at: string;
  serpavi_year: number;
  ipva_period: string;
  provinces_in_corpus: string[];
  coverage_note: string;
  caveats: string[];
  alias_note: string;
  ambiguous_keys: AmbiguousKey[];
  method: {
    serpavi: string;
    ipva: string;
    rounding: string;
    avena_asking: string;
    avena_gross_yield: string;
    implied_yield: string;
  };
  omissions: RentOmission[];
  sources: {
    serpavi: {
      publisher: string;
      dataset: string;
      page_url: string;
      file_url: string;
      methodology_url: string;
      methodology_urls: string[];
      year: number;
      file_year_span: { from: number; to: number } | null;
      licence_note: string;
    };
    ipva: {
      publisher: string;
      table_id: string;
      table_url: string;
      api_url: string;
      period: string;
      licence_note: string;
    };
  };
  national: {
    ipva_total_index: RentSourced;
    ipva_total_yoy_pct: RentSourced;
    ipva_colectiva_index: RentSourced;
    ipva_colectiva_yoy_pct: RentSourced;
    ipva_unifamiliar_index: RentSourced;
    ipva_unifamiliar_yoy_pct: RentSourced;
  };
  provinces: ProvinceRent[];
  municipalities: MunicipalityRent[];
}

export const COVERAGE_NOTE =
  'Habitual-residence rents from the ministry SERPAVI workbook, at province and municipality, sit beside the INE rental-price index and beside Avena\'s new-build asking prices. ' +
  'The rent is the median €/m²/month of dwellings with rental income on the personal-income-tax return, joined to the cadastre. It is not a holiday let and it is not the rent of these listings. ' +
  'The implied yield annualises that official €/m² and divides it by the Avena median asking €/m². Avena computes it. The ministry does not publish it. ' +
  'Avena\'s own gross yield is the short-stay estimate already on each listing, shown separately.';

export const RENT_CAVEATS = [
  'SERPAVI is the ministry\'s exploitation of tax returns for habitual-residence lets, joined to the cadastre. It is not a portal asking rent, not a holiday let, and not the rent of a new-build listing in the Avena book.',
  'The collective-dwelling figure is flats. The single-family figure is houses. Avena\'s asking median mixes both. The implied yield uses the flat rent. The house rent is shown beside it and is not silently copied into that yield.',
  'A blank price next to a positive count is withheld by the workbook. It stays blank. A count of zero is the absence of that dwelling type, not a rent of zero.',
  'Euro figures are the workbook cells rounded to the cent, and surface to 0.1 m². INE index and annual-change figures are stored as INE published them. INE labels the annual-change unit Índice. The series name is Variación anual, and the value is that percent.',
  'The province sheet has no Spain total. No national €/m² is computed from the provinces. The national figures are the INE index only.',
  'Census sections and districts in the workbook are not ingested. A feed place that is not the municipality — Orihuela Costa, Ciudad Quesada, Sotogrande, La Manga, San Pedro de Alcántara, Puerto de Mazarrón, and the like — has no official rent. A neighbouring municipality is not substituted.',
  `A town median, a town gross yield and a town implied yield are published only when at least ${MIN_PRICED_LISTINGS} listings in the town have a positive asking €/m². Below that, the official rent is still shown when the town matched a municipality. A province median is published from the first positive asking price, and the listing count is printed with it.`,
  ALIAS_NOTE,
  'No comparison on this page is a statistic published by the ministry or by INE, except the rent distribution itself and the IPVA index and annual change.',
];

const SERPAVI_METHOD =
  'Median, 25th percentile and 75th percentile of monthly rent per m², and of monthly rent for the whole dwelling, plus the median surface and the count of dwellings. ' +
  'Collective dwellings are the workbook columns ending TVC or _VC (vivienda colectiva). Single-family dwellings are TVU or _VU. ' +
  'The year is the latest two-digit suffix for which every required column is present. ' +
  'Taken from the Provincias and Municipios sheets of the workbook the ministry page links as the tax-exploitation database. ' +
  'The Metadatos sheet names the €/m² field ALQM2mes_LV_M_VC_AA. The sheet header drops "mes" and writes ALQM2_LV_M_VC_ plus the year. Both are required. They are the same field.';

const IPVA_METHOD =
  'INE table 59058, Índices provinciales: general y por tipo de edificación. Base 2015. ' +
  'For Spain (Total Nacional) and for each province in the corpus: the index and the published annual change, for Total, Vivienda colectiva and Vivienda unifamiliar. ' +
  'The latest year of the index and of the annual change must be the same year. A withheld latest value is a refusal, not a zero. ' +
  'IPVA is an index of rent prices. It is not converted into euros.';

const ROUNDING_METHOD =
  'A €/m²/month or a monthly rent is rounded to the nearest cent. A surface is rounded to 0.1 m². Counts are whole numbers. ' +
  'After rounding, the 25th percentile must sit at or below the median, and the median at or below the 75th. A break is a refusal. ' +
  'A blank cell is null. A non-positive price is a refusal. INE values are not rounded.';

export const AVENA_ASKING_METHOD =
  'Median asking €/m² of new-build listings in the deployed corpus whose town and province are this place. ' +
  '€/m² is the figure on the listing. Listings with no positive €/m² are counted and excluded from the median. ' +
  `For a town, the median is published only when at least ${MIN_PRICED_LISTINGS} listings have a positive asking €/m². ` +
  'For a province, the median is published from the first such listing, and the count is shown with it.';

export const AVENA_YIELD_METHOD =
  'Median of the gross-yield estimate already computed for each listing. That estimate annualises a short-stay weekly rate and divides it by the midpoint of the asking price. ' +
  'It is not a habitual-residence rent and it is not taken from SERPAVI or from INE. ' +
  `The same publication floor as the asking median applies: ${MIN_PRICED_LISTINGS} listings for a town, and the first listing for a province. Listings with no positive gross yield are excluded from the median.`;

export const IMPLIED_YIELD_METHOD =
  'implied_gross_yield_pct = (SERPAVI median monthly rent €/m² × 12) / Avena median asking €/m² × 100, rounded to 0.1. ' +
  'The flat rent is the collective-dwelling median. The house rent is the single-family median, reported as its own figure and not used in the flat yield. ' +
  'Derived by Avena. It lays an official habitual rent per m² onto a new-build asking price. The dwellings are not the same stock. ' +
  'When either input is blank, the yield is blank.';

const IPVA_SOURCE_NAME = 'INE, Índice de Precios de la Vivienda en Alquiler (IPVA)';

export function rentMatchKeys(officialName: string): string[] {
  const extra = EXTRA_KEYS_BY_OFFICIAL_NAME[officialName] ?? [];
  return [...new Set([...municipalityKeys(officialName), ...extra])];
}

/**
 * Drop a key that two municipalities in the same province both produce.
 * Píñar and Pinar, El in Granada both fold to "pinar". Using it would
 * attach one municipality's rent to the other.
 */
export function disambiguateMatchKeys(rows: readonly { id: string; province_key: string; name: string }[]): { keys: Map<string, string[]>; ambiguous: AmbiguousKey[] } {
  const keyed = rows.map((r) => ({ ...r, keys: rentMatchKeys(r.name) }));
  const owners = new Map<string, Set<string>>();
  for (const row of keyed) {
    for (const key of row.keys) {
      const id = `${row.province_key}::${key}`;
      const set = owners.get(id) ?? new Set<string>();
      set.add(row.name);
      owners.set(id, set);
    }
  }
  const ambiguous: AmbiguousKey[] = [];
  for (const [id, names] of owners) {
    if (names.size < 2) continue;
    const split = id.indexOf('::');
    ambiguous.push({ province_key: id.slice(0, split), key: id.slice(split + 2), names: [...names].sort() });
  }
  ambiguous.sort((a, b) => (a.province_key < b.province_key ? -1 : a.province_key > b.province_key ? 1 : a.key < b.key ? -1 : 1));
  const keys = new Map<string, string[]>();
  for (const row of keyed) {
    keys.set(row.id, row.keys.filter((k) => (owners.get(`${row.province_key}::${k}`)?.size ?? 0) === 1).sort());
  }
  return { keys, ambiguous };
}

export function resolveSerpaviLinks(html: string, pageUrl = SERPAVI_PAGE_URL): { xlsxUrl: string; methodologyUrls: string[] } {
  if (!html || !html.includes('<')) throw new Error('SERPAVI page is empty');
  const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1].replace(/&amp;/g, '&').trim());
  const abs: string[] = [];
  for (const href of hrefs) {
    if (!href || href.startsWith('#') || href.startsWith('mailto:')) continue;
    try {
      abs.push(new URL(href, pageUrl).href);
    } catch {
      throw new Error(`SERPAVI page has a link that is not a URL: ${href.slice(0, 120)}`);
    }
  }
  const xlsx = [...new Set(abs.filter((h) => /bd_SERPAVI/i.test(decodeURIComponent(h)) && /\.xlsx$/i.test(pathOf(h))))];
  if (xlsx.length !== 1) {
    throw new Error(`SERPAVI page has ${xlsx.length} workbook links (expected the one BD Sistema Estatal file)`);
  }
  const pdfs = [...new Set(abs.filter((h) => /metodolog/i.test(decodeURIComponent(h)) && /\.pdf$/i.test(pathOf(h))))];
  if (pdfs.length < 1) throw new Error('SERPAVI page has no methodology PDF');
  return { xlsxUrl: xlsx[0], methodologyUrls: pdfs.sort() };
}

function pathOf(url: string): string {
  try {
    return decodeURIComponent(new URL(url).pathname);
  } catch {
    return url;
  }
}

/** Newest methodology PDF by the YYYY-MM-DD in its filename. A PDF with no date is a refusal. */
export function newestDatedUrl(urls: readonly string[]): string {
  if (urls.length === 0) throw new Error('no methodology URL');
  const dated = urls.map((u) => {
    const m = /(\d{4}-\d{2}-\d{2})/.exec(decodeURIComponent(u));
    if (!m) throw new Error(`methodology URL has no date: ${u}`);
    return { u, d: m[1] };
  });
  dated.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
  const last = dated[dated.length - 1];
  const ties = dated.filter((x) => x.d === last.d);
  if (ties.length !== 1) throw new Error(`two methodology PDFs share the date ${last.d}`);
  return last.u;
}

export function fileYearSpan(url: string): { from: number; to: number } | null {
  const m = /(20\d{2})\s*-\s*(20\d{2})/.exec(decodeURIComponent(url));
  if (!m) return null;
  const from = Number(m[1]);
  const to = Number(m[2]);
  if (to < from) throw new Error(`SERPAVI filename year span runs backwards: ${url}`);
  return { from, to };
}

export function ipvaYear(obs: Record<string, unknown>, label: string): string {
  const name = typeof obs.NombrePeriodo === 'string' ? obs.NombrePeriodo.trim() : '';
  const anyo = typeof obs.Anyo === 'number' ? obs.Anyo : null;
  const periodo = obs.Periodo as { Id?: unknown } | undefined;
  const fkRaw = obs.FK_Periodo ?? periodo?.Id;
  const fk = typeof fkRaw === 'number' ? fkRaw : null;
  if (name && !/^\d{4}$/.test(name)) throw new Error(`${label}: IPVA period is not a year ("${name}")`);
  if (fk != null && fk !== ANNUAL_FK) throw new Error(`${label}: IPVA period code ${fk} is not the annual code ${ANNUAL_FK}`);
  if (name && anyo != null && name !== String(anyo)) {
    throw new Error(`${label}: IPVA year disagreement, NombrePeriodo ${name} vs Anyo ${anyo}`);
  }
  if (name) return name;
  if (anyo != null) return String(anyo);
  throw new Error(`${label}: IPVA observation has no year`);
}

export function classifyIpvaDwelling(label: string): IpvaDwelling | null {
  if (label === 'Total') return 'total';
  if (label === 'Vivienda colectiva') return 'colectiva';
  if (label === 'Vivienda unifamiliar') return 'unifamiliar';
  return null;
}

export function classifyIpvaMeasure(label: string): IpvaMeasure | null {
  if (label === 'Índice') return 'index';
  if (label === 'Variación anual') return 'yoy';
  return null;
}

export interface IpvaSeriesRef {
  cod: string;
  nombre: string;
  geo: string;
  dwelling: IpvaDwelling;
  measure: IpvaMeasure;
}

export function selectIpvaSeries(list: unknown, geos: readonly string[]): IpvaSeriesRef[] {
  if (!Array.isArray(list) || list.length === 0) throw new Error('INE IPVA SERIES_TABLA is not a non-empty array');
  const wanted = new Set(geos);
  const found = new Map<string, IpvaSeriesRef>();
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') throw new Error('INE IPVA series row is not an object');
    const row = raw as { COD?: unknown; Nombre?: unknown };
    if (typeof row.COD !== 'string' || typeof row.Nombre !== 'string') throw new Error('INE IPVA series row has no COD or Nombre');
    const parts = row.Nombre.trim().replace(/\.+$/, '').split('.').map((s) => s.trim()).filter(Boolean);
    if (parts.length !== 3) throw new Error(`INE IPVA series name not understood: "${row.Nombre}"`);
    const [geo, dwellingLabel, measureLabel] = parts;
    if (!wanted.has(geo)) continue;
    const dwelling = classifyIpvaDwelling(dwellingLabel);
    const measure = classifyIpvaMeasure(measureLabel);
    if (!dwelling || !measure) continue;
    const key = `${geo}|${dwelling}|${measure}`;
    const ref: IpvaSeriesRef = { cod: row.COD, nombre: row.Nombre.trim(), geo, dwelling, measure };
    const prev = found.get(key);
    if (prev) throw new Error(`INE IPVA ${key} found 2 series (${prev.cod}, ${ref.cod})`);
    found.set(key, ref);
  }
  const missing: string[] = [];
  for (const geo of geos) {
    for (const dwelling of ['total', 'colectiva', 'unifamiliar'] as const) {
      for (const measure of ['index', 'yoy'] as const) {
        if (!found.has(`${geo}|${dwelling}|${measure}`)) missing.push(`${geo} ${dwelling} ${measure}`);
      }
    }
  }
  if (missing.length) throw new Error(`INE IPVA series missing: ${missing.slice(0, 6).join('; ')}`);
  return [...found.values()];
}

export interface IpvaParsed {
  cod: string;
  nombre: string;
  geo: string;
  dwelling: IpvaDwelling;
  measure: IpvaMeasure;
  unitLabel: string;
  points: InePoint[];
}

/** Parse one IPVA DATOS_SERIE object. Annual, not quarterly. The unit Índice is accepted for the annual change. */
export function parseIpvaDatosSerie(json: unknown, expectedCod?: string): IpvaParsed {
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    throw new Error(`INE ${expectedCod ?? 'IPVA'}: DATOS_SERIE is not an object`);
  }
  const x = json as Record<string, unknown>;
  if (typeof x.COD !== 'string' || typeof x.Nombre !== 'string') throw new Error(`INE ${expectedCod ?? 'IPVA'}: missing COD or Nombre`);
  if (expectedCod && x.COD !== expectedCod) throw new Error(`INE IPVA mismatch: wanted ${expectedCod}, got ${x.COD}`);
  const parts = x.Nombre.trim().replace(/\.+$/, '').split('.').map((s) => s.trim()).filter(Boolean);
  if (parts.length !== 3) throw new Error(`INE ${x.COD}: series name not understood: "${x.Nombre}"`);
  const dwelling = classifyIpvaDwelling(parts[1]);
  const measure = classifyIpvaMeasure(parts[2]);
  if (!dwelling || !measure) throw new Error(`INE ${x.COD}: unclassified series "${x.Nombre}"`);
  const unidad = x.Unidad as { Nombre?: unknown } | undefined;
  const unitLabel = typeof unidad?.Nombre === 'string' ? unidad.Nombre.trim() : '';
  if (!/[ií]ndice/i.test(unitLabel)) {
    throw new Error(`INE ${x.COD}: IPVA unit is "${unitLabel}", expected Índice (the annual change carries that label too)`);
  }
  if (!Array.isArray(x.Data) || x.Data.length === 0) throw new Error(`INE ${x.COD}: no Data`);
  const points: InePoint[] = [];
  for (const raw of x.Data) {
    if (!raw || typeof raw !== 'object') throw new Error(`INE ${x.COD}: data row is not an object`);
    const obs = raw as Record<string, unknown>;
    const period = ipvaYear(obs, x.COD);
    let provisional: boolean | null = null;
    const tipo = obs.TipoDato;
    if (tipo && typeof tipo === 'object' && typeof (tipo as { Nombre?: unknown }).Nombre === 'string') {
      provisional = (tipo as { Nombre: string }).Nombre !== 'Definitivo';
    }
    let value: number | null = null;
    if (obs.Secreto === true || obs.Valor == null || obs.Valor === '') {
      value = null;
    } else {
      const v = typeof obs.Valor === 'number' ? obs.Valor : Number(obs.Valor);
      if (!Number.isFinite(v)) throw new Error(`INE ${x.COD}: non-numeric value at ${period}`);
      if (measure === 'index' && v <= 0) throw new Error(`INE ${x.COD}: non-positive index ${v} at ${period}`);
      value = v;
    }
    points.push({ period, value, provisional });
  }
  if (!points.some((p) => p.value != null)) throw new Error(`INE ${x.COD}: no numeric values`);
  return { cod: x.COD, nombre: x.Nombre.trim(), geo: parts[0], dwelling, measure, unitLabel, points };
}

export function impliedGrossYieldPct(monthlyEurM2: number | null, askingEurM2: number | null): number | null {
  if (monthlyEurM2 == null || askingEurM2 == null) return null;
  if (!(monthlyEurM2 > 0) || !(askingEurM2 > 0)) return null;
  return Math.round(((monthlyEurM2 * 12) / askingEurM2) * 1000) / 10;
}

interface HeaderMap {
  year: number;
  yy: string;
  index: Map<string, number>;
}

function headerMap(header: Cell[], label: string): HeaderMap {
  const index = new Map<string, number>();
  header.forEach((cell, i) => {
    if (typeof cell !== 'string') return;
    const name = cell.trim();
    if (!name) return;
    if (index.has(name)) throw new Error(`${label}: duplicate column ${name}`);
    index.set(name, i);
  });
  const years = new Map<number, Set<string>>();
  for (const name of index.keys()) {
    const m = /^(.+)_(\d{2})$/.exec(name);
    if (!m || !(STEMS as readonly string[]).includes(m[1])) continue;
    const year = 2000 + Number(m[2]);
    if (year < 2011 || year > 2035) throw new Error(`${label}: year not understood on ${name}`);
    const set = years.get(year) ?? new Set<string>();
    set.add(m[1]);
    years.set(year, set);
  }
  if (years.size === 0) throw new Error(`${label}: no SERPAVI year columns`);
  const complete = [...years.entries()].filter(([, set]) => STEMS.every((s) => set.has(s)));
  if (complete.length === 0) throw new Error(`${label}: no year has every required SERPAVI column`);
  const maxAny = Math.max(...years.keys());
  const maxComplete = Math.max(...complete.map(([y]) => y));
  if (maxAny !== maxComplete) {
    throw new Error(`${label}: latest year ${maxAny} is missing columns. Refusing to publish ${maxComplete} as current.`);
  }
  return { year: maxComplete, yy: String(maxComplete).slice(2), index };
}

function col(map: HeaderMap, stem: string, label: string): number {
  const name = `${stem}_${map.yy}`;
  const i = map.index.get(name);
  if (i == null) throw new Error(`${label}: missing ${name}`);
  return i;
}

function rawCell(row: Cell[], i: number): string | number | null {
  const v = row[i];
  if (v == null) return null;
  if (typeof v === 'string' && v.trim() === '') return null;
  return typeof v === 'string' ? v.trim() : v;
}

function parseCount(raw: string | number | null, label: string): number | null {
  if (raw == null) return null;
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) throw new Error(`${label}: count not understood: ${String(raw)}`);
  if (n < 0) throw new Error(`${label}: negative count ${n}`);
  if (Math.abs(n - Math.round(n)) > 1e-6) throw new Error(`${label}: count is not a whole number: ${n}`);
  return Math.round(n);
}

function parseMoney(raw: string | number | null, label: string, dp: number): number | null {
  if (raw == null) return null;
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) throw new Error(`${label}: value not understood: ${String(raw)}`);
  if (n <= 0) throw new Error(`${label}: non-positive value ${n}`);
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

function codeOf(raw: string | number | null, width: number, label: string): string {
  if (raw == null) throw new Error(`${label}: missing code`);
  const text = String(raw).trim();
  if (!/^\d+$/.test(text)) throw new Error(`${label}: code not understood: ${text}`);
  if (text.length > width) throw new Error(`${label}: code ${text} is longer than ${width} digits`);
  return text.padStart(width, '0');
}

function percentiles(p25: number, median: number, p75: number, label: string): Percentiles {
  if (p25 > median || median > p75) {
    throw new Error(`${label}: percentiles out of order (${p25}, ${median}, ${p75})`);
  }
  return { p25, median, p75 };
}

function dwellingBlock(row: Cell[], map: HeaderMap, kind: 'VC' | 'VU', label: string): DwellingRent | null {
  const dwelling = kind === 'VC' ? 'colectiva' : 'unifamiliar';
  const countStem = kind === 'VC' ? 'BI_ALVHEPCO_TVC' : 'BI_ALVHEPCO_TVU';
  const fields = {
    contracts: `${countStem}_${map.yy}`,
    eur_m2_month_median: `ALQM2_LV_M_${kind}_${map.yy}`,
    monthly_eur_median: `ALQTBID12_M_${kind}_${map.yy}`,
    surface_m2_median: `SLVM2_M_${kind}_${map.yy}`,
  };
  const count = parseCount(rawCell(row, col(map, countStem, label)), `${label} ${fields.contracts}`);
  const m2 = {
    p25: parseMoney(rawCell(row, col(map, `ALQM2_LV_25_${kind}`, label)), `${label} €/m² p25`, 2),
    median: parseMoney(rawCell(row, col(map, `ALQM2_LV_M_${kind}`, label)), `${label} €/m² median`, 2),
    p75: parseMoney(rawCell(row, col(map, `ALQM2_LV_75_${kind}`, label)), `${label} €/m² p75`, 2),
  };
  const rent = {
    p25: parseMoney(rawCell(row, col(map, `ALQTBID12_25_${kind}`, label)), `${label} monthly p25`, 2),
    median: parseMoney(rawCell(row, col(map, `ALQTBID12_M_${kind}`, label)), `${label} monthly median`, 2),
    p75: parseMoney(rawCell(row, col(map, `ALQTBID12_75_${kind}`, label)), `${label} monthly p75`, 2),
  };
  const surface = parseMoney(rawCell(row, col(map, `SLVM2_M_${kind}`, label)), `${label} surface`, 1);
  const prices = [m2.p25, m2.median, m2.p75, rent.p25, rent.median, rent.p75, surface];
  if (count == null && prices.every((p) => p == null)) return null;
  if (count == null) throw new Error(`${label}: a ${dwelling} rent with no count`);
  if (count === 0) {
    if (prices.some((p) => p != null)) throw new Error(`${label}: a ${dwelling} price with 0 dwellings`);
    return null;
  }
  const present = prices.filter((p) => p != null).length;
  if (present === 0) {
    return { dwelling, contracts: count, withheld: true, eur_m2_month: null, monthly_eur: null, surface_m2_median: null, fields };
  }
  if (present !== prices.length) throw new Error(`${label}: partial ${dwelling} distribution (${present} of ${prices.length} prices)`);
  return {
    dwelling,
    contracts: count,
    withheld: false,
    eur_m2_month: percentiles(m2.p25!, m2.median!, m2.p75!, `${label} €/m²`),
    monthly_eur: percentiles(rent.p25!, rent.median!, rent.p75!, `${label} monthly`),
    surface_m2_median: surface,
    fields,
  };
}

export function assertSerpaviMetadata(rows: Cell[][]): void {
  if (!Array.isArray(rows) || rows.length < 5) throw new Error('SERPAVI Metadatos sheet is empty');
  const codes = new Set<string>();
  for (const row of rows) {
    const cell = row[0];
    if (typeof cell === 'string' && cell.trim()) codes.add(cell.trim());
  }
  const missing = METADATA_CODES.filter((c) => !codes.has(c));
  if (missing.length) throw new Error(`SERPAVI Metadatos sheet no longer defines ${missing.join(', ')}`);
}

export interface ParsedSerpavi {
  year: number;
  provinces: { cpro: string; name: string; colectiva: DwellingRent | null; unifamiliar: DwellingRent | null }[];
  municipalities: { cumun: string; cpro: string; name: string; colectiva: DwellingRent | null; unifamiliar: DwellingRent | null }[];
}

export function parseSerpaviTables(
  input: { metadatos: Cell[][]; provincias: Cell[][]; municipios: Cell[][] },
  fileUrl: string,
  opts?: { fullFile?: boolean },
): ParsedSerpavi {
  assertSerpaviMetadata(input.metadatos);
  if (input.provincias.length < 2) throw new Error('SERPAVI Provincias sheet is empty');
  if (input.municipios.length < 2) throw new Error('SERPAVI Municipios sheet is empty');
  const provHeader = headerMap(input.provincias[0], 'Provincias');
  const munHeader = headerMap(input.municipios[0], 'Municipios');
  if (provHeader.year !== munHeader.year) {
    throw new Error(`SERPAVI year disagreement: provinces ${provHeader.year}, municipalities ${munHeader.year}`);
  }
  const span = fileYearSpan(fileUrl);
  if (span && provHeader.year !== span.to) {
    throw new Error(`SERPAVI filename ends in ${span.to} but the latest complete year is ${provHeader.year}`);
  }
  for (const id of ['CPRO', 'LITPRO']) {
    if (!provHeader.index.has(id)) throw new Error(`Provincias sheet has no ${id} column`);
  }
  for (const id of ['CPRO', 'CUMUN', 'NMUN']) {
    if (!munHeader.index.has(id)) throw new Error(`Municipios sheet has no ${id} column`);
  }

  const provinces = [];
  const seenProv = new Set<string>();
  for (let r = 1; r < input.provincias.length; r++) {
    const row = input.provincias[r];
    if (row.every((c) => c == null || c === '')) continue;
    const cpro = codeOf(rawCell(row, provHeader.index.get('CPRO')!), 2, `Provincias row ${r + 1}`);
    const nameRaw = rawCell(row, provHeader.index.get('LITPRO')!);
    if (typeof nameRaw !== 'string' || !nameRaw.trim()) throw new Error(`Provincias ${cpro}: no name`);
    if (seenProv.has(cpro)) throw new Error(`Provincias: duplicate ${cpro}`);
    seenProv.add(cpro);
    const label = `Provincias ${nameRaw.trim()}`;
    provinces.push({
      cpro,
      name: nameRaw.trim(),
      colectiva: dwellingBlock(row, provHeader, 'VC', label),
      unifamiliar: dwellingBlock(row, provHeader, 'VU', label),
    });
  }

  const municipalities = [];
  const seenMun = new Set<string>();
  for (let r = 1; r < input.municipios.length; r++) {
    const row = input.municipios[r];
    if (row.every((c) => c == null || c === '')) continue;
    const cpro = codeOf(rawCell(row, munHeader.index.get('CPRO')!), 2, `Municipios row ${r + 1}`);
    const cumun = codeOf(rawCell(row, munHeader.index.get('CUMUN')!), 5, `Municipios row ${r + 1}`);
    if (!cumun.startsWith(cpro)) throw new Error(`Municipios ${cumun} does not start with province ${cpro}`);
    const nameRaw = rawCell(row, munHeader.index.get('NMUN')!);
    if (typeof nameRaw !== 'string' || !nameRaw.trim()) throw new Error(`Municipios ${cumun}: no name`);
    if (seenMun.has(cumun)) throw new Error(`Municipios: duplicate ${cumun}`);
    seenMun.add(cumun);
    const label = `Municipios ${nameRaw.trim()}`;
    municipalities.push({
      cumun,
      cpro,
      name: nameRaw.trim(),
      colectiva: dwellingBlock(row, munHeader, 'VC', label),
      unifamiliar: dwellingBlock(row, munHeader, 'VU', label),
    });
  }
  const fullFile = opts?.fullFile !== false;
  if (fullFile && provinces.length < 40) throw new Error(`SERPAVI Provincias sheet has ${provinces.length} rows, expected the Spanish provinces`);
  if (fullFile && municipalities.length < 1000) throw new Error(`SERPAVI Municipios sheet has ${municipalities.length} rows, expected the municipal file`);
  return { year: provHeader.year, provinces, municipalities };
}

function sourced(point: { period: string; value: number; provisional: boolean | null }, series: IpvaParsed, retrievedAt: string): RentSourced {
  return {
    value: point.value,
    unit: series.measure === 'yoy' ? 'pct' : 'index',
    unit_label: series.unitLabel,
    period: point.period,
    series_id: series.cod,
    source_name: IPVA_SOURCE_NAME,
    source_url: INE_IPVA_TABLE_URL,
    retrieved_at: retrievedAt,
    provisional: point.provisional,
  };
}

function pair(series: IpvaParsed[], geo: string, dwelling: IpvaDwelling, retrievedAt: string): { index: RentSourced; yoy: RentSourced } {
  const indexS = series.find((s) => s.geo === geo && s.dwelling === dwelling && s.measure === 'index');
  const yoyS = series.find((s) => s.geo === geo && s.dwelling === dwelling && s.measure === 'yoy');
  if (!indexS || !yoyS) throw new Error(`IPVA ${geo} ${dwelling} is missing the index or the annual change`);
  const index = latestPoint(indexS.points, `${indexS.cod} index`);
  const yoy = latestPoint(yoyS.points, `${yoyS.cod} annual change`);
  if (index.period !== yoy.period) {
    throw new Error(`IPVA ${geo} ${dwelling}: index year ${index.period} but annual change ${yoy.period}`);
  }
  return { index: sourced(index, indexS, retrievedAt), yoy: sourced(yoy, yoyS, retrievedAt) };
}

export interface BuildRentInput {
  now: Date;
  provinceKeys: string[];
  serpavi: ParsedSerpavi;
  fileUrl: string;
  methodologyUrls: string[];
  ipva: IpvaParsed[];
}

export function buildSpainRentLayer(input: BuildRentInput): SpainRentLayer {
  const retrievedAt = input.now.toISOString().slice(0, 10);
  const defs = input.provinceKeys.map((key) => {
    const def = ES_PROVINCE_DEFS.find((p) => p.key === key);
    if (!def) throw new Error(`unknown province key ${key}`);
    if (!IPVA_GEO_BY_PROVINCE[key]) throw new Error(`no IPVA geography for ${key}`);
    return def;
  });
  const methodologyUrl = newestDatedUrl(input.methodologyUrls);
  const span = fileYearSpan(input.fileUrl);

  const nationalTotal = pair(input.ipva, IPVA_NATIONAL_GEO, 'total', retrievedAt);
  const nationalCol = pair(input.ipva, IPVA_NATIONAL_GEO, 'colectiva', retrievedAt);
  const nationalUni = pair(input.ipva, IPVA_NATIONAL_GEO, 'unifamiliar', retrievedAt);
  const periods = [nationalTotal, nationalCol, nationalUni].map((p) => p.index.period);
  if (new Set(periods).size !== 1) throw new Error(`IPVA national series disagree on the year (${periods.join(', ')})`);

  const provinces: ProvinceRent[] = defs.map((def) => {
    const row = input.serpavi.provinces.find((p) => p.cpro === def.cpro);
    if (!row) throw new Error(`SERPAVI province sheet has no row for ${def.name} (${def.cpro})`);
    const geo = IPVA_GEO_BY_PROVINCE[def.key];
    const total = pair(input.ipva, geo, 'total', retrievedAt);
    const col = pair(input.ipva, geo, 'colectiva', retrievedAt);
    const uni = pair(input.ipva, geo, 'unifamiliar', retrievedAt);
    for (const block of [total, col, uni]) {
      if (block.index.period !== nationalTotal.index.period) {
        throw new Error(`IPVA ${def.name} is ${block.index.period} while Spain is ${nationalTotal.index.period}`);
      }
    }
    return {
      key: def.key,
      name: def.name,
      slug: def.slug,
      cpro: def.cpro,
      serpavi_name: row.name,
      colectiva: row.colectiva,
      unifamiliar: row.unifamiliar,
      ipva_total_index: total.index,
      ipva_total_yoy_pct: total.yoy,
      ipva_colectiva_index: col.index,
      ipva_colectiva_yoy_pct: col.yoy,
      ipva_unifamiliar_index: uni.index,
      ipva_unifamiliar_yoy_pct: uni.yoy,
    };
  });

  const wanted = new Set(defs.map((d) => d.cpro));
  const byCpro = new Map<string, ProvinceDef>(defs.map((d) => [d.cpro, d]));
  const draft = input.serpavi.municipalities
    .filter((m) => wanted.has(m.cpro))
    .map((m) => {
      const def = byCpro.get(m.cpro)!;
      return {
        cumun: m.cumun,
        name: m.name,
        cpro: m.cpro,
        province_key: def.key,
        province: def.name,
        colectiva: m.colectiva,
        unifamiliar: m.unifamiliar,
      };
    })
    .sort((a, b) => (a.cpro < b.cpro ? -1 : a.cpro > b.cpro ? 1 : a.name < b.name ? -1 : 1));
  for (const def of defs) {
    if (!draft.some((m) => m.cpro === def.cpro)) {
      throw new Error(`SERPAVI municipal sheet has no row in ${def.name} (${def.cpro})`);
    }
  }
  const matched = disambiguateMatchKeys(draft.map((m) => ({ id: m.cumun, province_key: m.province_key, name: m.name })));
  const municipalities: MunicipalityRent[] = draft.map((m) => ({ ...m, keys: matched.keys.get(m.cumun) ?? [] }));

  const omissions: RentOmission[] = [
    {
      source: 'SERPAVI census sections and districts',
      url: input.fileUrl,
      ingested: false,
      reason: 'The workbook also has Secciones censales and Distritos sheets. They are not ingested. A feed place that is not itself the municipality does not inherit a section, a district or a neighbour.',
    },
    {
      source: 'SERPAVI national rent level',
      url: SERPAVI_PAGE_URL,
      ingested: false,
      reason: 'The province sheet has no Spain total. No national €/m² was computed by averaging provinces. The national figures in this file are the INE index.',
    },
  ];

  return {
    status: 'ready',
    generated_at: input.now.toISOString(),
    retrieved_at: retrievedAt,
    serpavi_year: input.serpavi.year,
    ipva_period: nationalTotal.index.period,
    provinces_in_corpus: defs.map((d) => d.key),
    coverage_note: COVERAGE_NOTE,
    caveats: RENT_CAVEATS,
    alias_note: ALIAS_NOTE,
    ambiguous_keys: matched.ambiguous,
    method: {
      serpavi: SERPAVI_METHOD,
      ipva: IPVA_METHOD,
      rounding: ROUNDING_METHOD,
      avena_asking: AVENA_ASKING_METHOD,
      avena_gross_yield: AVENA_YIELD_METHOD,
      implied_yield: IMPLIED_YIELD_METHOD,
    },
    omissions,
    sources: {
      serpavi: {
        publisher: 'Ministerio de Vivienda y Agenda Urbana',
        dataset: 'Sistema Estatal de Referencia del Precio del Alquiler de Vivienda (SERPAVI)',
        page_url: SERPAVI_PAGE_URL,
        file_url: input.fileUrl,
        methodology_url: methodologyUrl,
        methodology_urls: [...input.methodologyUrls].sort(),
        year: input.serpavi.year,
        file_year_span: span,
        licence_note: 'Published by the Ministerio de Vivienda y Agenda Urbana. The workbook is the tax-exploitation database linked from the SERPAVI page. Reuse with attribution to that ministry.',
      },
      ipva: {
        publisher: 'Instituto Nacional de Estadística',
        table_id: INE_IPVA_TABLE_ID,
        table_url: INE_IPVA_TABLE_URL,
        api_url: INE_IPVA_API,
        period: nationalTotal.index.period,
        licence_note: 'Fuente: INE. Reuse with attribution.',
      },
    },
    national: {
      ipva_total_index: nationalTotal.index,
      ipva_total_yoy_pct: nationalTotal.yoy,
      ipva_colectiva_index: nationalCol.index,
      ipva_colectiva_yoy_pct: nationalCol.yoy,
      ipva_unifamiliar_index: nationalUni.index,
      ipva_unifamiliar_yoy_pct: nationalUni.yoy,
    },
    provinces,
    municipalities,
  };
}

/** Values only. A later retrieval of the same figures does not rewrite the file. */
export function rentLayerFingerprint(layer: SpainRentLayer): string {
  const pick = (d: DwellingRent | null) => d == null ? null : {
    c: d.contracts,
    w: d.withheld,
    m: d.eur_m2_month,
    r: d.monthly_eur,
    s: d.surface_m2_median,
  };
  const ipva = (n: RentSourced) => [n.series_id, n.period, n.value, n.provisional];
  return JSON.stringify({
    year: layer.serpavi_year,
    ipva: layer.ipva_period,
    file: layer.sources.serpavi.file_url,
    method: layer.sources.serpavi.methodology_url,
    provinces: layer.provinces_in_corpus,
    national: ipva(layer.national.ipva_total_yoy_pct),
    rows: layer.provinces.map((p) => ({
      k: p.key,
      c: pick(p.colectiva),
      u: pick(p.unifamiliar),
      y: ipva(p.ipva_total_yoy_pct),
      i: ipva(p.ipva_total_index),
    })),
    mun: layer.municipalities.map((m) => [m.cumun, m.keys, pick(m.colectiva), pick(m.unifamiliar)]),
    ambiguous: layer.ambiguous_keys,
  });
}

export interface RentListing {
  location: string;
  askingEurM2: number | null;
  grossYieldPct: number | null;
}

export interface RentPlace {
  avena_median_asking_eur_m2: number | null;
  avena_gross_yield_pct: number | null;
  listings: number;
  priced_listings: number;
  yield_listings: number;
  implied_flat_gross_yield_pct: number | null;
  implied_house_gross_yield_pct: number | null;
}

export type TownRentStatus = 'compared' | 'official_only' | 'withheld' | 'not_in_table';

export interface TownRentRow extends RentPlace {
  town: string;
  also_seen: string[];
  province: string;
  province_key: string;
  status: TownRentStatus;
  municipality: string | null;
  cumun: string | null;
  colectiva: DwellingRent | null;
  unifamiliar: DwellingRent | null;
}

export interface ProvinceRentRow extends RentPlace, ProvinceRent {}

export interface EsRentsView {
  ok: true;
  status: 'ready';
  generated_at: string;
  retrieved_at: string;
  serpavi_year: number;
  ipva_period: string;
  min_priced_listings: number;
  coverage_note: string;
  caveats: string[];
  alias_note: string;
  ambiguous_keys: AmbiguousKey[];
  method: SpainRentLayer['method'];
  omissions: RentOmission[];
  sources: SpainRentLayer['sources'];
  national: SpainRentLayer['national'];
  provinces: ProvinceRentRow[];
  towns: TownRentRow[];
  summary: {
    towns: number;
    compared: number;
    official_only: number;
    withheld: number;
    not_in_table: number;
  };
  unmapped_listings: number;
}

function positive(n: number | null | undefined): number | null {
  return n != null && Number.isFinite(n) && n > 0 ? n : null;
}

function placeStats(asking: number[], yields: number[], floor: number, colectiva: DwellingRent | null, unifamiliar: DwellingRent | null, listings: number): RentPlace {
  const priced = asking.filter((n) => n > 0);
  const ys = yields.filter((n) => n > 0);
  const enough = floor <= 1 ? priced.length >= 1 : priced.length >= floor;
  const enoughY = floor <= 1 ? ys.length >= 1 : ys.length >= floor;
  const median = enough ? round1(medianPositive(priced)) : null;
  const gross = enoughY ? round1(medianPositive(ys)) : null;
  const flat = colectiva && !colectiva.withheld ? colectiva.eur_m2_month?.median ?? null : null;
  const house = unifamiliar && !unifamiliar.withheld ? unifamiliar.eur_m2_month?.median ?? null : null;
  return {
    avena_median_asking_eur_m2: median,
    avena_gross_yield_pct: gross,
    listings,
    priced_listings: priced.length,
    yield_listings: ys.length,
    implied_flat_gross_yield_pct: impliedGrossYieldPct(flat, median),
    implied_house_gross_yield_pct: impliedGrossYieldPct(house, median),
  };
}

function round1(n: number | null): number | null {
  if (n == null) return null;
  return Math.round(n * 10) / 10;
}

export function buildEsRents(layer: SpainRentLayer, listings: readonly RentListing[]): EsRentsView {
  const byProvince = new Map<string, { asking: number[]; yields: number[]; listings: number }>();
  const groups = new Map<string, { def: ProvinceDef; spellings: Map<string, number>; asking: number[]; yields: number[]; listings: number }>();
  let unmapped = 0;
  for (const listing of listings) {
    const def = provinceFromLocation(listing.location);
    const town = listing.location.split(',')[0]?.trim() ?? '';
    if (!def || !town) { unmapped++; continue; }
    let bucket = byProvince.get(def.key);
    if (!bucket) {
      bucket = { asking: [], yields: [], listings: 0 };
      byProvince.set(def.key, bucket);
    }
    bucket.listings++;
    const ask = positive(listing.askingEurM2);
    const yld = positive(listing.grossYieldPct);
    if (ask != null) bucket.asking.push(ask);
    if (yld != null) bucket.yields.push(yld);
    const id = `${def.key}::${townGroupKey(town)}`;
    let g = groups.get(id);
    if (!g) {
      g = { def, spellings: new Map(), asking: [], yields: [], listings: 0 };
      groups.set(id, g);
    }
    g.listings++;
    g.spellings.set(town, (g.spellings.get(town) ?? 0) + 1);
    if (ask != null) g.asking.push(ask);
    if (yld != null) g.yields.push(yld);
  }

  const provinces: ProvinceRentRow[] = layer.provinces.map((p) => {
    const bucket = byProvince.get(p.key) ?? { asking: [], yields: [], listings: 0 };
    return { ...p, ...placeStats(bucket.asking, bucket.yields, 1, p.colectiva, p.unifamiliar, bucket.listings) };
  });

  type Pending = { g: NonNullable<ReturnType<typeof groups.get>>; official: MunicipalityRent | null };
  const pending: Pending[] = [];
  for (const g of groups.values()) {
    const display = displayTown(g.spellings);
    const want = new Set<string>();
    for (const spelling of g.spellings.keys()) for (const key of municipalityKeys(spelling)) want.add(key);
    for (const key of municipalityKeys(display)) want.add(key);
    const hits = layer.municipalities.filter((m) => m.province_key === g.def.key && m.keys.some((k) => want.has(k)));
    const names = [...new Set(hits.map((h) => h.name))];
    if (names.length > 1) throw new Error(`Town "${display}" in ${g.def.name} matches more than one municipality: ${names.join(' | ')}`);
    pending.push({ g, official: hits[0] ?? null });
  }

  const merged = new Map<string, Pending>();
  const unmatched: Pending[] = [];
  for (const row of pending) {
    if (!row.official) { unmatched.push(row); continue; }
    const id = row.official.cumun;
    const prev = merged.get(id);
    if (!prev) { merged.set(id, row); continue; }
    prev.g.listings += row.g.listings;
    prev.g.asking.push(...row.g.asking);
    prev.g.yields.push(...row.g.yields);
    for (const [spelling, n] of row.g.spellings) prev.g.spellings.set(spelling, (prev.g.spellings.get(spelling) ?? 0) + n);
  }

  const towns: TownRentRow[] = [...merged.values(), ...unmatched].map(({ g, official }) => {
    const town = displayTown(g.spellings);
    const also = [...g.spellings.keys()].filter((s) => s !== town).sort();
    const stats = placeStats(g.asking, g.yields, MIN_PRICED_LISTINGS, official?.colectiva ?? null, official?.unifamiliar ?? null, g.listings);
    const published = (d: DwellingRent | null | undefined) => d != null && !d.withheld && d.eur_m2_month != null;
    let status: TownRentStatus;
    if (!official) status = 'not_in_table';
    else if (!published(official.colectiva) && !published(official.unifamiliar)) status = 'withheld';
    else if (stats.implied_flat_gross_yield_pct == null) status = 'official_only';
    else status = 'compared';
    return {
      town,
      also_seen: also,
      province: g.def.name,
      province_key: g.def.key,
      status,
      municipality: official?.name ?? null,
      cumun: official?.cumun ?? null,
      colectiva: official?.colectiva ?? null,
      unifamiliar: official?.unifamiliar ?? null,
      ...stats,
    };
  });
  towns.sort((a, b) => b.listings - a.listings || (a.town < b.town ? -1 : 1));

  const summary = { towns: towns.length, compared: 0, official_only: 0, withheld: 0, not_in_table: 0 };
  for (const t of towns) summary[t.status]++;

  return {
    ok: true,
    status: 'ready',
    generated_at: layer.generated_at,
    retrieved_at: layer.retrieved_at,
    serpavi_year: layer.serpavi_year,
    ipva_period: layer.ipva_period,
    min_priced_listings: MIN_PRICED_LISTINGS,
    coverage_note: layer.coverage_note,
    caveats: layer.caveats,
    alias_note: layer.alias_note,
    ambiguous_keys: layer.ambiguous_keys,
    method: layer.method,
    omissions: layer.omissions,
    sources: layer.sources,
    national: layer.national,
    provinces,
    towns,
    summary,
    unmapped_listings: unmapped,
  };
}

function displayTown(spellings: Map<string, number>): string {
  return [...spellings.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]?.[0] ?? '';
}
