/**
 * Tests for the municipal asking-versus-appraisal layer behind /spain/towns.
 *
 * A cell printed n.r. must not become a number. A town under the listing
 * floor must not get a median or a gap. A district must not inherit the
 * municipality's appraisal. The committed data/es-town-gap.json is checked
 * for provenance and for the shape of the sheet, not for a frozen €/m².
 *
 *   npx tsx scripts/test-es-town-gap.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { getAllProperties } from '../src/lib/properties';
import {
  MIN_PRICED_LISTINGS,
  VDP003_HEADER,
  askingVsAppraisalPct,
  buildSpainTownLayer,
  buildTownGapView,
  municipalityKeys,
  parseMunicipalSheet,
  selectLatestSheet,
  sheetPeriod,
  townGroupKey,
  type MunicipalAppraisal,
  type SheetCell,
  type SpainTownLayer,
  type TownAsking,
} from '../src/lib/data-sources/es-town-gap';

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
function shares(a: string, b: string): boolean {
  const want = new Set(municipalityKeys(b));
  return municipalityKeys(a).some((k) => want.has(k));
}

check('sheet name', sheetPeriod('T2A2026'), '2026-Q2');
check('padded sheet name', sheetPeriod('T4A2005  '), '2005-Q4');
check('latest of several', selectLatestSheet(['T4A2025', 'T1A2026', 'T2A2026 ']), 'T2A2026 ');
throws('two sheets for one quarter', () => selectLatestSheet(['T2A2026', 'T2A2026 ']), '2026-Q2');
throws('no quarterly name', () => selectLatestSheet(['Notas']), 'quarterly');

check('article order', shares('El Campello', 'Campello, el'), true);
check('hyphen', shares('Torre Pacheco', 'Torre-Pacheco'), true);
check('bilingual slash and two words', shares('Jávea Xàbia', 'Jávea/Xábia'), true);
check('slash part', shares('Calpe', 'Calpe/Calp'), true);
check('villajoyosa slash', shares('Villajoyosa', 'Villajoyosa/Vila Joiosa (La)'), true);
check('leading article on the sheet', shares('La Linea De La Concepcion', 'Línea de la Concepción (La)'), true);
check('accent only', shares('Aguilas', 'Águilas'), true);
check('group key drops the article', townGroupKey('El Campello'), 'campello');
check('a district is not the municipality', shares('Orihuela Costa', 'Orihuela'), false);
check('a harbour district is not the municipality', shares('Puerto de Mazarron', 'Mazarrón'), false);
check('a shorter city is not the longer name', shares('Málaga', 'Vélez Málaga'), false);
check('an urbanisation is not the city', shares('San Pedro de Alcantara', 'Marbella'), false);

function sheet(data: SheetCell[][], title = 'Segundo trimestre de 2026'): SheetCell[][] {
  const pad: SheetCell[][] = Array.from({ length: 8 }, () => []);
  return [
    ...pad,
    ['', 'Tabla 4.'],
    ['', title],
    ['', 'Unidad: euros/m2'],
    ['', 'Provincia', 'Municipio', 'Valor tasado de vivienda', '', '', '', 'Número de tasaciones', '', ''],
    ['', '', '', 'Hasta cinco años', 'Con más de cinco años', 'Total', '', 'Hasta cinco años', 'Con más de cinco años', 'Total'],
    ['', '', '', 'de antigüedad', 'de antigüedad', '', '', 'de antigüedad', 'de antigüedad', ''],
    ...data,
  ];
}
function row(province: string, municipality: string, upto: SheetCell, total: number, nUp = 40, nTotal = 200): SheetCell[] {
  return ['', province, municipality, upto, total - 10, total, '', nUp, nTotal - nUp, nTotal];
}

const parsed = parseMunicipalSheet(sheet([
  row('Alicante', 'Torrevieja', 2762.7, 2254, 60, 716),
  row('', 'Campello, el', 'n.r', 2836.1, 12, 169),
  row('', 'Jávea/Xábia', 3942, 3507.2, 21, 170),
  row('', 'Orihuela', 2100, 1800, 30, 400),
  row('Málaga', 'Estepona', 4100, 3600, 80, 500),
  row('', 'Málaga', 3900, 3400, 70, 600),
]), 'T2A2026');
check('period comes from the sheet name and the title', parsed.period, '2026-Q2');
const torre = parsed.municipalities.find((m) => m.municipality === 'Torrevieja');
check('a printed price stays a price', torre && { v: torre.up_to_five_years_eur_m2, w: torre.up_to_five_years_withheld, n: torre.appraisals_up_to_five_years }, { v: 2762.7, w: false, n: 60 });
const camp = parsed.municipalities.find((m) => m.municipality === 'Campello, el');
check('n.r. is withheld and not zero', camp && { v: camp.up_to_five_years_eur_m2, w: camp.up_to_five_years_withheld, total: camp.total_eur_m2 }, { v: null, w: true, total: 2836.1 });
check('a blank province cell keeps the previous province', camp?.province_key, 'alicante');
check('Málaga city is its own row', parsed.municipalities.find((m) => m.municipality === 'Málaga')?.province_key, 'malaga');

const noted = parseMunicipalSheet(sheet([
  row('Alicante', 'Torrevieja', 2000, 1800),
  ['', 'n.r: el dato no es representativo o no existen observaciones', '', '', '', '', '', '', '', ''],
  ['', ' ', 'Sestao', 2000, 1800, 1900, '', 10, 20, 30],
]), 'T2A2026');
check('a trailing note is not a municipality', noted.municipalities.some((m) => /representativo/.test(m.municipality) || /representativo/.test(m.province_name)), false);
check('a space in the province cell does not wipe the province', noted.municipalities.find((m) => m.municipality === 'Sestao')?.province_key, 'alicante');
throws('blank price', () => parseMunicipalSheet(sheet([row('Alicante', 'Torrevieja', '', 1, 1, 2)]), 'T2A2026'), 'blank');
throws('a price with no municipality', () => parseMunicipalSheet(sheet([
  ['', 'Alicante', '', 2000, 1800, 1900, '', 10, 10, 20],
]), 'T2A2026'), 'municipality');
throws('zero price', () => parseMunicipalSheet(sheet([row('Alicante', 'Torrevieja', 0, 1, 1, 2)]), 'T2A2026'), 'non-positive');
throws('a count written as text', () => parseMunicipalSheet(sheet([row('Alicante', 'Torrevieja', '2762.7', 1, 1, 2)]), 'T2A2026'), 'not understood');
throws('price with no appraisals', () => parseMunicipalSheet(sheet([row('Alicante', 'Torrevieja', 2000, 1800, 0, 10)]), 'T2A2026'), 'appraisals');
throws('period disagreement', () => parseMunicipalSheet(sheet([row('Alicante', 'Torrevieja', 2000, 1800)], 'Primer trimestre de 2026'), 'T2A2026'), 'disagreement');
throws('no age split', () => parseMunicipalSheet([
  ...Array.from({ length: 8 }, () => []),
  ['', 'Segundo trimestre de 2026'],
  ['', 'Provincia', 'Municipio', 'Valor medio', '', 'Tasaciones'],
  ['', 'Alicante', 'Torrevieja', 2000, '', 10],
], 'T2A2026'), 'five');
throws('two municipalities, one key', () => parseMunicipalSheet(sheet([
  row('Almería', 'Ejido (El)', 1500, 1400),
  row('', 'El Ejido', 1600, 1500),
]), 'T2A2026'), 'match key');

function padded(data: SheetCell[][]): SheetCell[][] {
  const pads: SheetCell[][] = [];
  for (let i = 0; i < 50; i++) pads.push(row(i === 0 ? 'Madrid' : '', `Pad ${i}`, 1000 + i, 900 + i));
  return sheet([...data, ...pads]);
}

const layer = buildSpainTownLayer({
  now: new Date('2026-10-28T00:00:00.000Z'),
  sheetName: 'T2A2026',
  rows: padded([
    row('Alicante', 'Torrevieja', 2000, 1500, 60, 700),
    row('', 'Campello, el', 'n.r', 2800, 12, 169),
    row('', 'Jávea/Xábia', 4000, 3500, 21, 170),
    row('', 'Orihuela', 2100, 1800, 30, 400),
    row('Málaga', 'Estepona', 4100, 3600, 80, 500),
    row('', 'Málaga', 3900, 3400, 70, 600),
    row('', 'Mazarrón', 1600, 1500, 9, 100),
  ].map((r) => r[2] === 'Mazarrón' ? ['', 'Murcia', 'Mazarrón', 'n.r', 1400, 1500, '', 9, 90, 99] : r)),
  fileModified: '2026-09-17',
  provinceKeys: ['alicante', 'malaga', 'murcia'],
  registradoresStatus: 403,
  vdp003Header: VDP003_HEADER,
});
check('corpus filter drops Madrid', layer.municipalities.some((m) => m.province_key === 'madrid'), false);
check('registradores refusal is recorded', layer.omissions.some((o) => o.source === 'Colegio de Registradores' && /403/.test(o.reason)), true);
check('notaries are not ingested', layer.omissions.some((o) => o.source === 'Consejo General del Notariado' && /commercial/.test(o.reason)), true);
check('VDP003 has no municipal price', layer.omissions.some((o) => /VDP003_01/.test(o.source) && /no municipality/.test(o.reason)), true);
check('the sheet is not described as CC BY', /does not claim/.test(layer.sources.municipal_appraisal.licence_note), true);
throws('a changed transaction header', () => buildSpainTownLayer({
  now: new Date('2026-10-28T00:00:00.000Z'),
  sheetName: 'T2A2026',
  rows: padded([row('Alicante', 'Torrevieja', 2000, 1500)]),
  fileModified: null,
  provinceKeys: ['alicante'],
  registradoresStatus: null,
  vdp003Header: 'CPRO;MUNICIPIO;EUR_M2',
}), 'header');
throws('a corpus province missing from the sheet', () => buildSpainTownLayer({
  now: new Date('2026-10-28T00:00:00.000Z'),
  sheetName: 'T2A2026',
  rows: padded([row('Alicante', 'Torrevieja', 2000, 1500)]),
  fileModified: null,
  provinceKeys: ['alicante', 'granada'],
  registradoresStatus: null,
  vdp003Header: VDP003_HEADER,
}), 'granada');

function listings(town: string, province: string, n: number, pm2: number | null): TownAsking[] {
  return Array.from({ length: n }, () => ({ location: `${town}, ${province}`, askingEurM2: pm2 }));
}
const view = buildTownGapView(layer, [
  ...listings('Torrevieja', 'Alicante', MIN_PRICED_LISTINGS, 2500),
  ...listings('Torrevieja', 'Alicante', 2, null),
  ...listings('El Campello', 'Alicante', MIN_PRICED_LISTINGS, 3000),
  ...listings('Jávea Xàbia', 'Alicante', 3, 4200),
  ...listings('Javea', 'Alicante', MIN_PRICED_LISTINGS - 3, 3800),
  ...listings('Orihuela Costa', 'Alicante', 22, 2800),
  ...listings('Orihuela', 'Alicante', MIN_PRICED_LISTINGS - 1, 2000),
  ...listings('Estepona', 'Málaga', MIN_PRICED_LISTINGS, 4100),
  ...listings('Puerto de Mazarron', 'Murcia', 12, 1900),
]);
const vTorre = view.towns.find((t) => t.town === 'Torrevieja');
check('eight priced listings publish a median', vTorre?.avena_median_asking_eur_m2, 2500);
check('unpriced listings do not enter the median', vTorre?.priced_listings, MIN_PRICED_LISTINGS);
check('the gap is the rounded percent', vTorre?.asking_vs_up_to_five_years_pct?.value, askingVsAppraisalPct(2500, 2000));
check('Torrevieja is the up-to-five-years comparison', vTorre?.status, 'gap');
check('the gap names its benchmark', vTorre?.asking_vs_up_to_five_years_pct?.benchmark_series_id.startsWith('35103500:libre:le5y:'), true);
const vCamp = view.towns.find((t) => t.municipality === 'Campello, el');
check('a withheld up-to-five-years cell is not the gap', vCamp && { status: vCamp.status, like: vCamp.asking_vs_up_to_five_years_pct, ages: vCamp.asking_vs_all_ages_pct?.value }, { status: 'all_ages_only', like: null, ages: askingVsAppraisalPct(3000, 2800) });
check('the withheld slot says n.r.', vCamp?.up_to_five_years && 'withheld' in vCamp.up_to_five_years && vCamp.up_to_five_years.printed, 'n.r');
const vJavea = view.towns.find((t) => t.municipality === 'Jávea/Xábia');
check('two spellings of one municipality are one median', vJavea && { n: vJavea.priced_listings, seen: vJavea.also_seen.length > 0 }, { n: MIN_PRICED_LISTINGS, seen: true });
const vCosta = view.towns.find((t) => t.town === 'Orihuela Costa');
check('Orihuela Costa does not receive Orihuela', vCosta && { municipality: vCosta.municipality, status: vCosta.status, gap: vCosta.asking_vs_all_ages_pct }, { municipality: null, status: 'not_in_table', gap: null });
const vOri = view.towns.find((t) => t.town === 'Orihuela');
check('seven priced listings are insufficient', vOri && { status: vOri.status, median: vOri.avena_median_asking_eur_m2, gap: vOri.asking_vs_up_to_five_years_pct, shown: vOri.up_to_five_years != null }, { status: 'insufficient', median: null, gap: null, shown: true });
const vPort = view.towns.find((t) => t.town === 'Puerto de Mazarron');
check('Puerto de Mazarrón is not Mazarrón', vPort?.municipality, null);
check('level gap is zero, not null', askingVsAppraisalPct(2000, 2000), 0);
check('a missing benchmark is a blank gap', askingVsAppraisalPct(2000, null), null);

console.log('committed layer');
const committed = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'es-town-gap.json'), 'utf8')) as SpainTownLayer;
check('committed layer is ready', committed.status, 'ready');
check('committed period is a quarter', /^\d{4}-Q[1-4]$/.test(committed.period), true);
check('committed source is the bulletin file', committed.sources.municipal_appraisal.url, 'https://apps.fomento.gob.es/Boletinonline2/sedal/35103500.XLS');
check('committed file has a retrieval day', /^\d{4}-\d{2}-\d{2}$/.test(committed.retrieved_at), true);
check('committed sheet is the national table', committed.sources.municipal_appraisal.municipalities_in_sheet >= 250, true);
check('every price is positive or withheld', committed.municipalities.every((m) =>
  (m.up_to_five_years_eur_m2 == null) === m.up_to_five_years_withheld &&
  (m.up_to_five_years_eur_m2 == null || m.up_to_five_years_eur_m2 > 0) &&
  (m.total_eur_m2 == null || m.total_eur_m2 > 0) &&
  m.appraisals_up_to_five_years >= 0 &&
  (m.up_to_five_years_eur_m2 == null || m.appraisals_up_to_five_years >= 1)
), true);
check('the sheet still withholds at least one up-to-five-years cell', committed.municipalities.some((m) => m.up_to_five_years_withheld), true);
check('Almazora stays under the province printed on the sheet', committed.municipalities.find((m) => m.municipality.startsWith('Almazora'))?.province_name, 'Alicante');
const committedTorre = committed.municipalities.find((m) => m.municipality === 'Torrevieja' && m.province_key === 'alicante');
check('Torrevieja has a published up-to-five-years appraisal', committedTorre != null && (committedTorre.up_to_five_years_eur_m2 ?? 0) > 500, true);
check('notarial omission is on the committed file', committed.omissions.some((o) => o.source === 'Consejo General del Notariado' && o.ingested === false), true);

const live = buildTownGapView(committed, getAllProperties().map((p) => ({
  location: p.l,
  askingEurM2: typeof p.pm2 === 'number' ? p.pm2 : null,
})));
check('the live book produces at least one up-to-five-years gap', live.summary.with_up_to_five_year_gap > 0, true);
check('every gap clears the floor and uses a published cell', live.towns.every((t) => {
  if (t.status !== 'gap') return t.asking_vs_up_to_five_years_pct == null || t.priced_listings >= MIN_PRICED_LISTINGS;
  const slot = t.up_to_five_years;
  return t.priced_listings >= MIN_PRICED_LISTINGS &&
    t.avena_median_asking_eur_m2 != null &&
    slot != null && !('withheld' in slot) &&
    t.asking_vs_up_to_five_years_pct?.value === askingVsAppraisalPct(t.avena_median_asking_eur_m2, slot.value) &&
    t.asking_vs_up_to_five_years_pct.benchmark_retrieved_at === committed.retrieved_at;
}), true);
check('an insufficient town has no median and no gap', live.towns.filter((t) => t.status === 'insufficient').every((t) =>
  t.priced_listings < MIN_PRICED_LISTINGS && t.avena_median_asking_eur_m2 == null && t.asking_vs_up_to_five_years_pct == null && t.asking_vs_all_ages_pct == null
), true);
const liveCosta = live.towns.find((t) => t.town.toLowerCase() === 'orihuela costa');
check('the live book does not assign Orihuela Costa to Orihuela', liveCosta?.municipality ?? null, null);
console.log(`  towns ${live.summary.towns}, up-to-five-years gaps ${live.summary.with_up_to_five_year_gap}, all-ages only ${live.summary.all_ages_only}, not in table ${live.summary.not_in_ministry_table}, insufficient ${live.summary.insufficient_listings}`);

console.log(fail ? `\n${fail} FAILED` : `\nALL PASS (${pass})`);
process.exit(fail ? 1 : 0);
