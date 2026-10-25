/**
 * Tests for the Spain official-statistics layer behind /spain/official.
 *
 * The parsers must throw when the file stops meaning what we think it means,
 * a blank appraisal cell must not become 0, and Murcia's community total
 * must not be published as the national total. The comparison maths is
 * tested on fixtures. The committed data/es-official.json is checked for
 * provenance, not for a frozen euro value (the weekly job is allowed to
 * move the number).
 *
 *   npx tsx scripts/test-ine-es-parse.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  askingVsAppraisalPct, buildEsBenchmark, buildSpainLayer, classifyDwelling,
  corpusProvinces, fold, ineObsPeriod, latestPoint, layerFingerprint,
  medianPositive, mivauSeries, parseIneDatosSerie, parseMivauCsv,
  provinceFromLocation, registradoresOmission, selectIneSeries, splitIneSeriesName,
  type IneParsed, type SpainLayer,
} from '../src/lib/data-sources/ine-es';
import { getAllProperties } from '../src/lib/properties';

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

// ── periods ──────────────────────────────────────────────────────────────────
check('NombrePeriodo', ineObsPeriod({ NombrePeriodo: '2026T2', Anyo: 2026, FK_Periodo: 20 }), '2026-Q2');
check('code alone, Q1', ineObsPeriod({ Anyo: 2025, FK_Periodo: 19 }), '2025-Q1');
check('code alone, Q4', ineObsPeriod({ Anyo: 2025, FK_Periodo: 22 }), '2025-Q4');
check('Periodo.Id stands in for FK_Periodo', ineObsPeriod({ Anyo: 2026, Periodo: { Id: 21 }, NombrePeriodo: '2026T3' }), '2026-Q3');
throws('bad NombrePeriodo', () => ineObsPeriod({ NombrePeriodo: '2026T5' }), 'not understood');
throws('unmapped code', () => ineObsPeriod({ Anyo: 2026, FK_Periodo: 4 }), 'unmapped');
throws('name and code disagree', () => ineObsPeriod({ NombrePeriodo: '2026T2', Anyo: 2026, FK_Periodo: 19 }), 'disagreement');
throws('no period at all', () => ineObsPeriod({ Valor: 1 }), 'no period');

// ── series names ─────────────────────────────────────────────────────────────
check('split', splitIneSeriesName('Murcia, Región de. Vivienda nueva. Variación anual. '), {
  geo: 'Murcia, Región de', dwelling: 'Vivienda nueva', measure: 'Variación anual',
});
throws('two-part name', () => splitIneSeriesName('Nacional. Índice'), 'not understood');
check('dwelling', classifyDwelling('Vivienda segunda mano'), 'existing');

const listing = [
  { COD: 'IPV1', Nombre: 'Nacional. Vivienda nueva. Índice. ' },
  { COD: 'IPV2', Nombre: 'Nacional. Vivienda nueva. Variación anual. ' },
  { COD: 'IPV3', Nombre: 'Nacional. Vivienda segunda mano. Índice. ' },
  { COD: 'IPV4', Nombre: 'Nacional. Vivienda segunda mano. Variación anual. ' },
  { COD: 'IPV5', Nombre: 'Andalucía. Vivienda nueva. Índice. ' },
  { COD: 'IPV6', Nombre: 'Andalucía. Vivienda nueva. Variación anual. ' },
  { COD: 'IPV7', Nombre: 'Andalucía. Vivienda segunda mano. Índice. ' },
  { COD: 'IPV8', Nombre: 'Andalucía. Vivienda segunda mano. Variación anual. ' },
  { COD: 'IPV9', Nombre: 'Nacional. General. Índice. ' },
  { COD: 'IPV0', Nombre: 'Nacional. Vivienda nueva. Variación trimestral. ' },
];
const selected = selectIneSeries(listing, ['Nacional', 'Andalucía']);
check('selects the eight required series and skips General', selected.map((s) => s.cod), ['IPV1', 'IPV2', 'IPV3', 'IPV4', 'IPV5', 'IPV6', 'IPV7', 'IPV8']);
throws('missing community', () => selectIneSeries(listing, ['Nacional', 'Murcia, Región de']), 'found 0');
throws('duplicate series', () => selectIneSeries([...listing, { COD: 'IPV1b', Nombre: 'Nacional. Vivienda nueva. Índice.' }], ['Nacional']), 'found 2');
throws('series list not an array', () => selectIneSeries({ error: true }, ['Nacional']), 'array');

function serie(cod: string, nombre: string, unit: string, points: { period: string; value: number | null }[]): unknown {
  const [y, q] = [0, 0];
  void y; void q;
  return {
    COD: cod,
    Nombre: nombre,
    Unidad: { Nombre: unit },
    Data: points.map((p) => {
      const m = /^(\d{4})-Q([1-4])$/.exec(p.period)!;
      const fk = { 1: 19, 2: 20, 3: 21, 4: 22 }[Number(m[2])]!;
      return {
        NombrePeriodo: `${m[1]}T${m[2]}`,
        Anyo: Number(m[1]),
        FK_Periodo: fk,
        Valor: p.value,
        Secreto: p.value == null,
        TipoDato: { Nombre: 'Definitivo' },
      };
    }),
  };
}

const parsedNew = parseIneDatosSerie(serie('IPV6', 'Andalucía. Vivienda nueva. Variación anual.', 'Tasas', [
  { period: '2025-Q4', value: 11.4 },
  { period: '2026-Q2', value: 9.1 },
  { period: '2026-Q1', value: 10 },
]), 'IPV6');
check('yoy unit and dwelling', [parsedNew.unitLabel, parsedNew.dwelling, parsedNew.measure], ['Tasas', 'new', 'yoy']);
check('latest is the max period, not the last array element', latestPoint(parsedNew.points, 'IPV6'), { period: '2026-Q2', value: 9.1, provisional: false });
throws('withheld latest', () => latestPoint([
  { period: '2026-Q1', value: 10, provisional: false },
  { period: '2026-Q2', value: null, provisional: false },
], 'x'), 'withheld');
throws('conflicting latest', () => latestPoint([
  { period: '2026-Q2', value: 9, provisional: false },
  { period: '2026-Q2', value: 10, provisional: false },
], 'x'), 'conflicting');
throws('wrong cod', () => parseIneDatosSerie(serie('IPV6', 'Andalucía. Vivienda nueva. Variación anual.', 'Tasas', [{ period: '2026-Q2', value: 1 }]), 'IPV1'), 'mismatch');
throws('rate series labelled as an index', () => parseIneDatosSerie(serie('IPV6', 'Andalucía. Vivienda nueva. Variación anual.', 'Índice', [{ period: '2026-Q2', value: 1 }]), 'IPV6'), 'Tasas');
throws('negative index', () => parseIneDatosSerie(serie('IPV5', 'Andalucía. Vivienda nueva. Índice.', 'Índice', [{ period: '2026-Q2', value: -1 }]), 'IPV5'), 'negative');
throws('no unidad', () => parseIneDatosSerie({ COD: 'IPV6', Nombre: 'Andalucía. Vivienda nueva. Variación anual.', Data: [{ NombrePeriodo: '2026T2', Valor: 1 }] }, 'IPV6'), 'Unidad');
throws('empty data', () => parseIneDatosSerie(serie('IPV6', 'Andalucía. Vivienda nueva. Variación anual.', 'Tasas', []), 'IPV6'), 'no Data');
throws('not an object', () => parseIneDatosSerie([], 'IPV6'), 'object');

// ── MIVAU ────────────────────────────────────────────────────────────────────
const CSV = [
  'Año;Trimestre;Valor;Régimen;CPRO;Provincia;Comunidad_Autónoma;CODAUTO',
  '2026;1;2988;Libre;29;Málaga;Andalucía;1',
  '2026;2;3083.5;Libre;29;Málaga;Andalucía;1',
  '2026;2;900;Protegida;29;Málaga;Andalucía;1',
  '2026;2;;Libre;29;Málaga;Andalucía;1',
  '2026;2;2020.7;Libre;3;Alicante/Alacant;Comunitat Valenciana;10',
  '2026;2;1800;Libre;11;Cádiz;Andalucía;1',
  '2026;2;1350.1;Libre;;Total CCAA;Murcia, Region de;',
  '2026;2;2355;Libre;;Total CCAA;Total nacional;',
  '2026;1;2300;Libre;;Total CCAA;Total nacional;',
  '1995;1;;Libre;null;Ceuta y Melilla;Ceuta y Melilla;0',
].join('\r\n') + '\r\n';

const mivau = parseMivauCsv('\uFEFF' + CSV);
check('blank valor stays null and is not zero', mivau.filter((r) => r.cpro === '29' && r.quarter === 2 && r.regime === 'Libre').map((r) => r.value), [3083.5, null]);
const malaga = mivauSeries(mivau, { kind: 'province', cpro: '29' });
check('Málaga series ignores protegida and the blank cell', malaga.points, [
  { period: '2026-Q1', value: 2988 },
  { period: '2026-Q2', value: 3083.5 },
]);
check('Málaga series id is the province code', malaga.seriesId, 'VDP006_01:libre:cpro=29');
check('cpro 3 is padded', mivauSeries(mivau, { kind: 'province', cpro: '03' }).points.at(-1), { period: '2026-Q2', value: 2020.7 });
const murcia = mivauSeries(mivau, { kind: 'ccaa', ccaa: 'Murcia, Region de' });
check('Murcia community total is not the national total', murcia.points.at(-1)?.value, 1350.1);
check('national is Total nacional, not the blank-CPRO Murcia row', mivauSeries(mivau, { kind: 'national' }).points.at(-1), { period: '2026-Q2', value: 2355 });
check('a published zero is not kept as a price', parseMivauCsv(
  'Año;Trimestre;Valor;Régimen;CPRO;Provincia;Comunidad_Autónoma;CODAUTO\n2013;3;0;Libre;52;Melilla;Melilla;19\n2026;2;1000;Libre;52;Melilla;Melilla;19\n',
).map((r) => r.value), [null, 1000]);
throws('latest quarter of zero is not replaced by an older price', () => mivauSeries(parseMivauCsv(
  'Año;Trimestre;Valor;Régimen;CPRO;Provincia;Comunidad_Autónoma;CODAUTO\n2026;1;1000;Libre;29;Málaga;Andalucía;1\n2026;2;0;Libre;29;Málaga;Andalucía;1\n',
), { kind: 'province', cpro: '29' }), 'no positive');
throws('comma decimal is refused', () => parseMivauCsv(CSV.replace('3083.5', '3.083,5')), 'plain decimal');
throws('unknown regime', () => parseMivauCsv(CSV.replace('Protegida', 'Otra')), 'regime');
throws('missing column', () => parseMivauCsv(CSV.replace('Valor;', '')), 'missing column');
throws('two values one quarter', () => parseMivauCsv(CSV + '2026;2;9999;Libre;29;Málaga;Andalucía;1\n') && mivauSeries(parseMivauCsv(CSV + '2026;2;9999;Libre;29;Málaga;Andalucía;1\n'), { kind: 'province', cpro: '29' }), 'both');
throws('quoted semicolon still one field', () => {
  // A quote that hides the delimiter must not shift columns into a fake value.
  const shifted = 'Año;Trimestre;Valor;Régimen;CPRO;Provincia;Comunidad_Autónoma;CODAUTO\n2026;2;"1;2";Libre;29;Málaga;Andalucía;1\n';
  parseMivauCsv(shifted);
}, 'plain decimal');

// ── comparison maths ─────────────────────────────────────────────────────────
check('median odd', medianPositive([3, 1, 2]), 2);
check('median even', medianPositive([1, 2, 3, 4]), 2.5);
check('median drops non-positive and non-finite', medianPositive([0, -5, Number.NaN, 8]), 8);
check('median empty', medianPositive([]), null);
check('premium', askingVsAppraisalPct(4000, 3083.5), 29.7);
check('discount', askingVsAppraisalPct(1000, 2000), -50);
check('premium null when appraisal missing', askingVsAppraisalPct(4000, null), null);
check('premium null when appraisal is zero', askingVsAppraisalPct(4000, 0), null);
check('premium null when asking missing', askingVsAppraisalPct(null, 2000), null);

// ── layer builder ────────────────────────────────────────────────────────────
function parsed(cod: string, nombre: string, unit: string, value: number): IneParsed {
  return parseIneDatosSerie(serie(cod, nombre, unit, [
    { period: '2025-Q2', value: value - 1 },
    { period: '2026-Q2', value },
  ]), cod);
}
function ineSet(): IneParsed[] {
  const rows: IneParsed[] = [];
  const geos = [
    ['Nacional', 100],
    ['Andalucía', 110],
    ['Comunitat Valenciana', 120],
    ['Murcia, Región de', 130],
  ] as const;
  let n = 1;
  for (const [geo, base] of geos) {
    rows.push(parsed(`I${n++}`, `${geo}. Vivienda nueva. Índice.`, 'Índice', base));
    rows.push(parsed(`I${n++}`, `${geo}. Vivienda nueva. Variación anual.`, 'Tasas', base / 10));
    rows.push(parsed(`I${n++}`, `${geo}. Vivienda segunda mano. Índice.`, 'Índice', base + 5));
    rows.push(parsed(`I${n++}`, `${geo}. Vivienda segunda mano. Variación anual.`, 'Tasas', base / 10 - 1));
  }
  return rows;
}
const layer = buildSpainLayer({
  now: new Date('2026-10-24T12:00:00Z'),
  provinceKeys: ['malaga', 'cadiz', 'murcia', 'alicante'],
  unmappedLocations: [],
  ine: ineSet(),
  mivau,
  registradoresStatus: 403,
});
check('province order follows the defs, not the input order', layer.provinces.map((p) => p.name), ['Málaga', 'Alicante', 'Murcia', 'Cádiz']);
check('Málaga and Cádiz share Andalucía\'s new-build series', layer.provinces[0].ine_new_yoy_pct.series_id, layer.provinces[3].ine_new_yoy_pct.series_id);
check('Alicante does not share Andalucía\'s series', layer.provinces[1].ine_new_yoy_pct.series_id === layer.provinces[0].ine_new_yoy_pct.series_id, false);
check('Murcia appraisal is the community total', layer.provinces[2].appraisal.value, 1350.1);
check('Murcia appraisal is not the national figure', layer.provinces[2].appraisal.value === layer.national.appraisal.value, false);
check('every number carries provenance', layer.provinces.every((p) =>
  [p.appraisal, p.ine_new_index, p.ine_new_yoy_pct, p.ine_existing_yoy_pct].every((n) =>
    typeof n.value === 'number' && /^\d{4}-Q[1-4]$/.test(n.period) && n.series_id.length > 0 && n.retrieved_at === '2026-10-24' && n.source_url.startsWith('https://'),
  ),
), true);
check('registradores 403 is an omission, not a number', layer.omissions[0].ingested, false);
check('403 reason names the status', layer.omissions[0].reason.includes('403'), true);
check('fingerprint ignores retrieval time', layerFingerprint({ ...layer, generated_at: 'x', retrieved_at: 'y' } as SpainLayer) === layerFingerprint(layer), true);
throws('unmapped listing refuses the layer', () => buildSpainLayer({
  now: new Date(), provinceKeys: ['malaga'], unmappedLocations: ['Somewhere, Teruel'], ine: ineSet(), mivau, registradoresStatus: 403,
}), 'Teruel');
throws('missing INE community', () => buildSpainLayer({
  now: new Date(), provinceKeys: ['malaga'], unmappedLocations: [], ine: ineSet().filter((s) => !s.geo.includes('Andaluc')), mivau, registradoresStatus: 403,
}), 'Andaluc');

check('probe 200 does not invent a series', registradoresOmission(200).ingested, false);
check('probe 200 says there is no parser', registradoresOmission(200).reason.includes('no parser'), true);
check('probe unreachable', registradoresOmission(null).reason.includes('could not be reached'), true);

// ── benchmark join ───────────────────────────────────────────────────────────
const bench = buildEsBenchmark(layer, [
  { location: 'Estepona, Málaga', askingEurM2: 3000 },
  { location: 'Marbella, Málaga', askingEurM2: 5000 },
  { location: 'Marbella, Málaga', askingEurM2: 0 },
  { location: 'Marbella, Málaga', askingEurM2: null },
  { location: 'Torrevieja, Alicante', askingEurM2: 2500 },
  { location: 'Inland, Teruel', askingEurM2: 99999 },
]);
const malagaRow = bench.provinces.find((p) => p.slug === 'malaga')!;
check('median of the two priced listings', malagaRow.avena_median_asking_eur_m2, 4000);
check('zero and null are unpriced, not part of the median', malagaRow.unpriced_listings, 2);
check('gap uses the ministry figure, rounded to 0.1', malagaRow.asking_vs_appraisal_pct, askingVsAppraisalPct(4000, 3083.5));
check('a listing outside the map is counted, not priced as a province', bench.unmapped_listings, 1);
check('Cádiz has no listings and no invented median', bench.provinces.find((p) => p.slug === 'cadiz')?.avena_median_asking_eur_m2, null);
check('Cádiz with no asking price has no gap', bench.provinces.find((p) => p.slug === 'cadiz')?.asking_vs_appraisal_pct, null);

const pending = buildEsBenchmark(null, [{ location: 'Estepona, Málaga', askingEurM2: 3000 }]);
check('pending layer keeps the asking median', pending.provinces[0].avena_median_asking_eur_m2, 3000);
check('pending layer does not invent an appraisal', pending.provinces[0].appraisal, null);
check('pending layer does not invent a zero gap', pending.provinces[0].asking_vs_appraisal_pct, null);
check('pending status', pending.status, 'pending');

const gapped = buildEsBenchmark(
  { ...layer, provinces: layer.provinces.filter((p) => p.slug !== 'alicante') },
  [{ location: 'Denia, Alicante', askingEurM2: 2200 }],
);
const alicante = gapped.provinces.find((p) => p.slug === 'alicante')!;
check('province missing from the layer is a gap, not a zero', alicante.official, 'missing_from_layer');
check('gap appraisal is null', alicante.appraisal, null);
check('gap still reports the asking median', alicante.avena_median_asking_eur_m2, 2200);

// ── locations ────────────────────────────────────────────────────────────────
check('accented tail', provinceFromLocation('Torrevieja, Alicante')?.key, 'alicante');
check('bilingual tail', provinceFromLocation('X, Cádiz')?.key, 'cadiz');
check('slash form', provinceFromLocation('X, Alicante/Alacant')?.key, 'alicante');
check('no comma is unmapped', provinceFromLocation('Málaga'), null);
check('fold', fold('Murcia, Región de'), 'murcia, region de');
check('corpus keeps def order', corpusProvinces(['A, Cádiz', 'B, Málaga', 'C, Murcia']).keys, ['malaga', 'murcia', 'cadiz']);

// ── the committed file the page renders ──────────────────────────────────────
const committed = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'es-official.json'), 'utf8')) as SpainLayer;
check('committed layer is ready', committed.status, 'ready');
check('committed layer names its provinces', committed.provinces.length > 0, true);
const book = JSON.parse(readFileSync(join(__dirname, '..', 'public', 'data.json'), 'utf8')) as { l: string }[];
const live = corpusProvinces(book.map((r) => r.l));
check('every listing location maps to a province', live.unmapped.length, 0);
for (const key of live.keys) {
  const row = committed.provinces.find((p) => p.key === key);
  check(`committed layer covers ${key}`, row != null, true);
  if (!row) continue;
  check(`${key} appraisal is a positive €/m² with a series id`, row.appraisal.value > 0 && row.appraisal.unit === 'eur_per_m2' && row.appraisal.series_id.startsWith('VDP006_01:'), true);
  check(`${key} INE new-build change is a percent with an IPV series id`, row.ine_new_yoy_pct.unit === 'pct' && row.ine_new_yoy_pct.series_id.startsWith('IPV'), true);
  check(`${key} period is a quarter`, /^\d{4}-Q[1-4]$/.test(row.appraisal.period) && /^\d{4}-Q[1-4]$/.test(row.ine_new_yoy_pct.period), true);
  check(`${key} retrieval date is a day`, /^\d{4}-\d{2}-\d{2}$/.test(row.appraisal.retrieved_at), true);
}
const andalucia = committed.provinces.filter((p) => p.ccaa === 'Andalucía');
check('Andalucía provinces share one new-build series', new Set(andalucia.map((p) => p.ine_new_yoy_pct.series_id)).size, 1);
check('Murcia does not use the Andalucía series', committed.provinces.find((p) => p.key === 'murcia')!.ine_new_yoy_pct.series_id === andalucia[0].ine_new_yoy_pct.series_id, false);
check('national appraisal is its own series', committed.national.appraisal.series_id.includes('Total nacional'), true);
check('Murcia appraisal series is not the national series', committed.provinces.find((p) => p.key === 'murcia')!.appraisal.series_id === committed.national.appraisal.series_id, false);
check('omissions ingested nothing', committed.omissions.every((o) => o.ingested === false), true);

const liveBench = buildEsBenchmark(committed, getAllProperties().map((p) => ({
  location: p.l,
  askingEurM2: typeof p.pm2 === 'number' ? p.pm2 : null,
})));
check('live benchmark is ready', liveBench.status, 'ready');
check('live benchmark maps every listing', liveBench.unmapped_listings, 0);
for (const row of liveBench.provinces.filter((p) => live.keys.includes(p.slug))) {
  check(`${row.name} has a positive asking median`, row.avena_median_asking_eur_m2 != null && row.avena_median_asking_eur_m2 > 0, true);
  check(`${row.name} gap is a finite derived percent`, row.asking_vs_appraisal_pct != null && Number.isFinite(row.asking_vs_appraisal_pct), true);
  check(`${row.name} gap matches the formula`, row.asking_vs_appraisal_pct, askingVsAppraisalPct(row.avena_median_asking_eur_m2, row.appraisal?.value ?? null));
}

if (fail) {
  console.log(`\nFAILED — ${pass} passed, ${fail} failed`);
  process.exit(1);
}
console.log(`\nALL PASS — ${pass} passed, ${fail} failed`);
