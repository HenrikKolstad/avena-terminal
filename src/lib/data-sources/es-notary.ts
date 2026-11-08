/**
 * Notarial transaction prices for the coast Avena covers.
 *
 * The file is the public statistical annex of the Centro de Información
 * Estadística del Notariado (Consejo General del Notariado), linked from
 * the CIEN press room. Two workbooks:
 *
 *   - Housing sales, monthly and annual, by autonomous community.
 *     Transaction count, average €/m² and average surface, for all housing,
 *     for flats and for single-family houses. Not by province. Not by
 *     municipality. Not split into new and second-hand.
 *   - Foreign buyers, by semester. National residence split, community
 *     counts and €/m², and nationality. Not by province or town.
 *
 * The Portal Estadístico del Notariado describes municipal prices. Its
 * terms prohibit commercial use and unauthorised reproduction, so this job
 * does not read the portal. A town is not given a neighbour's price.
 *
 * A blank is not a zero. A count the workbook stores as a fraction stays a
 * fraction. The latest three months are provisional only because the
 * workbook says so.
 *
 * Network I/O lives in scripts/ingest-es-notary.ts. Nothing here fetches.
 */

import {
  ES_PROVINCE_DEFS,
  askingVsAppraisalPct,
  fold,
  medianPositive,
  provinceFromLocation,
  type LayerOmission,
  type ProvinceDef,
} from './ine-es';
import { MIN_PRICED_LISTINGS } from './es-town-gap';

export { askingVsAppraisalPct, medianPositive, provinceFromLocation, MIN_PRICED_LISTINGS };

export const CIEN_INDEX_URL = 'https://www.notariado.org/liferay/web/cien/sala-de-prensa/informes';
export const CIEN_ORIGIN = 'https://www.notariado.org';
export const NOTARIADO_TERMS_URL = 'https://penotariado.com/inmobiliario/terminos-y-condiciones';
export const NOTARIADO_PORTAL_URL = 'https://penotariado.com/inmobiliario/home';
export const VDP003_URL = 'https://cdn.mivau.gob.es/portal-web-mivau/Datos_MIVAU/CSV/VDP003_01.csv';

export const PUBLISHER = 'Centro de Información Estadística del Notariado (Consejo General del Notariado)';

export const GEO_CODES = [
  'AND', 'ARA', 'AST', 'IB', 'IC', 'CAN', 'CyL', 'CLM', 'CAT', 'CV', 'EXT', 'GAL', 'MAD', 'MUR', 'NAV', 'PV', 'LR', 'TOTAL',
] as const;
export type GeoCode = (typeof GEO_CODES)[number];

export const GEO_META: Record<GeoCode, { name: string; ceuta_melilla_included: boolean }> = {
  AND: { name: 'Andalucía', ceuta_melilla_included: true },
  ARA: { name: 'Aragón', ceuta_melilla_included: false },
  AST: { name: 'Asturias', ceuta_melilla_included: false },
  IB: { name: 'Illes Balears', ceuta_melilla_included: false },
  IC: { name: 'Canarias', ceuta_melilla_included: false },
  CAN: { name: 'Cantabria', ceuta_melilla_included: false },
  CyL: { name: 'Castilla y León', ceuta_melilla_included: false },
  CLM: { name: 'Castilla-La Mancha', ceuta_melilla_included: false },
  CAT: { name: 'Cataluña', ceuta_melilla_included: false },
  CV: { name: 'Comunitat Valenciana', ceuta_melilla_included: false },
  EXT: { name: 'Extremadura', ceuta_melilla_included: false },
  GAL: { name: 'Galicia', ceuta_melilla_included: false },
  MAD: { name: 'Madrid', ceuta_melilla_included: false },
  MUR: { name: 'Murcia', ceuta_melilla_included: false },
  NAV: { name: 'Navarra', ceuta_melilla_included: false },
  PV: { name: 'País Vasco', ceuta_melilla_included: false },
  LR: { name: 'La Rioja', ceuta_melilla_included: false },
  TOTAL: { name: 'Spain', ceuta_melilla_included: false },
};

/** Avena province → the CIEN community that contains it. Murcia is the only one that is the province. */
export const PROVINCE_GEO: Record<string, GeoCode> = {
  malaga: 'AND',
  almeria: 'AND',
  granada: 'AND',
  cadiz: 'AND',
  alicante: 'CV',
  valencia: 'CV',
  castellon: 'CV',
  murcia: 'MUR',
};

const FOREIGN_CCAA = [
  'Andalucía', 'Aragón', 'Asturias', 'Islas Baleares', 'Islas Canarias', 'Cantabria',
  'Castilla y León', 'Castilla-La Mancha', 'Cataluña', 'Comunidad Valenciana', 'Extremadura',
  'Galicia', 'Comunidad de Madrid', 'Región de Murcia', 'Navarra', 'País Vasco', 'La Rioja', 'Nacional',
] as const;

const FOREIGN_CCAA_CODE: Record<(typeof FOREIGN_CCAA)[number], GeoCode> = {
  'Andalucía': 'AND',
  'Aragón': 'ARA',
  'Asturias': 'AST',
  'Islas Baleares': 'IB',
  'Islas Canarias': 'IC',
  'Cantabria': 'CAN',
  'Castilla y León': 'CyL',
  'Castilla-La Mancha': 'CLM',
  'Cataluña': 'CAT',
  'Comunidad Valenciana': 'CV',
  'Extremadura': 'EXT',
  'Galicia': 'GAL',
  'Comunidad de Madrid': 'MAD',
  'Región de Murcia': 'MUR',
  'Navarra': 'NAV',
  'País Vasco': 'PV',
  'La Rioja': 'LR',
  Nacional: 'TOTAL',
};

const BUYER_ROWS = [
  { key: 'foreign', name: 'Extranjero', peso_basis: 'of_all_sales' },
  { key: 'foreign_non_resident', name: 'No residente', peso_basis: 'of_foreign_buyers' },
  { key: 'foreign_resident', name: 'Residente', peso_basis: 'of_foreign_buyers' },
  { key: 'national', name: 'Nacional', peso_basis: 'of_all_sales' },
  { key: 'national_non_resident', name: 'No residente', peso_basis: 'of_spanish_buyers' },
  { key: 'national_resident', name: 'Residente', peso_basis: 'of_spanish_buyers' },
  { key: 'total', name: 'Total general', peso_basis: 'of_all_sales' },
] as const;

const MONTH_TOKEN: Record<string, number> = {
  ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, oct: 10, nov: 11, dic: 12,
};

export type Cell = string | number | null;
export type Grid = Cell[][];
export type Dwelling = 'all' | 'flat' | 'house';

export const AVENA_MEDIAN_METHOD =
  'Median asking €/m² of new-build listings in the deployed corpus whose province is this place. ' +
  '€/m² is the midpoint of the asking price range divided by built area, the same figure shown on each listing. ' +
  'Listings with no positive €/m² are counted and excluded from the median. ' +
  `A town median is published only when at least ${MIN_PRICED_LISTINGS} listings in that town have a positive asking €/m². A province median has no separate floor.`;

export const GAP_METHOD =
  'asking_vs_closing_pct = (Avena median asking €/m² − notary average €/m²) / notary average €/m², in percent, rounded to 0.1. ' +
  'Positive means the asking median sits above the notary average. Derived by Avena. It is not a statistic published by the notaries. ' +
  'The notary side is the all-housing average for the autonomous community, not a provincial new-build price. ' +
  'Flat and single-family averages are published beside it and are not substituted into the gap.';

export const COUNT_METHOD =
  'transactions is the workbook cell, rounded half-away-from-zero to 6 decimal places. ' +
  'transactions_nearest is that cell rounded half-away-from-zero to a whole transaction, which is how the CIEN press note prints a count. ' +
  'When the cell is already a whole number the two are equal. A fraction is not replaced with zero and is not dropped. ' +
  'The workbook says the last three months are provisional, and those are the months marked provisional here.';

export const PRICE_METHOD =
  'eur_m2 is the workbook cell rounded half-away-from-zero to the cent. ' +
  'An annual €/m² is published only for the last complete calendar year, and only after it matches the simple average of that year\'s twelve monthly cells within two cents. ' +
  'The workbook describes the annual price as that average. A year that fails the check is not published.';

export const FOREIGN_METHOD =
  'Foreign-buyer figures are the latest semester in the CIEN foreign-buyer annex, which is not the latest month of the price series. ' +
  'peso_pct is the workbook\'s own weight times 100, rounded to 0.1. ' +
  'For the foreign and Spanish totals the weight is their share of all sales. For a residence row the weight is that row\'s share of its parent group, which is checked against the counts before it is labelled. ' +
  'nationality_share_pct is the nationality\'s count divided by the table total, in percent, rounded to 0.1. That division is done here. It is not a separate column. ' +
  'No foreign share of a community is computed from the monthly series. The periods and the dwelling mix are not the same.';

export const COVERAGE_NOTE =
  'Notary €/m² and transaction counts are the CIEN autonomous-community series. ' +
  'A province other than Murcia is shown with its community\'s figure, and the row says so. Murcia is a single-province community. ' +
  'Andalucía in the workbook includes Ceuta and Melilla. ' +
  'No town has a notary price in this file. A town is not given the community price. ' +
  'The series is all free-market housing signed before a notary. It is not new-build only and not the coast only.';

export const NOTARY_CAVEATS = [
  'Avena\'s figure is the median asking price per m² of coastal new-build listings in the current corpus. It is not a price on a deed, and it is not the median of every home in the province.',
  'The notary figure is the average price per m² of housing sales authorised by a notary. The comparison uses the all-housing average for the autonomous community. It mixes flats and houses, new and second-hand, coast and inland.',
  'Andalucía in the workbook includes Ceuta and Melilla. That figure is not the province of Málaga, Cádiz, Granada or Almería. The Valencian Community figure is not Alicante, Valencia or Castellón on its own. Murcia is the province.',
  'Flat and single-family are the split the workbook publishes. Flat is not new-build. Single-family is not second-hand. Neither is copied into the asking-versus-closing gap.',
  'The last three months are provisional because the workbook says so. A provisional transaction count is kept as the cell the workbook stored, which is not always a whole number. The nearest whole number is labelled as rounded.',
  'The asking-versus-closing gap is derived here. It is not published by the notaries. The homes, the geography and the new-versus-second-hand mix are not the same on the two sides.',
  'Foreign-buyer counts and prices are a semester from a separate annex. They are not the latest month, and they are not used as the closing price in the gap.',
  'No municipality, district or postcode price is filled in. The portal that describes those prices is not read.',
];

export interface NotaryMetric {
  transactions: number;
  transactions_whole: boolean;
  /** Cell rounded to a whole transaction. Equal to transactions when the cell is already whole. */
  transactions_nearest: number;
  transactions_yoy_pct: number | null;
  eur_m2: number;
  eur_m2_yoy_pct: number | null;
  surface_m2: number | null;
  surface_yoy_pct: number | null;
}

export interface NotaryRegion {
  code: GeoCode;
  name: string;
  ceuta_melilla_included: boolean;
  period: string;
  provisional: boolean;
  all: NotaryMetric;
  flat: NotaryMetric;
  house: NotaryMetric;
}

export interface AnnualPrice {
  year: number;
  /** Simple average of the twelve monthly €/m² cells, checked against the annual cell. */
  eur_m2: number;
  eur_m2_yoy_pct: number | null;
  transactions: number | null;
  transactions_basis: 'sum_of_months' | 'average_of_months' | null;
  transactions_note: string;
}

export interface AnnualRegion {
  code: GeoCode;
  name: string;
  all: AnnualPrice;
  flat: AnnualPrice;
  house: AnnualPrice;
}

export interface BuyerRow {
  key: string;
  name: string;
  transactions: number;
  /** Workbook weight × 100. Null on the total row, whose weight is 1. */
  peso_pct: number | null;
  peso_basis: 'of_all_sales' | 'of_foreign_buyers' | 'of_spanish_buyers' | null;
  transactions_yoy_pct: number | null;
  eur_m2: number | null;
  eur_m2_yoy_pct: number | null;
}

export interface ForeignCommunity {
  code: GeoCode;
  name: string;
  transactions: number;
  transactions_yoy_pct: number | null;
  eur_m2: number;
  eur_m2_yoy_pct: number | null;
}

export interface NationalityRow {
  name: string;
  transactions: number;
  /** Count divided by the table total, derived here. Null on the total row. */
  nationality_share_pct: number | null;
  transactions_yoy_pct: number | null;
  eur_m2: number | null;
  eur_m2_yoy_pct: number | null;
}

export interface CienFileRef {
  publisher: string;
  title: string;
  file_date: string;
  file_url: string;
  index_url: string;
  period_label: string;
  licence_note: string;
  source_line: string | null;
}

export interface SpainNotaryLayer {
  status: 'ready';
  generated_at: string;
  retrieved_at: string;
  period: string;
  provisional: boolean;
  provinces_in_corpus: string[];
  coverage_note: string;
  caveats: string[];
  method: {
    avena_median: string;
    asking_vs_closing: string;
    transactions: string;
    price: string;
    foreign: string;
  };
  omissions: LayerOmission[];
  sources: {
    housing: CienFileRef & {
      latest_period: string;
      provisional_periods: string[];
      notes: string[];
      dwelling_split: 'all housing, flats, single-family houses';
      geography: 'autonomous community and Spain';
    };
    foreign_buyers: CienFileRef & {
      period: string;
      geography: 'Spain, autonomous community, and nationality at national level';
    };
  };
  regions: NotaryRegion[];
  annual: {
    year: number;
    definition: string;
    regions: AnnualRegion[];
  } | null;
  foreign: {
    period: string;
    buyers: BuyerRow[];
    communities: ForeignCommunity[];
    nationalities: NationalityRow[];
    nationalities_resident: NationalityRow[];
    nationalities_non_resident: NationalityRow[];
  };
}

export interface CienDownload {
  date: string;
  title: string;
  url: string;
}

export interface SelectedAnnexes {
  housing: CienDownload & { period: string };
  foreign: CienDownload & { period: string };
}

const LICENCE_NOTE =
  'The workbooks are the public statistical annexes linked from the CIEN press room. ' +
  'Each housing sheet carries a source line naming the Centro de Información Estadística del Notariado and the Portal Estadístico del Notariado. ' +
  'They are not published under a Creative Commons licence. This file quotes the published aggregates and names the workbook, the period and the source line. It does not redistribute the workbook. ' +
  'The Portal Estadístico del Notariado is a different surface. Its terms prohibit commercial use and unauthorised reproduction, which is why municipal and postcode prices are not here.';

const OMISSIONS: LayerOmission[] = [
  {
    source: 'Portal Estadístico del Notariado',
    url: NOTARIADO_TERMS_URL,
    ingested: false,
    reason:
      'The portal describes transaction prices down to municipality and postcode. Its terms prohibit commercial use, and they prohibit reproduction or distribution of the contents without authorisation. ' +
      'No municipal €/m² was read from the portal. A town is not given its community\'s price.',
  },
  {
    source: 'Consejo General del Notariado, new versus second-hand',
    url: CIEN_INDEX_URL,
    ingested: false,
    reason:
      'The CIEN housing annex splits flats (piso) and single-family houses (unifamiliar). It does not split new dwellings and second-hand dwellings. That split is not in this file. Flat is not treated as new, and single-family is not treated as second-hand.',
  },
  {
    source: 'CIEN foreign-buyer annex, province and municipality',
    url: CIEN_INDEX_URL,
    ingested: false,
    reason:
      'The foreign-buyer annex names Spain, the autonomous communities and the buyer\'s nationality. It does not name a province or a municipality, and it does not cross a nationality with a coastal town. A community foreign share is not computed from the monthly all-buyer series.',
  },
  {
    source: 'Ministerio de Vivienda y Agenda Urbana, VDP003_01',
    url: VDP003_URL,
    ingested: false,
    reason: 'The ministry transaction file is not read by this job. It has no €/m² column. The supply layer records its own finding about that file.',
  },
  {
    source: 'Colegio de Registradores',
    url: 'https://opendata.registradores.org/dataset/es/dataset/compraventas-de-inmuebles-uso-residencial-por-provincia',
    ingested: false,
    reason: 'Registered sales are a different source from notarial deeds. They are not mixed into this file.',
  },
];

export function roundDigits(n: number, dp: number): number {
  if (!Number.isFinite(n)) throw new Error(`cannot round ${n}`);
  return Number(n.toFixed(dp));
}

export function ratioToPct(ratio: number): number {
  return roundDigits(ratio * 100, 1);
}

export function excelSerialToParts(serial: number): { year: number; month: number; day: number } {
  const utc = Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000;
  const d = new Date(utc);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

export function monthFromAnnexLabel(token: string): string {
  const m = /^([a-z]{3})-(\d{2})$/i.exec(token.trim());
  if (!m) throw new Error(`annex month label not understood: "${token}"`);
  const month = MONTH_TOKEN[m[1].toLowerCase()];
  if (!month) throw new Error(`annex month token not understood: "${token}"`);
  const yy = Number(m[2]);
  const year = yy >= 70 ? 1900 + yy : 2000 + yy;
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function semesterFromLabel(token: string): string {
  const m = /^([12])S(\d{2})$/i.exec(token.trim());
  if (!m) throw new Error(`semester label not understood: "${token}"`);
  const yy = Number(m[2]);
  const year = yy >= 70 ? 1900 + yy : 2000 + yy;
  return `${year}-H${m[1]}`;
}

function text(value: Cell | undefined): string {
  if (value == null) return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

function at(row: Cell[] | undefined, col: number): Cell {
  if (!row) return null;
  const v = row[col];
  return v == null || v === '' ? null : v;
}

function numberOf(value: Cell, label: string): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(value.trim())) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  throw new Error(`${label}: not a number (${JSON.stringify(value)})`);
}

function monthOf(value: Cell): string | null {
  if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim())) value = Number(value);
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (value < 30000 || value > 80000) return null;
  const parts = excelSerialToParts(value);
  if (parts.day < 1 || parts.day > 3) {
    throw new Error(`month serial ${value} landed on ${parts.year}-${parts.month}-${parts.day}, which is not the 1st, 2nd or 3rd`);
  }
  return `${parts.year}-${String(parts.month).padStart(2, '0')}`;
}

function yearOf(value: Cell): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 1990 && value <= 2100) return value;
  if (typeof value === 'string' && /^\d{4}$/.test(value.trim())) {
    const y = Number(value);
    if (y >= 1990 && y <= 2100) return y;
  }
  return null;
}

function findGeoGroups(rows: Grid): number[] {
  const found = new Set<number>();
  for (const row of rows) {
    for (let c = 0; c < row.length; c++) {
      if (text(at(row, c)) !== GEO_CODES[0]) continue;
      const ok = GEO_CODES.every((code, k) => text(at(row, c + k)) === code);
      if (ok) found.add(c);
    }
  }
  const starts = [...found].sort((a, b) => a - b);
  if (starts.length !== 3) {
    throw new Error(`expected 3 geography blocks of ${GEO_CODES.join(',')}, found ${starts.length}`);
  }
  return starts;
}

function blockTitle(rows: Grid, start: number): string {
  const bits: string[] = [];
  for (let r = 0; r < Math.min(rows.length, 8); r++) {
    const t = text(at(rows[r], start - 1));
    if (t) bits.push(t);
  }
  return bits.join(' ');
}

function assertDwellingTitles(rows: Grid, groups: number[]) {
  const titles = groups.map((start) => blockTitle(rows, start));
  if (!/COMPRAVENTA DE VIVIENDA/i.test(titles[0]) || /PISO|UNIFAMILIAR/i.test(titles[0])) {
    throw new Error(`first block is not all-housing: "${titles[0]}"`);
  }
  if (!/PISO/i.test(titles[1])) throw new Error(`second block is not flats: "${titles[1]}"`);
  if (!/UNIFAMILIAR/i.test(titles[2])) throw new Error(`third block is not single-family: "${titles[2]}"`);
}

/** The annex prints "M2 (nivel)" and "M2(nivel)" in different sheets. Spaces are not part of the label. */
function compactLabel(s: string): string {
  return s.replace(/\s+/g, '');
}

function findExactRow(rows: Grid, exact: string): number {
  const want = compactLabel(exact);
  const hits: number[] = [];
  rows.forEach((row, i) => { if (compactLabel(text(at(row, 1))) === want) hits.push(i); });
  if (hits.length !== 1) throw new Error(`label "${exact}" found ${hits.length} times`);
  return hits[0];
}

function findYoyRow(rows: Grid, prefix: string): number {
  const hits: number[] = [];
  rows.forEach((row, i) => {
    const t = text(at(row, 1));
    if (t.startsWith(prefix) && t.includes('variación') && t.includes('%')) hits.push(i);
  });
  if (hits.length !== 1) {
    throw new Error(`year-on-year row for "${prefix}" found ${hits.length}`);
  }
  return hits[0];
}

interface SeriesPoint {
  key: string;
  /** One record per dwelling group, geo code → raw cell. */
  groups: Array<Record<GeoCode, number>>;
}

function readSeries(rows: Grid, labelRow: number, groups: number[], kind: 'month' | 'year'): SeriesPoint[] {
  const points: SeriesPoint[] = [];
  for (let i = labelRow + 1; i < rows.length; i++) {
    const raw = at(rows[i], 1);
    const key = kind === 'month' ? monthOf(raw) : (yearOf(raw) == null ? null : String(yearOf(raw)));
    if (key == null) {
      // A blank row sits inside the series. A text label is the next block.
      if (points.length > 0 && text(raw) !== '') break;
      continue;
    }
    const parsed = groups.map((start) => {
      const rec = {} as Record<GeoCode, number>;
      GEO_CODES.forEach((code, k) => {
        const v = at(rows[i], start + k);
        if (v == null) throw new Error(`${kind} ${key} ${code} is blank. A blank is not published as zero.`);
        rec[code] = numberOf(v, `${kind} ${key} ${code}`);
      });
      return rec;
    });
    points.push({ key, groups: parsed });
  }
  if (points.length === 0) throw new Error(`no ${kind} points under row ${labelRow + 1}`);
  return points;
}

function sheetText(rows: Grid): string {
  const bits: string[] = [];
  for (const row of rows) {
    for (const cell of row) {
      const t = text(cell);
      if (t) bits.push(t);
    }
  }
  return bits.join('\n');
}

function requireNote(blob: string, pattern: RegExp, label: string): string {
  const lines = blob.split('\n');
  const hit = lines.find((line) => pattern.test(fold(line)));
  if (!hit) throw new Error(`workbook no longer contains the ${label}. Refusing to keep describing the series as if it did.`);
  return hit.trim();
}

interface HousingParsed {
  latest: NotaryRegion[];
  provisionalPeriods: string[];
  annual: SpainNotaryLayer['annual'];
  sourceLine: string;
  notes: string[];
}

function metricFrom(
  level: SeriesPoint,
  yoy: SeriesPoint | undefined,
  surface: SeriesPoint | undefined,
  surfaceYoy: SeriesPoint | undefined,
  group: number,
  code: GeoCode,
): NotaryMetric {
  const transactions = roundDigits(level.groups[group][code], 6);
  const nearest = roundDigits(level.groups[group][code], 0);
  const yoyRaw = yoy?.groups[group][code];
  const surfaceRaw = surface?.groups[group][code];
  const surfaceYoyRaw = surfaceYoy?.groups[group][code];
  return {
    transactions,
    transactions_whole: Math.abs(transactions - nearest) < 1e-6,
    transactions_nearest: nearest,
    transactions_yoy_pct: yoyRaw == null ? null : ratioToPct(yoyRaw),
    eur_m2: roundDigits(level.groups[group][code], 2),
    eur_m2_yoy_pct: null,
    surface_m2: surfaceRaw == null ? null : roundDigits(surfaceRaw, 2),
    surface_yoy_pct: surfaceYoyRaw == null ? null : ratioToPct(surfaceYoyRaw),
  };
}

function priceMetric(
  price: SeriesPoint,
  priceYoy: SeriesPoint | undefined,
  counts: SeriesPoint,
  countYoy: SeriesPoint | undefined,
  surface: SeriesPoint | undefined,
  surfaceYoy: SeriesPoint | undefined,
  group: number,
  code: GeoCode,
): NotaryMetric {
  const count = metricFrom(counts, countYoy, surface, surfaceYoy, group, code);
  const yoyRaw = priceYoy?.groups[group][code];
  return {
    ...count,
    eur_m2: roundDigits(price.groups[group][code], 2),
    eur_m2_yoy_pct: yoyRaw == null ? null : ratioToPct(yoyRaw),
  };
}

function pointAt(series: SeriesPoint[], key: string, label: string): SeriesPoint {
  const hit = series.find((p) => p.key === key);
  if (!hit) throw new Error(`${label} has no point for ${key}`);
  return hit;
}

function mean(values: number[]): number {
  if (values.length === 0) throw new Error('mean of no values');
  return values.reduce((s, n) => s + n, 0) / values.length;
}

function annualTransactions(cell: number, months: number[]): { value: number | null; basis: AnnualPrice['transactions_basis']; note: string } {
  const sum = months.reduce((s, n) => s + n, 0);
  const avg = mean(months);
  if (Math.abs(cell - sum) <= 1) {
    return {
      value: roundDigits(cell, 0),
      basis: 'sum_of_months',
      note: 'The annual cell matches the sum of the twelve monthly transaction cells within one transaction. It is that cell, rounded to a whole number.',
    };
  }
  if (Math.abs(cell - avg) <= 0.5) {
    return {
      value: roundDigits(cell, 3),
      basis: 'average_of_months',
      note: 'The annual cell matches the simple average of the twelve monthly transaction cells within half a transaction. It is not a count of deeds for the year.',
    };
  }
  return {
    value: null,
    basis: null,
    note: `The annual transaction cell (${cell}) is neither the sum (${roundDigits(sum, 3)}) nor the average (${roundDigits(avg, 3)}) of the twelve monthly cells. It is not published.`,
  };
}

export function parseHousingWorkbook(input: {
  monthly: Grid;
  annual: Grid;
  indexText: string;
  expectedPeriod: string;
}): HousingParsed {
  const monthlyBlob = `${input.indexText}\n${sheetText(input.monthly)}`;
  const provisionalNote = requireNote(monthlyBlob, /ultimos tres meses|tres ultimos meses/, 'provisional-months note');
  const ceutaNote = requireNote(monthlyBlob, /ceuta y melilla se agregan en andalucia/, 'Ceuta and Melilla note');
  const vpo = input.indexText.split('\n').find((line) => /proteccion oficial/.test(fold(line))) ?? null;
  const construction = input.indexText.split('\n').find((line) => /vivienda en construccion/.test(fold(line))) ?? null;
  const sourceLine = sheetText(input.monthly).split('\n').find((line) => /^Fuente:/.test(line.trim())) ?? null;
  if (!sourceLine || !/notariado/i.test(sourceLine)) {
    throw new Error('monthly sheet has no Fuente line naming the Notariado');
  }

  const groups = findGeoGroups(input.monthly);
  assertDwellingTitles(input.monthly, groups);
  const counts = readSeries(input.monthly, findExactRow(input.monthly, 'NÚMERO DE OPERACIONES (nivel)'), groups, 'month');
  const countYoy = readSeries(input.monthly, findYoyRow(input.monthly, 'NÚMERO DE OPERACIONES'), groups, 'month');
  const prices = readSeries(input.monthly, findExactRow(input.monthly, 'PRECIO PROMEDIO POR M2 (nivel)'), groups, 'month');
  const priceYoy = readSeries(input.monthly, findYoyRow(input.monthly, 'PRECIO PROMEDIO POR M2'), groups, 'month');
  const surfaces = readSeries(input.monthly, findExactRow(input.monthly, 'SUPERFICIE MEDIA M2 (nivel)'), groups, 'month');
  const surfaceYoy = readSeries(input.monthly, findYoyRow(input.monthly, 'SUPERFICIE MEDIA M2'), groups, 'month');

  const periods = counts.map((p) => p.key);
  if (new Set(periods).size !== periods.length) throw new Error('duplicate month in the transaction series');
  const latestKey = periods[periods.length - 1];
  if (latestKey !== input.expectedPeriod) {
    throw new Error(`workbook latest month is ${latestKey}, annex title says ${input.expectedPeriod}`);
  }
  for (const series of [prices, surfaces]) {
    if (series[series.length - 1].key !== latestKey) {
      throw new Error(`a level series ends at ${series[series.length - 1].key}, not ${latestKey}`);
    }
  }
  const provisionalPeriods = periods.slice(-3);
  if (provisionalPeriods.length !== 3) throw new Error('fewer than three months, so the provisional rule cannot be applied');

  const countLevel = pointAt(counts, latestKey, 'transactions');
  const priceLevel = pointAt(prices, latestKey, 'prices');
  const surfaceLevel = pointAt(surfaces, latestKey, 'surface');
  const countYoyPoint = countYoy.find((p) => p.key === latestKey);
  const priceYoyPoint = priceYoy.find((p) => p.key === latestKey);
  const surfaceYoyPoint = surfaceYoy.find((p) => p.key === latestKey);
  if (!countYoyPoint || !priceYoyPoint) throw new Error(`latest month ${latestKey} has no year-on-year price or transactions`);

  const latest: NotaryRegion[] = GEO_CODES.map((code) => ({
    code,
    name: GEO_META[code].name,
    ceuta_melilla_included: GEO_META[code].ceuta_melilla_included,
    period: latestKey,
    provisional: true,
    all: priceMetric(priceLevel, priceYoyPoint, countLevel, countYoyPoint, surfaceLevel, surfaceYoyPoint, 0, code),
    flat: priceMetric(priceLevel, priceYoyPoint, countLevel, countYoyPoint, surfaceLevel, surfaceYoyPoint, 1, code),
    house: priceMetric(priceLevel, priceYoyPoint, countLevel, countYoyPoint, surfaceLevel, surfaceYoyPoint, 2, code),
  }));

  const annualGroups = findGeoGroups(input.annual);
  assertDwellingTitles(input.annual, annualGroups);
  const annualCounts = readSeries(input.annual, findExactRow(input.annual, 'NÚMERO DE OPERACIONES (nivel)'), annualGroups, 'year');
  const annualPrices = readSeries(input.annual, findExactRow(input.annual, 'PRECIO PROMEDIO POR M2 (nivel)'), annualGroups, 'year');
  const annualPriceYoy = readSeries(input.annual, findYoyRow(input.annual, 'PRECIO PROMEDIO POR M2'), annualGroups, 'year');
  const [latestYear, latestMonth] = latestKey.split('-').map(Number);
  const completeYear = latestMonth === 12 ? latestYear : latestYear - 1;
  const yearKey = String(completeYear);
  const annualPricePoint = pointAt(annualPrices, yearKey, 'annual price');
  const annualCountPoint = annualCounts.find((p) => p.key === yearKey);
  const annualYoyPoint = annualPriceYoy.find((p) => p.key === yearKey);
  if (!annualCountPoint) throw new Error(`annual transactions have no ${yearKey} row`);

  const monthsOfYear = counts.filter((p) => p.key.startsWith(`${yearKey}-`));
  if (monthsOfYear.length !== 12) throw new Error(`${yearKey} has ${monthsOfYear.length} monthly transaction rows, expected 12`);
  const pricesOfYear = prices.filter((p) => p.key.startsWith(`${yearKey}-`));
  if (pricesOfYear.length !== 12) throw new Error(`${yearKey} has ${pricesOfYear.length} monthly price rows, expected 12`);

  const annualRegions: AnnualRegion[] = GEO_CODES.map((code) => {
    const build = (group: number): AnnualPrice => {
      const monthlyPrices = pricesOfYear.map((p) => p.groups[group][code]);
      const cell = annualPricePoint.groups[group][code];
      const avg = mean(monthlyPrices);
      if (Math.abs(cell - avg) > 0.02) {
        throw new Error(`${yearKey} ${code} group ${group} annual €/m² ${cell} is not the average of the months (${avg})`);
      }
      const monthlyCounts = monthsOfYear.map((p) => p.groups[group][code]);
      const tx = annualTransactions(annualCountPoint.groups[group][code], monthlyCounts);
      const yoyRaw = annualYoyPoint?.groups[group][code];
      return {
        year: completeYear,
        eur_m2: roundDigits(cell, 2),
        eur_m2_yoy_pct: yoyRaw == null ? null : ratioToPct(yoyRaw),
        transactions: tx.value,
        transactions_basis: tx.basis,
        transactions_note: tx.note,
      };
    };
    return { code, name: GEO_META[code].name, all: build(0), flat: build(1), house: build(2) };
  });

  const notes = [provisionalNote, ceutaNote];
  if (vpo) notes.push(vpo.trim());
  if (construction) notes.push(construction.trim());

  return {
    latest,
    provisionalPeriods,
    annual: {
      year: completeYear,
      definition:
        'Annual €/m² is the workbook\'s annual cell for the last complete calendar year. ' +
        'It was checked against the simple average of that year\'s twelve monthly €/m² cells and matched within two cents. ' +
        'It is not an average computed for publication. The cell is the published figure.',
      regions: annualRegions,
    },
    sourceLine: sourceLine.trim(),
    notes,
  };
}

function semesterColumn(rows: Grid): { col: number; period: string } {
  let best: { col: number; period: string; rank: number } | null = null;
  const headers: Array<{ col: number; period: string }> = [];
  for (const row of rows) {
    let rowBest: { col: number; period: string; rank: number } | null = null;
    for (let c = 0; c < row.length; c++) {
      const raw = text(at(row, c));
      if (!/^[12]S\d{2}$/i.test(raw)) continue;
      const period = semesterFromLabel(raw);
      const rank = Number(period.slice(0, 4)) * 2 + Number(period.slice(-1));
      headers.push({ col: c, period });
      if (!rowBest || rank > rowBest.rank || (rank === rowBest.rank && c > rowBest.col)) rowBest = { col: c, period, rank };
    }
    if (rowBest && (!best || rowBest.rank > best.rank)) best = rowBest;
  }
  if (!best) throw new Error('no semester header');
  const mismatched = headers.filter((h) => {
    const rank = Number(h.period.slice(0, 4)) * 2 + Number(h.period.slice(-1));
    return rank === best!.rank && h.col !== best!.col;
  });
  if (mismatched.length) throw new Error(`latest semester ${best.period} is not in one column`);
  return { col: best.col, period: best.period };
}

function tableSpans(rows: Grid): Array<{ title: string; start: number; end: number }> {
  const marks: Array<{ title: string; row: number }> = [];
  rows.forEach((row, i) => {
    for (const col of [3, 4]) {
      const t = text(at(row, col));
      if (/^TABLA \d/.test(t)) marks.push({ title: t, row: i });
    }
  });
  return marks.map((mark, i) => ({ title: mark.title, start: mark.row + 1, end: marks[i + 1]?.row ?? rows.length }));
}

function spanByPrefix(spans: ReturnType<typeof tableSpans>, prefix: string): { start: number; end: number } {
  const hits = spans.filter((s) => s.title.startsWith(prefix));
  if (hits.length !== 1) throw new Error(`table "${prefix}" found ${hits.length} times`);
  return hits[0];
}

function readNamed(rows: Grid, span: { start: number; end: number }, col: number, period: string): Array<{ name: string; value: number }> {
  const out: Array<{ name: string; value: number }> = [];
  for (let i = span.start; i < span.end; i++) {
    const name = text(at(rows[i], 4));
    // The semester header is repeated before the price block and falls inside the previous table's rows.
    if (!name || /^TABLA /.test(name) || name === 'SEMESTRE') continue;
    const value = at(rows[i], col);
    if (value == null) throw new Error(`${period} ${name} is blank. A blank is not published as zero.`);
    out.push({ name, value: numberOf(value, `${period} ${name}`) });
  }
  return out;
}

function zipNames<T extends { name: string }>(rows: Array<{ name: string; value: number }>, expected: readonly T[], label: string): Array<T & { value: number }> {
  if (rows.length !== expected.length) {
    throw new Error(`${label}: ${rows.length} rows, expected ${expected.length} (${rows.map((r) => r.name).join(', ')})`);
  }
  return expected.map((spec, i) => {
    if (rows[i].name !== spec.name) throw new Error(`${label}: row ${i + 1} is "${rows[i].name}", expected "${spec.name}"`);
    return { ...spec, value: rows[i].value };
  });
}

export function parseBuyerSheet(rows: Grid, expectedPeriod: string): { period: string; buyers: BuyerRow[] } {
  const header = semesterColumn(rows);
  if (header.period !== expectedPeriod) throw new Error(`buyer sheet latest semester is ${header.period}, annex says ${expectedPeriod}`);
  const spans = tableSpans(rows);
  const counts = zipNames(readNamed(rows, spanByPrefix(spans, 'TABLA 1:'), header.col, header.period), BUYER_ROWS, 'buyer counts');
  const pesos = zipNames(readNamed(rows, spanByPrefix(spans, 'TABLA 1A'), header.col, header.period), BUYER_ROWS, 'buyer weights');
  const yoy = zipNames(readNamed(rows, spanByPrefix(spans, 'TABLA 1B'), header.col, header.period), BUYER_ROWS, 'buyer year-on-year');
  const prices = zipNames(readNamed(rows, spanByPrefix(spans, 'TABLA 1C'), header.col, header.period), BUYER_ROWS, 'buyer prices');
  const priceYoy = zipNames(readNamed(rows, spanByPrefix(spans, 'TABLA 1D'), header.col, header.period), BUYER_ROWS, 'buyer price year-on-year');
  const byKey = (rowsIn: typeof counts) => new Map(rowsIn.map((r) => [r.key, r.value]));
  const count = byKey(counts);
  const peso = byKey(pesos);
  const parentOf: Partial<Record<(typeof BUYER_ROWS)[number]['key'], (typeof BUYER_ROWS)[number]['key']>> = {
    foreign_non_resident: 'foreign',
    foreign_resident: 'foreign',
    national_non_resident: 'national',
    national_resident: 'national',
    foreign: 'total',
    national: 'total',
  };
  for (const key of Object.keys(parentOf) as Array<keyof typeof parentOf>) {
    const parent = parentOf[key];
    if (!parent) continue;
    const implied = peso.get(key)! * count.get(parent)!;
    if (Math.abs(implied - count.get(key)!) > 1.5) {
      throw new Error(`${key} weight ${peso.get(key)} times ${parent} count ${count.get(parent)} is ${implied}, not the ${key} count ${count.get(key)}`);
    }
  }
  const BUYER_LABEL: Record<(typeof BUYER_ROWS)[number]['key'], string> = {
    foreign: 'Foreign buyers',
    foreign_non_resident: 'Foreign buyers, non-resident',
    foreign_resident: 'Foreign buyers, resident',
    national: 'Spanish buyers',
    national_non_resident: 'Spanish buyers, non-resident',
    national_resident: 'Spanish buyers, resident',
    total: 'Total',
  };
  const buyers: BuyerRow[] = BUYER_ROWS.map((spec) => ({
    key: spec.key,
    name: BUYER_LABEL[spec.key],
    transactions: roundDigits(count.get(spec.key)!, 0),
    peso_pct: spec.key === 'total' ? null : ratioToPct(peso.get(spec.key)!),
    peso_basis: spec.key === 'total' ? null : spec.peso_basis,
    transactions_yoy_pct: ratioToPct(byKey(yoy).get(spec.key)!),
    eur_m2: roundDigits(byKey(prices).get(spec.key)!, 2),
    eur_m2_yoy_pct: ratioToPct(byKey(priceYoy).get(spec.key)!),
  }));
  return { period: header.period, buyers };
}

export function parseForeignCommunities(rows: Grid, expectedPeriod: string): { period: string; communities: ForeignCommunity[] } {
  const header = semesterColumn(rows);
  if (header.period !== expectedPeriod) throw new Error(`community sheet latest semester is ${header.period}, annex says ${expectedPeriod}`);
  const spans = tableSpans(rows);
  const counts = zipNames(
    readNamed(rows, spanByPrefix(spans, 'TABLA 2:'), header.col, header.period),
    FOREIGN_CCAA.map((name) => ({ name })),
    'community foreign counts',
  );
  const yoy = zipNames(
    readNamed(rows, spanByPrefix(spans, 'TABLA 2A'), header.col, header.period),
    FOREIGN_CCAA.map((name) => ({ name })),
    'community foreign year-on-year',
  );
  const prices = zipNames(
    readNamed(rows, spanByPrefix(spans, 'TABLA 2B'), header.col, header.period),
    FOREIGN_CCAA.map((name) => ({ name })),
    'community foreign prices',
  );
  const priceYoy = zipNames(
    readNamed(rows, spanByPrefix(spans, 'TABLA 2C'), header.col, header.period),
    FOREIGN_CCAA.map((name) => ({ name })),
    'community foreign price year-on-year',
  );
  const communities: ForeignCommunity[] = FOREIGN_CCAA.map((name, i) => ({
    code: FOREIGN_CCAA_CODE[name],
    name: name === 'Nacional' ? 'Spain' : name,
    transactions: roundDigits(counts[i].value, 0),
    transactions_yoy_pct: ratioToPct(yoy[i].value),
    eur_m2: roundDigits(prices[i].value, 2),
    eur_m2_yoy_pct: ratioToPct(priceYoy[i].value),
  }));
  return { period: header.period, communities };
}

export function parseNationalitySheet(rows: Grid, table: '3' | '4' | '5', expectedPeriod: string): NationalityRow[] {
  const header = semesterColumn(rows);
  if (header.period !== expectedPeriod) throw new Error(`nationality table ${table} latest semester is ${header.period}, annex says ${expectedPeriod}`);
  const spans = tableSpans(rows);
  const counts = readNamed(rows, spanByPrefix(spans, `TABLA ${table}:`), header.col, header.period);
  const yoy = readNamed(rows, spanByPrefix(spans, `TABLA ${table}A`), header.col, header.period);
  const prices = readNamed(rows, spanByPrefix(spans, `TABLA ${table}B`), header.col, header.period);
  const priceYoy = readNamed(rows, spanByPrefix(spans, `TABLA ${table}C`), header.col, header.period);
  if (counts.length < 2 || counts[counts.length - 1].name !== 'Total general') {
    throw new Error(`nationality table ${table} does not end with Total general`);
  }
  const sameNames = (other: Array<{ name: string }>, label: string) => {
    const norm = (s: string) => s.replace(/\./g, '');
    if (other.length !== counts.length || other.some((row, i) => norm(row.name) !== norm(counts[i].name))) {
      const mismatch = other.find((row, i) => norm(row.name) !== norm(counts[i]?.name ?? ''));
      throw new Error(`${label} nationalities do not match the count table (${mismatch?.name ?? 'length ' + other.length})`);
    }
  };
  sameNames(yoy, 'year-on-year');
  sameNames(prices, 'price');
  sameNames(priceYoy, 'price year-on-year');
  const total = counts[counts.length - 1].value;
  const parts = counts.slice(0, -1);
  const sum = parts.reduce((s, row) => s + row.value, 0);
  if (Math.abs(sum - total) > 0.5) throw new Error(`nationality table ${table} counts sum to ${sum}, total cell is ${total}`);
  if (!(total > 0)) throw new Error(`nationality table ${table} total is not positive`);
  return counts.map((row, i) => ({
    name: row.name === 'Total general' ? 'Total' : row.name,
    transactions: roundDigits(row.value, 0),
    nationality_share_pct: row.name === 'Total general' ? null : ratioToPct(row.value / total),
    transactions_yoy_pct: ratioToPct(yoy[i].value),
    eur_m2: roundDigits(prices[i].value, 2),
    eur_m2_yoy_pct: ratioToPct(priceYoy[i].value),
  }));
}

export function parseCienIndex(html: string): CienDownload[] {
  const out: CienDownload[] = [];
  const re = /<li>\s*<span class="date">(\d{2})\/(\d{2})\/(\d{4})[\s\S]*?<span class="titleEnlaces">\s*([^<]+?)\s*<\/span>[\s\S]*?<a[^>]+href="([^"]+)"/g;
  for (const m of html.matchAll(re)) {
    const href = m[5].replace(/&amp;/g, '&');
    const url = href.startsWith('http') ? href : `${CIEN_ORIGIN}${href.startsWith('/') ? '' : '/'}${href}`;
    out.push({
      date: `${m[3]}-${m[2]}-${m[1]}`,
      title: m[4].replace(/\s+/g, ' ').trim(),
      url,
    });
  }
  if (out.length === 0) throw new Error('CIEN informes page has no download items');
  return out;
}

export function selectCienAnnexes(items: CienDownload[]): SelectedAnnexes {
  const housing = items.find((item) => /anexo tablas: series estadísticas correspondientes al informe \(hasta [a-z]{3}-\d{2}\)/i.test(item.title) && !/extranjeros/i.test(item.title));
  const foreign = items.find((item) => /anexo tablas: series estadísticas correspondientes al informe de extranjeros \(hasta [12]S\d{2}\)/i.test(item.title));
  if (!housing) throw new Error('CIEN index has no housing statistical annex');
  if (!foreign) throw new Error('CIEN index has no foreign-buyer statistical annex');
  const housingPeriod = monthFromAnnexLabel((housing.title.match(/\(hasta ([a-z]{3}-\d{2})\)/i) ?? [])[1] ?? '');
  const foreignPeriod = semesterFromLabel((foreign.title.match(/\(hasta ([12]S\d{2})\)/i) ?? [])[1] ?? '');
  return {
    housing: { ...housing, period: housingPeriod },
    foreign: { ...foreign, period: foreignPeriod },
  };
}

export function buildSpainNotaryLayer(input: {
  now: Date;
  provinceKeys: string[];
  housingFile: CienDownload;
  foreignFile: CienDownload;
  housing: HousingParsed;
  buyers: BuyerRow[];
  communities: ForeignCommunity[];
  nationalities: NationalityRow[];
  nationalitiesResident: NationalityRow[];
  nationalitiesNonResident: NationalityRow[];
  foreignPeriod: string;
}): SpainNotaryLayer {
  const unknown = input.provinceKeys.filter((key) => !PROVINCE_GEO[key]);
  if (unknown.length) throw new Error(`corpus province has no CIEN community: ${unknown.join(', ')}`);
  const spain = input.housing.latest.find((r) => r.code === 'TOTAL');
  if (!spain || !(spain.all.eur_m2 > 0) || !(spain.all.transactions > 0)) {
    throw new Error('Spain row has no positive notary price or transactions');
  }
  const file = (item: CienDownload, period: string, sourceLine: string | null): CienFileRef => ({
    publisher: PUBLISHER,
    title: item.title,
    file_date: item.date,
    file_url: item.url,
    index_url: CIEN_INDEX_URL,
    period_label: period,
    licence_note: LICENCE_NOTE,
    source_line: sourceLine,
  });
  return {
    status: 'ready',
    generated_at: input.now.toISOString(),
    retrieved_at: input.now.toISOString().slice(0, 10),
    period: spain.period,
    provisional: spain.provisional,
    provinces_in_corpus: ES_PROVINCE_DEFS.map((p) => p.key).filter((key) => input.provinceKeys.includes(key)),
    coverage_note: COVERAGE_NOTE,
    caveats: NOTARY_CAVEATS,
    method: {
      avena_median: AVENA_MEDIAN_METHOD,
      asking_vs_closing: GAP_METHOD,
      transactions: COUNT_METHOD,
      price: PRICE_METHOD,
      foreign: FOREIGN_METHOD,
    },
    omissions: OMISSIONS,
    sources: {
      housing: {
        ...file(input.housingFile, spain.period, input.housing.sourceLine),
        latest_period: spain.period,
        provisional_periods: input.housing.provisionalPeriods,
        notes: input.housing.notes,
        dwelling_split: 'all housing, flats, single-family houses',
        geography: 'autonomous community and Spain',
      },
      foreign_buyers: {
        ...file(input.foreignFile, input.foreignPeriod, null),
        period: input.foreignPeriod,
        geography: 'Spain, autonomous community, and nationality at national level',
      },
    },
    regions: input.housing.latest,
    annual: input.housing.annual,
    foreign: {
      period: input.foreignPeriod,
      buyers: input.buyers,
      communities: input.communities,
      nationalities: input.nationalities,
      nationalities_resident: input.nationalitiesResident,
      nationalities_non_resident: input.nationalitiesNonResident,
    },
  };
}

export function notaryLayerFingerprint(layer: SpainNotaryLayer): string {
  return JSON.stringify(layer, (key, value) => (key === 'generated_at' || key === 'retrieved_at' ? undefined : value));
}

export interface NotaryListing {
  location: string;
  askingEurM2: number | null;
}

export interface NotaryProvinceRow {
  name: string;
  slug: string;
  key: string;
  ccaa: string;
  geo_code: GeoCode;
  geo_name: string;
  territory_equals_province: boolean;
  ceuta_melilla_included: boolean;
  listings: number;
  unpriced_listings: number;
  avena_median_asking_eur_m2: number | null;
  notary: NotaryMetric | null;
  flat: NotaryMetric | null;
  house: NotaryMetric | null;
  period: string | null;
  provisional: boolean | null;
  asking_vs_closing_pct: number | null;
  foreign: ForeignCommunity | null;
}

export interface NotaryTownRow {
  town: string;
  province: string;
  province_key: string;
  listings: number;
  priced_listings: number;
  avena_median_asking_eur_m2: number | null;
  notary_eur_m2: null;
  asking_vs_closing_pct: null;
  status: 'not_published' | 'insufficient';
}

export interface EsNotaryView {
  ok: true;
  status: 'ready';
  generated_at: string;
  retrieved_at: string;
  period: string;
  provisional: boolean;
  coverage_note: string;
  caveats: string[];
  method: SpainNotaryLayer['method'];
  omissions: LayerOmission[];
  sources: SpainNotaryLayer['sources'];
  national: NotaryRegion;
  annual_spain: AnnualRegion | null;
  annual_year: number | null;
  provinces: NotaryProvinceRow[];
  towns: NotaryTownRow[];
  foreign: SpainNotaryLayer['foreign'];
  unmapped_listings: number;
  summary: {
    provinces: number;
    compared: number;
    towns: number;
    towns_with_asking_median: number;
    towns_with_notary_price: 0;
  };
}

export function buildEsNotaryView(layer: SpainNotaryLayer, listings: readonly NotaryListing[]): EsNotaryView {
  const byCode = new Map(layer.regions.map((r) => [r.code, r]));
  const foreignByCode = new Map(layer.foreign.communities.map((r) => [r.code, r]));
  const groups = new Map<string, { priced: number[]; unpriced: number; listings: number }>();
  const towns = new Map<string, { town: string; province: string; province_key: string; priced: number[]; listings: number }>();
  let unmapped = 0;
  for (const listing of listings) {
    const def = provinceFromLocation(listing.location);
    if (!def) { unmapped++; continue; }
    let g = groups.get(def.key);
    if (!g) { g = { priced: [], unpriced: 0, listings: 0 }; groups.set(def.key, g); }
    g.listings++;
    const priced = listing.askingEurM2 != null && Number.isFinite(listing.askingEurM2) && listing.askingEurM2 > 0;
    if (priced) g.priced.push(listing.askingEurM2 as number);
    else g.unpriced++;
    const town = listing.location.split(',')[0]?.trim() || '';
    if (!town) continue;
    const townKey = `${def.key}|${fold(town)}`;
    let t = towns.get(townKey);
    if (!t) { t = { town, province: def.name, province_key: def.key, priced: [], listings: 0 }; towns.set(townKey, t); }
    t.listings++;
    if (priced) t.priced.push(listing.askingEurM2 as number);
  }

  const provinces: NotaryProvinceRow[] = ES_PROVINCE_DEFS.filter((def) => groups.has(def.key) || layer.provinces_in_corpus.includes(def.key)).map((def) => {
    const geo = PROVINCE_GEO[def.key];
    const region = geo ? byCode.get(geo) ?? null : null;
    const g = groups.get(def.key) ?? { priced: [], unpriced: 0, listings: 0 };
    const median = medianPositive(g.priced);
    return provinceRow(def, geo, region, foreignByCode.get(geo) ?? null, g, median);
  });

  const townRows: NotaryTownRow[] = [...towns.values()]
    .map((t) => {
      const enough = t.priced.length >= MIN_PRICED_LISTINGS;
      return {
        town: t.town,
        province: t.province,
        province_key: t.province_key,
        listings: t.listings,
        priced_listings: t.priced.length,
        avena_median_asking_eur_m2: enough ? medianPositive(t.priced) : null,
        notary_eur_m2: null as null,
        asking_vs_closing_pct: null as null,
        status: enough ? 'not_published' as const : 'insufficient' as const,
      };
    })
    .sort((a, b) => a.province.localeCompare(b.province, 'en') || a.town.localeCompare(b.town, 'es'));

  const national = byCode.get('TOTAL');
  if (!national) throw new Error('notary layer has no Spain row');
  return {
    ok: true,
    status: 'ready',
    generated_at: layer.generated_at,
    retrieved_at: layer.retrieved_at,
    period: layer.period,
    provisional: layer.provisional,
    coverage_note: layer.coverage_note,
    caveats: layer.caveats,
    method: layer.method,
    omissions: layer.omissions,
    sources: layer.sources,
    national,
    annual_spain: layer.annual?.regions.find((r) => r.code === 'TOTAL') ?? null,
    annual_year: layer.annual?.year ?? null,
    provinces,
    towns: townRows,
    foreign: layer.foreign,
    unmapped_listings: unmapped,
    summary: {
      provinces: provinces.length,
      compared: provinces.filter((p) => p.asking_vs_closing_pct != null).length,
      towns: townRows.length,
      towns_with_asking_median: townRows.filter((t) => t.avena_median_asking_eur_m2 != null).length,
      towns_with_notary_price: 0,
    },
  };
}

function provinceRow(
  def: ProvinceDef,
  geo: GeoCode | undefined,
  region: NotaryRegion | null,
  foreign: ForeignCommunity | null,
  g: { priced: number[]; unpriced: number; listings: number },
  median: number | null,
): NotaryProvinceRow {
  const equals = def.ineTerritoryEqualsProvince && geo === 'MUR';
  return {
    name: def.name,
    slug: def.slug,
    key: def.key,
    ccaa: def.ccaaIne,
    geo_code: geo ?? 'TOTAL',
    geo_name: region?.name ?? '',
    territory_equals_province: equals,
    ceuta_melilla_included: region?.ceuta_melilla_included ?? false,
    listings: g.listings,
    unpriced_listings: g.unpriced,
    avena_median_asking_eur_m2: median,
    notary: region?.all ?? null,
    flat: region?.flat ?? null,
    house: region?.house ?? null,
    period: region?.period ?? null,
    provisional: region?.provisional ?? null,
    asking_vs_closing_pct: askingVsAppraisalPct(median, region?.all.eur_m2 ?? null),
    foreign,
  };
}
