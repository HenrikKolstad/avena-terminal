/**
 * Tests for the Spain rent layer behind /spain/rents.
 *
 * The parsers must throw when the workbook or the IPVA payload stops meaning
 * what we think it means. A blank rent cell must not become 0. A district
 * must not inherit a municipality. The committed data/es-rents.json is
 * checked for provenance and for a sane range, not for a frozen euro value.
 *
 *   npx tsx scripts/test-es-rents.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  ALIAS_NOTE, buildEsRents, buildSpainRentLayer, disambiguateMatchKeys, fileYearSpan, impliedGrossYieldPct,
  ipvaYear, newestDatedUrl, parseIpvaDatosSerie, parseSerpaviTables, rentMatchKeys,
  resolveSerpaviLinks, selectIpvaSeries,
  type Cell, type IpvaParsed, type SpainRentLayer,
} from '../src/lib/data-sources/es-rents';
import { getAllProperties } from '../src/lib/properties';
import { getEsRents } from '../src/lib/es-rents-view';

let pass = 0;
let fail = 0;
function check(name: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}\n        got  ${g}\n        want ${w}`); }
}
function throws(name: string, fn: () => unknown, mustMention?: string) {
  try { fn(); fail++; console.log(`  FAIL  ${name}\n        returned normally; wanted a throw`); }
  catch (e) {
    const msg = (e as Error).message;
    if (mustMention && !msg.toLowerCase().includes(mustMention.toLowerCase())) {
      fail++; console.log(`  FAIL  ${name}\n        threw "${msg}", wanted mention of "${mustMention}"`);
    } else { pass++; console.log(`  PASS  ${name}`); }
  }
}

const STEMS = [
  'BI_ALVHEPCO_TVC', 'BI_ALVHEPCO_TVU',
  'ALQM2_LV_M_VC', 'ALQM2_LV_25_VC', 'ALQM2_LV_75_VC',
  'ALQM2_LV_M_VU', 'ALQM2_LV_25_VU', 'ALQM2_LV_75_VU',
  'ALQTBID12_M_VC', 'ALQTBID12_25_VC', 'ALQTBID12_75_VC',
  'ALQTBID12_M_VU', 'ALQTBID12_25_VU', 'ALQTBID12_75_VU',
  'SLVM2_M_VC', 'SLVM2_M_VU',
];

function header(ids: string[], years = ['24']): string[] {
  return [...ids, ...years.flatMap((yy) => STEMS.map((s) => `${s}_${yy}`))];
}
function row(head: string[], values: Record<string, Cell>): Cell[] {
  const out: Cell[] = head.map(() => null);
  for (const [k, v] of Object.entries(values)) {
    const i = head.indexOf(k);
    if (i < 0) throw new Error(`test header has no ${k}`);
    out[i] = v;
  }
  return out;
}
function block(prefix: 'VC' | 'VU', count: number | null, median: number | null): Record<string, Cell> {
  const countStem = prefix === 'VC' ? 'BI_ALVHEPCO_TVC_24' : 'BI_ALVHEPCO_TVU_24';
  if (count == null || median == null) return { [countStem]: count };
  return {
    [countStem]: count,
    [`ALQM2_LV_M_${prefix}_24`]: median,
    [`ALQM2_LV_25_${prefix}_24`]: median - 1,
    [`ALQM2_LV_75_${prefix}_24`]: median + 1,
    [`ALQTBID12_M_${prefix}_24`]: median * 80,
    [`ALQTBID12_25_${prefix}_24`]: median * 70,
    [`ALQTBID12_75_${prefix}_24`]: median * 90,
    [`SLVM2_M_${prefix}_24`]: 80,
  };
}

const FILE = 'https://cdn.mivau.gob.es/example/bd_SERPAVI_2011-2024.xlsx';
const META: Cell[][] = [
  ['Sistema Estatal'],
  ['BI_ALVHEPCO_TVC_AA'],
  ['ALQM2mes_LV_M_VC_AA'],
  ['ALQTBID12_M_VC_AA'],
  ['SLVM2_M_VC_AA'],
];
const PROV_HEAD = header(['CPRO', 'LITPRO']);
const MUN_HEAD = header(['CPRO', 'CUMUN', 'NMUN']);

function tables(extraMun: Cell[][] = []) {
  return parseSerpaviTables({
    metadatos: META,
    provincias: [
      PROV_HEAD,
      row(PROV_HEAD, { CPRO: '29', LITPRO: 'Málaga', ...block('VC', 60000, 9.04), ...block('VU', 9000, 6.5) }),
    ],
    municipios: [
      MUN_HEAD,
      row(MUN_HEAD, { CPRO: '29', CUMUN: '29069', NMUN: 'Marbella', ...block('VC', 6374, 9.63), ...block('VU', 857, 7.1) }),
      row(MUN_HEAD, { CPRO: '29', CUMUN: '29051', NMUN: 'Estepona', ...block('VC', 2963, 8.36), ...block('VU', 493, 6.2) }),
      row(MUN_HEAD, { CPRO: '29', CUMUN: '29099', NMUN: 'Orihuela', ...block('VC', 10, 4), ...block('VU', 2, 3) }),
      row(MUN_HEAD, { CPRO: '29', CUMUN: '29023', NMUN: 'Adsubia', ...block('VC', 7, null), ...block('VU', null, null) }),
      ...extraMun,
    ],
  }, FILE, { fullFile: false });
}

check('implied yield annualises the flat rent', impliedGrossYieldPct(9.04, 4000), Math.round(((9.04 * 12) / 4000) * 1000) / 10);
check('a blank input is a blank yield', impliedGrossYieldPct(null, 4000), null);
check('filename span', fileYearSpan(FILE), { from: 2011, to: 2024 });
check('newest methodology pdf', newestDatedUrl([
  'https://example.test/2025-03-03_metodologia_serpavi.pdf',
  'https://example.test/2026-03-18_Metodologia_SERPAVI.pdf',
]), 'https://example.test/2026-03-18_Metodologia_SERPAVI.pdf');
throws('two pdfs on one day', () => newestDatedUrl([
  'https://example.test/2026-03-18_a.pdf',
  'https://example.test/2026-03-18_b.pdf',
]), 'share the date');

const page = `
  <a href="/recursos/2025-09-10_metodologia_serpavi.pdf">old</a>
  <a href="https://cdn.mivau.gob.es/portal-web-mivau/vivienda/serpavi/2026-03_09_bd_SERPAVI_2011-2024%20-%20DEFINITIVO%20WEB_v2.xlsx">book</a>
  <a href="https://cdn.mivau.gob.es/portal-web-mivau/vivienda/serpavi/2026-03-18_Metodologia_SERPAVI.pdf">method</a>
`;
const links = resolveSerpaviLinks(page, 'https://www.mivau.gob.es/vivienda/alquila-bien-es-tu-derecho/serpavi');
check('the page resolves one workbook', /bd_SERPAVI/.test(links.xlsxUrl) && links.xlsxUrl.endsWith('.xlsx'), true);
check('a relative methodology link is absolute', links.methodologyUrls.some((u) => u.startsWith('https://www.mivau.gob.es/')), true);
throws('two workbooks', () => resolveSerpaviLinks(page + '<a href="https://cdn.mivau.gob.es/bd_SERPAVI_other.xlsx">x</a>'), '2 workbook');
throws('no methodology', () => resolveSerpaviLinks('<a href="https://cdn.mivau.gob.es/bd_SERPAVI_2011-2024.xlsx">x</a>'), 'methodology');

const parsed = tables();
check('latest year is 2024, not 23', parsed.year, 2024);
const marbella = parsed.municipalities.find((m) => m.cumun === '29069');
check('Marbella flat rent rounds to the cent', marbella?.colectiva?.eur_m2_month?.median, 9.63);
check('Marbella is not withheld', marbella?.colectiva?.withheld, false);
const adsubia = parsed.municipalities.find((m) => m.name === 'Adsubia');
check('a count with blank prices is withheld, not zero', adsubia && {
  contracts: adsubia.colectiva?.contracts,
  withheld: adsubia.colectiva?.withheld,
  rent: adsubia.colectiva?.eur_m2_month,
  uni: adsubia.unifamiliar,
}, { contracts: 7, withheld: true, rent: null, uni: null });

throws('a partial distribution', () => parseSerpaviTables({
  metadatos: META,
  provincias: [PROV_HEAD, row(PROV_HEAD, { CPRO: '29', LITPRO: 'Málaga', ...block('VC', 10, 5), ...block('VU', 4, 3), ALQM2_LV_25_VC_24: null })],
  municipios: [MUN_HEAD, row(MUN_HEAD, { CPRO: '29', CUMUN: '29069', NMUN: 'Marbella', ...block('VC', 10, 5), ...block('VU', 4, 3) })],
}, FILE, { fullFile: false }), 'partial');
throws('percentiles out of order', () => parseSerpaviTables({
  metadatos: META,
  provincias: [PROV_HEAD, row(PROV_HEAD, { CPRO: '29', LITPRO: 'Málaga', ...block('VC', 10, 5), ...block('VU', 4, 3), ALQM2_LV_25_VC_24: 8 })],
  municipios: [MUN_HEAD, row(MUN_HEAD, { CPRO: '29', CUMUN: '29069', NMUN: 'Marbella', ...block('VC', 10, 5), ...block('VU', 4, 3) })],
}, FILE, { fullFile: false }), 'out of order');
throws('filename year and columns disagree', () => parseSerpaviTables({
  metadatos: META,
  provincias: [PROV_HEAD, row(PROV_HEAD, { CPRO: '29', LITPRO: 'Málaga', ...block('VC', 10, 5), ...block('VU', 4, 3) })],
  municipios: [MUN_HEAD, row(MUN_HEAD, { CPRO: '29', CUMUN: '29069', NMUN: 'Marbella', ...block('VC', 10, 5), ...block('VU', 4, 3) })],
}, 'https://cdn.mivau.gob.es/bd_SERPAVI_2011-2023.xlsx', { fullFile: false }), '2023');
const brokenHead = [...PROV_HEAD, 'BI_ALVHEPCO_TVC_25'];
throws('an unfinished newer year is a refusal', () => parseSerpaviTables({
  metadatos: META,
  provincias: [brokenHead, row(brokenHead, { CPRO: '29', LITPRO: 'Málaga', ...block('VC', 10, 5), ...block('VU', 4, 3) })],
  municipios: [MUN_HEAD, row(MUN_HEAD, { CPRO: '29', CUMUN: '29069', NMUN: 'Marbella', ...block('VC', 10, 5), ...block('VU', 4, 3) })],
}, FILE, { fullFile: false }), '2025');
throws('metadata code missing', () => parseSerpaviTables({
  metadatos: [['note']],
  provincias: [PROV_HEAD],
  municipios: [MUN_HEAD],
}, FILE, { fullFile: false }), 'Metadatos');

check('IPVA year', ipvaYear({ NombrePeriodo: '2024', Anyo: 2024, FK_Periodo: 28 }, 't'), '2024');
throws('IPVA quarter code', () => ipvaYear({ NombrePeriodo: '2024', Anyo: 2024, FK_Periodo: 20 }, 't'), 'annual code');
throws('IPVA year disagreement', () => ipvaYear({ NombrePeriodo: '2024', Anyo: 2023, FK_Periodo: 28 }, 't'), 'disagreement');

const ipvaList = [
  { COD: 'A', Nombre: 'Total Nacional. Total. Índice.' },
  { COD: 'B', Nombre: 'Total Nacional. Total. Variación anual.' },
  { COD: 'C', Nombre: 'Total Nacional. Vivienda colectiva. Índice.' },
  { COD: 'D', Nombre: 'Total Nacional. Vivienda colectiva. Variación anual.' },
  { COD: 'E', Nombre: 'Total Nacional. Vivienda unifamiliar. Índice.' },
  { COD: 'F', Nombre: 'Total Nacional. Vivienda unifamiliar. Variación anual.' },
  { COD: 'G', Nombre: 'Málaga. Total. Índice.' },
  { COD: 'H', Nombre: 'Málaga. Total. Variación anual.' },
  { COD: 'I', Nombre: 'Málaga. Vivienda colectiva. Índice.' },
  { COD: 'J', Nombre: 'Málaga. Vivienda colectiva. Variación anual.' },
  { COD: 'K', Nombre: 'Málaga. Vivienda unifamiliar. Índice.' },
  { COD: 'L', Nombre: 'Málaga. Vivienda unifamiliar. Variación anual.' },
  { COD: 'Z', Nombre: 'Albacete. Total. Índice.' },
];
check('selects the twelve series and skips Albacete', selectIpvaSeries(ipvaList, ['Total Nacional', 'Málaga']).map((s) => s.cod),
  ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']);
throws('a missing annual change', () => selectIpvaSeries(ipvaList.filter((s) => s.COD !== 'H'), ['Total Nacional', 'Málaga']), 'missing');

function serie(cod: string, value: number): unknown {
  return {
    COD: cod,
    Nombre: 'Málaga. Total. Variación anual.',
    Unidad: { Nombre: 'Índice' },
    Data: [{ NombrePeriodo: '2024', Anyo: 2024, FK_Periodo: 28, Valor: value, Secreto: false, TipoDato: { Nombre: 'Definitivo' } }],
  };
}
const yoy = parseIpvaDatosSerie(serie('H', 4.9), 'H');
check('annual change keeps the Índice label and is stored as a percent later', yoy.unitLabel, 'Índice');
check('annual change value', yoy.points[0].value, 4.9);
throws('a non-Índice unit', () => parseIpvaDatosSerie({ ...serie('H', 4.9) as object, Unidad: { Nombre: 'Tasas' } }, 'H'), 'Índice');

function parsedSeries(geo: string, dwelling: IpvaParsed['dwelling'], measure: IpvaParsed['measure'], cod: string, value: number): IpvaParsed {
  const dwellingLabel = dwelling === 'total' ? 'Total' : dwelling === 'colectiva' ? 'Vivienda colectiva' : 'Vivienda unifamiliar';
  const measureLabel = measure === 'index' ? 'Índice' : 'Variación anual';
  return {
    cod,
    nombre: `${geo}. ${dwellingLabel}. ${measureLabel}.`,
    geo,
    dwelling,
    measure,
    unitLabel: 'Índice',
    points: [{ period: '2024', value, provisional: false }],
  };
}
function allSeries(): IpvaParsed[] {
  const out: IpvaParsed[] = [];
  let n = 0;
  for (const geo of ['Total Nacional', 'Málaga']) {
    for (const dwelling of ['total', 'colectiva', 'unifamiliar'] as const) {
      out.push(parsedSeries(geo, dwelling, 'index', `I${n++}`, 120));
      out.push(parsedSeries(geo, dwelling, 'yoy', `Y${n++}`, 4.9));
    }
  }
  return out;
}
const layer = buildSpainRentLayer({
  now: new Date('2026-10-31T00:00:00.000Z'),
  provinceKeys: ['malaga'],
  serpavi: parsed,
  fileUrl: FILE,
  methodologyUrls: ['https://cdn.mivau.gob.es/2026-03-18_Metodologia_SERPAVI.pdf'],
  ipva: allSeries(),
});
check('layer year', layer.serpavi_year, 2024);
check('no national euro rent is invented', layer.omissions.some((o) => /no Spain total/i.test(o.reason)), true);
check('Calpe is an extra key of Calp only', rentMatchKeys('Calp').includes('calpe') && !rentMatchKeys('Marbella').includes('calpe'), true);
const shared = disambiguateMatchKeys([
  { id: 'a', province_key: 'granada', name: 'Pinar, El' },
  { id: 'b', province_key: 'granada', name: 'Píñar' },
]);
check('El Pinar keeps the article forms and loses the shared short key', shared.keys.get('a'), ['el pinar', 'pinar el']);
check('Píñar is not given El Pinar\'s rent key', shared.keys.get('b'), []);
check('the shared key is recorded', shared.ambiguous.map((a) => a.key), ['pinar']);

const view = buildEsRents(layer, [
  ...Array.from({ length: 8 }, () => ({ location: 'Marbella, Málaga', askingEurM2: 4000, grossYieldPct: 5 })),
  ...Array.from({ length: 8 }, () => ({ location: 'Estepona, Málaga', askingEurM2: 3500, grossYieldPct: 4.5 })),
  ...Array.from({ length: 7 }, () => ({ location: 'Marbella, Málaga', askingEurM2: null, grossYieldPct: null })),
  ...Array.from({ length: 4 }, () => ({ location: 'Estepona Costa, Málaga', askingEurM2: 5000, grossYieldPct: 6 })),
  ...Array.from({ length: 3 }, () => ({ location: 'Adsubia, Málaga', askingEurM2: 2000, grossYieldPct: 3 })),
]);
const vMarbella = view.towns.find((t) => t.town === 'Marbella');
check('eight priced listings publish a median and the derived yield', vMarbella && {
  status: vMarbella.status,
  ask: vMarbella.avena_median_asking_eur_m2,
  yield: vMarbella.implied_flat_gross_yield_pct,
  gross: vMarbella.avena_gross_yield_pct,
}, {
  status: 'compared',
  ask: 4000,
  yield: impliedGrossYieldPct(9.63, 4000),
  gross: 5,
});
const vCosta = view.towns.find((t) => t.town === 'Estepona Costa');
check('a longer name does not receive the municipality', vCosta && { municipality: vCosta.municipality, status: vCosta.status, implied: vCosta.implied_flat_gross_yield_pct }, { municipality: null, status: 'not_in_table', implied: null });
const vAds = view.towns.find((t) => t.town === 'Adsubia');
check('withheld prices stay blank and do not become a yield', vAds && { status: vAds.status, rent: vAds.colectiva?.eur_m2_month, implied: vAds.implied_flat_gross_yield_pct }, { status: 'withheld', rent: null, implied: null });
check('the province yield uses the same formula', view.provinces[0].implied_flat_gross_yield_pct, impliedGrossYieldPct(9.04, view.provinces[0].avena_median_asking_eur_m2));

console.log('committed layer');
const committed = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'es-rents.json'), 'utf8')) as SpainRentLayer;
check('committed layer is ready', committed.status, 'ready');
check('committed SERPAVI year is a year', committed.serpavi_year >= 2024 && committed.serpavi_year <= 2035, true);
check('committed IPVA period is that vintage or later', /^\d{4}$/.test(committed.ipva_period) && Number(committed.ipva_period) >= 2024, true);
check('committed workbook is the ministry SERPAVI file', /bd_SERPAVI/i.test(committed.sources.serpavi.file_url) && committed.sources.serpavi.file_url.includes('mivau.gob.es'), true);
check('committed IPVA table is 59058', committed.sources.ipva.table_id, '59058');
check('committed retrieval day', /^\d{4}-\d{2}-\d{2}$/.test(committed.retrieved_at), true);
check('national figure is an index, and the unit is a percent for the change', committed.national.ipva_total_index.unit === 'index' && committed.national.ipva_total_yoy_pct.unit === 'pct', true);
check('INE still labels the annual change Índice', /ndice/i.test(committed.national.ipva_total_yoy_pct.unit_label), true);
const malaga = committed.provinces.find((p) => p.key === 'malaga');
check('Málaga has a flat rent in a habitable range', malaga != null && malaga.colectiva != null && !malaga.colectiva.withheld && (malaga.colectiva.eur_m2_month?.median ?? 0) > 3 && (malaga.colectiva.eur_m2_month?.median ?? 0) < 30, true);
check('Málaga flat rent has a count and a monthly rent, not a zero', malaga?.colectiva != null && malaga.colectiva.contracts > 1000 && (malaga.colectiva.monthly_eur?.median ?? 0) > 100, true);
check('Málaga IPVA annual change is a modest percent', malaga != null && Math.abs(malaga.ipva_total_yoy_pct.value) < 40 && malaga.ipva_total_yoy_pct.series_id.startsWith('IPVA'), true);
check('every published distribution is ordered and positive', committed.provinces.concat().every((p) => [p.colectiva, p.unifamiliar].every((d) => {
  if (!d) return true;
  if (d.withheld) return d.contracts > 0 && d.eur_m2_month == null && d.monthly_eur == null;
  const m = d.eur_m2_month;
  const r = d.monthly_eur;
  return m != null && r != null && d.contracts > 0 && m.p25 <= m.median && m.median <= m.p75 && m.median > 0 && r.median > 0 && (d.surface_m2_median ?? 0) > 0;
})) && committed.municipalities.every((m) => [m.colectiva, m.unifamiliar].every((d) => {
  if (!d) return true;
  if (d.withheld) return d.contracts > 0 && d.eur_m2_month == null;
  return d.eur_m2_month != null && d.eur_m2_month.p25 <= d.eur_m2_month.median && d.eur_m2_month.median <= d.eur_m2_month.p75 && d.eur_m2_month.median > 0;
})), true);
check('the national omission is on the file', committed.omissions.some((o) => /no Spain total/i.test(o.reason)), true);
check('aliases are declared and do not mention a price', committed.alias_note === ALIAS_NOTE && !/€\s?79|subscription/i.test(committed.caveats.join(' ')), true);

const live = getEsRents();
check('the live book compares at least one town', live.summary.compared > 0, true);
check('every implied yield is the published formula', live.towns.every((t) => t.implied_flat_gross_yield_pct === impliedGrossYieldPct(t.colectiva && !t.colectiva.withheld ? t.colectiva.eur_m2_month?.median ?? null : null, t.avena_median_asking_eur_m2)), true);
const liveCosta = live.towns.find((t) => t.town.toLowerCase() === 'orihuela costa');
check('the live book does not assign Orihuela Costa to Orihuela', liveCosta?.municipality ?? null, null);
const calpe = live.towns.find((t) => t.town.toLowerCase() === 'calpe');
check('Calpe is Calp', calpe?.municipality ?? null, 'Calp');
const fuente = live.towns.find((t) => t.town.toLowerCase() === 'fuente álamo');
check('Fuente Álamo is Fuente Álamo de Murcia', fuente?.municipality ?? null, 'Fuente Álamo de Murcia');
const sanJuan = live.towns.find((t) => t.town.toLowerCase() === 'san juan alicante');
check('San Juan Alicante is Sant Joan d\'Alacant', sanJuan?.municipality ?? null, "Sant Joan d'Alacant");
check('a not-in-table town has no rent and no implied yield', live.towns.filter((t) => t.status === 'not_in_table').every((t) => t.colectiva == null && t.implied_flat_gross_yield_pct == null), true);
console.log(`  towns ${live.summary.towns}, compared ${live.summary.compared}, official only ${live.summary.official_only}, withheld ${live.summary.withheld}, not in table ${live.summary.not_in_table}`);

console.log(fail ? `\n${fail} FAILED` : `\nALL PASS (${pass})`);
process.exit(fail ? 1 : 0);
