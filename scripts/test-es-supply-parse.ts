/**
 * Tests for the Spain supply layer behind /spain/supply.
 *
 * A blank cell must not become 0. A Spanish thousands separator must not
 * become a decimal. A province-quarter with two notarial counts must not
 * be published as either of them. The committed data/es-supply.json is
 * checked for provenance, not for a frozen dwelling count.
 *
 *   npx tsx scripts/test-es-supply-parse.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { getAllProperties } from '../src/lib/properties';
import {
  assessVdp003, buildEsSupplyView, buildSpainSupplyLayer, corpusProvinces,
  fileModifiedDay, monthsEnding, parseEsInteger, parseIneNewSales, parseVdp005,
  shiftMonth, supplyFingerprint, type SpainSupplyLayer, type SupplyMove,
} from '../src/lib/data-sources/es-supply';

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

check('thousands separator', parseEsInteger('1.132', 'x'), 1132);
check('plain integer', parseEsInteger('839', 'x'), 839);
check('ungrouped four digits', parseEsInteger('2966', 'x'), 2966);
check('grouped national', parseEsInteger('49.319', 'x'), 49319);
check('zero stays zero', parseEsInteger('0', 'x'), 0);
throws('decimal is not a count', () => parseEsInteger('1.13', 'x'), 'whole');
throws('comma decimal', () => parseEsInteger('1.132,5', 'x'), 'whole');
check('shift month across the year', shiftMonth('2026-01', -1), '2025-12');
check('twelve months end on the latest', monthsEnding('2026-06', 12)[0], '2025-07');
check('Last-Modified day is UTC', fileModifiedDay('Thu, 22 Oct 2026 11:54:40 GMT'), '2026-10-22');
check('missing Last-Modified is null', fileModifiedDay(null), null);
check('unparseable Last-Modified is null', fileModifiedDay('not a date'), null);

const VDP_HEADER = 'CODAUTO;COMUNIDAD_AUTONOMA;CPRO;PROVINCIA;AÑO;MES;TIPO_VIVIENDA;ESTADO;VALOR';
const INE_HEADER = 'Total Nacional;Comunidades y Ciudades Autónomas;Provincias;Régimen y estado;Periodo;Total';

function vdpRow(cpro: string, name: string, year: number, month: number, estado: 'Iniciadas' | 'Terminadas', value: string): string {
  const tipo = estado === 'Iniciadas' ? 'Libres' : 'Libre';
  return `1;Andalucía;${cpro};${name};${year};${month};${tipo};${estado};${value}`;
}

function monthsBack(endYear: number, endMonth: number, n: number): { year: number; month: number }[] {
  const out: { year: number; month: number }[] = [];
  let y = endYear;
  let m = endMonth;
  for (let i = 0; i < n; i++) {
    out.push({ year: y, month: m });
    m--;
    if (m === 0) { m = 12; y--; }
  }
  return out.reverse();
}

function vdpFile(rows: string[]): string {
  return `${VDP_HEADER}\n${rows.join('\n')}\n`;
}

const window = monthsBack(2026, 6, 12);
const malagaRows = window.flatMap(({ year, month }, i) => [
  vdpRow('29', 'Málaga', year, month, 'Iniciadas', String(100 + i)),
  vdpRow('29', 'Málaga', year, month, 'Terminadas', String(10 + i)),
]);
const parsedVdp = parseVdp005(vdpFile(malagaRows));
check('keeps a printed zero', parseVdp005(vdpFile([
  ...malagaRows,
  vdpRow('29', 'Málaga', 2020, 1, 'Iniciadas', '0'),
])).some((r) => r.period === '2020-01' && r.estado === 'Iniciadas' && r.value === 0), true);
const blankRow = parseVdp005(vdpFile([
  ...malagaRows,
  vdpRow('42', 'Soria', 2026, 1, 'Iniciadas', ''),
  vdpRow('42', 'Soria', 2026, 1, 'Terminadas', '3'),
])).find((r) => r.cpro === '42' && r.estado === 'Iniciadas');
check('blank stays null', blankRow ? blankRow.value : 'missing', null);

throws('iniciadas labelled Libre', () => parseVdp005(vdpFile([
  '1;Andalucía;29;Málaga;2026;6;Libre;Iniciadas;10',
  vdpRow('29', 'Málaga', 2026, 6, 'Terminadas', '4'),
])), 'Libres');
throws('unknown estado', () => parseVdp005(vdpFile([
  '1;Andalucía;29;Málaga;2026;6;Libres;Visados;10',
])), 'estado');
throws('header drift', () => parseVdp005('Año;Valor\n2026;1\n'), 'header');

function ineRow(province: string, ccaa: string, period: string, value: string, regime = 'Vivienda nueva'): string {
  return `Total Nacional;${ccaa};${province};${regime};${period};${value}`;
}
function inePeriod(year: number, month: number): string {
  return `${year}M${String(month).padStart(2, '0')}`;
}
const ineRows = [
  ...window.map(({ year, month }, i) => ineRow('', '', inePeriod(year, month), String(1000 + i))),
  ...window.map(({ year, month }, i) => ineRow('29 Málaga', '01 Andalucía', inePeriod(year, month), i === 11 ? '1.132' : String(50 + i))),
  ineRow('', '01 Andalucía', '2026M06', '9.999'),
  ineRow('29 Málaga', '01 Andalucía', '2026M06', '1', 'Vivienda usada'),
];
const parsedIne = parseIneNewSales(`${INE_HEADER}\n${ineRows.join('\n')}\n`);
check('thousands in a province cell', parsedIne.find((r) => r.geo === '29' && r.period === '2026-06')?.value, 1132);
check('community row is not national and not a province', parsedIne.some((r) => r.value === 9999), false);
check('usada row is dropped', parsedIne.some((r) => r.period === '2026-06' && r.geo === '29' && r.value === 1), false);
check('national row kept', parsedIne.find((r) => r.geo === 'nacional' && r.period === '2026-06')?.value, 1011);
throws('bad period', () => parseIneNewSales(`${INE_HEADER}\n${ineRow('', '', '2026-06', '1')}\n`), 'period');
throws('withheld is not a number, and a required blank latest fails the layer', () => {
  const blank = [...ineRows.filter((r) => !r.includes('2026M06;1.132')), ineRow('29 Málaga', '01 Andalucía', '2026M06', '..')];
  buildSpainSupplyLayer({
    now: new Date('2026-10-27T00:00:00.000Z'),
    provinceKeys: ['malaga'],
    unmappedLocations: [],
    vdp005: parsedVdp,
    ine: parseIneNewSales(`${INE_HEADER}\n${blank.join('\n')}\n`),
    vdp005Modified: '2026-10-22',
    ineModified: '2026-10-26',
    vdp003: assessVdp003(null, null),
  });
}, 'blank');

const vdp003 = [
  'CODCOMUNIDAD;COMUNIDAD;CODPROVINCIA;PROVINCIA;Tipo;regimen;AÑO;Trimestre;Numero_Transacciones;Valor_Transacciones',
  '1;Andalucía;29;Málaga;Nueva;Libre;2026;2;0;396413',
  '01;Andalucía;29;Málaga;Nueva;Libre;2026;2;1700;0',
  '14;Murcia, Región de;30;Murcia;Nueva;Libre;2026;2;1047;180000',
].join('\n');
const conflict = assessVdp003(vdp003, 200);
check('conflict is not ingested', conflict.ingested, false);
check('conflict names both counts', /1700/.test(conflict.reason) && /Málaga/.test(conflict.reason) && /does not choose/.test(conflict.reason), true);
const clean = assessVdp003(vdp003.split('\n').filter((l) => !l.includes(';0;396413')).join('\n'), 200);
check('a clean file is still not published without a parser', /no parser/.test(clean.reason) && clean.ingested === false, true);
check('unreachable file stays an omission', /could not be reached/.test(assessVdp003(null, null).reason), true);

const layer = buildSpainSupplyLayer({
  now: new Date('2026-10-27T03:00:00.000Z'),
  provinceKeys: ['malaga'],
  unmappedLocations: [],
  vdp005: parsedVdp,
  ine: parsedIne,
  vdp005Modified: '2026-10-22',
  ineModified: '2026-10-26',
  vdp003: conflict,
});
const malaga = layer.provinces[0];
check('starts latest is the last month, not a sum', malaga.starts_latest.value, 111);
check('starts latest is not derived', malaga.starts_latest.derived, false);
check('twelve-month starts add the window', malaga.starts_trailing_12m.value, window.reduce((s, _, i) => s + 100 + i, 0));
check('twelve-month starts are marked derived', malaga.starts_trailing_12m.derived, true);
check('twelve-month period', malaga.starts_trailing_12m.period, '2025-07/2026-06');
check('INE latest uses the grouped integer', malaga.ine_new_sales_latest.value, 1132);
check('file dates ride on the figure', [malaga.starts_latest.file_modified, malaga.ine_new_sales_latest.file_modified], ['2026-10-22', '2026-10-26']);
check('Spain starts are not summed from one province', layer.national.starts_latest.available, false);
check('the gap names the missing cells', layer.national.starts_latest.available === false && /not summed/i.test(layer.national.starts_latest.reason), true);
check('INE national is the published row', layer.national.ine_new_sales_latest.value, 1011);
check('INE national twelve-month is derived from the monthly national row', layer.national.ine_new_sales_trailing_12m.derived, true);
check('omissions keep the bulletin, the notarial file and the notaries', layer.omissions.map((o) => o.ingested), [false, false, false]);
check('raw visas are named as not ingested', layer.omissions.some((o) => /visados/.test(o.reason) && /not the raw count|No raw visa/.test(o.reason)), true);
throws('a listing outside the province list blocks the layer', () => buildSpainSupplyLayer({
  now: new Date('2026-10-27T00:00:00.000Z'),
  provinceKeys: ['malaga'],
  unmappedLocations: ['Somewhere'],
  vdp005: parsedVdp,
  ine: parsedIne,
  vdp005Modified: null,
  ineModified: null,
  vdp003: conflict,
}), 'not in a known province');
throws('a missing month is not zero', () => buildSpainSupplyLayer({
  now: new Date('2026-10-27T00:00:00.000Z'),
  provinceKeys: ['malaga'],
  unmappedLocations: [],
  vdp005: parsedVdp.filter((r) => !(r.cpro === '29' && r.estado === 'Iniciadas' && r.period === '2026-03')),
  ine: parsedIne,
  vdp005Modified: null,
  ineModified: null,
  vdp003: conflict,
}), 'absent');

const stamped = buildSpainSupplyLayer({
  now: new Date('2026-11-01T00:00:00.000Z'),
  provinceKeys: ['malaga'],
  unmappedLocations: [],
  vdp005: parsedVdp,
  ine: parsedIne,
  vdp005Modified: '2026-10-22',
  ineModified: '2026-10-26',
  vdp003: conflict,
});
check('fingerprint ignores the retrieval clock', supplyFingerprint(layer), supplyFingerprint(stamped));

const moves: SupplyMove[] = [
  { ref: 'A', town: 'Estepona', date: '2026-08-06', changePct: 2 },
  { ref: 'GONE', town: 'Estepona', date: '2026-09-01', changePct: -1 },
  { ref: 'OTHER', town: 'Ambiguous', date: '2026-09-02', changePct: 4 },
  { ref: 'LOST', town: 'Nowhere', date: '2026-09-03', changePct: 1 },
];
const view = buildEsSupplyView(layer, [
  { ref: 'A', location: 'Estepona, Málaga' },
  { ref: 'B', location: 'Marbella, Málaga' },
  { ref: 'C', location: 'Denia, Alicante' },
  { ref: 'D', location: 'Ambiguous, Málaga' },
  { ref: 'E', location: 'Ambiguous, Alicante' },
], moves);
const viewMalaga = view.provinces.find((p) => p.key === 'malaga')!;
check('listings counted', viewMalaga.listings, 3);
check('ref move and a departed ref in a single-province town', viewMalaga.price_moves, 2);
check('increase and reduction', [viewMalaga.price_increases, viewMalaga.price_reductions], [1, 1]);
check('ambiguous town and unknown town stay unplaced', view.moves_file.unplaced, 2);
check('province move counts plus unplaced equal the file', view.provinces.reduce((s, p) => s + p.price_moves, 0) + view.moves_file.unplaced, moves.length);
const pending = buildEsSupplyView(null, [{ ref: 'A', location: 'Estepona, Málaga' }], []);
check('pending view does not invent a start count', pending.provinces[0].starts_latest, null);
check('pending status', pending.status, 'pending');
throws('a bad move date fails closed', () => buildEsSupplyView(layer, [], [{ ref: 'A', town: 'X', date: '06/08/2026', changePct: 1 }]), 'date');

const committed = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'es-supply.json'), 'utf8')) as SpainSupplyLayer;
check('committed layer is ready', committed.status, 'ready');
const book = JSON.parse(readFileSync(join(__dirname, '..', 'public', 'data.json'), 'utf8')) as { l: string }[];
const live = corpusProvinces(book.map((r) => r.l));
check('every listing location maps to a province', live.unmapped.length, 0);
for (const key of live.keys) {
  const row = committed.provinces.find((p) => p.key === key);
  check(`committed layer covers ${key}`, row != null, true);
  if (!row) continue;
  for (const field of ['starts_latest', 'starts_trailing_12m', 'completions_latest', 'completions_trailing_12m', 'ine_new_sales_latest', 'ine_new_sales_trailing_12m'] as const) {
    const figure = row[field];
    check(`${key} ${field} is a whole dwelling count`, Number.isInteger(figure.value) && figure.value >= 0 && figure.unit === 'dwellings', true);
    check(`${key} ${field} names its series`, figure.series_id.length > 0, true);
  }
  check(`${key} twelve-month starts cover the latest month`, row.starts_trailing_12m.value >= row.starts_latest.value, true);
  check(`${key} twelve-month sales cover the latest month`, row.ine_new_sales_trailing_12m.value >= row.ine_new_sales_latest.value, true);
  check(`${key} latest start is one month and not a derived total`, row.starts_latest.months === 1 && row.starts_latest.derived === false, true);
  check(`${key} twelve-month start is marked derived`, row.starts_trailing_12m.months === 12 && row.starts_trailing_12m.derived === true, true);
  check(`${key} periods are months`, /^\d{4}-\d{2}$/.test(row.starts_latest.period) && /^\d{4}-\d{2}\/\d{4}-\d{2}$/.test(row.starts_trailing_12m.period), true);
  check(`${key} file date is a day or absent`, row.starts_latest.file_modified == null || /^\d{4}-\d{2}-\d{2}$/.test(row.starts_latest.file_modified), true);
  check(`${key} INE series is table 6150 vivienda nueva`, row.ine_new_sales_latest.series_id.startsWith('INE:6150:vivienda_nueva:cpro='), true);
  check(`${key} starts series is VDP005`, row.starts_latest.series_id.startsWith('VDP005_01:libres:iniciadas:cpro='), true);
}
check('omissions ingested nothing', committed.omissions.every((o) => o.ingested === false), true);
check('bulletin omission is present', committed.omissions.some((o) => /visados de dirección de obra/.test(o.source)), true);
check('notarial file omission is present', committed.omissions.some((o) => /VDP003_01/.test(o.source) && /No notarial transaction count was ingested/.test(o.reason)), true);
check('direct notarial source is absent', committed.omissions.some((o) => o.source === 'Consejo General del Notariado'), true);
check('ministry source URL is the CSV', committed.sources.mivau_supply.url, 'https://cdn.mivau.gob.es/portal-web-mivau/Datos_MIVAU/CSV/VDP005_01.csv');
check('INE source URL is table 6150', committed.sources.ine_new_sales.table_url, 'https://www.ine.es/jaxiT3/Tabla.htm?t=6150');
const spainStartsYear = committed.national.starts_trailing_12m;
check('a Spain starts total that is withheld has a reason and no number', spainStartsYear.available || (!spainStartsYear.available && spainStartsYear.reason.length > 20), true);
if (committed.national.starts_latest.available) {
  check('Spain latest starts, when published, are a derived whole number', committed.national.starts_latest.derived === true && Number.isInteger(committed.national.starts_latest.value), true);
}
if (committed.national.ine_new_sales_latest.available) {
  check('Spain INE latest sales are not a provincial sum', committed.national.ine_new_sales_latest.derived, false);
}

const liveView = buildEsSupplyView(
  committed,
  getAllProperties().map((p) => ({ ref: p.ref ?? null, location: p.l })),
  (JSON.parse(readFileSync(join(__dirname, '..', 'public', 'open-data', 'moves.json'), 'utf8')) as { avn_id: string; town: string; date: string; change_pct: number }[])
    .map((m) => ({ ref: m.avn_id, town: m.town, date: m.date, changePct: m.change_pct })),
);
check('live view is ready', liveView.status, 'ready');
check('live view maps every listing', liveView.unmapped_listings, 0);
check('move counts reconcile to the file', liveView.provinces.reduce((s, p) => s + p.price_moves, 0) + liveView.moves_file.unplaced, liveView.moves_file.rows);
for (const row of liveView.provinces.filter((p) => live.keys.includes(p.key))) {
  check(`${row.name} has listings`, row.listings > 0, true);
  check(`${row.name} official side is ready`, row.official, 'ready');
}

if (fail) {
  console.log(`\nFAILED — ${pass} passed, ${fail} failed`);
  process.exit(1);
}
console.log(`\nALL PASS — ${pass} passed, ${fail} failed`);
