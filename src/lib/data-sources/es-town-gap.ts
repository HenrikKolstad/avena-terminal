/**
 * Municipal asking-versus-appraisal layer for the towns in Avena's book.
 *
 * The figure is the mean appraised €/m² of free-market housing in
 * municipalities of more than 25,000 inhabitants, from the statistical
 * bulletin of the Ministerio de Transportes y Movilidad Sostenible
 * (file 35103500.XLS, "Valor tasado de vivienda libre"). From 2010 the
 * sheet splits that mean into homes up to five years old and older homes.
 * Up to five years is the closest official municipal figure to a new build.
 * It is an appraisal. It is not a price on a deed.
 *
 * Notarial transaction €/m² is not in this file. The Portal Estadístico del
 * Notariado forbids commercial reproduction, and the ministry transaction
 * file (VDP003_01) has no municipality and no €/m². See the omissions.
 *
 * A blank is not a zero. A cell printed "n.r" stays withheld. A town with
 * fewer than MIN_PRICED_LISTINGS positive asking prices does not get a
 * median or a gap. A town the sheet does not name does not inherit a
 * neighbour's number.
 *
 * Network I/O lives in scripts/ingest-es-town-gap.ts. Nothing here fetches.
 */

import {
  ES_PROVINCE_DEFS,
  REGISTRADORES_DATASET_URL,
  askingVsAppraisalPct,
  fold,
  medianPositive,
  provinceFromLocation,
  provinceKey,
  registradoresOmission,
  type LayerOmission,
} from './ine-es';
import { VDP003_URL, fileModifiedDay } from './es-supply';

export { fileModifiedDay, medianPositive, askingVsAppraisalPct, provinceFromLocation, provinceKey };

export const MIN_PRICED_LISTINGS = 8;

export const BULLETIN_FILE = '35103500.XLS';
export const BULLETIN_XLS_URL = 'https://apps.fomento.gob.es/Boletinonline2/sedal/35103500.XLS';
export const BULLETIN_PAGE_URL = 'https://apps.fomento.gob.es/Boletinonline2/?nivel=2&orden=35000000';
export const NOTARIADO_TERMS_URL = 'https://penotariado.com/inmobiliario/terminos-y-condiciones';
export const NOTARIADO_PORTAL_URL = 'https://penotariado.com/inmobiliario/home';

export const VDP003_HEADER =
  'CODCOMUNIDAD;COMUNIDAD;CODPROVINCIA;PROVINCIA;Tipo;regimen;AÑO;Trimestre;Numero_Transacciones;Valor_Transacciones';

const ARTICLES = new Set(['el', 'la', 'los', 'las']);
const QUARTER_WORD: Record<string, number> = { primer: 1, segundo: 2, tercer: 3, cuarto: 4 };
const SHEET_NAME = /^T([1-4])A(\d{4})$/;
const TITLE = /(Primer|Segundo|Tercer|Cuarto) trimestre de (\d{4})/i;

export const UP_TO_FIVE_DEFINITION =
  'Mean appraised value per m² of free-market housing (vivienda libre) up to five years old, in a municipality of more than 25,000 inhabitants. ' +
  'Statistical bulletin of the Ministerio de Transportes y Movilidad Sostenible, file 35103500.XLS. ' +
  'An appraisal of homes of that age. Not a price recorded on a sale, and not a count of new-build deeds.';

export const OVER_FIVE_DEFINITION =
  'Mean appraised value per m² of free-market housing more than five years old, from the same municipal sheet. Not a second-hand transaction price.';

export const ALL_AGES_DEFINITION =
  'Mean appraised value per m² of free-market housing of all ages, the column the sheet labels Total. It mixes homes up to five years old with older homes. It is not the up-to-five-years figure.';

export const AVENA_MEDIAN_METHOD =
  `Median asking €/m² of new-build listings in the deployed corpus whose town and province are this place. ` +
  `€/m² is the midpoint of the asking price range divided by built area, the same figure shown on each listing. ` +
  `Listings with no positive €/m² are counted and excluded from the median. ` +
  `The median is published only when at least ${MIN_PRICED_LISTINGS} listings in the town have a positive asking €/m². ` +
  `Below that, the median and both gaps are left blank. This floor is for the median on this page. It is not the towns.csv publication rule.`;

export const GAP_METHOD =
  'asking_vs_appraisal_pct = (Avena median asking €/m² − ministry appraised €/m²) / ministry appraised €/m², in percent, rounded to 0.1. ' +
  'Positive means the asking median sits above the appraisal. Derived by Avena. It is not a statistic published by the ministry. ' +
  'The up-to-five-years gap uses only that column. When the sheet prints n.r. there, the gap is blank and the all-ages column is not copied into it.';

export const COVERAGE_NOTE =
  'Municipal rows are the ministry appraisal for free-market housing in municipalities of more than 25,000 inhabitants. ' +
  'The sheet splits the mean into homes up to five years old and older homes. Up to five years is the comparison used for Avena\'s new-build asking prices, and it is still an appraisal of that age, not a transaction price. ' +
  'A cell printed n.r. is withheld by the ministry and stays blank. ' +
  'A place the sheet does not name, including a municipality of 25,000 inhabitants or fewer and a district that is not itself the municipality, has no official figure. A neighbouring municipality is not substituted. ' +
  `A median and a gap are published only for a town with at least ${MIN_PRICED_LISTINGS} listings that have a positive asking €/m². ` +
  'The sheet\'s own province label is kept, including where two Castellón municipalities are printed in the Alicante block.';

export const TOWN_CAVEATS = [
  'Avena\'s figure is the median asking price per m² of coastal new-build listings in the current corpus. It is not a price at which a home has sold, and it is not the median of every home in the municipality.',
  'The ministry figure is the mean appraised value per m² of free-market housing. The up-to-five-years column is homes of that age. It is not limited to dwellings sold as new, and it is not a notarial or registered transaction price.',
  'The all-ages column mixes those homes with older ones. A gap against it is labelled all-ages. It is not copied into the up-to-five-years gap when that cell is n.r.',
  'The sheet covers municipalities of more than 25,000 inhabitants. Smaller municipalities, and Avena place names that are districts rather than the municipality, are absent. Their absence is not filled in.',
  `Towns with fewer than ${MIN_PRICED_LISTINGS} listings that have a positive asking €/m² are marked insufficient. No median and no gap is published for them. The ministry figure is still shown when the town matched a row.`,
  'No comparison on this page is a statistic published by the ministry, INE, the notaries or the registrars.',
];

const SOURCE_NAME = 'Ministerio de Transportes y Movilidad Sostenible';

export type SheetCell = string | number | boolean | null;

export interface PriceCell {
  /** Null when the sheet prints n.r. Never coerced from a blank or from zero. */
  value: number | null;
  withheld: boolean;
}

export interface MunicipalAppraisal {
  /** Province label printed on the sheet. Not corrected. */
  province_name: string;
  province_key: string;
  /** Province name as Avena publishes it. */
  province: string;
  /** Municipality label printed on the sheet. */
  municipality: string;
  /** Folded match keys. Article order, a slash and a hyphen are already expanded. */
  keys: string[];
  up_to_five_years_eur_m2: number | null;
  up_to_five_years_withheld: boolean;
  over_five_years_eur_m2: number | null;
  over_five_years_withheld: boolean;
  total_eur_m2: number | null;
  total_withheld: boolean;
  appraisals_up_to_five_years: number;
  appraisals_over_five_years: number;
  appraisals_total: number;
}

export interface TownLayerSources {
  municipal_appraisal: {
    publisher: string;
    series: string;
    file: string;
    url: string;
    bulletin_url: string;
    licence_note: string;
    file_modified: string | null;
    file_modified_note: string;
    period: string;
    unit_label: string;
    up_to_five_years_definition: string;
    over_five_years_definition: string;
    all_ages_definition: string;
    municipalities_in_sheet: number;
    municipalities_published: number;
  };
}

export interface SpainTownLayer {
  status: 'ready';
  generated_at: string;
  retrieved_at: string;
  period: string;
  sheet: string;
  provinces_in_corpus: string[];
  coverage_note: string;
  caveats: string[];
  omissions: LayerOmission[];
  sources: TownLayerSources;
  municipalities: MunicipalAppraisal[];
}

const NOTARY_OMISSION: LayerOmission = {
  source: 'Consejo General del Notariado',
  url: NOTARIADO_TERMS_URL,
  ingested: false,
  reason:
    'The Portal Estadístico del Notariado (penotariado.com) describes aggregate transaction prices down to municipality and postal code. ' +
    'Its terms prohibit commercial use, and they prohibit reproduction or distribution of the contents without authorisation. ' +
    'The access table on those terms gives a public user provincial depth. No keyless municipal €/m² file was ingested.',
};

function vdp003Omission(header: string | null): LayerOmission {
  const base = {
    source: 'Ministerio de Vivienda y Agenda Urbana, VDP003_01',
    url: VDP003_URL,
    ingested: false as const,
  };
  if (header == null) {
    return {
      ...base,
      reason: 'The transaction file could not be re-read while this layer was built. No figure from it was ingested. The last time it was read, its columns were a provincial count and a provincial total value, with no municipality and no €/m².',
    };
  }
  const got = header.replace(/^\uFEFF/, '').trim();
  if (got !== VDP003_HEADER) {
    throw new Error(
      `VDP003_01 header is no longer the provincial count-and-value file (${got.slice(0, 180)}). Refusing to keep describing it as a file with no municipal €/m².`,
    );
  }
  return {
    ...base,
    reason:
      'The file was re-read. Its columns are a province, a dwelling type, a quarter, a transaction count and a total transaction value. There is no municipality column and no €/m² column, so it cannot fill this layer. No figure from it was ingested.',
  };
}

function clean(s: string): string {
  return fold(s)
    .replace(/[_'’]/g, '')
    .replace(/-/g, ' ')
    .replace(/[(),.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function addArticleForms(s: string, into: Set<string>) {
  if (!s) return;
  into.add(s);
  const bits = s.split(' ').filter(Boolean);
  if (bits.length > 1 && ARTICLES.has(bits[0])) into.add(bits.slice(1).join(' '));
  if (bits.length > 1 && ARTICLES.has(bits[bits.length - 1])) {
    const core = bits.slice(0, -1).join(' ');
    into.add(core);
    into.add(`${bits[bits.length - 1]} ${core}`);
  }
}

/**
 * Match keys for a municipality label. Accent, article order ("Campello, el"
 * and "El Campello"), a hyphen ("Torre-Pacheco") and a bilingual slash
 * ("Jávea/Xábia", also as "Jávea Xàbia") land on the same key. A shorter
 * name is not treated as a match for a longer one: "Málaga" does not match
 * "Vélez Málaga", and "Orihuela" does not match "Orihuela Costa".
 */
export function municipalityKeys(name: string): string[] {
  const folded = fold(name).replace(/[_'’]/g, '').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  const parts = folded.split('/').map((p) => clean(p)).filter(Boolean);
  const into = new Set<string>();
  const bases = parts.length > 1 ? [...parts, clean(parts.join(' '))] : [clean(folded)];
  for (const b of bases) addArticleForms(b, into);
  into.delete('');
  return [...into];
}

/** Stable id for one Avena spelling. Article-free when the name has an article. */
export function townGroupKey(name: string): string {
  const keys = municipalityKeys(name);
  const bare = keys.filter((k) => !/^(el|la|los|las) /.test(k));
  const pool = bare.length ? bare : keys;
  return pool.slice().sort((a, b) => a.length - b.length || (a < b ? -1 : 1))[0] ?? '';
}

export function sheetPeriod(name: string): string | null {
  const m = SHEET_NAME.exec(name.trim());
  if (!m) return null;
  return `${m[2]}-Q${m[1]}`;
}

/** The newest T{quarter}A{year} sheet. Two sheets for the same quarter is a refusal. */
export function selectLatestSheet(names: readonly string[]): string {
  const parsed = names
    .map((n) => ({ n, period: sheetPeriod(n) }))
    .filter((x): x is { n: string; period: string } => x.period != null);
  if (parsed.length === 0) throw new Error('municipal workbook has no quarterly sheet name');
  parsed.sort((a, b) => (a.period < b.period ? -1 : a.period > b.period ? 1 : 0));
  const latest = parsed[parsed.length - 1].period;
  const hits = parsed.filter((x) => x.period === latest);
  if (hits.length !== 1) throw new Error(`municipal workbook has ${hits.length} sheets for ${latest}`);
  return hits[0].n;
}

function cellText(cell: SheetCell | undefined): string {
  if (cell == null || cell === false || cell === true) return '';
  if (typeof cell === 'number') return '';
  return cell.trim();
}

function priceCell(cell: SheetCell | undefined, label: string): PriceCell {
  if (cell == null || cell === '') throw new Error(`${label}: blank price`);
  if (typeof cell === 'string') {
    const t = cell.trim().toLowerCase().replace(/\s+/g, '');
    if (t === 'n.r' || t === 'n.r.' || t === 'nr') return { value: null, withheld: true };
    throw new Error(`${label}: price not understood: "${cell}"`);
  }
  if (typeof cell !== 'number' || !Number.isFinite(cell)) throw new Error(`${label}: price not understood: ${String(cell)}`);
  if (cell <= 0) throw new Error(`${label}: non-positive price ${cell}`);
  return { value: cell, withheld: false };
}

function countCell(cell: SheetCell | undefined, label: string): number {
  if (typeof cell !== 'number' || !Number.isFinite(cell)) throw new Error(`${label}: appraisal count not understood: ${String(cell)}`);
  if (cell < 0 || Math.abs(cell - Math.round(cell)) > 1e-6) throw new Error(`${label}: appraisal count is not a whole number: ${cell}`);
  return Math.round(cell);
}

function assertCountAgrees(price: PriceCell, count: number, label: string) {
  if (price.value != null && count < 1) throw new Error(`${label}: a published €/m² with ${count} appraisals`);
}

interface HeaderMap {
  dataStart: number;
  province: number;
  municipality: number;
  valueUpToFive: number;
  valueOverFive: number;
  valueTotal: number;
  countUpToFive: number;
  countOverFive: number;
  countTotal: number;
}

function findHeader(rows: SheetCell[][]): HeaderMap {
  let provinceRow = -1;
  for (let r = 0; r < Math.min(rows.length, 40); r++) {
    const texts = rows[r].map(cellText);
    if (texts.includes('Provincia') && texts.includes('Municipio')) provinceRow = r;
  }
  if (provinceRow < 0) throw new Error('municipal sheet has no Provincia / Municipio header');
  const head = rows[provinceRow].map(cellText);
  let splitRow = -1;
  for (let r = provinceRow; r < Math.min(rows.length, provinceRow + 4); r++) {
    if (rows[r].some((c) => cellText(c).startsWith('Hasta cinco'))) splitRow = r;
  }
  if (splitRow < 0) throw new Error('municipal sheet has no up-to-five-years column. Refusing to publish the all-ages total as that split.');
  const split = rows[splitRow].map(cellText);
  const upto = indexesWhere(split, (t) => t.startsWith('Hasta cinco'));
  const over = indexesWhere(split, (t) => t.startsWith('Con más de cinco') || t.startsWith('Con mas de cinco'));
  const total = indexesWhere(split, (t) => t === 'Total');
  if (upto.length !== 2 || over.length !== 2 || total.length !== 2) {
    throw new Error(`municipal age split not understood (upto ${upto.length}, over ${over.length}, total ${total.length})`);
  }
  // The value block is the first trio, the appraisal-count block the second.
  const order = [
    { i: upto[0], k: 'u' }, { i: over[0], k: 'o' }, { i: total[0], k: 't' },
    { i: upto[1], k: 'U' }, { i: over[1], k: 'O' }, { i: total[1], k: 'T' },
  ].sort((a, b) => a.i - b.i).map((x) => x.k).join('');
  if (order !== 'uotUOT') throw new Error(`municipal age columns are in an unexpected order (${order})`);
  let dataStart = splitRow + 1;
  if (rows[dataStart]?.some((c) => /antig/i.test(cellText(c)))) dataStart += 1;
  return {
    dataStart,
    province: head.indexOf('Provincia'),
    municipality: head.indexOf('Municipio'),
    valueUpToFive: upto[0],
    valueOverFive: over[0],
    valueTotal: total[0],
    countUpToFive: upto[1],
    countOverFive: over[1],
    countTotal: total[1],
  };
}

function indexesWhere(cells: string[], pred: (t: string) => boolean): number[] {
  const out: number[] = [];
  cells.forEach((t, i) => { if (pred(t)) out.push(i); });
  return out;
}

function titlePeriod(rows: SheetCell[][]): string {
  for (const row of rows.slice(0, 25)) {
    for (const cell of row) {
      const text = cellText(cell);
      const m = TITLE.exec(text);
      if (!m) continue;
      const q = QUARTER_WORD[fold(m[1])];
      if (!q) throw new Error(`municipal quarter word not understood: "${m[1]}"`);
      return `${m[2]}-Q${q}`;
    }
  }
  throw new Error('municipal sheet has no quarter title');
}

/**
 * Parse the latest municipal sheet. Every municipality on the sheet is
 * returned. The caller keeps the provinces it publishes. A duplicated match
 * key inside one province is a refusal.
 */
export function parseMunicipalSheet(rows: SheetCell[][], sheetName: string): { period: string; municipalities: MunicipalAppraisal[] } {
  if (!Array.isArray(rows) || rows.length < 10) throw new Error('municipal sheet is empty');
  const fromName = sheetPeriod(sheetName);
  if (!fromName) throw new Error(`municipal sheet name not understood: "${sheetName}"`);
  const fromTitle = titlePeriod(rows);
  if (fromName !== fromTitle) throw new Error(`municipal period disagreement: sheet ${fromName} but title ${fromTitle}`);
  const header = findHeader(rows);
  const parsed: MunicipalAppraisal[] = [];
  let provinceName = '';
  const seenKey = new Map<string, string>();
  for (let r = header.dataStart; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const any = row.some((c) => c != null && String(c).trim() !== '');
    if (!any) continue;
    const printedProvince = cellText(row[header.province]);
    const municipality = cellText(row[header.municipality]);
    const valued = [header.valueUpToFive, header.valueOverFive, header.valueTotal, header.countUpToFive, header.countOverFive, header.countTotal]
      .some((c) => row[c] != null && String(row[c]).trim() !== '');
    // The sheet ends with a note in the province column ("n.r: el dato no es representativo…")
    // and sometimes a province cell that is only a space. Neither is a municipality.
    if (!municipality) {
      if (!valued) continue;
      throw new Error(`municipal row ${r + 1}: a value with no municipality`);
    }
    if (printedProvince) provinceName = printedProvince;
    if (municipality.length > 80) throw new Error(`municipal row ${r + 1}: municipality label is too long to be a name`);
    if (!provinceName) throw new Error(`municipal row ${r + 1}: municipality before any province`);
    const where = `${provinceName} / ${municipality} / ${fromName}`;
    const upToFive = priceCell(row[header.valueUpToFive], `${where} up to five years`);
    const overFive = priceCell(row[header.valueOverFive], `${where} over five years`);
    const total = priceCell(row[header.valueTotal], `${where} total`);
    const countUpToFive = countCell(row[header.countUpToFive], `${where} up-to-five count`);
    const countOverFive = countCell(row[header.countOverFive], `${where} over-five count`);
    const countTotal = countCell(row[header.countTotal], `${where} total count`);
    assertCountAgrees(upToFive, countUpToFive, `${where} up to five years`);
    assertCountAgrees(overFive, countOverFive, `${where} over five years`);
    assertCountAgrees(total, countTotal, `${where} total`);
    const def = ES_PROVINCE_DEFS.find((p) => p.key === provinceKey(provinceName)) ?? null;
    const keys = municipalityKeys(municipality);
    if (keys.length === 0) throw new Error(`${where}: municipality produced no match key`);
    if (def) {
      for (const key of keys) {
        const id = `${def.key}::${key}`;
        const prev = seenKey.get(id);
        if (prev && prev !== municipality) throw new Error(`municipal match key "${key}" is both ${prev} and ${municipality} in ${def.name}`);
        seenKey.set(id, municipality);
      }
    }
    parsed.push({
      province_name: provinceName,
      province_key: def?.key ?? provinceKey(provinceName),
      province: def?.name ?? provinceName,
      municipality,
      keys,
      up_to_five_years_eur_m2: upToFive.value,
      up_to_five_years_withheld: upToFive.withheld,
      over_five_years_eur_m2: overFive.value,
      over_five_years_withheld: overFive.withheld,
      total_eur_m2: total.value,
      total_withheld: total.withheld,
      appraisals_up_to_five_years: countUpToFive,
      appraisals_over_five_years: countOverFive,
      appraisals_total: countTotal,
    });
  }
  if (parsed.length === 0) throw new Error('municipal sheet has no municipality rows');
  const numeric = parsed.filter((m) => m.up_to_five_years_eur_m2 != null || m.total_eur_m2 != null);
  if (numeric.length === 0) throw new Error('municipal sheet has no numeric appraisal');
  return { period: fromName, municipalities: parsed };
}

export interface BuildTownLayerInput {
  now: Date;
  sheetName: string;
  rows: SheetCell[][];
  fileModified: string | null;
  /** Province keys present in the corpus. */
  provinceKeys: readonly string[];
  registradoresStatus: number | null;
  /** First line of VDP003_01, or null when the fetch failed. */
  vdp003Header: string | null;
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function buildSpainTownLayer(input: BuildTownLayerInput): SpainTownLayer {
  const unknown = input.provinceKeys.filter((k) => !ES_PROVINCE_DEFS.some((p) => p.key === k));
  if (unknown.length) throw new Error(`Unknown province keys: ${unknown.join(', ')}`);
  if (input.provinceKeys.length === 0) throw new Error('No corpus province to publish');
  const parsed = parseMunicipalSheet(input.rows, input.sheetName);
  if (parsed.municipalities.length < 50) {
    throw new Error(`municipal sheet parsed ${parsed.municipalities.length} municipalities, which is too few to be the national table`);
  }
  const want = new Set(input.provinceKeys);
  const municipalities = parsed.municipalities.filter((m) => want.has(m.province_key));
  const present = new Set(municipalities.map((m) => m.province_key));
  const missing = input.provinceKeys.filter((k) => !present.has(k));
  if (missing.length) {
    throw new Error(`municipal sheet has no row for corpus province ${missing.join(', ')}`);
  }
  const defs = ES_PROVINCE_DEFS.filter((p) => want.has(p.key));
  return {
    status: 'ready',
    generated_at: input.now.toISOString(),
    retrieved_at: isoDay(input.now),
    period: parsed.period,
    sheet: input.sheetName.trim(),
    provinces_in_corpus: defs.map((d) => d.name),
    coverage_note: COVERAGE_NOTE,
    caveats: TOWN_CAVEATS,
    omissions: [registradoresOmission(input.registradoresStatus), NOTARY_OMISSION, vdp003Omission(input.vdp003Header)],
    sources: {
      municipal_appraisal: {
        publisher: SOURCE_NAME,
        series: 'Valor tasado medio de vivienda libre de los municipios mayores de 25.000 habitantes',
        file: BULLETIN_FILE,
        url: BULLETIN_XLS_URL,
        bulletin_url: BULLETIN_PAGE_URL,
        licence_note:
          'Public statistical bulletin download. The sheet does not print a Creative Commons licence, and this layer does not claim one. ' +
          'The provincial appraisal CSV (VDP006_01) is a different file, licensed CC BY 4.0, and it has no municipality column.',
        file_modified: input.fileModified,
        file_modified_note:
          'file_modified is the Last-Modified day of the downloaded workbook, in UTC. It is the timestamp the file server sent. When the server sends no Last-Modified header, file_modified is null.',
        period: parsed.period,
        unit_label: 'euros/m2',
        up_to_five_years_definition: UP_TO_FIVE_DEFINITION,
        over_five_years_definition: OVER_FIVE_DEFINITION,
        all_ages_definition: ALL_AGES_DEFINITION,
        municipalities_in_sheet: parsed.municipalities.length,
        municipalities_published: municipalities.length,
      },
    },
    municipalities,
  };
}

export function townLayerFingerprint(layer: SpainTownLayer): string {
  return JSON.stringify(layer, (key, value) => (key === 'generated_at' || key === 'retrieved_at' ? undefined : value));
}

// ─── Join to the Avena book ─────────────────────────────────────────────────

export interface TownAsking {
  location: string;
  askingEurM2: number | null;
}

export type TownAge = 'up_to_five_years' | 'over_five_years' | 'all_ages';

export interface PublishedAppraisal {
  value: number;
  unit: 'eur_per_m2';
  unit_label: string;
  period: string;
  series_id: string;
  source: 'mitms_bulletin';
  source_name: string;
  source_url: string;
  retrieved_at: string;
  file_modified: string | null;
  appraisals: number;
  age: TownAge;
  definition: string;
}

export interface WithheldAppraisal {
  withheld: true;
  printed: 'n.r';
  period: string;
  series_id: string;
  source: 'mitms_bulletin';
  source_name: string;
  source_url: string;
  retrieved_at: string;
  file_modified: string | null;
  appraisals: number;
  age: TownAge;
  reason: string;
}

export type AppraisalSlot = PublishedAppraisal | WithheldAppraisal;

export interface DerivedGap {
  value: number;
  unit: 'pct';
  derived: true;
  basis: 'up_to_five_years' | 'all_ages';
  method: string;
  asking_eur_m2: number;
  benchmark_eur_m2: number;
  benchmark_series_id: string;
  benchmark_period: string;
  benchmark_retrieved_at: string;
}

export type TownStatus = 'gap' | 'all_ages_only' | 'withheld' | 'insufficient' | 'not_in_table';

export interface TownGapRow {
  town: string;
  province: string;
  province_key: string;
  /** Official municipality label when a row matched. Null when the sheet has no such place. */
  municipality: string | null;
  also_seen: string[];
  listings: number;
  priced_listings: number;
  unpriced_listings: number;
  status: TownStatus;
  avena_median_asking_eur_m2: number | null;
  up_to_five_years: AppraisalSlot | null;
  over_five_years: AppraisalSlot | null;
  all_ages: AppraisalSlot | null;
  asking_vs_up_to_five_years_pct: DerivedGap | null;
  asking_vs_all_ages_pct: DerivedGap | null;
}

export interface TownGapSummary {
  towns: number;
  min_priced_listings: number;
  with_up_to_five_year_gap: number;
  all_ages_only: number;
  withheld: number;
  insufficient_listings: number;
  not_in_ministry_table: number;
}

export interface EsTownGap {
  ok: true;
  status: 'ready' | 'pending';
  comparison: 'asking_vs_municipal_appraisal';
  generated_at: string | null;
  retrieved_at: string | null;
  period: string | null;
  min_priced_listings: number;
  method: { avena_median: string; gap: string };
  caveats: string[];
  coverage_note: string | null;
  omissions: LayerOmission[];
  sources: TownLayerSources | null;
  summary: TownGapSummary;
  towns: TownGapRow[];
  unmapped_listings: number;
  unpriced_listings: number;
}

function seriesId(m: MunicipalAppraisal, age: TownAge): string {
  const slug = fold(m.municipality).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const ageId = age === 'up_to_five_years' ? 'le5y' : age === 'over_five_years' ? 'gt5y' : 'all';
  return `35103500:libre:${ageId}:prov=${m.province_key}:muni=${slug}`;
}

function slotFor(
  layer: SpainTownLayer,
  m: MunicipalAppraisal,
  age: TownAge,
  value: number | null,
  withheld: boolean,
  appraisals: number,
  definition: string,
): AppraisalSlot {
  const base = {
    period: layer.period,
    series_id: seriesId(m, age),
    source: 'mitms_bulletin' as const,
    source_name: SOURCE_NAME,
    source_url: BULLETIN_XLS_URL,
    retrieved_at: layer.retrieved_at,
    file_modified: layer.sources.municipal_appraisal.file_modified,
    appraisals,
    age,
  };
  if (value == null) {
    return {
      ...base,
      withheld: true,
      printed: 'n.r',
      reason: withheld
        ? 'The sheet prints n.r. for this cell. The price is not published, and it is not filled from another column.'
        : 'The sheet has no price in this cell.',
    };
  }
  return {
    ...base,
    value,
    unit: 'eur_per_m2',
    unit_label: layer.sources.municipal_appraisal.unit_label,
    definition,
  };
}

function isPublished(slot: AppraisalSlot | null): slot is PublishedAppraisal {
  return slot != null && !('withheld' in slot);
}

function gapFor(median: number | null, slot: AppraisalSlot | null, basis: DerivedGap['basis']): DerivedGap | null {
  if (median == null || !isPublished(slot)) return null;
  const value = askingVsAppraisalPct(median, slot.value);
  if (value == null) return null;
  return {
    value,
    unit: 'pct',
    derived: true,
    basis,
    method: GAP_METHOD,
    asking_eur_m2: median,
    benchmark_eur_m2: slot.value,
    benchmark_series_id: slot.series_id,
    benchmark_period: slot.period,
    benchmark_retrieved_at: slot.retrieved_at,
  };
}

interface Acc {
  provinceKey: string;
  provinceName: string;
  spellings: Map<string, number>;
  priced: number[];
  listings: number;
  unpriced: number;
}

function emptySummary(): TownGapSummary {
  return {
    towns: 0,
    min_priced_listings: MIN_PRICED_LISTINGS,
    with_up_to_five_year_gap: 0,
    all_ages_only: 0,
    withheld: 0,
    insufficient_listings: 0,
    not_in_ministry_table: 0,
  };
}

export function buildTownGapView(layer: SpainTownLayer | null, listings: readonly TownAsking[]): EsTownGap {
  const groups = new Map<string, Acc>();
  let unmapped = 0;
  for (const listing of listings) {
    const def = provinceFromLocation(listing.location);
    const town = listing.location.split(',')[0]?.trim() ?? '';
    if (!def || !town) { unmapped++; continue; }
    const id = `${def.key}::${townGroupKey(town)}`;
    let g = groups.get(id);
    if (!g) {
      g = { provinceKey: def.key, provinceName: def.name, spellings: new Map(), priced: [], listings: 0, unpriced: 0 };
      groups.set(id, g);
    }
    g.listings++;
    g.spellings.set(town, (g.spellings.get(town) ?? 0) + 1);
    if (listing.askingEurM2 != null && Number.isFinite(listing.askingEurM2) && listing.askingEurM2 > 0) g.priced.push(listing.askingEurM2);
    else g.unpriced++;
  }

  const official = layer?.municipalities ?? [];
  type Pending = { acc: Acc; official: MunicipalAppraisal | null };
  const pending: Pending[] = [];
  for (const acc of groups.values()) {
    const display = displayTown(acc.spellings);
    const want = new Set(municipalityKeys(display));
    for (const spelling of acc.spellings.keys()) for (const key of municipalityKeys(spelling)) want.add(key);
    const hits = official.filter((m) => m.province_key === acc.provinceKey && m.keys.some((k) => want.has(k)));
    const names = [...new Set(hits.map((h) => h.municipality))];
    if (names.length > 1) {
      throw new Error(`Town "${display}" in ${acc.provinceName} matches more than one municipality: ${names.join(' | ')}`);
    }
    pending.push({ acc, official: hits[0] ?? null });
  }

  // Two Avena spellings can be the same municipality (Jávea and Jávea/Xàbia).
  // One median, not two.
  const merged = new Map<string, Pending>();
  const unmatched: Pending[] = [];
  for (const row of pending) {
    if (!row.official) { unmatched.push(row); continue; }
    const id = `${row.official.province_key}::${row.official.municipality}`;
    const prev = merged.get(id);
    if (!prev) { merged.set(id, row); continue; }
    prev.acc.listings += row.acc.listings;
    prev.acc.unpriced += row.acc.unpriced;
    prev.acc.priced.push(...row.acc.priced);
    for (const [spelling, n] of row.acc.spellings) prev.acc.spellings.set(spelling, (prev.acc.spellings.get(spelling) ?? 0) + n);
  }

  const rows: TownGapRow[] = [...merged.values(), ...unmatched].map((row) => toTownRow(layer, row.acc, row.official));
  rows.sort((a, b) => b.listings - a.listings || (a.town < b.town ? -1 : 1));

  const summary = emptySummary();
  summary.towns = rows.length;
  for (const row of rows) {
    if (row.status === 'gap') summary.with_up_to_five_year_gap++;
    else if (row.status === 'all_ages_only') summary.all_ages_only++;
    else if (row.status === 'withheld') summary.withheld++;
    else if (row.status === 'insufficient') summary.insufficient_listings++;
    else summary.not_in_ministry_table++;
  }
  const unpriced = rows.reduce((n, r) => n + r.unpriced_listings, 0);

  if (!layer) {
    return {
      ok: true,
      status: 'pending',
      comparison: 'asking_vs_municipal_appraisal',
      generated_at: null,
      retrieved_at: null,
      period: null,
      min_priced_listings: MIN_PRICED_LISTINGS,
      method: { avena_median: AVENA_MEDIAN_METHOD, gap: GAP_METHOD },
      caveats: TOWN_CAVEATS,
      coverage_note: null,
      omissions: [],
      sources: null,
      summary,
      towns: rows,
      unmapped_listings: unmapped,
      unpriced_listings: unpriced,
    };
  }
  return {
    ok: true,
    status: 'ready',
    comparison: 'asking_vs_municipal_appraisal',
    generated_at: layer.generated_at,
    retrieved_at: layer.retrieved_at,
    period: layer.period,
    min_priced_listings: MIN_PRICED_LISTINGS,
    method: { avena_median: AVENA_MEDIAN_METHOD, gap: GAP_METHOD },
    caveats: layer.caveats,
    coverage_note: layer.coverage_note,
    omissions: layer.omissions,
    sources: layer.sources,
    summary,
    towns: rows,
    unmapped_listings: unmapped,
    unpriced_listings: unpriced,
  };
}

function displayTown(spellings: Map<string, number>): string {
  return [...spellings.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]?.[0] ?? '';
}

function toTownRow(layer: SpainTownLayer | null, acc: Acc, official: MunicipalAppraisal | null): TownGapRow {
  const town = displayTown(acc.spellings);
  const also = [...acc.spellings.keys()].filter((s) => s !== town).sort();
  const sufficient = acc.priced.length >= MIN_PRICED_LISTINGS;
  const median = sufficient ? medianPositive(acc.priced) : null;
  const upToFive = layer && official ? slotFor(layer, official, 'up_to_five_years', official.up_to_five_years_eur_m2, official.up_to_five_years_withheld, official.appraisals_up_to_five_years, UP_TO_FIVE_DEFINITION) : null;
  const overFive = layer && official ? slotFor(layer, official, 'over_five_years', official.over_five_years_eur_m2, official.over_five_years_withheld, official.appraisals_over_five_years, OVER_FIVE_DEFINITION) : null;
  const allAges = layer && official ? slotFor(layer, official, 'all_ages', official.total_eur_m2, official.total_withheld, official.appraisals_total, ALL_AGES_DEFINITION) : null;
  const like = gapFor(median, upToFive, 'up_to_five_years');
  const ages = gapFor(median, allAges, 'all_ages');
  let status: TownStatus;
  if (!sufficient) status = 'insufficient';
  else if (!official || !layer) status = 'not_in_table';
  else if (like) status = 'gap';
  else if (ages) status = 'all_ages_only';
  else status = 'withheld';
  return {
    town,
    province: acc.provinceName,
    province_key: acc.provinceKey,
    municipality: official?.municipality ?? null,
    also_seen: also,
    listings: acc.listings,
    priced_listings: acc.priced.length,
    unpriced_listings: acc.unpriced,
    status,
    avena_median_asking_eur_m2: median,
    up_to_five_years: upToFive,
    over_five_years: overFive,
    all_ages: allAges,
    asking_vs_up_to_five_years_pct: like,
    asking_vs_all_ages_pct: ages,
  };
}
